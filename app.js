// Crossroads — UI logic
// ══════════════════════════════════════════════════════════════════════════════
// BUILD STATUS (update this block when resuming):
//
// DONE:
//   ✓ Ayanamsa removed — IAU boundaries are tropical, no conversion needed
//   ✓ wheel.js — buildWheelSVG() creates SVG celestial diagram
//   ✓ interpretations.js — buildFullReading() + buildSynastryReading() dual-mode
//   ✓ Oracle overlay, threshold screen, ⛎ 3-click trigger, TMI ad swap
//   ✓ Credit system (earn/spend, 5 ad-views/day limit, localStorage)
//   ✓ Reading render (standard + oracle re-render on mode activate)
//   ✓ Love Compatibility (synastry cross-aspects + buildSynastryReading)
//   ✓ Quarterly Prediction (13 weekly JPL fetches, transit timeline)
//   ✓ GA4 + AdSense script placeholders in index.html
//   ✓ Ad slots: #adLeaderboard (below hero) + #adRect (between natal/current sky)
//   ✓ Premium buttons (#synastryBtn, #quarterlyBtn) + credits UI
//   ✓ Mobile media queries in style.css
//   ✓ Oracle puzzle Layer 1 hint in Ophiuchus section
//
// PENDING / REMAINING:
//   • watchAd(): still a stub — replace with real AdSense rewarded ad API call.
//     On real completion callback: addCredits(AD_CREDIT_REWARD) + increment count.
//     Docs: https://support.google.com/adsense/answer/9806868
//   • Stripe cash purchase: earnOrBuyModal() shows "coming soon" — add Stripe link
//     when payment account is ready
//   • Fill real AdSense publisher ID in index.html:
//       ca-pub-XXXXXXXXXX → your AdSense publisher ID (AdSense dashboard)
//     GA4 ID G-WC611BCKGW is already live in all pages.
//   • Test: run  python3 server.py 8765  then open http://localhost:8765
//     Submit a chart, verify wheel renders, reading renders, credits bar shows,
//     click ⛎ 3x, verify oracle overlay, click "Enter the Oracle",
//     verify reading re-renders in oracle voice and ad slot swaps to TMI
// ══════════════════════════════════════════════════════════════════════════════

const TOTAL_DAYS = SIGNS.reduce((a,s) => a + s.days, 0);

// ══════════════════════════════════════════════════════════════════════════════
// SHARED CHART STATE — set by form submit handler, read by premium features
// NEXT: These are populated after each chart render; do not read before then.
// ══════════════════════════════════════════════════════════════════════════════
let _natalChart = null, _currentChart = null;
let _natalAspects = [], _transitAspects = [];
let _natalHouseOfFn = null;
let _domPlanet = 'Sun', _domHouse = 1;
let _sunHouse = null, _moonHouse = null, _ascHouse = null;

// ── Analytics ─────────────────────────────────────────────────────────────────
function track(event, params) {
  if (typeof gtag !== 'undefined') gtag('event', event, params || {});
}

// ── Credit system ─────────────────────────────────────────────────────────────
// Storage keys: xroads_credits (int), xroads_ad_date (ISO date), xroads_ad_count (int)
const AD_DAILY_LIMIT = 1, AD_CREDIT_REWARD = 5;
const CREDIT_COSTS = { suddenForecast: 30, synastry: 10, quarterly: 20 };

// Credit purchase tiers — wired to Google Play Billing product IDs at launch
// Product ID convention: credits_5, credits_11, credits_24 … credits_650
const CREDIT_TIERS = [
  { credits:   5, price: '$1.99',  productId: 'credits_5'   },
  { credits:  11, price: '$3.99',  productId: 'credits_11'  },
  { credits:  24, price: '$5.99',  productId: 'credits_24'  },
  { credits:  45, price: '$9.99',  productId: 'credits_45'  },
  { credits:  75, price: '$14.99', productId: 'credits_75'  },
  { credits: 110, price: '$19.99', productId: 'credits_110' },
  { credits: 175, price: '$29.99', productId: 'credits_175' },
  { credits: 300, price: '$49.99', productId: 'credits_300' },
  { credits: 460, price: '$74.99', productId: 'credits_460' },
  { credits: 650, price: '$99.99', productId: 'credits_650' },
];

function getCredits() { return parseInt(localStorage.getItem('xroads_credits') || '0', 10); }

function addCredits(n) {
  localStorage.setItem('xroads_credits', getCredits() + n);
  updateCreditsUI();
}

function spendCredits(n) {
  const c = getCredits();
  if (c < n) return false;
  localStorage.setItem('xroads_credits', c - n);
  updateCreditsUI();
  return true;
}

function updateCreditsUI() {
  const el = document.getElementById('creditsDisplay');
  if (el) el.textContent = 'Credits: ' + getCredits();
}

// ── Modal helper (replaces alert/confirm) ────────────────────────────────────
function showModal(title, body, confirmLabel, onConfirm, cancelLabel) {
  const modal = document.getElementById('creditsModal');
  if (!modal) { if (onConfirm && confirm(body)) onConfirm(); return; }
  document.getElementById('creditsModalTitle').textContent = title;
  document.getElementById('creditsModalBody').innerHTML = body;
  const btnOK  = document.getElementById('creditsModalConfirm');
  const btnX   = document.getElementById('creditsModalCancel');
  btnOK.textContent  = confirmLabel || 'OK';
  btnX.textContent   = cancelLabel  || 'Cancel';
  btnX.style.display = onConfirm ? '' : 'none';
  modal.classList.remove('hidden');
  const close = () => modal.classList.add('hidden');
  btnX.onclick  = close;
  btnOK.onclick = () => { close(); if (onConfirm) onConfirm(); };
  modal.onclick = (e) => { if (e.target === modal) close(); };
}

function watchAd() {
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = localStorage.getItem('xroads_ad_date') || '';
  let count = lastDate === today ? parseInt(localStorage.getItem('xroads_ad_count') || '0', 10) : 0;
  if (count >= AD_DAILY_LIMIT) {
    showModal('Come Back Tomorrow',
      'You\'ve already earned your ' + AD_CREDIT_REWARD + ' free credits today.<br>One ad per day — come back tomorrow.',
      'OK');
    return;
  }
  // TODO: Replace body of this function with real AdSense rewarded ad API call.
  // On real ad completion callback, call: addCredits(AD_CREDIT_REWARD) and increment count.
  count++;
  localStorage.setItem('xroads_ad_date', today);
  localStorage.setItem('xroads_ad_count', String(count));
  addCredits(AD_CREDIT_REWARD);
  track('credits_earned_ad', { credits: AD_CREDIT_REWARD });
  showModal('Credits Earned',
    '+' + AD_CREDIT_REWARD + ' credits added.<br>' +
    '<span style="color:var(--ash);font-size:.85rem">' + count + ' / ' + AD_DAILY_LIMIT + ' ad views today</span>',
    'OK');
}

function earnOrBuyModal() {
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = localStorage.getItem('xroads_ad_date') || '';
  const count = lastDate === today ? parseInt(localStorage.getItem('xroads_ad_count') || '0', 10) : 0;
  const canWatch = count < AD_DAILY_LIMIT;
  showModal(
    'Get Credits',
    '<div style="margin-bottom:1rem">Balance: <strong style="color:var(--gold)">' + getCredits() + ' credits</strong></div>' +
    (canWatch
      ? '<div style="margin-bottom:1.2rem">◇ <strong>Watch today\'s ad</strong> — +' + AD_CREDIT_REWARD + ' credits (1 per day)</div>'
      : '<div style="margin-bottom:1.2rem;color:var(--ash)">◇ Ad credits claimed today — come back tomorrow</div>') +
    '<div style="font-family:\'DM Mono\',monospace;font-size:.75rem;color:var(--ash);margin-bottom:.6rem;letter-spacing:.05em">BUY CREDITS</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem .75rem;margin-bottom:1rem">' +
    CREDIT_TIERS.map(t =>
      '<div style="font-size:.92rem"><strong style="color:var(--gold)">' + t.credits + '</strong> credits</div>' +
      '<div style="font-size:.92rem;color:var(--ash)">' + t.price + '</div>'
    ).join('') +
    '</div>' +
    '<div style="color:var(--ash);font-size:.78rem">In-app purchase via Google Play Billing (coming at launch)</div>',
    canWatch ? 'Watch Ad (+' + AD_CREDIT_REWARD + ')' : 'OK',
    canWatch ? watchAd : null,
    canWatch ? 'Cancel' : null
  );
}

// ── Oracle / TMI house ads ─────────────────────────────────────────────────────
// Standard mode: .ad-slot shows AdSense. Oracle mode: swapAdsForOracle() replaces with TMI ads.
// TMI appears ~67% of slots, MAESTRO ~33% — weighted by array size.
const TMI_HOUSE_ADS = [
  '<a class="house-ad house-ad-tmi" href="https://thessalonian.org" target="_blank" rel="noopener"><div class="house-ad-mark">Thessalonian Mandate Institute</div><div class="house-ad-sub">True knowledge. True calling. Enroll now.</div></a>',
  '<a class="house-ad house-ad-tmi" href="https://thessalonian.org" target="_blank" rel="noopener"><div class="house-ad-mark">TMI — 508(c)(1)(a) Faith-Based Organization</div><div class="house-ad-sub">Education rooted in purpose.</div></a>',
  '<a class="house-ad house-ad-maestro" href="#" target="_blank" rel="noopener"><div class="house-ad-mark">MAESTRO AI College</div><div class="house-ad-sub">Learn AI the right way.</div></a>',
];

function swapAdsForOracle() {
  document.querySelectorAll('.ad-slot').forEach(slot => {
    slot.innerHTML = TMI_HOUSE_ADS[Math.floor(Math.random() * TMI_HOUSE_ADS.length)];
    slot.classList.add('oracle-ad');
  });
}

// ── Interpretation reading render ──────────────────────────────────────────────
// Called after chart renders (standard) and again when Oracle mode activates.
function renderReading(reading, mode) {
  const out = document.getElementById('readingOutput');
  if (!out || !reading) return;
  const label = mode === 'oracle' ? 'The Oracle Reading' : 'Your Reading';
  const rows = (reading.transitLines || []).map(l => `<p class="reading-transit-line">${l}</p>`).join('');
  out.innerHTML = `
    <div class="reading-header"><div class="section-label">${label}</div></div>
    ${reading.identity   ? `<div class="reading-block reading-identity"><p>${reading.identity}</p></div>` : ''}
    ${reading.projection ? `<div class="reading-block reading-projection"><p>${reading.projection}</p></div>` : ''}
    ${reading.emotion    ? `<div class="reading-block reading-emotion"><p>${reading.emotion}</p></div>` : ''}
    ${reading.vocation   ? `<div class="reading-block reading-vocation"><p>${reading.vocation}</p></div>` : ''}
    ${rows               ? `<div class="reading-block reading-transits">${rows}</div>` : ''}
    ${reading.synthesis  ? `<div class="reading-block reading-synthesis"><p>${reading.synthesis}</p></div>` : ''}
    ${reading.footerHint ? `<div class="reading-hint">${reading.footerHint}</div>` : ''}
  `;
}

// ── Now Reading (scoped predictive, next ~24h) ────────────────────────────────
const SCOPE_META = {
  love:       { label: 'Love & Romance',      planets: ['Venus','Moon','Mars'],            houses: [5,7,8,4] },
  work:       { label: 'Career & Work',        planets: ['Sun','Saturn','Mercury','Mars'],  houses: [6,10,2,3] },
  health:     { label: 'Health & Vitality',    planets: ['Moon','Mars','Sun'],              houses: [1,6,12] },
  finances:   { label: 'Finances',             planets: ['Venus','Jupiter','Saturn'],       houses: [2,8,11] },
  creativity: { label: 'Creativity & Spirit',  planets: ['Venus','Sun','Moon','Jupiter'],  houses: [5,3,9,12] },
  general:    { label: 'All Areas',            planets: null,                               houses: null },
};

const NOW_SCOPE_INTERP = {
  love:       {
    conjunction:'draws two forces into direct contact — expect intensity and closeness',
    sextile:    'opens a smooth channel — small social moments carry unexpected warmth',
    square:     'creates productive friction — tension that clarifies what you actually want',
    trine:      'flows easily — natural magnetism is heightened without effort',
    quincunx:   'asks for adjustment — something in the dynamic needs a small recalibration',
    opposition: 'puts two desires in direct view of each other — negotiation, not avoidance',
  },
  work:       {
    conjunction:'focuses energy sharply — decisions made now carry real weight',
    sextile:    'opens a practical door — outreach, communication, or initiative pays off',
    square:     'introduces a test — pressure that sharpens your actual capability',
    trine:      'eases the path — effort lands well and authority is on your side',
    quincunx:   'flags a mismatch — recalibrate expectations before proceeding',
    opposition: 'surfaces a competing priority — clarity comes from facing it directly',
  },
  health:     {
    conjunction:'amplifies the body\'s signal — rest or move, but do not ignore what you feel',
    sextile:    'supports recovery and regulation — a good moment to establish a small habit',
    square:     'introduces strain — mind and body are asking for different things',
    trine:      'supports the system — energy flows and the body responds well',
    quincunx:   'suggests a subtle imbalance — something small has compounded',
    opposition: 'creates an axis of tension — emotional and physical states are in dialogue',
  },
  finances:   {
    conjunction:'concentrates financial energy — a decision point is forming',
    sextile:    'opens a small but real opportunity — pursue it with modest action',
    square:     'introduces a constraint — pressure that clarifies genuine priorities',
    trine:      'supports flow — resources move and the timing is favorable',
    quincunx:   'flags a leak or mismatch — audit before committing',
    opposition: 'surfaces a competing demand — choose rather than delay',
  },
  creativity: {
    conjunction:'sparks direct contact with an idea or impulse — act on it immediately',
    sextile:    'offers a light on — inspiration is available if you reach for it',
    square:     'creates productive resistance — the friction is generative, not blocking',
    trine:      'opens the channel fully — create now, edit later',
    quincunx:   'asks for a form shift — the idea is right, the container may not be',
    opposition: 'puts vision and execution in tension — useful for refining, not launching',
  },
  general:    {
    conjunction:'brings two forces into direct alignment — a significant moment',
    sextile:    'opens a practical channel — small initiative yields results',
    square:     'applies pressure that produces growth — do not avoid it',
    trine:      'eases flow across this area of life — work with it',
    quincunx:   'flags a need for adjustment — something small is misaligned',
    opposition: 'creates visible tension between two priorities — engage, do not defer',
  },
};

const HOUSE_CONTEXT = [
  'self and body','resources and values','communication','home and family',
  'creativity and pleasure','health and service','relationships','shared resources',
  'expansion and belief','career and legacy','community and goals','inner life and endings',
  'liminal space and integration',
];

function buildNowReading(transitAspects, scope, mode) {
  const meta = SCOPE_META[scope] || SCOPE_META.general;
  const interp = NOW_SCOPE_INTERP[scope] || NOW_SCOPE_INTERP.general;

  // Score each transit for relevance to the chosen scope
  function scoreTransit(t) {
    let s = 0;
    if (meta.planets && meta.planets.includes(t.bodyA)) s += 3;
    if (meta.houses  && meta.houses.includes(t.natalHouse)) s += 3;
    if (t.applying)   s += 4;
    if (t.orb < 0.5)  s += 3;
    else if (t.orb < 1.5) s += 2;
    else if (t.orb < 3)   s += 1;
    // Moon is always time-sensitive (moves ~13°/day)
    if (t.bodyA === 'Moon') s += 2;
    return s;
  }

  const scored = transitAspects
    .map(t => ({ ...t, _score: scoreTransit(t) }))
    .sort((a, b) => b._score - a._score);

  const top = scored.slice(0, 3);

  if (!top.length) {
    return `<div class="now-reading-block"><p>The sky is in a quiet phase relative to your chart right now — no major transits are closing within orb for ${meta.label.toLowerCase()}. This is a window for consolidation rather than action.</p></div>`;
  }

  const moon = top.find(t => t.bodyA === 'Moon');
  const primary = top[0];
  const secondary = top[1];

  const houseOf = (t) => t.natalHouse ? `your house of ${HOUSE_CONTEXT[(t.natalHouse - 1) % 13]}` : 'your chart';
  const timing  = (t) => {
    if (!t.daysToExact) return 'over the coming hours';
    if (t.daysToExact < 0.25) return 'within the next few hours';
    if (t.daysToExact < 0.5)  return 'by tonight';
    if (t.daysToExact < 1)    return 'sometime today';
    return 'within the next day';
  };
  const aspVerb = (t) => t.applying ? 'is forming' : 'is completing';
  const aspDesc = (t) => interp[t.name?.toLowerCase()] || interp.conjunction;

  const label    = mode === 'oracle' ? 'ORACLE' : meta.label.toUpperCase();
  const oracleNote = mode === 'oracle' ? '<p class="now-reading-oracle-voice">The unvarnished read follows.</p>' : '';

  let html = `<div class="now-reading-block">`;
  html += `<div class="now-reading-scope-label">${label} · NEXT 24 HOURS</div>`;
  html += oracleNote;

  // Primary transit
  html += `<p><strong>${primary.bodyA}</strong> ${aspVerb(primary)} a ${primary.name?.toLowerCase() || 'aspect'} with your natal ${primary.bodyB} in ${houseOf(primary)}, ${timing(primary)}. This ${aspDesc(primary)}.</p>`;

  // Secondary transit (if present)
  if (secondary) {
    html += `<p>Simultaneously, <strong>${secondary.bodyA}</strong> is ${secondary.applying ? 'moving toward' : 'separating from'} your natal ${secondary.bodyB} — ${aspDesc(secondary)}.</p>`;
  }

  // Moon timing note
  if (moon && moon !== primary) {
    html += `<p class="now-reading-moon">The Moon is the fastest clock in this chart right now. Its passage through ${moon.bodyB === 'Ascendant' ? 'your Ascendant' : 'natal ' + moon.bodyB} completes ${timing(moon)} — watch for a shift in emotional tone at that moment.</p>`;
  } else if (moon) {
    html += `<p class="now-reading-moon">The Moon is the primary mover here. It completes this passage ${timing(moon)} — the shift will be felt, not just seen.</p>`;
  }

  // Synthesis
  const synthScope = {
    love:       'In matters of connection, the window open right now rewards',
    work:       'For your work and output, the current alignment favors',
    health:     'Your body is signaling',
    finances:   'Financially, the next 24 hours call for',
    creativity: 'Creatively, what is available to you right now is',
    general:    'The most active thread in your chart right now points toward',
  };
  const synthAction = {
    conjunction:'directness. Make the contact. Say the thing.',
    sextile:    'a light touch. Small initiative, not grand gesture.',
    square:     'engagement rather than avoidance. The resistance is productive.',
    trine:      'trust. Let it move without forcing it.',
    quincunx:   'adjustment. One thing is slightly off — find it.',
    opposition: 'naming the tension. Clarity over comfort.',
  };
  const synthKey = primary.name?.toLowerCase() || 'conjunction';
  html += `<p><em>${synthScope[scope] || synthScope.general} ${synthAction[synthKey] || synthAction.conjunction}</em></p>`;

  html += '</div>';
  return html;
}

// ── Ecliptic strip ────────────────────────────────────────────────────────────

function buildEclipticStrip(containerId, sunSidLon, moonSidLon) {
  const strip = document.getElementById(containerId);
  if (!strip) return;
  strip.innerHTML = '';
  const ordered = [...SIGNS];
  let cumPct = 0;
  ordered.forEach(sign => {
    const pct  = (sign.days / TOTAL_DAYS) * 100;
    const band = document.createElement('div');
    band.className = 'ecl-band' +
      (sign.name === 'Ophiuchus' ? ' ecl-ophiuchus' : '') +
      (sign.name === 'Scorpius'  ? ' ecl-scorpius'  : '');
    band.style.left  = cumPct + '%';
    band.style.width = pct + '%';
    band.title = `${sign.name}: ${sign.date_approx} (${sign.days}d)`;
    band.innerHTML = `<span class="ecl-label">${sign.symbol}</span>`;
    strip.appendChild(band);
    sign._stripLeft = cumPct;
    sign._stripPct  = pct;
    cumPct += pct;
  });
  if (sunSidLon !== null && sunSidLon !== undefined)
    _placeStripMarker(strip, sunSidLon, 'ecl-sun-marker', ordered);
  if (moonSidLon !== null && moonSidLon !== undefined)
    _placeStripMarker(strip, moonSidLon, 'ecl-moon-marker', ordered);
}

function _placeStripMarker(strip, sidLon, cls, ordered) {
  const sign   = eclipticToSign(sidLon);
  const cached = ordered.find(s => s.name === sign.name);
  if (!cached) return;
  const spanDeg = sign.name === 'Pisces' ? 37 : sign.lon_end - sign.lon_start;
  const degIn   = degreeInSign(sidLon, sign);
  const frac    = Math.min(Math.max(degIn / spanDeg, 0), 1);
  const pct     = cached._stripLeft + frac * cached._stripPct;
  const marker  = document.createElement('div');
  marker.className = cls;
  marker.style.left = pct + '%';
  strip.appendChild(marker);
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function traitsHTML(sign) {
  if (!sign.traits?.length) return '';
  return `<div class="traits-grid">${sign.traits.map(t=>`<span class="trait-pill">${t}</span>`).join('')}</div>`;
}

function badgesHTML(sign) {
  if (!sign.element) return '';
  return `<div class="sign-badges">
    <span class="sign-badge badge-element">${sign.element}</span>
    <span class="sign-badge badge-polarity">${sign.polarity}</span>
    <span class="sign-badge badge-days">${sign.days}d solar transit</span>
  </div>`;
}

function planetSymbol(id) {
  return PLANETS.find(p => p.id === id)?.symbol || id;
}

function planetLabel(id) {
  return PLANETS.find(p => p.id === id)?.label || id;
}

function rxBadge(isRetrograde) {
  return isRetrograde ? '<span class="retrograde-badge" title="Retrograde">℞</span>' : '';
}

function angDist(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// ── Signs grid (populated on DOMContentLoaded) ────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  const signsGrid = document.getElementById('signsGrid');
  if (signsGrid) {
    SIGNS.forEach(sign => {
      const tile = document.createElement('div');
      tile.className = 'sign-tile' + (sign.name === 'Ophiuchus' ? ' is-ophiuchus' : '');
      tile.innerHTML = `
        <div class="sign-tile-symbol">${sign.symbol}</div>
        <div class="sign-tile-name">${sign.name}</div>
        <div class="sign-tile-dates">${sign.date_approx}</div>`;
      signsGrid.appendChild(tile);
    });
  }

  // ── Credits UI init ────────────────────────────────────────────────────────
  updateCreditsUI();
  document.getElementById('earnCreditsBtn')?.addEventListener('click', earnOrBuyModal);

  // ── Oracle trigger: click ⛎ in header 3 times ──────────────────────────────
  // No URL hash, no localStorage — must be discovered fresh each session.
  let _oracleClicks = 0;
  document.getElementById('oracleTrigger')?.addEventListener('click', function() {
    _oracleClicks++;
    if (_oracleClicks >= 3) {
      _oracleClicks = 0;
      document.getElementById('oracleOverlay')?.classList.remove('hidden');
    }
  });

  document.getElementById('enterOracleBtn')?.addEventListener('click', function() {
    document.getElementById('oracleOverlay')?.classList.add('hidden');
    document.body.dataset.mode = 'oracle';
    document.getElementById('oracleTrigger')?.classList.add('oracle-active');
    swapAdsForOracle();
    track('oracle_unlocked');
    // Re-render reading in oracle voice if chart is already loaded
    if (_natalChart && typeof buildFullReading === 'function') {
      const reading = buildFullReading(
        _natalChart, _currentChart, _transitAspects, _natalAspects,
        _domPlanet, _domHouse, _sunHouse, _moonHouse, _ascHouse, 'oracle'
      );
      renderReading(reading, 'oracle');
    }
  });

  // Birth geolocation
  document.getElementById('geoBtn')?.addEventListener('click', function() {
    if (!navigator.geolocation) return;
    this.textContent = '◇ Locating…';
    const btn = this;
    navigator.geolocation.getCurrentPosition(
      pos => {
        document.getElementById('lat').value = pos.coords.latitude.toFixed(4);
        document.getElementById('lon').value = pos.coords.longitude.toFixed(4);
        btn.textContent = '◆ Location set';
        document.getElementById('utcOffset').value = -(new Date().getTimezoneOffset()/60);
      },
      () => { btn.textContent = '◇ Location unavailable'; }
    );
  });

  // Birth city geocoding — fires on blur or Enter in the city field
  const cityInput = document.getElementById('birthCity');
  if (cityInput) {
    let geocodeTimer;
    const doGeocode = async () => {
      const q = cityInput.value.trim();
      if (!q) return;
      cityInput.style.borderColor = 'var(--ash)';
      cityInput.title = 'Looking up…';
      try {
        const geo = await apiGeocode(q);
        if (geo.error) throw new Error(geo.error);

        document.getElementById('lat').value = geo.lat.toFixed(4);
        document.getElementById('lon').value = geo.lon.toFixed(4);
        cityInput.title = geo.display_name;

        // Get UTC offset for the birth date + location
        const dateVal  = document.getElementById('birthDate').value;
        const timeVal  = document.getElementById('birthTime').value || '12:00';
        if (dateVal) {
          const [yr,mo,dy] = dateVal.split('-').map(Number);
          const [hr,mn]    = timeVal.split(':').map(Number);
          const ts = Math.floor(new Date(yr,mo-1,dy,hr,mn,0).getTime()/1000);
          const tz = await apiTimezone(geo.lat, geo.lon, ts);
          if (!tz.error) {
            document.getElementById('utcOffset').value = tz.offset;
            cityInput.title += ` · ${tz.timezone} (${tz.offset_label}, UTC${tz.offset>=0?'+':''}${tz.offset})`;
          }
        }
        cityInput.style.borderColor = 'var(--emerald-light)';
      } catch(err) {
        cityInput.style.borderColor = 'var(--wine-light)';
        cityInput.title = 'Geocode failed: ' + err.message;
      }
    };
    cityInput.addEventListener('blur', doGeocode);
    cityInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); doGeocode(); }
    });
  }

  // Current location geolocation
  document.getElementById('currentGeoBtn')?.addEventListener('click', function() {
    if (!navigator.geolocation) return;
    this.textContent = '◇ Locating…';
    const btn = this;
    navigator.geolocation.getCurrentPosition(
      pos => {
        document.getElementById('currentLat').value = pos.coords.latitude.toFixed(4);
        document.getElementById('currentLon').value = pos.coords.longitude.toFixed(4);
        btn.textContent = '◆ Current location set';
      },
      () => { btn.textContent = '◇ Location unavailable'; }
    );
  });

  // ── Form submit ────────────────────────────────────────────────────────────
  document.getElementById('birthForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const dateVal    = document.getElementById('birthDate').value;
    if (!dateVal) return;
    const timeVal    = document.getElementById('birthTime').value   || '12:00';
    const utcOffset  = parseFloat(document.getElementById('utcOffset').value)    || 0;
    const birthLat   = parseFloat(document.getElementById('lat').value);
    const birthLon   = parseFloat(document.getElementById('lon').value);
    const currLatRaw = document.getElementById('currentLat').value;
    const currLonRaw = document.getElementById('currentLon').value;
    const currentLat = currLatRaw ? parseFloat(currLatRaw) : birthLat;
    const currentLon = currLonRaw ? parseFloat(currLonRaw) : birthLon;

    const [year, month, day]  = dateVal.split('-').map(Number);
    const [hour, minute]      = timeVal.split(':').map(Number);
    const birthUTC = new Date(Date.UTC(year, month-1, day, hour-utcOffset, minute, 0));

    const currentUTC  = new Date();
    const currentYear = currentUTC.getFullYear();

    // Show results section immediately with loading state
    const badge       = document.getElementById('jplBadge');
    const chartOut    = document.getElementById('chartOutput');
    const resultsEl   = document.getElementById('results');
    badge.className   = 'jpl-badge jpl-pending';
    badge.textContent = '⟳ Querying NASA JPL Horizons for birth moment and current sky…';
    chartOut.innerHTML = '';
    resultsEl.classList.remove('hidden');
    resultsEl.scrollIntoView({ behavior:'smooth', block:'start' });

    // ── Fetch from JPL (both natal and current sky in parallel) ───────────────
    let natalChart, currentChart, natalVelocities = {}, currentVelocities = {};
    let dataSource = 'jpl';

    try {
      const [natalData, currentData] = await Promise.all([
        apiJplChart(birthUTC.toISOString()),
        apiJplChart(currentUTC.toISOString()),
      ]);
      if (!natalData.positions || !currentData.positions) throw new Error('empty positions');

      natalChart       = calcChartFromJPL(natalData.positions,   birthUTC,   birthLat,   birthLon);
      currentChart     = calcChartFromJPL(currentData.positions, currentUTC, currentLat, currentLon);
      natalVelocities   = natalData.velocities   || {};
      currentVelocities = currentData.velocities || {};

      const nb = Object.keys(natalData.positions).length;
      const cb = Object.keys(currentData.positions).length;
      badge.className = 'jpl-badge jpl-ok';
      badge.innerHTML = `✓ <strong>NASA JPL Horizons</strong> — ${nb} bodies (natal) · ${cb} bodies (current sky)`;
    } catch(err) {
      dataSource = 'engine';
      try {
        natalChart   = calcChart(year, month, day, hour, minute, utcOffset, birthLat, birthLon);
        currentChart = calcChart(currentYear, currentUTC.getMonth()+1, currentUTC.getDate(),
                                 currentUTC.getHours(), currentUTC.getMinutes(), 0, currentLat, currentLon);
        badge.className = 'jpl-badge jpl-offline';
        badge.textContent = '◌ NASA JPL unreachable — using Astronomy Engine (DE440 equivalent)';
      } catch(e2) {
        chartOut.innerHTML = `<p style="color:var(--wine-light);font-family:'DM Mono',monospace;font-size:.8rem;">Error: ${e2.message}</p>`;
        return;
      }
    }

    // ── Build sidereal point maps ──────────────────────────────────────────────
    const ANGLE_KEYS = ['Ascendant','MC','DSC','IC'];
    const PLANET_IDS = PLANETS.map(p => p.id);

    function sidLon(chart, key) { return chart[key]?.tropicalLon; }

    const natalPoints = {};
    for (const id of PLANET_IDS)  if (natalChart[id])  natalPoints[id]  = sidLon(natalChart, id);
    for (const k of ANGLE_KEYS)   if (natalChart[k])   natalPoints[k]   = sidLon(natalChart, k);

    const currPoints = {};
    for (const id of PLANET_IDS)  if (currentChart[id]) currPoints[id]  = sidLon(currentChart, id);
    for (const k of ANGLE_KEYS)   if (currentChart[k])  currPoints[k]   = sidLon(currentChart, k);

    // ── Houses ────────────────────────────────────────────────────────────────
    const ascSign     = natalChart.Ascendant?.sign;
    const natalHouses = ascSign ? calcHouses(ascSign) : SIGNS;

    function natalHouseOf(sign) { return ascSign ? houseOf(sign, ascSign) : 1; }

    // ── Aspects ───────────────────────────────────────────────────────────────
    const natalAspects  = calcAspects(natalPoints, natalPoints);
    const currAspects   = calcAspects(currPoints, currPoints);

    // Transit aspects: current bodies → natal points
    // Transit bodyA = current planet, bodyB = natal point
    const currBodyPoints = {};
    for (const id of PLANET_IDS) if (currentChart[id]) currBodyPoints[id] = sidLon(currentChart, id);

    const rawTransits = calcAspects(currBodyPoints, natalPoints);
    const transitAspects = rawTransits.map(t => {
      const vel     = currentVelocities[t.bodyA];
      const natalSig = natalChart[t.bodyB]?.sign;
      return {
        ...t,
        natalHouse:      natalSig ? natalHouseOf(natalSig) : null,
        transitSign:     currentChart[t.bodyA]?.sign,
        isRetrograde:    vel !== undefined ? vel < 0 : false,
        applying:        vel !== undefined
                           ? calcApplying(currBodyPoints[t.bodyA], natalPoints[t.bodyB], t.angle, vel)
                           : null,
        transitDuration: vel !== undefined ? calcTransitDuration(vel, t.orb) : null,
        daysToExact:     vel !== undefined ? (t.orb / Math.abs(vel)) : null,
      };
    });

    // ── Mundane aspects ───────────────────────────────────────────────────────
    const MUNDANE = ['Jupiter','Saturn','Uranus','Neptune','Pluto'];
    const mundaneAspects = currAspects.filter(a =>
      MUNDANE.includes(a.bodyA) && MUNDANE.includes(a.bodyB));

    // ── Angular planets (current) ─────────────────────────────────────────────
    const currAsc = currPoints.Ascendant, currMC = currPoints.MC;
    const currDSC = currPoints.DSC,       currIC  = currPoints.IC;
    const isAngular = {};
    for (const id of PLANET_IDS) {
      if (!currentChart[id]) continue;
      const lon = sidLon(currentChart, id);
      isAngular[id] = Math.min(
        angDist(lon, currAsc||0), angDist(lon, currMC||0),
        angDist(lon, currDSC||0), angDist(lon, currIC||0)
      ) < 5;
    }

    // ── Dominance ─────────────────────────────────────────────────────────────
    const currSigns = {};
    for (const id of PLANET_IDS) currSigns[id] = currentChart[id]?.sign;

    const universalResult = calcUniversalDominance({}, currSigns, currAspects, isAngular);
    const natalResult     = calcNatalDominance(transitAspects, currSigns, isAngular);

    const currInNatalHouse = {};
    for (const id of PLANET_IDS) {
      const s = currentChart[id]?.sign;
      if (s) currInNatalHouse[id] = natalHouseOf(s);
    }
    const domHouse = calcDominantHouse(transitAspects, currInNatalHouse);

    // Current Sun / Moon / ASC natal house
    const currSunNatalHouse  = currentChart.Sun?.sign  ? natalHouseOf(currentChart.Sun.sign)  : null;
    const currMoonNatalHouse = currentChart.Moon?.sign ? natalHouseOf(currentChart.Moon.sign) : null;
    const currAscNatalHouse  = currentChart.Ascendant?.sign ? natalHouseOf(currentChart.Ascendant.sign) : null;

    // ── Full aspect matrix ────────────────────────────────────────────────────
    const allPoints = {};
    for (const [k,v] of Object.entries(natalPoints))  allPoints[`N:${k}`] = v;
    for (const [k,v] of Object.entries(currPoints))   allPoints[`C:${k}`] = v;
    const fullMatrix = buildFullAspectMatrix(allPoints);

    // ── Render ─────────────────────────────────────────────────────────────────
    const sun  = natalChart['Sun'];
    const moon = natalChart['Moon'];
    const asc  = natalChart['Ascendant'];
    const mc   = natalChart['MC'];

    const tropName   = tropicalSignName(month, day);
    const trueName   = sun?.sign?.name || '?';
    const signChanged = tropName.toLowerCase().replace('scorpio','scorpius') !== trueName.toLowerCase();

    // Natal ecliptic strip
    buildEclipticStrip('eclipticStrip', sun?.tropicalLon, moon?.tropicalLon);

    // ── Section: Natal chart ──────────────────────────────────────────────────
    const corrNote = signChanged
      ? `<div class="correction-note">You were told you are a ${tropName}. The sky says you are a ${trueName}.</div>`
      : '';

    const ascHTML = asc ? `
      <div class="asc-card">
        <div class="asc-label">Rising Sign (Ascendant)</div>
        <div class="asc-body">
          <span class="asc-symbol">${asc.sign.symbol}</span>
          <span class="asc-name">${asc.sign.name}</span>
          <span class="asc-degree">${asc.degree}° ${asc.minutes}'</span>
        </div>
      </div>` : '';

    const mcHTML = mc ? `
      <div class="asc-card" style="border-color:var(--gold)">
        <div class="asc-label">Midheaven (MC) — Career & Legacy</div>
        <div class="asc-body">
          <span class="asc-symbol">${mc.sign.symbol}</span>
          <span class="asc-name">${mc.sign.name}</span>
          <span class="asc-degree">${mc.degree}° ${mc.minutes}'</span>
        </div>
      </div>` : '';

    // Planet grid (natal)
    let planetsHTML = '';
    for (const p of PLANETS) {
      if (p.id === 'Sun') continue;
      const c = natalChart[p.id];
      if (!c) continue;
      const isOph = c.sign.name === 'Ophiuchus';
      const hnum  = natalHouseOf(c.sign);
      planetsHTML += `
        <div class="planet-card${isOph?' planet-card-oph':''}">
          <div class="planet-card-symbol">${p.symbol}</div>
          <div class="planet-card-name">${p.label}</div>
          <div class="planet-card-sign">${c.sign.symbol} ${c.sign.name}</div>
          <div class="planet-card-degree">${c.degree}° ${c.minutes}' <span class="house-num">H${hnum}</span></div>
        </div>`;
    }

    // Houses panel
    let housesHTML = '<div class="houses-grid">';
    for (let h = 0; h < 13; h++) {
      const sign     = natalHouses[h];
      const hnum     = h + 1;
      const theme    = HOUSE_THEMES[h];
      const isDom    = hnum === domHouse;
      const planetsInHouse = PLANET_IDS
        .filter(id => natalChart[id] && natalHouseOf(natalChart[id].sign) === hnum)
        .map(id => `${planetSymbol(id)}`)
        .join(' ');
      housesHTML += `
        <div class="house-cell${isDom?' dominant':''}">
          <div class="house-num-large">${hnum}</div>
          <div class="house-sign">${sign.symbol} ${sign.name}</div>
          <div class="house-theme">${theme}</div>
          ${planetsInHouse ? `<div class="house-planets">${planetsInHouse}</div>` : ''}
        </div>`;
    }
    housesHTML += '</div>';

    // Natal aspects list (top 10 by exactness)
    let natalAspHTML = '';
    if (natalAspects.length) {
      natalAspHTML = '<div class="aspect-list">' +
        natalAspects.slice(0, 12).map(a =>
          `<div class="aspect-row">
            <span class="asp-body">${planetSymbol(a.bodyA)} ${a.bodyA}</span>
            <span class="asp-glyph" title="${a.name}">${a.symbol}</span>
            <span class="asp-body">${a.bodyB === 'Ascendant' ? '↑ ASC' : a.bodyB === 'MC' ? '↑ MC' : planetSymbol(a.bodyB)+' '+a.bodyB}</span>
            <span class="asp-orb">${a.orb.toFixed(1)}°</span>
          </div>`
        ).join('') + '</div>';
    }

    // Trad comparison
    const tradHTML = `
      <div class="trad-compare">
        <span class="trad-label">Western tropical assigns:</span>
        <span class="trad-val">${tropName}</span>
        <span class="trad-sep">·</span>
        <span class="trad-label">Sidereal sky:</span>
        <span class="trad-val trad-true">${trueName}</span>
      </div>`;

    // ── Section: Universal dominance + current sky ────────────────────────────
    const univDomNames = universalResult.dominants.map(id => `${planetSymbol(id)} ${id}`).join(', ') || '—';
    let univHTML = `
      <div class="universal-card">
        <div class="section-label" style="margin-bottom:.5rem">Universal Sky Dominance</div>
        <div class="universal-dominant">${univDomNames}</div>
        <div class="universal-sub">Currently dominating the sky for all of Earth — by aspect connectivity, angularity, dignity, and exaltation.</div>
      </div>`;

    // Mundane aspects
    if (mundaneAspects.length) {
      univHTML += '<div class="section-label" style="margin-top:2rem;margin-bottom:1rem">Mundane Configurations</div>';
      for (const ma of mundaneAspects) {
        const pairKey  = [ma.bodyA, ma.bodyB].sort();
        const [pA, pB] = pairKey;
        const desc = MUNDANE_THEMES?.[pA]?.[pB]?.[ma.name] || MUNDANE_THEMES?.[pB]?.[pA]?.[ma.name] || '';
        univHTML += `
          <div class="mundane-aspect-card">
            <div class="mundane-bodies">${planetSymbol(ma.bodyA)} ${ma.bodyA} ${ma.symbol} ${planetSymbol(ma.bodyB)} ${ma.bodyB}</div>
            <div class="mundane-orb">orb ${ma.orb.toFixed(1)}°</div>
            ${desc ? `<div class="mundane-desc">${desc}</div>` : ''}
          </div>`;
      }
    }

    // Current sky planet grid
    let currPlanetsHTML = '';
    for (const p of PLANETS) {
      const c = currentChart[p.id];
      if (!c) continue;
      const vel = currentVelocities[p.id];
      const retro = vel !== undefined && vel < 0;
      const ang   = isAngular[p.id];
      currPlanetsHTML += `
        <div class="planet-card${ang?' planet-card-angular':''}">
          <div class="planet-card-symbol">${p.symbol}${rxBadge(retro)}</div>
          <div class="planet-card-name">${p.label}</div>
          <div class="planet-card-sign">${c.sign.symbol} ${c.sign.name}</div>
          <div class="planet-card-degree">${c.degree}° ${c.minutes}'</div>
        </div>`;
    }

    // Current Sun/Moon/ASC natal house summary
    const currSkyContextHTML = `
      <div class="current-sky-context">
        ${currSunNatalHouse  ? `<span>☉ Sun in natal H${currSunNatalHouse} — ${HOUSE_THEMES[currSunNatalHouse-1]}</span>` : ''}
        ${currMoonNatalHouse ? `<span>☽ Moon in natal H${currMoonNatalHouse} — ${HOUSE_THEMES[currMoonNatalHouse-1]}</span>` : ''}
        ${currAscNatalHouse  ? `<span>↑ Rising in natal H${currAscNatalHouse} — ${HOUSE_THEMES[currAscNatalHouse-1]}</span>` : ''}
      </div>`;

    // ── Section: Transits ─────────────────────────────────────────────────────
    let transitsHTML = '';
    if (transitAspects.length) {
      transitsHTML = '<div class="transit-list">';
      for (const t of transitAspects.slice(0, 25)) {
        const durText = t.transitDuration
          ? (t.transitDuration < 1 ? Math.round(t.transitDuration * 24) + 'h'
             : t.transitDuration < 365 ? Math.round(t.transitDuration) + 'd'
             : (t.transitDuration / 365).toFixed(1) + 'y')
          : '';
        const applyText = t.applying === true ? '⟶ applying'
                        : t.applying === false ? '⟵ separating' : '';
        const natalLabel = t.bodyB === 'Ascendant' ? '↑ natal ASC'
                         : t.bodyB === 'MC'        ? '⊕ natal MC'
                         : t.bodyB === 'DSC'       ? '↓ natal DSC'
                         : t.bodyB === 'IC'        ? '⊗ natal IC'
                         : `natal ${planetSymbol(t.bodyB)} ${t.bodyB}`;
        const classes = ['transit-row',
          t.orb <= 1 ? 'exact' : '',
          t.isRetrograde ? 'retrograde' : '',
          t.applying ? 'applying' : '',
        ].filter(Boolean).join(' ');
        transitsHTML += `
          <div class="${classes}">
            <span class="tr-transiting">${planetSymbol(t.bodyA)} ${t.bodyA}${rxBadge(t.isRetrograde)}</span>
            <span class="tr-glyph" title="${t.name}">${t.symbol}</span>
            <span class="tr-natal">${natalLabel}</span>
            <span class="tr-house">H${t.natalHouse||'?'}</span>
            <span class="tr-orb">${t.orb.toFixed(1)}°</span>
            ${durText ? `<span class="tr-dur">${durText}</span>` : ''}
            ${applyText ? `<span class="tr-apply">${applyText}</span>` : ''}
          </div>`;
      }
      transitsHTML += '</div>';
    } else {
      transitsHTML = '<p style="color:var(--ash);font-size:.85rem">No active transits within orb.</p>';
    }

    // ── Section: Dominant planet + house ─────────────────────────────────────
    const domPlanetNames = natalResult.dominants.map(id => `${planetSymbol(id)} ${id}`).join(', ') || '—';
    const domHouseTheme  = HOUSE_THEMES[domHouse - 1];
    const domTransits    = transitAspects.filter(t => t.natalHouse === domHouse).slice(0,5);

    const dominantHTML = `
      <div class="dominant-card">
        <div class="dominant-label">Currently Dominant Planet</div>
        <div class="dominant-name">${domPlanetNames}</div>
        <div class="dominant-sub">Highest weighted transit activity to your natal chart right now.</div>
      </div>
      <div class="dominant-house-card">
        <div class="dominant-label">Currently Dominant House</div>
        <div class="dominant-name">House ${domHouse} — ${domHouseTheme}</div>
        <div class="dominant-sub">${SIGNS[SIGNS.findIndex(s=>s.name===natalHouses[domHouse-1]?.name)]?.name || ''} · ${domTransits.length} active transit${domTransits.length!==1?'s':''}</div>
      </div>`;

    // ── Full matrix (collapsible) ─────────────────────────────────────────────
    const matrixRows = fullMatrix.slice(0, 50).map(m =>
      `<div class="matrix-row matrix-${m.category}">
        <span>${m.pointA}</span>
        <span>${m.symbol}</span>
        <span>${m.pointB}</span>
        <span>${m.orb.toFixed(1)}°</span>
      </div>`).join('');

    // ── Assemble all output ───────────────────────────────────────────────────
    chartOut.innerHTML = `
      <div class="chart-header">
        <div class="chart-sun-symbol">${sun?.sign?.symbol}</div>
        <div class="chart-sign-name">${trueName === 'Ophiuchus' ? '<em>Ophiuchus</em>' : trueName}</div>
        <div class="chart-dates">☉ Sun · ${sun?.degree}° ${sun?.minutes}' · ${sun?.sign?.date_approx}</div>
        ${badgesHTML(sun?.sign || {})}
        <p class="chart-mythology">${sun?.sign?.mythology || ''}</p>
      </div>
      ${corrNote}
      <div class="sign-desc-block">${sun?.sign?.desc || ''}</div>
      ${traitsHTML(sun?.sign || {})}
      ${ascHTML}${mcHTML}
      <div class="section-label" style="margin-top:2.5rem;margin-bottom:1.5rem">Natal Planetary Positions</div>
      <div class="planets-grid">${planetsHTML}</div>
      <div class="section-label" style="margin-top:2.5rem;margin-bottom:1rem">Natal Houses</div>
      ${housesHTML}
      <div class="section-label" style="margin-top:2rem;margin-bottom:1rem">Natal Aspects</div>
      ${natalAspHTML}

      <!-- Ad slot: between natal and current sky — AdSense standard / TMI oracle -->
      <div class="ad-slot ad-rect" id="adRect"></div>

      <div class="current-sky-divider">
        <span>The Sky Right Now</span>
      </div>
      ${univHTML}
      <div class="section-label" style="margin-top:2rem;margin-bottom:1rem">Current Planetary Positions</div>
      <div class="ecliptic-wrap" style="margin-bottom:1.5rem">
        <div class="ecliptic-strip-label">Current ecliptic</div>
        <div id="currentSkyStrip"></div>
      </div>
      <div class="planets-grid">${currPlanetsHTML}</div>
      ${currSkyContextHTML}

      <div class="current-sky-divider">
        <span>Your Transits</span>
      </div>
      ${transitsHTML}
      ${dominantHTML}

      <details class="matrix-details">
        <summary>Full aspect matrix (${fullMatrix.length} active aspects across all 28 points)</summary>
        <div class="aspect-matrix">${matrixRows}</div>
      </details>

      ${tradHTML}`;

    // Build current sky strip
    buildEclipticStrip('currentSkyStrip',
      currentChart.Sun?.tropicalLon,
      currentChart.Moon?.tropicalLon);

    // ── Store shared state for premium features ────────────────────────────────
    _natalChart     = natalChart;
    _currentChart   = currentChart;
    _natalAspects   = natalAspects;
    _transitAspects = transitAspects;
    _natalHouseOfFn = natalHouseOf;
    _domPlanet = natalResult.dominants[0] || 'Sun';
    _domHouse  = domHouse;
    _sunHouse  = sun?.sign  ? natalHouseOf(sun.sign)  : null;
    _moonHouse = moon?.sign ? natalHouseOf(moon.sign) : null;
    _ascHouse  = asc?.sign  ? natalHouseOf(asc.sign)  : null;

    // ── Celestial wheel SVG ────────────────────────────────────────────────────
    if (typeof buildWheelSVG === 'function') {
      const ww = document.getElementById('wheelWrap');
      if (ww) ww.innerHTML = buildWheelSVG(natalChart, currentChart, natalAspects);
    }

    // ── Interpretation reading ─────────────────────────────────────────────────
    if (typeof buildFullReading === 'function') {
      const mode = document.body.dataset.mode === 'oracle' ? 'oracle' : 'standard';
      const reading = buildFullReading(
        natalChart, currentChart, transitAspects, natalAspects,
        _domPlanet, domHouse, _sunHouse, _moonHouse, _ascHouse, mode
      );
      renderReading(reading, mode);
    }

    // Show premium buttons now that we have chart data
    document.getElementById('premiumBtns')?.classList.remove('hidden');
    track('chart_submitted');

    // If oracle is already active (re-submit after unlock), swap ads again
    if (document.body.dataset.mode === 'oracle') swapAdsForOracle();
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // PREMIUM FEATURES — wired here, inside DOMContentLoaded but outside form submit
  // ══════════════════════════════════════════════════════════════════════════════

  // ── Love Compatibility (synastry) ──────────────────────────────────────────
  // Cost: 10 credits (CREDIT_COSTS.synastry). Credits charged on form submit, not on button click.
  // NEXT: Replace alert/confirm credit flow with a proper modal (see earnOrBuyModal).
  document.getElementById('synastryBtn')?.addEventListener('click', function() {
    if (!_natalChart) return;
    if (getCredits() < CREDIT_COSTS.synastry) { earnOrBuyModal(); return; }
    const sec = document.getElementById('synastrySection');
    if (!sec) return;
    sec.classList.remove('hidden');
    sec.innerHTML = `
      <div class="section-label" style="margin-top:2rem">Love Compatibility</div>
      <p class="body-text" style="margin-top:.5rem">Enter your partner's birth data to see cross-aspects between your natal charts.</p>
      <form class="birth-form synastry-form" id="synastryForm">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Their Birth Date</label>
            <input type="date" id="sDate" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Birth Time</label>
            <input type="time" id="sTime" class="form-input" value="12:00">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Latitude</label>
            <input type="number" id="sLat" class="form-input" placeholder="30.2672" step="0.0001">
          </div>
          <div class="form-group">
            <label class="form-label">Longitude</label>
            <input type="number" id="sLon" class="form-input" placeholder="-97.7431" step="0.0001">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">UTC Offset</label>
            <input type="number" id="sUtc" class="form-input" value="-6" min="-12" max="14" step="0.5">
          </div>
        </div>
        <button type="submit" class="submit-btn">Calculate Compatibility — 10 credits</button>
      </form>
      <div id="synastryOutput"></div>
    `;
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });

    document.getElementById('synastryForm').addEventListener('submit', async function(ev) {
      ev.preventDefault();
      if (!spendCredits(CREDIT_COSTS.synastry)) { earnOrBuyModal(); return; }
      const out = document.getElementById('synastryOutput');
      out.innerHTML = '<p style="color:var(--ash);font-family:\'DM Mono\',monospace;font-size:.8rem">⟳ Querying JPL…</p>';
      try {
        const dv = document.getElementById('sDate').value;
        const tv = document.getElementById('sTime').value || '12:00';
        const uo = parseFloat(document.getElementById('sUtc').value) || 0;
        const la = parseFloat(document.getElementById('sLat').value) || 0;
        const lo = parseFloat(document.getElementById('sLon').value) || 0;
        const [yr, mo, dy] = dv.split('-').map(Number);
        const [hr, mn]     = tv.split(':').map(Number);
        const bUTC = new Date(Date.UTC(yr, mo - 1, dy, hr - uo, mn, 0));
        const jpl  = await apiJplChart(bUTC.toISOString());
        if (!jpl.positions) throw new Error('JPL fetch failed');
        const chartB = calcChartFromJPL(jpl.positions, bUTC, la, lo);
        const bPoints = {}, aPoints = {};
        const allIds = PLANETS.map(p => p.id);
        const angles = ['Ascendant', 'MC', 'DSC', 'IC'];
        for (const id of allIds) {
          if (chartB[id])      bPoints[id] = chartB[id].tropicalLon;
          if (_natalChart[id]) aPoints[id] = _natalChart[id].tropicalLon;
        }
        for (const k of angles) {
          if (chartB[k])      bPoints[k] = chartB[k].tropicalLon;
          if (_natalChart[k]) aPoints[k] = _natalChart[k].tropicalLon;
        }
        const crossAspects = calcAspects(aPoints, bPoints);
        const mode = document.body.dataset.mode === 'oracle' ? 'oracle' : 'standard';
        let html = '<div class="section-label" style="margin-top:1.5rem">Cross-Chart Aspects</div><div class="aspect-list">';
        for (const a of crossAspects.slice(0, 15)) {
          html += `<div class="aspect-row"><span class="asp-body">${planetSymbol(a.bodyA)} ${a.bodyA}</span><span class="asp-glyph">${a.symbol}</span><span class="asp-body">${planetSymbol(a.bodyB) || ''} ${a.bodyB}</span><span class="asp-orb">${a.orb.toFixed(1)}°</span></div>`;
        }
        html += '</div>';
        if (typeof buildSynastryReading === 'function') {
          const sr = buildSynastryReading(_natalChart, chartB, crossAspects, mode);
          if (sr) {
            html += '<div class="reading-block" style="margin-top:1.5rem">';
            for (const k of ['attraction', 'friction', 'longTerm', 'moonEmotional', 'synthesis']) {
              if (sr[k]) html += `<p>${sr[k]}</p>`;
            }
            html += '</div>';
          }
        }
        out.innerHTML = html;
        track('synastry_run');
      } catch (err) {
        document.getElementById('synastryOutput').innerHTML =
          `<p style="color:var(--wine-light);font-size:.8rem">Error: ${err.message}</p>`;
      }
    });
  });

  // ── Quarterly Prediction ───────────────────────────────────────────────────
  // Cost: 20 credits. Fetches 13 weekly JPL positions sequentially, checks transits vs natal.
  // NEXT: Add interpretation text per transit line using TRANSIT_BY_PLANET from interpretations.js.
  document.getElementById('quarterlyBtn')?.addEventListener('click', async function() {
    if (!_natalChart) return;
    if (getCredits() < CREDIT_COSTS.quarterly) { earnOrBuyModal(); return; }
    if (!spendCredits(CREDIT_COSTS.quarterly)) return;
    const sec = document.getElementById('quarterlySection');
    if (!sec) return;
    sec.classList.remove('hidden');
    sec.innerHTML = '<div class="section-label" style="margin-top:2rem">Quarterly Prediction</div><div id="quarterlyProgress" class="quarterly-progress">Fetching weekly sky data (0/13)…</div><div id="quarterlyOutput"></div>';
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const mode = document.body.dataset.mode === 'oracle' ? 'oracle' : 'standard';
    const now   = new Date();
    const weeks = Array.from({ length: 13 }, (_, i) => {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() + i * 7);
      return d;
    });
    const nPoints = {};
    for (const id of PLANETS.map(p => p.id)) if (_natalChart[id]) nPoints[id] = _natalChart[id].tropicalLon;
    for (const k of ['Ascendant', 'MC']) if (_natalChart[k]) nPoints[k] = _natalChart[k].tropicalLon;
    const results = [];
    for (let i = 0; i < weeks.length; i++) {
      const prog = document.getElementById('quarterlyProgress');
      if (prog) prog.textContent = `Fetching weekly sky data (${i + 1}/${weeks.length})…`;
      try {
        const jpl = await apiJplChart(weeks[i].toISOString());
        if (!jpl.positions) throw new Error('no positions');
        const wc = calcChartFromJPL(jpl.positions, weeks[i], 0, 0);
        const wPoints = {};
        for (const id of PLANETS.map(p => p.id)) if (wc[id]) wPoints[id] = wc[id].tropicalLon;
        results.push({ date: weeks[i], transits: calcAspects(wPoints, nPoints).slice(0, 5) });
      } catch { results.push({ date: weeks[i], transits: [] }); }
    }
    const prog = document.getElementById('quarterlyProgress');
    if (prog) prog.textContent = '';
    let html = '<div class="quarterly-timeline">';
    for (const w of results) {
      const label = w.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      html += `<div class="quarterly-week"><div class="quarterly-week-label">Week of ${label}</div>`;
      for (const t of w.transits) {
        const nb = t.bodyB === 'Ascendant' ? '↑ ASC'
                 : t.bodyB === 'MC' ? '⊕ MC'
                 : `${planetSymbol(t.bodyB) || ''} ${t.bodyB}`;
        const interp = (typeof TRANSIT_BY_PLANET !== 'undefined')
          ? TRANSIT_BY_PLANET?.[t.bodyA]?.[t.name]?.[mode] : '';
        html += `<div class="quarterly-transit">${planetSymbol(t.bodyA) || ''} ${t.bodyA} ${t.symbol} ${nb} <span class="tr-orb">${t.orb.toFixed(1)}°</span></div>`;
        if (interp) html += `<div class="quarterly-transit-text">${interp}</div>`;
      }
      if (!w.transits.length) html += '<div class="quarterly-transit" style="color:var(--ash)">No major aspects within orb</div>';
      html += '</div>';
    }
    html += '</div>';
    document.getElementById('quarterlyOutput').innerHTML = html;
    track('quarterly_run');
  });

  // ── Now Reading (scoped predictive) ────────────────────────────────────────
  // Cost: 3 credits. Uses already-computed transitAspects — no extra JPL call.
  // Shortcut URL /?quick=1 opens app directly; once chart is submitted this button appears.
  document.getElementById('suddenForecastBtn')?.addEventListener('click', function() {
    if (!_natalChart) return;
    if (getCredits() < CREDIT_COSTS.suddenForecast) { earnOrBuyModal(); return; }
    const sec = document.getElementById('suddenForecastSection');
    if (!sec) return;
    sec.classList.remove('hidden');
    document.getElementById('suddenForecastOutput').innerHTML = '';
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('scopeGrid')?.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-scope]');
    if (!btn || !_natalChart) return;
    if (!spendCredits(CREDIT_COSTS.suddenForecast)) { earnOrBuyModal(); return; }
    const scope = btn.dataset.scope;
    const mode  = document.body.dataset.mode === 'oracle' ? 'oracle' : 'standard';
    const html  = buildNowReading(_transitAspects, scope, mode);
    document.getElementById('suddenForecastOutput').innerHTML = html;
    document.getElementById('suddenForecastOutput').scrollIntoView({ behavior: 'smooth', block: 'start' });
    track('sudden_forecast_run', { scope });
  });

  // Handle /?quick=1 shortcut — scroll to premium section after chart load
  if (new URLSearchParams(window.location.search).has('quick')) {
    document.getElementById('birthForm')?.addEventListener('submit', function onQuickSubmit() {
      setTimeout(() => {
        document.getElementById('suddenForecastBtn')?.click();
      }, 1800);
      this.removeEventListener('submit', onQuickSubmit);
    }, { once: true });
  }
});
