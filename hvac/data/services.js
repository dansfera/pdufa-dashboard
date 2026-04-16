module.exports = [
  {
    slug: 'ac-repair',
    name: 'AC Repair',
    icon: '❄️',
    description: 'Diagnosis and repair of central air conditioning systems, including refrigerant recharge, compressor issues, and coil cleaning',
    shortDesc: 'Refrigerant, compressor & coil repairs',
    urgencyLevel: 'High — especially in extreme heat',
    commonIn: ['yuma-az', 'tucson-az', 'tulsa-ok', 'greenville-sc', 'kansas-city-mo'],
    avgCost: '$150–$600',
    timeline: 'Same day to 3 days depending on parts availability',
    steps: [
      'Check the thermostat first — ensure it\'s set to "cool" and the temperature is below current room temp',
      'Inspect and replace the air filter if it\'s clogged — a dirty filter is the #1 cause of AC underperformance',
      'Check the circuit breaker for the AC unit — reset if tripped; call an electrician if it trips again',
      'Inspect the outdoor condenser unit for debris, bent fins, or ice buildup on the coil',
      'If none of the above resolves the issue, call a licensed HVAC technician for a service call',
      'Request a written diagnosis before authorizing any repairs over $200 — get a second opinion for repairs over $500',
      'Ask the technician to check refrigerant charge, capacitor condition, contactor, and coil cleanliness while on-site'
    ],
    warningSign: [
      'AC runs but room temperature won\'t drop below 80°F even with thermostat set to 72°F',
      'Unusual noises from indoor or outdoor unit — banging, squealing, grinding, or rattling',
      'Ice or frost forming on the indoor evaporator coil or refrigerant lines',
      'Water pooling around the indoor air handler due to a clogged condensate drain line',
      'AC system short-cycling — turning on and off every few minutes instead of completing full cooling cycles',
      'Musty or burning smell from supply vents when AC is running',
      'Electric bill spiking 30%+ with no change in usage — a sign of reduced system efficiency'
    ]
  },
  {
    slug: 'ac-installation',
    name: 'AC Installation',
    icon: '🏗️',
    description: 'New central air conditioning system installation, replacement of aging units, and system upgrades for improved efficiency',
    shortDesc: 'New system install & full replacements',
    urgencyLevel: 'Plan ahead — install before summer',
    commonIn: ['yuma-az', 'tucson-az', 'greenville-sc', 'tulsa-ok', 'kansas-city-mo'],
    avgCost: '$4,200–$9,500',
    timeline: '1–2 days for standard installation; longer if ductwork modification needed',
    steps: [
      'Get a load calculation (Manual J) from your contractor — right-sizing your AC is critical; bigger is not better',
      'Obtain at least 3 quotes from licensed, insured HVAC contractors before committing',
      'Verify the contractor pulls the required permit and the installation is inspected by a local building official',
      'Choose a SEER2 rating appropriate for your climate — 16–18 SEER2 is the sweet spot for Sunbelt homes',
      'Consider variable-speed or two-stage compressor systems — they cost more upfront but save significantly on energy bills',
      'Inspect your existing ductwork before installation — leaky or undersized ducts reduce any new system\'s performance by 20–40%',
      'Register your new system for the manufacturer warranty immediately after installation — most require registration within 60–90 days'
    ],
    warningSign: [
      'AC unit is over 15 years old — efficiency has declined significantly and repairs will become more frequent',
      'Repair quotes exceed 50% of the cost of a new system — the "replace vs repair" threshold',
      'R-22 (Freon) refrigerant system — R-22 is no longer manufactured and recharging is very expensive',
      'Comfort complaints throughout the home — rooms that never cool properly despite regular maintenance',
      'Energy bills have increased year-over-year with no increase in usage or rate changes',
      'HVAC system requires multiple repairs per season — a sign of systemic end-of-life failure'
    ]
  },
  {
    slug: 'furnace-repair',
    name: 'Furnace Repair',
    icon: '🔥',
    description: 'Diagnosis and repair of gas and electric furnaces, including igniter, heat exchanger, blower motor, and control board issues',
    shortDesc: 'Gas & electric furnace diagnostics & repair',
    urgencyLevel: 'Emergency in winter — call immediately',
    commonIn: ['kansas-city-mo', 'tulsa-ok', 'greenville-sc', 'yuma-az', 'tucson-az'],
    avgCost: '$150–$600',
    timeline: 'Same day for most repairs; parts availability may extend to 2–3 days',
    steps: [
      'Check the thermostat — ensure it\'s set to "heat" and the temperature setting is above room temperature',
      'Check the furnace filter — a severely clogged filter can trigger the furnace\'s high-limit switch causing shutdown',
      'Verify the furnace power switch (usually on the wall near the furnace) is in the "on" position',
      'Check the circuit breaker for the furnace and reset if tripped',
      'Verify the gas supply valve near the furnace is open (handle parallel to the gas line)',
      'If the furnace still doesn\'t light, call a licensed HVAC or gas contractor — never attempt to repair gas components yourself',
      'Ask the technician to inspect the heat exchanger for cracks during any furnace repair — a cracked heat exchanger is a carbon monoxide hazard'
    ],
    warningSign: [
      'Furnace won\'t ignite or turns off after a few minutes of running',
      'Yellow or flickering flame instead of a steady blue flame (gas furnaces)',
      'Carbon monoxide detector alarming in the home — evacuate and call 911 immediately',
      'Unusual smell from supply vents — burning dust at startup is normal; persistent chemical or gas odor is not',
      'Unusually high gas bills without change in usage — a sign of combustion inefficiency',
      'Cold spots throughout the home that don\'t respond to thermostat adjustments',
      'Furnace age over 18–20 years — heat exchanger failure risk increases significantly at this age'
    ]
  },
  {
    slug: 'heating-installation',
    name: 'Heating Installation',
    icon: '🌡️',
    description: 'New furnace, heat pump, or boiler installation and full heating system replacements for improved efficiency and reliability',
    shortDesc: 'Furnace, heat pump & boiler installs',
    urgencyLevel: 'Plan ahead — install before winter',
    commonIn: ['kansas-city-mo', 'tulsa-ok', 'greenville-sc', 'tucson-az', 'yuma-az'],
    avgCost: '$3,500–$8,000 (furnace) / $4,500–$10,000 (heat pump)',
    timeline: '1–2 days for standard installation',
    steps: [
      'Determine the right system type for your climate — heat pumps are ideal for mild winters (Greenville, Tucson, Yuma); gas furnaces are better for Kansas City and Tulsa cold snaps',
      'Get a Manual J load calculation to right-size the new system — an oversized furnace short-cycles and delivers poor comfort',
      'Check for available utility rebates and federal tax credits — the Inflation Reduction Act offers up to $600 for high-efficiency furnaces and $2,000 for heat pumps',
      'Obtain at least 3 quotes and verify all contractors are licensed and carry general liability insurance',
      'Confirm the new system meets or exceeds 96% AFUE for furnaces (the minimum for most federal tax credit eligibility)',
      'Verify the contractor inspects and seals your existing ductwork before the new system is connected',
      'Schedule installation in the off-season (September for heating) for better pricing and technician availability'
    ],
    warningSign: [
      'Current furnace is over 20 years old with declining efficiency or recurring repairs',
      'Annual repair costs are approaching 30–50% of replacement system cost',
      'Home comfort complaints — uneven heating, rooms that never reach set temperature',
      'Visible rust, cracks, or corrosion on the heat exchanger (a serious safety concern)',
      'AFUE rating below 80% — modern high-efficiency systems run at 95–98% AFUE',
      'Frequent cycling or ignition failures that require repeated service calls'
    ]
  },
  {
    slug: 'hvac-maintenance',
    name: 'HVAC Maintenance',
    icon: '🔧',
    description: 'Scheduled preventive maintenance for heating and cooling systems to maximize efficiency, lifespan, and reliability',
    shortDesc: 'Annual tune-ups & preventive service',
    urgencyLevel: 'Proactive — schedule before peak season',
    commonIn: ['yuma-az', 'tucson-az', 'tulsa-ok', 'greenville-sc', 'kansas-city-mo'],
    avgCost: '$80–$200 per visit / $150–$350 annual plan',
    timeline: '1–2 hours for a standard tune-up visit',
    steps: [
      'Schedule AC maintenance in spring (April–May) before the first major heat wave of the season',
      'Schedule heating system maintenance in fall (September–October) before the first cold snap',
      'Change air filters monthly during peak season (summer for Sunbelt AC, winter for heating climates)',
      'Keep the outdoor condenser unit clear of debris, vegetation, and shade structures within 2 feet',
      'Check condensate drain lines monthly — pour a cup of diluted bleach into the drain pan to prevent clogs',
      'Clean or replace air handler coil if you notice reduced airflow or a musty smell from the vents',
      'Consider a maintenance plan from a local HVAC company — typically $150–$350/year and includes priority service during emergencies'
    ],
    warningSign: [
      'More than 12 months since the last professional HVAC tune-up',
      'Air filters unchanged for more than 60–90 days (30 days in dusty or pet-heavy households)',
      'Reduced airflow from vents — a sign of dirty coils, clogged filter, or duct issues',
      'Longer run cycles with the same thermostat settings — an early sign of efficiency decline',
      'Condenser coils visibly dirty, bent, or restricted by vegetation',
      'Unusual increase in monthly energy bills compared to the same month last year'
    ]
  },
  {
    slug: 'duct-cleaning',
    name: 'Duct Cleaning',
    icon: '🌬️',
    description: 'Professional cleaning of HVAC ductwork to remove dust, debris, allergens, and mold from air distribution systems',
    shortDesc: 'Ductwork cleaning & allergen removal',
    urgencyLevel: 'Moderate — every 3–5 years or as needed',
    commonIn: ['greenville-sc', 'tulsa-ok', 'kansas-city-mo', 'yuma-az', 'tucson-az'],
    avgCost: '$300–$700 for residential systems',
    timeline: '3–5 hours for a standard residential duct cleaning',
    steps: [
      'Verify the contractor uses a truck-mounted or high-powered portable vacuum system with HEPA filtration',
      'Confirm they clean both supply and return ducts, not just the supply registers',
      'Ask for before-and-after photos of the ductwork interior — reputable cleaners provide these',
      'Check if mold testing is included or if it\'s an add-on service',
      'Have the blower wheel, evaporator coil, and air handler interior cleaned at the same time for maximum benefit',
      'After cleaning, replace the air filter before restarting the system',
      'Ask the contractor to seal any duct leaks they find during cleaning — duct sealing can reduce energy bills by 10–30%'
    ],
    warningSign: [
      'Visible dust or debris blowing from supply registers when the system turns on',
      'Musty or moldy smell from vents that persists even after filter replacement',
      'Allergy or respiratory symptoms at home that improve when away — may indicate mold or allergen accumulation in ducts',
      'Pest or rodent infestation in the home — animals can nest and die in ductwork',
      'More than 5 years since the last duct cleaning, especially in dusty Sunbelt climates',
      'Recent home renovation — construction dust contaminates ductwork extensively',
      'Visible mold or discoloration on visible duct sections near registers'
    ]
  },
  {
    slug: 'thermostat-installation',
    name: 'Thermostat Installation',
    icon: '📱',
    description: 'Installation and programming of smart, programmable, and traditional thermostats to optimize comfort and energy savings',
    shortDesc: 'Smart & programmable thermostat setup',
    urgencyLevel: 'Low urgency — schedule at convenience',
    commonIn: ['yuma-az', 'tucson-az', 'greenville-sc', 'tulsa-ok', 'kansas-city-mo'],
    avgCost: '$75–$300 (labor) + thermostat cost ($25–$300)',
    timeline: '1–2 hours for standard installation and programming',
    steps: [
      'Turn off power to the HVAC system at the breaker before removing the old thermostat',
      'Photograph your existing thermostat wiring before disconnecting — this is your reference for reinstallation',
      'Choose a thermostat compatible with your system type — not all smart thermostats work with heat pumps, multi-stage systems, or systems without a C-wire',
      'Smart thermostats require a constant 24V "C-wire" — older homes may not have one (an adapter kit or professional installation solves this)',
      'Use the manufacturer\'s app to set an efficient schedule — for Sunbelt AC, pre-cool to 74°F before arrival rather than letting the home heat to 85°F',
      'Enable geofencing if available — the thermostat adjusts automatically based on your phone\'s location',
      'Check for available utility rebates for smart thermostat installation — many Sunbelt utilities offer $50–$100 rebates'
    ],
    warningSign: [
      'Thermostat is more than 10 years old and non-programmable — you\'re leaving money on the table',
      'System runs constantly without reaching the set temperature — may indicate thermostat miscalibration',
      'Blank or unresponsive thermostat display — could be dead batteries, blown fuse, or wiring issue',
      'HVAC system runs when not commanded or doesn\'t respond to thermostat changes',
      'Uneven temperatures throughout the home that a multi-zone smart thermostat could help address'
    ]
  },
  {
    slug: 'emergency-hvac',
    name: 'Emergency HVAC Service',
    icon: '🚨',
    description: '24/7 emergency HVAC repair service for system failures during extreme heat or cold weather events',
    shortDesc: '24/7 emergency repair & rapid response',
    urgencyLevel: 'Emergency — call immediately',
    commonIn: ['yuma-az', 'kansas-city-mo', 'tulsa-ok', 'tucson-az', 'greenville-sc'],
    avgCost: '$200–$900 (after-hours premium applies)',
    timeline: '2–8 hours response time; same night or next morning for most areas',
    steps: [
      'If temperatures are dangerous (above 100°F inside or below 40°F inside), call emergency services or go to a public cooling/warming center',
      'Call multiple HVAC companies simultaneously — during heat waves and cold snaps, the first available technician wins',
      'Check that the issue isn\'t something simple: circuit breaker, thermostat batteries, clogged filter, tripped emergency switch',
      'Ask the dispatcher for an ETA and whether the technician will have common parts on the truck',
      'Document the symptoms clearly for the technician — when it started, unusual sounds or smells, what you\'ve already checked',
      'Be prepared to approve repair costs on the spot — technicians need authorization to proceed',
      'After the emergency repair, schedule a full diagnostic to ensure no underlying issues contributed to the failure'
    ],
    warningSign: [
      'Total AC failure when outdoor temperatures exceed 95°F — immediate health risk for elderly, children, pets',
      'Furnace failure when indoor temperatures drop below 55°F — pipe freeze risk begins',
      'Carbon monoxide detector alarming — evacuate immediately and call 911 and your gas company',
      'Burning smell or smoke visible from HVAC equipment — shut off system and call fire department if smoke is significant',
      'Refrigerant leak — hissing noise, ice on refrigerant lines, or sharp chemical smell from AC unit',
      'Electrical sparking or burning smell from air handler or outdoor unit — shut off power immediately'
    ]
  },
  {
    slug: 'commercial-hvac',
    name: 'Commercial HVAC',
    icon: '🏢',
    description: 'Commercial HVAC maintenance, repair, and installation for offices, retail, restaurants, and industrial facilities',
    shortDesc: 'Commercial systems, rooftop units & repairs',
    urgencyLevel: 'Critical — downtime costs revenue',
    commonIn: ['kansas-city-mo', 'tulsa-ok', 'greenville-sc', 'yuma-az', 'tucson-az'],
    avgCost: '$500–$5,000+ per repair / $15,000–$100,000+ per installation',
    timeline: 'Emergency response within hours; major installations 1–4 weeks',
    steps: [
      'Establish a preventive maintenance contract with a commercial HVAC company — monthly visits prevent 70% of emergency calls',
      'Keep maintenance records for all rooftop units (RTUs) and split systems — commercial buildings often have 5–20+ units',
      'Train facilities staff to recognize early warning signs: unusual noises, reduced airflow, thermostat anomalies, condensate leaks',
      'Budget for rooftop unit replacements on a schedule — commercial RTUs typically last 10–15 years with proper maintenance',
      'Ensure your HVAC contractor is familiar with commercial refrigerants — EPA Section 608 certification is required',
      'Consider building automation systems (BAS) for buildings over 10,000 sq ft — automated controls dramatically reduce energy waste',
      'Verify all HVAC modifications are permitted and inspected — commercial HVAC is heavily regulated'
    ],
    warningSign: [
      'Rooftop units running but not achieving set temperatures in occupied zones',
      'Visible refrigerant staining or oil residue on or around outdoor units',
      'Tenant or customer complaints about temperature inconsistency or air quality',
      'Condensate draining onto the roof surface rather than through proper channels — major roof damage risk',
      'Utility bills increasing year-over-year in a building with stable occupancy — sign of equipment decline',
      'Any rooftop unit over 15 years old running without a recent full diagnostic'
    ]
  }
];
