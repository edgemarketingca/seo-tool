# Claude's Chrome checks

Keywords with the **Chrome** pill switched on (on their row in SEO → Keywords) are read by Claude on real Google in the team's Chrome.

How a run goes:

1. In the tool tab, Claude calls `await EDGE_chromeQueue()` for the picked searches (oldest first) and `EDGE_chromeBudget()` for how many Google pages are left. The limit is 10 pages in any 30 minutes.
2. For each search, Claude opens the location-pinned Google URL, runs `tools/chrome-serp-extract.js` in that tab and calls `EDGE_chromeSpend(1)`. If the client isn't on the page and budget remains, it reads the next page (`&start=10`, `20`, …) and adds those results with positions counted on from the page before.
3. Claude passes what it read to `await EDGE_chromeRecord(clientId, keywordId, locationId, page)`. That matches and saves it exactly like a scan: rank, history, map-pack position and the "view the search" page. The row then says "read by Claude in Chrome".
4. If Google shows a CAPTCHA, Claude stops, records `{blocked: true}` (the last position stays), and tells the team. It never tries to get past the check.

The DataForSEO scan buttons still work alongside this.
