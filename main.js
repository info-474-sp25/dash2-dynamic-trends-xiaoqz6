// Global variables
const margin = { top: 50, right: 80, bottom: 60, left: 70 }; 
const width = 700 - margin.left - margin.right; 
const height = 400 - margin.top - margin.bottom;

// Define manufacturers
const manufacturers = ["Boeing", "McDonnell Douglas", "Airbus", "Embraer", "Bombardier"];

// Define colors for manufacturers - match the colors in the reference image
const colorScale = d3.scaleOrdinal()
    .domain(manufacturers)
    .range(["#e41a1c", "#ff7f00", "#377eb8", "#4daf4a", "#ffff33"]);

// Define injury severity categories and colors
const severityCategories = ["FATAL", "NON-FATAL", "INCIDENT", "UNAVAILABLE"];
const severityColorScale = d3.scaleOrdinal()
    .domain(severityCategories)
    .range(["#003f5c", "#bc5090", "#ff6361", "#ffa600"]);

// Create tooltip element
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

// Load data and initialize visualizations
d3.csv("aircraft_incidents_cleaned.csv").then(data => {
    // Store the raw data
    rawData = data;
    
    // Initial data processing
    processData();
    
    // Create visualizations
    createLineChart();
    createBarChart();
    
    // Set up event listeners for filters
    setupEventListeners();
});

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
    
    // Create SVG container
    const svg = d3.select("#incidentsLineChart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Set scales
    const x = d3.scaleLinear()
        .domain([yearRange[0], yearRange[1]])
        .range([0, width]);
    
    const maxIncidents = d3.max(timeSeriesData, d => 
        Math.max(...manufacturers.map(m => d[m]))
    );
    
    const y = d3.scaleLinear()
        .domain([0, Math.max(100, maxIncidents * 1.1)]) // Ensure we always see up to at least 100
        .range([height, 0]);
    
    // Create line generator
    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX); // Smoother curve
    
    // Add grid lines
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickSize(-height)
            .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "2,2");
    
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "2,2");
    
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
        
        // Add the line
        svg.append("path")
            .datum(manufacturerData)
            .attr("class", `line-${manufacturer}`)
            .attr("fill", "none")
            .attr("stroke", colorScale(manufacturer))
            .attr("stroke-width", 2.5)
            .attr("d", line);
        
        // Add dots for data points
        svg.selectAll(`dot-${manufacturer}`)
            .data(manufacturerData)
            .enter()
            .append("circle")
            .attr("class", `dot-${manufacturer}`)
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.value))
            .attr("r", 5)
            .attr("fill", colorScale(manufacturer))
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .style("opacity", 0.8)
            .on("mouseover", function(event, d) {
                // Enlarge this point
                d3.select(this)
                    .attr("r", 7)
                    .attr("stroke-width", 2)
                    .style("opacity", 1);
                
                // Show tooltip
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                
                // Get related incidents for this manufacturer and year
                const yearIncidents = filteredData.filter(incident => 
                    +incident.Event_Year === d.year && incident.Make === manufacturer
                );
                
                // Count incident severity
                const fatalCount = yearIncidents.filter(i => i.Injury_Severity === "FATAL").length;
                const nonFatalCount = yearIncidents.filter(i => i.Injury_Severity === "NON-FATAL").length;
                
                // Create tooltip content
                let tooltipContent = `
                    <h4>${manufacturer} in ${d.year}</h4>
                    <p>Total Incidents: <strong>${d.value}</strong></p>
                    <p>Fatal Incidents: <strong>${fatalCount}</strong></p>
                    <p>Non-Fatal Incidents: <strong>${nonFatalCount}</strong></p>
                `;
                
                // Set tooltip content and position
                tooltip.html(tooltipContent)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 30) + "px");
            })
            .on("mouseout", function() {
                // Reset point size
                d3.select(this)
                    .attr("r", 5)
                    .attr("stroke-width", 1.5)
                    .style("opacity", 0.8);
                
                // Hide tooltip
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    });
    
    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickFormat(d3.format("d"))
            .ticks(11)
        )
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
    
    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(y));
    
    // Add X axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 5)
        .text("Year");
    
    // Add Y axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .text("Number of Incidents");
    
    // Add legend
    const legend = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .selectAll("g")
        .data(manufacturers)
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0,${i * 20})`)
        .on("click", function(event, d) {
            // Toggle the manufacturer in the selected list
            if (selectedManufacturers.includes(d)) {
                // Don't allow deselecting all manufacturers
                if (selectedManufacturers.length > 1) {
                    selectedManufacturers = selectedManufacturers.filter(m => m !== d);
                }
            } else {
                selectedManufacturers.push(d);
            }
            
            // Update the checkbox state
            updateManufacturerCheckboxes();
            
            // Update both visualizations
            updateVisualizations();
        });
    
    legend.append("rect")
        .attr("x", width - 19)
        .attr("width", 19)
        .attr("height", 19)
        .attr("fill", colorScale)
        .attr("stroke", d => selectedManufacturers.includes(d) ? "#000" : "none")
        .attr("stroke-width", 2);
    
    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9.5)
        .attr("dy", "0.32em")
        .text(d => d);
}

// Create the stacked bar chart for flight phases and severity
function createBarChart() {
    // Clear any existing chart
    d3.select("#phaseBarchart").html("");
    
    // Get processed data
    const { phaseData } = processData();
    
    // Skip if no data after filtering
    if (phaseData.length === 0) {
        d3.select("#phaseBarchart")
            .append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
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
    
    // Set scales
    const x = d3.scaleBand()
        .domain(phaseData.map(d => d.phase))
        .range([0, width])
        .padding(0.3);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(phaseData, d => 
            severityCategories.reduce((sum, severity) => sum + d[severity], 0)
        ) * 1.1])
        .range([height, 0]);
    
    // Filter the severity categories based on the selected severities
    const activeSeverities = severityCategories.filter(s => selectedSeverities.includes(s));
    
    // Create stacked data
    const stack = d3.stack()
        .keys(activeSeverities)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);
    
    const stackedData = stack(phaseData);
    
    // Add grid lines
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "2,2");
    
    // Draw stacked bars
    svg.append("g")
        .selectAll("g")
        .data(stackedData)
        .enter()
        .append("g")
        .attr("fill", d => severityColorScale(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.data.phase))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .on("mouseover", function(event, d) {
            // Highlight the bar
            d3.select(this)
                .attr("stroke", "#000")
                .attr("stroke-width", 2);
            
            // Determine the severity from the parent
            const severity = d3.select(this.parentNode).datum().key;
            
            // Show tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            
            // Get the count for this segment
            const segmentValue = d[1] - d[0];
            const totalForPhase = severityCategories.reduce((sum, s) => sum + d.data[s], 0);
            const percentage = Math.round((segmentValue / totalForPhase) * 100);
            
            // Create tooltip content
            let tooltipContent = `
                <h4>${d.data.phase} Phase - ${severity}</h4>
                <p>Incidents: <strong>${segmentValue}</strong> (${percentage}% of phase)</p>
                <p>Years: <strong>${yearRange[0]}-${yearRange[1]}</strong></p>
            `;
            
            // Add manufacturer breakdown if applicable
            if (selectedManufacturers.length < manufacturers.length) {
                tooltipContent += `<p>Manufacturers: <strong>${selectedManufacturers.join(", ")}</strong></p>`;
            }
            
            // Set tooltip content and position
            tooltip.html(tooltipContent)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            // Remove highlight
            d3.select(this)
                .attr("stroke", "none");
            
            // Hide tooltip
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
    
    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(y));
    
    // Add X axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 5)
        .text("Flight Phase");
    
    // Add Y axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .text("Number of Incidents");
    
    // Add legend
    const legend = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .selectAll("g")
        .data(severityCategories)
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0,${i * 20})`)
        .on("click", function(event, d) {
            // Toggle the severity in the selected list
            if (selectedSeverities.includes(d)) {
                // Don't allow deselecting all severities
                if (selectedSeverities.length > 1) {
                    selectedSeverities = selectedSeverities.filter(s => s !== d);
                }
            } else {
                selectedSeverities.push(d);
            }
            
            // Update the checkbox state
            updateSeverityCheckboxes();
            
            // Update both visualizations
            updateVisualizations();
        });
    
    legend.append("rect")
        .attr("x", width - 19)
        .attr("width", 19)
        .attr("height", 19)
        .attr("fill", severityColorScale)
        .attr("stroke", d => selectedSeverities.includes(d) ? "#000" : "none")
        .attr("stroke-width", 2);
    
    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9.5)
        .attr("dy", "0.32em")
        .text(d => d);
}

// Update manufacturer checkboxes to match the selected manufacturers
function updateManufacturerCheckboxes() {
    manufacturers.forEach(manufacturer => {
        const isSelected = selectedManufacturers.includes(manufacturer);
        d3.select(`#mfr-${manufacturer.replace(/\s+/g, '-')}`).property("checked", isSelected);
    });
}

// Update severity checkboxes to match the selected severities
function updateSeverityCheckboxes() {
    severityCategories.forEach(severity => {
        const isSelected = selectedSeverities.includes(severity);
        d3.select(`#sev-${severity}`).property("checked", isSelected);
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
    
    // Function to update the slider track position
    function updateSliderTrack() {
        const minVal = +sliderMin.property("value");
        const maxVal = +sliderMax.property("value");
        const minPos = ((minVal - 1995) / (2016 - 1995)) * 100;
        const maxPos = ((maxVal - 1995) / (2016 - 1995)) * 100;
        
        sliderTrack.style("left", minPos + "%")
            .style("width", (maxPos - minPos) + "%");
    }
    
    // Initialize the slider track
    updateSliderTrack();
    
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
        updateYearRangeDisplay();
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
        updateYearRangeDisplay();
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
        updateYearRangeDisplay();
        updateVisualizations();
    });
    
    d3.select("#yearRangeLast5").on("click", function() {
        yearRange = [2012, 2016];
        sliderMin.property("value", 2012);
        sliderMax.property("value", 2016);
        d3.select("#yearMin").text(2012);
        d3.select("#yearMax").text(2016);
        updateSliderTrack();
        updateYearRangeDisplay();
        updateVisualizations();
    });
    
    d3.select("#yearRangeFirst5").on("click", function() {
        yearRange = [1995, 1999];
        sliderMin.property("value", 1995);
        sliderMax.property("value", 1999);
        d3.select("#yearMin").text(1995);
        d3.select("#yearMax").text(1999);
        updateSliderTrack();
        updateYearRangeDisplay();
        updateVisualizations();
    });
    
    // Implement cross-chart filtering
    // When clicking on a bar in the bar chart, filter the line chart to that phase
    d3.select("#phaseBarchart").on("click", ".bar", function(event, d) {
        const phase = d.data.phase;
        d3.select("#phaseFilter").property("value", phase);
        selectedPhase = phase;
        updateVisualizations();
    });
}

// Update the year range display
function updateYearRangeDisplay() {
    d3.select("#selectedYearRange").text(`${yearRange[0]} - ${yearRange[1]}`);
}

// Update all visualizations based on current filters
function updateVisualizations() {
    createLineChart();
    createBarChart();
}