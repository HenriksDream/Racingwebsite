// ----------------------------
// CONFIG
// ----------------------------
const API_URL = "https://api.racinggamers.se/laptimes.json";

const statusBox = document.getElementById("status");
const tableBody = document.querySelector("#laps-table tbody");
const filterSelect = document.getElementById("filter-validity");
const driverFilter = document.getElementById("filter-driver");

const fastestBody = document.querySelector("#fastest-table tbody");

let allLaps = [];
let currentSort = null;
let sortDirection = 1;

// ----------------------------
// FORMAT LAP TIME
// ----------------------------
function formatMs(ms) {
    if (!ms) return "-";
    let totalSeconds = Math.floor(ms / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    let milli = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milli.toString().padStart(3, "0")}`;
}

// ----------------------------
// LOAD DATA FROM API
// ----------------------------
async function loadData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("API failed");

        allLaps = await response.json();
        updateDriverFilter();
        renderFastest();
        renderTable();
    } catch (e) {
        console.error(e);
    }
}

// ----------------------------
// BUILD DRIVER DROPDOWN
// ----------------------------
function updateDriverFilter() {
    const drivers = [...new Set(allLaps.map(l => l.driver).filter(Boolean))];

    driverFilter.innerHTML = `<option value="all">All drivers</option>`;
    drivers.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        driverFilter.appendChild(opt);
    });
}

// ----------------------------
// FASTEST VALID LAP PER DRIVER
// ----------------------------
function renderFastest() {
    fastestBody.innerHTML = "";

    const fastest = {};

    allLaps.forEach(lap => {
        if (!lap.valid) return;

        if (!fastest[lap.driver] || lap.lap_time_ms < fastest[lap.driver].lap_time_ms) {
            fastest[lap.driver] = lap;
        }
    });

    Object.entries(fastest).forEach(([driver, lap]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${driver}</td>
            <td>${formatMs(lap.lap_time_ms)}</td>
            <td>${lap.date}</td>
        `;
        fastestBody.appendChild(tr);
    });
}

// ----------------------------
// RENDER ALL LAPS TABLE
// ----------------------------
function renderTable() {
    tableBody.innerHTML = "";

    let filtered = allLaps;

    // validity filter
    if (filterSelect.value === "valid") {
        filtered = filtered.filter(l => l.valid === true);
    } else if (filterSelect.value === "invalid") {
        filtered = filtered.filter(l => l.valid === false);
    }

    // driver filter
    if (driverFilter.value !== "all") {
        filtered = filtered.filter(l => l.driver === driverFilter.value);
    }

    // sorting
    if (currentSort) {
        filtered.sort((a, b) => {
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

    filtered.forEach(item => {
        const tr = document.createElement("tr");
        tr.className = item.valid ? "valid" : "invalid";
        tr.innerHTML = `
            <td>${item.driver ?? "-"}</td>
            <td>${item.car ?? "-"}</td>
            <td>${item.track ?? "-"}</td>
            <td>${formatMs(item.lap_time_ms)}</td>
            <td>${item.lap_count}</td>
            <td>${item.valid}</td>
            <td>${item.date}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// ----------------------------
// SORTING EVENTS
// ----------------------------
document.querySelectorAll("th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
        const key = th.dataset.sort;

        if (currentSort === key) {
            sortDirection *= -1;
        } else {
            currentSort = key;
            sortDirection = 1;
        }

        renderTable();
    });
});

// ----------------------------
// REFRESH EVERY 5 MINUTES
// ----------------------------
loadData();
setInterval(loadData, 5 * 60 * 1000); // 5 minutes

// ----------------------------
// VERSION BOX (GitHub commit)
// ----------------------------
async function updateVersionBox() {
    try {
        const res = await fetch("https://api.github.com/repos/HenriksDream/Racingwebsite/commits/main");
        const data = await res.json();

        const shortHash = data.sha.substring(0, 7);
        const date = new Date(data.commit.author.date)
            .toISOString()
            .split("T")[0];

        document.getElementById("version").textContent =
            `build ${shortHash} (${date})`;
    } catch (err) {
        document.getElementById("version").textContent = "build ???";
    }
}

updateVersionBox();
