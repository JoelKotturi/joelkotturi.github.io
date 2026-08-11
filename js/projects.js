// ============================================================
//  YOUR PROJECTS LIST
// ============================================================
// This is the ONLY file you need to touch to add a new project.
// Just copy one whole { ... } block below, paste it into the list,
// and change the text/links. Save the file. That's it, no other
// code needs to change.
//
// Fields:
//   title       -> project name, shown as the card heading
//   tag         -> short category label (e.g. "Marketing Analytics")
//   description -> 1-2 sentences, shown under the title and at the
//                  top of the detail popup when someone taps the card
//   image       -> path to a cover picture in the assets/ folder
//                  (leave as "" to show a plain icon instead)
//   status      -> "live" (tapping opens the full detail popup) or
//                  "soon" (tapping just shows a short "coming soon" note)
//   detail      -> OPTIONAL. Everything shown in the popup when a
//                  "live" card is tapped: the method write-up, the
//                  interactive map, the results tables, the download
//                  buttons, and so on. Every field inside `detail` is
//                  itself optional, if you leave one out (say, you
//                  don't have a chart yet) that section just won't be
//                  shown. This is what lets you add a new project with
//                  as little or as much detail as you have ready.
// ============================================================

const projects = [
  {
    title: "Where Should WA Invest Its Next Community Resource Centre?",
    tag: "Public Sector · Optimization",
    description: "A facility-location model deciding where Western Australia should fund its next regional community centres, solved as a Mixed-Integer Program with an equity-weighted objective, using real Census, SEIFA and government infrastructure data.",
    image: "assets/project1-cover.png",
    status: "live",

    // Small stat tiles shown near the top of the popup, specific to
    // THIS project only (not the whole portfolio).
    metrics: [
      { value: 76, label: "Communities modeled" },
      { value: 100, label: "% coverage achieved" },
      { value: 7, label: "Sites recommended" }
    ],

    // Which skill chips (from the bio section below) this project actually
    // demonstrates. Used to power the "click a skill, see the projects that
    // used it" filter, keep this honest: only list a skill here if this
    // specific project really used it.
    skills: ["Python", "Data Analysis", "Statistics", "Excel"],

    detail: {
      tags: [
        "Mixed-Integer Programming",
        "Maximal Covering Location Problem",
        "Gravity / Spatial-Interaction Model",
        "Equity-Weighted Optimization",
        "Python · PuLP · CBC Solver",
        "GeoPandas · Folium"
      ],

      methodSummary: "Every WA SA2 (267 total) was cleaned down to 76 real regional communities: national parks, airports and industrial precincts with no population were excluded, and scope was restricted to areas outside Greater Perth, matching the CRC network's actual mandate. Population, SEIFA disadvantage, and Census volunteering rate combine into an equity-weighted demand score for each community. Distances (great-circle distance multiplied by a 1.3 road-circuity factor) connect every community to its nearest facility. The core model is a Maximal Covering Location Problem, a Mixed-Integer Program solved to full, provable optimality with the open-source CBC solver via PuLP, choosing which new sites to fund, alongside the 103 already-open CRCs, to maximize equity-weighted coverage within a 50km service radius. A real empirical check (correlation of -0.19 between distance to nearest CRC and volunteer rate, after a location-data fix described below) validated the gravity-model distance-decay logic against actual data before relying on it, honestly: it is a weak relationship, not a strong one, and this write-up says so rather than rounding it up.",

      // Real, working code pulled straight from the project notebook, trimmed
      // to the parts that matter and numbered so it reads as a story instead
      // of a wall of text. This is the actual code that produced the result,
      // not a summary of it.
      codeWalkthrough: [
        {
          title: "Load and clean the source data",
          note: "Bring in the Census, SEIFA and boundary files and set up the toolbox the rest of the notebook depends on.",
          code: `import pandas as pd
import numpy as np
import geopandas as gpd
from shapely.geometry import Point
import pulp
import folium
import matplotlib.pyplot as plt
from pathlib import Path

DATA_RAW = Path("../data/raw")
DATA_PROCESSED = Path("../data/processed")

print("Toolbox loaded OK. Versions:")
print("pandas:", pd.__version__, "| geopandas:", gpd.__version__, "| PuLP:", pulp.__version__)`
        },
        {
          title: "Clean the disadvantage index",
          note: "The SEIFA spreadsheet has its real headers on row 6 and a footer row with copyright text sitting in the code column. Both have to be handled before the numbers can be trusted.",
          code: `seifa_raw = pd.read_excel(
    DATA_RAW / "Statistical Area Level 2, Indexes, SEIFA 2021.xlsx",
    sheet_name="Table 2",  # Table 2 is IRSD, the disadvantage index
    header=5,              # the real column headers start on row 6 of the sheet
)
seifa_raw.columns = [
    'SA2_CODE_2021', 'SA2_NAME', 'usual_res_pop', 'irsd_score', '_blank1',
    'irsd_rank_aus', 'irsd_decile_aus', 'irsd_pctile_aus', '_blank2', 'state',
    'irsd_rank_state', 'irsd_decile_state', 'irsd_pctile_state',
    'min_sa1_score', 'max_sa1_score', 'pct_pop_no_sa1_score',
]

# Drop the footer row (its code column holds copyright text, not a number)
seifa_raw['SA2_CODE_2021'] = pd.to_numeric(seifa_raw['SA2_CODE_2021'], errors='coerce')
seifa = seifa_raw.dropna(subset=['SA2_CODE_2021']).copy()
seifa['SA2_CODE_2021'] = seifa['SA2_CODE_2021'].astype(int).astype(str)

seifa_wa = seifa[seifa['state'] == 'WA'][['SA2_CODE_2021', 'irsd_score', 'irsd_decile_aus']]`
        },
        {
          title: "Correct a real location error, in two passes",
          note: "A community's plain geometric centroid can sit a long way from where people actually live. Pass one snaps any SA2 whose name exactly matches a real Community Resource Centre town to that town's true coordinates. Pass one misses SA2s like 'Leinster - Leonora', whose name doesn't exactly equal the real 'Leonora' CRC sitting inside it, so pass two finds every real CRC that geographically falls inside a large SA2's own boundary and snaps to that instead. This second pass was added after a reviewer asked how well the geometric centroid actually represented a huge SA2 like East Pilbara, and it turned out the answer was: not well at all, 492km off.",
          code: `# Pass 1: snap centroids to the real CRC town wherever the SA2 name matches a CRC exactly
demand_points['name_key'] = demand_points['SA2_NAME'].str.replace(' (WA)', '', regex=False).str.strip().str.lower()
crc['name_key'] = crc['crc_name'].str.strip().str.lower()
crc_lookup = crc.set_index('name_key')[['lat', 'lon']].rename(columns={'lat': 'crc_lat', 'lon': 'crc_lon'})
demand_points = demand_points.merge(crc_lookup, on='name_key', how='left')
demand_points['correction_method'] = np.where(demand_points['crc_lat'].notna(), 'exact_name_match', 'none')

# Pass 2: for large SA2s (>5,000 sq km) pass 1 missed, snap to a real CRC that
# geographically sits inside that SA2's own boundary, preferring one whose name
# is part of the SA2's own name, falling back to the nearest one otherwise.
for _, row in large_uncorrected.iterrows():
    inside = gpd.sjoin(crc_gdf, sa2_boundary(row['SA2_CODE_2021']), predicate='within')
    best = pick_by_name_then_nearest(inside, row)
    demand_points.loc[row.name, ['lat', 'lon']] = [best['lat'], best['lon']]`
        },
        {
          title: "Calculate distance and validate the model's core assumption",
          note: "Every distance in the model comes from this function. Before trusting it, the notebook checks it against something real: does distance from a CRC actually predict lower volunteering, the way the model assumes it should?",
          code: `def haversine_km(lat1, lon1, lat2, lon2):
    """Great-circle distance in km between two lat/lon points (vectorized)."""
    R = 6371.0088
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))

CIRCUITY = 1.3  # real road km is about 1.3x straight line km, a standard rural transport geography estimate

corr = rest[['dist_to_nearest_crc_km', 'volunteer_rate']].corr().iloc[0, 1]
print(f"Correlation between distance to nearest CRC and volunteer rate: {corr:.3f}")`
        },
        {
          title: "Weight demand by equity",
          note: "Two communities with the same population are not the same priority. This turns disadvantage and low volunteering into a multiplier, so more disadvantaged places carry more weight in the optimization.",
          code: `irsd_min, irsd_max = rest['irsd_score'].min(), rest['irsd_score'].max()
vol_min, vol_max = rest['volunteer_rate'].min(), rest['volunteer_rate'].max()

rest['equity_irsd'] = 1 + 2 * (irsd_max - rest['irsd_score']) / (irsd_max - irsd_min)
rest['equity_vol'] = 1 + 2 * (vol_max - rest['volunteer_rate']) / (vol_max - vol_min)
rest['equity_multiplier'] = 0.5 * rest['equity_irsd'] + 0.5 * rest['equity_vol']
rest['weighted_demand'] = rest['population'] * rest['equity_multiplier']`
        },
        {
          title: "Solve the optimization model and sweep the budget",
          note: "The Maximal Covering Location Problem itself: choose which sites to open, subject to a budget, to cover as much equity-weighted demand as possible within 50km. Running it once per budget level from 0 to 25 produces the full coverage curve shown below.",
          code: `def solve_mclp(p, radius_km=50):
    prob = pulp.LpProblem("MCLP", pulp.LpMaximize)
    x = pulp.LpVariable.dicts("open", candidate_sites, cat="Binary")
    y = pulp.LpVariable.dicts("covered", demand_ids, cat="Binary")

    prob += pulp.lpSum(weighted_demand[i] * y[i] for i in demand_ids)
    prob += pulp.lpSum(x[j] for j in candidate_sites) <= p

    for i in demand_ids:
        prob += y[i] <= pulp.lpSum(x[j] for j in candidate_sites if dist[i][j] <= radius_km)

    prob.solve(pulp.PULP_CBC_CMD(msg=0))
    chosen = [j for j in candidate_sites if x[j].value() == 1]
    return chosen, pulp.value(prob.objective)

for p in range(0, 26):
    chosen, coverage = solve_mclp(p)
    print(f"Budget {p}: {len(chosen)} sites open, coverage {coverage:.1f}")`
        }
      ],

      mapHref: "assets/wa_engagement_map.html",
      legend: [
        { color: "#1baf7a", label: "Already covered" },
        { color: "#2a78d6", label: "Phase 1 recommended (5 sites)" },
        { color: "#eb6834", label: "Full-rollout recommended (2 more)" },
        { color: "#383835", label: "Existing CRC", square: true }
      ],

      chartImage: "assets/budget_sensitivity_chart.png",
      chartCaption: "Five facilities capture most of the gap (69.9% to 98.3% coverage); two more close it completely. Every site beyond that adds zero further benefit under this model, a genuinely useful signal for a funding decision. (A location-data fix, walked through above, corrected the baseline from an earlier, understated 58.9%.)",

      siteTables: [
        {
          badge: "Phase 1 · Quick wins",
          heading: "5 new facilities, 98.3% coverage",
          rows: [
            ["Geraldton", "11,888", "81"],
            ["Esperance", "12,003", "209"],
            ["Busselton Surrounds", "11,900", "62"],
            ["Bayonet Head - Lower King", "5,211", "58"],
            ["Port Hedland", "4,253", "192"]
          ]
        },
        {
          badge: "Full rollout · Remaining 2",
          heading: "7 facilities total, 100% coverage",
          rows: [
            ["Carnarvon", "4,879", "156"],
            ["Newman", "4,239", "277"]
          ]
        }
      ],

      dataSources: [
        "Australian Bureau of Statistics, 2021 Census, Table G01 (population) and G23 (voluntary work), SA2 level",
        "Australian Bureau of Statistics, SEIFA 2021, Index of Relative Socio-Economic Disadvantage",
        "Australian Bureau of Statistics, ASGS Edition 3 (2021) SA2 digital boundaries",
        "WA Department of Primary Industries and Regional Development, Community Resource Centre network (103 real facilities)"
      ],

      // The big, unmissable download buttons at the top of the popup.
      caseStudyHref: "assets/WA_Regional_Engagement_Case_Study.docx",
      notebookHref: "assets/01_regional_engagement_model.ipynb"
    }
  },
  {
    title: "Customer Lifetime Value & Campaign Impact",
    tag: "Marketing & Customer Analytics",
    description: "Which customers are worth the most over time, and did a specific campaign actually cause a sales lift: probabilistic CLV modeling plus a causal Difference-in-Differences design.",
    image: "",
    icon: "chart",
    status: "soon"
  },
  {
    title: "Inventory Policy Under Service-Level Targets",
    tag: "Supply Chain & Operations",
    description: "How much safety stock a retailer should hold per product line to hit a 95% service level without overspending: demand forecasting plus a newsvendor cost trade-off.",
    image: "",
    icon: "truck",
    status: "soon"
  },
  {
    title: "Credit Risk Pricing Model",
    tag: "Finance & Risk",
    description: "Which loan applicants are likely to default, and how a lender should price that risk: a full statistical workup with a cost-minimizing decision threshold.",
    image: "",
    icon: "coin",
    status: "soon"
  },
  {
    title: "Employee Tenure & Turnover Cost",
    tag: "People Analytics",
    description: "Not just who might leave, but when: survival analysis translating hazard ratios into a real dollar cost-of-turnover figure.",
    image: "",
    icon: "people",
    status: "soon"
  },
];

// ============================================================
//  OVERALL PORTFOLIO STATS
// ============================================================
// These are the 4 numbers shown near the top of the homepage.
// The first one ("of 5 projects live") counts itself automatically
// from the list above, you never need to edit it by hand. The rest
// are simple facts about the portfolio as a whole. Update the
// `target` number if it changes; leave `label` starting with "%" for
// a percentage stat, since the number and label sit right next to
// each other (e.g. target 100 + label "% real, cited public data"
// reads as "100% real, cited public data").
// ============================================================
const portfolioStats = [
  { target: 5, label: "analytics disciplines covered" },
  { target: 100, label: "% real, cited public data" },
  { target: 5, label: "government datasets used" }
];

// ============================================================
//  ABOUT YOU
// ============================================================
// Shown just under the hero: your photo and a short bio.
// `paragraphs` is a list of short paragraphs, each shown on its own line.
// `skills` is a row of small tags under the bio. Each one is clickable on
// the live site: tapping a skill scrolls to the projects that actually
// used it (based on each project's own `skills` list above). If nothing
// live uses it yet, the site says so honestly rather than hiding the tag.
// ============================================================
const bio = {
  photo: "assets/joel-photo.jpg",
  role: "Business Analyst",
  paragraphs: [
    "I'm a business analyst with a background in business administration and analytics. My work is about turning messy, real-world data into something a business can actually act on: finding the pattern underneath the noise, then making the case for what to do about it.",
    "Day to day that means data analysis, dashboards, process improvement, and reporting, built with Power BI, SQL, Python, Excel, and Azure.",
    "I care most about the point where analysis meets operations: where a number on a dashboard turns into a changed process, a better decision, or time and money saved. That's the part of the job I find genuinely interesting."
  ],
  skills: [
    "Power BI", "SQL", "Python", "Excel", "Azure",
    "Data Analysis", "Data Modeling", "Process Improvement",
    "Requirements Gathering", "Stakeholder Management",
    "Business Process Mapping", "Agile & Scrum", "Jira & Confluence",
    "Power Automate", "Statistics"
  ]
};

// ============================================================
//  EXPERIENCE (the UWA internship story)
// ============================================================
// This powers the "Experience" section on the homepage: a short teaser
// plus a "View full experience" button that opens the whole story in a
// popup. `story` is a list of sections shown in order, each with a
// heading, one or more paragraphs, and (optionally) screenshots.
// ============================================================
const experience = {
  // Shown on the homepage card, before anyone has clicked in. Kept general
  // (just "UWA") on purpose, the specific centre is revealed once the card
  // is opened, the same way a project card doesn't give away its whole
  // method until you tap it.
  cardImage: "assets/powerbi_dashboard_full.png",
  cardTag: "Internship · University of Western Australia",
  cardTitle: "UWA Internship: Building a Live Power BI Reporting System",
  cardDescription: "Turning years of scattered spreadsheets into one live Power BI report, then building a small internal tool to stop bad data from breaking it again.",

  // Shown once the card is opened.
  eyebrow: "UWA McCusker Centre for Citizenship · Internship",
  title: "Building the Power BI system that tracks UWA's regional engagement across WA",
  teaser: "A real internship project: turning years of scattered spreadsheets into one live Power BI report, then building a small internal tool to stop bad data from breaking it again.",
  metrics: [
    { value: 3, label: "source files merged into one master file" },
    { value: 257, label: "activities tracked live across WA" },
    { value: 1, label: "internal tool built to catch entry mistakes early" }
  ],

  story: [
    {
      heading: "The problem",
      paragraphs: [
        "UWA's McCusker Centre for Citizenship runs a wide range of regional engagement work across Western Australia: research projects, community partnerships, outreach programs, student placements, and more. All of it was genuinely happening, but nobody could see it all in one place. The details lived in separate files, kept by different people, in different formats. If a project exec wanted to know how much activity was happening in the Kimberley, or which schools had the most partnerships, someone had to go digging through files by hand.",
        "My job was to fix that: build one live, reliable picture of everything the Centre was doing across the state."
      ]
    },
    {
      heading: "The challenge: cleaning years of scattered data",
      paragraphs: [
        "Before any of that could go into a dashboard, it had to be pulled together and cleaned. I merged multiple source spreadsheets into a single master file, which meant working through the usual real-world mess: the same activity entered twice under slightly different names, region names spelled three different ways, blank fields, and activities that genuinely needed more than one value in a single field. An activity could involve two schools, two activity types, and up to three partners at once, and none of that fits neatly into a flat spreadsheet row. I had to decide, field by field, how to structure it so it could actually be reported on."
      ]
    },
    {
      heading: "Building the Power BI report",
      paragraphs: [
        "The result is \"Activities - Search\", a Power BI report project executives use to explore the Centre's work across WA. It filters by region, activity type, field of education, field of research, school or centre, partner, and year, and everything on the page (the map, the charts, the totals) updates together. Clicking any activity in the table opens its full detail: description, region, partners, contact lead, all in one place, without anyone needing to ask a person for it."
      ],
      images: [
        { src: "assets/powerbi_dashboard_full.png", caption: "The full report, unfiltered: 257 activities tracked across WA." },
        { src: "assets/powerbi_drilldown.png", caption: "Clicking one activity drills the whole report down to it, here showing a single Kimberley research project." },
        { src: "assets/powerbi_slicer.png", caption: "One of the filter panels, letting execs slice the data by Field of Research." }
      ]
    },
    {
      heading: "Under the hood: a few of the DAX measures",
      paragraphs: [
        "A few fields don't fit a normal column. An activity can have two activity types or up to three partner organisations, and Power BI needed a clean way to show that without listing duplicate rows for the same activity. I wrote a handful of DAX measures to handle this. A few real examples, not everything, just the parts that show the actual logic:",
        "All_Locations combines an activity's town and region into one readable label, and handles missing values so the report never shows a blank or a stray comma. All_Activity_Types combines up to two activity type fields into a single readable label for the results table. Partner_Count counts how many of the (up to three) partner fields are actually filled in, which drives the \"Partners/Collaborators\" total on the report."
      ],
      images: [
        { src: "assets/dax_all_locations.png", caption: "All_Locations: builds a clean \"Town, Region, WA\" label per activity." },
        { src: "assets/dax_all_activity_types.png", caption: "All_Activity_Types: combines two activity type fields into one label." },
        { src: "assets/dax_partner_count.png", caption: "Partner_Count: counts how many partner slots are actually filled." }
      ]
    },
    {
      heading: "A new problem: manual entry kept breaking the categories",
      paragraphs: [
        "Once the report was live, a new problem showed up. People were still typing new activities into the master Excel file by hand, and free text entry is exactly where consistency falls apart: \"Kimberley\", \"kimberley\", and \"Kimberly WA\" all read as three different regions to Power BI, quietly breaking the filters and the charts. The report was only ever as reliable as the weakest entry going into it."
      ]
    },
    {
      heading: "The solution: a purpose-built data entry tool",
      paragraphs: [
        "So I designed a small internal tool, \"UWA Regional Mapping, Data Entry Studio\", to fix the problem at the source. Instead of typing directly into the spreadsheet, whoever is entering a new activity pastes in the raw description (an email, a report excerpt, whatever they have got), and the tool extracts it into the same structured fields the master file expects: activity ID, name, description, region, activity type, field of education, research focus, school, and partners. The fields that used to be free text, like activity type or research focus, are now dropdown menus built from a fixed list, so the same category is always spelled the same way. Once the fields look right, one button writes the record straight into the master Excel file that Power BI reads from: no manual retyping, and no drift between what was entered and what the categories expect."
      ],
      images: [
        { src: "assets/app_extract_empty.png", caption: "The entry screen, ready for a new activity." },
        { src: "assets/app_extract_populated.png", caption: "Pasted-in text extracted into structured fields automatically. Only the parts still needing a human check are left for review." },
        { src: "assets/app_dropdown.png", caption: "Classification fields use a fixed dropdown list instead of free text, so a region or activity type is always spelled the same way." }
      ]
    },
    {
      heading: "A dashboard inside the tool, to catch mistakes before they spread",
      paragraphs: [
        "The tool also has its own small dashboard, mirroring the same totals, map, and region breakdown as the live Power BI report. That was a deliberate design choice: it means whoever is entering data can immediately check that what they just added lines up with what the Centre's real report will show, and catch a mistake before it reaches the master file, instead of finding it weeks later in a stakeholder meeting."
      ],
      images: [
        { src: "assets/app_dashboard.png", caption: "The tool's built-in dashboard, used to sanity-check new entries against the same totals Power BI will show." }
      ]
    },
    {
      heading: "How it all fits together",
      paragraphs: [
        "End to end, the system now looks like this: someone enters an activity through the Data Entry Studio, the tool structures and validates it and writes it into the master Excel file, and the Power BI report reads straight from that file. Project executives always see an up-to-date, WA-wide picture of the Centre's engagement work, filterable by region, school, partner, and activity type, with the full detail of any single activity a click away."
      ]
    }
  ],

  hardSkills: [
    "Power BI report design (slicers, cross-filtering, drill-down detail pages)",
    "DAX measures for calculated, multi-value fields",
    "Data cleaning and consolidation across multiple source files",
    "Excel data modeling for a shared master file",
    "Working with data hosted on UWA's cloud servers",
    "Requirements-led internal tool design"
  ],
  softSkills: [
    "Translating a technical build into something non-technical project executives could trust and use",
    "Stakeholder communication with academic and project leads",
    "Initiative to fix a problem beyond what was originally asked",
    "Working through ambiguity when the right data structure was not obvious upfront"
  ],

  // Which skill chips this experience honestly demonstrates, same idea as
  // each project's own `skills` list, used to power the skill picker.
  skills: [
    "Power BI", "Excel", "Data Modeling", "Data Analysis",
    "Requirements Gathering", "Stakeholder Management", "Process Improvement"
  ]
};

// ============================================================
//  RECOMMENDATIONS
// ============================================================
// Real recommendations from real people, shown in this order.
// `quote` is the short excerpt shown by default; `full` is the
// complete recommendation, revealed when someone clicks "Read full
// recommendation". To add a new one, copy a whole block below.
// ============================================================
const recommendations = [
  {
    name: "Sandra Finlay",
    title: "Senior Delivery Lead (Regional and Equity)",
    photo: "assets/sandra-photo.png",
    quote: "Joel consistently exceeded expectations through his technical expertise, initiative, and professionalism. He developed intuitive Power BI dashboards, transformed complex datasets into meaningful insights, and independently designed an innovative automated data-capture solution that significantly improved efficiency, accuracy, and scalability.",
    full: "I had the pleasure of supervising Joel during his internship at The University of Western Australia (UWA), where he made an exceptional contribution to a major stakeholder engagement data project.\n\nJoel consistently exceeded expectations through his technical expertise, initiative, and professionalism. He developed intuitive Power BI dashboards, transformed complex datasets into meaningful insights, and independently designed an innovative automated data-capture solution that significantly improved efficiency, accuracy, and scalability. Rather than simply completing assigned tasks, Joel proactively identified opportunities to improve processes and successfully implemented solutions that added lasting value to the project.\n\nWhat impressed me most was Joel's ability to work independently, embrace complex challenges, and continually seek better ways of delivering outcomes. His strong analytical skills, curiosity, and commitment to excellence earned our trust quickly, and he became responsible for several critical components of the project.\n\nJoel's work has left a lasting impact at UWA, and I have no doubt he will be an asset to any organisation. I highly recommend him and look forward to seeing what he achieves in the future."
  },
  {
    name: "Garry Fitzpatrick",
    title: "Professor, The University of Western Australia",
    photo: "assets/garry-photo.png",
    quote: "What stood out was not only the quality of Joel's work, but the maturity and initiative he brought to a project of strategic importance to the University. He approached every challenge with a solutions-focused mindset.",
    full: "As Executive Sponsor of this project, I had the opportunity to see first-hand the impact Joel made during his internship at The University of Western Australia.\n\nWhat stood out was not only the quality of Joel's work, but the maturity and initiative he brought to a project of strategic importance to the University. He approached every challenge with a solutions-focused mindset, contributing ideas that strengthened the project well beyond its original scope. His innovative approach to automating data capture and his ability to translate complex information into meaningful insights significantly enhanced the value of the final solution.\n\nJoel quickly earned the confidence of the project team through his professionalism, technical capability, and commitment to delivering high-quality outcomes. The system he helped develop will continue to improve how the University captures and reports stakeholder engagement, providing benefits long after his internship has concluded.\n\nJoel is an impressive emerging professional with enormous potential. I have every confidence that he will continue to make a meaningful contribution wherever his career takes him, and I highly recommend him."
  },
  {
    name: "Kate Hislop",
    title: "Associate Professor in Architecture, UWA School of Design",
    photo: "assets/kate-photo.png",
    quote: "Joel consistently demonstrated the capability, initiative, and professionalism of someone much more experienced. He approached complex challenges with confidence and applied innovative thinking to improve existing processes.",
    full: "It was a pleasure to observe the contribution Joel made during his internship at The University of Western Australia (UWA).\n\nAlthough engaged as an intern, Joel consistently demonstrated the capability, initiative, and professionalism of someone much more experienced. He approached complex challenges with confidence, applied innovative thinking to improve existing processes, and delivered solutions that will provide ongoing value to the University.\n\nI was particularly impressed by Joel's ability to bring a strategic perspective to his work, ensuring his technical solutions aligned with the University's broader objectives. His contributions have strengthened the University's ability to capture, analyse, and report stakeholder engagement information, supporting more informed decision-making and enhanced collaboration across the institution.\n\nJoel is a talented and highly motivated emerging professional who made a genuine impact during his time at UWA. I have no hesitation in recommending him and look forward to seeing the contributions he will undoubtedly make throughout his career."
  }
];
