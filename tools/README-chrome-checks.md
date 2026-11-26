# Claude's Chrome checks

Keywords with the **Chrome** pill switched on (on their row in SEO → Keywords) are read by Claude on real Google in the team's Chrome.

How a run goes:

1. In the tool tab, Claude calls `await EDGE_chromeQueue()` for the picked searches (oldest first) and `EDGE_chromeBudget()` for how many Google pages are left. The limit is 10 pages in any 30 minutes.
2. For each search, Claude opens the location-pinned Google URL in a second tab and runs `tools/chrome-serp-extract.js` there (with the client's domain). It adds the page to what that tab has read so far and says whether the client was found. If not, and budget remains, Claude opens the next page (`&start=10`, `20`, …).
3. Claude runs `tools/chrome-send.js` (with the client, keyword and location ids). The tab goes to `chrome-relay.html` with the results in the address's #part, and the relay hands them to the open tool tab, which runs `EDGE_chromeRecord(clientId, keywordId, locationId, page)` and counts the pages against the budget. That matches and saves it exactly like a scan: rank, history, map-pack position and the "view the search" page. The row then says "read by Claude in Chrome".
4. If Google shows a CAPTCHA, Claude stops, records `{blocked: true}` (the last position stays), and tells the team. It never tries to get past the check.

The DataForSEO scan buttons still work alongside this.

## Map grids (GBP Tracker)

1. On the GBP Tracker, **Read with Claude in Chrome** builds the grid (same as Paste mode) and marks it.
2. Claude calls `EDGE_gbpQueue()` in the tool tab for marked grids and their unread points (each with its own Google Maps link).
3. For each point, Claude opens the Maps link in a second tab and runs `tools/chrome-maps-extract.js` (with the depth, usually 20). It scrolls the list, keeps sponsored places apart, and returns every place with its CID, place id, rating, website and phone.
4. Claude sends it through `chrome-relay.html` with `{kind:'gbp', gid, sid, idx, page}`. The tool runs `EDGE_gbpRecord`, which matches the profile with the same matcher as an automatic scan (CID first). The dot fills in, and clicking it opens the full list with the profile highlighted.
5. Pauses of 30–40 seconds between points; stop at the first Google check page.
