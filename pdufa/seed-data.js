/**
 * Biotech Catalyst Calendar — Seed Data
 * Covers: PDUFA dates, AdCom meetings, clinical trial readouts, conferences, earnings
 * Sources: FDA PDUFA calendar, SEC filings, clinicaltrials.gov, company press releases,
 *          conference organizer websites, BiopharmaWatch, RTTNews, company guidance,
 *          BioMed Nexus, PDUFA.bio, MarketBeat, Quiver Quantitative
 *
 * Run: node pdufa/seed-data.js
 * Last thorough audit: April 6, 2026
 *
 * Changelog vs prior version (April 6, 2026 weekly refresh):
 * - ORCA Orca-T: PDUFA extended from April 6 → July 6, 2026 (FDA requested time to review updated CMC data; announced April 1, 2026)
 * - LLY orforglipron: status → approved (FDA approved April 1, 2026 as Foundayo under CNPV program, 294 days early; brand_name set)
 * - AACR 2026: corrected date to April 17 (not April 25); corrected location to San Diego, CA (not Chicago, IL); runs April 17–22
 * - ESMO 2026: corrected date to October 23 (not September 12); corrected location to Madrid, Spain; runs October 23–27
 * - ASH 2026: corrected date to December 12 (not December 5); correct dates December 12–15, New Orleans
 * - VRDN-003: renamed to elegrobart (VRDN-003); REVEAL-1 results positive (announced March 30, 2026); REVEAL-2 still Q2 2026
 * - NEW: MBRX annamycin (AnnAraC) MIRACLE Phase 2B/3 interim readout — 45th subject enrolled March 23, 2026; interim unblinding mid-2026
 *
 * Changelog vs prior version (March 31, 2026 weekly refresh):
 * - LNTH piflufolastat: status → approved (PYLARIFY TruVu approved March 6, 2026 on PDUFA date)
 * - RYTM setmelanotide: status → approved (FDA approved March 19, 2026, 1 day early; EMA CHMP positive opinion March 26)
 * - RCKT marnetegragene (KRESLADI): status → approved (FDA approved March 26, 2026, accelerated approval, 2 days early)
 * - AZN enhertu+pertuzumab: status → approved (was missing; outcome_result already correct in DB)
 * - ACC Scientific Sessions 2026: status → completed (conference ran March 28–30, 2026)
 * - GPCR GSBR-1290: renamed aleniglipron; Phase 2 ACCESS II positive topline data released March 16 (16% weight loss at 44w); status → reported
 * - JNJ nipocalimab HDFN: corrected — no HDFN BLA was filed with Feb 2026 PDUFA; AZALEA Phase 3 still enrolling; nipocalimab approved as IMAAVY for gMG in 2025
 * - NEW PDUFA: DNLI tividenofusp alfa (AVLAYAH) — approved March 25, 2026 (3 weeks early); sub-$3.5B cap; Hunter syndrome MPS II; first brain-penetrant ERT
 * - NEW PDUFA: CELC gedatolisib — PDUFA July 17, 2026; HR+/HER2-/PIK3CA WT breast cancer; Priority Review + RTOR; sub-$2B cap
 *
 * Changelog vs prior version (March 24, 2026):
 * - CYTK aficamten PDUFA: corrected date to 2025-12-26, status → approved (FDA approved Dec 19 2025)
 * - CYTK aficamten AdCom: updated status → approved (drug approved before AdCom needed)
 * - TVTX sparsentan FSGS: PDUFA extended from Jan 13 → Apr 13, 2026 (major amendment)
 * - ALDX reproxalap: status → CRL (third CRL issued March 17, 2026)
 * - RLAY RLY-2608: renamed zovegalisib; initial data at ESMO TAT March 16, 2026
 * - NEW PDUFA: atacicept ($VERA) Jul 7 2026; veligrotug ($VRDN) Jun 30 2026
 * - NEW: Q4 2025 earnings for 7 tracked tickers (all already reported Feb–Mar 2026)
 * - NEW: Q1 2026 upcoming earnings for key tickers
 * - NEW: ACC 2026 conference entry
 */

const { Pool } = require('pg');

const CATALYST_DATA = [

  // ==========================================================================
  // PDUFA DATES — FDA Target Action Dates (NDA/BLA/sNDA/sBLA)
  // ==========================================================================

  // === Q1 2026 (Jan–Mar) — HISTORICAL (already decided) ===
  {
    catalyst_type: 'pdufa',
    drug_name: 'tabelecleucel',
    brand_name: 'Ebvallo',
    company: 'Atara Biotherapeutics',
    ticker: 'ATRA',
    cashtag: '$ATRA',
    pdufa_date: '2026-01-10',
    indication: 'Epstein-Barr virus-positive post-transplant lymphoproliferative disease (EBV+ PTLD)',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy'],
    phase: 'BLA',
    nda_bla_type: 'BLA',
    filing_date: '2025-03-10',
    status: 'CRL',
    notes: 'FDA issued second Complete Response Letter (CRL) on January 12, 2026. ALLELE trial data deemed inadequate for approval. BLA resubmission was accepted July 2025 with PDUFA Jan 10, 2026.',
    slug: 'tabelecleucel-atra-ebv-ptld'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'sparsentan',
    brand_name: 'Filspari',
    company: 'Travere Therapeutics',
    ticker: 'TVTX',
    cashtag: '$TVTX',
    pdufa_date: '2026-04-13',
    indication: 'Focal segmental glomerulosclerosis (FSGS)',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy', 'Orphan Drug'],
    phase: 'sNDA',
    nda_bla_type: 'sNDA',
    status: 'upcoming',
    notes: 'PDUFA originally January 13, 2026. Extended to April 13, 2026 after FDA received a major amendment to the sNDA in January 2026. Filspari is already approved for IgAN; FSGS approval would make it the first drug specifically indicated for FSGS. DUPLEX Phase 3 showed significant proteinuria reduction (did not meet primary eGFR slope endpoint over 108 weeks). AdCom initially planned — FDA later determined no AdCom needed.',
    slug: 'sparsentan-tvtx-fsgs'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'fam-trastuzumab deruxtecan-nxki + pertuzumab',
    brand_name: 'Enhertu + Perjeta',
    company: 'AstraZeneca / Roche',
    ticker: 'AZN',
    cashtag: '$AZN',
    pdufa_date: '2026-01-20',
    indication: 'First-line HER2-positive metastatic breast cancer (combination)',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy'],
    phase: 'sBLA',
    nda_bla_type: 'sBLA',
    status: 'approved',
    notes: 'Supplemental BLA for Enhertu + pertuzumab combination in HER2+ metastatic breast cancer. Approved by FDA January 2026.',
    slug: 'enhertu-pertuzumab-her2-breast-cancer'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'nipocalimab',
    brand_name: null,
    company: 'Johnson & Johnson',
    ticker: 'JNJ',
    cashtag: '$JNJ',
    pdufa_date: '2026-02-01',
    indication: 'Hemolytic disease of the fetus and newborn (HDFN)',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy', 'Orphan Drug'],
    phase: 'BLA',
    nda_bla_type: 'BLA',
    status: 'upcoming',
    notes: 'NOTE (March 31, 2026 audit): This entry contained an error. Nipocalimab was approved by FDA as IMAAVY® (nipocalimab-aahu) for generalized myasthenia gravis (gMG) in 2025 — NOT for HDFN with a Feb 2026 PDUFA. The HDFN program (AZALEA Phase 3 trial) is still actively enrolling as of March 2026; no HDFN BLA has been filed. JNJ filed a separate supplemental application for wAIHA (warm autoimmune hemolytic anemia) on Feb 24, 2026. This entry is retained for reference but does not represent an active PDUFA date.',
    slug: 'nipocalimab-jnj-hdfn'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'dupilumab',
    brand_name: 'Dupixent',
    company: 'Sanofi / Regeneron',
    ticker: 'REGN',
    cashtag: '$REGN',
    pdufa_date: '2026-02-28',
    indication: 'Allergic fungal rhinosinusitis (AFRS) — adults and children 6+',
    review_type: 'standard',
    designation: ['Fast Track'],
    phase: 'sBLA',
    nda_bla_type: 'sBLA',
    status: 'approved',
    notes: 'FDA APPROVED February 26, 2026 — 2 days ahead of PDUFA target date. Expands Dupixent label to include allergic fungal rhinosinusitis (AFRS) in adults and children aged 6+.',
    slug: 'dupixent-dupilumab-afrs'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'piflufolastat F-18',
    brand_name: 'PYLARIFY TruVu',
    company: 'Lantheus Holdings',
    ticker: 'LNTH',
    cashtag: '$LNTH',
    pdufa_date: '2026-03-06',
    indication: 'PSMA PET imaging — new higher-concentration formulation for prostate cancer',
    review_type: 'standard',
    designation: [],
    phase: 'sNDA',
    nda_bla_type: 'sNDA',
    status: 'approved',
    notes: 'FDA APPROVED March 6, 2026 — on PDUFA target date. Approved as PYLARIFY TruVu (piflufolastat F 18) injection via 505(b)(2) pathway using OSPREY and CONDOR trial data. Higher-radioactivity-concentration formulation enables ~50% larger batch sizes and broader geographic distribution. Improves access to PSMA PET imaging in underserved regions. Commercial launch planned Q4 2026 with phased geographic rollout to transition from original PYLARIFY to TruVu.',
    slug: 'pylarify-piflufolastat-psma-pet-prostate'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'reproxalap',
    brand_name: null,
    company: 'Aldeyra Therapeutics',
    ticker: 'ALDX',
    cashtag: '$ALDX',
    pdufa_date: '2026-03-16',
    indication: 'Dry eye disease (DED)',
    review_type: 'standard',
    designation: ['Fast Track'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'CRL',
    notes: 'FDA issued third Complete Response Letter (CRL) on March 17, 2026. CRL cited lack of substantial evidence of efficacy — inconsistency of study results raises serious concerns about reliability. PDUFA was extended from Dec 2025 to March 16, 2026 after FDA requested clinical study report. No safety or manufacturing concerns identified. Second CRL was Nov 2023.',
    slug: 'reproxalap-aldx-dry-eye'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'setmelanotide',
    brand_name: 'IMCIVREE',
    company: 'Rhythm Pharmaceuticals',
    ticker: 'RYTM',
    cashtag: '$RYTM',
    pdufa_date: '2026-03-20',
    indication: 'Acquired hypothalamic obesity',
    review_type: 'standard',
    designation: ['Orphan Drug', 'Fast Track'],
    phase: 'sNDA',
    nda_bla_type: 'sNDA',
    status: 'approved',
    notes: 'FDA APPROVED March 19, 2026 — 1 day before PDUFA target date. First and only FDA-approved therapy for acquired hypothalamic obesity (HO) in adults and pediatric patients aged 4 years and older. Supported by Phase 3 TRANSCEND trial (n=142; 18.4% placebo-adjusted BMI reduction at 52 weeks). Broad label — not limited to tumor-related hypothalamic injury. IMCIVREE is also approved for other genetic obesity indications (POMC, PCSK1, LEPR deficiency, BBS, LIPA deficiency). EMA CHMP adopted positive opinion for HO expansion on March 26, 2026. European Commission decision expected Q2 2026.',
    slug: 'imcivree-setmelanotide-hypothalamic-obesity'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'marnetegragene autotemcel (RP-L201)',
    brand_name: 'KRESLADI',
    company: 'Rocket Pharma',
    ticker: 'RCKT',
    cashtag: '$RCKT',
    pdufa_date: '2026-03-28',
    indication: 'Leukocyte adhesion deficiency-I (LAD-I)',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy', 'Orphan Drug', 'Rare Pediatric Disease'],
    phase: 'BLA',
    nda_bla_type: 'BLA',
    status: 'approved',
    notes: 'FDA APPROVED March 26, 2026 — accelerated approval, 2 days before PDUFA target date of March 28. First FDA-approved gene therapy for severe LAD-I due to biallelic ITGB2 variants without HLA-matched sibling donor. Rocket Pharma\'s first commercial product. Approved via RMAT pathway. Also received Rare Pediatric Disease Priority Review Voucher — Rocket plans to monetize the voucher for non-dilutive capital. "Minimal viable launch" planned; company priorities remain Danon disease and cardiovascular gene therapy pipeline.',
    slug: 'kresladi-rp-l201-lad-i-rocket-pharma'
  },

  // === Q2 2026 (Apr–Jun) ===

  // NEW — Denali Therapeutics tividenofusp alfa (sub-$4B cap, Hunter Syndrome MPS II)
  {
    catalyst_type: 'pdufa',
    drug_name: 'tividenofusp alfa-eknm',
    brand_name: 'AVLAYAH',
    company: 'Denali Therapeutics',
    ticker: 'DNLI',
    cashtag: '$DNLI',
    pdufa_date: '2026-04-05',
    indication: 'Hunter syndrome (MPS II) — neurologic manifestations',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy', 'Rare Pediatric Disease', 'Orphan Drug'],
    phase: 'BLA',
    nda_bla_type: 'BLA',
    status: 'approved',
    notes: 'FDA APPROVED March 25, 2026 — accelerated approval, 11 days before PDUFA target date of April 5. First FDA-approved biologic engineered to cross the blood-brain barrier using Denali\'s TransportVehicle™ (TV) platform (targets transferrin receptor). First enzyme replacement therapy that reaches both the body and the brain for Hunter syndrome. Supported by Phase 1/2 data published in NEJM. Also received Rare Pediatric Disease Priority Review Voucher. Market cap ~$3.1B (sub-$7B). Launch planned within weeks of approval via Denali Patient Services. Next catalyst: BIIB122/DNL151 (LRRK2 inhibitor for Parkinson\'s) in Phase 3 with Biogen.',
    slug: 'avlayah-tividenofusp-dnli-hunter-syndrome'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'Orca-T',
    brand_name: null,
    company: 'Orca Bio',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-07-06',
    indication: 'AML, ALL, MDS — allogeneic cell therapy for hematologic malignancies',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy'],
    phase: 'BLA',
    nda_bla_type: 'BLA',
    status: 'upcoming',
    notes: 'FDA extended BLA review on April 1, 2026 — new PDUFA target action date is July 6, 2026 (extension from April 6, 2026). Extension was requested to allow FDA additional time to review updated Chemistry, Manufacturing, and Controls (CMC) data submitted by Orca Bio. Investigational allogeneic T-cell therapy for AML, ALL, and MDS. Phase 3 Precision-T trial showed significantly higher cGVHD-free survival vs standard allo-HSCT. First-in-class high-precision cell therapy.',
    slug: 'orca-t-orca-bio-aml-all-mds'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'orforglipron',
    brand_name: 'Foundayo',
    company: 'Eli Lilly',
    ticker: 'LLY',
    cashtag: '$LLY',
    pdufa_date: '2026-04-10',
    indication: 'Obesity / overweight (oral GLP-1 receptor agonist — once-daily pill)',
    review_type: 'priority',
    designation: ['Priority Review', 'Fast Track', 'Breakthrough Therapy'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'approved',
    notes: 'FDA APPROVED April 1, 2026 as Foundayo (orforglipron) under Commissioner\'s National Priority Voucher (CNPV) program — 294 days before standard PDUFA date of January 20, 2027. Fastest NME approval since 2002. Lilly\'s second obesity medicine after tirzepatide (Zepbound). First oral non-peptide GLP-1 agonist — no food/water restrictions, can be taken any time of day. Four positive Phase 3 ATTAIN trials. Self-pay: $149-$349/month; $25/month with commercial insurance savings card.',
    slug: 'orforglipron-lilly-oral-glp1-obesity'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'imetelstat',
    brand_name: 'Rytelo',
    company: 'Geron Corporation',
    ticker: 'GERN',
    cashtag: '$GERN',
    pdufa_date: '2026-04-15',
    indication: 'Myelodysplastic syndromes (MDS) — low to intermediate risk',
    review_type: 'priority',
    designation: ['Priority Review', 'Fast Track', 'Orphan Drug'],
    phase: 'sBLA',
    nda_bla_type: 'sBLA',
    status: 'upcoming',
    notes: 'Supplemental BLA for MDS label expansion. First telomerase inhibitor. Rytelo generated $183.6M FY2025 net product revenue; 2026 guidance $220M–$240M. IMpactMF Phase 3 trial in myelofibrosis ongoing — interim OS analysis expected 2H 2026.',
    slug: 'imetelstat-rytelo-gern-mds'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'lazertinib + amivantamab-vmjw',
    brand_name: 'Lazcluze + Rybrevant',
    company: 'Johnson & Johnson',
    ticker: 'JNJ',
    cashtag: '$JNJ',
    pdufa_date: '2026-04-20',
    indication: 'EGFR-mutated NSCLC — first-line treatment',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy'],
    phase: 'sNDA',
    nda_bla_type: 'sNDA',
    status: 'upcoming',
    notes: 'First-line combination for EGFR-mutated non-small cell lung cancer. MARIPOSA trial data.',
    slug: 'lazertinib-amivantamab-egfr-nsclc-jnj'
  },

  // NEW — Viridian Therapeutics veligrotug (sub-$7B cap, TED)
  {
    catalyst_type: 'pdufa',
    drug_name: 'veligrotug',
    brand_name: null,
    company: 'Viridian Therapeutics',
    ticker: 'VRDN',
    cashtag: '$VRDN',
    pdufa_date: '2026-06-30',
    indication: 'Thyroid eye disease (TED) — chronic, active',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy'],
    phase: 'BLA',
    nda_bla_type: 'BLA',
    status: 'upcoming',
    notes: 'BLA accepted January 2026. PDUFA June 30, 2026. Positive Phase 3 THRIVE and THRIVE-2 trials — first Phase 3 trials to demonstrate diplopia response and resolution in chronic TED. Veligrotug is an anti-FcRn antibody administered every 3 weeks IV. Competitor to Tepezza (teprotumumab). Sub-$7B cap.',
    slug: 'veligrotug-vrdn-thyroid-eye-disease'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'cendakimab',
    brand_name: null,
    company: 'AbbVie / Arena Pharma',
    ticker: 'ABBV',
    cashtag: '$ABBV',
    pdufa_date: '2026-06-08',
    indication: 'Eosinophilic esophagitis (EoE)',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'upcoming',
    notes: 'Oral IL-13 receptor inhibitor for EoE. First oral targeted therapy for this condition.',
    slug: 'cendakimab-abbv-eosinophilic-esophagitis'
  },

  // === Q3 2026 (Jul–Sep) ===

  // NEW — Vera Therapeutics atacicept (sub-$7B cap, IgAN)
  {
    catalyst_type: 'pdufa',
    drug_name: 'atacicept',
    brand_name: null,
    company: 'Vera Therapeutics',
    ticker: 'VERA',
    cashtag: '$VERA',
    pdufa_date: '2026-07-07',
    indication: 'IgA nephropathy (IgAN)',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy'],
    phase: 'BLA',
    nda_bla_type: 'BLA',
    status: 'upcoming',
    notes: 'BLA submitted via Accelerated Approval Program. FDA granted Priority Review January 2026. PDUFA July 7, 2026. ORIGIN Phase 3 data: 46% reduction in proteinuria from baseline; 42% reduction vs placebo (p<0.0001) at week 36. Would be first B-cell modulator targeting both BAFF and APRIL for IgAN. Sub-$7B cap.',
    slug: 'atacicept-vera-igan-nephropathy'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'mirdametinib',
    brand_name: null,
    company: 'SpringWorks Therapeutics',
    ticker: 'SWTX',
    cashtag: '$SWTX',
    pdufa_date: '2026-07-10',
    indication: 'NF1-associated plexiform neurofibromas (NF1-PN)',
    review_type: 'priority',
    designation: ['Priority Review', 'Orphan Drug', 'Rare Pediatric Disease'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'upcoming',
    notes: 'MEK inhibitor for NF1-associated tumors. ReNeu trial data in adults and pediatric patients.',
    slug: 'mirdametinib-swtx-nf1-neurofibromas'
  },
  // NEW — Celcuity gedatolisib (sub-$2B cap, HR+/HER2- breast cancer)
  {
    catalyst_type: 'pdufa',
    drug_name: 'gedatolisib',
    brand_name: null,
    company: 'Celcuity',
    ticker: 'CELC',
    cashtag: '$CELC',
    pdufa_date: '2026-07-17',
    indication: 'HR+/HER2-/PIK3CA wild-type advanced breast cancer (2nd-line post CDK4/6i)',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy', 'Fast Track'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'upcoming',
    notes: 'NDA accepted under FDA Real-Time Oncology Review (RTOR) program — PDUFA July 17, 2026. Phase 3 VIKTORIA-1 PIK3CA WT cohort: gedatolisib triplet (+ palbociclib + fulvestrant) showed median PFS 9.3 vs 2.0 months (HR=0.24; p<0.0001), ORR 31.5%; doublet showed PFS 7.4 vs 2.0 months (HR=0.33). Results published in JCO March 9, 2026. PIK3CA mutant cohort data expected Q2 2026 (potential ASCO presentation). Celcuity hiring sales force Q2 2026 for pre-launch. If approved, first treatment specifically indicated for PIK3CA WT patients (~60% of 2L HR+ breast cancer, ~37,000 patients/year in US). Market cap ~$1.7B (sub-$7B). Pan-PI3K/mTOR inhibitor licensed from Pfizer.',
    slug: 'gedatolisib-celc-breast-cancer-pdufa'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'lecanemab',
    brand_name: 'Leqembi',
    company: 'Eisai / Biogen',
    ticker: 'BIIB',
    cashtag: '$BIIB',
    pdufa_date: '2026-07-25',
    indication: 'Subcutaneous formulation — early Alzheimer\'s disease',
    review_type: 'standard',
    designation: ['Accelerated Approval'],
    phase: 'sNDA',
    nda_bla_type: 'sNDA',
    status: 'upcoming',
    notes: 'Subcutaneous version of IV Leqembi for more convenient at-home dosing.',
    slug: 'leqembi-lecanemab-biib-alzheimers-subq'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'aficamten',
    brand_name: 'MYQORZO',
    company: 'Cytokinetics',
    ticker: 'CYTK',
    cashtag: '$CYTK',
    pdufa_date: '2025-12-26',
    indication: 'Obstructive hypertrophic cardiomyopathy (oHCM)',
    review_type: 'priority',
    designation: ['Priority Review', 'Fast Track', 'Breakthrough Therapy'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'approved',
    notes: 'FDA APPROVED December 19, 2025 — 7 days before PDUFA target date of December 26, 2025. MYQORZO is Cytokinetics\' first FDA-approved product. Cardiac myosin inhibitor — only the second of its class (alongside BMS Camzyos). SEQUOIA-HCM Phase 3 showed superiority over metoprolol. European Commission approved in February 2026. China NMPA approved December 17, 2025. Next catalyst: ACACIA-HCM readout (non-obstructive HCM) expected Q2 2026.',
    slug: 'aficamten-cytk-hcm'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'omilancor',
    brand_name: null,
    company: 'Landos Biopharma / Ji Xing',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-08-20',
    indication: 'Ulcerative colitis (UC)',
    review_type: 'standard',
    designation: ['Fast Track'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'upcoming',
    notes: 'Oral LANCL2 agonist. Phase 3 data demonstrated remission in moderate-to-severe UC.',
    slug: 'omilancor-ulcerative-colitis'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'zilebesiran',
    brand_name: null,
    company: 'Alnylam Pharmaceuticals',
    ticker: 'ALNY',
    cashtag: '$ALNY',
    pdufa_date: '2026-09-15',
    indication: 'Hypertension (RNA interference — twice-yearly injection)',
    review_type: 'priority',
    designation: ['Fast Track', 'Breakthrough Therapy'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'upcoming',
    notes: 'RNAi therapy reducing blood pressure with twice-yearly dosing. Potential paradigm shift in HTN treatment.',
    slug: 'zilebesiran-alny-hypertension-rnai'
  },

  // === Q4 2026 (Oct–Dec) ===
  {
    catalyst_type: 'pdufa',
    drug_name: 'pozelimab',
    brand_name: null,
    company: 'Regeneron',
    ticker: 'REGN',
    cashtag: '$REGN',
    pdufa_date: '2026-10-01',
    indication: 'VEXAS syndrome (complement C5 inhibitor)',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy', 'Orphan Drug'],
    phase: 'BLA',
    nda_bla_type: 'BLA',
    status: 'upcoming',
    notes: 'First targeted therapy for VEXAS — inflammatory disease caused by UBA1 mutations.',
    slug: 'pozelimab-regn-vexas-syndrome'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'donidalorsen',
    brand_name: null,
    company: 'KalVista Pharmaceuticals',
    ticker: 'KALV',
    cashtag: '$KALV',
    pdufa_date: '2026-10-20',
    indication: 'Hereditary angioedema (HAE) — on-demand oral treatment',
    review_type: 'priority',
    designation: ['Priority Review', 'Orphan Drug', 'Fast Track'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'upcoming',
    notes: 'First oral on-demand treatment for HAE attacks from KalVista\'s pipeline (distinct from EKTERLY/sebetralstat which launched in July 2025). ZENITH-1 and ZENITH-2 Phase 3 data. Note: EKTERLY (sebetralstat) is KalVista\'s already-approved HAE drug; donidalorsen is a separate NDA submission.',
    slug: 'donidalorsen-kalv-hereditary-angioedema'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'elebsiran',
    brand_name: null,
    company: 'Alnylam / Roche',
    ticker: 'ALNY',
    cashtag: '$ALNY',
    pdufa_date: '2026-11-10',
    indication: 'Hepatitis B virus (HBV) — functional cure combination therapy',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'upcoming',
    notes: 'RNAi therapy in combination with imdusiran targeting functional cure for chronic HBV.',
    slug: 'elebsiran-alny-hepatitis-b'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'suzetrigine',
    brand_name: 'Journavx',
    company: 'Vertex Pharmaceuticals',
    ticker: 'VRTX',
    cashtag: '$VRTX',
    pdufa_date: '2026-12-05',
    indication: 'Moderate-to-severe chronic lower back pain (NaV1.8 blocker)',
    review_type: 'standard',
    designation: ['Fast Track', 'Breakthrough Therapy'],
    phase: 'sNDA',
    nda_bla_type: 'sNDA',
    status: 'upcoming',
    notes: 'Supplemental NDA expanding Journavx to chronic pain following acute pain approval.',
    slug: 'journavx-suzetrigine-vrtx-chronic-back-pain'
  },

  // ==========================================================================
  // ADVISORY COMMITTEE MEETINGS (FDA AdCom)
  // ==========================================================================

  {
    catalyst_type: 'adcom',
    drug_name: 'aficamten',
    brand_name: 'MYQORZO',
    company: 'Cytokinetics',
    ticker: 'CYTK',
    cashtag: '$CYTK',
    pdufa_date: '2026-06-03',
    indication: 'Obstructive hypertrophic cardiomyopathy (oHCM)',
    review_type: 'standard',
    designation: ['Advisory Committee'],
    phase: 'NDA',
    nda_bla_type: null,
    status: 'approved',
    notes: 'AdCom was expected ~2 months before the original August 2026 PDUFA date. Drug was FDA approved December 19, 2025 (PDUFA date: Dec 26, 2025) — ahead of any AdCom. MYQORZO now commercial in US and approved in EU and China. No AdCom was ultimately needed.',
    slug: 'adcom-aficamten-cytk-hcm-2026'
  },
  {
    catalyst_type: 'adcom',
    drug_name: 'donidalorsen',
    brand_name: null,
    company: 'KalVista Pharmaceuticals',
    ticker: 'KALV',
    cashtag: '$KALV',
    pdufa_date: '2026-08-20',
    indication: 'Hereditary angioedema (HAE) — on-demand oral treatment',
    review_type: 'standard',
    designation: ['Advisory Committee'],
    phase: 'NDA',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'FDA Pulmonary-Allergy Drugs Advisory Committee meeting for donidalorsen NDA. AdCom expected ~2 months before October 2026 PDUFA date. ZENITH Phase 3 data to be reviewed.',
    slug: 'adcom-donidalorsen-kalv-hae-2026'
  },

  // ==========================================================================
  // CLINICAL TRIAL READOUTS (Phase 2/3 data releases)
  // All dates are estimated based on company guidance and trial timelines
  // ==========================================================================

  {
    catalyst_type: 'trial_readout',
    drug_name: 'zovegalisib (RLY-2608)',
    brand_name: null,
    company: 'Relay Therapeutics',
    ticker: 'RLAY',
    cashtag: '$RLAY',
    pdufa_date: '2026-05-15',
    indication: 'PIK3CA-mutant HR+/HER2- metastatic breast cancer',
    review_type: 'standard',
    designation: ['Phase 2', 'Fast Track', 'Breakthrough Therapy'],
    phase: 'Phase II',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'SERENA-PI3K trial Phase 2 readout. Previously called RLY-2608; renamed zovegalisib after FDA Breakthrough Therapy designation. Initial Phase 1/2 data at ESMO TAT March 16, 2026 (presented). Full Phase 2 readout at ASCO 2026 expected. Breast cancer triplet data and frontline Phase 3 plans also expected in 2026.',
    slug: 'rlay-rly2608-breast-cancer-phase2'
  },
  {
    catalyst_type: 'trial_readout',
    drug_name: 'rusfertide',
    brand_name: null,
    company: 'Protagonist Therapeutics',
    ticker: 'PTGX',
    cashtag: '$PTGX',
    pdufa_date: '2026-07-20',
    indication: 'Polycythemia vera (PV) — phlebotomy-dependent',
    review_type: 'standard',
    designation: ['Phase 3', 'Fast Track', 'Breakthrough Therapy'],
    phase: 'Phase III',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'REVIVE Phase 3 trial topline data expected H2 2026. Rusfertide is a hepcidin mimetic for polycythemia vera. Company guided H2 2026. NDA submission planned following positive data.',
    slug: 'ptgx-rusfertide-pv-phase3'
  },
  {
    catalyst_type: 'trial_readout',
    drug_name: 'batoclimab',
    brand_name: null,
    company: 'Immunovant',
    ticker: 'IMVT',
    cashtag: '$IMVT',
    pdufa_date: '2026-08-15',
    indication: 'Thyroid eye disease (TED)',
    review_type: 'standard',
    designation: ['Phase 3', 'Breakthrough Therapy'],
    phase: 'Phase III',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'FORTIFY Phase 3 trial data expected H2 2026. Batoclimab is an anti-FcRn antibody. Competitor to Tepezza. Immunovant\'s next-gen candidate IMVT-1402 is also in Phase 3 trials across 6 autoimmune indications. Immunovant fiscal year ends March 31 — next earnings update ~May/June 2026.',
    slug: 'imvt-batoclimab-ted-phase3'
  },
  {
    catalyst_type: 'trial_readout',
    drug_name: 'aleniglipron (GSBR-1290)',
    brand_name: null,
    company: 'Structure Therapeutics',
    ticker: 'GPCR',
    cashtag: '$GPCR',
    pdufa_date: '2026-03-16',
    indication: 'Obesity / overweight (oral GLP-1 receptor agonist)',
    review_type: 'standard',
    designation: ['Phase 2'],
    phase: 'Phase II',
    nda_bla_type: null,
    status: 'reported',
    notes: 'Phase 2 ACCESS II positive topline data released March 16, 2026. Aleniglipron (renamed from GSBR-1290) showed up to 16.3% weight loss at 44 weeks and 16.2% at 56 weeks. AE-related discontinuations reduced to just 2.0–3.4% using new 2.5mg starting dose (vs higher rates previously). No drug-induced liver injury or QTc prolongation in >625 participants. End-of-Phase 2 FDA Type B meeting planned Q2 2026; Phase 3 initiation on track for 2H 2026. Oral non-peptide GLP-1 agonist competing with Lilly orforglipron. Next catalyst: Phase 3 design confirmation at Type B meeting.',
    slug: 'gpcr-gsbr1290-obesity-phase2b'
  },
  {
    catalyst_type: 'trial_readout',
    drug_name: 'bezuclastinib',
    brand_name: null,
    company: 'Cogent Biosciences',
    ticker: 'COGT',
    cashtag: '$COGT',
    pdufa_date: '2026-06-15',
    indication: 'Advanced systemic mastocytosis (AdvSM)',
    review_type: 'standard',
    designation: ['Phase 2', 'Breakthrough Therapy', 'Orphan Drug'],
    phase: 'Phase II',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'APEX trial Phase 2 data. Bezuclastinib is a highly selective KIT D816V inhibitor for systemic mastocytosis. Expected presentation at a major oncology conference mid-2026. NDA filing planned following data.',
    slug: 'cogt-bezuclastinib-sm-phase2'
  },
  {
    catalyst_type: 'trial_readout',
    drug_name: 'zenocutuzumab',
    brand_name: null,
    company: 'Merus NV',
    ticker: 'MRUS',
    cashtag: '$MRUS',
    pdufa_date: '2026-06-01',
    indication: 'NRG1 fusion-positive NSCLC and pancreatic cancer',
    review_type: 'standard',
    designation: ['Phase 2', 'Breakthrough Therapy', 'Priority Review'],
    phase: 'Phase II',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'eNRGy Phase 2 data presentation expected Q2 2026. Zenocutuzumab (MCLA-128) is a HER2/HER3 bispecific antibody for NRG1 fusion+ cancers. Rolling BLA submission ongoing — NDA/BLA decision expected late 2026.',
    slug: 'mrus-zenocutuzumab-nrg1-phase2'
  },
  {
    catalyst_type: 'trial_readout',
    drug_name: 'BT8009',
    brand_name: null,
    company: 'Bicycle Therapeutics',
    ticker: 'BCYC',
    cashtag: '$BCYC',
    pdufa_date: '2026-09-01',
    indication: 'Metastatic urothelial carcinoma (Nectin-4 targeted)',
    review_type: 'standard',
    designation: ['Phase 2', 'Fast Track'],
    phase: 'Phase II',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'DUET-2 Phase 2 trial data expected Q3 2026. BT8009 is a Nectin-4–targeted Bicycle Toxin Conjugate (BTC) — differentiated from ADCs with potentially improved tumor penetration in bladder cancer.',
    slug: 'bcyc-bt8009-bladder-cancer-phase2'
  },
  {
    catalyst_type: 'trial_readout',
    drug_name: 'ifinatamab deruxtecan',
    brand_name: null,
    company: 'Daiichi Sankyo / Merck',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-05-30',
    indication: 'Small cell lung cancer (SCLC) — B7-H3 ADC',
    review_type: 'standard',
    designation: ['Phase 2', 'Priority Review', 'Breakthrough Therapy'],
    phase: 'Phase II',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'IDeate-Lung01 Phase 2 trial data expected for presentation at ASCO 2026. Ifinatamab deruxtecan (I-DXd) is a B7-H3–targeted ADC with significant activity in SCLC, where treatment options remain limited.',
    slug: 'idxd-ifinatamab-sclc-phase2'
  },

  // ==========================================================================
  // SCIENTIFIC CONFERENCES (Major Biotech Catalyst Events)
  // ==========================================================================

  {
    catalyst_type: 'conference',
    drug_name: 'ACC Scientific Sessions 2026',
    brand_name: null,
    company: 'American College of Cardiology',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-03-28',
    indication: 'Cardiology — Chicago, IL',
    review_type: 'standard',
    designation: ['Major Conference'],
    phase: null,
    nda_bla_type: null,
    status: 'completed',
    notes: 'ACC Scientific Sessions 2026: March 28–30, Chicago. Conference completed. Key presentations included: MYQORZO (aficamten) real-world commercial launch data and early market uptake vs Camzyos; ACACIA-HCM (non-obstructive HCM) interim data from Cytokinetics. MAPLE-HCM sNDA review timeline reaffirmed for Q4 2026 PDUFA.',
    slug: 'acc-scientific-sessions-2026'
  },
  {
    catalyst_type: 'conference',
    drug_name: 'AACR Annual Meeting 2026',
    brand_name: null,
    company: 'American Association for Cancer Research',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-04-17',
    indication: 'Oncology / Cancer Research — San Diego, CA',
    review_type: 'standard',
    designation: ['Major Conference'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'AACR Annual Meeting 2026: April 17–22, San Diego Convention Center, San Diego, CA. Educational sessions April 17–18; scientific sessions April 19–22. Major oncology catalyst event with late-breaking and clinical trial abstract texts released April 17. Key data presentations in immuno-oncology, targeted therapies, ADCs, and early-stage IO combinations. Watch for abstracts on bispecifics, RAS pathway inhibitors, and novel tumor microenvironment data.',
    slug: 'aacr-annual-meeting-2026'
  },
  {
    catalyst_type: 'conference',
    drug_name: 'ASCO Annual Meeting 2026',
    brand_name: null,
    company: 'American Society of Clinical Oncology',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-05-29',
    indication: 'Clinical Oncology — Chicago, IL',
    review_type: 'standard',
    designation: ['Major Conference'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'ASCO Annual Meeting 2026: May 29 – June 2, Chicago. Largest oncology conference globally — multiple Phase 3 readouts and pivotal trial presentations across all tumor types. Key presentations expected: zovegalisib (RLAY), ifinatamab deruxtecan (I-DXd), bezuclastinib (COGT). Late-breaking abstracts often move stocks significantly.',
    slug: 'asco-annual-meeting-2026'
  },
  {
    catalyst_type: 'conference',
    drug_name: 'EHA Congress 2026',
    brand_name: null,
    company: 'European Hematology Association',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-06-11',
    indication: 'Hematology / Blood Cancers — Barcelona, Spain',
    review_type: 'standard',
    designation: ['Major Conference'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'EHA Congress 2026: June 11–14, Barcelona. Premier hematology conference for MDS, AML, myeloma, lymphoma, and MPN data. Watch for Geron (GERN), SpringWorks (SWTX), and Alnylam (ALNY) presentations.',
    slug: 'eha-congress-2026'
  },
  {
    catalyst_type: 'conference',
    drug_name: 'ESMO Annual Congress 2026',
    brand_name: null,
    company: 'European Society for Medical Oncology',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-10-23',
    indication: 'Oncology / Cancer — Madrid, Spain',
    review_type: 'standard',
    designation: ['Major Conference'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'ESMO Annual Congress 2026: October 23–27, IFEMA Madrid, Madrid, Spain. Major European oncology conference. Congress Presidents: Fabrice André, Yelena Janjigian, James Larkin. Late-breaking Phase 3 survival data and updates on approved therapies. Key event for IO, ADC, and precision oncology data across all tumor types.',
    slug: 'esmo-annual-congress-2026'
  },
  {
    catalyst_type: 'conference',
    drug_name: 'ASH Annual Meeting 2026',
    brand_name: null,
    company: 'American Society of Hematology',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-12-12',
    indication: 'Hematology — New Orleans, LA',
    review_type: 'standard',
    designation: ['Major Conference'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'ASH Annual Meeting 2026: December 12–15, Ernest N. Morial Convention Center, New Orleans, LA. Premier hematology conference — key data for sickle cell disease, AML, MDS, myeloma, and MPN drugs. Watch for Geron (imetelstat/Rytelo), Rocket Pharma (KRESLADI), and Alnylam data.',
    slug: 'ash-annual-meeting-2026'
  },

  // ==========================================================================
  // QUARTERLY EARNINGS
  // Q4 2025 results (already reported Feb–Mar 2026) + Q1 2026 upcoming
  // ==========================================================================

  // ---- Q4 2025 EARNINGS — ALREADY REPORTED ----

  {
    catalyst_type: 'earnings',
    drug_name: 'Cytokinetics Q4 2025 Earnings',
    brand_name: null,
    company: 'Cytokinetics',
    ticker: 'CYTK',
    cashtag: '$CYTK',
    pdufa_date: '2026-02-27',
    indication: 'Q4 2025 earnings + MYQORZO commercial launch update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'reported',
    notes: 'Q4 2025 earnings reported February 27, 2026. Q4 revenue $17.8M (FY2025 $88.0M including $52.4M Bayer tech transfer). Net loss Q4 $183M (-$1.50/sh). Year-end cash ~$1.22B. MYQORZO FDA approved Dec 19 2025; launched Jan 2026. Key updates: ACACIA-HCM (non-obstructive) readout expected Q2 2026; MAPLE-HCM sNDA review expected by Q4 2026.',
    slug: 'earnings-cytk-q4-2025'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Protagonist Therapeutics Q4 2025 Earnings',
    brand_name: null,
    company: 'Protagonist Therapeutics',
    ticker: 'PTGX',
    cashtag: '$PTGX',
    pdufa_date: '2026-02-25',
    indication: 'Q4 2025 earnings + rusfertide REVIVE Phase 3 update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'reported',
    notes: 'Q4 2025 earnings reported February 25, 2026. Key milestones: REVIVE Phase 3 trial in polycythemia vera ongoing — data expected H2 2026. Rusfertide hepcidin mimetic program on track.',
    slug: 'earnings-ptgx-q4-2025'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Relay Therapeutics Q4 2025 Earnings',
    brand_name: null,
    company: 'Relay Therapeutics',
    ticker: 'RLAY',
    cashtag: '$RLAY',
    pdufa_date: '2026-02-26',
    indication: 'Q4 2025 earnings + zovegalisib SERENA-PI3K update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'reported',
    notes: 'Q4 2025 earnings reported February 26, 2026. Cash: ~$555M at end of Q4 2025. RLY-2608 renamed to zovegalisib following Breakthrough Therapy designation. Initial Phase 1/2 data at ESMO TAT March 16, 2026. Full SERENA-PI3K Phase 2 readout expected H1 2026 (ASCO). Breast cancer triplet data and Phase 3 plans expected 2026.',
    slug: 'earnings-rlay-q4-2025'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Geron Corporation Q4 2025 Earnings',
    brand_name: null,
    company: 'Geron Corporation',
    ticker: 'GERN',
    cashtag: '$GERN',
    pdufa_date: '2026-02-25',
    indication: 'Q4 2025 earnings + RYTELO Rytelo commercial update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'reported',
    notes: 'Q4 2025 earnings reported February 25, 2026. RYTELO Q4 revenue $48.0M (FY2025 $183.6M). 2026 revenue guidance $220M–$240M. Cash $401M. IMpactMF Phase 3 in myelofibrosis — interim OS analysis expected 2H 2026. sBLA for MDS label expansion PDUFA April 15, 2026.',
    slug: 'earnings-gern-q4-2025'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Cogent Biosciences Q4 2025 Earnings',
    brand_name: null,
    company: 'Cogent Biosciences',
    ticker: 'COGT',
    cashtag: '$COGT',
    pdufa_date: '2026-02-25',
    indication: 'Q4 2025 earnings + bezuclastinib APEX trial update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'reported',
    notes: 'Q4 2025 earnings reported February 25, 2026. EPS -$0.61 (missed estimate of -$0.51). Net loss Q4 $102.5M. Update on bezuclastinib APEX Phase 2 trial in advanced systemic mastocytosis — data readout expected mid-2026.',
    slug: 'earnings-cogt-q4-2025'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Rhythm Pharmaceuticals Q4 2025 Earnings',
    brand_name: null,
    company: 'Rhythm Pharmaceuticals',
    ticker: 'RYTM',
    cashtag: '$RYTM',
    pdufa_date: '2026-02-26',
    indication: 'Q4 2025 earnings + IMCIVREE acquired HO PDUFA update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'reported',
    notes: 'Q4 2025 earnings reported February 26, 2026. IMCIVREE Q4 revenue $57.3M (FY2025 $194.8M, +50% YoY). FDA PDUFA March 20, 2026 for acquired hypothalamic obesity (sNDA). EMA CHMP opinion expected Q2 2026. Phase 3 EMANATE topline data expected Q1 2026.',
    slug: 'earnings-rytm-q4-2025'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Bicycle Therapeutics Q4 2025 Earnings',
    brand_name: null,
    company: 'Bicycle Therapeutics',
    ticker: 'BCYC',
    cashtag: '$BCYC',
    pdufa_date: '2026-03-10',
    indication: 'Q4 2025 earnings + BT8009 DUET-2 update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'reported',
    notes: 'Q4 2025 earnings reported March 10, 2026. Update on BT8009 DUET-2 Phase 2 trial in metastatic urothelial carcinoma — data expected Q3 2026.',
    slug: 'earnings-bcyc-q4-2025'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Rocket Pharma Q4 2025 Earnings',
    brand_name: null,
    company: 'Rocket Pharma',
    ticker: 'RCKT',
    cashtag: '$RCKT',
    pdufa_date: '2026-03-05',
    indication: 'Q4 2025 earnings + KRESLADI PDUFA preparation update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'reported',
    notes: 'Q4 2025 earnings reported ~March 2026. Key catalyst: KRESLADI BLA PDUFA March 28, 2026 for LAD-I gene therapy — would be company\'s first approved product.',
    slug: 'earnings-rckt-q4-2025'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Travere Therapeutics Q4 2025 Earnings',
    brand_name: null,
    company: 'Travere Therapeutics',
    ticker: 'TVTX',
    cashtag: '$TVTX',
    pdufa_date: '2026-02-27',
    indication: 'Q4 2025 earnings + FILSPARI commercial + FSGS PDUFA update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'reported',
    notes: 'Q4 2025 earnings reported ~February 27, 2026. Record Q4 FILSPARI demand: 908 new patient starts in IgAN. FY2025 revenue $490.73M (+110% YoY). FSGS sNDA PDUFA extended to April 13, 2026 after major amendment in January 2026.',
    slug: 'earnings-tvtx-q4-2025'
  },

  // ---- Q1 2026 EARNINGS — UPCOMING ----

  {
    catalyst_type: 'earnings',
    drug_name: 'Cytokinetics Q1 2026 Earnings',
    brand_name: null,
    company: 'Cytokinetics',
    ticker: 'CYTK',
    cashtag: '$CYTK',
    pdufa_date: '2026-05-06',
    indication: 'Q1 2026 earnings + MYQORZO launch metrics + ACACIA-HCM update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'Q1 2026 earnings expected May 6, 2026. First full quarter of MYQORZO commercial launch. Key data: market share vs BMS Camzyos, patient uptake, reimbursement access. ACACIA-HCM (non-obstructive HCM) readout expected Q2 2026.',
    slug: 'earnings-cytk-q1-2026'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Cogent Biosciences Q1 2026 Earnings',
    brand_name: null,
    company: 'Cogent Biosciences',
    ticker: 'COGT',
    cashtag: '$COGT',
    pdufa_date: '2026-05-05',
    indication: 'Q1 2026 earnings + bezuclastinib APEX data timeline',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'Q1 2026 earnings expected May 5, 2026. Critical update on bezuclastinib APEX Phase 2 in advanced systemic mastocytosis — data readout expected mid-2026 (potential ASCO/EHA presentation).',
    slug: 'earnings-cogt-q1-2026'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Protagonist Therapeutics Q1 2026 Earnings',
    brand_name: null,
    company: 'Protagonist Therapeutics',
    ticker: 'PTGX',
    cashtag: '$PTGX',
    pdufa_date: '2026-05-08',
    indication: 'Q1 2026 earnings + rusfertide REVIVE Phase 3 data update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'Q1 2026 earnings call expected ~May 8, 2026. Key update on rusfertide REVIVE Phase 3 trial in polycythemia vera — topline data expected H2 2026. Will confirm or adjust timeline.',
    slug: 'earnings-ptgx-q1-2026'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Relay Therapeutics Q1 2026 Earnings',
    brand_name: null,
    company: 'Relay Therapeutics',
    ticker: 'RLAY',
    cashtag: '$RLAY',
    pdufa_date: '2026-05-07',
    indication: 'Q1 2026 earnings + zovegalisib SERENA-PI3K data update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'Q1 2026 earnings expected ~May 2026. Expected to include Phase 2 data update from SERENA-PI3K trial — key readout before or at ASCO 2026 (May 29). Update on breast cancer triplet data and frontline Phase 3 timeline.',
    slug: 'earnings-rlay-q1-2026'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Geron Corporation Q1 2026 Earnings',
    brand_name: null,
    company: 'Geron Corporation',
    ticker: 'GERN',
    cashtag: '$GERN',
    pdufa_date: '2026-05-07',
    indication: 'Q1 2026 earnings + RYTELO commercial + sBLA update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'Q1 2026 earnings expected ~May 2026. Key updates: RYTELO Q1 revenue trajectory vs $220M–$240M guidance; MDS sBLA PDUFA April 15 outcome expected to be known; IMpactMF Phase 3 OS data update.',
    slug: 'earnings-gern-q1-2026'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Rhythm Pharmaceuticals Q1 2026 Earnings',
    brand_name: null,
    company: 'Rhythm Pharmaceuticals',
    ticker: 'RYTM',
    cashtag: '$RYTM',
    pdufa_date: '2026-05-08',
    indication: 'Q1 2026 earnings + acquired HO commercial launch update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'Q1 2026 earnings expected ~May 2026. IMCIVREE acquired HO PDUFA March 20, 2026 — if approved, Q1 earnings will include early launch data. EMA CHMP opinion expected Q2 2026. EMANATE Phase 3 topline data expected early 2026.',
    slug: 'earnings-rytm-q1-2026'
  },

  // ============================================================
  // REMOVED (data integrity):
  // - retatrutide ($LLY): No NDA filed as of March 2026. Phase 3 TRIUMPH trials still running.
  //   Earliest possible PDUFA: Q3-Q4 2027. Do not add until NDA acceptance confirmed.
  // - lifileucel ($IOVA) cervical cancer sBLA: No confirmed sBLA filing or PDUFA date.
  //   Amtagvi was approved for melanoma Feb 2024. Do not add until sBLA acceptance confirmed.
  // ============================================================

  // ==========================================================================
  // NEW PDUFA DATES — Q2–Q3 2026 expansion (added March 31, 2026)
  // Sources: company press releases, FDA.gov, globenewswire.com, biospace.com
  // ==========================================================================

  // === Q2 2026 — ADDITIONAL PDUFA dates not previously tracked ===

  {
    catalyst_type: 'pdufa',
    drug_name: 'dextromethorphan HBr / bupropion HCl (AXS-05)',
    brand_name: 'Auvelity (supplemental)',
    company: 'Axsome Therapeutics',
    ticker: 'AXSM',
    cashtag: '$AXSM',
    pdufa_date: '2026-04-30',
    indication: "Alzheimer's disease agitation",
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy'],
    phase: 'sNDA',
    nda_bla_type: 'sNDA',
    status: 'upcoming',
    notes: 'Supplemental NDA accepted with Priority Review. PDUFA April 30, 2026. AXS-05 (dextromethorphan HBr/bupropion HCl) is already FDA-approved as Auvelity for major depressive disorder. This sNDA expands the label to Alzheimer\'s disease agitation — supported by four randomized, double-blind, controlled Phase 3 clinical trials and a long-term safety study. First NMDA receptor antagonist/sigma-1 receptor agonist mechanism in AD agitation.',
    slug: 'axs-05-axsome-alzheimers-agitation'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'vepdegestrant (ARV-471)',
    brand_name: null,
    company: 'Arvinas / Pfizer',
    ticker: 'ARVN',
    cashtag: '$ARVN',
    pdufa_date: '2026-06-05',
    indication: 'ESR1-mutated ER+/HER2- advanced or metastatic breast cancer (2L+)',
    review_type: 'standard',
    designation: ['Fast Track'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'upcoming',
    notes: 'NDA accepted August 2025. PDUFA June 5, 2026. First-in-class PROTAC (PROteolysis TArgeting Chimera) ER degrader — the first PROTAC to reach NDA filing stage. Phase 3 VERITAC-2 trial showed 43% reduction in risk of disease progression or death vs fulvestrant in ESR1-mutated patients (HR 0.57; p<0.001). Developed jointly with Pfizer (50/50 cost/profit share). Targets a crowded oral SERD space alongside Lilly\'s approved Inluriyo, but PROTAC mechanism may differentiate. Market-moving binary event.',
    slug: 'vepdegestrant-arv471-arvn-breast-cancer'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'camizestrant (AZD9833)',
    brand_name: null,
    company: 'AstraZeneca',
    ticker: 'AZN',
    cashtag: '$AZN',
    pdufa_date: '2026-06-30',
    indication: 'HR+/HER2- advanced breast cancer — 1L with emergent ESR1 mutation (with CDK4/6 inhibitor)',
    review_type: 'standard',
    designation: ['Breakthrough Therapy'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'upcoming',
    notes: 'NDA 220359 under FDA review. PDUFA estimated ~June 30, 2026 (10-month standard review from ~August 2025 filing). ODAC review April 30, 2026 (AM session). SERENA-6 Phase 3: switching to camizestrant + CDK4/6i at ESR1 mutation emergence (before progression) reduced risk of disease progression/death by 56% (p<0.001). Novel mid-treatment "switch" design to intercept ESR1 resistance — potential new standard of care paradigm for 1-in-3 HR+ advanced breast cancer patients who develop ESR1 mutations during first-line treatment.',
    slug: 'camizestrant-azd9833-azn-breast-cancer-1l'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'capivasertib (Truqap) + abiraterone',
    brand_name: 'Truqap (supplemental)',
    company: 'AstraZeneca',
    ticker: 'AZN',
    cashtag: '$AZN',
    pdufa_date: '2026-06-30',
    indication: 'PTEN-deficient de novo metastatic hormone-sensitive prostate cancer (mHSPC) — with abiraterone + ADT',
    review_type: 'standard',
    designation: ['Breakthrough Therapy'],
    phase: 'sNDA',
    nda_bla_type: 'sNDA',
    status: 'upcoming',
    notes: 'sNDA 218197/S-004 under FDA review. PDUFA estimated ~June 30, 2026. ODAC review April 30, 2026 (PM session). Truqap already approved for HR+/HER2- breast cancer. CAPItello-281 Phase 3: capivasertib + abiraterone + ADT vs placebo + abiraterone + ADT in PTEN-deficient de novo mHSPC. Met primary endpoint with significantly improved rPFS (33.2 vs 25.7 months; HR 0.81; p=0.034). First biomarker-selected (PTEN deficiency) AKT inhibitor strategy in hormone-sensitive prostate cancer. Would expand Truqap into a second cancer indication.',
    slug: 'capivasertib-truqap-azn-mhspc-pten'
  },

  // === Q3 2026 — ADDITIONAL PDUFA dates ===

  {
    catalyst_type: 'pdufa',
    drug_name: 'denecimig (Mim8)',
    brand_name: null,
    company: 'Novo Nordisk',
    ticker: 'NVO',
    cashtag: '$NVO',
    pdufa_date: '2026-07-29',
    indication: 'Hemophilia A (with or without inhibitors) — monthly/biweekly/weekly subcutaneous prophylaxis',
    review_type: 'standard',
    designation: ['Fast Track'],
    phase: 'BLA',
    nda_bla_type: 'BLA',
    status: 'upcoming',
    notes: 'BLA submitted September 29, 2025. PDUFA estimated ~July 29, 2026 (10-month standard review). FVIIIa-mimetic bispecific antibody — competes with approved emicizumab (Hemlibra, Roche). FRONTIER Phase 3 program (FRONTIER1-5): evaluated across dosing schedules (once monthly, biweekly, weekly), age groups, and with/without inhibitors. Flexible subcutaneous pen injector with once-monthly dosing option — key differentiation vs emicizumab\'s Q1W/Q2W/Q4W dosing. Hemophilia A is a $10B+ global market.',
    slug: 'denecimig-mim8-novo-nordisk-hemophilia-a'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'ulixacaltamide (PRAX-944)',
    brand_name: null,
    company: 'Praxis Precision Medicines',
    ticker: 'PRAX',
    cashtag: '$PRAX',
    pdufa_date: '2026-08-17',
    indication: 'Essential tremor (ET) — first therapy specifically designed for ET',
    review_type: 'priority',
    designation: ['Breakthrough Therapy', 'Fast Track'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'upcoming',
    notes: 'NDA submitted ~mid-February 2026. PDUFA estimated ~August 17, 2026 (6-month priority review based on Breakthrough Therapy Designation; exact date TBC pending FDA acceptance announcement). Essential3 Phase 3 program demonstrated statistically significant and clinically meaningful improvement in activities of daily living vs placebo, with durability of response and added benefit on background therapy. Most common movement disorder: ~7 million US patients. No FDA-approved drugs specifically for ET currently exist — treatment is off-label beta-blockers/primidone. Peak revenue potential estimated >$10B. Sister program relutrigine (SCN2A/SCN8A DEEs, PDUFA Sept 27) also under review.',
    slug: 'ulixacaltamide-prax944-prax-essential-tremor'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'deramiocel',
    brand_name: null,
    company: 'Capricor Therapeutics',
    ticker: 'CAPR',
    cashtag: '$CAPR',
    pdufa_date: '2026-08-22',
    indication: 'Duchenne muscular dystrophy (DMD) cardiomyopathy',
    review_type: 'standard',
    designation: ['Orphan Drug', 'Rare Pediatric Disease', 'Fast Track'],
    phase: 'BLA',
    nda_bla_type: 'BLA',
    status: 'upcoming',
    notes: 'BLA Class 2 resubmission. PDUFA August 22, 2026. FDA lifted prior CRL and resumed review after Capricor submitted HOPE-3 clinical trial data and supporting documentation in March 2026. Deramiocel is a cardiosphere-derived cell therapy. Company expects to be eligible for a Priority Review Voucher (PRV) upon potential approval — PRV currently worth ~$100M+. DMD cardiomyopathy is the leading cause of death in DMD patients. Sub-$500M market cap binary event.',
    slug: 'deramiocel-capr-dmd-cardiomyopathy'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'ropeginterferon alfa-2b-njft',
    brand_name: 'BESREMi (supplemental)',
    company: 'PharmaEssentia',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-08-30',
    indication: 'Essential thrombocythemia (ET) — label expansion from polycythemia vera',
    review_type: 'standard',
    designation: ['Orphan Drug'],
    phase: 'sBLA',
    nda_bla_type: 'sBLA',
    status: 'upcoming',
    notes: 'sBLA PDUFA August 30, 2026 (standard review). BESREMi is already FDA-approved for polycythemia vera (PV). sBLA supported by Phase 3 SURPASS-ET trial and confirmatory EXCEED-ET Phase 2b data. Essential thrombocythemia is a rare MPN driven by platelet overproduction — no new FDA-approved therapies for over 20 years. NCCN guidelines already include ropeginterferon for ET treatment. PharmaEssentia listed on Taiwan Stock Exchange (TWSE: 6446) — no US ticker.',
    slug: 'besremi-ropeginterferon-pharmaessentia-et'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'relutrigine',
    brand_name: null,
    company: 'Praxis Precision Medicines',
    ticker: 'PRAX',
    cashtag: '$PRAX',
    pdufa_date: '2026-09-27',
    indication: 'SCN2A- and SCN8A-related developmental and epileptic encephalopathies (DEEs)',
    review_type: 'priority',
    designation: ['Priority Review', 'Breakthrough Therapy', 'Orphan Drug', 'Rare Pediatric Disease'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'upcoming',
    notes: 'NDA accepted with Priority Review. PDUFA September 27, 2026 (confirmed by FDA March 30, 2026). EMBOLD registrational cohort data: relutrigine demonstrated 46–53% placebo-adjusted seizure reductions in SCN2A/SCN8A-DEEs. NaV1.6/NaV1.2 sodium channel inhibitor — precision target for gain-of-function mutations in these rare pediatric epilepsies. Second NDA from Praxis alongside ulixacaltamide (ET). EMERALD Phase 3 in broader DEEs also ongoing. Rare Pediatric Disease designation makes company eligible for PRV.',
    slug: 'relutrigine-prax-scn2a-scn8a-dee'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'brepocitinib',
    brand_name: null,
    company: 'Priovant Therapeutics / Roivant Sciences',
    ticker: 'ROIV',
    cashtag: '$ROIV',
    pdufa_date: '2026-09-30',
    indication: 'Dermatomyositis (DM) — inflammatory myopathy',
    review_type: 'priority',
    designation: ['Priority Review', 'Orphan Drug', 'Breakthrough Therapy'],
    phase: 'NDA',
    nda_bla_type: 'NDA',
    status: 'upcoming',
    notes: 'NDA accepted with Priority Review. PDUFA Q3 2026 with launch expected end of September 2026 (company guidance, confirmed March 3, 2026). TYK2/JAK1 inhibitor. Dermatomyositis is a rare autoimmune inflammatory myopathy with no approved targeted therapies. Phase 3 clinical program supported the NDA. Brepocitinib is also in Phase 3 for non-infectious uveitis. Would be the first FDA-approved targeted therapy specifically for dermatomyositis.',
    slug: 'brepocitinib-roiv-dermatomyositis'
  },
  {
    catalyst_type: 'pdufa',
    drug_name: 'aficamten (MAPLE-HCM sNDA)',
    brand_name: 'MYQORZO (supplemental)',
    company: 'Cytokinetics',
    ticker: 'CYTK',
    cashtag: '$CYTK',
    pdufa_date: '2026-10-30',
    indication: 'Obstructive HCM — aficamten vs standard of care beta-blocker as monotherapy alternative',
    review_type: 'standard',
    designation: ['Fast Track'],
    phase: 'sNDA',
    nda_bla_type: 'sNDA',
    status: 'upcoming',
    notes: 'sNDA submitted Q1 2026. PDUFA estimated Q4 2026 (company guidance: "regulatory approval for sNDA for MAPLE-HCM expected by Q4 2026"). MAPLE-HCM Phase 3 demonstrated superiority of aficamten to standard of care beta-blocker (metoprolol) in improving peak exercise capacity (pVO2) in oHCM — positions MYQORZO as a first-line option rather than only add-on therapy. Significant label expansion opportunity. ACC 2026 data presentations included new MAPLE-HCM analyses on exercise capacity and treatment interruption flexibility.',
    slug: 'aficamten-cytk-maple-hcm-snda'
  },

  // ==========================================================================
  // NEW ADVISORY COMMITTEE MEETINGS — April 2026
  // Source: FDA.gov Advisory Committee Calendar (confirmed)
  // ==========================================================================

  {
    catalyst_type: 'adcom',
    drug_name: 'camizestrant (NDA 220359)',
    brand_name: null,
    company: 'AstraZeneca',
    ticker: 'AZN',
    cashtag: '$AZN',
    pdufa_date: '2026-04-30',
    indication: 'HR+/HER2- advanced breast cancer — first-line with emergent ESR1 mutation',
    review_type: 'standard',
    designation: ['Advisory Committee', 'ODAC'],
    phase: 'NDA',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'ODAC (Oncologic Drugs Advisory Committee) meeting April 30, 2026 — MORNING SESSION. First FDA cancer AdCom in roughly 9 months, ending a drought since July 2025. Committee will weigh NDA 220359 for camizestrant tablets in combination with a CDK4/6 inhibitor for 1L HR+/HER2- advanced breast cancer with emergent ESR1 mutation (SERENA-6 data). The novel "switch" trial design — enrolling mid-CDK4/6i treatment at ESR1 mutation emergence rather than at progression — is likely the key discussion point. PDUFA estimated June 2026.',
    slug: 'adcom-camizestrant-azn-breast-cancer-odac-2026'
  },
  {
    catalyst_type: 'adcom',
    drug_name: 'capivasertib (Truqap) + abiraterone (sNDA 218197/S-004)',
    brand_name: 'Truqap',
    company: 'AstraZeneca',
    ticker: 'AZN',
    cashtag: '$AZN',
    pdufa_date: '2026-04-30',
    indication: 'PTEN-deficient de novo metastatic hormone-sensitive prostate cancer (mHSPC)',
    review_type: 'standard',
    designation: ['Advisory Committee', 'ODAC'],
    phase: 'sNDA',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'ODAC (Oncologic Drugs Advisory Committee) meeting April 30, 2026 — AFTERNOON SESSION. Committee will review sNDA 218197/S-004 for Truqap (capivasertib) in combination with abiraterone acetate (Zytiga) for PTEN-deficient de novo mHSPC. CAPItello-281 Phase 3 met primary rPFS endpoint (33.2 vs 25.7 months; HR 0.81; p=0.034). First AKT inhibitor sNDA for prostate cancer. Truqap is already approved for HR+ breast cancer. PDUFA estimated June-July 2026.',
    slug: 'adcom-capivasertib-truqap-azn-mhspc-prostate-odac-2026'
  },

  // ==========================================================================
  // NEW PHASE 3 TRIAL READOUTS — Q2–Q3 2026
  // ==========================================================================

  {
    catalyst_type: 'trial_readout',
    drug_name: 'aficamten — ACACIA-HCM',
    brand_name: 'MYQORZO',
    company: 'Cytokinetics',
    ticker: 'CYTK',
    cashtag: '$CYTK',
    pdufa_date: '2026-06-15',
    indication: 'Non-obstructive hypertrophic cardiomyopathy (nHCM)',
    review_type: 'standard',
    designation: ['Phase 3', 'Breakthrough Therapy'],
    phase: 'Phase III',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'ACACIA-HCM Phase 3 topline readout expected Q2 2026 (company guidance confirmed multiple times, including Q4 2025 earnings Feb 24, 2026 and Citi Life Sciences Conference March 2026). 420-patient randomized, double-blind, placebo-controlled study evaluating health-related quality of life (KCCQ-23) in nHCM at 36 weeks. BMS Camzyos (mavacamten) recently failed in nHCM — making ACACIA a potential first targeted therapy for nHCM. Positive readout would double aficamten\'s addressable HCM market and support an sNDA for nHCM label expansion. Major binary event for CYTK.',
    slug: 'cytk-acacia-hcm-nhcm-phase3-readout'
  },
  {
    catalyst_type: 'trial_readout',
    drug_name: 'giredestrant + everolimus — persevERA',
    brand_name: null,
    company: 'Roche / Genentech',
    ticker: 'RHHBY',
    cashtag: '$RHHBY',
    pdufa_date: '2026-06-01',
    indication: 'ER+/HER2- first-line advanced breast cancer (1L)',
    review_type: 'standard',
    designation: ['Phase 3'],
    phase: 'Phase III',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'persevERA Phase 3 readout expected H1 2026 for giredestrant in first-line ER+/HER2- advanced breast cancer. Roche NDA for giredestrant + everolimus (ESR1-mutated post-CDK4/6 setting) already accepted with PDUFA December 18, 2026. persevERA data will inform whether giredestrant can expand into the frontline setting. Competing directly with camizestrant, imlunestrant, and other oral SERDs. Oral SERD class is the hottest breast cancer space for 2026.',
    slug: 'roche-giredestrant-persevera-phase3-1l-breast'
  },
  {
    catalyst_type: 'trial_readout',
    drug_name: 'imetelstat (Rytelo) — IMpactMF',
    brand_name: 'Rytelo',
    company: 'Geron Corporation',
    ticker: 'GERN',
    cashtag: '$GERN',
    pdufa_date: '2026-09-15',
    indication: 'Myelofibrosis (MF) — overall survival analysis',
    review_type: 'standard',
    designation: ['Phase 3', 'Orphan Drug'],
    phase: 'Phase III',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'IMpactMF Phase 3 interim overall survival (OS) analysis expected H2 2026 (company guidance). Phase 3 trial comparing imetelstat to best available therapy in transfusion-dependent patients with relapsed/refractory myelofibrosis who are JAK inhibitor-intolerant or progressed on JAK inhibitor. Positive OS data would support regulatory filings in myelofibrosis — a large potential new indication for Rytelo alongside its approved MDS indication. Geron MDS sBLA PDUFA April 15, 2026 will be decided before this readout.',
    slug: 'gern-imetelstat-impactmf-myelofibrosis-os'
  },
  {
    catalyst_type: 'trial_readout',
    drug_name: 'camizestrant — SERENA-4',
    brand_name: null,
    company: 'AstraZeneca',
    ticker: 'AZN',
    cashtag: '$AZN',
    pdufa_date: '2026-09-01',
    indication: 'HR+/HER2- advanced breast cancer — first-line (frontline, traditional design)',
    review_type: 'standard',
    designation: ['Phase 3'],
    phase: 'Phase III',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'SERENA-4 Phase 3 readout expected H2 2026 (Fierce Pharma). Traditional first-line design: camizestrant + Pfizer Ibrance (palbociclib) vs standard endocrine therapy + CDK4/6i in frontline HR+/HER2- advanced breast cancer. Distinct from SERENA-6 (the emergent ESR1 mutation "switch" design that supports the NDA under ODAC review April 30). If both SERENA-6 and SERENA-4 succeed, camizestrant could displace aromatase inhibitors as the dominant endocrine backbone for HR+ breast cancer.',
    slug: 'azn-camizestrant-serena4-phase3-frontline-breast'
  },
  {
    catalyst_type: 'trial_readout',
    drug_name: 'elegrobart (VRDN-003)',
    brand_name: null,
    company: 'Viridian Therapeutics',
    ticker: 'VRDN',
    cashtag: '$VRDN',
    pdufa_date: '2026-05-15',
    indication: 'Active thyroid eye disease (TED) — subcutaneous anti-FcRn antibody',
    review_type: 'standard',
    designation: ['Phase 3', 'Fast Track'],
    phase: 'Phase III',
    nda_bla_type: null,
    status: 'reported',
    notes: 'REVEAL-1 Phase 3 topline data POSITIVE (announced March 30, 2026): elegrobart (VRDN-003) met primary endpoint in active TED — significant proptosis reduction vs placebo. REVEAL-2 topline data expected Q2 2026. elegrobart is a subcutaneous next-generation anti-FcRn antibody for active TED — separate from IV veligrotug (PDUFA June 30, 2026). BLA submission for subQ elegrobart planned end of 2026. Successful REVEAL-1 + REVEAL-2 would set up Viridian with both IV and subcutaneous TED therapies. Company confirmed enrollment exceeded targets.',
    slug: 'vrdn-003-viridian-subq-ted-phase3'
  },

  // ==========================================================================
  // NEW CONFERENCES — Q2–Q3 2026
  // ==========================================================================

  {
    catalyst_type: 'conference',
    drug_name: 'AAN Annual Meeting 2026',
    brand_name: null,
    company: 'American Academy of Neurology',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-04-05',
    indication: 'Neurology — Los Angeles, CA',
    review_type: 'standard',
    designation: ['Major Conference'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'AAN Annual Meeting 2026: April 5–9, Los Angeles. Premier neurology conference. Watch for Praxis (PRAX) ulixacaltamide and relutrigine updates, Biogen/Eisai Leqembi real-world data, and early data in CNS precision medicine programs. Movement disorder and epilepsy data particularly relevant given upcoming PRAX PDUFA dates.',
    slug: 'aan-annual-meeting-2026'
  },
  {
    catalyst_type: 'conference',
    drug_name: 'ISTH Congress 2026',
    brand_name: null,
    company: 'International Society on Thrombosis and Haemostasis',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-06-22',
    indication: 'Hematology / Hemostasis — Singapore',
    review_type: 'standard',
    designation: ['Major Conference'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'ISTH Congress 2026: June 22–26, Singapore. Premier thrombosis and hemostasis conference. Key data expected for hemophilia A programs including denecimig (Mim8, Novo Nordisk) and updates on emicizumab long-term data. Relevant ahead of Mim8 PDUFA ~July 2026 and to compare patient/physician positioning of competing hemophilia prophylaxis approaches.',
    slug: 'isth-congress-2026'
  },
  {
    catalyst_type: 'conference',
    drug_name: 'ASCO Genitourinary Cancers Symposium 2026',
    brand_name: null,
    company: 'American Society of Clinical Oncology GU',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-02-26',
    indication: 'Genitourinary Oncology — San Francisco, CA',
    review_type: 'standard',
    designation: ['Major Conference'],
    phase: null,
    nda_bla_type: null,
    status: 'reported',
    notes: 'ASCO GU 2026: February 26–28, San Francisco. Key GU oncology data. CAPItello-281 capivasertib+abiraterone prostate cancer Phase 3 data presented here (ahead of ODAC April 30, 2026). Updates on PSMA-targeted therapies, checkpoint inhibitors in bladder cancer, and novel prostate cancer combinations.',
    slug: 'asco-gu-2026'
  },
  {
    catalyst_type: 'conference',
    drug_name: 'ESMO Breast Cancer Congress 2026',
    brand_name: null,
    company: 'European Society for Medical Oncology',
    ticker: null,
    cashtag: null,
    pdufa_date: '2026-05-14',
    indication: 'Breast Oncology — Berlin, Germany',
    review_type: 'standard',
    designation: ['Major Conference'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'ESMO Breast Cancer Congress 2026: May 14–17, Berlin. Premier breast cancer data conference. Key presentations expected: oral SERD class updates (camizestrant, giredestrant, vepdegestrant), CDK4/6 inhibitor resistance data, ADC updates for HER2-low and TROP-2 programs. Directly relevant to multiple active PDUFA dates tracked on this calendar.',
    slug: 'esmo-breast-cancer-congress-2026'
  },

  // ==========================================================================
  // NEW Q2 2026 EARNINGS — Additional tracked companies
  // ==========================================================================

  {
    catalyst_type: 'earnings',
    drug_name: 'Arvinas Q1 2026 Earnings',
    brand_name: null,
    company: 'Arvinas / Pfizer',
    ticker: 'ARVN',
    cashtag: '$ARVN',
    pdufa_date: '2026-05-07',
    indication: 'Q1 2026 earnings + vepdegestrant PDUFA June 5 preparation update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'Q1 2026 earnings expected ~May 7, 2026. Critical update ahead of June 5 vepdegestrant PDUFA date — commercial readiness, Pfizer partnership dynamics, label expectations. Also expected: update on ARV-766 (PROTAC AR degrader) for prostate cancer and broader pipeline.',
    slug: 'earnings-arvn-q1-2026'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Vera Therapeutics Q1 2026 Earnings',
    brand_name: null,
    company: 'Vera Therapeutics',
    ticker: 'VERA',
    cashtag: '$VERA',
    pdufa_date: '2026-05-08',
    indication: 'Q1 2026 earnings + atacicept PDUFA July 7 commercial preparation update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'Q1 2026 earnings expected ~May 8, 2026. Key updates: comercial launch preparations for atacicept (PDUFA July 7, 2026 for IgAN); cash runway guidance; manufacturing and supply chain readiness. Would be first commercial product for Vera. ORIGIN Phase 3 showed 46% proteinuria reduction vs placebo.',
    slug: 'earnings-vera-q1-2026'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Viridian Therapeutics Q1 2026 Earnings',
    brand_name: null,
    company: 'Viridian Therapeutics',
    ticker: 'VRDN',
    cashtag: '$VRDN',
    pdufa_date: '2026-05-06',
    indication: 'Q1 2026 earnings + veligrotug PDUFA preparation + VRDN-003 Phase 3 update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'Q1 2026 earnings expected ~May 6, 2026. Key updates: commercial readiness for veligrotug (PDUFA June 30, 2026 in TED); REVEAL-1 and REVEAL-2 Phase 3 data for subQ VRDN-003; cash position ($889M potential capital financing). Multiple near-term catalysts make VRDN a closely watched sub-$7B cap biotech.',
    slug: 'earnings-vrdn-q1-2026'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'SpringWorks Therapeutics Q1 2026 Earnings',
    brand_name: null,
    company: 'SpringWorks Therapeutics',
    ticker: 'SWTX',
    cashtag: '$SWTX',
    pdufa_date: '2026-05-06',
    indication: 'Q1 2026 earnings + mirdametinib PDUFA July 10 preparation update',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'Q1 2026 earnings expected ~May 6, 2026. Key update ahead of mirdametinib PDUFA July 10, 2026 (NF1-PN). Commercial build updates, manufacturing readiness. Mirdametinib (ReNeu Phase 3) would be first oral MEK inhibitor specifically for NF1-associated plexiform neurofibromas in adults and pediatric patients. Rare Pediatric Disease designation enables PRV eligibility.',
    slug: 'earnings-swtx-q1-2026'
  },
  {
    catalyst_type: 'earnings',
    drug_name: 'Praxis Precision Medicines Q1 2026 Earnings',
    brand_name: null,
    company: 'Praxis Precision Medicines',
    ticker: 'PRAX',
    cashtag: '$PRAX',
    pdufa_date: '2026-05-07',
    indication: 'Q1 2026 earnings + ulixacaltamide + relutrigine PDUFA updates',
    review_type: 'standard',
    designation: ['Earnings'],
    phase: null,
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'Q1 2026 earnings expected ~May 7, 2026. Dual NDA company with two drugs in FDA review simultaneously — highly unusual. Key updates: FDA acceptance and PDUFA date for ulixacaltamide (ET); relutrigine (DEEs) status update ahead of Sept 27 PDUFA; commercial build progress; $1.5B cash runway. Two potential launches in 2026 make PRAX a top-watched neuroscience name.',
    slug: 'earnings-prax-q1-2026'
  },

  // ==========================================================================
  // NEW ENTRIES — April 6, 2026 weekly refresh
  // ==========================================================================

  {
    catalyst_type: 'trial_readout',
    drug_name: 'annamycin + cytarabine (AnnAraC)',
    brand_name: null,
    company: 'Moleculin Biotech',
    ticker: 'MBRX',
    cashtag: '$MBRX',
    pdufa_date: '2026-06-30',
    indication: 'Relapsed/refractory AML — MIRACLE Phase 2B/3 interim readout',
    review_type: 'standard',
    designation: ['Phase 2B/3', 'Orphan Drug'],
    phase: 'Phase II/III',
    nda_bla_type: null,
    status: 'upcoming',
    notes: 'MIRACLE Phase 2B/3 trial interim readout expected mid-2026 (unblinding triggered after 45 subjects enrolled). 45th subject enrolled March 23, 2026 — interim now imminent. Annamycin is designed to overcome multidrug resistance in AML; AnnAraC = annamycin + cytarabine combination. Trial enrolling relapsed/refractory AML patients; primary endpoint: overall response rate. Sub-$100M market cap — positive interim data could be significant catalyst. Date is approximate (mid-2026).',
    slug: 'mbrx-annamycin-miracle-aml-phase2b3'
  },

  // ============================================================
  // REMOVED (data integrity):
  // - retatrutide ($LLY): No NDA filed as of March 2026. Phase 3 TRIUMPH trials still running.
  //   Earliest possible PDUFA: Q3-Q4 2027. Do not add until NDA acceptance confirmed.
  // - lifileucel ($IOVA) cervical cancer sBLA: No confirmed sBLA filing or PDUFA date.
  //   Amtagvi was approved for melanoma Feb 2024. Do not add until sBLA acceptance confirmed.
  // - apitegromab ($SRRK) SMA: BLA resubmission planned 2026 but no confirmed PDUFA date yet.
  //   CRL was due to manufacturing issues at Catalent site; no efficacy/safety concerns.
  //   Do not add until BLA resubmission accepted and PDUFA confirmed.
  // ============================================================
];

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Exiting.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log(`Seeding ${CATALYST_DATA.length} catalyst entries...`);

    let upserted = 0;
    for (const entry of CATALYST_DATA) {
      await client.query(`
        INSERT INTO pdufa_dates (
          catalyst_type, drug_name, brand_name, company, ticker, cashtag, pdufa_date,
          indication, review_type, designation, phase, nda_bla_type,
          filing_date, status, notes, slug, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
        ON CONFLICT (slug) DO UPDATE SET
          catalyst_type = EXCLUDED.catalyst_type,
          drug_name = EXCLUDED.drug_name,
          brand_name = EXCLUDED.brand_name,
          company = EXCLUDED.company,
          ticker = EXCLUDED.ticker,
          cashtag = EXCLUDED.cashtag,
          pdufa_date = EXCLUDED.pdufa_date,
          indication = EXCLUDED.indication,
          review_type = EXCLUDED.review_type,
          designation = EXCLUDED.designation,
          phase = EXCLUDED.phase,
          nda_bla_type = EXCLUDED.nda_bla_type,
          filing_date = EXCLUDED.filing_date,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          updated_at = NOW()
      `, [
        entry.catalyst_type || 'pdufa',
        entry.drug_name,
        entry.brand_name || null,
        entry.company,
        entry.ticker || null,
        entry.cashtag || null,
        entry.pdufa_date,
        entry.indication,
        entry.review_type,
        entry.designation || [],
        entry.phase || null,
        entry.nda_bla_type || null,
        entry.filing_date || null,
        entry.status || 'upcoming',
        entry.notes || null,
        entry.slug
      ]);
      upserted++;
    }

    // Count by catalyst type
    const typeCounts = {};
    CATALYST_DATA.forEach(e => {
      typeCounts[e.catalyst_type] = (typeCounts[e.catalyst_type] || 0) + 1;
    });
    console.log('✅ Seeded', upserted, 'catalyst entries:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Log the refresh
    await client.query(`
      INSERT INTO pdufa_refresh_log (source, records_upserted, status, notes)
      VALUES ('manual_seed', $1, 'success', 'v5 weekly refresh — April 6 2026: ORCA Orca-T PDUFA extended Jul 6, LLY orforglipron approved as Foundayo, AACR/ESMO/ASH conference dates corrected, VRDN elegrobart REVEAL-1 positive, NEW: MBRX annamycin MIRACLE interim readout added')
    `, [upserted]);

  } catch (err) {
    console.error('Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
