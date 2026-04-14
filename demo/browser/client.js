import {
  AstrologicalSubjectFactory,
  ChartDataFactory,
  ChartDrawer,
  ReportGenerator,
} from "/library.js";

const form = document.querySelector("#birth-form");
const button = document.querySelector("#generate");
const status = document.querySelector("#status");
const summary = document.querySelector("#summary");
const chart = document.querySelector("#chart");
const report = document.querySelector("#report");

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function metric(label, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "metric";

  const title = document.createElement("span");
  title.textContent = label;

  const content = document.createElement("strong");
  content.textContent = value;

  wrapper.append(title, content);
  return wrapper;
}

function readNumber(name) {
  const input = form.elements.namedItem(name);
  return Number(input.value);
}

function readString(name) {
  const input = form.elements.namedItem(name);
  return input.value.trim();
}

function getBirthData() {
  return {
    name: readString("name"),
    year: readNumber("year"),
    month: readNumber("month"),
    day: readNumber("day"),
    hour: readNumber("hour"),
    minute: readNumber("minute"),
    city: readString("city"),
    nation: readString("nation"),
    lng: readNumber("lng"),
    lat: readNumber("lat"),
    tz_str: readString("tz_str"),
    online: false,
    suppress_geonames_warning: true,
  };
}

async function renderChart() {
  button.disabled = true;
  setStatus("Generating chart in the browser…");

  try {
    const birthData = getBirthData();
    const startedAt = performance.now();

    const subject = await AstrologicalSubjectFactory.fromBirthData(birthData);
    const chartData = ChartDataFactory.createNatalChartData(subject);
    const drawer = new ChartDrawer(chartData, {
      theme: "classic",
      chart_language: "EN",
      style: "modern",
      show_zodiac_background_ring: true,
      custom_title: birthData.name,
    });

    const svg = drawer.generate_svg_string(false, false, {
      custom_title: birthData.name,
      style: "modern",
    });
    const textReport = new ReportGenerator(chartData).generate_report();
    const duration = `${(performance.now() - startedAt).toFixed(1)} ms`;

    summary.replaceChildren(
      metric("Chart Type", chartData.chart_type),
      metric("Sun", `${subject.sun.sign} ${subject.sun.position.toFixed(2)}°`),
      metric("Moon", `${subject.moon.sign} ${subject.moon.position.toFixed(2)}°`),
      metric("Lunar Phase", subject.lunar_phase?.moon_phase_name ?? "n/a"),
      metric("House System", subject.houses_system_name ?? subject.houses_system_identifier),
      metric("Runtime", duration),
    );

    chart.innerHTML = svg;
    report.textContent = textReport;
    setStatus(`Done. The chart, report, and subject data were all computed in the browser in ${duration}.`);
  }
  catch (error) {
    console.error(error);
    chart.innerHTML = "";
    summary.replaceChildren();
    report.textContent = "";
    setStatus(error instanceof Error ? error.message : String(error), true);
  }
  finally {
    button.disabled = false;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await renderChart();
});

void renderChart();
