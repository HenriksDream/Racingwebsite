const API_URL = "https://api.racinggamers.se/laptimes.json";

const statusBox = document.getElementById("status");
const tableBody = document.querySelector("#laps-table tbody");
const filterSelect = document.getElementById("filter-validity");

let allLaps = [];           // Full dataset from API
let currentSort = null;     // Column name
let sortDirection = 1;      // 1 = ASC, -1 = DESC

// -------------------------
// Format milliseconds → "1:23.456"
// -------------------------
function formatMs(ms) {
    if (!ms) return "-";
    let totalSeconds = Math.floor(ms / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    let milli = ms % 1000;

    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milli.toString().padStart(3, "0")}`;
}

// -------------------------
// FETCH FROM API
// -------------------------
async function loadData() {
    try {
        statusBox.textContent = "Loading…";

        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("API error");

        allLaps = await response.json();
        statusBox.textContent = "";

        renderTable();

    } catch (error) {
        console.error(error);
        statusBox.textContent = "Error fetching data";
    }
}

// -------------------------
// RENDER TABLE (WITH FILTER & SORT)
// -------------------------
function renderTable() {
    tableBody.innerHTML = "";

    let filtered = allLaps;

    // Apply validity filter
    const filterValue = filterSelect.value;
    if (filterValue === "valid") {
        filtered = filtered.filter(l => l.valid === true);
    } else if (filterValue === "invalid") {
        filtered = filtered.filter(l => l.valid === false);
    }

    // Apply sorting
    if (currentSort) {
        filtered.sort((a, b) => {
            let x = a[currentSort];
            let y = b[currentSort];

            // numeric sort for lap time
            if (currentSort === "lap_time_ms" || currentSort === "lap_count") {
                return (x - y) * sortDirection;
            }

            // sort timestamp
            if (currentSort === "date") {
                return (new Date(x) - new Date(y)) * sortDirection;
            }

            // string sort
            return x.toString().localeCompare(y.toString()) * sortDirection;
        });
    }

    // Build all rows
    filtered.forEach(item => {
        const tr = document.createElement("tr");
        tr.className = item.valid ? "valid" : "invalid";

        tr.innerHTML = `
            <td>${item.driver ?? "-"}</td>
            <td>${item.car ?? "-"}</td>
            <td>${item.track ?? "-"}</td>
            <td>${formatMs(item.lap_time_ms)}</td>
            <td>${item.lap_count ?? "-"}</td>
            <td>${item.valid}</td>
            <td>${item.date ?? "-"}</td>
        `;

        tableBody.appendChild(tr);
    });
}

// -------------------------
// SORTING HANDLER
// -------------------------
document.querySelectorAll("th[data-sort]").forEach(th => {
    th.style.cursor = "pointer";

    th.addEventListener("click", () => {
        const sortKey = th.dataset.sort;

        // Toggle direction if sorting same column
        if (currentSort === sortKey) {
            sortDirection *= -1;
        } else {
            currentSort = sortKey;
            sortDirection = 1;
        }

        renderTable();
    });
});

// -------------------------
// FILTER CHANGE HANDLER
// -------------------------
filterSelect.addEventListener("change", () => {
    renderTable();
});

// -------------------------
// INITIAL LOAD + REFRESH LOOP
// -------------------------
loadData();
setInterval(loadData, 3000);
