"""Async DAG orchestration with durable checkpoints and exact approval binding."""
from __future__ import annotations
import asyncio
import hashlib
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable

def encode(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)

def digest(value):
    return hashlib.sha256(encode(value).encode()).hexdigest()

@dataclass(frozen=True)
class Step:
    name: str
    action: Callable[[dict], Awaitable[object]]
    needs: tuple[str, ...] = ()
    approval_required: bool = False
    retries: int = 0
    timeout: float = 5.0

class Orchestrator:
    def __init__(self, steps, database=":memory:", *, version="1", concurrency=2):
        if not 1 <= concurrency <= 16:
            raise ValueError("concurrency must be 1..16")
        self.steps = {s.name: s for s in steps}
        if len(self.steps) != len(steps) or not self.steps:
            raise ValueError("step names must be unique and nonempty")
        for step in steps:
            if not step.name or step.retries < 0 or step.retries > 5 or step.timeout <= 0:
                raise ValueError("invalid step limits")
            if any(name not in self.steps for name in step.needs):
                raise ValueError("unknown dependency")
        remaining, resolved = set(self.steps), set()
        while remaining:
            ready = {n for n in remaining if set(self.steps[n].needs) <= resolved}
            if not ready:
                raise ValueError("dependency cycle")
            resolved |= ready
            remaining -= ready
        self.fingerprint = digest({"version": version, "steps": [
            {"name": s.name, "needs": s.needs, "approval": s.approval_required,
             "retries": s.retries, "timeout": s.timeout} for s in steps]})
        self.limit = concurrency
        if database != ":memory:":
            Path(database).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(database)
        self.db.row_factory = sqlite3.Row
        self.db.executescript("""
          CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, fingerprint TEXT, inputs TEXT);
          CREATE TABLE IF NOT EXISTS steps(
            run_id TEXT, name TEXT, status TEXT, attempts INTEGER DEFAULT 0,
            result TEXT, error TEXT, PRIMARY KEY(run_id,name));
          CREATE TABLE IF NOT EXISTS approvals(
            run_id TEXT, name TEXT, digest TEXT, actor TEXT, PRIMARY KEY(run_id,name));
          CREATE TABLE IF NOT EXISTS events(
            id INTEGER PRIMARY KEY, run_id TEXT, event TEXT, payload TEXT);
        """)
        self.db.commit()

    def close(self):
        self.db.close()

    def _event(self, run_id, event, payload):
        self.db.execute("INSERT INTO events(run_id,event,payload) VALUES(?,?,?)",
                        (run_id, event, encode(payload)))
        self.db.commit()

    def _rows(self, run_id):
        return {r["name"]: dict(r) for r in self.db.execute(
            "SELECT * FROM steps WHERE run_id=?", (run_id,))}

    def _context(self, run_id, name):
        run = self.db.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
        rows = self._rows(run_id)
        dependencies = {}
        for dependency in self.steps[name].needs:
            if rows[dependency]["status"] != "complete":
                raise ValueError("dependencies are not complete")
            dependencies[dependency] = json.loads(rows[dependency]["result"])
        return {"inputs": json.loads(run["inputs"]), "dependencies": dependencies}

    def action_digest(self, run_id, name):
        if name not in self.steps:
            raise ValueError("unknown step")
        return digest({"run": run_id, "plan": self.fingerprint, "step": name,
                       "context": self._context(run_id, name)})

    def approve(self, run_id, name, token, actor):
        rows = self._rows(run_id)
        if name not in rows or rows[name]["status"] != "awaiting_approval":
            raise ValueError("step is not awaiting approval")
        if not actor.strip() or token != self.action_digest(run_id, name):
            raise ValueError("approval does not match the pending action")
        self.db.execute("INSERT OR REPLACE INTO approvals VALUES(?,?,?,?)",
                        (run_id, name, token, actor.strip()))
        self.db.commit()
        self._event(run_id, "approved", {"step": name, "actor": actor.strip()})

    async def run(self, run_id, inputs):
        if not isinstance(run_id, str) or not run_id.strip():
            raise ValueError("run id required")
        encoded = encode(inputs)
        existing = self.db.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
        if existing and (existing["fingerprint"] != self.fingerprint or existing["inputs"] != encoded):
            raise ValueError("checkpoint plan or inputs changed")
        if not existing:
            self.db.execute("INSERT INTO runs VALUES(?,?,?)", (run_id, self.fingerprint, encoded))
            self.db.executemany("INSERT INTO steps(run_id,name,status) VALUES(?,?,'pending')",
                                [(run_id, n) for n in self.steps])
            self.db.commit()
        # This engine permits one process per run. Interrupted read/idempotent steps may rerun.
        self.db.execute("UPDATE steps SET status='pending' WHERE run_id=? AND status='running'", (run_id,))
        self.db.commit()
        semaphore = asyncio.Semaphore(self.limit)

        async def execute(name):
            async with semaphore:
                step = self.steps[name]
                self.db.execute("UPDATE steps SET status='running',attempts=attempts+1 WHERE run_id=? AND name=?", (run_id, name))
                self.db.commit()
                self._event(run_id, "started", {"step": name})
                try:
                    async with asyncio.timeout(step.timeout):
                        result = await step.action(self._context(run_id, name))
                    payload = encode(result)
                    self.db.execute("UPDATE steps SET status='complete',result=?,error=NULL WHERE run_id=? AND name=?",
                                    (payload, run_id, name))
                    self.db.commit()
                    self._event(run_id, "completed", {"step": name})
                except Exception as error:
                    attempts = self._rows(run_id)[name]["attempts"]
                    status = "pending" if attempts <= step.retries else "failed"
                    self.db.execute("UPDATE steps SET status=?,error=? WHERE run_id=? AND name=?",
                                    (status, type(error).__name__ + ": " + str(error), run_id, name))
                    self.db.commit()
                    self._event(run_id, "retry" if status == "pending" else "failed",
                                {"step": name, "attempt": attempts})

        while True:
            rows = self._rows(run_id)
            if all(r["status"] == "complete" for r in rows.values()):
                return self.snapshot(run_id, "complete")
            ready = []
            for name, row in rows.items():
                if row["status"] not in ("pending", "awaiting_approval"):
                    continue
                step = self.steps[name]
                if any(rows[n]["status"] in ("failed", "blocked") for n in step.needs):
                    self.db.execute("UPDATE steps SET status='blocked' WHERE run_id=? AND name=?", (run_id, name))
                    self.db.commit()
                    continue
                if not all(rows[n]["status"] == "complete" for n in step.needs):
                    continue
                if step.approval_required:
                    granted = self.db.execute("SELECT digest FROM approvals WHERE run_id=? AND name=?", (run_id, name)).fetchone()
                    if not granted or granted["digest"] != self.action_digest(run_id, name):
                        self.db.execute("UPDATE steps SET status='awaiting_approval' WHERE run_id=? AND name=?", (run_id, name))
                        self.db.commit()
                        continue
                ready.append(name)
            if not ready:
                rows = self._rows(run_id)
                status = "failed" if any(r["status"] in ("failed", "blocked") for r in rows.values()) else "awaiting_approval"
                return self.snapshot(run_id, status)
            await asyncio.gather(*(execute(name) for name in ready))

    def snapshot(self, run_id, status):
        rows = self._rows(run_id)
        pending = [{"step": n, "digest": self.action_digest(run_id, n),
                    "context": self._context(run_id, n)}
                   for n, row in rows.items() if row["status"] == "awaiting_approval"]
        return {"run_id": run_id, "status": status, "steps": rows, "pending": pending,
                "events": [dict(r) for r in self.db.execute(
                    "SELECT event,payload FROM events WHERE run_id=? ORDER BY id", (run_id,))]}

def demo_steps():
    async def inventory(ctx):
        return {"available": 24}
    async def demand(ctx):
        return {"requested": ctx["inputs"]["requested"]}
    async def plan(ctx):
        deps = ctx["dependencies"]
        return {"reserve": min(deps["inventory"]["available"], deps["demand"]["requested"])}
    async def reserve(ctx):
        return {"reserved": ctx["dependencies"]["plan"]["reserve"], "simulated": True}
    return [Step("inventory", inventory), Step("demand", demand),
            Step("plan", plan, ("inventory", "demand")),
            Step("reserve", reserve, ("plan",), approval_required=True)]

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default=".state/workflows.db")
    parser.add_argument("--approve")
    parser.add_argument("--reviewer")
    args = parser.parse_args()
    engine = Orchestrator(demo_steps(), args.database)
    try:
        if args.approve:
            engine.approve("demo", "reserve", args.approve, args.reviewer or "")
        print(json.dumps(asyncio.run(engine.run("demo", {"requested": 12})), indent=2))
    finally:
        engine.close()
