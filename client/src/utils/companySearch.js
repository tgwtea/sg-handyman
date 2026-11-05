// Free-text company search: a customer types a problem ("kitchen sink leaking"),
// not the exact name of a service. Each useful word is matched on its own, and
// companies that match more words come first.

// words that say nothing about the job
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'at', 'be', 'broken', 'can', 'cannot', 'do', 'does', 'fix', 'fixing', 'for',
  'help', 'how', 'i', 'in', 'is', 'it', 'my', 'need', 'needs', 'not', 'of', 'on', 'or', 'please',
  'repair', 'the', 'to', 'up', 'want', 'with', 'working', 'home', 'house',
])

// everyday words mapped to the words the service list uses
const SYNONYMS = {
  sink: ['basin', 'tap'],
  faucet: ['tap'],
  pipe: ['pipe', 'piping'],
  leaking: ['leak'],
  leaky: ['leak'],
  drip: ['leak', 'tap'],
  dripping: ['leak', 'tap'],
  choked: ['choke'],
  blocked: ['choke'],
  clogged: ['choke'],
  drain: ['drain', 'floor trap'],
  ac: ['aircon'],
  'air-con': ['aircon'],
  aircond: ['aircon'],
  cold: ['aircon'],
  electric: ['power'],
  electricity: ['power'],
  socket: ['socket', 'power'],
  trip: ['power trip'],
  tripped: ['power trip'],
  bulb: ['light'],
  lights: ['light'],
  lamp: ['light'],
  locked: ['lock'],
  key: ['lock'],
  door: ['door'],
  wardrobe: ['wardrobe'],
  heater: ['heater'],
  shower: ['water heater'],
  hot: ['water heater'],
  paint: ['painting'],
  cockroach: ['pest'],
  cockroaches: ['pest'],
  termites: ['termite'],
  ants: ['pest'],
  tv: ['tv'],
  mount: ['mounting'],
}

// "leaks" -> "leak", "lights" -> "light"; short words stay as typed
function singular(word) {
  return word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word
}

// the search terms for one query: each term is a list of alternatives
export function searchTerms(query) {
  return String(query ?? '')
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((word) => word && !STOP_WORDS.has(word))
    .map((word) => [...new Set([word, singular(word), ...(SYNONYMS[word] ?? [])])])
}

export function companyText(company) {
  const services = company.services ?? []
  return [
    company.name ?? '',
    ...services.map((category) => category.category ?? ''),
    ...services.flatMap((category) => (category.details ?? []).map((detail) => detail.service ?? '')),
  ].join(' ').toLowerCase()
}

// how many terms the company matches (0 means no match)
export function searchScore(company, terms) {
  const text = companyText(company)
  return terms.filter((alternatives) => alternatives.some((word) => text.includes(word))).length
}
