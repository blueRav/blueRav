import io
import json
import subprocess
import sys
import unittest
from server import Server, VERSION, serve

def request(method, params=None, number=1):
    return {"jsonrpc": "2.0", "id": number, "method": method, "params": params or {}}

def initialize(server):
    server.handle(request("initialize", {"protocolVersion": VERSION, "clientInfo": {"name": "test", "version": "1"}, "capabilities": {}}))
    server.handle({"jsonrpc": "2.0", "method": "notifications/initialized"})

class ProtocolTests(unittest.TestCase):
    def setUp(self):
        self.server = Server()
    def test_handshake_is_required(self):
        self.assertEqual(self.server.handle(request("tools/list"))["error"]["code"], -32002)
        initialize(self.server)
        self.assertEqual(len(self.server.handle(request("tools/list"))["result"]["tools"]), 3)
    def test_version_negotiation_returns_supported_version(self):
        r = self.server.handle(request("initialize", {"protocolVersion": "future-version", "clientInfo": {}, "capabilities": {}}))
        self.assertEqual(r["result"]["protocolVersion"], VERSION)
    def test_read_tool_and_source_label(self):
        initialize(self.server)
        r = self.server.handle(request("tools/call", {"name": "notes_read", "arguments": {"id": "retries"}}))
        payload = json.loads(r["result"]["content"][0]["text"])
        self.assertEqual(payload["scope"], "team-demo")
        self.assertEqual(payload["trust"], "source_data")
    def test_scope_injection_is_rejected(self):
        initialize(self.server)
        r = self.server.handle(request("tools/call", {"name": "notes_read", "arguments": {"id": "retries", "scope": "other"}}))
        self.assertTrue(r["result"]["isError"])
    def test_arbitrary_tool_name_cannot_execute(self):
        initialize(self.server)
        r = self.server.handle(request("tools/call", {"name": "shell", "arguments": {}}))
        self.assertTrue(r["result"]["isError"])
    def test_resource_scope_is_fixed(self):
        initialize(self.server)
        r = self.server.handle(request("resources/read", {"uri": "notes://other/retries"}))
        self.assertEqual(r["error"]["code"], -32602)
    def test_notifications_have_no_reply(self):
        self.assertIsNone(self.server.handle({"jsonrpc": "2.0", "method": "notifications/cancelled"}))
    def test_bad_json_and_batches(self):
        incoming = io.StringIO("not json\n[]\n")
        outgoing = io.StringIO()
        serve(incoming, outgoing)
        rows = [json.loads(line) for line in outgoing.getvalue().splitlines()]
        self.assertEqual([r["error"]["code"] for r in rows], [-32700, -32600])
    def test_stdout_is_only_jsonrpc(self):
        messages = [request("initialize", {"protocolVersion": VERSION, "clientInfo": {}, "capabilities": {}}),
                    {"jsonrpc": "2.0", "method": "notifications/initialized"}, request("tools/list", number=2)]
        run = subprocess.run([sys.executable, "server.py"], input="\n".join(json.dumps(m) for m in messages) + "\n", text=True, capture_output=True, timeout=5)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual([json.loads(line)["id"] for line in run.stdout.splitlines()], [1, 2])
    def test_prompt_arguments_are_allowlisted(self):
        initialize(self.server)
        result = self.server.handle(request("prompts/get", {"name": "policy_brief", "arguments": {"topic": "approvals"}}))
        self.assertIn("messages", result["result"])

if __name__ == "__main__":
    unittest.main()
