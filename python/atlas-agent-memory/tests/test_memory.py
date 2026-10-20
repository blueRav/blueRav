import tempfile
import unittest
from pathlib import Path
from memory_store import MemoryStore, ConflictError

class MemoryTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.path = str(Path(self.folder.name) / "memory.db")
        self.store = MemoryStore(self.path, scope="alpha")
    def tearDown(self):
        self.store.close()
        self.folder.cleanup()
    def put(self, key="deadline", value="Friday", **extra):
        return self.store.remember(key, value, source_id="note-1",
                                   source_text="The deadline is Friday.", quote="deadline is Friday", **extra)
    def test_evidence_required(self):
        with self.assertRaisesRegex(ValueError, "quote"):
            self.store.remember("x", 1, source_id="s", source_text="real", quote="invented")
    def test_revision_and_history(self):
        self.put()
        self.put(value="Monday", expected_version=1)
        self.assertEqual(self.store.recall("deadline")["value"], "Monday")
        self.assertEqual([r["version"] for r in self.store.history("deadline")], [1, 2])
    def test_stale_write_rejected(self):
        self.put()
        with self.assertRaises(ConflictError):
            self.put(value="Monday", expected_version=0)
    def test_duplicate_is_idempotent(self):
        self.put()
        self.put(expected_version=0)
        self.assertEqual(len(self.store.history("deadline")), 1)
    def test_namespace_isolation(self):
        self.put()
        other = MemoryStore(self.path, scope="beta")
        try:
            self.assertIsNone(other.recall("deadline"))
            self.assertEqual(other.search("deadline"), [])
        finally:
            other.close()
    def test_expired_latest_does_not_reveal_old_value(self):
        self.put(now=10)
        self.put(value="Monday", expected_version=1, ttl_seconds=5, now=20)
        self.assertIsNone(self.store.recall("deadline", now=26))
        self.assertEqual(self.store.search("deadline", now=26), [])
    def test_search_only_returns_current_revision(self):
        self.put()
        self.put(value="Monday", expected_version=1)
        result = self.store.search("deadline")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["version"], 2)
    def test_search_syntax_is_treated_as_data(self):
        self.put()
        self.assertIsInstance(self.store.search('deadline" OR * NEAR('), list)
    def test_forget_creates_a_tombstone(self):
        self.put()
        self.assertTrue(self.store.forget("deadline", expected_version=1))
        self.assertIsNone(self.store.recall("deadline"))
        self.assertEqual(self.store.search("deadline"), [])
        self.assertTrue(self.store.history("deadline")[-1]["deleted"])
    def test_persistence(self):
        self.put()
        again = MemoryStore(self.path, scope="alpha")
        try:
            self.assertEqual(again.recall("deadline")["value"], "Friday")
        finally:
            again.close()

if __name__ == "__main__":
    unittest.main()
