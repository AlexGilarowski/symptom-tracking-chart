<<<<<<< HEAD
const symptoms = [
  {
    key: "obsessiveThoughts",
    label: "Obsessive thoughts",
    color: "#3366cc"
  },
  {
    key: "anxiety",
    label: "Anxiety",
    color: "#dc3912"
  },
  {
    key: "ocdAnxiety",
    label: "OCD anxiety",
    color: "#109618"
  },
  {
    key: "specialAnxiety",
    label: "Special anxiety",
    color: "#ff9900"
  },
  {
    key: "irritability",
    label: "Irritability",
    color: "#990099"
  },
  {
    key: "silliness",
    label: "Silliness",
    color: "#0099c6"
  }
];

const activeSymptoms = new Set(
  symptoms.map(symptom => symptom.key)
);

const parseDate = d3.timeParse("%Y-%m-%d");
const formatDate = d3.timeFormat("%B %-d, %Y");

const margin = {
  top: 25,
  right: 35,
  bottom: 75,
  left: 65
};

const width = 1100;
const height = 600;

const innerWidth =
  width - margin.left - margin.right;

const innerHeight =
  height - margin.top - margin.bottom;

const svg = d3
  .select("#symptom-chart")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("role", "img")
  .attr(
    "aria-label",
    "Line chart showing symptom ratings over time"
  );

const chart = svg
  .append("g")
  .attr(
    "transform",
    `translate(${margin.left},${margin.top})`
  );

const tooltip = d3.select("#tooltip");

d3.csv("data.csv", row => {
  const parsedRow = {
    date: parseDate(row.date),
    period:
      String(row.period).trim().toLowerCase() === "yes",
    notes: row.notes ? row.notes.trim() : ""
  };

  symptoms.forEach(symptom => {
    const value = row[symptom.key];

    parsedRow[symptom.key] =
      value === "" || value === undefined
        ? null
        : Number(value);
  });

  return parsedRow;
})
  .then(data => {
    const validData = data
      .filter(row => row.date instanceof Date)
      .sort((a, b) => a.date - b.date);

    if (validData.length === 0) {
      throw new Error(
        "No valid rows were found in data.csv."
      );
    }

    drawChart(validData);
    createLegend();
  })
  .catch(error => {
    console.error(error);

    d3.select("#symptom-chart")
      .append("p")
      .attr("class", "error-message")
      .text(
        "The chart could not load. Check the CSV filename, column names, and dates."
      );
  });

function drawChart(data) {
  const startDate = d3.timeDay.offset(
    d3.min(data, row => row.date),
    -0.5
  );

  const endDate = d3.timeDay.offset(
    d3.max(data, row => row.date),
    0.5
  );

  const x = d3
    .scaleTime()
    .domain([startDate, endDate])
    .range([0, innerWidth]);

  const y = d3
    .scaleLinear()
    .domain([0, 5])
    .range([innerHeight, 0]);

  /*
   * PERIOD SHADING
   *
   * Each "yes" day receives a rectangle covering
   * approximately one full calendar day.
   */
  chart
    .append("g")
    .attr("class", "period-bands")
    .selectAll("rect")
    .data(data.filter(row => row.period))
    .join("rect")
    .attr(
      "x",
      row => x(d3.timeHour.offset(row.date, -12))
    )
    .attr("y", 0)
    .attr(
      "width",
      row =>
        x(d3.timeHour.offset(row.date, 12)) -
        x(d3.timeHour.offset(row.date, -12))
    )
    .attr("height", innerHeight)
    .attr("class", "period-band");

  chart
    .append("g")
    .attr("class", "grid")
    .call(
      d3
        .axisLeft(y)
        .tickValues([0, 1, 2, 3, 4, 5])
        .tickSize(-innerWidth)
        .tickFormat("")
    );

  chart
    .append("g")
    .attr("class", "axis x-axis")
    .attr(
      "transform",
      `translate(0,${innerHeight})`
    )
    .call(
      d3
        .axisBottom(x)
        .ticks(Math.min(data.length, 12))
        .tickFormat(d3.timeFormat("%b %-d"))
    )
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end");

  chart
    .append("g")
    .attr("class", "axis y-axis")
    .call(
      d3
        .axisLeft(y)
        .tickValues([0, 1, 2, 3, 4, 5])
        .tickFormat(d3.format("d"))
    );

  chart
    .append("text")
    .attr("class", "axis-label")
    .attr(
      "transform",
      `translate(${innerWidth / 2},${innerHeight + 67})`
    )
    .style("text-anchor", "middle")
    .text("Date");

  chart
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -48)
    .style("text-anchor", "middle")
    .text("Symptom rating");

  const lineGenerator = symptomKey =>
    d3
      .line()
      .defined(row =>
        Number.isFinite(row[symptomKey])
      )
      .x(row => x(row.date))
      .y(row => y(row[symptomKey]))
      .curve(d3.curveMonotoneX);

  const seriesContainer = chart
    .append("g")
    .attr("class", "series-container");

  symptoms.forEach(symptom => {
    const seriesGroup = seriesContainer
      .append("g")
      .attr("class", `series series-${symptom.key}`);

    /*
     * VISIBLE LINE
     */
    seriesGroup
      .append("path")
      .datum(data)
      .attr("class", "symptom-line")
      .attr("stroke", symptom.color)
      .attr("d", lineGenerator(symptom.key));

    /*
     * POINTS
     */
    seriesGroup
      .selectAll(".data-point")
      .data(
        data.filter(row =>
          Number.isFinite(row[symptom.key])
        )
      )
      .join("circle")
      .attr("class", "data-point")
      .attr("cx", row => x(row.date))
      .attr("cy", row => y(row[symptom.key]))
      .attr("r", 4)
      .attr("fill", symptom.color);

    /*
     * INVISIBLE WIDER LINE
     *
     * This makes the thin line much easier to hover.
     */
    seriesGroup
      .append("path")
      .datum(data)
      .attr("class", "line-hover-target")
      .attr("d", lineGenerator(symptom.key))
      .on("mouseenter", function () {
        highlightSeries(symptom.key);
      })
      .on("mousemove", function (event) {
        const [mouseX] = d3.pointer(
          event,
          chart.node()
        );

        const hoveredDate = x.invert(mouseX);

        const validRows = data.filter(row =>
          Number.isFinite(row[symptom.key])
        );

        const index = d3
          .bisector(row => row.date)
          .center(validRows, hoveredDate);

        const row = validRows[index];

        if (!row) {
          return;
        }

        showTooltip(event, row, symptom);
      })
      .on("mouseleave", function () {
        resetSeriesHighlight();
        hideTooltip();
      });

    /*
     * POINT HOVER
     *
     * Hovering directly over a point also shows
     * the tooltip.
     */
    seriesGroup
      .selectAll(".data-point")
      .on("mouseenter", function (event, row) {
        highlightSeries(symptom.key);

        d3.select(this)
          .attr("r", 7);

        showTooltip(event, row, symptom);
      })
      .on("mousemove", function (event, row) {
        showTooltip(event, row, symptom);
      })
      .on("mouseleave", function () {
        d3.select(this)
          .attr("r", 4);

        resetSeriesHighlight();
        hideTooltip();
      });
  });
}

function highlightSeries(selectedKey) {
  d3.selectAll(".series")
    .classed(
      "series-muted",
      function () {
        return !d3
          .select(this)
          .classed(`series-${selectedKey}`);
      }
    )
    .classed(
      "series-highlighted",
      function () {
        return d3
          .select(this)
          .classed(`series-${selectedKey}`);
      }
    );
}

function resetSeriesHighlight() {
  d3.selectAll(".series")
    .classed("series-muted", false)
    .classed("series-highlighted", false);
}

function showTooltip(event, row, symptom) {
  const noteText =
    row.notes || "No notes recorded.";

  const periodText = row.period
    ? `
      <div class="tooltip-period">
        Period
      </div>
    `
    : "";

  tooltip
    .style("display", "block")
    .html(`
      <div class="tooltip-variable">
        <span
          class="tooltip-color"
          style="background-color:${symptom.color}"
        ></span>

        ${symptom.label}
      </div>

      <div class="tooltip-date">
        ${formatDate(row.date)}
      </div>

      <div class="tooltip-score">
        Score: <strong>${row[symptom.key]}</strong>
      </div>

      ${periodText}

      <div class="tooltip-notes">
        <span>Notes</span>
        ${escapeHtml(noteText)}
      </div>
    `);

  positionTooltip(event);
}

function positionTooltip(event) {
  const tooltipNode = tooltip.node();

  const tooltipWidth =
    tooltipNode.offsetWidth;

  const tooltipHeight =
    tooltipNode.offsetHeight;

  let left = event.pageX + 16;
  let top = event.pageY + 16;

  if (
    left + tooltipWidth >
    window.scrollX + window.innerWidth - 12
  ) {
    left =
      event.pageX -
      tooltipWidth -
      16;
  }

  if (
    top + tooltipHeight >
    window.scrollY + window.innerHeight - 12
  ) {
    top =
      event.pageY -
      tooltipHeight -
      16;
  }

  tooltip
    .style("left", `${left}px`)
    .style("top", `${top}px`);
}

function hideTooltip() {
  tooltip.style("display", "none");
}

function createLegend() {
  const legend = d3.select("#symptom-legend");

  const buttons = legend
    .selectAll("button")
    .data(symptoms)
    .join("button")
    .attr("type", "button")
    .attr("class", "legend-button")
    .attr(
      "aria-pressed",
      symptom => activeSymptoms.has(symptom.key)
    );

  buttons
    .append("span")
    .attr("class", "legend-color")
    .style(
      "background-color",
      symptom => symptom.color
    );

  buttons
    .append("span")
    .text(symptom => symptom.label);

  buttons.on("click", function (event, symptom) {
    if (activeSymptoms.has(symptom.key)) {
      activeSymptoms.delete(symptom.key);
    } else {
      activeSymptoms.add(symptom.key);
    }

    const isActive =
      activeSymptoms.has(symptom.key);

    d3.select(this)
      .classed("inactive", !isActive)
      .attr("aria-pressed", isActive);

    d3.select(`.series-${symptom.key}`)
      .style(
        "display",
        isActive ? null : "none"
      );

    hideTooltip();
  });
}

/*
 * Prevent notes from accidentally being interpreted
 * as HTML code.
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
=======
const symptoms = [
  {
    key: "obsessiveThoughts",
    label: "Obsessive thoughts",
    color: "#3366cc"
  },
  {
    key: "anxiety",
    label: "Anxiety",
    color: "#dc3912"
  },
  {
    key: "ocdAnxiety",
    label: "OCD anxiety",
    color: "#109618"
  },
  {
    key: "specialAnxiety",
    label: "Special anxiety",
    color: "#ff9900"
  },
  {
    key: "irritability",
    label: "Irritability",
    color: "#990099"
  },
  {
    key: "silliness",
    label: "Silliness",
    color: "#0099c6"
  }
];

const activeSymptoms = new Set(
  symptoms.map(symptom => symptom.key)
);

const parseDate = d3.timeParse("%Y-%m-%d");
const formatDate = d3.timeFormat("%B %-d, %Y");

const margin = {
  top: 25,
  right: 35,
  bottom: 75,
  left: 65
};

const width = 1100;
const height = 600;

const innerWidth =
  width - margin.left - margin.right;

const innerHeight =
  height - margin.top - margin.bottom;

const svg = d3
  .select("#symptom-chart")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("role", "img")
  .attr(
    "aria-label",
    "Line chart showing symptom ratings over time"
  );

const chart = svg
  .append("g")
  .attr(
    "transform",
    `translate(${margin.left},${margin.top})`
  );

const tooltip = d3.select("#tooltip");

d3.csv("data.csv", row => {
  const parsedRow = {
    date: parseDate(row.date),
    period:
      String(row.period).trim().toLowerCase() === "yes",
    notes: row.notes ? row.notes.trim() : ""
  };

  symptoms.forEach(symptom => {
    const value = row[symptom.key];

    parsedRow[symptom.key] =
      value === "" || value === undefined
        ? null
        : Number(value);
  });

  return parsedRow;
})
  .then(data => {
    const validData = data
      .filter(row => row.date instanceof Date)
      .sort((a, b) => a.date - b.date);

    if (validData.length === 0) {
      throw new Error(
        "No valid rows were found in data.csv."
      );
    }

    drawChart(validData);
    createLegend();
  })
  .catch(error => {
    console.error(error);

    d3.select("#symptom-chart")
      .append("p")
      .attr("class", "error-message")
      .text(
        "The chart could not load. Check the CSV filename, column names, and dates."
      );
  });

function drawChart(data) {
  const startDate = d3.timeDay.offset(
    d3.min(data, row => row.date),
    -0.5
  );

  const endDate = d3.timeDay.offset(
    d3.max(data, row => row.date),
    0.5
  );

  const x = d3
    .scaleTime()
    .domain([startDate, endDate])
    .range([0, innerWidth]);

  const y = d3
    .scaleLinear()
    .domain([0, 5])
    .range([innerHeight, 0]);

  /*
   * PERIOD SHADING
   *
   * Each "yes" day receives a rectangle covering
   * approximately one full calendar day.
   */
  chart
    .append("g")
    .attr("class", "period-bands")
    .selectAll("rect")
    .data(data.filter(row => row.period))
    .join("rect")
    .attr(
      "x",
      row => x(d3.timeHour.offset(row.date, -12))
    )
    .attr("y", 0)
    .attr(
      "width",
      row =>
        x(d3.timeHour.offset(row.date, 12)) -
        x(d3.timeHour.offset(row.date, -12))
    )
    .attr("height", innerHeight)
    .attr("class", "period-band");

  chart
    .append("g")
    .attr("class", "grid")
    .call(
      d3
        .axisLeft(y)
        .tickValues([0, 1, 2, 3, 4, 5])
        .tickSize(-innerWidth)
        .tickFormat("")
    );

  chart
    .append("g")
    .attr("class", "axis x-axis")
    .attr(
      "transform",
      `translate(0,${innerHeight})`
    )
    .call(
      d3
        .axisBottom(x)
        .ticks(Math.min(data.length, 12))
        .tickFormat(d3.timeFormat("%b %-d"))
    )
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end");

  chart
    .append("g")
    .attr("class", "axis y-axis")
    .call(
      d3
        .axisLeft(y)
        .tickValues([0, 1, 2, 3, 4, 5])
        .tickFormat(d3.format("d"))
    );

  chart
    .append("text")
    .attr("class", "axis-label")
    .attr(
      "transform",
      `translate(${innerWidth / 2},${innerHeight + 67})`
    )
    .style("text-anchor", "middle")
    .text("Date");

  chart
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -48)
    .style("text-anchor", "middle")
    .text("Symptom rating");

  const lineGenerator = symptomKey =>
    d3
      .line()
      .defined(row =>
        Number.isFinite(row[symptomKey])
      )
      .x(row => x(row.date))
      .y(row => y(row[symptomKey]))
      .curve(d3.curveMonotoneX);

  const seriesContainer = chart
    .append("g")
    .attr("class", "series-container");

  symptoms.forEach(symptom => {
    const seriesGroup = seriesContainer
      .append("g")
      .attr("class", `series series-${symptom.key}`);

    /*
     * VISIBLE LINE
     */
    seriesGroup
      .append("path")
      .datum(data)
      .attr("class", "symptom-line")
      .attr("stroke", symptom.color)
      .attr("d", lineGenerator(symptom.key));

    /*
     * POINTS
     */
    seriesGroup
      .selectAll(".data-point")
      .data(
        data.filter(row =>
          Number.isFinite(row[symptom.key])
        )
      )
      .join("circle")
      .attr("class", "data-point")
      .attr("cx", row => x(row.date))
      .attr("cy", row => y(row[symptom.key]))
      .attr("r", 4)
      .attr("fill", symptom.color);

    /*
     * INVISIBLE WIDER LINE
     *
     * This makes the thin line much easier to hover.
     */
    seriesGroup
      .append("path")
      .datum(data)
      .attr("class", "line-hover-target")
      .attr("d", lineGenerator(symptom.key))
      .on("mouseenter", function () {
        highlightSeries(symptom.key);
      })
      .on("mousemove", function (event) {
        const [mouseX] = d3.pointer(
          event,
          chart.node()
        );

        const hoveredDate = x.invert(mouseX);

        const validRows = data.filter(row =>
          Number.isFinite(row[symptom.key])
        );

        const index = d3
          .bisector(row => row.date)
          .center(validRows, hoveredDate);

        const row = validRows[index];

        if (!row) {
          return;
        }

        showTooltip(event, row, symptom);
      })
      .on("mouseleave", function () {
        resetSeriesHighlight();
        hideTooltip();
      });

    /*
     * POINT HOVER
     *
     * Hovering directly over a point also shows
     * the tooltip.
     */
    seriesGroup
      .selectAll(".data-point")
      .on("mouseenter", function (event, row) {
        highlightSeries(symptom.key);

        d3.select(this)
          .attr("r", 7);

        showTooltip(event, row, symptom);
      })
      .on("mousemove", function (event, row) {
        showTooltip(event, row, symptom);
      })
      .on("mouseleave", function () {
        d3.select(this)
          .attr("r", 4);

        resetSeriesHighlight();
        hideTooltip();
      });
  });
}

function highlightSeries(selectedKey) {
  d3.selectAll(".series")
    .classed(
      "series-muted",
      function () {
        return !d3
          .select(this)
          .classed(`series-${selectedKey}`);
      }
    )
    .classed(
      "series-highlighted",
      function () {
        return d3
          .select(this)
          .classed(`series-${selectedKey}`);
      }
    );
}

function resetSeriesHighlight() {
  d3.selectAll(".series")
    .classed("series-muted", false)
    .classed("series-highlighted", false);
}

function showTooltip(event, row, symptom) {
  const noteText =
    row.notes || "No notes recorded.";

  const periodText = row.period
    ? `
      <div class="tooltip-period">
        Period
      </div>
    `
    : "";

  tooltip
    .style("display", "block")
    .html(`
      <div class="tooltip-variable">
        <span
          class="tooltip-color"
          style="background-color:${symptom.color}"
        ></span>

        ${symptom.label}
      </div>

      <div class="tooltip-date">
        ${formatDate(row.date)}
      </div>

      <div class="tooltip-score">
        Score: <strong>${row[symptom.key]}</strong>
      </div>

      ${periodText}

      <div class="tooltip-notes">
        <span>Notes</span>
        ${escapeHtml(noteText)}
      </div>
    `);

  positionTooltip(event);
}

function positionTooltip(event) {
  const tooltipNode = tooltip.node();

  const tooltipWidth =
    tooltipNode.offsetWidth;

  const tooltipHeight =
    tooltipNode.offsetHeight;

  let left = event.pageX + 16;
  let top = event.pageY + 16;

  if (
    left + tooltipWidth >
    window.scrollX + window.innerWidth - 12
  ) {
    left =
      event.pageX -
      tooltipWidth -
      16;
  }

  if (
    top + tooltipHeight >
    window.scrollY + window.innerHeight - 12
  ) {
    top =
      event.pageY -
      tooltipHeight -
      16;
  }

  tooltip
    .style("left", `${left}px`)
    .style("top", `${top}px`);
}

function hideTooltip() {
  tooltip.style("display", "none");
}

function createLegend() {
  const legend = d3.select("#symptom-legend");

  const buttons = legend
    .selectAll("button")
    .data(symptoms)
    .join("button")
    .attr("type", "button")
    .attr("class", "legend-button")
    .attr(
      "aria-pressed",
      symptom => activeSymptoms.has(symptom.key)
    );

  buttons
    .append("span")
    .attr("class", "legend-color")
    .style(
      "background-color",
      symptom => symptom.color
    );

  buttons
    .append("span")
    .text(symptom => symptom.label);

  buttons.on("click", function (event, symptom) {
    if (activeSymptoms.has(symptom.key)) {
      activeSymptoms.delete(symptom.key);
    } else {
      activeSymptoms.add(symptom.key);
    }

    const isActive =
      activeSymptoms.has(symptom.key);

    d3.select(this)
      .classed("inactive", !isActive)
      .attr("aria-pressed", isActive);

    d3.select(`.series-${symptom.key}`)
      .style(
        "display",
        isActive ? null : "none"
      );

    hideTooltip();
  });
}

/*
 * Prevent notes from accidentally being interpreted
 * as HTML code.
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
>>>>>>> cedf3688ea654e86cca61a5b883ce4430dbfa057
}