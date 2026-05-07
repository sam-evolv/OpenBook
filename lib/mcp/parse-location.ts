// Pure-function location parser for the optional `location` field on
// search_businesses. Lowercases, tokenises on commas + connector words,
// matches against hardcoded Irish city/county vocabularies, and derives
// county from city via a small static map.

export const IRISH_CITIES = [
  'dublin',
  'cork',
  'galway',
  'limerick',
  'waterford',
  'kilkenny',
  'sligo',
  'drogheda',
  'dundalk',
  'wexford',
  'athlone',
  'ennis',
  'carlow',
  'naas',
  'tralee',
  'killarney',
  'letterkenny',
] as const;

export const IRISH_COUNTIES = [
  'antrim',
  'armagh',
  'carlow',
  'cavan',
  'clare',
  'cork',
  'derry',
  'donegal',
  'down',
  'dublin',
  'fermanagh',
  'galway',
  'kerry',
  'kildare',
  'kilkenny',
  'laois',
  'leitrim',
  'limerick',
  'longford',
  'louth',
  'mayo',
  'meath',
  'monaghan',
  'offaly',
  'roscommon',
  'sligo',
  'tipperary',
  'tyrone',
  'waterford',
  'westmeath',
  'wexford',
  'wicklow',
] as const;

const CITY_TO_COUNTY: Record<string, string> = {
  dublin: 'dublin',
  cork: 'cork',
  galway: 'galway',
  limerick: 'limerick',
  waterford: 'waterford',
  kilkenny: 'kilkenny',
  sligo: 'sligo',
  drogheda: 'louth',
  dundalk: 'louth',
  wexford: 'wexford',
  athlone: 'westmeath',
  ennis: 'clare',
  carlow: 'carlow',
  naas: 'kildare',
  tralee: 'kerry',
  killarney: 'kerry',
  letterkenny: 'donegal',
};

export type ParsedLocation = {
  raw: string;
  city: string | null;
  county: string | null;
  neighbourhood: string | null;
};

const CONNECTOR_RE = /\b(?:in|near|around|by|at)\b/g;
const DUBLIN_NEIGHBOURHOOD_RE = /\b(?:dublin\s+\d{1,2}|d\d{1,2}|dublin\s+city)\b/i;

function findCityToken(tokens: string[]): string | null {
  for (const t of tokens) {
    if ((IRISH_CITIES as readonly string[]).includes(t)) return t;
  }
  return null;
}

function findCountyToken(tokens: string[]): string | null {
  for (const t of tokens) {
    if ((IRISH_COUNTIES as readonly string[]).includes(t)) return t;
  }
  return null;
}

export function parseLocation(input?: string): ParsedLocation | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  // Detect Dublin-style postcode neighbourhoods up front so "Dublin 2" doesn't
  // collapse to just city=dublin and lose the postcode.
  const neighbourhoodMatch = raw.match(DUBLIN_NEIGHBOURHOOD_RE);
  const neighbourhoodFromPostcode = neighbourhoodMatch ? neighbourhoodMatch[0] : null;

  // Tokenise on commas and connector words, collapse "city" / "town".
  const tokens = lower
    .replace(CONNECTOR_RE, ',')
    .split(',')
    .map((s) => s.replace(/\bcity\b|\btown\b/g, '').trim())
    .filter(Boolean);

  // Flat-token list as well, in case something like "near Eyre Square" passes
  // through as a single multi-word token we still want the original phrase.
  const flat = tokens.flatMap((t) => t.split(/\s+/));

  let city = findCityToken(flat);
  let county = findCountyToken(flat);

  if (city && !county) {
    county = CITY_TO_COUNTY[city] ?? null;
  }

  // Neighbourhood inference: explicit Dublin postcode wins. Otherwise, if the
  // raw string had a leading "near X" / "around X" phrase, surface that as the
  // neighbourhood for the ranker's soft signal.
  let neighbourhood: string | null = neighbourhoodFromPostcode;
  if (!neighbourhood) {
    const m = raw.match(/\b(?:near|around|by|at)\s+([A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)*)/);
    if (m) neighbourhood = m[1];
  }

  // If a Dublin postcode was the only signal, force city=dublin / county=dublin.
  if (neighbourhoodFromPostcode && !city) {
    city = 'dublin';
    county = 'dublin';
  }

  return { raw, city, county, neighbourhood };
}
