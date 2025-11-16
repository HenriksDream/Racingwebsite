const API_URL = "https://api.racinggamers.se/laptimes.json";

const statusBox = document.getElementById("status");
const tableBody = document.querySelector("#laps-table tbody");
const fastestBody = document.querySelector("#fastest-table tbody");
const filterSelect = document.getElementById("filter-validity");
const driverSelect = document.getElementById("filter-driver");

let allLaps = [];
let currentSort = null;
let sortDirection = 1;

// Format ms -> 1:23.456
function formatMs(ms) {
    if (!ms) return "-";
    let total = Math.floor(ms / 1000);
    let min = Math.floor(total / 60);
    let sec = total % 60;
    let milli = ms % 1000;
    return `${min}:${sec.toString().padStart(2,"0")}.${milli.toString().padStart(3,"0")}`;
}

async function loadData() {
    try {
        statusBox.textContent = "Loading…";
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("API error");

        allLaps = await response.json();
        statusBox.textContent = "";

        populateDriverFilter();
        renderFastestTable();
        renderFullTable();

    } catch (err) {
        statusBox.textContent = "Error fetching data";
    }
}

// ---------------------
// DRIVER DROPDOWN
// ---------------------
function populateDriverFilter() {
    let drivers = [...new Set(allLaps.map(l => l.driver))].sort();
    driverSelect.innerHTML = `<option value="all">All drivers</option>`;
    drivers.forEach(d => {
        driverSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
}

// ---------------------
// FASTEST VALID LAP PER DRIVER
// ---------------------
function renderFastestTable() {
    fastestBody.innerHTML = "";

    // Only valid laps
    const valid = allLaps.filter(l => l.valid);

    // Group by driver
    const best = {};

    valid.forEach(l => {
        if (!best[l.driver] || l.lap_time_ms < best[l.driver].lap_time_ms) {
            best[l.driver] = l;
        }
    });

    // Convert back into list + sort by lap time
    const fastestList = Object.values(best).sort((a,b)=>a.lap_time_ms - b.lap_time_ms);

    fastestList.forEach(l => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${l.driver}</td>
            <td>${formatMs(l.lap_time_ms)}</td>
            <td>${l.date}</td>
        `;
        fastestBody.appendChild(tr);
    });
}

// ---------------------
// FULL TABLE
// ---------------------
function renderFullTable() {
    tableBody.innerHTML = "";
    let filtered = allLaps;

    // Apply validity filter
    if (filterSelect.value === "valid") filtered = filtered.filter(l=>l.valid);
    if (filterSelect.value === "invalid") filtered = filtered.filter(l=>!l.valid);

    // Apply driver filter
    if (driverSelect.value !== "all") {
        filtered = filtered.filter(l => l.driver === driverSelect.value);
    }

    // Sorting
    if (currentSort) {
        filtered.sort((a,b)=>{
            if (currentSort === "lap_time_ms" || currentSort === "lap_count")
                return (a[currentSort] - b[currentSort]) * sortDirection;

            if (currentSort === "date")
                return (new Date(a.date) - new Date(b.date)) * sortDirection;

            return a[currentSort].localeCompare(b[currentSort]) * sortDirection;
        });
    }

    filtered.forEach(l => {
        const tr = document.createElement("tr");
        tr.className = l.valid ? "valid" : "invalid";
        tr.innerHTML = `
            <td>${l.driver}</td>
            <td>${l.car}</td>
            <td>${l.track}</td>
            <td>${formatMs(l.lap_time_ms)}</td>
            <td>${l.lap_count}</td>
            <td>${l.valid}</td>
            <td>${l.date}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Sorting click handlers
document.querySelectorAll("th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (currentSort === key) sortDirection *= -1;
        else { currentSort = key; sortDirection = 1; }
        renderFullTable();
    });
});

// Filter events
filterSelect.addEventListener("change", renderFullTable);
driverSelect.addEventListener("change", renderFullTable);

// Initial + auto refresh
loadData();
setInterval(loadData, 3000);
