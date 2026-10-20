import copy
import json
import tempfile
import unittest
from pathlib import Path
from support_agent import SupportAgent, TICKET, validate_arguments, live_planner

class SupportTests(unittest.TestCase):
    def test_approval_precedes_resolution(self):
        agent = SupportAgent()
        state = agent.run()
        self.assertEqual(state["status"], "awaiting_approval")
        self.assertEqual(state["receipts"], {})
        self.assertEqual(state["draft"]["citation"], "returns-v1")
    def test_exact_approval_completes_once(self):
        agent = SupportAgent()
        state = agent.run()
        done = agent.run(state, approval=state["pending"]["digest"], reviewer="reviewer")
        self.assertEqual(done["status"], "complete")
        self.assertEqual(len(done["receipts"]), 1)
        self.assertFalse(next(iter(done["receipts"].values()))["payment_sent"])
        self.assertEqual(agent.run(done), done)
    def test_wrong_approval_rejected(self):
        agent = SupportAgent()
        with self.assertRaisesRegex(ValueError, "match"):
            agent.run(agent.run(), approval="changed", reviewer="reviewer")
    def test_changed_ticket_invalidates_checkpoint(self):
        state = SupportAgent().run()
        changed = copy.deepcopy(TICKET)
        changed["amount_cents"] += 1
        with self.assertRaisesRegex(ValueError, "checkpoint"):
            SupportAgent(changed).run(state)
    def test_ineligible_ticket_goes_to_human_without_resolution(self):
        ticket = copy.deepcopy(TICKET)
        ticket["days_since_purchase"] = 30
        result = SupportAgent(ticket).run()
        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["receipts"], {})
        self.assertTrue(result["draft"]["handoff_required"])
    def test_unknown_tool_is_blocked(self):
        state = SupportAgent(planner=lambda ctx: {"type": "tool", "name": "shell", "args": {}}).run()
        self.assertEqual(state["status"], "failed")
        self.assertEqual(state["receipts"], {})
    def test_model_cannot_claim_completion_without_evidence(self):
        state = SupportAgent(planner=lambda ctx: {"type": "final"}).run()
        self.assertEqual(state["status"], "failed")
    def test_loops_are_bounded(self):
        state = SupportAgent(planner=lambda ctx: {"type": "tool", "name": "read_ticket", "args": {"id": "T-104"}}).run()
        self.assertEqual(state["status"], "budget_exceeded")
        self.assertEqual(state["steps"], 12)
    def test_schema_rejects_extra_fields_and_bool_amounts(self):
        with self.assertRaises(ValueError):
            validate_arguments("read_ticket", {"id": "T-104", "scope": "other"})
        with self.assertRaises(ValueError):
            validate_arguments("queue_resolution", {"ticket_id": "T-104", "policy_id": "returns-v1", "amount_cents": True})
    def test_live_mode_requires_explicit_configuration(self):
        with self.assertRaisesRegex(ValueError, "OPENAI_API_KEY"):
            live_planner(None, None)
    def test_state_survives_json_serialization(self):
        agent = SupportAgent()
        state = json.loads(json.dumps(agent.run()))
        done = agent.run(state, approval=state["pending"]["digest"], reviewer="reviewer")
        self.assertEqual(done["status"], "complete")

if __name__ == "__main__":
    unittest.main()
