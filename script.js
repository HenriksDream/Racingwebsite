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

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
function formatMs(ms) {
    if (!ms && ms !== 0) return "-";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
}

function updateFilters() {
    const drivers = [...new Set(allLaps.map(l => l.driver))].sort();
    const tracks = [...new Set(allLaps.map(l => l.track_name))].sort();

    filterDriver.innerHTML = `<option value="all">All</option>` +
        drivers.map(d => `<option value="${d}">${d}</option>`).join("");

    filterTrack.innerHTML = `<option value="all">All</option>` +
        tracks.map(t => `<option value="${t}">${t}</option>`).join("");
}

function passesFilters(lap) {
    if (filterValidity.value !== "all") {
        if (filterValidity.value === "true" && !lap.valid) return false;
        if (filterValidity.value === "false" && lap.valid) return false;
    }

    if (filterDriver.value !== "all" && lap.driver !== filterDriver.value)
        return false;

    if (filterTrack.value !== "all" && lap.track_name !== filterTrack.value)
        return false;

    return true;
}

// ---------------------------------------------------------
// FASTEST PER TRACK
// ---------------------------------------------------------
function redrawFastest() {
    const best = {};

    for (const lap of allLaps) {
        if (!lap.valid) continue;
        if (!passesFilters(lap)) continue;

        if (!best[lap.track_name] || lap.lap_time_ms < best[lap.track_name].lap_time_ms) {
            best[lap.track_name] = lap;
        }
    }

    fastestBody.innerHTML = Object.values(best)
        .map(l => `
        <tr>
            <td>${l.driver}</td>
            <td>${l.track_name}</td>
            <td>${l.car_name}</td>
            <td>${formatMs(l.lap_time_ms)}</td>
        </tr>
    `)
        .join("");
}

// ---------------------------------------------------------
// MAIN TABLE
// ---------------------------------------------------------
function redrawTable() {
    let laps = allLaps.filter(passesFilters);

    if (currentSort) {
        laps.sort((a, b) => {
            const A = a[currentSort];
            const B = b[currentSort];
            if (A < B) return -1 * sortDirection;
            if (A > B) return 1 * sortDirection;
            return 0;
        });
    }

    tableBody.innerHTML = laps.map(l => `
        <tr>
            <td>${l.driver}</td>
            <td>${l.track_name}</td>
            <td>${l.car_name}</td>
            <td>${formatMs(l.lap_time_ms)}</td>
            <td>${l.date}</td>
            <td>${l.cuts}</td>
            <td class="${l.valid ? "valid-true" : "valid-false"}">${l.valid}</td>
            <td>${l.s1 ?? "-"}</td>
            <td>${l.s2 ?? "-"}</td>
            <td>${l.s3 ?? "-"}</td>
        </tr>
    `).join("");
}

// ---------------------------------------------------------
// Sorting
// ---------------------------------------------------------
document.querySelectorAll("th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
        const field = th.getAttribute("data-sort");

        if (currentSort === field) sortDirection *= -1;
        else {
            currentSort = field;
            sortDirection = 1;
        }
        redrawTable();
    });
});

// ---------------------------------------------------------
// INIT
// ---------------------------------------------------------
async function load() {
    try {
        statusBox.textContent = "Loading from server…";

        const res = await fetch(API_URL);
        allLaps = await res.json();

        updateFilters();
        redrawTable();
        redrawFastest();

        statusBox.textContent = "Loaded";
    } catch (err) {
        statusBox.textContent = "Error loading API";
        console.error(err);
    }
}

filterValidity.onchange = filterDriver.onchange = filterTrack.onchange = () => {
    redrawTable();
    redrawFastest();
};

load();
