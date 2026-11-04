// Shared by the Home helper and the forum, so a helper result links to a real forum category
export const FORUM_CATEGORIES = [
  'Leaking tap',
  'Aircon servicing',
  'Power trip',
  'Door lock',
  'Wall mounting',
  'Others',
]

// level: diy (safe to fix yourself), maybe (try first), pro (always book a pro)
// companiesQ: the search word that matches the seeded services
// shopWords: words in shop product names; the first one is the shop search link
export const HOME_PROBLEMS = [
  {
    label: 'Leaking tap',
    icon: '🚰',
    forumCategory: 'Leaking tap',
    companiesQ: 'leak',
    shopWords: ['thread seal tape', 'wrench'],
    symptoms: [
      { label: 'Drips from the spout', level: 'diy' },
      { label: 'Leaks under the sink', level: 'maybe' },
      {
        label: "Pipe in the wall, or water into a neighbour's ceiling",
        level: 'pro',
        reason: 'Work on water pipes needs a PUB-licensed plumber.',
      },
    ],
  },
  {
    label: 'Aircon servicing',
    icon: '❄️',
    forumCategory: 'Aircon servicing',
    companiesQ: 'aircon',
    shopWords: ['screwdriver', 'goggles'],
    symptoms: [
      { label: 'Filter looks dusty', level: 'diy' },
      { label: 'Not cold, or water drips', level: 'maybe' },
      {
        label: 'Needs a gas top-up or a new unit',
        level: 'pro',
        reason: 'Gas top-ups and installation need a trained aircon technician.',
      },
    ],
  },
  {
    label: 'Power trip',
    icon: '⚡',
    forumCategory: 'Power trip',
    companiesQ: 'power trip',
    shopWords: [],
    symptoms: [
      { label: 'Tripped once, and a reset worked', level: 'diy' },
      { label: 'Trips when one appliance is on', level: 'maybe' },
      {
        label: 'Keeps tripping, or smells of burning',
        level: 'pro',
        reason: 'A repeat trip can mean a wiring fault. Call a licensed electrician.',
      },
    ],
  },
  {
    label: 'Door lock',
    icon: '🔑',
    forumCategory: 'Door lock',
    companiesQ: 'lock',
    shopWords: ['screwdriver', 'hex key'],
    symptoms: [
      { label: 'Handle is stiff or loose', level: 'diy' },
      { label: 'Key turns badly', level: 'maybe' },
      {
        label: 'Locked out',
        level: 'pro',
        reason: 'A locksmith opens the door without damage to the lock.',
      },
    ],
  },
  {
    label: 'Wall mounting',
    icon: '🖼️',
    forumCategory: 'Wall mounting',
    companiesQ: 'mount',
    shopWords: ['spirit level', 'tape measure', 'claw hammer'],
    symptoms: [
      { label: 'Light shelf or picture frame', level: 'diy' },
      { label: 'TV on a concrete wall', level: 'maybe' },
      {
        label: 'Heavy cabinet, or near hidden wiring',
        level: 'pro',
        reason: 'A drill into hidden wiring or pipes is dangerous. A pro checks the wall first.',
      },
    ],
  },
]

export const CONFIDENCE = [
  { label: 'Never tried', value: 0 },
  { label: 'Watched a video', value: 1 },
  { label: 'Done it before', value: 2 },
]

export const VERDICTS = {
  diy: { title: 'You can fix this', text: 'This is a small job. The forum and the right tool get you there.' },
  maybe: { title: 'Try it first', text: 'Try it with the right tool. Book a pro if it does not work.' },
  pro: { title: 'Call a pro', text: '' },
}

// a pro symptom always means a pro, whatever the confidence (safety rule)
export function verdict(symptom, confidence) {
  if (symptom.level === 'pro') return 'pro'
  if (symptom.level === 'diy' && confidence >= 1) return 'diy'
  return 'maybe'
}
