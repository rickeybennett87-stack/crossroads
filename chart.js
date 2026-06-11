// Crossroads — chart calculation engine
// Coordinate frame: JPL returns tropical ecliptic longitude. IAU boundaries are defined in
// tropical ecliptic J2000.0 coordinates. No conversion needed — tropical in, IAU sign out.

function julianDay(date) {
  let y = date.getFullYear(), m = date.getMonth() + 1;
  const d = date.getDate() + (date.getHours() + date.getMinutes()/60 + date.getSeconds()/3600) / 24;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y/100), B = 2 - A + Math.floor(A/4);
  return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + d + B - 1524.5;
}

// ── Private: Meeus angle formulas (return TROPICAL floats, not exported) ──────

function _sharedPreamble(date, lonDeg) {
  const JD = julianDay(date), T = (JD - 2451545) / 36525;
  let GST = 280.46061837 + 360.98564736629*(JD - 2451545) + 0.000387933*T*T - T*T*T/38710000;
  GST = ((GST % 360) + 360) % 360;
  const LST  = ((GST + lonDeg) % 360 + 360) % 360;
  const e    = (23.439291111 - 0.013004167 * T) * Math.PI / 180;
  const RAMC = LST * Math.PI / 180;
  return { RAMC, e, T };
}

function _calcAscTropical(date, latDeg, lonDeg) {
  const { RAMC, e } = _sharedPreamble(date, lonDeg);
  const lat = latDeg * Math.PI / 180;
  let asc = Math.atan2(-Math.cos(RAMC), Math.sin(e)*Math.tan(lat) + Math.cos(e)*Math.sin(RAMC)) * 180/Math.PI;
  return ((asc % 360) + 360) % 360;
}

function _calcMCTropical(date, lonDeg) {
  const { RAMC, e } = _sharedPreamble(date, lonDeg);
  let mc = Math.atan2(Math.sin(RAMC), Math.cos(RAMC)*Math.cos(e)) * 180 / Math.PI;
  return ((mc % 360) + 360) % 360;
}

// ── Angles: Ascendant, MC, DSC, IC (tropical ecliptic, ready for IAU lookup) ──

function calcAngles(date, latDeg, lonDeg) {
  const asc = _calcAscTropical(date, latDeg, lonDeg);
  const mc  = _calcMCTropical(date, lonDeg);
  return {
    asc,
    mc,
    dsc: ((asc + 180) % 360),
    ic:  ((mc  + 180) % 360),
  };
}

// ── Degrees within a sign (handles Pisces wrap-around) ────────────────────────

function degreeInSign(tropLon, sign) {
  if (sign.name === 'Pisces') {
    return tropLon >= 351 ? tropLon - 351 : tropLon + (360 - 351);
  }
  return tropLon - sign.lon_start;
}

// ── Full chart from JPL positions (primary path) ─────────────────────────────
// jplPositions: raw tropical map from /api/jpl-chart (tropical = correct for IAU lookup)

function calcChartFromJPL(jplPositions, utcDate, latDeg, lonDeg) {
  const angles = calcAngles(utcDate, latDeg, lonDeg);
  const result = {};

  for (const [body, trop] of Object.entries(jplPositions)) {
    const sign = eclipticToSign(trop);
    const deg  = degreeInSign(trop, sign);
    result[body] = {
      tropicalLon: trop,
      sign,
      degree:  Math.floor(deg),
      minutes: Math.floor((deg % 1) * 60),
    };
  }

  for (const [key, trop] of Object.entries(angles)) {
    const label = key === 'asc' ? 'Ascendant' : key === 'mc' ? 'MC' : key === 'dsc' ? 'DSC' : 'IC';
    const sign  = eclipticToSign(trop);
    const deg   = degreeInSign(trop, sign);
    result[label] = {
      tropicalLon: trop,
      sign,
      degree:  Math.floor(deg),
      minutes: Math.floor((deg % 1) * 60),
    };
  }

  return result;
}

// ── Fallback chart via Astronomy Engine ──────────────────────────────────────

function calcChart(year, month, day, hour, minute, utcOffsetHours, latDeg, lonDeg) {
  const utcHour   = hour - utcOffsetHours;
  const utcDate   = new Date(Date.UTC(year, month-1, day, utcHour, minute, 0));
  const astroTime = Astronomy.MakeTime(utcDate);
  const result    = {};

  for (const planet of PLANETS) {
    let tropLon;
    try {
      if (planet.id === 'Moon') {
        const eq = Astronomy.GeoVector(Astronomy.Body.Moon, astroTime, true);
        tropLon = Astronomy.Ecliptic(eq).elon;
      } else if (planet.id === 'Sun') {
        tropLon = Astronomy.SunPosition(astroTime).elon;
      } else {
        const body = Astronomy.Body[planet.id];
        if (body === undefined) continue;
        const vec = Astronomy.GeoVector(body, astroTime, true);
        tropLon = Astronomy.Ecliptic(vec).elon;
      }
    } catch(e) { continue; }

    const sign = eclipticToSign(tropLon);
    const deg  = degreeInSign(tropLon, sign);
    result[planet.id] = {
      tropicalLon: tropLon,
      sign,
      degree:  Math.floor(deg),
      minutes: Math.floor((deg % 1) * 60),
    };
  }

  const angles = calcAngles(utcDate, latDeg, lonDeg);
  for (const [key, trop] of Object.entries(angles)) {
    const label = key === 'asc' ? 'Ascendant' : key === 'mc' ? 'MC' : key === 'dsc' ? 'DSC' : 'IC';
    const sign  = eclipticToSign(trop);
    const deg   = degreeInSign(trop, sign);
    result[label] = { tropicalLon: trop, sign, degree: Math.floor(deg), minutes: Math.floor((deg%1)*60) };
  }

  return result;
}

// ── Houses (Whole Sign, 13 signs) ─────────────────────────────────────────────

function calcHouses(ascSign) {
  const ascIdx = SIGNS.findIndex(s => s.name === ascSign.name);
  return Array.from({length:13}, (_, i) => SIGNS[(ascIdx + i) % 13]);
}

function houseOf(sign, ascSign) {
  const ascIdx  = SIGNS.findIndex(s => s.name === ascSign.name);
  const signIdx = SIGNS.findIndex(s => s.name === sign.name);
  return ((signIdx - ascIdx + 13) % 13) + 1;
}

// ── Aspects ───────────────────────────────────────────────────────────────────

function getAspect(lonA, lonB) {
  let diff = Math.abs(lonA - lonB) % 360;
  if (diff > 180) diff = 360 - diff;
  for (const asp of ASPECTS) {
    const orb = Math.abs(diff - asp.angle);
    if (orb <= asp.orb) return { name:asp.name, symbol:asp.symbol, angle:diff, orb, weight:asp.weight };
  }
  return null;
}

// calcAspects(mapA, mapB) — all pairs (keyA from A, keyB from B, skip A===B self-pairs)
// For natal self-aspects call with same map twice; it enforces i<j via key ordering.
function calcAspects(mapA, mapB) {
  const keysA = Object.keys(mapA);
  const keysB = Object.keys(mapB);
  const aspects = [];
  const seen = new Set();
  for (const kA of keysA) {
    for (const kB of keysB) {
      if (kA === kB) continue;
      const pair = [kA, kB].sort().join('|');
      if (seen.has(pair)) continue;
      seen.add(pair);
      const asp = getAspect(mapA[kA], mapB[kB]);
      if (asp) aspects.push({ bodyA:kA, bodyB:kB, ...asp });
    }
  }
  return aspects.sort((a,b) => a.orb - b.orb);
}

// ── Transit duration / applying ───────────────────────────────────────────────

function calcTransitDuration(velocity, aspOrb) {
  if (!velocity || Math.abs(velocity) < 0.0001) return null;
  return (2 * aspOrb) / Math.abs(velocity);  // days within orb
}

function calcApplying(transitingLon, natalLon, aspAngle, velocity) {
  if (velocity === undefined || velocity === null) return null;
  // Signed difference (transiting − natal), normalized to (−180, +180]
  let diff = transitingLon - natalLon;
  diff = ((diff + 540) % 360) - 180;
  // Find the nearest target angle (positive or negative)
  const targets = [aspAngle, -aspAngle];
  const nearest = targets.reduce((a, b) => Math.abs(diff - a) < Math.abs(diff - b) ? a : b);
  // Applying = planet moving toward exact (diff approaching nearest target)
  return (velocity > 0 && diff < nearest) || (velocity < 0 && diff > nearest);
}

// ── Universal sky dominance ───────────────────────────────────────────────────

function calcUniversalDominance(currSidLons, currSigns, currAspects, isAngular) {
  const scores = {};
  for (const p of PLANETS) scores[p.id] = 0;

  // Aspect connectivity
  for (const asp of currAspects) {
    if (scores[asp.bodyA] !== undefined) scores[asp.bodyA] += asp.weight;
    if (scores[asp.bodyB] !== undefined) scores[asp.bodyB] += asp.weight;
  }
  // Angularity, dignity, exaltation
  for (const p of PLANETS) {
    if (isAngular[p.id])                                      scores[p.id] += 5;
    if ((RULERSHIPS[p.id]||[]).includes(currSigns[p.id]?.name)) scores[p.id] += 3;
    if (EXALTATIONS[p.id] === currSigns[p.id]?.name)            scores[p.id] += 2;
  }
  const top = Math.max(...Object.values(scores));
  return { scores, dominants: PLANETS.map(p=>p.id).filter(id => scores[id] >= top * 0.85) };
}

// ── Natal-relative dominance ──────────────────────────────────────────────────

function calcNatalDominance(transitAspects, currSigns, isAngular) {
  const scores = {};
  for (const p of PLANETS) scores[p.id] = 0;

  for (const t of transitAspects) {
    if (scores[t.bodyA] !== undefined)
      scores[t.bodyA] += t.weight * (t.orb <= 1 ? 3 : t.orb <= 3 ? 2 : 1);
  }
  for (const p of PLANETS) {
    if (isAngular[p.id])                                           scores[p.id] += 4;
    if ((RULERSHIPS[p.id]||[]).includes(currSigns[p.id]?.name))    scores[p.id] += 2;
    if (EXALTATIONS[p.id] === currSigns[p.id]?.name)               scores[p.id] += 1;
  }
  const top = Math.max(...Object.values(scores));
  return { scores, dominants: PLANETS.map(p=>p.id).filter(id => scores[id] >= top * 0.85) };
}

// ── Dominant house ────────────────────────────────────────────────────────────

function calcDominantHouse(transitAspects, currInNatalHouseMap) {
  const scores = {};
  for (let h = 1; h <= 13; h++) scores[h] = 0;

  for (const [body, house] of Object.entries(currInNatalHouseMap)) {
    scores[house] = (scores[house]||0) + 2;
  }
  for (const t of transitAspects) {
    const h = t.natalHouse;
    if (h) scores[h] = (scores[h]||0) + t.weight * (t.orb <= 1 ? 3 : t.orb <= 3 ? 2 : 1);
  }
  const top = Math.max(...Object.values(scores));
  return top > 0 ? parseInt(Object.keys(scores).find(h => scores[h] === top)) : 1;
}

// ── Full 28-point vector relationship matrix ──────────────────────────────────

function buildFullAspectMatrix(allPoints) {
  const keys    = Object.keys(allPoints);
  const matrix  = [];
  const seen    = new Set();
  for (let i = 0; i < keys.length; i++) {
    for (let j = i+1; j < keys.length; j++) {
      const kA = keys[i], kB = keys[j];
      const pair = kA + '|' + kB;
      if (seen.has(pair)) continue;
      seen.add(pair);
      const asp = getAspect(allPoints[kA], allPoints[kB]);
      if (!asp) continue;
      const catA = kA.startsWith('N:') ? 'natal' : 'current';
      const catB = kB.startsWith('N:') ? 'natal' : 'current';
      const category = catA === catB ? (catA+'-'+catA) : 'transit';
      matrix.push({ pointA:kA, pointB:kB, category, ...asp });
    }
  }
  return matrix.sort((a,b) => a.orb - b.orb);
}

// ── Tropical sign name lookup (for the "what tropical says" comparison) ───────

function tropicalSignName(month, day) {
  const tropical = [
    {name:'Capricorn',   start:[1,1],   end:[1,19]  },
    {name:'Aquarius',    start:[1,20],  end:[2,18]  },
    {name:'Pisces',      start:[2,19],  end:[3,20]  },
    {name:'Aries',       start:[3,21],  end:[4,19]  },
    {name:'Taurus',      start:[4,20],  end:[5,20]  },
    {name:'Gemini',      start:[5,21],  end:[6,20]  },
    {name:'Cancer',      start:[6,21],  end:[7,22]  },
    {name:'Leo',         start:[7,23],  end:[8,22]  },
    {name:'Virgo',       start:[8,23],  end:[9,22]  },
    {name:'Libra',       start:[9,23],  end:[10,22] },
    {name:'Scorpio',     start:[10,23], end:[11,21] },
    {name:'Sagittarius', start:[11,22], end:[12,21] },
    {name:'Capricorn',   start:[12,22], end:[12,31] },
  ];
  for (const s of tropical) {
    const [sm,sd] = s.start, [em,ed] = s.end;
    if ((month===sm && day>=sd) || (month===em && day<=ed)) return s.name;
  }
  return 'Unknown';
}
