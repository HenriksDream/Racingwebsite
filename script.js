// ---------------------------------------------------------
// CONFIG
// ---------------------------------------------------------
const API_URL = "https://vps.racinggamers.se/api/laptimes";

const statusBox = document.getElementById("status");
const fastestBody = document.querySelector("#fastest-table tbody");
const tableBody = document.querySelector("#laps-table tbody");

const filterTrack = document.getElementById("filter-track");
const filterValidity = document.getElementById("filter-validity");
const filterDriver = document.getElementById("filter-driver");

let allLaps = [];
let currentSort = null;
let sortDirection = 1;

const DEFAULT_TRACK = "ks_brands_hatch-gp";

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
function formatMs(ms) {
    if (ms == null) return "-";
    let total = Math.floor(ms);
    let minutes = Math.floor(total / 60000);
    let seconds = Math.floor((total % 60000) / 1000);
    let milli = total % 1000;
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milli.toString().padStart(3, "0")}`;
}

function sortLaps(laps) {
    if (!currentSort) return laps;
    return [...laps].sort((a, b) => {
        let x = a[currentSort];
        let y = b[currentSort];
        if (typeof x === "string") x = x.toLowerCase();
        if (typeof y === "string") y = y.toLowerCase();
        if (x < y) return -1 * sortDirection;
        if (x > y) return 1 * sortDirection;
        return 0;
    });
}

// ---------------------------------------------------------
// Filtering logic (sequential)
// Track → Valid → Driver
// ---------------------------------------------------------
function applyFilters() {
    let track = filterTrack.value;
    let validity = filterValidity.value;
    let driver = filterDriver.value;

    let filtered = allLaps;

    // Track filter first
    if (track !== "all") {
        filtered = filtered.filter(l => l.track_id === track);
    }

    // Then validity
    if (validity === "true") filtered = filtered.filter(l => l.valid === true);
    else if (validity === "false") filtered = filtered.filter(l => l.valid === false);

    // Rebuild Driver dropdown based on previous filters
    rebuildDriverDropdown(filtered);

    // Then apply driver filter
    if (driver !== "all") {
        filtered = filtered.filter(l => l.driver === driver);
    }

    renderFastest(filtered);
    renderAllLaps(filtered);
}

function rebuildDriverDropdown(filteredLaps) {
    const selectedDriver = filterDriver.value;

    const drivers = Array.from(new Set(filteredLaps.map(l => l.driver))).sort();

    filterDriver.innerHTML = "<option value='all'>All</option>";
    for (const d of drivers) {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        filterDriver.appendChild(opt);
    }

    // Restore driver selection IF still valid
    if (drivers.includes(selectedDriver)) {
        filterDriver.value = selectedDriver;
    }
}

// ---------------------------------------------------------
// Rendering
// ---------------------------------------------------------
function renderFastest(laps) {
    fastestBody.innerHTML = "";

    const best = {};
    for (const l of laps) {
        if (!best[l.driver] || l.lap_time_ms < best[l.driver].lap_time_ms) {
            best[l.driver] = l;
        }
    }

    const rows = Object.values(best).sort((a, b) => a.lap_time_ms - b.lap_time_ms);

    for (const lap of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${lap.driver}</td>
            <td>${lap.car_name ?? lap.car_id}</td>
            <td>${lap.track_name ?? lap.track_id}</td>
            <td>${formatMs(lap.lap_time_ms)}</td>
        `;
        fastestBody.appendChild(tr);
    }
}

function renderAllLaps(laps) {
    tableBody.innerHTML = "";

    const sorted = sortLaps(laps);

    for (const lap of sorted) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${lap.driver}</td>
            <td>${lap.car_name ?? lap.car_id}</td>
            <td>${lap.track_name ?? lap.track_id}</td>
            <td>${formatMs(lap.lap_time_ms)}</td>
            <td class="valid-${lap.valid}">${lap.valid}</td>
            <td>${lap.cuts}</td>
            <td>${lap.date?.replace("T"," ").replace("Z","") ?? "-"}</td>
        `;
        tableBody.appendChild(tr);
    }
}

// ---------------------------------------------------------
// Initial load
// ---------------------------------------------------------
async function loadLaps() {
    statusBox.textContent = "Loading…";

    const res = await fetch(API_URL);
    allLaps = await res.json();

    statusBox.textContent = `Loaded ${allLaps.length} laps`;

    buildTrackDropdown();
    applyFilters();
}

function buildTrackDropdown() {
    const tracks = Array.from(new Set(allLaps.map(l => l.track_id))).sort();

    filterTrack.innerHTML = "<option value='all'>All</option>";

    for (const t of tracks) {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        filterTrack.appendChild(opt);
    }

    // Default = Brands Hatch GP
    if (tracks.includes(DEFAULT_TRACK)) {
        filterTrack.value = DEFAULT_TRACK;
    }
}

// ---------------------------------------------------------
// Event listeners
// ---------------------------------------------------------
filterTrack.addEventListener("change", applyFilters);
filterValidity.addEventListener("change", applyFilters);
filterDriver.addEventListener("change", applyFilters);

document.querySelectorAll("#laps-table th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
        const field = th.dataset.sort;
        if (currentSort === field) sortDirection *= -1;
        else {
            currentSort = field;
            sortDirection = 1;
        }
        applyFilters();
    });
});

// ---------------------------------------------------------
loadLaps();
// ---------------------------------------------------------
