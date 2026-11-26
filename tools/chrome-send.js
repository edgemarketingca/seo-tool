/* After chrome-serp-extract.js: sends what this tab read to the SEO tool
   through chrome-relay.html (the results travel in the address's #part). */
(() => {
  let acc = null; try{ acc = JSON.parse(sessionStorage.getItem('edgeAcc') || 'null'); }catch(e){}
  if (!acc) return 'nothing read yet';
  const msg = {cid: CID, kid: KID, lid: LID, kw: KW, label: LABEL, page: acc};
  setTimeout(() => { location.href = 'https://seo.edgemarketing.ca/chrome-relay.html#' + encodeURIComponent(JSON.stringify(msg)); }, 60);
  return 'sending ' + acc.organic.length + ' results from ' + acc.pages + ' page(s)';
})()
