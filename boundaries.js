// IAU ecliptic constellation boundaries — true 13-sign system
// Boundaries from IAU 1930 Delporte catalog, ecliptic crossings
// lon_start/lon_end = sidereal J2000 ecliptic longitude

const SIGNS = [
  {
    name: "Aries",
    symbol: "♈",
    lon_start: 28, lon_end: 53,
    sunStart: [4, 18], sunEnd: [5, 13],
    days: 25, date_approx: "Apr 18 – May 13",
    element: "Fire", polarity: "Yang",
    trad: "Taurus (traditional)",
    traits: ["Initiator","Impulsive","Courageous","Direct","Competitive","First-mover"],
    mythology: "The golden ram whose fleece drove heroes across the world.",
    desc: "The ram charges before looking. Aries sidereal is the spark without the planning — pure initiation energy."
  },
  {
    name: "Taurus",
    symbol: "♉",
    lon_start: 53, lon_end: 90,
    sunStart: [5, 13], sunEnd: [6, 21],
    days: 39, date_approx: "May 13 – Jun 21",
    element: "Earth", polarity: "Yin",
    trad: "Gemini / Taurus (split, traditional)",
    traits: ["Sensory","Persistent","Possessive","Builder","Pleasure-seeking","Stubborn"],
    mythology: "The bull — Zeus in disguise, or the Pleiades rising in the horns.",
    desc: "Taurus sidereal accumulates rather than transforms — the weight of that duration is material and embodied."
  },
  {
    name: "Gemini",
    symbol: "♊",
    lon_start: 90, lon_end: 118,
    sunStart: [6, 21], sunEnd: [7, 20],
    days: 29, date_approx: "Jun 21 – Jul 20",
    element: "Air", polarity: "Yang",
    trad: "Cancer (traditional)",
    traits: ["Dual-natured","Quick","Communicative","Scattered","Curious","Adaptable"],
    mythology: "The twins Castor and Pollux — one mortal, one divine, inseparable.",
    desc: "Gemini sidereal is the archetype of parallel processing without integration."
  },
  {
    name: "Cancer",
    symbol: "♋",
    lon_start: 118, lon_end: 138,
    sunStart: [7, 20], sunEnd: [8, 10],
    days: 21, date_approx: "Jul 20 – Aug 10",
    element: "Water", polarity: "Yin",
    trad: "Leo (traditional)",
    traits: ["Protective","Cyclical","Memory-driven","Nurturing","Crabwise","Intuitive"],
    mythology: "Karkinos, the crab crushed underfoot by Heracles. Small. Remembered.",
    desc: "Cancer sidereal moves sideways toward its goals and carries the past as living weight."
  },
  {
    name: "Leo",
    symbol: "♌",
    lon_start: 138, lon_end: 174,
    sunStart: [8, 10], sunEnd: [9, 16],
    days: 37, date_approx: "Aug 10 – Sep 16",
    element: "Fire", polarity: "Yang",
    trad: "Virgo / Leo (split, traditional)",
    traits: ["Performative","Generous","Dominant","Loyal","Fixed identity","Solar"],
    mythology: "The Nemean lion — invulnerable until it wasn't.",
    desc: "Leo sidereal is the fixed creative principle — it does not seek approval but cannot function without an audience."
  },
  {
    name: "Virgo",
    symbol: "♍",
    lon_start: 174, lon_end: 218,
    sunStart: [9, 16], sunEnd: [10, 30],
    days: 44, date_approx: "Sep 16 – Oct 30",
    element: "Earth", polarity: "Yin",
    trad: "Libra / Virgo (split, traditional)",
    traits: ["Analytical","Critical","Service-driven","Precise","Anxious","Discriminating"],
    mythology: "Demeter in grief, or Persephone walking back from the underworld.",
    desc: "The single longest solar transit at 44 days. Virgo sidereal carries accumulated precision that becomes its own burden."
  },
  {
    name: "Libra",
    symbol: "♎",
    lon_start: 218, lon_end: 241,
    sunStart: [10, 30], sunEnd: [11, 23],
    days: 24, date_approx: "Oct 30 – Nov 23",
    element: "Air", polarity: "Yang",
    trad: "Scorpio (traditional)",
    traits: ["Relational","Justice-seeking","Indecisive","Diplomatic","Beauty-attuned","Mirror"],
    mythology: "Themis, divine justice. The scales that weigh everything equally.",
    desc: "Most people told they are Scorpio by tropical astrology are actually Libra sidereal."
  },
  {
    name: "Scorpius",
    symbol: "♏",
    lon_start: 241, lon_end: 247,
    sunStart: [11, 23], sunEnd: [11, 29],
    days: 6, date_approx: "Nov 23 – Nov 29",
    element: "Water", polarity: "Yin",
    trad: "Scorpio (traditional)",
    traits: ["Intense","Compressed","Transformative","Power-aware","Exact","Rare"],
    mythology: "Sent by Gaia to kill Orion. The hunter and the scorpion never share the sky.",
    desc: "Six days. The shortest solar transit. True Scorpius placements are extremely rare."
  },
  {
    name: "Ophiuchus",
    symbol: "⛎",
    lon_start: 247, lon_end: 266,
    sunStart: [11, 29], sunEnd: [12, 17],
    days: 18, date_approx: "Nov 29 – Dec 17",
    element: "Fire/Water", polarity: "Yang",
    trad: "Sagittarius / Scorpio (misassigned)",
    traits: ["Knowledge-seeking","Pattern-breaker","Healer","Excluded","Magnetic","Truth-compelled","Bridge-builder","Restless intellect","Transformative"],
    mythology: "Asclepius, the healer cast into Tartarus for mastering death. The serpent bearer. The crossroads walker. The sign they buried.",
    desc: "The only zodiac constellation excluded from Western tropical astrology. Ophiuchus placements carry the weight of being the sign that was not supposed to exist: drawn to hidden truths, capable of healing what others cannot, and nearly always told they are something they are not."
  },
  {
    name: "Sagittarius",
    symbol: "♐",
    lon_start: 266, lon_end: 299,
    sunStart: [12, 17], sunEnd: [1, 20],
    days: 33, date_approx: "Dec 17 – Jan 20",
    element: "Fire", polarity: "Yang",
    trad: "Capricorn (traditional)",
    traits: ["Expansive","Philosophical","Blunt","Freedom-seeking","Focused","Restless"],
    mythology: "The archer centaur — philosopher, teacher, aiming beyond the horizon.",
    desc: "Sagittarius sidereal is philosophical first, impulsive second — it shoots before aiming and questions the target afterward."
  },
  {
    name: "Capricornus",
    symbol: "♑",
    lon_start: 299, lon_end: 327,
    sunStart: [1, 20], sunEnd: [2, 16],
    days: 27, date_approx: "Jan 20 – Feb 16",
    element: "Earth", polarity: "Yin",
    trad: "Aquarius (traditional)",
    traits: ["Strategic","Patient","Disciplined","Ambitious","Dry wit","Long-game"],
    mythology: "Pricus, father of time, the sea-goat who swam between worlds.",
    desc: "The sea-goat navigates between depths and heights. Capricornus placements carry the actual weight of Saturn's domain — structure, time, consequence."
  },
  {
    name: "Aquarius",
    symbol: "♒",
    lon_start: 327, lon_end: 351,
    sunStart: [2, 16], sunEnd: [3, 11],
    days: 23, date_approx: "Feb 16 – Mar 11",
    element: "Air", polarity: "Yang",
    trad: "Pisces (traditional)",
    traits: ["Systems thinker","Humanitarian","Detached","Innovative","Pattern-reader","Rebel logic"],
    mythology: "Ganymede, cupbearer to the gods — youth too beautiful to be left on earth.",
    desc: "The water-bearer carries knowledge, not water. Aquarius sidereal carries a distinct intellectual detachment often misread as coldness."
  },
  {
    name: "Pisces",
    symbol: "♓",
    lon_start: 351, lon_end: 28,
    sunStart: [3, 11], sunEnd: [4, 18],
    days: 38, date_approx: "Mar 11 – Apr 18",
    element: "Water", polarity: "Yin",
    trad: "Aries / Pisces (split, traditional)",
    traits: ["Empathic","Boundary-fluid","Visionary","Sacrificial","Deep memory","Liminal"],
    mythology: "Aphrodite and Eros bound together by a cord, escaping into the water.",
    desc: "Pisces holds the longest solar transit of any sign. The accumulated dwell time shapes a permeability other signs lack."
  }
];

// Planet display data — classical 7 + outer 3
const PLANETS = [
  { id: "Sun",     label: "Sun",     symbol: "☉" },
  { id: "Moon",    label: "Moon",    symbol: "☽" },
  { id: "Mercury", label: "Mercury", symbol: "☿" },
  { id: "Venus",   label: "Venus",   symbol: "♀" },
  { id: "Mars",    label: "Mars",    symbol: "♂" },
  { id: "Jupiter", label: "Jupiter", symbol: "♃" },
  { id: "Saturn",  label: "Saturn",  symbol: "♄" },
  { id: "Uranus",  label: "Uranus",  symbol: "⛢" },
  { id: "Neptune", label: "Neptune", symbol: "♆" },
  { id: "Pluto",   label: "Pluto",   symbol: "♇" },
];

// Given sidereal ecliptic longitude (0–360°, J2000), return the matching sign object
function eclipticToSign(lon) {
  lon = ((lon % 360) + 360) % 360;
  // Pisces wraps around 0° — check it first
  if (lon >= 351 || lon < 28) return SIGNS.find(s => s.name === "Pisces");
  // All other signs are contiguous
  let result = SIGNS[0];
  for (const s of SIGNS) {
    if (s.name === "Pisces") continue;
    if (lon >= s.lon_start && lon < s.lon_end) { result = s; break; }
  }
  return result;
}

// ── Aspect definitions ───────────────────────────────────────────────────────
const ASPECTS = [
  { name:'Conjunction',  symbol:'☌', angle:  0, orb:8, weight:5 },
  { name:'Sextile',      symbol:'⚹', angle: 60, orb:6, weight:2 },
  { name:'Square',       symbol:'□', angle: 90, orb:8, weight:3 },
  { name:'Trine',        symbol:'△', angle:120, orb:8, weight:3 },
  { name:'Quincunx',     symbol:'⚻', angle:150, orb:3, weight:1 },
  { name:'Opposition',   symbol:'☍', angle:180, orb:8, weight:4 },
];

// ── Planet rulerships (traditional + modern) ─────────────────────────────────
const RULERSHIPS = {
  Sun:     ['Leo'],
  Moon:    ['Cancer'],
  Mercury: ['Gemini','Virgo'],
  Venus:   ['Taurus','Libra'],
  Mars:    ['Aries','Scorpius'],
  Jupiter: ['Sagittarius','Pisces'],
  Saturn:  ['Capricornus','Aquarius'],
  Uranus:  ['Aquarius'],
  Neptune: ['Pisces'],
  Pluto:   ['Scorpius'],
};

// ── Exaltations ──────────────────────────────────────────────────────────────
const EXALTATIONS = {
  Sun:     'Aries',
  Moon:    'Taurus',
  Mercury: 'Virgo',
  Venus:   'Pisces',
  Mars:    'Capricornus',
  Jupiter: 'Cancer',
  Saturn:  'Libra',
  Uranus:  'Scorpius',
  Neptune: 'Leo',
  Pluto:   'Aries',
};

// ── House themes (13 Whole Sign houses) ──────────────────────────────────────
const HOUSE_THEMES = [
  'Identity & Self',
  'Resources & Values',
  'Communication & Mind',
  'Home & Roots',
  'Creativity & Joy',
  'Service & Health',
  'Partnership',
  'Transformation',
  'Expansion & Philosophy',
  'Career & Legacy',
  'Community & Vision',
  'Dissolution & Dreams',
  'The Hidden Path',
];

// ── Mundane themes — outer planet pair aspects ────────────────────────────────
// MUNDANE_THEMES[bodyA][bodyB][aspectName] — bodyA alphabetically before bodyB
const MUNDANE_THEMES = {
  Jupiter: {
    Saturn: {
      Conjunction:  'Societal structures reset. New 20-year civic cycle begins — the old order yields to the next paradigm.',
      Opposition:   'Tension between expansion and restriction reaches breaking point. Ideological confrontation with institutional limits.',
      Square:       'Growth ambitions collide with established authority. Economic or political crisis demands structural reform.',
      Trine:        'Expansion and discipline reinforce each other. Period of productive growth within sustainable frameworks.',
      Sextile:      'Practical opportunity to build lasting structures. Reform becomes possible through negotiation.',
      Quincunx:     'Misalignment between vision and form requires continuous adjustment. Awkward compromises.',
    },
    Uranus: {
      Conjunction:  'Revolutionary expansion. Sudden leap in societal freedom, technology, or political structure.',
      Opposition:   'Revolutionary pressure against the status quo peaks. Sudden reversals of fortune or power.',
      Square:       'Unstable tension between growth and disruption. Unexpected breaks in economic or political continuity.',
      Trine:        'Progressive change flows smoothly. Breakthroughs in science, freedom, or social structure.',
      Sextile:      'Inventive opportunities open. Reform and expansion align briefly.',
      Quincunx:     'Restless incompatibility between progress and scale. Difficult to integrate innovation into existing systems.',
    },
    Neptune: {
      Conjunction:  'Collective idealism peaks. Mass spiritual movements, inflation of belief, dissolution of economic boundaries.',
      Opposition:   'Disillusionment with grand visions. Reality confronts collective fantasy.',
      Square:       'Confusion between faith and fact. Economic or spiritual bubbles risk collapse.',
      Trine:        'Inspired vision finds expression in the world. Art, spirituality, and collective meaning align.',
      Sextile:      'Creative and spiritual growth through practical channels.',
      Quincunx:     'Mismatch between vision and manifestation. What is imagined cannot quite be built.',
    },
    Pluto: {
      Conjunction:  'Transformation of societal power structures. New paradigm of authority emerges from the ruins of the old.',
      Opposition:   'Power confronts expansion. Old concentrated power resists the rising tide of change.',
      Square:       'Generational tension between growth and entrenched control. Confrontation with systemic corruption.',
      Trine:        'Deep systemic change moves smoothly. Power and expansion cooperate in long transformation.',
      Sextile:      'Opportunity to reform deeply embedded structures. Quiet but significant shifts in power.',
      Quincunx:     'Uneasy coexistence of growth and shadow. Transformation resists easy understanding.',
    },
  },
  Saturn: {
    Uranus: {
      Conjunction:  'The old structure meets the revolutionary impulse. A generation is born at the boundary of the old world and the new.',
      Opposition:   'Established order versus revolutionary change. The tension between freedom and control reaches maximum.',
      Square:       'Fracture lines between tradition and disruption. What was stable suddenly breaks.',
      Trine:        'Innovation is structured productively. Reform happens within, not against, the existing framework.',
      Sextile:      'Practical reforms become possible. Disciplined innovation.',
      Quincunx:     'Neither the old nor the new can quite take hold. Frustrating adjustment between stability and change.',
    },
    Neptune: {
      Conjunction:  'Dissolution of rigid structures. Idealism infuses institutions, or institutions dissolve into confusion.',
      Opposition:   'Reality versus illusion in collective life. Systemic disillusionment.',
      Square:       'Conflict between material necessity and spiritual longing. Crisis of meaning in established structures.',
      Trine:        'Spiritual or creative vision finds disciplined expression. Art and structure in harmony.',
      Sextile:      'Idealism and practicality briefly cooperate. Inspired practical work.',
      Quincunx:     'Spiritual needs and material demands continuously misalign.',
    },
    Pluto: {
      Conjunction:  'Deep restructuring of power. Institutions are remade at their foundations over decades.',
      Opposition:   'Power structures face their shadow. Transformation confronts everything built to last.',
      Square:       'Systemic power under maximum stress. What cannot transform will break.',
      Trine:        'Structural reform proceeds through depth. Long-term transformation of institutions.',
      Sextile:      'Opportunity to build new power frameworks on transformed foundations.',
      Quincunx:     'Power and structure perpetually at odds. Neither fully integrates the other.',
    },
  },
  Uranus: {
    Neptune: {
      Conjunction:  'The revolutionary and the transcendent merge. A generation awakens to collective spiritual and political transformation.',
      Opposition:   'Disruptive change confronts collective illusion. Revolutionary clarity versus mystical confusion.',
      Square:       'Instability in both material and spiritual domains. The social fabric strains between chaos and dissolution.',
      Trine:        'Visionary change flows freely. Spiritual and technological breakthroughs align.',
      Sextile:      'Innovation and inspiration cooperate in subtle but lasting ways.',
      Quincunx:     'Revolution and transcendence cannot synchronize. Perpetual adjustment between awakening and dissolution.',
    },
    Pluto: {
      Conjunction:  'Generational revolution. The entire collective order is dismantled and rebuilt.',
      Opposition:   'Revolutionary impulse confronts entrenched power at civilizational scale.',
      Square:       'Generational revolution against entrenched power. Decade-long upheaval. The old world resists the inevitable.',
      Trine:        'Deep transformation and liberation reinforce each other. Generational change flows with minimal resistance.',
      Sextile:      'Quiet but profound opening for collective transformation.',
      Quincunx:     'Freedom and transformation cannot quite align. Revolutionary energy dissipates in structural incompatibility.',
    },
  },
  Neptune: {
    Pluto: {
      Conjunction:  'The rarest of alignments: total civilizational transformation. Old spiritual and material orders dissolve together.',
      Opposition:   'The dissolution of one civilization confronts the power structures of another.',
      Square:       'Crisis at the intersection of collective spirituality and systemic power. Generational disorientation.',
      Trine:        'Transcendence and transformation work together over generations.',
      Sextile:      'Long window of collective spiritual evolution within manageable systemic change.',
      Quincunx:     'The transcendent and the transformative cannot integrate. Chronic civilizational unease.',
    },
  },
};
