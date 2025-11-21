// ---------------------------------------------------------
// CONFIG
// ---------------------------------------------------------
const API_URL = "https://vps.racinggamers.se/api/laptimes";

const statusBox = document.getElementById("status");
const fastestBody = document.querySelector("#fastest-table tbody");
const tableBody = document.querySelector("#laps-table tbody");
const bannerBox = document.getElementById("current-banner");

const filterValidity = document.getElementById("filter-validity");
const filterDriver = document.getElementById("filter-driver");
const filterTrack = document.getElementById("filter-track");

let allLaps = [];

// Friendly name mapping
const TRACK_NAMES = {
    "ks_brands_hatch-gp": "Brands Hatch GP",
};

const CAR_NAMES = {
    "lotus_exos_125_s1": "Lotus Exos 125",
};

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
function friendlyCar(id) {
    return CAR_NAMES[id] ?? id;
}

function friendlyTrack(id) {
    return TRACK_NAMES[id] ?? id;
}

function formatMs(ms) {
    if (ms == null || ms === 86400000) return null;
    const total = ms / 1000;
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const msPart = Math.floor((total % 1) * 1000).toString().padStart(3, "0");
    return `${m}:${s.toString().padStart(2, "0")}.${msPart}`;
}

function extractSectors(lap) {
    const sectors = [];
    for (let i = 0; i < 10; i++) {
        const key = `s${i}`;
        if (lap[key] != null) {
            if (lap[key] !== 86400000) sectors.push(lap[key]);
            else sectors.push(null);
        }
    }
    while (sectors.length && sectors[sectors.length - 1] === null) {
        sectors.pop();
    }
    return sectors;
}

// ---------------------------------------------------------
// Build global-best + personal-best sectors & lap times
// ---------------------------------------------------------
function computeBests(laps) {
    const best = {
        globalSector: {},
        driverSector: {},
        globalLap: {},
        driverLap: {}
    };

    for (const lap of laps) {
        const t = lap.track_id;
        const d = lap.driver;

        // Init containers
        if (!best.globalSector[t]) best.globalSector[t] = {};
        if (!best.driverSector[t]) best.driverSector[t] = {};
        if (!best.driverSector[t][d]) best.driverSector[t][d] = {};

        if (!best.globalLap[t] || lap.lap_time_ms < best.globalLap[t])
            best.globalLap[t] = lap.lap_time_ms;

        if (!best.driverLap[t]) best.driverLap[t] = {};
        if (!best.driverLap[t][d] || lap.lap_time_ms < best.driverLap[t][d])
            best.driverLap[t][d] = lap.lap_time_ms;

        // Sector bests
        lap.sectors.forEach((ms, idx) => {
            if (ms == null) return;

            if (!best.globalSector[t][idx] || ms < best.globalSector[t][idx])
                best.globalSector[t][idx] = ms;

            if (!best.driverSector[t][d][idx] || ms < best.driverSector[t][d][idx])
                best.driverSector[t][d][idx] = ms;
        });
    }

    return best;
}

// ---------------------------------------------------------
// Row expansion logic
// ---------------------------------------------------------
function buildSectorDetailRow(lap) {
    const tr = document.createElement("tr");
    tr.className = "sector-detail";

    const td = document.createElement("td");
    td.colSpan = 10;

    if (!lap.sectors.length) {
        td.innerHTML = `<div class="sector-box">No sector times available</div>`;
    } else {
        let html = `<div class="sector-box">`;

        lap.sectors.forEach((ms, idx) => {
            const fmt = formatMs(ms);
            const color = lap.sector_colors[idx];
            let css = "";
            if (color === "purple") css = "color:#b077ff;font-weight:bold;";
            if (color === "green") css = "color:#6f6;font-weight:bold;";

            html += `<div class="sector-line" style="${css}">Sector ${idx + 1}: ${fmt ?? "-"}</div>`;
        });

        html += `</div>`;
        td.innerHTML = html;
    }

    tr.appendChild(td);
    return tr;
}

function attachRowExpansion(tr, lap) {
    tr.addEventListener("click", () => {
        const next = tr.nextSibling;

        if (next && next.classList.contains("sector-detail")) {
            next.remove();
            return;
        }
        tr.after(buildSectorDetailRow(lap));
    });
}

// ---------------------------------------------------------
// Rendering rows
// ---------------------------------------------------------
function renderRow(lap) {
    const tr = document.createElement("tr");

    // Lap time CSS
    let lapCss = "";
    if (lap.lap_color === "purple") lapCss = "style='color:#b077ff;font-weight:bold;'";
    if (lap.lap_color === "green") lapCss = "style='color:#6f6;font-weight:bold;'";

    const s1Css = lap.sector_colors[0] === "purple" ? "style='color:#b077ff'" :
                  lap.sector_colors[0] === "green"  ? "style='color:#6f6'" : "";
    const s2Css = lap.sector_colors[1] === "purple" ? "style='color:#b077ff'" :
                  lap.sector_colors[1] === "green"  ? "style='color:#6f6'" : "";
    const s3Css = lap.sector_colors[2] === "purple" ? "style='color:#b077ff'" :
                  lap.sector_colors[2] === "green"  ? "style='color:#6f6'" : "";

    tr.innerHTML = `
        <td>${lap.driver}</td>
        <td>${lap.car_name}</td>
        <td>${lap.track_name}</td>
        <td class="${lap.valid ? "valid-true" : "valid-false"}">${lap.valid}</td>
        <td>${lap.date}</td>
        <td>${lap.cuts}</td>
        <td ${s1Css}>${lap.sectors_fmt?.[0] ?? ""}</td>
        <td ${s2Css}>${lap.sectors_fmt?.[1] ?? ""}</td>
        <td ${s3Css}>${lap.sectors_fmt?.[2] ?? ""}</td>
        <td ${lapCss}>${formatMs(lap.lap_time_ms)}</td>
    `;

    attachRowExpansion(tr, lap);
    return tr;
}

// ---------------------------------------------------------
// Main fetch & processing
// ---------------------------------------------------------
async function loadData() {
    statusBox.textContent = "Loading…";

    const res = await fetch(API_URL);
    allLaps = await res.json();

    // Prepare laps
    allLaps.forEach(lap => {
        lap.track_name = friendlyTrack(lap.track_id);
        lap.car_name = friendlyCar(lap.car_id);
        lap.sectors = extractSectors(lap);
        lap.sectors_fmt = lap.sectors.map(ms => formatMs(ms));
    });

    // Compute personal + global bests
    const best = computeBests(allLaps);

    // Sector colors + lap colors
    allLaps.forEach(lap => {
        const t = lap.track_id;
        const d = lap.driver;

        // Per-sector coloring
        lap.sector_colors = lap.sectors.map((ms, idx) => {
            if (ms == null) return null;

            if (ms === best.globalSector[t][idx]) return "purple";
            if (ms === best.driverSector[t][d][idx]) return "green";
            return null;
        });

        // Lap coloring
        if (lap.lap_time_ms === best.globalLap[t]) {
            lap.lap_color = "purple";
        } else if (lap.lap_time_ms === best.driverLap[t][d]) {
            lap.lap_color = "green";
        } else {
            lap.lap_color = null;
        }
    });

    // Banner
    bannerBox.textContent = `Showing ${allLaps.length} laps from server`;

    populateFilters();
    renderTables();
    statusBox.textContent = "";
}

// ---------------------------------------------------------
// Filters
// ---------------------------------------------------------
function populateFilters() {
    const drivers = [...new Set(allLaps.map(l => l.driver))];
    const tracks = [...new Set(allLaps.map(l => l.track_id))];

    filterDriver.innerHTML =
        `<option value="all">All</option>` +
        drivers.map(d => `<option>${d}</option>`).join("");

    filterTrack.innerHTML = tracks
        .map(t => `<option value="${t}">${friendlyTrack(t)}</option>`)
        .join("");
}

function passesFilters(lap) {
    if (filterValidity.value !== "all") {
        const need = filterValidity.value === "true";
        if (lap.valid !== need) return false;
    }

    if (filterDriver.value !== "all" && lap.driver !== filterDriver.value)
        return false;

    if (filterTrack.value !== lap.track_id) return false;

    return true;
}

// ---------------------------------------------------------
// Rendering tables
// ---------------------------------------------------------
function renderTables() {
    const filtered = allLaps.filter(passesFilters);

    // All laps
    tableBody.innerHTML = "";
    filtered.forEach(lap => tableBody.appendChild(renderRow(lap)));

    // Fastest per driver per track
    fastestBody.innerHTML = "";
    const bestPerDriver = {};

    filtered.forEach(lap => {
        const key = `${lap.driver}_${lap.track_id}`;
        if (!bestPerDriver[key] || lap.lap_time_ms < bestPerDriver[key].lap_time_ms)
            bestPerDriver[key] = lap;
    });

    Object.values(bestPerDriver).forEach(lap => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${lap.driver}</td>
            <td>${lap.car_name}</td>
            <td>${lap.track_name}</td>
            <td>${formatMs(lap.lap_time_ms)}</td>
        `;
        fastestBody.appendChild(tr);
    });
}

// ---------------------------------------------------------
filterTrack.addEventListener("change", renderTables);
filterDriver.addEventListener("change", renderTables);
filterValidity.addEventListener("change", renderTables);

loadData();
