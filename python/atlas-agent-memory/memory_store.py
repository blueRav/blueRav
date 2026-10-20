"""Evidence-backed, namespace-scoped SQLite memory with revision history and expiry."""
from __future__ import annotations
import json
import re
import sqlite3
import time
from pathlib import Path

class ConflictError(ValueError):
    pass

class MemoryStore:
    def __init__(self, database=":memory:", *, scope="demo"):
        if not re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", scope):
            raise ValueError("invalid namespace")
        self.scope = scope
        if database != ":memory:":
            Path(database).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(database)
        self.db.row_factory = sqlite3.Row
        self.db.executescript("""
          CREATE TABLE IF NOT EXISTS facts(
            scope TEXT NOT NULL,key TEXT NOT NULL,version INTEGER NOT NULL,
            value TEXT,source_id TEXT,quote TEXT,created REAL NOT NULL,
            expires REAL,deleted INTEGER NOT NULL DEFAULT 0,
            UNIQUE(scope,key,version));
          CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
            text,scope UNINDEXED,key UNINDEXED,version UNINDEXED);
          CREATE TABLE IF NOT EXISTS audit(
            id INTEGER PRIMARY KEY,scope TEXT,key TEXT,event TEXT,version INTEGER);
        """)
        self.db.commit()

    def close(self):
        self.db.close()

    def _latest(self, key):
        return self.db.execute(
            "SELECT rowid,* FROM facts WHERE scope=? AND key=? ORDER BY version DESC LIMIT 1",
            (self.scope, key)).fetchone()

    @staticmethod
    def _public(row):
        if row is None:
            return None
        item = dict(row)
        item.pop("rowid", None)
        item["value"] = json.loads(item["value"]) if item["value"] is not None else None
        item["deleted"] = bool(item["deleted"])
        return item

    def remember(self, key, value, *, source_id, source_text, quote,
                 expected_version=None, ttl_seconds=None, now=None):
        if not isinstance(key, str) or not key.strip() or len(key) > 128:
            raise ValueError("key required, max 128 characters")
        if not source_id or not quote or quote not in source_text:
            raise ValueError("quote must match the supplied source")
        if ttl_seconds is not None and ttl_seconds <= 0:
            raise ValueError("ttl must be positive")
        payload = json.dumps(value, sort_keys=True, allow_nan=False)
        if len(payload) > 20000:
            raise ValueError("memory value too large")
        now = time.time() if now is None else now
        try:
            self.db.execute("BEGIN IMMEDIATE")
            previous = self._latest(key)
            if previous and not previous["deleted"] and previous["value"] == payload and previous["source_id"] == source_id and previous["quote"] == quote:
                self.db.commit()
                return self._public(previous)
            version = previous["version"] if previous else 0
            if expected_version is not None and version != expected_version:
                raise ConflictError("memory changed; recall before revising")
            expires = None if ttl_seconds is None else now + ttl_seconds
            cursor = self.db.execute(
                "INSERT INTO facts VALUES(?,?,?,?,?,?,?,?,0)",
                (self.scope, key, version + 1, payload, source_id, quote, now, expires))
            self.db.execute("INSERT INTO memory_fts(rowid,text,scope,key,version) VALUES(?,?,?,?,?)",
                            (cursor.lastrowid, key + " " + payload + " " + quote, self.scope, key, version + 1))
            self.db.execute("INSERT INTO audit(scope,key,event,version) VALUES(?,?,?,?)",
                            (self.scope, key, "remember" if not previous else "revise", version + 1))
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return self.recall(key, now=now)

    def recall(self, key, *, now=None):
        row = self._latest(key)
        now = time.time() if now is None else now
        if row is None or row["deleted"] or (row["expires"] is not None and row["expires"] <= now):
            return None
        return self._public(row)

    def search(self, query, *, limit=5, now=None):
        if not isinstance(query, str) or len(query) > 500 or not 1 <= limit <= 20:
            raise ValueError("invalid search limits")
        tokens = re.findall(r"\w+", query, flags=re.UNICODE)[:12]
        if not tokens:
            return []
        match = " OR ".join('"' + token.replace('"', '""') + '"' for token in tokens)
        now = time.time() if now is None else now
        rows = self.db.execute("""
          SELECT f.rowid,f.*,bm25(memory_fts) AS score
          FROM memory_fts JOIN facts f ON f.rowid=memory_fts.rowid
          WHERE memory_fts MATCH ? AND f.scope=? AND f.deleted=0
            AND (f.expires IS NULL OR f.expires>?)
            AND NOT EXISTS (
              SELECT 1 FROM facts newer
              WHERE newer.scope=f.scope AND newer.key=f.key AND newer.version>f.version)
          ORDER BY score,f.key LIMIT ?
        """, (match, self.scope, now, limit))
        return [self._public(row) for row in rows]

    def history(self, key):
        return [self._public(row) for row in self.db.execute(
            "SELECT * FROM facts WHERE scope=? AND key=? ORDER BY version", (self.scope, key))]

    def forget(self, key, *, expected_version=None, now=None):
        try:
            self.db.execute("BEGIN IMMEDIATE")
            row = self._latest(key)
            if row is None or row["deleted"]:
                self.db.commit()
                return False
            if expected_version is not None and row["version"] != expected_version:
                raise ConflictError("memory changed")
            version = row["version"] + 1
            self.db.execute("INSERT INTO facts VALUES(?,?,?,NULL,NULL,NULL,?,NULL,1)",
                            (self.scope, key, version, time.time() if now is None else now))
            self.db.execute("INSERT INTO audit(scope,key,event,version) VALUES(?,?,?,?)",
                            (self.scope, key, "forget", version))
            self.db.commit()
            return True
        except Exception:
            self.db.rollback()
            raise

def demo(database):
    store = MemoryStore(database, scope="project-alpha")
    try:
        store.remember("release_deadline", {"date": "2026-10-24"},
                       source_id="meeting-1", source_text="The release deadline is October 24.",
                       quote="release deadline is October 24")
        first = store.recall("release_deadline")
        if first["value"]["date"] != "2026-10-27":
            store.remember("release_deadline", {"date": "2026-10-27"},
                           source_id="meeting-2", source_text="The release deadline moved to October 27.",
                           quote="release deadline moved to October 27",
                           expected_version=first["version"])
        return {"current": store.recall("release_deadline"), "history": store.history("release_deadline"),
                "search": store.search("release deadline")}
    finally:
        store.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default=".state/memory.db")
    args = parser.parse_args()
    print(json.dumps(demo(args.database), indent=2))
