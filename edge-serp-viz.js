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
      '<div class="sv-hero-r"><div class="sv-gbar"><span class="sv-g">' + G + '</span><span class="sv-q" data-pq></span><span class="sv-caret"></span></div>' +
        '<div class="sv-chips"><span class="sv-chip" data-ploc>' + PIN + '<b></b></span><span class="sv-chip" data-plang></span><span class="sv-chip" data-pcoord></span></div>' +
        '<div class="sv-fake"><i style="--w:92%"></i><i style="--w:70%"></i><i style="--w:84%"></i><i style="--w:58%"></i></div></div>';
    anchor.parentElement.insertBefore(h, anchor);
  }

  function stats(){
    const el = document.querySelector('.sv-hero [data-stats]'); if (!el) return;
    const r = recents(), places = new Set(r.filter(x => x.lat != null).map(x => Number(x.lat).toFixed(2) + ',' + Number(x.lng).toFixed(2)));
    const words = new Set(r.map(x => String(x.q || '').toLowerCase()));
    el.innerHTML = [[r.length, 'recent searches'], [places.size, 'places pinned'], [words.size, 'different searches'], [r[0] ? ago(r[0].at) : '—', 'last search']]
      .map(([n, l], i) => '<div style="--i:' + i + '"><b>' + esc(n) + '</b><span>' + esc(l) + '</span></div>').join('');
  }

  function preview(){
    const q = ($('q') || {}).value || '', loc = ($('loc') || {}).value || '', lat = parseFloat(($('lat') || {}).value), lng = parseFloat(($('lng') || {}).value);
    const pq = document.querySelector('.sv-hero [data-pq]');
    if (pq){ pq.textContent = q || 'best coffee shop'; pq.classList.toggle('ph', !q); }
    const pl = document.querySelector('.sv-hero [data-ploc] b'); if (pl) pl.textContent = loc || (isNaN(lat) ? 'No place yet' : 'Dropped pin');
    const lg = document.querySelector('.sv-hero [data-plang]'); if (lg) lg.textContent = regionLabel() || 'Language';
    const pc = document.querySelector('.sv-hero [data-pcoord]'); if (pc) pc.textContent = isNaN(lat) || isNaN(lng) ? 'no coordinates' : lat.toFixed(4) + ', ' + lng.toFixed(4);
    syncPin();
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

  function kwHero(){
    const v = $('view-keywords'); if (!v || v.querySelector('.sv-hero')) return;
    const anchor = v.querySelector('.section-h'); if (!anchor) return;
    const h = document.createElement('section');
    h.className = 'sv-hero sv-hero-kw';
    h.innerHTML = '<div class="sv-orbs"><i></i><i></i><i></i></div><div class="sv-hero-l"><span class="sv-eyebrow">Keyword finder</span><h2>Everything a site already ranks for, in one pull</h2>' +
      '<p>Enter a website and a place. You get the searches it shows up for, how high, and how often people search them, ready to send to GBP Tracker.</p></div>' +
      '<div class="sv-hero-r"><div class="sv-rankviz">' + [[1, 92], [3, 78], [4, 70], [7, 55], [9, 46], [12, 34], [18, 22]].map(([p, w], i) => '<div style="--i:' + i + '"><em>#' + p + '</em><span style="--w:' + w + '%"></span></div>').join('') + '</div></div>';
    anchor.parentElement.insertBefore(h, anchor);
  }

  function init(){
    if (built) return;
    const v = $('view-checker'); if (!v) return;
    built = true;
    hero(); kwHero();
    const mc = layout();
    ['q', 'loc', 'lat', 'lng', 'radius', 'region'].forEach(id => { const f = $(id); if (f){ f.addEventListener('input', preview); f.addEventListener('change', preview); } });
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
