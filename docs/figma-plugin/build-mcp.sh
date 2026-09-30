#!/bin/sh
# Build one minified script per use_figma call (each must stay under 50,000 chars),
# then run them in order against the mock with no state shared between calls.
set -e
cd "$(dirname "$0")"
rm -rf mcp .tmp
mkdir -p mcp .tmp
cat src/01-core.js src/02-components.js src/03-pages.js src/04-mcp.js src/05-admin.js src/06-tracking.js src/07-review.js src/08-documents.js src/10-authorities.js src/11-trip.js src/12-handover.js src/13-incidents.js src/14-service.js src/15-horse.js src/16-contact.js src/17-firstrun.js src/18-access.js src/19-audit.js > .tmp/all.js
i=1
for entry in eTokens eComponentsA eComponentsB eFoundations eScreensOwnerA eScreensOwnerB eArrange eCover eAdminComponents eTableComponents eAdminCatalogs eAdminOverview eTrackComponents eHomeScreens eTrackScreensA eTrackScreensB eQuoteScreen eStaffScreensA eStaffScreensB eReviewScreens eReviewCustomer eBuilderScreens eDocScreens eDocReview eAuthorities eTripA eTripB eHandover eIncidents eService eHorse eContact eFirstRun eSidebar eFooter eAccess eAudit eCanvas; do
  n=$(printf "%02d" $i)
  { cat .tmp/all.js; echo "globalThis.__EF = $entry;"; } > .tmp/$n.js
  bun build .tmp/$n.js --minify-whitespace --minify-syntax --target=browser --outfile .tmp/$n.min.js > /dev/null
  { cat .tmp/$n.min.js; echo; echo "return await globalThis.__EF();"; } > mcp/$n-$entry.js
  size=$(wc -c < mcp/$n-$entry.js | tr -d ' ')
  echo "mcp/$n-$entry.js  $size chars"
  if [ "$size" -ge 50000 ]; then echo "TOO BIG"; exit 1; fi
  i=$((i+1))
done
bun test/run-mcp.js
rm -rf .tmp
