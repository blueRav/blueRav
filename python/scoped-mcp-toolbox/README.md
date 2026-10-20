# Scoped MCP Toolbox

A dependency-free stdio Model Context Protocol server exposing scoped read-only tools, resources, and prompts.

## Run
Python 3.12+; standard library only. From this project directory:

```sh
python server.py --scope team-demo
python -m unittest discover -s tests -v
```

## How it works
Implements a documented subset of MCP 2025-06-18: initialize, initialized notification, ping, tools/list, tools/call, resources/list, resources/read, prompts/list, and prompts/get. notes_search, notes_read, and draft_checklist operate on a small synthetic catalogue. Tool arguments cannot override the process scope. Messages are newline-delimited JSON-RPC on stdin/stdout.

## Limits
This is a protocol learning implementation, not a full MCP SDK. It provides no HTTP transport, subscriptions, authentication, arbitrary file access, or network tools. A fixed namespace is not an authentication boundary. Input messages are limited to 64 KiB.

Source and deterministic tests are included. CI exercises this project on Python 3.12 and 3.13. This portfolio prototype was developed with AI assistance.

## Connect a stdio client
Use the absolute path to your checkout in the client's server configuration:

```json
{"mcpServers":{"portfolio-notes":{"command":"python","args":["/absolute/path/to/blueRav/python/scoped-mcp-toolbox/server.py","--scope","team-demo"]}}}
```

Clients must complete initialize and notifications/initialized before requesting catalogue tools. stdout contains protocol messages only. Protocol reference: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
