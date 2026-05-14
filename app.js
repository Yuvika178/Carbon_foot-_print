// ─── Load history from localStorage on startup ───────────────────────────────
var calcHistory = JSON.parse(localStorage.getItem("carbonHistory") || "[]");

var carEmissions = {
    none: 0,
    electric: 0.053,
    hybrid: 0.110,
    petrol: 0.192,
    diesel: 0.171,
    cng: 0.140
};
var gridEmissions = {
    coal: 0.82,
    mixed: 0.45,
    renewable: 0.10,
    solar: 0.04
};
var dietEmissions = {
    vegan: 1100,
    vegetarian: 1700,
    pescatarian: 2000,
    flexitarian: 2200,
    omnivore: 2700,
    heavymeat: 3300
};
var localFoodSavings = { never: 0, sometimes: 100, mostly: 220, always: 380 };
var foodWastePenalty = { low: 0, medium: 150, high: 320 };
var transitSavings = { never: 0, rare: 80, sometimes: 180, often: 320, always: 500 };
var recyclingSavings = { never: 0, sometimes: 80, always: 200 };
var homeSizePenalty = { small: 0, medium: 180, large: 420 };
var hvacPenalty = { none: 0, ac: 220, central: 540 };

function saveHistory() {
    localStorage.setItem("carbonHistory", JSON.stringify(calcHistory));
}

function calculateTransport(carType, kmDriven, flightsShort, flightsLong, transitUse) {
    var carCo2 = (carEmissions[carType] || 0) * kmDriven;
    var flightCo2 = (flightsShort * 255) + (flightsLong * 1200);
    var transitSave = transitSavings[transitUse] || 0;
    return Math.max(0, carCo2 + flightCo2 - transitSave);
}

function calculateHome(electricSource, monthlyKwh, naturalGasM3, homeSize, hvac) {
    var electricFactor = gridEmissions[electricSource] || 0.45;
    var electricCo2 = monthlyKwh * 12 * electricFactor;
    var gasCo2 = naturalGasM3 * 2.04;
    var sizePenalty = homeSizePenalty[homeSize] || 0;
    var hvacPen = hvacPenalty[hvac] || 0;
    return electricCo2 + gasCo2 + sizePenalty + hvacPen;
}

function calculateDiet(dietType, localFood, foodWaste, bottledLitersDay) {
    var base = dietEmissions[dietType] || 2200;
    var localSave = localFoodSavings[localFood] || 0;
    var wastePen = foodWastePenalty[foodWaste] || 0;
    var bottledCo2 = bottledLitersDay * 365 * 0.20;
    return Math.max(0, base - localSave + wastePen + bottledCo2);
}

function calculateLifestyle(monthlySpendINR, streamingHrsDay, recycling, electronicsPerYear) {
    var spendCo2 = (monthlySpendINR * 12) * 0.0008;
    var streamCo2 = streamingHrsDay * 365 * 0.036;
    var recycleSave = recyclingSavings[recycling] || 0;
    var electronicsCo2 = electronicsPerYear * 300;
    return Math.max(0, spendCo2 + streamCo2 - recycleSave + electronicsCo2);
}

function getStatus(total) {
    if (total < 2000) return { label: "Excellent", cls: "status-great" };
    if (total < 4000) return { label: "Good", cls: "status-good" };
    if (total < 8000) return { label: "High", cls: "status-high" };
    return { label: "Critical", cls: "status-danger" };
}

function getStatusColor(total) {
    if (total < 2000) return "#4ade80";
    if (total < 4000) return "#facc15";
    if (total < 8000) return "#fb923c";
    return "#f87171";
}

function formatNum(n) { return Math.round(n).toLocaleString(); }

function runCalculation() {
    var carType = document.getElementById("carType").value;
    var kmDriven = parseFloat(document.getElementById("kmDriven").value);
    var flightsShort = parseFloat(document.getElementById("flightsShort").value);
    var flightsLong = parseFloat(document.getElementById("flightsLong").value);
    var transitUse = document.getElementById("transitUse").value;
    var electricSource = document.getElementById("electricSource").value;
    var electricity = parseFloat(document.getElementById("electricity").value);
    var naturalGas = parseFloat(document.getElementById("naturalGas").value);
    var homeSize = document.getElementById("homeSize").value;
    var hvac = document.getElementById("hvac").value;
    var dietType = document.getElementById("dietType").value;
    var localFood = document.getElementById("localFood").value;
    var foodWaste = document.getElementById("foodWaste").value;
    var bottledWater = parseFloat(document.getElementById("bottledWater").value);
    var shopping = parseFloat(document.getElementById("shopping").value);
    var streaming = parseFloat(document.getElementById("streaming").value);
    var recycling = document.getElementById("recycling").value;
    var electronics = parseFloat(document.getElementById("electronics").value);

    var transport = calculateTransport(carType, kmDriven, flightsShort, flightsLong, transitUse);
    var home = calculateHome(electricSource, electricity, naturalGas, homeSize, hvac);
    var diet = calculateDiet(dietType, localFood, foodWaste, bottledWater);
    var lifestyle = calculateLifestyle(shopping, streaming, recycling, electronics);
    var total = transport + home + diet + lifestyle;

    var status = getStatus(total);
    var statusColor = getStatusColor(total);
    var trees = Math.ceil(total / 21);

    var benchmarks = [
        { label: "Your footprint", val: total, color: statusColor },
        { label: "World average", val: 4700, color: "#6b8f72" },
        { label: "India average", val: 1800, color: "#6b8f72" },
        { label: "Paris 2030 target", val: 2000, color: "#4ade80" }
    ];
    var maxBench = Math.max(total, 16000);

    var breakdowns = [
        { icon: "🚗", cat: "Transport", val: transport },
        { icon: "🏠", cat: "Home Energy", val: home },
        { icon: "🥗", cat: "Diet & Food", val: diet },
        { icon: "💼", cat: "Lifestyle", val: lifestyle }
    ];
    var maxBreak = Math.max(transport, home, diet, lifestyle, 1);

    var bdHtml = breakdowns.map(function(b) {
        var pct = Math.round((b.val / maxBreak) * 100);
        return '<div class="breakdown-card">' +
            '<div class="breakdown-icon">' + b.icon + '</div>' +
            '<div class="breakdown-cat">' + b.cat + '</div>' +
            '<div class="breakdown-val">' + formatNum(b.val) + ' <span style="font-size:12px;color:var(--text-muted)">kg</span></div>' +
            '<div class="breakdown-bar-track"><div class="breakdown-bar-fill" style="width:' + pct + '%"></div></div>' +
            '</div>';
    }).join('');

    var compHtml = benchmarks.map(function(b) {
        var pct = Math.min(100, Math.round((b.val / maxBench) * 100));
        return '<div class="comparison-row">' +
            '<span class="comp-label">' + b.label + '</span>' +
            '<div class="comp-track"><div class="comp-fill" style="width:' + pct + '%;background:' + b.color + '"></div></div>' +
            '<span class="comp-val">' + formatNum(b.val) + ' kg</span>' +
            '</div>';
    }).join('');

    document.getElementById("resultsWrapper").innerHTML =
        '<div class="result-hero">' +
        '<div class="result-label">Your Annual Carbon Footprint</div>' +
        '<div class="result-total" style="color:' + statusColor + '">' + formatNum(total) + '</div>' +
        '<div class="result-unit">kg CO₂ equivalent / year</div>' +
        '<span class="result-status ' + status.cls + '">' + status.label + '</span>' +
        '</div>' +
        '<div class="breakdown-grid">' + bdHtml + '</div>' +
        '<div class="comparisons-section"><h3>How you compare</h3>' + compHtml + '</div>' +
        '<div class="trees-section">' +
        '<div class="trees-icon">🌳</div>' +
        '<div class="trees-text">' +
        '<div class="trees-num">' + formatNum(trees) + ' trees</div>' +
        '<div class="trees-desc">needed to offset your annual footprint (21 kg CO₂e absorbed per tree/year)</div>' +
        '</div>' +
        '</div>';

    var now = new Date();
    var dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    calcHistory.unshift({ date: dateStr, total: total, status: status });
    saveHistory(); // ← persist to localStorage
    renderHistory();
    switchTab("results");
}

function renderHistory() {
    var list = document.getElementById("historyList");
    if (calcHistory.length === 0) {
        list.innerHTML = '<div class="empty-history">No calculations yet. Your saved results will appear here.</div>';
        return;
    }
    list.innerHTML = calcHistory.map(function(item) {
        return '<div class="history-item">' +
            '<span class="history-date">' + item.date + '</span>' +
            '<span class="history-val">' + formatNum(item.total) + ' kg CO₂e/yr</span>' +
            '<span class="history-badge ' + item.status.cls + '">' + item.status.label + '</span>' +
            '</div>';
    }).join('');
}

function switchTab(name) {
    document.querySelectorAll(".tab").forEach(function(t) { t.classList.remove("active"); });
    document.querySelectorAll(".nav-btn").forEach(function(b) { b.classList.remove("active"); });
    document.getElementById("tab-" + name).classList.add("active");
    document.querySelector('[data-tab="' + name + '"]').classList.add("active");
}

function bindRangeDisplay(inputId, displayId, formatter) {
    var input = document.getElementById(inputId);
    var display = document.getElementById(displayId);
    input.addEventListener("input", function() {
        display.textContent = formatter(parseFloat(input.value));
    });
}

document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".nav-btn").forEach(function(btn) {
        btn.addEventListener("click", function() { switchTab(btn.dataset.tab); });
    });

    document.getElementById("btnCalculate").addEventListener("click", runCalculation);

    document.getElementById("btnClearHistory").addEventListener("click", function() {
        calcHistory = [];
        saveHistory(); // ← also wipes localStorage
        renderHistory();
    });

    bindRangeDisplay("kmDriven", "kmDrivenVal", function(v) { return v.toLocaleString() + " km"; });
    bindRangeDisplay("flightsShort", "flightsShortVal", function(v) { return v + " flight" + (v !== 1 ? "s" : ""); });
    bindRangeDisplay("flightsLong", "flightsLongVal", function(v) { return v + " flight" + (v !== 1 ? "s" : ""); });
    bindRangeDisplay("electricity", "electricityVal", function(v) { return v + " kWh"; });
    bindRangeDisplay("naturalGas", "naturalGasVal", function(v) { return v + " m³"; });
    bindRangeDisplay("bottledWater", "bottledWaterVal", function(v) { return v + " L"; });
    bindRangeDisplay("shopping", "shoppingVal", function(v) { return "₹" + v.toLocaleString(); });
    bindRangeDisplay("streaming", "streamingVal", function(v) { return v + " hrs"; });
    bindRangeDisplay("electronics", "electronicsVal", function(v) { return v + " device" + (v !== 1 ? "s" : ""); });

    renderHistory(); // ← show any history already in localStorage
});
