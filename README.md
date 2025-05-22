# dash2-dynamic-trends
## Aircraft Incidents Analysis Dashboard (1995-2016)

### Overview
This interactive dashboard visualizes aircraft incident patterns from 1995-2016, providing insights into aviation safety trends across different manufacturers, flight phases, and injury severity levels. The dashboard analyzes 1,987 aviation incidents from the National Transportation Safety Board (NTSB) database.

**Live Dashboard:** [https://info-474-sp25.github.io/dash2-dynamic-trends-xiaoqz6/](https://info-474-sp25.github.io/dash2-dynamic-trends-xiaoqz6/)

## Features

### Interactive Visualizations

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

### Interactive Controls

#### First Chart Filters:
- **Manufacturer Filter**: Multi-select checkboxes to show/hide specific manufacturers
- **Year Range Slider**: Custom dual-handle slider with visual track and preset buttons
  - Reset to full range (1995-2016)
  - Quick selection: Last 5 Years (2012-2016)
  - Quick selection: First 5 Years (1995-1999)

#### Second Chart Filters:
- **Flight Phase Filter**: Dropdown to focus on specific flight operations
- **Injury Severity Filter**: Multi-select checkboxes for severity levels

## Key Insights

### Manufacturer Safety Trends
- **Boeing** consistently shows the highest incident numbers, with a dramatic spike around 2010-2011 (reaching ~84 incidents) followed by a sharp decline by 2016
- **McDonnell Douglas** demonstrates a noticeable peak around 1997 but maintains lower incident numbers after 2002, likely due to Boeing's acquisition
- **Airbus, Embraer, and Bombardier** show relatively consistent but lower incident rates compared to Boeing

### Flight Phase Risk Assessment
- **Landing, Takeoff, and Taxi** phases account for the highest number of incidents overall
- **Taxi incidents** show predominantly non-fatal outcomes
- **Cruise phase** has fewer total incidents but displays a higher proportion of fatal outcomes
- **Go-Around, Maneuvering, and Other** phases show significantly fewer incidents

## Technical Implementation

### Technologies Used
- **D3.js v7**: For data visualization and interactive elements
- **HTML5**: Structure and layout
- **CSS3**: Styling and responsive design
- **JavaScript**: Data processing and interactivity logic

### Data Processing
- Filters and aggregates 1,987 incident records from NTSB database
- Real-time data transformation based on user filter selections
- Cross-visualization state management for coordinated filtering

### Interactive Features
- **Enhanced Tooltips**: Show incident counts, percentages, and contextual information
- **Cross-Chart Filtering**: Selections in one visualization affect the other
- **Responsive Design**: Adapts to different screen sizes
- **Performance Optimization**: Efficient data processing and smooth interactions

## Data Source

**Dataset**: U.S. Civil Aviation Accidents and Incidents (1995-2016)
- **Source**: National Transportation Safety Board (NTSB) CAROL system
- **Records**: 1,987 aviation incidents
- **Time Period**: 1995-2016 (22 years)
- **Geographic Scope**: United States civil aviation