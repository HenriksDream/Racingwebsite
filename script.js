// ---------------------------------------------------
// API CONFIG
// ---------------------------------------------------
const API_URL = "https://vps.racinggamers.se/api/laptimes";

const statusBox = document.getElementById("status");
const fastestBody = document.querySelector("#fastest-table tbody");
const tableBody = document.querySelector("#laps-table tbody");

const filterValidity = document.getElementById("filter-validity");
const filterDriver = document.getElementById("filter-driver");

let allLaps = [];
let currentSort = null;
let sortDirection = 1;

// ---------------------------------------------------
// Utility: Format lap time
// ---------------------------------------------------
function formatMs(ms) {
    if (!ms) return "-";
    let totalSeconds = Math.floor(ms / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    let milli = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milli.toString().padStart(3, "0")}`;
}

// ---------------------------------------------------
// Load data (with silent mode)
// ---------------------------------------------------
async function loadData(showLoading = true) {
    try {
        if (showLoading) statusBox.textContent = "Loading…";

        const response = await fetch(API_URL + `?t=${Date.now()}`); // avoid cache
        if (!response.ok) throw new Error("API error");

        allLaps = await response.json();

        if (showLoading) {
            statusBox.textContent = "";
            renderDriverList();
            renderFastestLaps();
            renderFullTable();
        }

        document.getElementById("last-updated").textContent =
            new Date().toLocaleTimeString();

    } catch (err) {
        console.error(err);
        if (showLoading) statusBox.textContent = "Error fetching data";
    }
}

// ---------------------------------------------------
// Build the driver dropdown
// ---------------------------------------------------
function renderDriverList() {
    let drivers = [...new Set(allLaps.map(l => l.driver))].sort();
    filterDriver.innerHTML = `<option value="all">All drivers</option>`;
    drivers.forEach(d =>
        filterDriver.innerHTML += `<option value="${d}">${d}</option>`
    );
}

// ---------------------------------------------------
// Fastest laps per driver
// ---------------------------------------------------
function renderFastestLaps() {
    fastestBody.innerHTML = "";

    const validLaps = allLaps.filter(l => l.valid);

    const fastest = {};
    validLaps.forEach(l => {
        if (!fastest[l.driver] || l.lap_time_ms < fastest[l.driver].lap_time_ms) {
            fastest[l.driver] = l;
        }
    });

    Object.values(fastest)
        .sort((a, b) => a.lap_time_ms - b.lap_time_ms)
        .forEach(l => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${l.driver}</td>
                <td>${formatMs(l.lap_time_ms)}</td>
                <td>${l.date}</td>
            `;
            fastestBody.appendChild(row);
        });
}

// ---------------------------------------------------
// Render full table
// ---------------------------------------------------
function renderFullTable() {
    tableBody.innerHTML = "";

    let data = [...allLaps];

    // Apply validity filter
    if (filterValidity.value === "valid") {
        data = data.filter(l => l.valid === true);
    } else if (filterValidity.value === "invalid") {
        data = data.filter(l => l.valid === false);
    }

    // Driver filter
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

    // Build rows
    data.forEach(item => {
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

// ---------------------------------------------------
// Sorting handler
// ---------------------------------------------------
document.querySelectorAll("th[data-sort]").forEach(th => {
    th.style.cursor = "pointer";

    th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (currentSort === key) {
            sortDirection *= -1;
        } else {
            currentSort = key;
            sortDirection = 1;
        }
        renderFullTable();
    });
});

// ---------------------------------------------------
// Filters
// ---------------------------------------------------
filterDriver.addEventListener("change", renderFullTable);
filterValidity.addEventListener("change", renderFullTable);

// ---------------------------------------------------
// Initial load
// ---------------------------------------------------
loadData(true);

// ---------------------------------------------------
// Silent refresh every 5 minutes
// ---------------------------------------------------
setInterval(async () => {
    console.log("Silent refresh…");

    const prev = {
        validity: filterValidity.value,
        driver: filterDriver.value,
        sort: currentSort,
        dir: sortDirection
    };

    await loadData(false); // silent fetch

    filterValidity.value = prev.validity;
    filterDriver.value = prev.driver;
    currentSort = prev.sort;
    sortDirection = prev.dir;

    renderFastestLaps();
    renderFullTable();

}, 5 * 60 * 1000);
