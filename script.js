// ===============================
// CONFIG
// ===============================
const API_URL = "https://vps.racinggamers.se/api/laptimes";

// DOM
const statusBox = document.getElementById("status");
const fastestBody = document.querySelector("#fastest-table tbody");
const tableBody = document.querySelector("#laps-table tbody");

const filterValidity = document.getElementById("filter-validity");
const filterDriver = document.getElementById("filter-driver");
const lastUpdated = document.getElementById("last-updated");

let allLaps = [];
let currentSort = null;
let sortDirection = 1;


// ===============================
// UTIL: format ms to readable time
// ===============================
function formatMs(ms) {
    if (!ms) return "-";
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const milli = ms % 1000;

    return `${min}:${sec.toString().padStart(2, "0")}.${milli.toString().padStart(3, "0")}`;
}


// ===============================
// DATA LOADING
// ===============================
async function loadData(showLoading = true) {
    try {
        if (showLoading) {
            statusBox.textContent = "Loading…";
        }

        const response = await fetch(API_URL + `?t=${Date.now()}`);
        if (!response.ok) throw new Error("API request failed");

        allLaps = await response.json();

        // Always update version timestamp
        lastUpdated.textContent = new Date().toLocaleTimeString();

        statusBox.textContent = "";

        if (showLoading) {
            renderDriverList();
            renderFastestLaps();
            renderFullTable();
        }

    } catch (err) {
        console.error(err);
        if (showLoading) {
            statusBox.textContent = "Error fetching data";
        }
    }
}


// ===============================
// DRIVER DROPDOWN
// ===============================
function renderDriverList() {
    const drivers = [...new Set(allLaps.map(l => l.driver))].sort();
    filterDriver.innerHTML = `<option value="all">All drivers</option>`;
    drivers.forEach(d => {
        filterDriver.innerHTML += `<option value="${d}">${d}</option>`;
    });
}


// ===============================
// FASTEST VALID LAP PER DRIVER
// ===============================
function renderFastestLaps() {
    fastestBody.innerHTML = "";

    const valid = allLaps.filter(l => l.valid);
    const fastest = {};

    valid.forEach(l => {
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


// ===============================
// FULL TABLE RENDER
// ===============================
function renderFullTable() {
    tableBody.innerHTML = "";

    let data = [...allLaps];

    // Validity filter
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

            if (["lap_time_ms", "lap_count"].includes(currentSort)) {
                return (x - y) * sortDirection;
            }
            if (currentSort === "date") {
                return (new Date(x) - new Date(y)) * sortDirection;
            }
            return x.toString().localeCompare(y.toString()) * sortDirection;
        });
    }

    // Render rows
    data.forEach(l => {
        const row = document.createElement("tr");
        row.className = l.valid ? "valid" : "invalid";
        row.innerHTML = `
            <td>${l.driver}</td>
            <td>${l.car}</td>
            <td>${l.track}</td>
            <td>${formatMs(l.lap_time_ms)}</td>
            <td>${l.lap_count}</td>
            <td>${l.valid}</td>
            <td>${l.date}</td>
        `;
        tableBody.appendChild(row);
    });
}


// ===============================
// SORTING CLICK HANDLERS
// ===============================
document.querySelectorAll("th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
        const key = th.dataset.sort;

        if (currentSort === key) {
            sortDirection *= -1; // toggle direction
        } else {
            currentSort = key;
            sortDirection = 1;
        }

        renderFullTable();
    });
});


// ===============================
// FILTER EVENTS
// ===============================
filterDriver.addEventListener("change", renderFullTable);
filterValidity.addEventListener("change", renderFullTable);


// ===============================
// INITIAL LOAD
// ===============================
loadData(true);


// ===============================
// SILENT REFRESH EVERY 5 MIN
// ===============================
setInterval(async () => {
    console.log("Silent API refresh…");

    const savedState = {
        validity: filterValidity.value,
        driver: filterDriver.value,
        sort: currentSort,
        dir: sortDirection
    };

    await loadData(false);

    filterValidity.value = savedState.validity;
    filterDriver.value = savedState.driver;
    currentSort = savedState.sort;
    sortDirection = savedState.dir;

    rend
