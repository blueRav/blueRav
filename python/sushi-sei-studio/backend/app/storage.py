import hashlib
import json
from pathlib import Path
import sqlite3
from uuid import uuid4

class IdempotencyConflict(ValueError):
    pass
class CateringStore:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.path) as db:
            db.execute("""CREATE TABLE IF NOT EXISTS inquiries(
              id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL,
              fingerprint TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
    def create(self, payload, request_key):
        encoded = json.dumps(payload, sort_keys=True)
        digest = hashlib.sha256(encoded.encode()).hexdigest()
        with sqlite3.connect(self.path) as db:
            db.execute("BEGIN IMMEDIATE")
            previous = db.execute("SELECT id,fingerprint FROM inquiries WHERE request_key=?", (request_key,)).fetchone()
            if previous:
                if previous[1] != digest:
                    raise IdempotencyConflict("This request key was already used for different details")
                return previous[0], False
            identifier = str(uuid4())
            db.execute("INSERT INTO inquiries(id,request_key,fingerprint,payload) VALUES(?,?,?,?)",
                       (identifier, request_key, digest, encoded))
            return identifier, True
    def list_recent(self):
        with sqlite3.connect(self.path) as db:
            db.row_factory = sqlite3.Row
            return [{"id": row["id"], "details": json.loads(row["payload"]), "created_at": row["created_at"]}
                    for row in db.execute("SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 50")]
