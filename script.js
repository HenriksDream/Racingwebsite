// ---------------------------------------------------------
// CONFIG
// ---------------------------------------------------------
const API_URL = "https://vps.racinggamers.se/api/laptimes";

const statusBox = document.getElementById("status");
const fastestBody = document.querySelector("#fastest-table tbody");
const tableBody = document.querySelector("#laps-table tbody");

const filterValidity = document.getElementById("filter-validity");
const filterDriver = document.getElementById("filter-driver");
const filterTrack = document.getElementById("filter-track");

let allLaps = [];
let currentSort = null;
let sortDirection = 1;

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

// Compute best per track + per driver
function computeSectorBests(laps) {
    const globalBest = {};
    const driverBest = {};

    for (const lap of laps) {
        const sectors = lap.sectors;
        if (!sectors.length) continue;

        if (!globalBest[lap.track_id]) globalBest[lap.track_id] = {};
        if (!driverBest[lap.track_id]) driverBest[lap.track_id] = {};
        if (!driverBest[lap.track_id][lap.driver])
            driverBest[lap.track_id][lap.driver] = {};

        sectors.forEach((ms, idx) => {
            if (ms == null) return;

            if (
                globalBest[lap.track_id][idx] == null ||
                ms < globalBest[lap.track_id][idx]
            ) {
                globalBest[lap.track_id][idx] = ms;
            }

            if (
                driverBest[lap.track_id][lap.driver][idx] == null ||
                ms < driverBest[lap.track_id][lap.driver][idx]
            ) {
                driverBest[lap.track_id][lap.driver][idx] = ms;
            }
        });
    }

    return { globalBest, driverBest };
}

// ---------------------------------------------------------
// Row expansion logic
// ---------------------------------------------------------
function buildSectorDetailRow(lap) {
    const tr = document.createElement("tr");
    tr.className = "sector-detail";

    const td = document.createElement("td");
    td.colSpan = 7; // full-width of the main table

    if (!lap.sectors.length) {
        td.innerHTML = `<div class="sector-box">No sector times available</div>`;
    } else {
        let html = `<div class="sector-box">`;

        lap.sectors.forEach((ms, idx) => {
            const fmt = formatMs(ms);
            const color = lap.sector_colors[idx];

            let colorStyle = "";
            if (color === "purple") colorStyle = "color:#b077ff;font-weight:bold;";
            if (color === "green") colorStyle = "color:#6f6;font-weight:bold;";

            html += `
                <div class="sector-line" style="${colorStyle}">
                    Sector ${idx + 1}: ${fmt ?? "-"}
                </div>
            `;
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

        // Collapse if already open
        if (next && next.classList && next.classList.contains("sector-detail")) {
            next.remove();
            return;
        }

        // Expand
        const detail = buildSectorDetailRow(lap);
        tr.after(detail);
    });
}

// ---------------------------------------------------------
// Rendering rows
// ---------------------------------------------------------
function applySectorColor(ms, idx, lap, best) {
    if (ms == null) return "";

    const g = best.globalBest[lap.track_id][idx];
    const p = best.driverBest[lap.track_id][lap.driver][idx];

    if (ms === g) return "purple";
    if (ms === p) return "green";
    return "";
}

function renderRow(lap, best) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td>${lap.driver}</td>
        <td>${lap.car_name}</td>
        <td>${lap.track_name}</td>
        <td>${formatMs(lap.lap_time_ms)}</td>
        <td class="${lap.valid ? "valid-true" : "valid-false"}">${lap.valid}</td>
        <td>${lap.cuts}</td>
        <td>${lap.date}</td>
    `;

    attachRowExpansion(tr, lap);
    return tr;
}

// ---------------------------------------------------------
// Main fetch + process
// ---------------------------------------------------------
async function loadData() {
    statusBox.textContent = "Loading…";

    const res = await fetch(API_URL);
    allLaps = await res.json();

    allLaps.forEach(lap => {
        lap.track_name = friendlyTrack(lap.track_id);
        lap.car_name = friendlyCar(lap.car_id);

        lap.sectors = extractSectors(lap);
    });

    const best = computeSectorBests(allLaps);

    allLaps.forEach(lap => {
        lap.sector_colors = lap.sectors.map((ms, idx) =>
            applySectorColor(ms, idx, lap, best)
        );
    });

    populateFilters();
    renderTables();

    statusBox.textContent = "";
}

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

function renderTables() {
    const filtered = allLaps.filter(passesFilters);

    tableBody.innerHTML = "";
    filtered.forEach(lap => tableBody.appendChild(renderRow(lap)));

    // Fastest table
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
