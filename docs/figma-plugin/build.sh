#!/bin/sh
# Concatenate src/*.js into the single code.js Figma loads, then run it against the mock.
set -e
cd "$(dirname "$0")"
cat src/01-core.js src/02-components.js src/03-pages.js src/05-admin.js src/06-tracking.js src/07-review.js src/08-documents.js src/10-authorities.js src/11-trip.js src/12-handover.js src/13-incidents.js src/14-service.js src/15-horse.js src/16-contact.js src/17-firstrun.js src/18-access.js src/19-audit.js src/09-plugin-main.js > code.js
echo "built code.js ($(wc -l < code.js | tr -d ' ') lines)"
bun test/run.js

bun test/consistency.js
