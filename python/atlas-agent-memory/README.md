# Atlas Agent Memory

Versioned SQLite agent memory with namespace isolation, provenance, optimistic concurrency, expiry, and FTS5 search.

## Run
Python 3.12+; standard library only. From this project directory:

```sh
python memory_store.py --database .state/memory.db
python -m unittest discover -s tests -v
```

## How it works
The demo records a deadline, revises it with a new source, and returns the current value alongside history and search results. A cited quote must appear in the supplied source text. Expected versions detect concurrent edits. Search considers only current, active records in the configured namespace.

## Limits
Provenance matching does not prove semantic entailment or authenticate a source. Namespaces are logical boundaries, not access control. Forget creates a tombstone; historical values remain stored. SQLite must support FTS5.

Source and deterministic tests are included. CI exercises this project on Python 3.12 and 3.13. This portfolio prototype was developed with AI assistance.
