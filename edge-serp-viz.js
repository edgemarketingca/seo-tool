/* EDGE — Live SERP visuals.
   Adds to the existing Live SERP screens without changing how they work:
   - a hero with a live "what Google will see" search bar and search stats
   - a map beside the form: the pin, its radius, and every recent search as a dot
     (click the map to move the pin, click a dot to reopen that search)
   - a hero for the keyword finder
   All form fields stay the source of truth; the map and preview only read and write them. */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const recents = () => { try{ return (typeof state !== 'undefined' && Array.isArray(state.serpRecents)) ? state.serpRecents : []; }catch(e){ return []; } };
  const ago = t => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 24) return h + ' h ago'; const d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago'); };
  const G = '<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
  const PIN = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';

  let map = null, pin = null, ring = null, dots = null, built = false;

  function regionLabel(){ const r = $('region'); return r && r.selectedIndex >= 0 ? (r.options[r.selectedIndex] || {}).text || '' : ''; }

  function hero(){
    const v = $('view-checker'); if (!v || v.querySelector('.sv-hero')) return;
    const anchor = v.querySelector('.section-h'); if (!anchor) return;
    const h = document.createElement('section');
    h.className = 'sv-hero';
    h.innerHTML =
      '<div class="sv-orbs"><i></i><i></i><i></i></div>' +
      '<div class="sv-hero-l"><span class="sv-eyebrow">' + PIN + 'Live SERP</span><h2>See Google exactly as someone in that town does</h2>' +
        '<p>Pick a search and a place. The pin travels with every page of results, so you see the real local pack and rankings for that spot.</p>' +
        '<div class="sv-stats" data-stats></div></div>' +
      '<div class="sv-hero-r"><label class="sv-gbar"><span class="sv-g">' + G + '</span><input class="sv-qin" data-in-q type="text" placeholder="Type a search, e.g. best coffee shop" autocomplete="off" aria-label="Search"/><span class="sv-kbd">Enter</span></label>' +
        '<div class="sv-place"><span class="sv-place-ic">' + PIN + '</span><input data-in-loc type="text" placeholder="Where? Red Deer, Alberta or a street address" autocomplete="off" aria-label="Place"/><button type="button" class="sv-find" data-sv-find>Find</button></div>' +
        '<div class="sv-geo" data-sv-geo></div>' +
        '<div class="sv-chips"><label class="sv-chip sv-chip-sel"><svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.6 15.6 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.4 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4h-3.4z"/></svg><select data-in-region aria-label="Country and language"></select></label>' +
          '<span class="sv-chip" data-pcoord></span></div>' +
        '<div class="sv-radius"><span>Pin radius</span><input type="range" min="1" max="200" step="1" data-in-radius aria-label="Pin radius in km"/><b data-radius-l></b></div>' +
        '<button type="button" class="sv-go" data-sv-go><span>Open this search</span><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M13.2 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 1 1-1.4-1.4l4.3-4.3H4a1 1 0 1 1 0-2h13.5l-4.3-4.3a1 1 0 0 1 0-1.4z"/></svg></button></div>';
    anchor.parentElement.insertBefore(h, anchor);
  }

  function stats(){
    const el = document.querySelector('.sv-hero [data-stats]'); if (!el) return;
    const r = recents(), places = new Set(r.filter(x => x.lat != null).map(x => Number(x.lat).toFixed(2) + ',' + Number(x.lng).toFixed(2)));
    const words = new Set(r.map(x => String(x.q || '').toLowerCase()));
    el.innerHTML = [[r.length, 'recent searches'], [places.size, 'places pinned'], [words.size, 'different searches'], [r[0] ? ago(r[0].at) : '—', 'last search']]
      .map(([n, l], i) => '<div style="--i:' + i + '"><b>' + esc(n) + '</b><span>' + esc(l) + '</span></div>').join('');
  }

  /* The hero inputs mirror the original form fields both ways; the form stays the source of truth. */
  const BIND = [['data-in-q', 'q'], ['data-in-loc', 'loc'], ['data-in-region', 'region']];
  function mirrorIn(){
    BIND.forEach(([a, id]) => { const h = document.querySelector('.sv-hero [' + a + ']'), f = $(id); if (h && f && document.activeElement !== h && h.value !== f.value) h.value = f.value; });
    const r = document.querySelector('.sv-hero [data-in-radius]'), rf = $('radius');
    if (r && rf){ const km = Math.max(1, Math.min(200, Math.round((parseFloat(rf.value) || 0) / 1000) || 1)); if (document.activeElement !== r) r.value = km; const l = document.querySelector('.sv-hero [data-radius-l]'); if (l) l.textContent = km + ' km'; }
  }
  function preview(){
    const lat = parseFloat(($('lat') || {}).value), lng = parseFloat(($('lng') || {}).value);
    const pc = document.querySelector('.sv-hero [data-pcoord]');
    if (pc){ pc.classList.toggle('on', !(isNaN(lat) || isNaN(lng))); pc.innerHTML = isNaN(lat) || isNaN(lng) ? 'No pin yet: type a place or click the map' : PIN + lat.toFixed(4) + ', ' + lng.toFixed(4); }
    mirrorIn(); syncPin();
  }
  function wireHero(){
    const sel = document.querySelector('.sv-hero [data-in-region]'), reg = $('region');
    if (sel && reg){ sel.innerHTML = reg.innerHTML; sel.value = reg.value;
      new MutationObserver(() => { sel.innerHTML = reg.innerHTML; sel.value = reg.value; }).observe(reg, {childList: true}); }
    BIND.forEach(([a, id]) => { const h = document.querySelector('.sv-hero [' + a + ']'); if (!h) return;
      const push = () => { const f = $(id); if (f && f.value !== h.value){ f.value = h.value; f.dispatchEvent(new Event('input', {bubbles: true})); f.dispatchEvent(new Event('change', {bubbles: true})); } preview(); };
      h.addEventListener('input', push); h.addEventListener('change', push); });
    const q = document.querySelector('.sv-hero [data-in-q]'), loc = document.querySelector('.sv-hero [data-in-loc]');
    const go = () => { const b = $('goBtn'); if (!b) return; b.click(); const res = document.querySelector('#view-checker .sv-split'); if (res) setTimeout(() => res.scrollIntoView({behavior: 'smooth', block: 'start'}), 250); };
    const find = () => { const b = $('geocodeBtn'); if (b){ b.click(); const fb = document.querySelector('.sv-hero [data-sv-find]'); if (fb){ fb.classList.add('busy'); setTimeout(() => fb.classList.remove('busy'), 1400); } } };
    if (q) q.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); go(); } });
    if (loc) loc.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); find(); } });
    const fb = document.querySelector('.sv-hero [data-sv-find]'); if (fb) fb.addEventListener('click', find);
    const gb = document.querySelector('.sv-hero [data-sv-go]'); if (gb) gb.addEventListener('click', go);
    const r = document.querySelector('.sv-hero [data-in-radius]');
    if (r) r.addEventListener('input', () => { const rf = $('radius'); if (rf){ rf.value = String(r.value * 1000); rf.dispatchEvent(new Event('input', {bubbles: true})); rf.dispatchEvent(new Event('change', {bubbles: true})); } const l = document.querySelector('.sv-hero [data-radius-l]'); if (l) l.textContent = r.value + ' km'; syncPin(); });
    // Geocoding messages and place choices appear right under the place box.
    const geo = document.querySelector('.sv-hero [data-sv-geo]');
    ['geoStatus', 'geoOut'].forEach(id => { const n = $(id); if (n && geo) geo.appendChild(n); });
    // The original inputs now live in the hero; the card keeps advanced options and the results.
    const card = document.querySelector('#view-checker .sv-split > .card:not(.sv-mapcard)');
    if (card){
      ['q', 'region', 'loc', 'lat'].forEach(id => { const f = $(id); const box = f && f.closest('.f'); if (box) box.classList.add('sv-hidden'); });
      const gob = $('goBtn'); if (gob) gob.classList.add('sv-hidden');
      if (!card.querySelector('.sv-cardhead')){ const hd = document.createElement('div'); hd.className = 'sv-cardhead';
        hd.innerHTML = '<b>Results</b><span>Open a search above and every page of results appears here, pinned to the same spot.</span>'; card.insertBefore(hd, card.firstChild); }
    }
    const sh = document.querySelector('#view-checker .section-h h2'); if (sh) sh.textContent = 'Map and results';
  }
  function dropKeywordFinder(){
    document.querySelectorAll('[data-serpview="keywords"]').forEach(b => b.classList.add('sv-hidden'));
    const kv = $('view-keywords'); if (kv) kv.classList.add('sv-hidden');
    if (kv && kv.classList.contains('on') && typeof serpShowView === 'function'){ try{ serpShowView('checker'); }catch(e){} }
  }

  function layout(){
    const v = $('view-checker'); if (!v) return null;
    const card = v.querySelector('.card'); if (!card || card.parentElement.classList.contains('sv-split')) return card.parentElement.querySelector('.sv-mapcard');
    const split = document.createElement('div'); split.className = 'sv-split';
    card.parentElement.insertBefore(split, card); split.appendChild(card);
    const mc = document.createElement('div'); mc.className = 'card sv-mapcard';
    mc.innerHTML = '<div class="sv-maphead"><b>Where the search happens</b><span>Click the map to move the pin · dots are your recent searches</span></div>' +
      '<div class="sv-map" data-map></div><div class="sv-maplegend"><span><i class="p"></i>This search</span><span><i class="r"></i>Pin radius</span><span><i class="d"></i>Recent searches</span></div>' +
      '<div class="sv-recent-strip" data-strip></div>';
    split.appendChild(mc);
    return mc;
  }

  function buildMap(mc){
    if (map || !window.L || !mc) return;
    const el = mc.querySelector('[data-map]'); if (!el || !el.offsetWidth) return;
    map = L.map(el, {zoomControl: true, attributionControl: true, scrollWheelZoom: false}).setView([52.27, -113.81], 6);
    try{
      const T = (typeof CLEAN_TILES !== 'undefined') ? CLEAN_TILES : null;
      if (T){ L.tileLayer(T.base.url, T.base.opts).addTo(map); L.tileLayer(T.labels, {maxZoom: 19, maxNativeZoom: 16, crossOrigin: true, opacity: .9}).addTo(map); }
    }catch(e){}
    dots = L.layerGroup().addTo(map);
    map.on('click', e => {
      setField('lat', e.latlng.lat.toFixed(7)); setField('lng', e.latlng.lng.toFixed(7));
      if ($('loc') && !$('loc').value) setField('loc', '');
      preview(); pulse(e.latlng);
    });
    el.addEventListener('mouseenter', () => map.scrollWheelZoom.enable());
    el.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());
    drawRecents(true); syncPin(true);
  }

  function setField(id, v){ const f = $(id); if (!f) return; f.value = v; f.dispatchEvent(new Event('input', {bubbles: true})); f.dispatchEvent(new Event('change', {bubbles: true})); }

  function pulse(ll){
    if (!map) return;
    const c = L.circleMarker(ll, {radius: 6, color: '#E8772E', weight: 2, fillOpacity: .3, className: 'sv-pulse'}).addTo(map);
    setTimeout(() => map.removeLayer(c), 900);
  }

  function syncPin(fit){
    if (!map) return;
    const lat = parseFloat(($('lat') || {}).value), lng = parseFloat(($('lng') || {}).value), rad = parseFloat(($('radius') || {}).value) || 0;
    if (isNaN(lat) || isNaN(lng)){ if (pin){ map.removeLayer(pin); pin = null; } if (ring){ map.removeLayer(ring); ring = null; } return; }
    const ll = [lat, lng];
    if (!pin){
      pin = L.marker(ll, {draggable: true, icon: L.divIcon({className: 'sv-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28]})}).addTo(map);
      pin.on('dragend', () => { const p = pin.getLatLng(); setField('lat', p.lat.toFixed(7)); setField('lng', p.lng.toFixed(7)); preview(); });
    } else pin.setLatLng(ll);
    if (rad > 0 && rad < 2000000){
      if (!ring) ring = L.circle(ll, {radius: rad, color: '#E8772E', weight: 1.5, fillColor: '#E8772E', fillOpacity: .07, dashArray: '5 6'}).addTo(map);
      else { ring.setLatLng(ll); ring.setRadius(rad); }
    } else if (ring){ map.removeLayer(ring); ring = null; }
    if (fit){ try{ map.fitBounds(ring ? ring.getBounds() : L.latLng(ll).toBounds(20000), {padding: [20, 20], maxZoom: 11}); }catch(e){ map.setView(ll, 10); } }
    else if (!map.getBounds().contains(ll)) map.panTo(ll);
  }

  function restore(i){
    const rows = document.querySelectorAll('#serpRecents .recent-row');
    if (rows[i]) rows[i].click();
    setTimeout(() => { preview(); syncPin(true); }, 30);
  }

  function drawRecents(fitAll){
    const r = recents();
    if (dots){
      dots.clearLayers();
      r.forEach((x, i) => {
        if (x.lat == null || x.lng == null) return;
        const d = L.circleMarker([x.lat, x.lng], {radius: 7, color: '#fff', weight: 2, fillColor: '#4285F4', fillOpacity: .9, className: 'sv-dot'}).addTo(dots);
        d.bindTooltip('<b>' + esc(x.q) + '</b><br>' + esc(x.loc || (Number(x.lat).toFixed(3) + ', ' + Number(x.lng).toFixed(3))) + '<br><small>' + esc(ago(x.at)) + ' · click to reopen</small>', {direction: 'top', className: 'sv-tt'});
        d.on('click', ev => { L.DomEvent.stopPropagation(ev); restore(i); });
      });
      if (fitAll && !(($('lat') || {}).value)){
        const pts = r.filter(x => x.lat != null).map(x => [x.lat, x.lng]);
        if (pts.length) try{ map.fitBounds(pts, {padding: [30, 30], maxZoom: 9}); }catch(e){}
      }
    }
    const strip = document.querySelector('.sv-mapcard [data-strip]');
    if (strip){
      strip.innerHTML = r.length ? r.slice(0, 8).map((x, i) => '<button type="button" class="sv-rc" data-ri="' + i + '" style="--i:' + i + '"><span class="sv-rc-q">' + esc(x.q) + '</span><span class="sv-rc-w">' + PIN + esc(x.loc || (x.lat != null ? Number(x.lat).toFixed(2) + ', ' + Number(x.lng).toFixed(2) : 'no pin')) + '</span><span class="sv-rc-t">' + esc(ago(x.at)) + '</span></button>').join('')
        : '<div class="sv-rc-empty">Searches you open show up here and on the map.</div>';
      strip.querySelectorAll('[data-ri]').forEach(b => b.addEventListener('click', () => restore(+b.dataset.ri)));
    }
    stats();
  }

  function init(){
    if (built) return;
    const v = $('view-checker'); if (!v) return;
    built = true;
    hero(); dropKeywordFinder();
    const mc = layout(); wireHero();
    ['q', 'loc', 'lat', 'lng', 'radius', 'region', 'canonical'].forEach(id => { const f = $(id); if (f){ f.addEventListener('input', preview); f.addEventListener('change', preview); } });
    preview(); drawRecents();
    const tryMap = () => { buildMap(mc); if (map) setTimeout(() => map.invalidateSize(), 60); };
    tryMap();
    // The view is hidden until Live SERP opens: build/resize the map once it is visible.
    let shown = !!v.offsetWidth, queued = false;
    new MutationObserver(() => {
      if (queued) return; queued = true;
      requestAnimationFrame(() => { queued = false; const now = !!v.offsetWidth; if (now === shown) return; shown = now;
        if (now){ tryMap(); if (map) setTimeout(() => { map.invalidateSize(); syncPin(); }, 80); } });
    }).observe(document.body, {attributes: true, subtree: true, attributeFilter: ['style', 'class']});
    // New searches and synced recents
    const rr = $('serpRecents'); if (rr) new MutationObserver(() => drawRecents()).observe(rr, {childList: true});
    setInterval(stats, 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
  else setTimeout(init, 300);
  window.EDGE_serpViz = {init, preview, drawRecents};
})();
