// wheel.js — Celestial wheel diagram (SVG)

const CX = 200, CY = 200;
const R_SIGN_OUTER  = 192;
const R_SIGN_INNER  = 155;
const R_NATAL       = 132;
const R_CURR        = 108;
const R_ASPECT_END  = 88;

const ELEMENT_FILL = {
  'Fire':       'rgba(200,90,40,0.22)',
  'Earth':      'rgba(80,150,60,0.22)',
  'Air':        'rgba(200,190,50,0.22)',
  'Water':      'rgba(50,120,200,0.22)',
  'Fire/Water': 'rgba(140,60,170,0.22)',
};

const ASPECT_STROKE = {
  'Conjunction': 'rgba(255,255,255,0.55)',
  'Sextile':     'rgba(100,180,255,0.5)',
  'Square':      'rgba(220,80,80,0.55)',
  'Trine':       'rgba(80,200,120,0.5)',
  'Quincunx':    'rgba(220,200,80,0.35)',
  'Opposition':  'rgba(255,140,60,0.55)',
};

function _lonRad(lon) {
  return (lon / 360) * 2 * Math.PI;
}

function _pt(r, lon) {
  const a = _lonRad(lon);
  return [+(CX + r * Math.sin(a)).toFixed(2), +(CY - r * Math.cos(a)).toFixed(2)];
}

function _arcSector(rOuter, rInner, lonStart, lonEnd) {
  // lonEnd may be > 360 for Pisces wrap
  const startRad = _lonRad(lonStart);
  const endRad   = _lonRad(lonEnd);
  const span = endRad - startRad;
  const large = span > Math.PI ? 1 : 0;
  const [ox1,oy1] = [CX + rOuter*Math.sin(startRad), CY - rOuter*Math.cos(startRad)];
  const [ox2,oy2] = [CX + rOuter*Math.sin(endRad),   CY - rOuter*Math.cos(endRad)];
  const [ix2,iy2] = [CX + rInner*Math.sin(endRad),   CY - rInner*Math.cos(endRad)];
  const [ix1,iy1] = [CX + rInner*Math.sin(startRad), CY - rInner*Math.cos(startRad)];
  return `M ${ox1.toFixed(2)} ${oy1.toFixed(2)} A ${rOuter} ${rOuter} 0 ${large} 1 ${ox2.toFixed(2)} ${oy2.toFixed(2)} L ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${rInner} ${rInner} 0 ${large} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`;
}

function buildWheelSVG(natalChart, currentChart, natalAspects) {
  const parts = [];

  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" class="wheel-svg">`);

  // Background
  parts.push(`<circle cx="${CX}" cy="${CY}" r="195" fill="rgba(10,5,18,0.95)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`);

  // Sign arc ring
  for (const sign of SIGNS) {
    const ls = sign.lon_start;
    const le = sign.lon_end < sign.lon_start ? sign.lon_end + 360 : sign.lon_end;
    const fill = ELEMENT_FILL[sign.element] || 'rgba(120,120,120,0.15)';
    parts.push(`<path d="${_arcSector(R_SIGN_OUTER, R_SIGN_INNER, ls, le)}" fill="${fill}" stroke="rgba(255,255,255,0.10)" stroke-width="0.5"/>`);

    // Sign glyph at arc midpoint
    const mid = (ls + le) / 2;
    const [sx, sy] = _pt((R_SIGN_INNER + R_SIGN_OUTER) / 2, mid);
    parts.push(`<text x="${sx}" y="${sy+4}" text-anchor="middle" font-size="11" font-family="serif" fill="rgba(255,255,255,0.65)">${sign.symbol}</text>`);
  }

  // Inner sign ring boundary
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_SIGN_INNER}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>`);

  // Aspect lines (natal × natal)
  for (const asp of (natalAspects || [])) {
    const lonA = natalChart[asp.bodyA]?.tropicalLon;
    const lonB = natalChart[asp.bodyB]?.tropicalLon;
    if (lonA == null || lonB == null) continue;
    const [x1,y1] = _pt(R_ASPECT_END, lonA);
    const [x2,y2] = _pt(R_ASPECT_END, lonB);
    const stroke = ASPECT_STROKE[asp.name] || 'rgba(200,200,200,0.3)';
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1"/>`);
  }

  // Aspect ring boundary
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_ASPECT_END + 4}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>`);

  // Current sky planet ring (lighter)
  if (currentChart) {
    for (const p of PLANETS) {
      const c = currentChart[p.id];
      if (!c || c.tropicalLon == null) continue;
      const [px, py] = _pt(R_CURR, c.tropicalLon);
      parts.push(`<text x="${px}" y="${py+4}" text-anchor="middle" font-size="11" font-family="serif" fill="rgba(160,160,240,0.42)" title="${p.id} now">${p.symbol}</text>`);
    }
    // Current ASC/MC
    for (const [key, sym] of [['Ascendant','↑'],['MC','⊕']]) {
      const c = currentChart[key];
      if (!c || c.tropicalLon == null) continue;
      const [px, py] = _pt(R_CURR - 8, c.tropicalLon);
      parts.push(`<text x="${px}" y="${py+4}" text-anchor="middle" font-size="10" font-family="serif" fill="rgba(160,220,240,0.38)">${sym}</text>`);
    }
  }

  // Natal planet ring
  for (const p of PLANETS) {
    const c = natalChart[p.id];
    if (!c || c.tropicalLon == null) continue;
    const [px, py] = _pt(R_NATAL, c.tropicalLon);
    parts.push(`<text x="${px}" y="${py+4}" text-anchor="middle" font-size="13" font-family="serif" fill="rgba(255,240,190,0.9)" title="${p.id}">${p.symbol}</text>`);
  }
  // Natal ASC / MC
  for (const [key, sym] of [['Ascendant','↑'],['MC','⊕']]) {
    const c = natalChart[key];
    if (!c || c.tropicalLon == null) continue;
    const [px, py] = _pt(R_NATAL + 8, c.tropicalLon);
    parts.push(`<text x="${px}" y="${py+4}" text-anchor="middle" font-size="11" font-family="serif" fill="rgba(200,240,255,0.75)">${sym}</text>`);
  }

  // Inner decoration
  parts.push(`<circle cx="${CX}" cy="${CY}" r="32" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>`);
  parts.push(`<text x="${CX}" y="${CY+7}" text-anchor="middle" font-size="20" font-family="serif" fill="rgba(255,255,255,0.12)">⛎</text>`);

  parts.push(`</svg>`);
  return parts.join('');
}
