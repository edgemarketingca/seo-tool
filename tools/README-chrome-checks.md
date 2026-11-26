# Claude's Chrome checks

Keywords with the **Chrome** pill switched on (on their row in SEO → Keywords) are read by Claude on real Google in the team's Chrome.

How a run goes:

1. In the tool tab, Claude calls `await EDGE_chromeQueue()` for the picked searches (oldest first) and `EDGE_chromeBudget()` for how many Google pages are left. The limit is 10 pages in any 30 minutes.
2. For each search, Claude opens the location-pinned Google URL in a second tab and runs `tools/chrome-serp-extract.js` there (with the client's domain). It adds the page to what that tab has read so far and says whether the client was found. If not, and budget remains, Claude opens the next page (`&start=10`, `20`, …).
3. Claude runs `tools/chrome-send.js` (with the client, keyword and location ids). The tab goes to `chrome-relay.html` with the results in the address's #part, and the relay hands them to the open tool tab, which runs `EDGE_chromeRecord(clientId, keywordId, locationId, page)` and counts the pages against the budget. That matches and saves it exactly like a scan: rank, history, map-pack position and the "view the search" page. The row then says "read by Claude in Chrome".
4. If Google shows a CAPTCHA, Claude stops, records `{blocked: true}` (the last position stays), and tells the team. It never tries to get past the check.

The DataForSEO scan buttons still work alongside this.
