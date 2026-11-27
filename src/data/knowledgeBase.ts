import type { CommunityTip } from '../types/airaware';

export interface HomeChecklistItem {
  id: string;
  category: 'Ventilation' | 'Filtration' | 'Source Control' | 'Maintenance';
  title: string;
  detail: string;
  costEstimate: string;
}

export const HOME_CHECKLIST_ITEMS: HomeChecklistItem[] = [
  {
    id: 'home-ventilation',
    category: 'Ventilation',
    title: 'Time window ventilation to low-AQI hours',
    detail: 'Open opposite windows for 15-20 minutes when outdoor AQI drops (typically mid-afternoon) and seal during morning/evening rush hour or smog spikes.',
    costEstimate: 'Free',
  },
  {
    id: 'home-hepa',
    category: 'Filtration',
    title: 'Run an appropriately sized True HEPA purifier in bedrooms',
    detail: 'Match the purifier CADR (Clean Air Delivery Rate) to room square footage and keep doors closed while running. Note: ordinary indoor plants cannot replace mechanical HEPA filtration.',
    costEstimate: '$80 - $250 (or ~$25-$45 DIY Corsi-Rosenthal box)',
  },
  {
    id: 'home-exhaust',
    category: 'Source Control',
    title: 'Use kitchen range hood or exhaust fan during every cooking session',
    detail: 'Frying, sautéing, and gas stoves release high levels of fine PM2.5 and NO2 indoors. Start exhaust ventilation before heating oil or lighting burners.',
    costEstimate: 'Free (uses existing fan) or ~$35 window exhaust fan',
  },
  {
    id: 'home-wet-mop',
    category: 'Source Control',
    title: 'Wet-mop floors and wipe surfaces with damp microfiber cloths',
    detail: 'Dry sweeping and feather dusting re-suspend settled PM10 and allergens into breathing zones. Damp wiping traps particles cleanly.',
    costEstimate: '~$5 - $12 for microfiber cloths',
  },
  {
    id: 'home-no-smoke',
    category: 'Source Control',
    title: 'Eliminate indoor tobacco smoke, incense, and unnecessary candles',
    detail: 'Combustion indoors produces concentrated ultrafine particles and volatile gases that linger for hours, especially in winter with closed windows.',
    costEstimate: 'Free',
  },
  {
    id: 'home-filters',
    category: 'Maintenance',
    title: 'Clean AC pre-filters monthly and replace HEPA/HVAC filters on schedule',
    detail: 'Clogged filters restrict airflow and drop particle capture efficiency. Check manufacturer replacement intervals every 3-6 months during smog season.',
    costEstimate: '~$15 - $50 per replacement filter',
  },
  {
    id: 'home-seals',
    category: 'Ventilation',
    title: 'Seal window gaps and under-door drafts during high-AQI days',
    detail: 'Foam weatherstripping and door sweeps cut outdoor winter smog infiltration into living spaces significantly.',
    costEstimate: '~$8 - $20 weatherstripping tape',
  },
  {
    id: 'home-entry-shoes',
    category: 'Source Control',
    title: 'Keep outdoor shoes and coats at the entryway',
    detail: 'Reduces tracked-in road dust, heavy metals, and pollen from settling into carpets and upholstery.',
    costEstimate: 'Free',
  },
];

export const ROOM_RECOMMENDATIONS = [
  {
    room: 'Bedroom',
    priority: 'Highest Priority (7-9 hrs exposure)',
    guidance: [
      'Position a True HEPA air purifier at least 30 cm away from walls and curtains for unobstructed airflow.',
      'Close windows before dusk during winter temperature inversions when ground-level PM2.5 peaks.',
      'Wash bedding weekly in warm water to remove trapped dust and allergens.',
    ],
  },
  {
    room: 'Kitchen',
    priority: 'Peak Emission Zone',
    guidance: [
      'Always run an externally vented range hood or open a nearby window (when outdoor AQI is acceptable) while cooking.',
      'Use back burners first—range hoods capture smoke and NO2 far more effectively over rear burners.',
      'Cover pans with lids and use electric kettles or induction cooktops when practical to reduce combustion gases.',
    ],
  },
  {
    room: 'Living & Study Area',
    priority: 'Shared Family Space',
    guidance: [
      'Run HVAC fan or purifier on continuous low setting during high-pollution days; set AC to recirculate rather than fresh-air intake during smog alerts.',
      'Avoid burning scented candles, agarbatti/incense, or wood fireplaces indoors.',
      'Note on houseplants: while greenery improves ambiance, peer-reviewed indoor air studies show houseplants remove negligible PM2.5 compared to HEPA filtration.',
    ],
  },
];

export const BUDGET_HOME_SOLUTIONS = [
  {
    title: 'DIY Box-Fan + MERV-13 Filter (Corsi-Rosenthal Style)',
    cost: '~$25 - $45',
    description: 'Taping a MERV-13 furnace filter securely to a standard 20-inch box fan creates an effective low-cost particle scrubber for rooms up to 250 sq ft.',
  },
  {
    title: 'Silicone Door Sweeps & Foam Window Tape',
    cost: '~$10 - $20',
    description: 'Sealing leaky window frames stops cold winter smog drafts from entering bedrooms without expensive window replacements.',
  },
  {
    title: 'Scheduled Cross-Ventilation Routine',
    cost: '$0',
    description: 'Opening two opposite windows for 15 minutes during the cleanest midday window flushes stale CO2 and indoor cooking fumes.',
  },
];

export interface GoGreenChallenge {
  id: string;
  title: string;
  category: 'Transport' | 'Energy' | 'Waste' | 'Community';
  impactNote: string;
  benefitSummary: string;
}

export const GO_GREEN_CHALLENGES: GoGreenChallenge[] = [
  {
    id: 'green-transit',
    title: 'Replace one solo car or ride-hail trip with metro, bus, or carpool',
    category: 'Transport',
    impactNote: 'Cuts per-passenger fuel combustion and urban road congestion.',
    benefitSummary: 'Reduces tailpipe CO2 and nitrogen oxides (NOx) along busy commuter corridors.',
  },
  {
    id: 'green-no-idle',
    title: 'Turn off your vehicle engine if stopped for more than 30 seconds',
    category: 'Transport',
    impactNote: 'Eliminates wasted fuel during school drop-offs and traffic waits.',
    benefitSummary: 'Prevents concentrated exhaust plumes near pedestrians and school gates.',
  },
  {
    id: 'green-active-trip',
    title: 'Walk or cycle for an errand under 2 km (when local AQI is safe)',
    category: 'Transport',
    impactNote: 'Zero tailpipe emissions while supporting daily cardiovascular movement.',
    benefitSummary: 'Always check Live AQI first and choose tree-lined side streets over arterial highways.',
  },
  {
    id: 'green-standby-power',
    title: 'Switch off standby appliances and unnecessary room lighting',
    category: 'Energy',
    impactNote: 'Lowers peak household electricity demand.',
    benefitSummary: 'Reduces reliance on fossil-fuel peaker power plants during evening winter peaks.',
  },
  {
    id: 'green-waste-burn',
    title: 'Compost or properly sort dry leaves and household waste (zero open burning)',
    category: 'Waste',
    impactNote: 'Keeps organic waste out of smoky open burn piles and landfills.',
    benefitSummary: 'Open burning of leaves and trash is a major controllable winter source of toxic PM2.5.',
  },
  {
    id: 'green-conscious-shop',
    title: 'Consolidate deliveries and choose reusable bags & refillable goods',
    category: 'Community',
    impactNote: 'Reduces redundant delivery van miles and single-use packaging waste.',
    benefitSummary: 'Fewer freight trips mean lower diesel particulate matter in residential neighborhoods.',
  },
];

export interface EducationTopic {
  id: string;
  title: string;
  shortAnswer: string;
  details: string[];
  imageUrl?: string;
  imageAlt?: string;
}

export const EDUCATION_TOPICS: EducationTopic[] = [
  {
    id: 'edu-aqi',
    title: 'What is AQI (Air Quality Index)?',
    shortAnswer: 'A standardized 0 to 500 scale that translates complex pollutant concentrations into simple health risk categories.',
    details: [
      'Different countries use different official scales: US EPA AQI (0–500) and CPCB India National AQI (0–500) use distinct pollutant breakpoints and category names. Always check which standard is active.',
      'The overall AQI equals the highest sub-index among measured pollutants (PM2.5, PM10, NO2, SO2, CO, O3) at that hour—the pollutant with the highest score is the "dominant pollutant".',
    ],
  },
  {
    id: 'edu-pm25',
    title: 'What is PM2.5 vs. PM10?',
    shortAnswer: 'Microscopic airborne particles measured in micrometers (µm)—PM2.5 is roughly 30 times finer than a human hair.',
    details: [
      'PM10 (≤ 10 µm): Coarse dust from construction, unpaved roads, and pollen. It settles mainly in the nose and upper airways.',
      'PM2.5 (≤ 2.5 µm): Fine combustion particles from vehicle exhaust, coal/wood burning, crop residue fires, and secondary chemical reactions. Because of their tiny size, PM2.5 particles penetrate deep into lung alveoli and can enter the bloodstream.',
    ],
    imageUrl: '/src/assets/images/edu_particulate_scale_1795776464452.jpg',
    imageAlt: 'Scientific comparison showing PM2.5 and PM10 particle sizes relative to a human hair strand',
  },
  {
    id: 'edu-winter-smog',
    title: 'What Causes Severe Winter Smog?',
    shortAnswer: 'Cold air traps pollutants close to the ground beneath a warmer atmospheric lid—a phenomenon called temperature inversion.',
    details: [
      'In summer, warm ground air rises and disperses city emissions upward. During cold, calm winter nights and mornings, a layer of warm air sits above cooler surface air, acting like a lid.',
      'Combined with calm winds, morning traffic, residential heating, and regional biomass burning, PM2.5 concentrations can spike dramatically until midday sun warms the surface.',
    ],
    imageUrl: '/src/assets/images/edu_winter_inversion_1795776465089.jpg',
    imageAlt: 'Cross-section diagram of urban winter temperature inversion trapping smog below a warm atmospheric layer',
  },
  {
    id: 'edu-vehicles',
    title: 'How Vehicle Pollution Affects Cities',
    shortAnswer: 'Tailpipe exhaust, brake wear, and road dust make urban streets the sharpest hotspots of personal exposure.',
    details: [
      'Diesel and petrol engines emit nitrogen dioxide (NO2), carbon monoxide (CO), volatile organic compounds, and ultrafine soot directly at breathing height.',
      'Even moving one block away from a busy arterial road onto a quieter residential lane can reduce immediate traffic-exhaust exposure significantly.',
    ],
  },
  {
    id: 'edu-indoor',
    title: 'How Indoor Air Pollution Occurs',
    shortAnswer: 'Indoor air can become 2 to 5 times more polluted than outdoor air when smoke, cooking fumes, and dust accumulate.',
    details: [
      'Major indoor sources include high-heat cooking without exhaust ventilation, gas stoves (NO2), incense/candles, tobacco smoke, and outdoor smog seeping through window gaps.',
      'Effective indoor protection combines source reduction (exhaust fans, zero smoking), smart ventilation timing, and mechanical HEPA filtration.',
    ],
  },
  {
    id: 'edu-co2-vs-pm',
    title: 'Air Pollution vs. Greenhouse Gases (CO2)',
    shortAnswer: 'CO2 drives long-term global climate warming, while local air pollutants (PM2.5, NO2, O3) directly harm daily respiratory and cardiovascular health.',
    details: [
      'Reducing CO2 emissions (for example, by shifting from a car to a bus or electric vehicle) does not automatically drop local PM2.5 concentrations that same afternoon, because regional meteorology, dust, and industrial sources differ.',
      'However, cutting fossil fuel combustion—especially clean public transit, solar power, and stopping open waste burning—simultaneously reduces both climate-warming CO2 and health-harming local soot.',
    ],
  },
  {
    id: 'edu-community',
    title: 'How Communities Improve Air Quality',
    shortAnswer: 'Lasting clean air comes from public transit investment, dust control, clean cooking/heating, and transparent local monitoring.',
    details: [
      'Schools and neighborhoods can adopt anti-idling zones near pickup gates, schedule outdoor sports around midday dispersion windows, and advocate for protected bike lanes and electric buses.',
      'Supporting open air-quality monitoring networks helps citizens and municipal planners identify local hotspots using verified data.',
    ],
  },
];

export const COMMUNITY_DEMO_TIPS: CommunityTip[] = [
  {
    id: 'tip-1',
    author: 'Ananya R.',
    city: 'Bengaluru',
    category: 'Commute',
    title: 'Shifted our school run to a walking bus on side lanes',
    body: 'Four neighboring families take turns walking kids along the tree-lined park path instead of idling four cars outside the school gate every morning.',
    likes: 24,
    createdAt: '2026-11-24',
  },
  {
    id: 'tip-2',
    author: 'Marcus T.',
    city: 'Chicago',
    category: 'Home Air',
    title: 'Tested a DIY MERV-13 box fan purifier for winter haze',
    body: 'Built a single-filter box fan unit for our study room for under $35. Running it while cooking or during morning haze keeps indoor dust noticeably lower.',
    likes: 19,
    createdAt: '2026-11-22',
  },
  {
    id: 'tip-3',
    author: 'Priya S.',
    city: 'New Delhi',
    category: 'School & Family',
    title: 'Moved outdoor P.E. from 8 AM inversion to 1 PM',
    body: 'Our PTA shared winter hourly PM2.5 charts with the school principal, and outdoor sports were shifted from early morning to midday when air mixes better.',
    likes: 37,
    createdAt: '2026-11-20',
  },
  {
    id: 'tip-4',
    author: 'Elena V.',
    city: 'London',
    category: 'Community Action',
    title: 'Neighborhood no-idling signs outside community clinic',
    body: 'Volunteers partnered with local shopkeepers to place polite engine-off reminders at loading bays where delivery vans used to idle for 15 minutes.',
    likes: 15,
    createdAt: '2026-11-18',
  },
];

export const VERIFIED_GOVERNMENT_RESOURCES = [
  {
    name: 'CPCB National Air Quality Index (India)',
    url: 'https://airquality.cpcb.gov.in/AQI_India/',
    description: 'Official Central Pollution Control Board real-time station dashboard and Indian AQI bulletins.',
  },
  {
    name: 'US EPA AirNow',
    url: 'https://www.airnow.gov/',
    description: 'Official US Environmental Protection Agency AQI forecasts, smoke maps, and health action guides.',
  },
  {
    name: 'World Health Organization — Ambient Air Quality Guidelines',
    url: 'https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health',
    description: 'Evidence-based global health guidance on PM2.5, PM10, O3, NO2, and SO2 exposure.',
  },
  {
    name: 'OpenAQ Global Open Air Quality Platform',
    url: 'https://openaq.org/',
    description: 'Open-source repository aggregating physical government and research air monitoring stations worldwide.',
  },
];
