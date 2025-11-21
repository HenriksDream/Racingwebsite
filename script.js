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
    if (ms == null) return "-";
    let m = Math.floor(ms / 60000);
    let s = Math.floor((ms % 60000) / 1000);
    let msPart = ms % 1000;
    return `${m}:${s.toString().padStart(2, "0")}.${msPart.toString().padStart(3, "0")}`;
}

// ---------------------------------------------------------
// Load data
// ---------------------------------------------------------
async function loadData(showLoading = true) {
    try {
        if (showLoading) statusBox.textContent = "Loading…";

        const response = await fetch(API_URL + `?nocache=${Date.now()}`, {
            method: "GET",
            mode: "cors"
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        allLaps = await response.json();

        if (showLoading) statusBox.textContent = "";

        renderTrackList();
        renderDriverList();
        renderFastestLaps();
        renderFullTable();

        document.getElementById("last-updated").textContent =
            "Last updated: " + new Date().toLocaleTimeString();

        document.getElementById("version").textContent = "v1.6 — OK";

    } catch (err) {
        console.error(err);
        statusBox.textContent = "Error fetching data";
        document.getElementById("version").textContent = "v1.6 — ERROR";
    }
}

// ---------------------------------------------------------
// Track dropdown
// ---------------------------------------------------------
function renderTrackList() {
    const tracks = [...new Set(allLaps.map(l => l.track))].sort();

    filterTrack.innerHTML = "";
    tracks.forEach(t => {
        const nice = friendlyTrack(t);
        filterTrack.innerHTML += `<option value="${t}">${nice}</option>`;
    });

    // default track:
    if (!filterTrack.value) {
        filterTrack.value = "ks_brands_hatch-gp";
    }
}

// ---------------------------------------------------------
// Driver dropdown
// ---------------------------------------------------------
function renderDriverList() {
    const drivers = [...new Set(allLaps.map(l => l.driver))].sort();

    filterDriver.innerHTML = `<option value="all">All drivers</option>`;
    drivers.forEach(d =>
        filterDriver.innerHTML += `<option value="${d}">${d}</option>`
    );
}

// ---------------------------------------------------------
// Fastest laps per driver
// ---------------------------------------------------------
function renderFastestLaps() {
    fastestBody.innerHTML = "";

    const selectedTrack = filterTrack.value;

    const valid = allLaps.filter(l => l.valid && l.track === selectedTrack);

    const best = {};
    valid.forEach(l => {
        if (!best[l.driver] || l.lap_time_ms < best[l.driver].lap_time_ms) {
            best[l.driver] = l;
        }
    });

    Object.values(best)
        .sort((a, b) => a.lap_time_ms - b.lap_time_ms)
        .forEach(l => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${l.driver}</td>
                <td>${friendlyCar(l.car)}</td>
                <td>${formatMs(l.lap_time_ms)}</td>
                <td>${l.date}</td>
            `;
            fastestBody.appendChild(tr);
        });
}

// ---------------------------------------------------------
// Full table
// ---------------------------------------------------------
function renderFullTable() {
    tableBody.innerHTML = "";
    let data = [...allLaps];

    const selectedTrack = filterTrack.value;

    // Track filter
    data = data.filter(l => l.track === selectedTrack);

    // Validity
    if (filterValidity.value === "valid") {
        data = data.filter(l => l.valid);
    } else if (filterValidity.value === "invalid") {
        data = data.filter(l => !l.valid);
    }

    // Driver
    if (filterDriver.value !== "all") {
        data = data.filter(l => l.driver === filterDriver.value);
    }

    // Sorting
    if (currentSort) {
        data.sort((a, b) => {
            let x = a[currentSort];
            let y = b[currentSort];

            if (currentSort === "lap_time_ms" || currentSort === "lap_count") {
                return (x - y) * sortDirection;
            }

            if (currentSort === "date") {
                return (new Date(x) - new Date(y)) * sortDirection;
            }

            return x.toString().localeCompare(y.toString()) * sortDirection;
        });
    }

    // Render
    data.forEach(l => {
        const tr = document.createElement("tr");
        tr.className = l.valid ? "valid" : "invalid";
        tr.innerHTML = `
            <td>${l.driver}</td>
            <td>${friendlyCar(l.car)}</td>
            <td>${friendlyTrack(l.track)}</td>
            <td>${formatMs(l.lap_time_ms)}</td>
            <td>${l.lap_count}</td>
            <td>${l.valid ? "Yes" : "No"}</td>
            <td>${l.date}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// ---------------------------------------------------------
// Sorting handler
// ---------------------------------------------------------
document.querySelectorAll("th[data-sort]").forEach(th => {
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (currentSort === key) sortDirection *= -1;
        else {
            currentSort = key;
            sortDirection = 1;
        }
        renderFullTable();
    });
});

// ---------------------------------------------------------
// Event hooks
// ---------------------------------------------------------
filterValidity.addEventListener("change", () => {
    renderFastestLaps();
    renderFullTable();
});

filterDriver.addEventListener("change", () => {
    renderFastestLaps();
    renderFullTable();
});

filterTrack.addEventListener("change", () => {
    renderDriverList();
    renderFastestLaps();
    renderFullTable();
});

// ---------------------------------------------------------
// Initial load
// ---------------------------------------------------------
loadData(true);

// ---------------------------------------------------------
// Auto-refresh every 5 minutes (preserving filters)
// ---------------------------------------------------------
setInterval(async () => {
    const prev = {
        track: filterTrack.value,
        driver: filterDriver.value,
        validity: filterValidity.value,
        sort: currentSort,
        dir: sortDirection
    };

    await loadData(false);

    filterTrack.value = prev.track;
    filterDriver.value = prev.driver;
    filterValidity.value = prev.validity;
    currentSort = prev.sort;
    sortDirection = prev.dir;

    renderFastestLaps();
    renderFullTable();

}, 300000);
