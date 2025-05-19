// Global variables
const margin = { top: 50, right: 80, bottom: 60, left: 70 }; 
let width = 1000 - margin.left - margin.right; 
let height = 600 - margin.top - margin.bottom;

// Define manufacturers with improved color palette for better accessibility
const manufacturers = ["Boeing", "McDonnell Douglas", "Airbus", "Embraer", "Bombardier"];
const colorScale = d3.scaleOrdinal()
    .domain(manufacturers)
    .range(["#e41a1c", "#ff7f00", "#377eb8", "#4daf4a", "#ffff33"]);

// Define injury severity categories with a more distinctive color scheme
const severityCategories = ["FATAL", "NON-FATAL", "INCIDENT", "UNAVAILABLE"];
const severityColorScale = d3.scaleOrdinal()
    .domain(severityCategories)
    .range(["#003f5c", "#bc5090", "#ff6361", "#ffa600"]);

// Create enhanced tooltip element
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Global state variables for filters
let selectedManufacturers = [...manufacturers]; // Start with all manufacturers selected
let selectedPhase = "all";
let selectedSeverities = [...severityCategories]; // Start with all severities selected
let yearRange = [1995, 2016];
let filteredData = [];
let rawData = [];

// Animation durations
const transitionDuration = 750;

// For demo purposes, create some sample data
function generateSampleData() {
    const sampleData = [];
    for (let year = 1995; year <= 2016; year++) {
        manufacturers.forEach(mfr => {
            const incidentsCount = Math.floor(Math.random() * 20) + 1;
            for (let i = 0; i < incidentsCount; i++) {
                const phases = ["TAKEOFF", "LANDING", "CRUISE", "APPROACH", "STANDING", "TAXI", "CLIMB"];
                const severities = ["FATAL", "NON-FATAL", "INCIDENT", "UNAVAILABLE"];
                
                sampleData.push({
                    Event_Year: year.toString(),
                    Make: mfr,
                    Broad_Phase_of_Flight: phases[Math.floor(Math.random() * phases.length)],
                    Injury_Severity: severities[Math.floor(Math.random() * severities.length)]
                });
            }
        });
    }
    return sampleData;
}

// Handle window resize event
function handleResize() {
    const chartContainers = document.querySelectorAll('.chart-container');
    
    chartContainers.forEach(container => {
        // Update charts on resize
        updateVisualizations();
    });
}

// Add resize event listener
window.addEventListener('resize', debounce(handleResize, 250));

// Debounce function to limit resize event firing
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Load data and initialize visualizations
try {
    console.log("Attempting to load data from CSV...");
    
    // First attempt to load the data from a CSV file
    d3.csv("aircraft_incidents_cleaned.csv")
        .then(data => {
            console.log("Data loaded successfully:", data.length, "records");
            rawData = data;
            initializeVisualization();
        })
        .catch(error => {
            console.warn("Could not load CSV file. Using sample data instead:", error);
            rawData = generateSampleData();
            console.log("Sample data generated:", rawData.length, "records");
            initializeVisualization();
        });
} catch (error) {
    console.error("Error initializing dashboard:", error);
    displayErrorMessage("Failed to initialize dashboard. Please check the console for details.");
}

// Initialize visualizations after data is loaded
function initializeVisualization() {
    // Initial data processing
    processData();
    
    // Create visualizations
    createLineChart();
    createBarChart();
    
    // Set up event listeners for filters
    setupEventListeners();
    
    // Add cross-filtering capability
    setupCrossFiltering();
}

// Display error message in charts
function displayErrorMessage(message) {
    const charts = ["#incidentsLineChart", "#phaseBarchart"];
    
    charts.forEach(selector => {
        const svg = d3.select(selector);
        svg.html(""); // Clear existing content
        
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("class", "error-message")
            .text(message);
    });
}

// Process and filter data based on current filters
function processData() {
    // Year range for our visualization
    const yearStart = yearRange[0];
    const yearEnd = yearRange[1];
    const years = Array.from({length: yearEnd - yearStart + 1}, (_, i) => yearStart + i);
    
    // Initialize data structure for incidents by year and manufacturer
    let incidentsByYearAndManufacturer = {};
    
    years.forEach(year => {
        incidentsByYearAndManufacturer[year] = {};
        manufacturers.forEach(manufacturer => {
            incidentsByYearAndManufacturer[year][manufacturer] = 0;
        });
    });
    
    // Filter and count incidents based on selected filters
    filteredData = rawData.filter(incident => {
        const year = +incident.Event_Year;
        const make = incident.Make;
        const phase = incident.Broad_Phase_of_Flight;
        const severity = incident.Injury_Severity || "UNAVAILABLE";
        
        const yearMatch = year >= yearStart && year <= yearEnd;
        const manufacturerMatch = selectedManufacturers.includes(make);
        const phaseMatch = selectedPhase === "all" || phase === selectedPhase;
        const severityMatch = selectedSeverities.includes(severity);
        
        return yearMatch && manufacturerMatch && phaseMatch && severityMatch && manufacturers.includes(make);
    });
    
    // Count incidents by year and manufacturer for the filtered data
    filteredData.forEach(incident => {
        const year = +incident.Event_Year;
        const make = incident.Make;
        
        if (year >= yearStart && year <= yearEnd && manufacturers.includes(make)) {
            incidentsByYearAndManufacturer[year][make]++;
        }
    });
    
    // Convert to array format for D3
    const timeSeriesData = years.map(year => {
        const yearData = { year };
        manufacturers.forEach(manufacturer => {
            yearData[manufacturer] = incidentsByYearAndManufacturer[year][manufacturer];
        });
        return yearData;
    });
    
    // Count incidents by flight phase and severity
    const phaseData = [];
    const phases = ["TAKEOFF", "LANDING", "CRUISE", "APPROACH", "STANDING", "TAXI", "CLIMB", "DESCENT", "GO-AROUND", "MANEUVERING", "OTHER"];
    
    phases.forEach(phase => {
        const phaseItem = { phase };
        
        // Initialize counts for each severity
        severityCategories.forEach(severity => {
            phaseItem[severity] = 0;
        });
        
        // Count incidents for this phase by severity
        filteredData.forEach(incident => {
            if (incident.Broad_Phase_of_Flight === phase) {
                const severity = incident.Injury_Severity || "UNAVAILABLE";
                if (severityCategories.includes(severity)) {
                    phaseItem[severity]++;
                }
            }
        });
        
        // Only include phases with at least one incident
        const hasIncidents = severityCategories.some(s => phaseItem[s] > 0);
        if (hasIncidents) {
            phaseData.push(phaseItem);
        }
    });
    
    // Sort phase data by total incidents (descending)
    phaseData.sort((a, b) => {
        const totalA = severityCategories.reduce((sum, severity) => sum + a[severity], 0);
        const totalB = severityCategories.reduce((sum, severity) => sum + b[severity], 0);
        return totalB - totalA;
    });
    
    return { timeSeriesData, phaseData };
}

// Create the line chart visualization
function createLineChart() {
    // Clear any existing chart
    d3.select("#incidentsLineChart").html("");
    
    // Get processed data
    const { timeSeriesData } = processData();
    
    // Get current container dimensions
    const container = document.querySelector("#incidentsLineChart").parentElement;
    const containerWidth = container.clientWidth;
    
    // Adjust dimensions based on container width
    width = containerWidth - margin.left - margin.right;
    height = Math.min(width * 0.6, 600) - margin.top - margin.bottom;
    
    // Create SVG container
    const svg = d3.select("#incidentsLineChart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add title
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .text("Incidents by Manufacturer (1995-2016)");
        
    // Set scales
    const x = d3.scaleLinear()
        .domain([yearRange[0], yearRange[1]])
        .range([0, width]);
    
    const maxIncidents = d3.max(timeSeriesData, d => 
        Math.max(...manufacturers.map(m => d[m]))
    ) || 0;
    
    const y = d3.scaleLinear()
        .domain([0, Math.max(10, maxIncidents * 1.1)]) // Ensure we always see something
        .range([height, 0])
        .nice(); // Make the scale nice round numbers
    
    // Add animated clip path for transitions
    svg.append("defs").append("clipPath")
        .attr("id", "clip-line-chart")
        .append("rect")
        .attr("width", width)
        .attr("height", height);
    
    // Create line generator with smoothing
    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);
    
    // Add grid lines with improved styling
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .ticks(width < 500 ? 5 : (yearRange[1] - yearRange[0] > 10 ? 10 : yearRange[1] - yearRange[0]))
            .tickSize(-height)
            .tickFormat("")
        );
    
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .ticks(5)
            .tickSize(-width)
            .tickFormat("")
        );
    
    // Create a group for lines
    const linesGroup = svg.append("g")
        .attr("clip-path", "url(#clip-line-chart)");
    
    // Draw lines for each manufacturer
    manufacturers.forEach(manufacturer => {
        // Skip if filtered out
        if (!selectedManufacturers.includes(manufacturer)) {
            return;
        }
        
        // Process data for this manufacturer
        const manufacturerData = timeSeriesData.map(d => ({
            year: d.year,
            value: d[manufacturer]
        }));
        
        // Add the line with animation
        const path = linesGroup.append("path")
            .datum(manufacturerData)
            .attr("class", `line-${manufacturer.replace(/\s+/g, '-')} line-path`)
            .attr("fill", "none")
            .attr("stroke", colorScale(manufacturer))
            .attr("stroke-width", 3)
            .attr("d", line);
            
        // Animate the line drawing
        const pathLength = path.node().getTotalLength();
        path.attr("stroke-dasharray", pathLength + " " + pathLength)
            .attr("stroke-dashoffset", pathLength)
            .transition()
            .duration(transitionDuration)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);
        
        // Add dots for data points - fewer dots on smaller screens
        const dotFrequency = width < 500 ? 3 : 1; // Show every 3rd dot on small screens
        
        linesGroup.selectAll(`.dot-${manufacturer.replace(/\s+/g, '-')}`)
            .data(manufacturerData.filter((d, i) => i % dotFrequency === 0)) // Filter dots for small screens
            .enter()
            .append("circle")
            .attr("class", `dot-${manufacturer.replace(/\s+/g, '-')} data-circle`)
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.value))
            .attr("r", 0) // Start with radius 0
            .attr("fill", colorScale(manufacturer))
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .style("opacity", 0)
            .transition() // Animate points appearing
            .delay((d, i) => transitionDuration * (i / manufacturerData.length))
            .duration(200)
            .attr("r", width < 500 ? 4 : 5) // Smaller dots on mobile
            .style("opacity", 0.8);
            
        // Add event listeners to dots after transition
        linesGroup.selectAll(`.dot-${manufacturer.replace(/\s+/g, '-')}`)
            .on("mouseover", function(event, d) {
                handlePointHover(event, d, manufacturer, this);
            })
            .on("mouseout", handlePointMouseout);
    });
    
    // Add X axis with improved labeling
    const xAxisTicks = width < 500 ? 5 : (yearRange[1] - yearRange[0] > 10 ? 10 : yearRange[1] - yearRange[0]);
    
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickFormat(d3.format("d"))
            .ticks(xAxisTicks)
        );
    
    // Add Y axis with improved styling
    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y)
            .ticks(5)
            .tickFormat(d => d)
        );
    
    // Add X axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text("Year");
    
    // Add Y axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .text("Number of Incidents");
    
    // Add legend with improved interactive features
    // On small screens, make the legend more compact
    const legendX = width < 500 ? 10 : width - 150;
    const legendY = width < 500 ? height + 30 : 0;
    
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${legendX}, ${legendY})`);
    
    // Add legend background for better readability
    if (width >= 500) {
        legend.append("rect")
            .attr("width", 140)
            .attr("height", manufacturers.length * 20 + 10)
            .attr("fill", "white")
            .attr("opacity", 0.8)
            .attr("rx", 5)
            .attr("ry", 5);
    }
    
    // For smaller screens, create a horizontal legend instead of vertical
    const legendItems = legend.selectAll(".legend-item")
        .data(manufacturers)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => {
            if (width < 500) {
                // Horizontal layout for small screens
                return `translate(${i * (width / manufacturers.length)}, 0)`;
            } else {
                // Vertical layout for larger screens
                return `translate(10, ${i * 20 + 10})`;
            }
        })
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            toggleManufacturer(d);
        });
    
    legendItems.append("rect")
        .attr("width", 13)
        .attr("height", 13)
        .attr("fill", d => colorScale(d))
        .attr("stroke", d => selectedManufacturers.includes(d) ? "#000" : "none")
        .attr("stroke-width", 2)
        .attr("rx", 2)
        .attr("ry", 2);
    
    legendItems.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(d => width < 500 && d === "McDonnell Douglas" ? "McDonnell" : d) // Shorten long names on mobile
        .style("font-size", width < 500 ? "10px" : "12px");
}

// Create the stacked bar chart for flight phases and severity
function createBarChart() {
    // Clear any existing chart
    d3.select("#phaseBarchart").html("");
    
    // Get processed data
    const { phaseData } = processData();
    
    // Get current container dimensions
    const container = document.querySelector("#phaseBarchart").parentElement;
    const containerWidth = container.clientWidth;
    
    // Adjust dimensions based on container width
    width = containerWidth - margin.left - margin.right;
    height = Math.min(width * 0.6, 600) - margin.top - margin.bottom;
    
    // Skip if no data after filtering
    if (phaseData.length === 0) {
        d3.select("#phaseBarchart")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("text")
            .attr("x", (width + margin.left + margin.right) / 2)
            .attr("y", (height + margin.top + margin.bottom) / 2)
            .attr("text-anchor", "middle")
            .text("No data available for the selected filters");
        return;
    }
    
    // Create SVG container
    const svg = d3.select("#phaseBarchart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add title
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .text("Incidents by Flight Phase and Severity");
    
    // Limit the number of phases to show on small screens
    let displayPhaseData = phaseData;
    if (width < 500 && phaseData.length > 5) {
        displayPhaseData = phaseData.slice(0, 5);
    }
    
    // Set scales
    const x = d3.scaleBand()
        .domain(displayPhaseData.map(d => d.phase))
        .range([0, width])
        .padding(0.3);
    
    const maxTotal = d3.max(displayPhaseData, d => 
        severityCategories.reduce((sum, severity) => sum + d[severity], 0)
    ) || 0;
    
    const y = d3.scaleLinear()
        .domain([0, maxTotal * 1.1])
        .range([height, 0])
        .nice();
    
    // Filter the severity categories based on the selected severities
    const activeSeverities = severityCategories.filter(s => selectedSeverities.includes(s));
    
    // Create stacked data
    const stack = d3.stack()
        .keys(activeSeverities)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);
    
    const stackedData = stack(displayPhaseData);
    
    // Add grid lines for better readability
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "2,2");
    
    // Create a group for bars
    const barsGroup = svg.append("g")
        .attr("class", "bars-group");
    
    // Draw stacked bars with animation
    const severityGroups = barsGroup.selectAll("g")
        .data(stackedData)
        .enter()
        .append("g")
        .attr("fill", d => severityColorScale(d.key));
    
    severityGroups.selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.data.phase))
        .attr("y", height) // Start from bottom for animation
        .attr("height", 0)  // Start with height 0 for animation
        .attr("width", x.bandwidth())
        .transition()
        .duration(transitionDuration)
        .delay((d, i) => i * 50)
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]));
    
    // Add event listeners to bars after transition
    severityGroups.selectAll("rect")
        .on("mouseover", handleBarHover)
        .on("mouseout", handleBarMouseout)
        .on("click", handleBarClick);
    
    // Add X axis with improved styling
    const xAxis = svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    
    // Rotate x-axis labels if on mobile
    if (width < 500) {
        xAxis.selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");
    } else {
        xAxis.selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-20)");
    }
    
    // Add Y axis with improved styling
    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y)
            .ticks(5)
        );
    
    // Add X axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom)
        .text("Flight Phase");
    
    // Add Y axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .text("Number of Incidents");
    
    // Add stacked bar chart legend
    // On small screens, make the legend more compact
    const legendX = width < 500 ? 10 : width - 150;
    const legendY = width < 500 ? height + 30 : 0;
    
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${legendX}, ${legendY})`);
    
    // Add legend background
    if (width >= 500) {
        legend.append("rect")
            .attr("width", 140)
            .attr("height", severityCategories.length * 20 + 10)
            .attr("fill", "white")
            .attr("opacity", 0.8)
            .attr("rx", 5)
            .attr("ry", 5);
    }
    
    // Create legend items
    const legendItems = legend.selectAll(".legend-item")
        .data(severityCategories)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => {
            if (width < 500) {
                // Horizontal layout for small screens
                return `translate(${i * (width / severityCategories.length)}, 0)`;
            } else {
                // Vertical layout for larger screens
                return `translate(10, ${i * 20 + 10})`;
            }
        })
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            toggleSeverity(d);
        });
    
    legendItems.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => severityColorScale(d))
        .attr("stroke", d => selectedSeverities.includes(d) ? "#000" : "none")
        .attr("stroke-width", 2)
        .attr("rx", 2)
        .attr("ry", 2);
    
    legendItems.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(d => width < 500 && d === "UNAVAILABLE" ? "N/A" : d) // Shorter text on small screens
        .style("font-size", width < 500 ? "10px" : "12px");
}

// Event handlers for interactive elements
function handlePointHover(event, d, manufacturer, element) {
    // Highlight the point
    d3.select(element)
        .transition()
        .duration(200)
        .attr("r", 7)
        .attr("stroke-width", 2)
        .style("opacity", 1);
    
    // Emphasize the line
    d3.select(`.line-${manufacturer.replace(/\s+/g, '-')}`)
        .transition()
        .duration(200)
        .attr("stroke-width", 4);
    
    // Get related incidents for this manufacturer and year
    const yearIncidents = filteredData.filter(incident => 
        +incident.Event_Year === d.year && incident.Make === manufacturer
    );
    
    // Count incident severity
    const fatalCount = yearIncidents.filter(i => i.Injury_Severity === "FATAL").length;
    const nonFatalCount = yearIncidents.filter(i => i.Injury_Severity === "NON-FATAL").length;
    const incidentCount = yearIncidents.filter(i => i.Injury_Severity === "INCIDENT").length;
    
    // Create tooltip content with enhanced formatting
    let tooltipContent = `
        <div class="tooltip-header" style="background-color: ${colorScale(manufacturer)}; color: white; padding: 5px; border-radius: 4px 4px 0 0;">
            <strong>${manufacturer}</strong> in <strong>${d.year}</strong>
        </div>
        <div class="tooltip-body" style="padding: 8px;">
            <p><strong>${d.value}</strong> Total Incidents</p>
            <div class="tooltip-severity">
                <div style="margin: 5px 0;"><span style="display: inline-block; width: 12px; height: 12px; background-color: ${severityColorScale('FATAL')}; margin-right: 5px;"></span> Fatal: <strong>${fatalCount}</strong></div>
                <div style="margin: 5px 0;"><span style="display: inline-block; width: 12px; height: 12px; background-color: ${severityColorScale('NON-FATAL')}; margin-right: 5px;"></span> Non-Fatal: <strong>${nonFatalCount}</strong></div>
                <div style="margin: 5px 0;"><span style="display: inline-block; width: 12px; height: 12px; background-color: ${severityColorScale('INCIDENT')}; margin-right: 5px;"></span> Incident: <strong>${incidentCount}</strong></div>
            </div>
        </div>
    `;
    
    // Show tooltip with position adjustments for mobile
    const isMobile = window.innerWidth < 768;
    const tooltipX = isMobile ? 
        Math.min(event.pageX, window.innerWidth - 200) : 
        event.pageX + 10;
    const tooltipY = isMobile ? 
        event.pageY - 10 - (document.querySelector('.tooltip').offsetHeight || 0) : 
        event.pageY - 10;
    
    tooltip.transition()
        .duration(200)
        .style("opacity", 0.95);
    
    tooltip.html(tooltipContent)
        .style("left", tooltipX + "px")
        .style("top", tooltipY + "px");
}

function handlePointMouseout() {
    // Reset point size
    d3.select(this)
        .transition()
        .duration(200)
        .attr("r", width < 500 ? 4 : 5)
        .attr("stroke-width", 1.5)
        .style("opacity", 0.8);
    
    // Reset line thickness
    d3.selectAll(".line-path")
        .transition()
        .duration(200)
        .attr("stroke-width", 3);
    
    // Hide tooltip
    tooltip.transition()
        .duration(300)
        .style("opacity", 0);
}

function handleBarHover(event, d) {
    // Highlight the bar
    d3.select(this)
        .transition()
        .duration(200)
        .style("opacity", 0.8)
        .attr("stroke", "#000")
        .attr("stroke-width", 2);
    
    // Get the parent group to determine severity
    const severityKey = d3.select(this.parentNode).datum().key;
    
    // Calculate values for tooltip
    const segmentValue = d[1] - d[0];
    const totalForPhase = severityCategories.reduce((sum, s) => sum + d.data[s], 0);
    const percentage = Math.round((segmentValue / totalForPhase) * 100);
    
    // Create enhanced tooltip content
    let tooltipContent = `
        <div class="tooltip-header" style="background-color: ${severityColorScale(severityKey)}; color: white; padding: 5px; border-radius: 4px 4px 0 0;">
            <strong>${d.data.phase} Phase - ${severityKey}</strong>
        </div>
        <div class="tooltip-body" style="padding: 8px;">
            <p><strong>${segmentValue}</strong> Incidents (${percentage}% of phase)</p>
            <p>Years: <strong>${yearRange[0]}-${yearRange[1]}</strong></p>
            ${selectedManufacturers.length < manufacturers.length ? 
                `<p>Manufacturers: <strong>${selectedManufacturers.join(", ")}</strong></p>` : ''}
        </div>
    `;
    
    // Show tooltip with position adjustments for mobile
    const isMobile = window.innerWidth < 768;
    const tooltipX = isMobile ? 
        Math.min(event.pageX, window.innerWidth - 200) : 
        event.pageX + 10;
    const tooltipY = isMobile ? 
        event.pageY - 10 - (document.querySelector('.tooltip').offsetHeight || 0) : 
        event.pageY - 10;
    
    tooltip.transition()
        .duration(200)
        .style("opacity", 0.95);
    
    tooltip.html(tooltipContent)
        .style("left", tooltipX + "px")
        .style("top", tooltipY + "px");
}

function handleBarMouseout() {
    // Remove highlight
    d3.select(this)
        .transition()
        .duration(200)
        .style("opacity", 1)
        .attr("stroke", "none");
    
    // Hide tooltip
    tooltip.transition()
        .duration(300)
        .style("opacity", 0);
}

function handleBarClick(event, d) {
    // Get the phase from the data
    const phase = d.data.phase;
    
    // Update the phase filter
    d3.select("#phaseFilter").property("value", phase);
    selectedPhase = phase;
    
    // Update visualizations
    updateVisualizations();
}

// Toggle a manufacturer in the selected list
function toggleManufacturer(manufacturer) {
    if (selectedManufacturers.includes(manufacturer)) {
        // Don't allow deselecting all manufacturers
        if (selectedManufacturers.length > 1) {
            selectedManufacturers = selectedManufacturers.filter(m => m !== manufacturer);
        }
    } else {
        selectedManufacturers.push(manufacturer);
    }
    
    // Update the checkbox state
    updateManufacturerCheckboxes();
    
    // Update visualizations
    updateVisualizations();
}

// Toggle a severity in the selected list
function toggleSeverity(severity) {
    if (selectedSeverities.includes(severity)) {
        // Don't allow deselecting all severities
        if (selectedSeverities.length > 1) {
            selectedSeverities = selectedSeverities.filter(s => s !== severity);
        }
    } else {
        selectedSeverities.push(severity);
    }
    
    // Update the checkbox state
    updateSeverityCheckboxes();
    
    // Update visualizations
    updateVisualizations();
}

// Update manufacturer checkboxes to match the selected manufacturers
function updateManufacturerCheckboxes() {
    manufacturers.forEach(manufacturer => {
        const checkboxId = `#mfr-${manufacturer.replace(/\s+/g, '-')}`;
        const isSelected = selectedManufacturers.includes(manufacturer);
        d3.select(checkboxId).property("checked", isSelected);
    });
}

// Update severity checkboxes to match the selected severities
function updateSeverityCheckboxes() {
    severityCategories.forEach(severity => {
        const isSelected = selectedSeverities.includes(severity);
        d3.select(`#sev-${severity}`).property("checked", isSelected);
    });
}

// Set up cross-filtering between visualizations
function setupCrossFiltering() {
    // When a year is selected in the line chart, filter the bar chart to that year
    d3.select("#incidentsLineChart").on("click", ".data-circle", function(event, d) {
        // Update the year range to just this year
        yearRange = [d.year, d.year];
        
        // Update sliders
        d3.select("#yearSliderMin").property("value", d.year);
        d3.select("#yearSliderMax").property("value", d.year);
        d3.select("#yearMin").text(d.year);
        d3.select("#yearMax").text(d.year);
        
        // Update slider track
        updateSliderTrack();
        
        // Update visualizations
        updateVisualizations();
    });
}

// Set up event listeners for interactive elements
function setupEventListeners() {
    // Manufacturer checkboxes
    d3.selectAll("#manufacturerCheckboxes input[type='checkbox']").on("change", function() {
        // Get all selected manufacturers
        selectedManufacturers = [];
        d3.selectAll("#manufacturerCheckboxes input[type='checkbox']:checked").each(function() {
            selectedManufacturers.push(this.value);
        });
        
        // If none are selected, reselect the one that was just unchecked
        if (selectedManufacturers.length === 0) {
            this.checked = true;
            selectedManufacturers.push(this.value);
        }
        
        updateVisualizations();
    });
    
    // Severity checkboxes
    d3.selectAll("#severityCheckboxes input[type='checkbox']").on("change", function() {
        // Get all selected severities
        selectedSeverities = [];
        d3.selectAll("#severityCheckboxes input[type='checkbox']:checked").each(function() {
            selectedSeverities.push(this.value);
        });
        
        // If none are selected, reselect the one that was just unchecked
        if (selectedSeverities.length === 0) {
            this.checked = true;
            selectedSeverities.push(this.value);
        }
        
        updateVisualizations();
    });
    
    // Flight phase filter
    d3.select("#phaseFilter").on("change", function() {
        selectedPhase = this.value;
        updateVisualizations();
    });
    
    // Year range sliders
    const sliderMin = d3.select("#yearSliderMin");
    const sliderMax = d3.select("#yearSliderMax");
    const sliderTrack = d3.select("#sliderTrack");
    
    sliderMin.on("input", function() {
        // Ensure min doesn't exceed max
        const min = +this.value;
        const max = +sliderMax.property("value");
        
        if (min > max) {
            sliderMax.property("value", min);
            yearRange = [min, min];
        } else {
            yearRange = [min, max];
        }
        
        // Update the displayed year values and slider track
        d3.select("#yearMin").text(yearRange[0]);
        d3.select("#yearMax").text(yearRange[1]);
        updateSliderTrack();
    });
    
    sliderMax.on("input", function() {
        // Ensure max isn't less than min
        const min = +sliderMin.property("value");
        const max = +this.value;
        
        if (max < min) {
            sliderMin.property("value", max);
            yearRange = [max, max];
        } else {
            yearRange = [min, max];
        }
        
        // Update the displayed year values and slider track
        d3.select("#yearMin").text(yearRange[0]);
        d3.select("#yearMax").text(yearRange[1]);
        updateSliderTrack();
    });
    
    // Update both visualizations when year range changes
    sliderMin.on("change", updateVisualizations);
    sliderMax.on("change", updateVisualizations);
    
    // Add button functionality for year range
    d3.select("#yearRangeReset").on("click", function() {
        yearRange = [1995, 2016];
        sliderMin.property("value", 1995);
        sliderMax.property("value", 2016);
        d3.select("#yearMin").text(1995);
        d3.select("#yearMax").text(2016);
        updateSliderTrack();
        updateVisualizations();
    });
    
    d3.select("#yearRangeLast5").on("click", function() {
        yearRange = [2012, 2016];
        sliderMin.property("value", 2012);
        sliderMax.property("value", 2016);
        d3.select("#yearMin").text(2012);
        d3.select("#yearMax").text(2016);
        updateSliderTrack();
        updateVisualizations();
    });
    
    d3.select("#yearRangeFirst5").on("click", function() {
        yearRange = [1995, 1999];
        sliderMin.property("value", 1995);
        sliderMax.property("value", 1999);
        d3.select("#yearMin").text(1995);
        d3.select("#yearMax").text(1999);
        updateSliderTrack();
        updateVisualizations();
    });
}

// Function to update the slider track position
function updateSliderTrack() {
    const sliderMin = d3.select("#yearSliderMin");
    const sliderMax = d3.select("#yearSliderMax");
    const sliderTrack = d3.select("#sliderTrack");
    
    const minVal = +sliderMin.property("value");
    const maxVal = +sliderMax.property("value");
    const minPos = ((minVal - 1995) / (2016 - 1995)) * 100;
    const maxPos = ((maxVal - 1995) / (2016 - 1995)) * 100;
    
    sliderTrack.style("left", minPos + "%")
        .style("width", (maxPos - minPos) + "%");
}

// Update all visualizations based on current filters
function updateVisualizations() {
    // Add loading indicator
    d3.selectAll("#incidentsLineChart, #phaseBarchart").each(function() {
        const svg = d3.select(this);
        svg.append("text")
            .attr("class", "loading-text")
            .attr("x", svg.attr("width") / 2)
            .attr("y", svg.attr("height") / 2)
            .attr("text-anchor", "middle")
            .text("Updating visualization...");
    });
    
    // Use setTimeout to allow the loading text to render before heavy processing
    setTimeout(() => {
        createLineChart();
        createBarChart();
    }, 50);
}
