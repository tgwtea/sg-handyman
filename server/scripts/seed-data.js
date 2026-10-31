// Data for `pnpm seed`. Every account in the README comes from this file.
// Passwords: each seeded account's password is its username followed by "123",
// except the E2E test accounts, which use TEST_PASSWORD.

export const TEST_PASSWORD = 'test-password-123';

export const ADMIN_USERNAME = 'admin';

export const CUSTOMER_USERNAMES = [
  'alicetan',
  'benlim',
  'chloeng',
  'danielwong',
  'emilyhoo',
  'farahrahman',
  'gokulraj',
  'hannahlee',
  'jasminekoh'
];

// accounts the Playwright E2E tests log in with (client/e2e/helpers.js)
export const TEST_USERS = [
  { username: 'test-customer-1', role: 'customer' },
  { username: 'test-customer-2', role: 'customer' },
  { username: 'test-business', role: 'business', companyName: 'Tan Repair' }
];

// owner: the username of the business account that manages the company
export const COMPANIES = [
  {
    name: '24hrs Plumber SG',
    owner: '24hrsplumber',
    description: '24hrs Plumber provides a comprehensive range of plumbing services in Singapore. From basic leak repair, to complete hot water heater installations– and re-piping of entire house.',
    website: 'https://www.24hrsplumber.com.sg',
    address: '2 Defu South Street 1, #01-23, Singapore 533755',
    services: [
      { category: 'Basins & Taps', details: [
        { service: 'Basin Supply & Installation', startingPrice: 150 },
        { service: 'Basin Tap Replacement (Labour Only)', startingPrice: 60 }
      ] },
      { category: 'Toilets', details: [
        { service: 'Toilet Bowl Choke Clearance (Labour Only)', startingPrice: 60 },
        { service: 'Toilet Siphon Replacement', startingPrice: 80 }
      ] },
      { category: 'Floor Traps & Drains', details: [
        { service: 'Floor Trap Choke Clearance', startingPrice: 40 }
      ] }
    ]
  },
  {
    name: 'Tan Repair',
    owner: 'tanrepair',
    description: 'Family-run repair service handling basin, toilet and general plumbing jobs for HDB and condo homes in the east.',
    website: 'https://www.tanrepair.example',
    address: '3015 Bedok North Street 5, #02-08, Singapore 486350',
    services: [
      { category: 'Basins & Taps', details: [
        { service: 'Basin Supply & Installation', startingPrice: 150 },
        { service: 'Basin Tap Replacement (Labour Only)', startingPrice: 60 }
      ] },
      { category: 'Toilets', details: [
        { service: 'Toilet Bowl Choke Clearance (Labour Only)', startingPrice: 60 },
        { service: 'Toilet Siphon Replacement', startingPrice: 80 }
      ] }
    ]
  },
  {
    name: 'Lion City Plumbing Works',
    owner: 'lioncityplumbing',
    description: 'Licensed plumbers serving HDB and condo homes islandwide. Leak detection, pipe replacement and water heater installation.',
    website: 'https://www.lioncityplumbing.example',
    address: '12 Woodlands Loop, #03-21, Singapore 738283',
    services: [
      { category: 'Basins & Taps', details: [
        { service: 'Basin Supply & Installation', startingPrice: 140 },
        { service: 'Basin Tap Replacement (Labour Only)', startingPrice: 55 }
      ] },
      { category: 'Toilets', details: [
        { service: 'Toilet Bowl Choke Clearance (Labour Only)', startingPrice: 70 },
        { service: 'Flush Valve Replacement', startingPrice: 65 }
      ] },
      { category: 'Water Heaters', details: [
        { service: 'Storage Water Heater Installation', startingPrice: 180 },
        { service: 'Instant Water Heater Repair', startingPrice: 80 }
      ] }
    ]
  },
  {
    name: 'Woodcraft Carpentry SG',
    owner: 'woodcraft',
    description: 'Custom carpentry and furniture repair, from kitchen cabinets to wardrobe hinges.',
    website: 'https://www.woodcraftcarpentry.example',
    address: '25 Kaki Bukit Road 4, #04-30, Singapore 417800',
    services: [
      { category: 'Cabinets', details: [
        { service: 'Cabinet Hinge Repair', startingPrice: 50 },
        { service: 'Kitchen Cabinet Door Replacement', startingPrice: 120 }
      ] },
      { category: 'Doors & Locksets', details: [
        { service: 'Door Lockset Repair', startingPrice: 70 },
        { service: 'Bedroom Door Installation', startingPrice: 380 }
      ] },
      { category: 'Furniture', details: [
        { service: 'Flat-Pack Furniture Assembly', startingPrice: 60 }
      ] }
    ]
  },
  {
    name: 'Tiles & Grout Pro',
    owner: 'tilesandgrout',
    description: 'Tile replacement, regrouting and waterproofing for bathrooms and kitchens.',
    website: 'https://www.tilesandgroutpro.example',
    address: '65 Tampines Industrial Avenue 5, #06-02, Singapore 528642',
    services: [
      { category: 'Floors & Floor Traps', details: [
        { service: 'Floor Trap Choke Clearance', startingPrice: 45 },
        { service: 'Cracked Floor Tile Replacement', startingPrice: 90 }
      ] },
      { category: 'Bathroom Works', details: [
        { service: 'Bathroom Regrouting (Per Bathroom)', startingPrice: 250 },
        { service: 'Bathroom Waterproofing (Per Bathroom)', startingPrice: 600 }
      ] }
    ]
  },
  {
    name: 'KeyMaster Locksmith',
    owner: 'keymaster',
    description: '24/7 emergency lockout service and digital lock installation.',
    website: 'https://www.keymasterlocksmith.example',
    address: '34 Toh Guan Road East, #01-30, Singapore 608579',
    services: [
      { category: 'Emergency Lockout', details: [
        { service: 'Emergency Door Unlocking', startingPrice: 80 },
        { service: 'Car Lockout Assistance', startingPrice: 120 }
      ] },
      { category: 'Locks & Digital Locks', details: [
        { service: 'Door Lock Cylinder Replacement', startingPrice: 90 },
        { service: 'Digital Lock Installation', startingPrice: 350 }
      ] }
    ]
  },
  {
    name: 'CoolBreeze Aircon Services',
    owner: 'coolbreeze',
    description: 'Aircon servicing, chemical wash and gas top-up for all major brands.',
    website: 'https://www.coolbreezeaircon.example',
    address: '21 Bukit Batok Crescent, #08-72, Singapore 658065',
    services: [
      { category: 'Aircon Servicing', details: [
        { service: 'General Servicing (Per Unit)', startingPrice: 25 },
        { service: 'Chemical Wash (Per Unit)', startingPrice: 70 }
      ] },
      { category: 'Aircon Repair', details: [
        { service: 'Refrigerant Gas Top-Up', startingPrice: 60 },
        { service: 'Water Leakage Repair', startingPrice: 50 }
      ] },
      { category: 'Aircon Installation', details: [
        { service: 'System 2 Aircon Installation', startingPrice: 1800 }
      ] }
    ]
  },
  {
    name: 'BrightSpark Electrical',
    owner: 'brightspark',
    description: 'EMA-licensed electricians for wiring, lighting, power trips and DB box upgrades.',
    website: 'https://www.brightsparkelectrical.example',
    address: '8 Ubi Road 2, #05-11, Singapore 408538',
    services: [
      { category: 'Lighting', details: [
        { service: 'Ceiling Light Installation', startingPrice: 45 },
        { service: 'Ceiling Fan Installation', startingPrice: 90 }
      ] },
      { category: 'Power & Sockets', details: [
        { service: 'Power Trip Troubleshooting', startingPrice: 80 },
        { service: 'New Power Socket Installation', startingPrice: 75 }
      ] },
      { category: 'Distribution Board', details: [
        { service: 'Distribution Board (DB Box) Replacement', startingPrice: 450 }
      ] }
    ]
  },
  {
    name: 'HomeFix Handyman Services',
    owner: 'homefix',
    description: 'All-round handyman for small jobs: drilling, mounting, curtain rails and minor repairs.',
    website: 'https://www.homefixhandyman.example',
    address: '17 Kaki Bukit Crescent, #01-05, Singapore 416248',
    services: [
      { category: 'Mounting & Installation', details: [
        { service: 'TV Wall Mounting', startingPrice: 80 },
        { service: 'Shelf Installation', startingPrice: 50 }
      ] },
      { category: 'Curtains & Blinds', details: [
        { service: 'Curtain Rail Installation', startingPrice: 45 }
      ] },
      { category: 'General Handyman', details: [
        { service: 'Wall Drilling (Per Hole)', startingPrice: 15 },
        { service: 'Handyman Service (Per Hour)', startingPrice: 60 }
      ] }
    ]
  },
  {
    name: 'Fresh Coat Painters',
    owner: 'freshcoat',
    description: 'Interior and exterior painting for HDB flats, condos and landed homes. Low-VOC paints available.',
    website: 'https://www.freshcoatpainters.example',
    address: '42 Mactaggart Road, #02-14, Singapore 368086',
    services: [
      { category: 'Interior Painting', details: [
        { service: 'Bedroom Painting (Per Room)', startingPrice: 280 },
        { service: 'Whole-Unit Painting (4-Room HDB)', startingPrice: 1500 }
      ] },
      { category: 'Exterior Painting', details: [
        { service: 'Gate & Grille Painting', startingPrice: 200 }
      ] },
      { category: 'Touch-Ups & Patching', details: [
        { service: 'Wall Patching & Touch-Up', startingPrice: 120 }
      ] }
    ]
  },
  {
    name: 'Arctic Air Aircon',
    owner: 'arcticair',
    description: 'Budget-friendly aircon servicing with annual contract packages.',
    website: 'https://www.arcticair.example',
    address: '11 Yishun Industrial Street 1, #01-28, Singapore 768089',
    services: [
      { category: 'Aircon Servicing', details: [
        { service: 'General Servicing (Per Unit)', startingPrice: 20 },
        { service: 'Chemical Overhaul (Per Unit)', startingPrice: 150 }
      ] },
      { category: 'Aircon Repair', details: [
        { service: 'Refrigerant Gas Top-Up', startingPrice: 50 }
      ] }
    ]
  },
  {
    name: 'Polar Comfort Aircon',
    owner: 'polarcomfort',
    description: 'Authorised installer for major aircon brands with 5-year installation warranty.',
    website: 'https://www.polarcomfort.example',
    address: '18 Boon Lay Way, #07-140, Singapore 609966',
    services: [
      { category: 'Aircon Installation', details: [
        { service: 'System 3 Aircon Installation', startingPrice: 2600 },
        { service: 'System 1 Aircon Installation', startingPrice: 900 }
      ] },
      { category: 'Aircon Servicing', details: [
        { service: 'Chemical Wash (Per Unit)', startingPrice: 80 }
      ] },
      { category: 'Aircon Repair', details: [
        { service: 'Aircon Compressor Replacement', startingPrice: 450 },
        { service: 'Water Leakage Repair', startingPrice: 60 }
      ] }
    ]
  },
  {
    name: 'Tile Doctor SG',
    owner: 'tiledoctor',
    description: 'Fast tile repairs, hollow tile fixing and anti-slip coating.',
    website: 'https://www.tiledoctor.example',
    address: '9 Tampines Street 92, #02-11, Singapore 528871',
    services: [
      { category: 'Floor Tiles', details: [
        { service: 'Cracked Floor Tile Replacement', startingPrice: 75 },
        { service: 'Hollow Tile Repair (Per Tile)', startingPrice: 30 }
      ] },
      { category: 'Bathroom Works', details: [
        { service: 'Anti-Slip Floor Coating (Per Bathroom)', startingPrice: 220 },
        { service: 'Bathroom Regrouting (Per Bathroom)', startingPrice: 200 }
      ] }
    ]
  },
  {
    name: 'Ohm Sweet Ohm Electricians',
    owner: 'ohmsweetohm',
    description: 'Friendly electricians for rewiring, smart switches and lighting design.',
    website: 'https://www.ohmsweetohm.example',
    address: '3 Toa Payoh Industrial Park, #02-1527, Singapore 319055',
    services: [
      { category: 'Lighting', details: [
        { service: 'Ceiling Fan Installation', startingPrice: 75 },
        { service: 'Track Lighting Installation', startingPrice: 150 }
      ] },
      { category: 'Smart Home', details: [
        { service: 'Smart Switch Installation', startingPrice: 60 },
        { service: 'Smart Doorbell Installation', startingPrice: 90 }
      ] },
      { category: 'Distribution Board', details: [
        { service: 'Distribution Board (DB Box) Replacement', startingPrice: 520 }
      ] }
    ]
  },
  {
    name: 'Fix-It-All Home Services',
    owner: 'fixitall',
    description: 'Multi-trade team covering plumbing, electrical and carpentry in one visit.',
    website: 'https://www.fixitall.example',
    address: '10 Ubi Crescent, #02-03, Singapore 408564',
    services: [
      { category: 'Basins & Taps', details: [
        { service: 'Basin Tap Replacement (Labour Only)', startingPrice: 65 }
      ] },
      { category: 'Lighting', details: [
        { service: 'Ceiling Light Installation', startingPrice: 55 }
      ] },
      { category: 'Doors & Locksets', details: [
        { service: 'Door Lockset Repair', startingPrice: 80 }
      ] },
      { category: 'General Handyman', details: [
        { service: 'Handyman Service (Per Hour)', startingPrice: 75 }
      ] }
    ]
  },
  {
    name: 'GreenLeaf Pest Control',
    owner: 'greenleaf',
    description: 'Eco-friendly pest control for termites, cockroaches, ants and bed bugs.',
    website: 'https://www.greenleafpest.example',
    address: '10 Admiralty Street, #05-60, Singapore 757695',
    services: [
      { category: 'Pest Control', details: [
        { service: 'General Pest Treatment', startingPrice: 120 },
        { service: 'Termite Treatment', startingPrice: 380 },
        { service: 'Bed Bug Treatment', startingPrice: 250 }
      ] }
    ]
  },
  {
    name: 'Pipeline Pros',
    owner: 'pipelinepros',
    description: 'Premium plumbing for condos and landed homes, specialising in concealed piping and full re-piping.',
    website: 'https://www.pipelinepros.example',
    address: '315 Alexandra Road, #03-05, Singapore 159944',
    services: [
      { category: 'Piping', details: [
        { service: 'Concealed Pipe Replacement (Per Metre)', startingPrice: 120 },
        { service: 'Full House Re-Piping', startingPrice: 3200 }
      ] },
      { category: 'Water Heaters', details: [
        { service: 'Storage Water Heater Installation', startingPrice: 250 },
        { service: 'Instant Water Heater Installation', startingPrice: 200 }
      ] },
      { category: 'Basins & Taps', details: [
        { service: 'Basin Supply & Installation', startingPrice: 220 }
      ] }
    ]
  },
  {
    name: 'Volt Masters Electrical',
    owner: 'voltmasters',
    description: 'Licensed electrical works for homes and small offices. Same-week appointments available.',
    website: 'https://www.voltmasters.example',
    address: '51 Serangoon North Avenue 4, #04-08, Singapore 555858',
    services: [
      { category: 'Lighting', details: [
        { service: 'Ceiling Light Installation', startingPrice: 40 },
        { service: 'LED Downlight Installation (Per Unit)', startingPrice: 35 }
      ] },
      { category: 'Power & Sockets', details: [
        { service: 'Power Trip Troubleshooting', startingPrice: 70 },
        { service: 'Isolator Switch Installation', startingPrice: 85 }
      ] }
    ]
  },
  {
    name: 'Colour Me Home Painting',
    owner: 'colourmehome',
    description: 'HDB and BTO painting specialists. Free colour consultation with every whole-house job.',
    website: 'https://www.colourmehome.example',
    address: '1 Ang Mo Kio Industrial Park 2A, #01-25, Singapore 568049',
    services: [
      { category: 'Interior Painting', details: [
        { service: 'Bedroom Painting (Per Room)', startingPrice: 240 },
        { service: 'Whole-Unit Painting (3-Room HDB)', startingPrice: 1100 },
        { service: 'Whole-Unit Painting (5-Room HDB)', startingPrice: 1900 }
      ] },
      { category: 'Touch-Ups & Patching', details: [
        { service: 'Wall Patching & Touch-Up', startingPrice: 100 }
      ] }
    ]
  },
  {
    name: 'Secure Lock & Key',
    owner: 'securelock',
    description: 'Locksmiths for homes and offices: digital locks, safes and key duplication.',
    website: 'https://www.securelock.example',
    address: '3 Irving Road, #01-14, Singapore 369522',
    services: [
      { category: 'Locks & Digital Locks', details: [
        { service: 'Digital Lock Installation', startingPrice: 320 },
        { service: 'Door Lock Cylinder Replacement', startingPrice: 75 }
      ] },
      { category: 'Emergency Lockout', details: [
        { service: 'Emergency Door Unlocking', startingPrice: 70 }
      ] },
      { category: 'Safes', details: [
        { service: 'Locked Safe Opening', startingPrice: 180 }
      ] }
    ]
  },
  {
    name: 'Handy Andy SG',
    owner: 'handyandy',
    description: 'One-man handyman service for quick fixes, mounting and odd jobs in the north-east.',
    website: 'https://www.handyandysg.example',
    address: '4012 Ang Mo Kio Avenue 10, #03-31, Singapore 569628',
    services: [
      { category: 'Mounting & Installation', details: [
        { service: 'TV Wall Mounting', startingPrice: 65 },
        { service: 'Shelf Installation', startingPrice: 40 }
      ] },
      { category: 'General Handyman', details: [
        { service: 'Handyman Service (Per Hour)', startingPrice: 45 },
        { service: 'Wall Drilling (Per Hole)', startingPrice: 10 }
      ] },
      { category: 'Curtains & Blinds', details: [
        { service: 'Curtain Rail Installation', startingPrice: 40 }
      ] }
    ]
  },
  {
    name: 'Oak & Nail Carpentry',
    owner: 'oakandnail',
    description: 'Built-in wardrobes, kitchen cabinets and on-site furniture repairs.',
    website: 'https://www.oakandnail.example',
    address: '45 Sungei Kadut Loop, #02-01, Singapore 729495',
    services: [
      { category: 'Cabinets & Wardrobes', details: [
        { service: 'Kitchen Cabinet Door Replacement', startingPrice: 100 },
        { service: 'Custom Wardrobe Build (Per Foot)', startingPrice: 180 }
      ] },
      { category: 'Furniture', details: [
        { service: 'Flat-Pack Furniture Assembly', startingPrice: 50 },
        { service: 'Wooden Chair Repair', startingPrice: 40 }
      ] }
    ]
  },
  {
    name: 'Rapid Plumb Express',
    owner: 'rapidplumb',
    description: 'Same-day plumbing repairs across the west. No call-out fee within Jurong and Clementi.',
    website: 'https://www.rapidplumb.example',
    address: '48 Toh Guan Road East, #01-112, Singapore 608586',
    services: [
      { category: 'Basins & Taps', details: [
        { service: 'Basin Tap Replacement (Labour Only)', startingPrice: 45 },
        { service: 'Leaking Basin Pipe Repair', startingPrice: 60 }
      ] },
      { category: 'Toilets', details: [
        { service: 'Toilet Bowl Choke Clearance (Labour Only)', startingPrice: 55 },
        { service: 'Toilet Bowl Replacement', startingPrice: 280 }
      ] },
      { category: 'Floor Traps & Drains', details: [
        { service: 'Floor Trap Choke Clearance', startingPrice: 35 }
      ] }
    ]
  },
  {
    name: 'Premier Wall Finishes',
    owner: 'premierwall',
    description: 'Feature walls, wallpaper and textured finishes for homes and showrooms.',
    website: 'https://www.premierwall.example',
    address: '30 Kallang Place, #06-12, Singapore 339159',
    services: [
      { category: 'Interior Painting', details: [
        { service: 'Feature Wall Painting', startingPrice: 350 }
      ] },
      { category: 'Wallpaper', details: [
        { service: 'Wallpaper Installation (Per Roll)', startingPrice: 60 },
        { service: 'Wallpaper Removal (Per Room)', startingPrice: 180 }
      ] }
    ]
  },
  {
    name: 'Sparkle Glass & Windows',
    owner: 'sparkleglass',
    description: 'Window repairs, glass replacement and mosquito-net installation.',
    website: 'https://www.sparkleglass.example',
    address: '8 Kallang Avenue, #03-22, Singapore 339509',
    services: [
      { category: 'Windows & Glass', details: [
        { service: 'Window Glass Panel Replacement', startingPrice: 150 },
        { service: 'Window Hinge Repair', startingPrice: 70 }
      ] },
      { category: 'Mosquito Nets', details: [
        { service: 'Mosquito Net Installation (Per Window)', startingPrice: 85 }
      ] }
    ]
  }
];

// [company name, customer username, rating, comment, date]
export const REVIEWS = [
  ['24hrs Plumber SG', 'alicetan', 5, 'Called at 11pm for a burst pipe and the plumber arrived within the hour. Lifesaver.', '2026-04-03'],
  ['24hrs Plumber SG', 'gokulraj', 4, 'Cleared our floor trap quickly. Slightly pricier than quoted because of the late hour.', '2026-05-18'],
  ['24hrs Plumber SG', 'hannahlee', 4, 'New basin looks great and the installer cleaned up after himself.', '2026-08-09'],
  ['Tan Repair', 'benlim', 5, 'Uncle Tan fixed our toilet choke in 20 minutes and explained what caused it.', '2026-04-11'],
  ['Tan Repair', 'emilyhoo', 5, 'Honest pricing. He told us we did not need a new siphon after all.', '2026-06-02'],
  ['Tan Repair', 'jasminekoh', 3, 'Good work on the basin tap, but he came an hour later than agreed.', '2026-09-14'],
  ['Lion City Plumbing Works', 'danielwong', 4, 'Replaced our storage water heater the same day. Neat piping work.', '2026-04-22'],
  ['Lion City Plumbing Works', 'chloeng', 5, 'Found a hidden leak behind the toilet that two other plumbers missed.', '2026-07-01'],
  ['Lion City Plumbing Works', 'farahrahman', 4, 'Professional team. The flush valve works perfectly now.', '2026-09-03'],
  ['Woodcraft Carpentry SG', 'alicetan', 5, 'Cabinet doors now close smoothly and the new hinges are solid.', '2026-04-16'],
  ['Woodcraft Carpentry SG', 'gokulraj', 4, 'Bedroom door fits well. Took two visits to get the frame right.', '2026-06-21'],
  ['Woodcraft Carpentry SG', 'danielwong', 5, 'Assembled a whole wardrobe in under two hours. Very efficient.', '2026-08-30'],
  ['Tiles & Grout Pro', 'emilyhoo', 5, 'Bathroom looks brand new after the regrouting. No more black lines.', '2026-05-05'],
  ['Tiles & Grout Pro', 'benlim', 4, 'Waterproofing stopped the leak to our neighbour below. Pricey but worth it.', '2026-07-12'],
  ['Tiles & Grout Pro', 'hannahlee', 3, 'Cracked tile replaced, but the colour is a slightly different shade.', '2026-09-19'],
  ['KeyMaster Locksmith', 'chloeng', 5, 'Locked out at 2am and they had me inside in 15 minutes.', '2026-04-08'],
  ['KeyMaster Locksmith', 'jasminekoh', 4, 'Digital lock installed cleanly and they set up all the fingerprints for us.', '2026-06-15'],
  ['KeyMaster Locksmith', 'farahrahman', 2, 'Car lockout fee was much higher than the starting price shown.', '2026-08-22'],
  ['CoolBreeze Aircon Services', 'danielwong', 5, 'Chemical wash made a huge difference. The bedroom unit is cold again.', '2026-04-27'],
  ['CoolBreeze Aircon Services', 'alicetan', 4, 'Fixed the water leakage and showed me how to clean the filter.', '2026-06-30'],
  ['CoolBreeze Aircon Services', 'gokulraj', 5, 'Punctual and tidy. Servicing three units took less than an hour.', '2026-09-08'],
  ['BrightSpark Electrical', 'hannahlee', 5, 'Traced our power trip to a faulty kettle socket and fixed it on the spot.', '2026-05-02'],
  ['BrightSpark Electrical', 'benlim', 4, 'Ceiling fan installed well. Wiring is hidden neatly in the casing.', '2026-07-19'],
  ['BrightSpark Electrical', 'emilyhoo', 5, 'DB box replacement was smooth and they handled the paperwork.', '2026-09-25'],
  ['HomeFix Handyman Services', 'jasminekoh', 4, 'Mounted our 65-inch TV level on the first try.', '2026-04-19'],
  ['HomeFix Handyman Services', 'chloeng', 5, 'Put up shelves and curtain rails in one visit. Great value.', '2026-06-08'],
  ['HomeFix Handyman Services', 'danielwong', 3, 'Job was fine but he forgot to bring the right drill bits.', '2026-08-17'],
  ['Fresh Coat Painters', 'farahrahman', 5, 'Painted our 4-room HDB in two days with no mess left behind.', '2026-05-10'],
  ['Fresh Coat Painters', 'alicetan', 4, 'Low-VOC paint meant no smell. The gate looks new again.', '2026-07-24'],
  ['Fresh Coat Painters', 'gokulraj', 4, 'Good touch-up work, though they missed one patch behind the door.', '2026-09-28'],
  ['Arctic Air Aircon', 'hannahlee', 4, 'Cheap and reliable servicing. The annual package saves money.', '2026-04-14'],
  ['Arctic Air Aircon', 'benlim', 3, 'Gas top-up worked, but the technician was in a rush.', '2026-06-26'],
  ['Arctic Air Aircon', 'emilyhoo', 4, 'Chemical overhaul fixed the musty smell completely.', '2026-08-13'],
  ['Polar Comfort Aircon', 'jasminekoh', 5, 'System 3 install was spotless and they explained the warranty clearly.', '2026-05-21'],
  ['Polar Comfort Aircon', 'chloeng', 4, 'Compressor replaced quickly. Unit is quieter than before.', '2026-07-08'],
  ['Polar Comfort Aircon', 'danielwong', 5, 'Fixed a leak that kept coming back with another company.', '2026-09-11'],
  ['Tile Doctor SG', 'farahrahman', 4, 'Hollow tiles fixed without breaking the ones around them.', '2026-04-30'],
  ['Tile Doctor SG', 'alicetan', 5, 'Anti-slip coating is invisible but really works. Safer for my parents.', '2026-07-15'],
  ['Tile Doctor SG', 'gokulraj', 3, 'Regrouting was okay. Some lines are uneven near the shower.', '2026-09-06'],
  ['Ohm Sweet Ohm Electricians', 'hannahlee', 5, 'Smart switches work with our phone app. Friendly and patient team.', '2026-05-13'],
  ['Ohm Sweet Ohm Electricians', 'benlim', 4, 'Track lighting in the living room looks fantastic.', '2026-07-29'],
  ['Ohm Sweet Ohm Electricians', 'emilyhoo', 5, 'Smart doorbell set up in 30 minutes, including the Wi-Fi pairing.', '2026-09-17'],
  ['Fix-It-All Home Services', 'jasminekoh', 4, 'Fixed a tap, a light and a door lock in one visit. Very convenient.', '2026-04-25'],
  ['Fix-It-All Home Services', 'chloeng', 4, 'Hourly rate is fair and they work fast.', '2026-06-19'],
  ['Fix-It-All Home Services', 'danielwong', 3, 'Good handyman, but the electrical part needed a second trip.', '2026-08-26'],
  ['GreenLeaf Pest Control', 'farahrahman', 5, 'Termite treatment worked and they came back for a free check.', '2026-05-07'],
  ['GreenLeaf Pest Control', 'alicetan', 4, 'Eco-friendly spray, safe for our cat. Cockroaches are gone.', '2026-07-03'],
  ['GreenLeaf Pest Control', 'gokulraj', 1, 'Bed bugs came back within two weeks. Still waiting for the follow-up.', '2026-09-21'],
  ['Pipeline Pros', 'hannahlee', 5, 'Full re-piping of our landed home, finished on schedule.', '2026-04-12'],
  ['Pipeline Pros', 'benlim', 4, 'Instant water heater install was neat. Premium price, premium work.', '2026-06-24'],
  ['Pipeline Pros', 'emilyhoo', 4, 'Concealed pipe replaced with minimal hacking of the wall.', '2026-08-19'],
  ['Volt Masters Electrical', 'jasminekoh', 5, 'LED downlights installed throughout the flat in half a day.', '2026-05-16'],
  ['Volt Masters Electrical', 'chloeng', 4, 'Got a same-week slot for a power trip issue, as promised.', '2026-07-21'],
  ['Volt Masters Electrical', 'danielwong', 4, 'Isolator switch for the water heater done safely and quickly.', '2026-09-09'],
  ['Colour Me Home Painting', 'farahrahman', 5, 'The free colour consultation helped us pick a great palette for our BTO.', '2026-04-20'],
  ['Colour Me Home Painting', 'alicetan', 4, 'Bedroom painted evenly. They covered all the furniture first.', '2026-06-11'],
  ['Colour Me Home Painting', 'gokulraj', 3, 'Nice finish, but the job took a day longer than planned.', '2026-08-28'],
  ['Secure Lock & Key', 'hannahlee', 5, 'Opened a safe we lost the code to, without damaging it.', '2026-05-24'],
  ['Secure Lock & Key', 'benlim', 4, 'Digital lock install was clean and the price was fair.', '2026-07-10'],
  ['Secure Lock & Key', 'emilyhoo', 3, 'Lockout service was quick but they only accept cash.', '2026-09-23'],
  ['Handy Andy SG', 'jasminekoh', 5, 'Andy is fast, cheerful and charges a fair hourly rate.', '2026-04-06'],
  ['Handy Andy SG', 'chloeng', 4, 'Mounted the TV and a row of shelves in one go.', '2026-06-13'],
  ['Handy Andy SG', 'danielwong', 4, 'Curtain rails are straight and sturdy. Would book again.', '2026-08-24'],
  ['Oak & Nail Carpentry', 'farahrahman', 5, 'Custom wardrobe fits our odd-shaped room perfectly.', '2026-05-28'],
  ['Oak & Nail Carpentry', 'alicetan', 4, 'Repaired a wobbly antique chair. It feels solid again.', '2026-07-27'],
  ['Oak & Nail Carpentry', 'gokulraj', 3, 'Cabinet doors look good, but delivery of the panels was delayed.', '2026-09-15'],
  ['Rapid Plumb Express', 'hannahlee', 5, 'Same-day repair in Clementi, and no call-out fee as advertised.', '2026-04-09'],
  ['Rapid Plumb Express', 'benlim', 4, 'Toilet bowl replaced cleanly. They took away the old one.', '2026-06-17'],
  ['Rapid Plumb Express', 'emilyhoo', 4, 'Fixed a leaking basin pipe in 15 minutes.', '2026-08-31'],
  ['Premier Wall Finishes', 'jasminekoh', 5, 'Our feature wall is the first thing guests notice. Beautiful work.', '2026-05-19'],
  ['Premier Wall Finishes', 'chloeng', 4, 'Wallpaper removal and new install done over one weekend.', '2026-07-05'],
  ['Premier Wall Finishes', 'danielwong', 3, 'Nice wallpaper, but a few seams are visible in strong light.', '2026-09-02'],
  ['Sparkle Glass & Windows', 'farahrahman', 5, 'Replaced a cracked window panel within a day of my call.', '2026-04-29'],
  ['Sparkle Glass & Windows', 'alicetan', 4, 'Mosquito nets fit well and are easy to remove for cleaning.', '2026-07-17'],
  ['Sparkle Glass & Windows', 'gokulraj', 4, 'Window hinge repair fixed the rattling in strong wind.', '2026-09-27']
];
