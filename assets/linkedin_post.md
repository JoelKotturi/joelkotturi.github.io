Where should WA fund its next Community Resource Centre? I built an optimization model to answer it.

Following on from my internship with the McCusker Centre for Citizenship at UWA, I wanted to take the regional engagement question one step further: not just describe where activity is happening, but actually solve for where the next investment should go.

The setup:
76 real regional WA communities (2021 Census population, volunteering rates, SEIFA disadvantage)
103 real, currently operating Community Resource Centres (WA Dept. of Primary Industries and Regional Development)
A Maximal Covering Location Problem, solved as a Mixed-Integer Program (Python, PuLP/CBC), not a heuristic, a provably optimal answer
An equity-weighted objective, so the model prioritizes disadvantaged and under-engaged communities rather than just the biggest towns
A gravity-model distance-decay assumption, tested against the real data first (distance to nearest CRC correlates -0.45 with existing volunteer rate) before being relied on

The result: five new facilities, Geraldton, Esperance, Busselton Surrounds, Bayonet Head-Lower King, and Port Hedland, would lift equity-weighted regional coverage from 58.9% to 87.3%. A further eleven facilities close the gap completely.

The part I found most interesting wasn't the optimization itself, it was the data quality debugging along the way. A chunk of WA's SA2 geographic units turned out to be national parks, airports and industrial precincts with no real population, and several of the state's largest, most remote shires had geographic centroids sitting 100km+ from where people actually live. Both had to be found and corrected before the model results meant anything.

Full write-up, notebook, and interactive map below.

#DataScience #Optimization #PublicPolicy #WesternAustralia #Analytics
