# dash2-dynamic-trends
## Aircraft Incidents Analysis Dashboard (1995-2016)

### Overview
This interactive dashboard visualizes aircraft incident patterns from 1995-2016, providing insights into aviation safety trends across different manufacturers, flight phases, and injury severity levels. The dashboard analyzes 1,987 aviation incidents from the National Transportation Safety Board (NTSB) database.

**Live Dashboard:** [https://info-474-sp25.github.io/dash2-dynamic-trends-xiaoqz6/](https://info-474-sp25.github.io/dash2-dynamic-trends-xiaoqz6/)

### Features

#### Interactive Visualizations

1. **Aircraft Incidents Over Time by Manufacturer (Line Chart)**
   - Shows incident trends from 1995-2016 for top 5 aircraft manufacturers
   - Manufacturers: Boeing, McDonnell Douglas, Airbus, Embraer, Bombardier
   - Interactive hover tooltips with detailed incident information
   - Clickable legend for manufacturer filtering

2. **Incidents by Flight Phase and Injury Severity (Stacked Bar Chart)**
   - Displays incident distribution across different flight phases
   - Color-coded by injury severity levels (Fatal, Non-Fatal, Incident, Unavailable)
   - Interactive tooltips showing phase-specific incident breakdowns
   - Cross-filtering with line chart visualization

#### Interactive Controls

##### First Chart Filters:
- **Manufacturer Filter**: Multi-select checkboxes to show/hide specific manufacturers
- **Year Range Slider**: Custom dual-handle slider with visual track and preset buttons
  - Reset to full range (1995-2016)
  - Quick selection: Last 5 Years (2012-2016)
  - Quick selection: First 5 Years (1995-1999)

##### Second Chart Filters:
- **Flight Phase Filter**: Dropdown to focus on specific flight operations
- **Injury Severity Filter**: Multi-select checkboxes for severity levels

### Data Source

**Dataset**: U.S. Civil Aviation Accidents and Incidents (1995-2016)
- **Source**: National Transportation Safety Board (NTSB) CAROL system
- **Records**: 1,987 aviation incidents
- **Time Period**: 1995-2016 (22 years)
- **Geographic Scope**: United States civil aviation