# SP-022 Dense Layout Planner Readback

- implementation_date: 2026-07-07
- implementation_version: sp-022-objective-planner-2026-07-07
- commit_head: ec10bbd
- viewport: 1280x720
- usable_stage: 1259.84x675.84
- tile_count: 12
- aspect_ratio: 1.777778
- gap: 6
- chrome_mode: chrome-collapsed
- selected: 3x4
- selected_reason: 3x4 selected: highest objective score after area, vertical slack, horizontal slack, max-axis underuse, and empty-slot penalties (area=67.6%; vSlack=0.1%, hSlack=29.5%; empty=0).
- scoring: score = weighted area utilization + negative weighted penalties for vertical slack, horizontal slack, max-axis underuse, empty slots, and undersized tiles
- tie_breaker: If scores tie, choose lower vertical slack, then lower maximum axis underuse, then larger visible tile area, then fewer columns.

| grid | capacity | empty_slots | tile_w | tile_h | area_util | v_slack | h_slack | score | selected |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1x12 | 12 | 0 | 90 | 50.63 | 0.0642 | 0.0035 | 0.9286 | -0.3041 | no |
| 2x6 | 12 | 0 | 191 | 107.44 | 0.2892 | 0.0018 | 0.692 | 0.038 | no |
| 3x4 | 12 | 0 | 292 | 164.25 | 0.6759 | 0.0012 | 0.2951 | 0.5683 | yes |
| 4x3 | 12 | 0 | 310 | 174.38 | 0.7618 | 0.2082 | 0.0015 | 0.4847 | no |
| 5x3 | 15 | 3 | 247 | 138.94 | 0.4837 | 0.3655 | 0.0007 | -0.0426 | no |
| 6x2 | 12 | 0 | 204 | 114.75 | 0.3299 | 0.6515 | 0.0046 | -0.5375 | no |
| 7x2 | 14 | 2 | 174 | 97.88 | 0.24 | 0.7015 | 0.0046 | -0.7224 | no |
| 8x2 | 16 | 4 | 152 | 85.5 | 0.1832 | 0.7381 | 0.0015 | -0.8488 | no |
| 9x2 | 18 | 6 | 134 | 75.38 | 0.1423 | 0.7681 | 0.0046 | -0.9467 | no |
| 10x2 | 20 | 8 | 120 | 67.5 | 0.1142 | 0.7914 | 0.0046 | -1.0192 | no |
| 11x2 | 22 | 10 | 109 | 61.31 | 0.0942 | 0.8097 | 0.0007 | -1.0847 | no |
| 12x1 | 12 | 0 | 99 | 55.69 | 0.0777 | 0.9176 | 0.0046 | -1.1645 | no |
