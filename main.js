// Global variables
let aircraftData = []
let selectedManufacturers = []
let selectedPhase = "all"
let selectedSeverities = ["FATAL", "NON-FATAL", "INCIDENT", "UNAVAILABLE"]
let yearRange = [1995, 2016]
let width, height, margin

// Initialize manufacturers and colors based on actual data
let manufacturers = []
let colorScale

// Severity categories and colors
const severityCategories = ["FATAL", "NON-FATAL", "INCIDENT", "UNAVAILABLE"]
const severityColors = {
  FATAL: "#003f5c",
  "NON-FATAL": "#bc5090",
  INCIDENT: "#ff6361",
  UNAVAILABLE: "#ffa600",
}

// Set up tooltip
const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0)

// Load and process the actual CSV data
function loadData() {
  console.log("Loading aircraft incidents data...")

  d3.csv("aircraft_incidents_cleaned.csv")
    .then((data) => {
      console.log("CSV data loaded successfully:", data.length, "records")

      // Process and clean the data
      aircraftData = data
        .map((d) => {
          // Parse the Event_Date
          let eventDate = new Date(d.Event_Date)
          let year = eventDate.getFullYear()

          // If Event_Year is available, use it as backup
          if (d.Event_Year && (!year || isNaN(year))) {
            year = Number.parseInt(d.Event_Year)
            eventDate = new Date(year, 0, 1) // Default to Jan 1st if only year is available
          }

          return {
            Accident_Number: d.Accident_Number,
            Event_Date: eventDate,
            Year: year,
            Location: d.Location,
            Country: d.Country,
            Make: d.Make || "Unknown",
            Model: d.Model,
            Injury_Severity: d.Injury_Severity || "UNAVAILABLE",
            Aircraft_Damage: d.Aircraft_Damage,
            Broad_Phase: d.Broad_Phase_of_Flight || "UNKNOWN",
            Air_Carrier: d.Air_Carrier,
            Total_Fatal_Injuries: Number.parseInt(d.Total_Fatal_Injuries) || 0,
            Total_Serious_Injuries: Number.parseInt(d.Total_Serious_Injuries) || 0,
            Total_Uninjured: Number.parseFloat(d.Total_Uninjured) || 0,
            Weather_Condition: d.Weather_Condition,
            Airport_Code: d.Airport_Code,
            Airport_Name: d.Airport_Name,
          }
        })
        .filter((d) => d.Year && d.Year >= 1995 && d.Year <= 2016) // Filter valid years

      console.log("Processed data:", aircraftData.length, "records")

      // Extract unique manufacturers from the data
      manufacturers = [...new Set(aircraftData.map((d) => d.Make))].filter((make) => make && make !== "Unknown").sort()

      console.log("Found manufacturers:", manufacturers)

      // Set up color scale for manufacturers
      colorScale = d3.scaleOrdinal().domain(manufacturers).range(d3.schemeCategory10)

      // Initialize selected manufacturers (start with top 5 by incident count)
      const manufacturerCounts = {}
      aircraftData.forEach((d) => {
        if (manufacturers.includes(d.Make)) {
          manufacturerCounts[d.Make] = (manufacturerCounts[d.Make] || 0) + 1
        }
      })

      selectedManufacturers = Object.entries(manufacturerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([make]) => make)

      console.log("Selected manufacturers:", selectedManufacturers)

      // Update year range based on actual data
      const years = aircraftData.map((d) => d.Year).filter((y) => y)
      const minYear = Math.min(...years)
      const maxYear = Math.max(...years)
      yearRange = [minYear, maxYear]

      console.log("Year range:", yearRange)

      // Update UI elements
      updateManufacturerFilters()
      updateYearRangeSliders()

      initializeVisualization()
    })
    .catch((error) => {
      console.error("Error loading CSV data:", error)
      // Show error message in the charts
      showErrorMessage("Failed to load data. Please check the console for details.")
    })
}

// Update manufacturer filter UI based on actual data
function updateManufacturerFilters() {
  const manufacturerContainer = d3.select(".widget-buttons").selectAll("[data-manufacturer]").remove()

  // Add manufacturer buttons
  const manufacturerButtons = d3
    .select(".widget-buttons")
    .selectAll(".manufacturer-button")
    .data(manufacturers.slice(0, 10)) // Show top 10 manufacturers
    .enter()
    .append("button")
    .attr("class", "widget-button manufacturer-button")
    .attr("data-manufacturer", (d) => d)
    .classed("active", (d) => selectedManufacturers.includes(d))
    .text((d) => d)
    .on("click", (event, d) => {
      toggleManufacturer(d)
    })
}

// Update year range sliders based on actual data
function updateYearRangeSliders() {
  const yearSliderMin = document.getElementById("yearSliderMin")
  const yearSliderMax = document.getElementById("yearSliderMax")
  const yearMinDisplay = document.getElementById("yearMin")
  const yearMaxDisplay = document.getElementById("yearMax")

  if (yearSliderMin && yearSliderMax) {
    yearSliderMin.min = yearRange[0]
    yearSliderMin.max = yearRange[1]
    yearSliderMin.value = yearRange[0]

    yearSliderMax.min = yearRange[0]
    yearSliderMax.max = yearRange[1]
    yearSliderMax.value = yearRange[1]

    yearMinDisplay.textContent = yearRange[0]
    yearMaxDisplay.textContent = yearRange[1]
  }
}

// Show error message in charts
function showErrorMessage(message) {
  d3.select("#incidentsLineChart")
    .html("")
    .append("text")
    .attr("x", "50%")
    .attr("y", "50%")
    .attr("text-anchor", "middle")
    .attr("class", "error-message")
    .text(message)

  d3.select("#phaseBarchart")
    .html("")
    .append("text")
    .attr("x", "50%")
    .attr("y", "50%")
    .attr("text-anchor", "middle")
    .attr("class", "error-message")
    .text(message)
}

// Set up event listeners for filters
function setupEventListeners() {
  // Phase filter buttons
  d3.selectAll(".phase-buttons .widget-button").on("click", function () {
    const phase = d3.select(this).attr("data-phase")
    selectedPhase = phase
    d3.selectAll(".phase-buttons .widget-button").classed("active", false)
    d3.select(this).classed("active", true)
    updateVisualizations()
  })

  // Severity widget buttons
  d3.selectAll(".widget-buttons [data-severity]").on("click", function () {
    const severity = d3.select(this).attr("data-severity")
    toggleSeverity(severity)
    d3.select(this).classed("active", selectedSeverities.includes(severity))
  })

  // Year range sliders
  const yearSliderMin = document.getElementById("yearSliderMin")
  const yearSliderMax = document.getElementById("yearSliderMax")
  const yearMinDisplay = document.getElementById("yearMin")
  const yearMaxDisplay = document.getElementById("yearMax")
  const sliderTrack = document.getElementById("sliderTrack")

  function updateSliderTrack() {
    const min = Number.parseInt(yearSliderMin.value)
    const max = Number.parseInt(yearSliderMax.value)
    const range = yearSliderMax.max - yearSliderMax.min
    const percentMin = ((min - yearSliderMin.min) / range) * 100
    const percentMax = ((max - yearSliderMin.min) / range) * 100

    sliderTrack.style.left = percentMin + "%"
    sliderTrack.style.width = percentMax - percentMin + "%"
  }

  if (yearSliderMin && yearSliderMax) {
    yearSliderMin.addEventListener("input", () => {
      const minVal = Number.parseInt(yearSliderMin.value)
      const maxVal = Number.parseInt(yearSliderMax.value)

      if (minVal > maxVal - 1) {
        yearSliderMin.value = maxVal - 1
        return
      }

      yearMinDisplay.textContent = yearSliderMin.value
      yearRange[0] = Number.parseInt(yearSliderMin.value)
      updateSliderTrack()
      updateVisualizations()
    })

    yearSliderMax.addEventListener("input", () => {
      const minVal = Number.parseInt(yearSliderMin.value)
      const maxVal = Number.parseInt(yearSliderMax.value)

      if (maxVal < minVal + 1) {
        yearSliderMax.value = minVal + 1
        return
      }

      yearMaxDisplay.textContent = yearSliderMax.value
      yearRange[1] = Number.parseInt(yearSliderMax.value)
      updateSliderTrack()
      updateVisualizations()
    })

    // Year range quick buttons
    document.getElementById("yearRangeFirst5")?.addEventListener("click", () => {
      const dataYears = [...new Set(aircraftData.map((d) => d.Year))].sort()
      yearRange = [dataYears[0], dataYears[4] || dataYears[dataYears.length - 1]]
      yearSliderMin.value = yearRange[0]
      yearSliderMax.value = yearRange[1]
      yearMinDisplay.textContent = yearRange[0]
      yearMaxDisplay.textContent = yearRange[1]
      updateSliderTrack()
      updateVisualizations()
    })

    document.getElementById("yearRangeLast5")?.addEventListener("click", () => {
      const dataYears = [...new Set(aircraftData.map((d) => d.Year))].sort()
      const len = dataYears.length
      yearRange = [dataYears[len - 5] || dataYears[0], dataYears[len - 1]]
      yearSliderMin.value = yearRange[0]
      yearSliderMax.value = yearRange[1]
      yearMinDisplay.textContent = yearRange[0]
      yearMaxDisplay.textContent = yearRange[1]
      updateSliderTrack()
      updateVisualizations()
    })

    document.getElementById("yearRangeReset")?.addEventListener("click", () => {
      const dataYears = [...new Set(aircraftData.map((d) => d.Year))].sort()
      yearRange = [dataYears[0], dataYears[dataYears.length - 1]]
      yearSliderMin.value = yearRange[0]
      yearSliderMax.value = yearRange[1]
      yearMinDisplay.textContent = yearRange[0]
      yearMaxDisplay.textContent = yearRange[1]
      updateSliderTrack()
      updateVisualizations()
    })

    updateSliderTrack()
  }
}

// Toggle a manufacturer in the selected list
function toggleManufacturer(manufacturer) {
  if (selectedManufacturers.includes(manufacturer)) {
    if (selectedManufacturers.length > 1) {
      selectedManufacturers = selectedManufacturers.filter((m) => m !== manufacturer)
    }
  } else {
    selectedManufacturers.push(manufacturer)
  }

  updateManufacturerButtons()
  updateVisualizations()
}

// Update manufacturer button states
function updateManufacturerButtons() {
  d3.selectAll("[data-manufacturer]").classed("active", function () {
    const manufacturer = d3.select(this).attr("data-manufacturer")
    return selectedManufacturers.includes(manufacturer)
  })
}

// Toggle a severity in the selected list
function toggleSeverity(severity) {
  if (selectedSeverities.includes(severity)) {
    if (selectedSeverities.length > 1) {
      selectedSeverities = selectedSeverities.filter((s) => s !== severity)
    }
  } else {
    selectedSeverities.push(severity)
  }

  updateSeverityButtons()
  updateVisualizations()
}

// Update severity button states
function updateSeverityButtons() {
  severityCategories.forEach((severity) => {
    const buttonSelector = `[data-severity="${severity}"]`
    const isSelected = selectedSeverities.includes(severity)
    d3.select(buttonSelector).classed("active", isSelected)
  })
}

// Process data based on current filters
function processData() {
  // Filter data by year range
  let filteredData = aircraftData.filter((d) => d.Year >= yearRange[0] && d.Year <= yearRange[1])

  // Filter by selected manufacturers
  filteredData = filteredData.filter((d) => selectedManufacturers.includes(d.Make))

  // Filter by selected phase if not "all"
  if (selectedPhase !== "all") {
    filteredData = filteredData.filter((d) => d.Broad_Phase === selectedPhase)
  }

  // Filter by selected severities
  filteredData = filteredData.filter((d) => selectedSeverities.includes(d.Injury_Severity))

  // Process data for line chart (incidents by year and manufacturer)
  const timeSeriesData = []
  const years = []
  for (let year = yearRange[0]; year <= yearRange[1]; year++) {
    years.push(year)
  }

  years.forEach((year) => {
    const yearData = { year }
    selectedManufacturers.forEach((manufacturer) => {
      yearData[manufacturer] = 0
    })
    timeSeriesData.push(yearData)
  })

  filteredData.forEach((d) => {
    const yearIndex = d.Year - yearRange[0]
    if (yearIndex >= 0 && yearIndex < timeSeriesData.length) {
      timeSeriesData[yearIndex][d.Make]++
    }
  })

  // Process data for bar chart (incidents by phase and severity)
  const phases = [...new Set(aircraftData.map((d) => d.Broad_Phase))].filter((p) => p && p !== "UNKNOWN").sort()
  const phaseData = []

  phases.forEach((phase) => {
    const phaseObj = { phase }
    severityCategories.forEach((severity) => {
      phaseObj[severity] = 0
    })
    phaseData.push(phaseObj)
  })

  filteredData.forEach((d) => {
    const phaseIndex = phases.indexOf(d.Broad_Phase)
    if (phaseIndex !== -1) {
      phaseData[phaseIndex][d.Injury_Severity]++
    }
  })

  return { timeSeriesData, phaseData, filteredData }
}

// Create line chart visualization
function createLineChart() {
  d3.select("#incidentsLineChart").html("")

  // Increase margins for better spacing
  margin = { top: 50, right: 140, bottom: 70, left: 70 }
  const container = document.getElementById("incidentsLineChart").parentElement
  const svgWidth = container.clientWidth - 30
  const svgHeight = 600 // Increased from 500
  width = svgWidth - margin.left - margin.right
  height = svgHeight - margin.top - margin.bottom

  const svg = d3
    .select("#incidentsLineChart")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  const { timeSeriesData } = processData()

  if (timeSeriesData.length === 0) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("class", "error-message")
      .text("No data available for selected filters")
    return
  }

  // Add grid lines for better readability
  svg
    .append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3
        .axisBottom(d3.scaleLinear().domain([yearRange[0], yearRange[1]]).range([0, width]))
        .tickSize(-height)
        .tickFormat(""),
    )

  svg
    .append("g")
    .attr("class", "grid")
    .call(
      d3
        .axisLeft(
          d3
            .scaleLinear()
            .domain([
              0,
              d3.max(timeSeriesData, (d) => d3.max(selectedManufacturers, (manufacturer) => d[manufacturer])) * 1.1,
            ])
            .range([height, 0]),
        )
        .tickSize(-width)
        .tickFormat(""),
    )

  const x = d3.scaleLinear().domain([yearRange[0], yearRange[1]]).range([0, width])

  const maxIncidents =
    d3.max(timeSeriesData, (d) => d3.max(selectedManufacturers, (manufacturer) => d[manufacturer])) || 0

  const y = d3
    .scaleLinear()
    .domain([0, Math.max(maxIncidents * 1.1, 1)])
    .range([height, 0])

  // Adjust number of ticks based on available width
  const tickCount = width < 500 ? 5 : Math.min(yearRange[1] - yearRange[0] + 1, 10)

  const xAxis = d3.axisBottom(x).tickFormat(d3.format("d")).ticks(tickCount)
  const yAxis = d3.axisLeft(y).ticks(8) // Increased ticks for better readability

  svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`).call(xAxis)
  svg.append("g").attr("class", "y-axis").call(yAxis)

  // Improved axis labels
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .style("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("Year")

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .style("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("Number of Incidents")

  const line = d3
    .line()
    .x((d) => x(d.year))
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX)

  // Add chart title
  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .style("font-weight", "bold")
    .text("Aircraft Incidents by Manufacturer Over Time")

  selectedManufacturers.forEach((manufacturer) => {
    const manufacturerData = timeSeriesData.map((d) => ({
      year: d.year,
      value: d[manufacturer],
    }))

    svg
      .append("path")
      .datum(manufacturerData)
      .attr("class", "line-path")
      .attr("d", line)
      .attr("stroke", colorScale(manufacturer))
      .attr("stroke-width", 3)
      .attr("fill", "none")

    svg
      .selectAll(`.point-${manufacturer.replace(/\s+/g, "-")}`)
      .data(manufacturerData)
      .enter()
      .append("circle")
      .attr("class", `data-circle point-${manufacturer.replace(/\s+/g, "-")}`)
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d.value))
      .attr("r", 5)
      .attr("fill", colorScale(manufacturer))
      .on("mouseover", (event, d) => {
        handlePointHover(event, d, manufacturer)
      })
      .on("mouseout", () => {
        tooltip.transition().duration(200).style("opacity", 0)
      })
  })

  // Create responsive legend
  const legendContainer = svg.append("g").attr("class", "legend-container")

  // Determine if legend should be on right side or bottom based on width
  const isWideScreen = width > 600

  if (isWideScreen) {
    // Side legend for wider screens
    legendContainer.attr("transform", `translate(${width + 20}, 10)`)

    selectedManufacturers.forEach((manufacturer, i) => {
      const legendItem = legendContainer
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", `translate(0, ${i * 30})`) // Increased spacing
        .on("click", () => {
          toggleManufacturer(manufacturer)
        })

      legendItem
        .append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", colorScale(manufacturer))
        .attr("rx", 3) // Rounded corners

      legendItem.append("text").attr("x", 28).attr("y", 14).text(manufacturer).style("font-size", "13px")
    })
  } else {
    // Bottom legend for narrower screens
    const legendY = height + 80
    legendContainer.attr("transform", `translate(0, ${legendY})`)

    // Adjust bottom margin to make room for legend
    svg.attr("transform", `translate(${margin.left}, ${margin.top - 30})`)

    const itemsPerRow = width < 400 ? 2 : 3
    const itemHeight = 25
    const itemWidth = width / itemsPerRow

    selectedManufacturers.forEach((manufacturer, i) => {
      const row = Math.floor(i / itemsPerRow)
      const col = i % itemsPerRow

      const legendItem = legendContainer
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", `translate(${col * itemWidth}, ${row * itemHeight})`)
        .on("click", () => {
          toggleManufacturer(manufacturer)
        })

      legendItem
        .append("rect")
        .attr("width", 16)
        .attr("height", 16)
        .attr("fill", colorScale(manufacturer))
        .attr("rx", 3)

      legendItem
        .append("text")
        .attr("x", 24)
        .attr("y", 13)
        .text(manufacturer)
        .style("font-size", "12px")
        .each(function () {
          // Truncate text if too long
          const self = d3.select(this)
          const text = self.text()
          const maxLength = itemWidth - 30
          const textWidth = this.getComputedTextLength()

          if (textWidth > maxLength) {
            let truncated = text
            while (truncated.length > 3 && this.getComputedTextLength() > maxLength) {
              truncated = truncated.slice(0, -1)
              self.text(truncated + "...")
            }
          }
        })
    })
  }

  // Add resize handler for responsive legend
  function updateChartOnResize() {
    const newWidth = container.clientWidth - 30
    if (newWidth !== svgWidth) {
      // Redraw the chart completely when size changes significantly
      createLineChart()
    }
  }

  // Add debounced resize listener
  let resizeTimeout
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(updateChartOnResize, 250)
  })
}

// Create bar chart visualization
function createBarChart() {
  d3.select("#phaseBarchart").html("")

  // Increase margins for better spacing
  margin = { top: 60, right: 40, bottom: 120, left: 70 } // Increased top margin
  const container = document.getElementById("phaseBarchart").parentElement
  const svgWidth = container.clientWidth - 30
  const svgHeight = 600 // Increased from 500
  width = svgWidth - margin.left - margin.right
  height = svgHeight - margin.top - margin.bottom

  const svg = d3
    .select("#phaseBarchart")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  let { phaseData } = processData()
  phaseData = phaseData.filter((d) => severityCategories.some((severity) => d[severity] > 0))

  if (phaseData.length === 0) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("class", "error-message")
      .text("No data available for selected filters")
    return
  }

  // Sort phases by total incidents for better visualization
  phaseData.sort((a, b) => {
    const totalA = severityCategories.reduce((sum, severity) => sum + a[severity], 0)
    const totalB = severityCategories.reduce((sum, severity) => sum + b[severity], 0)
    return totalB - totalA
  })

  // Add grid lines for better readability
  const maxIncidents = d3.max(phaseData, (d) => severityCategories.reduce((sum, severity) => sum + d[severity], 0)) || 0

  svg
    .append("g")
    .attr("class", "grid")
    .call(
      d3
        .axisLeft(
          d3
            .scaleLinear()
            .domain([0, maxIncidents * 1.1])
            .range([height, 0]),
        )
        .tickSize(-width)
        .tickFormat(""),
    )

  const x = d3
    .scaleBand()
    .domain(phaseData.map((d) => d.phase))
    .range([0, width])
    .padding(0.3)

  const y = d3
    .scaleLinear()
    .domain([0, Math.max(maxIncidents * 1.1, 1)])
    .range([height, 0])

  const xAxis = d3.axisBottom(x)
  const yAxis = d3.axisLeft(y).ticks(8) // Increased ticks for better readability

  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .style("font-size", "12px")

  svg.append("g").attr("class", "y-axis").call(yAxis)

  // Improved axis labels
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 70)
    .style("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("Flight Phase")

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .style("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("Number of Incidents")

  // Add chart title with better positioning
  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .style("font-weight", "bold")
    .text("Aircraft Incidents by Flight Phase and Severity")

  const stackedData = d3.stack().keys(severityCategories).order(d3.stackOrderNone).offset(d3.stackOffsetNone)(phaseData)

  const barGroups = svg
    .selectAll(".bar-group")
    .data(stackedData)
    .enter()
    .append("g")
    .attr("class", "bar-group")
    .attr("fill", (d) => severityColors[d.key])

  barGroups
    .selectAll("rect")
    .data((d) => d)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d.data.phase))
    .attr("y", (d) => y(d[1]))
    .attr("height", (d) => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .on("mouseover", (event, d) => {
      handleBarHover(event, d)
    })
    .on("mouseout", () => {
      tooltip.transition().duration(200).style("opacity", 0)
    })

  // Create a separate container for the legend to better control positioning
  const legendContainer = svg
    .append("g")
    .attr("class", "legend-container")
    .attr("transform", `translate(0, ${-margin.top + 20})`) // Position at the top of the chart area

  // Create a responsive legend that adapts to screen width
  const legendWidth = Math.min(width, 500) // Cap the legend width
  const legendItemWidth = legendWidth / severityCategories.length

  const legend = legendContainer
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${(width - legendWidth) / 2}, 0)`) // Center the legend

  severityCategories.forEach((severity, i) => {
    const legendItem = legend
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", `translate(${i * legendItemWidth}, 0)`) // Evenly space items
      .on("click", () => {
        toggleSeverity(severity)
      })

    legendItem.append("rect").attr("width", 16).attr("height", 16).attr("fill", severityColors[severity]).attr("rx", 3) // Rounded corners

    legendItem
      .append("text")
      .attr("x", 22)
      .attr("y", 13)
      .text(severity.charAt(0) + severity.slice(1).toLowerCase().replace("-", " "))
      .style("font-size", "12px") // Slightly smaller font
      .attr("class", "legend-text")
  })

  // Add responsive behavior for the legend
  function updateLegendOnResize() {
    const newWidth = container.clientWidth - 30
    const newChartWidth = newWidth - margin.left - margin.right
    const newLegendWidth = Math.min(newChartWidth, 500)
    const newLegendItemWidth = newLegendWidth / severityCategories.length

    legend.attr("transform", `translate(${(newChartWidth - newLegendWidth) / 2}, 0)`)

    legend.selectAll(".legend-item").each(function (d, i) {
      d3.select(this).attr("transform", `translate(${i * newLegendItemWidth}, 0)`)
    })

    // Adjust text size for very small screens
    if (newWidth < 500) {
      legend.selectAll(".legend-text").style("font-size", "10px")
    } else {
      legend.selectAll(".legend-text").style("font-size", "12px")
    }
  }

  // Initial call and add resize listener
  updateLegendOnResize()
  window.addEventListener("resize", updateLegendOnResize)
}

// Handle hover on line chart points
function handlePointHover(event, d, manufacturer) {
  if (d.value === 0) return

  tooltip.transition().duration(200).style("opacity", 0.9)

  tooltip
    .html(`
      <div class="tooltip-header" style="background-color: ${colorScale(manufacturer)}; color: white;">
          ${manufacturer} - ${d.year}
      </div>
      <div class="tooltip-body">
          <p><strong>Incidents:</strong> ${d.value}</p>
      </div>
  `)
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 28 + "px")
}

// Handle hover on bar chart bars
function handleBarHover(event, d) {
  const severity = d3.select(event.currentTarget.parentNode).datum().key
  const phase = d.data.phase
  const value = d.data[severity]

  if (value === 0) return

  tooltip.transition().duration(200).style("opacity", 0.9)

  tooltip
    .html(`
      <div class="tooltip-header" style="background-color: ${severityColors[severity]}; color: white;">
          ${phase}
      </div>
      <div class="tooltip-body">
          <p><strong>${severity.charAt(0) + severity.slice(1).toLowerCase().replace("-", " ")} Incidents:</strong> ${value}</p>
          <div class="tooltip-severity">
              <p><strong>Total Incidents:</strong> ${severityCategories.reduce((sum, s) => sum + d.data[s], 0)}</p>
          </div>
      </div>
  `)
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 28 + "px")
}

// Update visualizations based on current filters
function updateVisualizations() {
  createLineChart()
  createBarChart()
}

// Update the initialization to be more responsive
function initializeVisualization() {
  console.log("Initializing visualization...")

  // Add resize event listener for responsive updates
  window.addEventListener("resize", function () {
    // Debounce the resize event
    if (this.resizeTimer) clearTimeout(this.resizeTimer)
    this.resizeTimer = setTimeout(() => {
      updateVisualizations()
    }, 300)
  })

  const { timeSeriesData, phaseData } = processData()
  console.log("Time series data points:", timeSeriesData.length)
  console.log("Phase data points:", phaseData.length)

  createLineChart()
  createBarChart()
  setupEventListeners()
  updateManufacturerButtons()
  updateSeverityButtons()

  console.log("Dashboard initialized successfully!")
}

// Start the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, starting application...")
  loadData()
})

if (document.readyState === "loading") {
  // Still loading, wait for DOMContentLoaded
} else {
  console.log("DOM already loaded, starting application...")
  loadData()
}
