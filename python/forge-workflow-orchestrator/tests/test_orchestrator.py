import asyncio
import tempfile
import unittest
from pathlib import Path
from orchestrator import Orchestrator, Step, demo_steps

class WorkflowTests(unittest.IsolatedAsyncioTestCase):
    async def test_pause_resume_and_receipts(self):
        with tempfile.TemporaryDirectory() as folder:
            path = str(Path(folder) / "runs.db")
            engine = Orchestrator(demo_steps(), path)
            first = await engine.run("r", {"requested": 12})
            self.assertEqual(first["status"], "awaiting_approval")
            self.assertEqual(first["steps"]["reserve"]["attempts"], 0)
            pending = first["pending"][0]
            engine.close()
            engine = Orchestrator(demo_steps(), path)
            engine.approve("r", "reserve", pending["digest"], "reviewer")
            done = await engine.run("r", {"requested": 12})
            self.assertEqual(done["status"], "complete")
            again = await engine.run("r", {"requested": 12})
            self.assertEqual(again["steps"]["reserve"]["attempts"], 1)
            engine.close()

    async def test_exact_approval(self):
        e = Orchestrator(demo_steps())
        await e.run("r", {"requested": 12})
        with self.assertRaisesRegex(ValueError, "match"):
            e.approve("r", "reserve", "altered", "reviewer")
        e.close()

    async def test_changed_checkpoint_inputs(self):
        e = Orchestrator(demo_steps())
        await e.run("r", {"requested": 12})
        with self.assertRaisesRegex(ValueError, "changed"):
            await e.run("r", {"requested": 99})
        e.close()

    async def test_concurrency_is_bounded(self):
        active = 0
        peak = 0
        async def action(ctx):
            nonlocal active, peak
            active += 1
            peak = max(peak, active)
            await asyncio.sleep(0.01)
            active -= 1
            return True
        e = Orchestrator([Step(str(i), action) for i in range(5)], concurrency=2)
        self.assertEqual((await e.run("r", {}))["status"], "complete")
        self.assertEqual(peak, 2)
        e.close()

    async def test_retry_and_failure_block_dependents(self):
        calls = 0
        async def flaky(ctx):
            nonlocal calls
            calls += 1
            raise RuntimeError("fixture failure")
        async def downstream(ctx):
            self.fail("dependent must not run")
        e = Orchestrator([Step("a", flaky, retries=1), Step("b", downstream, ("a",))])
        state = await e.run("r", {})
        self.assertEqual(state["status"], "failed")
        self.assertEqual(calls, 2)
        self.assertEqual(state["steps"]["b"]["status"], "blocked")
        e.close()

    async def test_timeout(self):
        async def slow(ctx):
            await asyncio.sleep(1)
        e = Orchestrator([Step("slow", slow, timeout=0.01)])
        self.assertEqual((await e.run("r", {}))["status"], "failed")
        e.close()

    def test_cycles_and_unknown_dependencies(self):
        async def action(ctx):
            return None
        with self.assertRaisesRegex(ValueError, "cycle"):
            Orchestrator([Step("a", action, ("b",)), Step("b", action, ("a",))])
        with self.assertRaisesRegex(ValueError, "unknown"):
            Orchestrator([Step("a", action, ("missing",))])

    async def test_non_json_result_fails(self):
        async def invalid(ctx):
            return float("nan")
        e = Orchestrator([Step("invalid", invalid)])
        self.assertEqual((await e.run("r", {}))["status"], "failed")
        e.close()

if __name__ == "__main__":
    unittest.main()
