// api-proxy.js — Smart API routing
// On localhost: hits the Python server (server.py)
// On GitHub Pages / any static host: calls external APIs directly
//
// USAGE: replaces bare fetch('/api/...') calls in app.js
// All functions return the same shape the Python server returned.

const _IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// ── JPL Chart — all 10 bodies + velocities ────────────────────────────────────
// On localhost: Python server handles concurrency + retry
// On static host: parallel browser fetches, falls through to Astronomy Engine on CORS fail
async function apiJplChart(isoDate) {
  if (_IS_LOCAL) {
    const r = await fetch('/api/jpl-chart?date=' + encodeURIComponent(isoDate));
    return r.json();
  }
  // Direct JPL Horizons fetch from the browser
  // JPL's public API does return Access-Control-Allow-Origin: * on GET requests
  try {
    return await _jplChartDirect(isoDate);
  } catch {
    // CORS blocked or JPL down — return empty so app falls back to Astronomy Engine
    return { positions: null, velocities: {} };
  }
}

async function _jplChartDirect(isoDate) {
  const dt    = new Date(isoDate);
  const epoch = new Date('2000-01-01T12:00:00Z');
  const jdNow = 2451545.0 + (dt - epoch) / 86400000;
  const jdY   = jdNow - 1;

  const BODIES = {
    Sun: '10', Moon: '301', Mercury: '199', Venus: '299', Mars: '499',
    Jupiter: '599', Saturn: '699', Uranus: '799', Neptune: '899', Pluto: '999',
  };

  function jplUrl(cmd, jd) {
    const p = new URLSearchParams({
      format: 'json', COMMAND: cmd, OBJ_DATA: 'NO', MAKE_EPHEM: 'YES',
      EPHEM_TYPE: 'OBSERVER', CENTER: '500@399',
      START_TIME: `JD${jd.toFixed(6)}`,
      STOP_TIME:  `JD${(jd + 1/1440).toFixed(6)}`,
      STEP_SIZE: '1m', QUANTITIES: '31',
    });
    return 'https://ssd.jpl.nasa.gov/api/horizons.api?' + p;
  }

  function parseElon(text) {
    let inData = false;
    for (const line of text.split('\n')) {
      if (line.includes('$$SOE')) { inData = true; continue; }
      if (line.includes('$$EOE')) break;
      if (inData && line.trim()) {
        for (const tok of line.split(/\s+/).slice(2)) {
          const v = parseFloat(tok);
          if (!isNaN(v) && v >= 0 && v < 360) return v;
        }
      }
    }
    return null;
  }

  // Fetch all bodies in parallel (now + yesterday for velocity)
  const entries = Object.entries(BODIES);
  const fetches = entries.map(([name, cmd]) =>
    Promise.all([
      fetch(jplUrl(cmd, jdNow)).then(r => r.json()),
      fetch(jplUrl(cmd, jdY )).then(r => r.json()),
    ]).then(([rNow, rY]) => {
      const posNow  = parseElon(rNow.result  || '');
      const posYest = parseElon(rY.result || '');
      return [name, posNow, posYest];
    }).catch(() => [name, null, null])
  );

  const results = await Promise.all(fetches);
  const positions = {}, velocities = {};
  for (const [name, posNow, posYest] of results) {
    if (posNow === null) continue;
    positions[name] = posNow;
    if (posYest !== null) {
      let vel = posNow - posYest;
      if (vel >  180) vel -= 360;
      if (vel < -180) vel += 360;
      velocities[name] = vel;
    }
  }
  return { positions, velocities, source: 'NASA JPL Horizons (direct)' };
}

// ── Geocoding — Nominatim supports CORS, call directly from anywhere ──────────
async function apiGeocode(q) {
  if (_IS_LOCAL) {
    const r = await fetch('/api/geocode?q=' + encodeURIComponent(q));
    return r.json();
  }
  const url = 'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({ q, format: 'json', limit: '1', addressdetails: '1' });
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const d = await r.json();
  if (!d.length) throw new Error('No results for: ' + q);
  return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon), display_name: d[0].display_name };
}

// ── Timezone — timeapi.io is free + CORS-friendly ─────────────────────────────
async function apiTimezone(lat, lon, ts) {
  if (_IS_LOCAL) {
    const r = await fetch(`/api/timezone?lat=${lat}&lon=${lon}&ts=${ts}`);
    return r.json();
  }
  try {
    const r = await fetch(
      `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`
    );
    const d = await r.json();
    if (!d.timeZone) throw new Error('no timezone');
    // Use Intl to get the DST-aware offset for the specific timestamp
    const date = new Date(ts * 1000);
    const fmt = new Intl.DateTimeFormat('en', {
      timeZone: d.timeZone, timeZoneName: 'longOffset'
    });
    const tzPart = fmt.formatToParts(date).find(p => p.type === 'timeZoneName')?.value || 'GMT+0';
    const m = tzPart.match(/GMT([+-])(\d+)(?::(\d+))?/);
    const sign = m ? (m[1] === '+' ? 1 : -1) : 0;
    const offset = m ? sign * (parseInt(m[2]) + (parseInt(m[3] || '0') / 60)) : 0;
    return { timezone: d.timeZone, offset, offset_label: tzPart };
  } catch {
    return { error: 'timezone lookup failed' };
  }
}
