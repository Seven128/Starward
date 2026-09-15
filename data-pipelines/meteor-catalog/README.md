# GMN historical meteor reference

`build_gmn_reference.py` reads the official GMN annual operational shower table and completed yearly trajectory-summary text files. It keeps the 13 currently supported nighttime shower identities, excludes year-specific outburst rows, and preserves the GMN monitoring window and population index. A monitoring window is not an exhaustive physical activity interval. No count is converted to ZHR or an observer's expected meteor count.

The input format follows the [GMN column description](https://globalmeteornetwork.org/data/media/GMN_orbit_data_columns.pdf) and the publisher-recommended WesternMeteorPyLib parser. Geocentric ecliptic longitude/latitude are J2000 degrees; geocentric speed is km/s. All semicolon columns, including repeated uncertainty columns, are retained for identity-conflict detection. Selected trajectories require a real UTC timestamp, consistent IAU identity, finite coordinates/speed and at least two stations. Overlapping identical trajectory IDs are counted once; conflicting versions and repeated file paths are rejected. Raw files and each source SHA-256 remain in acquisition evidence, outside the runtime bundle.

Historical directions use solar-longitude offsets around the annual reference, and sun-centered J2000 ecliptic coordinates. The fit uses equal-weight medians of one-degree solar-longitude bins with at least 10 trajectories. At least 100 actually used trajectories, two years with 20 used trajectories each, three occupied bins and three distinct bins supported by multiple years (five trajectories per year/bin) are required. The annual reference must fall inside the measured range. Input counts and actual fitted counts are distinct.

The following are conservative **engineering candidate filters**, not GMN's scientific quality certification or a confidence interval: bin-median fit RMS ≤ 1°, maximum ≤ 3°, trajectory residual P90 ≤ 5°, and maximum matched-bin yearly-median difference ≤ 3°. These separately test nonlinearity, broad dispersion and year disagreement. They do not establish forecast accuracy or account for all observing/selection biases. Change them only with a recorded capability/accuracy decision and independent review, never just to make a shower pass. Diagnostics remain available for review; failing showers remain in the catalog with an unavailable direction and specific reason. A candidate is not automatically published.

Consumers must apply the fitted drift at the requested J2000 solar longitude, use only the measured valid interval (including narrow intervals), convert J2000 ecliptic to equatorial-of-date before horizon projection, and preserve unavailable direction independently from event/date identity. Sol-max converted to a calendar date is an annual reference date, not that year's predicted exact maximum. Runtime, package validation, source publication and UI migration must enforce these meanings before replacing the existing catalog.

Sources: [GMN data](https://globalmeteornetwork.org/data/), [flux/operational table](https://globalmeteornetwork.org/flux/), [trajectory summaries](https://globalmeteornetwork.org/data/traj_summary_data/). GMN publishes these high-level data under **CC BY 4.0**. Preserve Global Meteor Network credit, the original source links and the publisher's paper/partner acknowledgements, with a clear notice that Starward derived the binned historical direction model. The acquisition record must retain the actual release and retrieval dates. Do not extend this license to unrelated articles or infer permission to copy arbitrary platform content.

Run with Python 3.10+ and the project's already installed NumPy (the astronomy acquisition environment currently has NumPy 2.2.6):

```text
python -m unittest discover -s data-pipelines/meteor-catalog -v
python data-pipelines/meteor-catalog/build_gmn_reference.py --table <gmn-flux.html> --trajectory <2022.txt> --trajectory <2023.txt> --output <candidate.json>
```

The output is a reviewable data candidate, not an active public event catalog. Preserve source files and candidate review evidence in the task's acquisition directory. The raw trajectory files need not be included in app delivery.
