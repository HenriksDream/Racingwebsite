// =======================================
// CONFIG
// =======================================
const API_URL = "https://api.racinggamers.se/laptimes.json";

const statusBox = document.getElementById("status");

// TOP TABLE
const fastestBody = document.querySelector("#fastest-table tbody");

// MAIN TABLE
const tableBody = document.querySelector("#laps-table tbody");

const validityFilter = document.getElementById("filter-validity");
const driverFilter = document.getElementById("filter-driver");

let allLaps = [];
let currentSort = null;
let sortDirection = 1;

// =======================================
// HELPERS
// =======================================
function formatMs(ms) {
    if (!ms) return "-";
    let totalSeconds = Math.floor(ms / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    let milli = ms % 1000;

    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milli.toString().padStart(3, "0")}`;
}

// =======================================
// LOAD DATA FROM API
// =======================================
async function loadData() {
    try {
        statusBox.textContent = "Loading…";

        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("API error");

        allLaps = await response.json();
        statusBox.textContent = "";

        populateDriverDropdown();
        renderFastestTable();
        renderMainTable();

    } catch (error) {
        console.error(error);
        statusBox.textContent = "Error fetching data";
    }
}

// =======================================
// DRIVER DROPDOWN
// =======================================
function populateDriverDropdown() {
    let drivers = [...new Set(allLaps.map(l => l.driver))];

    driverFilter.innerHTML = `<option value="all">All drivers</option>`;

    drivers.forEach(d => {
        let opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        driverFilter.appendChild(opt);
    });
}

// =======================================
// FASTEST VALID LAP PER DRIVER
// =======================================
function renderFastestTable() {
    fastestBody.innerHTML = "";

    const validLaps = allLaps.filter(l => l.valid);

    let bestPerDriver = {};

    validLaps.forEach(lap => {
        const d = lap.driver;

        // If no best stored yet OR this is faster → update
        if (!bestPerDriver[d] || lap.lap_time_ms < bestPerDriver[d].lap_time_ms) {
            bestPerDriver[d] = lap;
        }
    });

    // build table rows
    Object.values(bestPerDriver)
        .sort((a, b) => a.lap_time_ms - b.lap_time_ms)
        .forEach(l => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${l.driver}</td>
                <td>${formatMs(l.lap_time_ms)}</td>
                <td>${l.date}</td>
            `;
            fastestBody.appendChild(tr);
        });
}

// =======================================
// MAIN TABLE (All laps)
// =======================================
function renderMainTable() {
    tableBody.innerHTML = "";

    let filtered = [...allLaps];

    // Validity filter
    const v = validityFilter.value;
    if (v === "valid") filtered = filtered.filter(l => l.valid === true);
    if (v === "invalid") filtered = filtered.filter(l => l.valid === false);

    // Driver filter
    const d = driverFilter.value;
    if (d !== "all") filtered = filtered.filter(l => l.driver === d);

    // Sorting
    if (currentSort) {
        filtered.sort((a, b) => {
            const x = a[currentSort];
            const y = b[currentSort];

            if (currentSort === "lap_time_ms" || currentSort === "lap_count" || currentSort === "session_time_ms") {
                return (x - y) * sortDirection;
            }

            if (currentSort === "date") {
                return (new Date(x) - new Date(y)) * sortDirection;
            }

            return x.toString().localeCompare(y.toString()) * sortDirection;
        });
    }

    // Build rows
    filtered.forEach(item => {
        const tr = document.createElement("tr");
        tr.className = item.valid ? "valid" : "invalid";

        tr.innerHTML = `
            <td>${item.driver}</td>
            <td>${item.car}</td>
            <td>${item.track}</td>
            <td>${formatMs(item.lap_time_ms)}</td>
            <td>${item.lap_count}</td>
            <td>${item.valid}</td>
            <td>${item.date}</td>
        `;

        tableBody.appendChild(tr);
    });
}

// =======================================
// SORTING HANDLERS
// =======================================
document.querySelectorAll("th[data-sort]").forEach(th => {
    th.style.cursor = "pointer";

    th.addEventListener("click", () => {
        const sortKey = th.dataset.sort;

        if (currentSort === sortKey) {
            sortDirection *= -1;
        } else {
            currentSort = sortKey;
            sortDirection = 1;
        }

        renderMainTable();
    });
});

// =======================================
// FILTER LISTENERS
// =======================================
validityFilter.addEventListener("change", renderMainTable);
driverFilter.addEventListener("change", renderMainTable);

// =======================================
// AUTO REFRESH
// =======================================
loadData();
setInterval(loadData, 4000);
