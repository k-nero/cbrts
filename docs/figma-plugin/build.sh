#!/bin/sh
# Concatenate src/*.js into the single code.js Figma loads, then run it against the mock.
set -e
cd "$(dirname "$0")"
# The source files and entries are build-mcp.sh's, so the plugin and the MCP route build the same file.
files=$(sed -n 's/^cat \(src.*\) > \.tmp\/all\.js$/\1/p' build-mcp.sh)
entries=$(sed -n 's/^for entry in \(.*\); do$/\1/p' build-mcp.sh | tr ' ' ',')
{ cat $files; echo "var PLUGIN_ENTRIES = [$entries];"; cat src/09-plugin-main.js; } > code.js
echo "built code.js ($(wc -l < code.js | tr -d ' ') lines)"
bun test/run.js

bun test/consistency.js
