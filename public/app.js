// NDRF AAGHAZ-GIS Decision Support System Client Logic

// Global state
let currentRegionId = "himalayan-uttarakhand";
let assessmentData = null;
let map = null;

// Layer groups
let redZoneLayerGroup = null;
let orangeZoneLayerGroup = null;
let habitationsLayerGroup = null;
let safeSitesLayerGroup = null;
let vectorsLayerGroup = null;
let baseTileLayer = null;

// CARTO Basemap API Key configuration
const CARTO_API_KEY = "cb1_32tl_1_60f815ee37d4d1cee8d60fbd";

// Tile layers with authenticated CARTO basemaps (CARTO requires ?key= parameter)
const tileProviders = {
  dark: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
  voyager: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
};

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
  initIcons();
  initMap();
  initTabs();
  initEventListeners();
  await loadRegionalData(currentRegionId);
});

function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Initialize Leaflet Map
function initMap() {
  map = L.map("map", {
    zoomControl: true,
    attributionControl: false
  }).setView([30.5564, 79.5662], 12);

  // Default CARTO Dark Matter base tile (authenticated with API key)
  baseTileLayer = L.tileLayer(tileProviders.dark, {
    maxZoom: 19,
    subdomains: "abcd"
  }).addTo(map);

  // Initialize Layer Groups
  redZoneLayerGroup = L.layerGroup().addTo(map);
  orangeZoneLayerGroup = L.layerGroup().addTo(map);
  vectorsLayerGroup = L.layerGroup().addTo(map);
  safeSitesLayerGroup = L.layerGroup().addTo(map);
  habitationsLayerGroup = L.layerGroup().addTo(map);

  // Basemap switchers
  const bmButtons = [
    { id: "bm-dark", type: "dark" },
    { id: "bm-voyager", type: "voyager" },
    { id: "bm-topo", type: "topo" },
    { id: "bm-satellite", type: "satellite" }
  ];

  bmButtons.forEach(({ id, type }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        bmButtons.forEach(b => {
          const el = document.getElementById(b.id);
          if (el) {
            el.classList.remove("bg-blue-950", "text-cyan-400", "border-blue-600");
            el.classList.add("bg-slate-800", "text-slate-300", "border-slate-700");
          }
        });
        btn.classList.add("bg-blue-950", "text-cyan-400", "border-blue-600");
        btn.classList.remove("bg-slate-800", "text-slate-300", "border-slate-700");
        switchBasemap(type);
      });
    }
  });
}

function switchBasemap(type) {
  if (baseTileLayer) map.removeLayer(baseTileLayer);
  baseTileLayer = L.tileLayer(tileProviders[type], {
    maxZoom: 18,
    subdomains: "abcd"
  }).addTo(map);
  baseTileLayer.bringToBack();
}

// Fetch and load assessment data for selected region
async function loadRegionalData(regionId, customOverrides = {}) {
  try {
    let url = `/api/assessment?regionId=${regionId}`;
    if (customOverrides.currentRainfall24hMm !== undefined) {
      url += `&rainfall=${customOverrides.currentRainfall24hMm}`;
    }
    if (customOverrides.riverLevelM !== undefined) {
      url += `&riverLevel=${customOverrides.riverLevelM}`;
    }
    if (customOverrides.soilSaturationPercent !== undefined) {
      url += `&soilSaturation=${customOverrides.soilSaturationPercent}`;
    }

    const res = await fetch(url);
    const json = await res.json();
    if (json.success) {
      assessmentData = json.data;
      updateUI(assessmentData);
    }
  } catch (err) {
    console.error("Failed to load regional data:", err);
  }
}

// Update UI with assessment data
function updateUI(data) {
  // 1. Update Header Telemetry
  document.getElementById("header-rainfall").textContent = `${data.environmentalState.currentRainfall24hMm} mm/24h`;
  document.getElementById("header-river").textContent = `River ${data.environmentalState.riverLevelM}m`;

  // Update slider positions
  document.getElementById("slider-rainfall").value = data.environmentalState.currentRainfall24hMm;
  document.getElementById("val-rainfall").textContent = `${data.environmentalState.currentRainfall24hMm} mm`;
  document.getElementById("slider-river").value = data.environmentalState.riverLevelM;
  document.getElementById("val-river").textContent = `${data.environmentalState.riverLevelM} m`;
  document.getElementById("slider-soil").value = data.environmentalState.soilSaturationPercent;
  document.getElementById("val-soil").textContent = `${data.environmentalState.soilSaturationPercent}%`;

  // 2. Update Operational KPIs
  document.getElementById("kpi-total-pop").textContent = data.kpis.totalPopulationMonitored.toLocaleString();
  document.getElementById("kpi-immediate-pop").textContent = data.kpis.immediateRelocationPopulation.toLocaleString();
  document.getElementById("kpi-immediate-villages").textContent = data.kpis.immediateRelocationCount;
  document.getElementById("kpi-shortterm-pop").textContent = data.kpis.shortTermRelocationPopulation.toLocaleString();
  document.getElementById("kpi-safe-capacity").textContent = data.kpis.netSafeAbsorptionCapacityRemaining.toLocaleString();
  document.getElementById("kpi-red-zones").textContent = data.kpis.redZonesActiveCount;

  // 3. Render Map Layers
  renderMapLayers(data);

  // 4. Render Tabs Content
  renderCarryingCapacityTab(data.safeSites);
  renderHabitationsTab(data.habitations, data.relocationAllocations);
  renderLogisticsTab(data.logisticsRequirements);

  initIcons();
}

// Render GIS Map Overlays
function renderMapLayers(data) {
  // Clear previous layers
  redZoneLayerGroup.clearLayers();
  orangeZoneLayerGroup.clearLayers();
  habitationsLayerGroup.clearLayers();
  safeSitesLayerGroup.clearLayers();
  vectorsLayerGroup.clearLayers();

  // Set Map Center
  map.setView(data.region.center, data.region.zoom);

  // 1. Render Hazard Zones (Red & Orange Polygons)
  data.hazardZones.forEach(zone => {
    const isRed = zone.level === "RED";
    const polygon = L.polygon(zone.polygon, {
      color: isRed ? "#ef4444" : "#f97316",
      fillColor: isRed ? "#dc2626" : "#ea580c",
      fillOpacity: isRed ? 0.35 : 0.22,
      weight: isRed ? 2.5 : 1.5,
      dashArray: isRed ? null : "4, 4"
    });

    const popupContent = `
      <div class="text-xs p-1">
        <div class="font-bold flex items-center space-x-1 ${isRed ? 'text-red-400' : 'text-orange-400'}">
          <span>${isRed ? '🛑 MULTI-HAZARD RED ZONE' : '⚠️ ORANGE BUFFER ZONE'}</span>
        </div>
        <div class="font-semibold text-white mt-1 text-sm">${zone.name}</div>
        <div class="text-slate-300 mt-1 text-[11px] leading-relaxed">${zone.description}</div>
        <div class="mt-2 pt-1.5 border-t border-slate-700 flex justify-between font-mono text-[10px]">
          <span class="text-slate-400">Dominant Hazard:</span>
          <span class="text-white font-medium">${zone.dominantHazard}</span>
        </div>
        <div class="flex justify-between font-mono text-[10px] mt-0.5">
          <span class="text-slate-400">Hazard Intensity Score:</span>
          <span class="text-red-400 font-bold">${zone.hazardScore} / 1.00</span>
        </div>
      </div>
    `;
    polygon.bindPopup(popupContent);

    if (isRed) {
      redZoneLayerGroup.addLayer(polygon);
    } else {
      orangeZoneLayerGroup.addLayer(polygon);
    }
  });

  // 2. Render Candidate Safe Relocation Sites
  data.safeSites.forEach(site => {
    const isWaterBottleneck = site.metrics.bindingBottleneck === "POTABLE_WATER_YIELD";
    const markerHtml = `
      <div class="relative flex items-center justify-center cursor-pointer">
        <div class="w-8 h-8 rounded-lg bg-emerald-700/90 border-2 border-emerald-300 flex items-center justify-center shadow-lg shadow-emerald-950/80">
          <span class="text-xs font-bold text-white">🛡️</span>
        </div>
        <div class="absolute -bottom-2 bg-emerald-950 text-emerald-300 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-emerald-500 shadow">
          ${site.metrics.utilizationPercentage}%
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: markerHtml,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker(site.coordinates, { icon: customIcon });

    const popupContent = `
      <div class="text-xs p-1 space-y-2 min-w-[240px]">
        <div class="flex items-center justify-between border-b border-slate-700 pb-1">
          <span class="text-emerald-400 font-bold text-[10px] uppercase">Candidate Safe Site</span>
          <span class="text-[10px] font-mono text-slate-400">Suitability: ${site.suitability.score}/100</span>
        </div>
        <div class="font-bold text-white text-sm">${site.siteName}</div>
        
        <div class="bg-slate-900/80 rounded p-2 space-y-1 font-mono text-[11px]">
          <div class="flex justify-between">
            <span class="text-slate-400">Gross Capacity:</span>
            <span class="text-white font-bold">${site.metrics.grossCapacityPersons.toLocaleString()} persons</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Net Headroom:</span>
            <span class="text-emerald-400 font-bold">${site.metrics.remainingAbsorptionCapacity.toLocaleString()} persons</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">CPHEEO Water Yield:</span>
            <span class="text-blue-300 font-bold">${(site.capacities.waterYieldLPD / 1000).toFixed(0)}k LPD</span>
          </div>
        </div>

        <div class="text-[10px] p-1.5 rounded ${isWaterBottleneck ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60' : 'bg-slate-900 text-slate-300'}">
          <span class="font-bold">Bottleneck Analysis:</span> ${site.metrics.bottleneckDescription}
        </div>
      </div>
    `;
    marker.bindPopup(popupContent);
    safeSitesLayerGroup.addLayer(marker);
  });

  // 3. Render Vulnerable Habitations
  data.habitations.forEach(hab => {
    const isImmediate = hab.relocation.priorityTier === "IMMEDIATE";
    const isShortTerm = hab.relocation.priorityTier === "SHORT_TERM";
    const pulseClass = isImmediate ? "marker-pulse-red" : isShortTerm ? "marker-pulse-orange" : "";
    const innerColor = isImmediate ? "#ef4444" : isShortTerm ? "#f97316" : "#eab308";

    const markerHtml = `
      <div class="${pulseClass}">
        <div class="marker-inner" style="background-color: ${innerColor};"></div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: markerHtml,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker(hab.coordinates, { icon: customIcon });

    const popupContent = `
      <div class="text-xs p-1 space-y-1.5 min-w-[220px]">
        <div class="flex items-center justify-between border-b border-slate-700 pb-1">
          <span class="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${isImmediate ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}">
            ${hab.relocation.priorityBadge}
          </span>
          <span class="text-[10px] font-mono text-slate-400">RUI: ${hab.relocation.ruiScore}</span>
        </div>
        <div class="font-bold text-white text-sm">${hab.name}</div>
        <div class="text-slate-300 text-[11px]"><span class="text-slate-400">Hazard:</span> ${hab.primaryHazard}</div>
        <div class="flex justify-between font-mono text-[11px] pt-1 border-t border-slate-800">
          <span class="text-slate-400">Population:</span>
          <span class="text-white font-bold">${hab.population} (${hab.households} HH)</span>
        </div>
        <div class="flex justify-between font-mono text-[11px]">
          <span class="text-slate-400">Kutcha Houses:</span>
          <span class="text-amber-400 font-bold">${hab.kutchaHousePercentage}%</span>
        </div>
        <div class="pt-2">
          <button onclick="openHabitationModal('${hab.id}')" class="w-full py-1 rounded bg-blue-600 hover:bg-blue-500 text-[11px] font-semibold text-white">
            View Full Relocation Dossier
          </button>
        </div>
      </div>
    `;
    marker.bindPopup(popupContent);
    habitationsLayerGroup.addLayer(marker);
  });

  // 4. Render Dynamic Relocation Transit Vectors (connecting lines)
  data.relocationAllocations.forEach(alloc => {
    const isImmediate = alloc.urgencyTier === "IMMEDIATE";
    const line = L.polyline([alloc.originCoordinates, alloc.assignedSiteCoordinates], {
      color: isImmediate ? "#ef4444" : "#10b981",
      weight: isImmediate ? 2.5 : 1.8,
      opacity: 0.8,
      dashArray: "6, 6"
    });

    line.bindTooltip(`
      <div class="text-[10px] font-mono">
        <strong>${alloc.habitationName}</strong> ➔ <strong>${alloc.assignedSiteName}</strong><br/>
        Distance: ${alloc.distanceKm} km | Transit Time: ~${alloc.estimatedTransitTimeMin} min
      </div>
    `, { sticky: true });

    vectorsLayerGroup.addLayer(line);
  });
}

// Render Carrying Capacity Tab
function renderCarryingCapacityTab(sites) {
  const container = document.getElementById("safe-sites-container");
  container.innerHTML = "";

  sites.forEach(site => {
    const isBottleneckWater = site.metrics.bindingBottleneck === "POTABLE_WATER_YIELD";
    const card = document.createElement("div");
    card.className = "glass-panel glass-panel-hover rounded-2xl p-4 space-y-3.5 border border-slate-800/80 transition-all";

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h4 class="font-bold text-xs text-white tracking-tight">${site.siteName}</h4>
          </div>
          <div class="text-[10px] text-slate-400 mt-1 font-mono">
            Terrain: ${site.suitability.terrainSlopeDeg}° slope • Road: ${site.suitability.roadAccess}
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
            ${site.suitability.score}/100 Suitability
          </span>
        </div>
      </div>

      <!-- Capacity Progress Bar -->
      <div class="space-y-1.5">
        <div class="flex justify-between text-[11px] font-mono">
          <span class="text-slate-400">Allocated Absorption Load:</span>
          <span class="text-white font-bold">${site.metrics.allottedPopulation.toLocaleString()} / ${site.metrics.grossCapacityPersons.toLocaleString()} (<span class="${site.metrics.utilizationPercentage > 80 ? 'text-rose-400' : 'text-emerald-400'}">${site.metrics.utilizationPercentage}%</span>)</span>
        </div>
        <div class="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500 ${site.metrics.utilizationPercentage > 80 ? 'bg-rose-500' : 'bg-emerald-500'}" style="width: ${Math.min(100, site.metrics.utilizationPercentage)}%"></div>
        </div>
      </div>

      <!-- Multi-factor Breakdown Grid -->
      <div class="grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div class="p-2.5 rounded-xl bg-[#090f1d] border border-slate-800/70">
          <div class="text-slate-400 font-sans text-[10px]">Hydrological Cap</div>
          <div class="text-sky-300 font-bold text-xs mt-0.5">${site.capacities.waterCapacityPersons.toLocaleString()} persons</div>
          <div class="text-[9px] text-slate-500">${(site.capacities.waterYieldLPD / 1000).toFixed(0)}k LPD (135 LPCD)</div>
        </div>

        <div class="p-2.5 rounded-xl bg-[#090f1d] border border-slate-800/70">
          <div class="text-slate-400 font-sans text-[10px]">Spatial Land Cap</div>
          <div class="text-emerald-300 font-bold text-xs mt-0.5">${site.capacities.spatialCapacityPersons.toLocaleString()} persons</div>
          <div class="text-[9px] text-slate-500">${site.capacities.usableLandHectares} buildable Ha</div>
        </div>
      </div>

      <!-- Binding Bottleneck Alert -->
      <div class="p-2.5 rounded-xl text-[11px] leading-relaxed ${isBottleneckWater ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40' : 'bg-sky-950/40 text-sky-300 border border-sky-800/40'}">
        <span class="font-bold uppercase tracking-wider text-[10px] block mb-0.5">Binding Bottleneck Analysis</span>
        <span class="text-slate-300">${site.metrics.bottleneckDescription}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

// Render Vulnerable Habitations Tab
function renderHabitationsTab(habitations, allocations) {
  const container = document.getElementById("habitations-list-container");
  container.innerHTML = "";

  habitations.forEach(hab => {
    const isImmediate = hab.relocation.priorityTier === "IMMEDIATE";
    const isShort = hab.relocation.priorityTier === "SHORT_TERM";
    const card = document.createElement("div");
    card.className = "hab-card glass-panel glass-panel-hover rounded-2xl p-3.5 border border-slate-800/80 cursor-pointer space-y-2.5 transition-all";
    card.setAttribute("data-tier", hab.relocation.priorityTier);

    const alloc = allocations.find(a => a.habitationId === hab.id);

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full ${isImmediate ? 'bg-rose-500' : isShort ? 'bg-amber-500' : 'bg-yellow-500'}"></span>
            <span class="font-bold text-xs text-white tracking-tight">${hab.name}</span>
          </div>
          <div class="text-[10px] text-slate-400 mt-1">${hab.primaryHazard}</div>
        </div>
        <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isImmediate ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50' : 'bg-amber-950/80 text-amber-300 border border-amber-800/50'}">
          RUI ${hab.relocation.ruiScore}
        </span>
      </div>

      <div class="flex items-center justify-between text-[11px] font-mono text-slate-300 border-t border-slate-800/80 pt-2">
        <span>Pop: <strong class="text-white">${hab.population}</strong></span>
        <span>Kutcha: <strong class="text-amber-400">${hab.kutchaHousePercentage}%</strong></span>
        <span>History: <strong class="text-sky-400">${hab.disasterHistoryCount} slips</strong></span>
      </div>

      <div class="text-[10px] text-slate-400 flex items-center justify-between bg-[#090f1d] border border-slate-800/60 p-2 rounded-xl">
        <span>Assigned Safe Zone:</span>
        <span class="text-emerald-400 font-semibold font-mono">${alloc ? alloc.assignedSiteName : 'Pending'} (~${alloc ? alloc.distanceKm : '--'} km)</span>
      </div>
    `;

    card.addEventListener("click", () => openHabitationModal(hab.id));
    container.appendChild(card);
  });
}

// Render NDRF Logistics Tab
function renderLogisticsTab(logistics) {
  const grid = document.getElementById("logistics-grid");
  grid.innerHTML = `
    <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
      <div class="text-[10px] uppercase font-semibold text-slate-400">NDRF Rescue Battalions</div>
      <div class="text-2xl font-bold font-mono text-cyan-400">${logistics.ndrfRescueBattalionsRecommended}</div>
      <div class="text-[9px] text-slate-500">Quick-response troop units</div>
    </div>

    <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
      <div class="text-[10px] uppercase font-semibold text-slate-400">Transit Evacuation Buses</div>
      <div class="text-2xl font-bold font-mono text-amber-400">${logistics.evacuationBusesRequired}</div>
      <div class="text-[9px] text-slate-500">40-seater heavy transit</div>
    </div>

    <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
      <div class="text-[10px] uppercase font-semibold text-slate-400">Mobile Water Tankers</div>
      <div class="text-2xl font-bold font-mono text-blue-400">${logistics.emergencyPotableWaterTankersDaily}</div>
      <div class="text-[9px] text-slate-500">10k Liter CPHEEO units</div>
    </div>

    <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
      <div class="text-[10px] uppercase font-semibold text-slate-400">Emergency Family Shelters</div>
      <div class="text-2xl font-bold font-mono text-emerald-400">${logistics.temporarySheltersUnits}</div>
      <div class="text-[9px] text-slate-500">Weather-proof habitations</div>
    </div>
  `;
}

// Open Habitation Dossier Modal
window.openHabitationModal = function(habId) {
  if (!assessmentData) return;
  const hab = assessmentData.habitations.find(h => h.id === habId);
  if (!hab) return;

  const alloc = assessmentData.relocationAllocations.find(a => a.habitationId === hab.id);

  document.getElementById("modal-hab-id").textContent = hab.id;
  document.getElementById("modal-hab-name").textContent = hab.name;
  document.getElementById("modal-hab-hazard").textContent = `Dominant Hazard: ${hab.primaryHazard} (${hab.hazard.zoneStatus})`;
  document.getElementById("modal-hab-rui").textContent = hab.relocation.ruiScore;
  document.getElementById("modal-hab-pop").textContent = `${hab.population} (${hab.households} HH)`;
  document.getElementById("modal-hab-kutcha").textContent = `${hab.kutchaHousePercentage}%`;
  document.getElementById("modal-hab-site").textContent = alloc ? alloc.assignedSiteName : "Unassigned";
  document.getElementById("modal-hab-dist").textContent = alloc ? `${alloc.distanceKm} km (~${alloc.estimatedTransitTimeMin} mins)` : "N/A";
  document.getElementById("modal-hab-road").textContent = hab.accessRoadType;
  document.getElementById("modal-hab-demo").textContent = `Children: ${hab.vulnerableDemographics.children} | Elderly: ${hab.vulnerableDemographics.elderly} | Disabled: ${hab.vulnerableDemographics.disabled}`;
  document.getElementById("modal-hab-history").textContent = `${hab.disasterHistoryCount} historical disaster events`;

  const modal = document.getElementById("habitation-modal");
  modal.classList.remove("hidden");

  document.getElementById("modal-fly-map-btn").onclick = () => {
    modal.classList.add("hidden");
    map.flyTo(hab.coordinates, 14, { duration: 1.2 });
  };
};

// Event Listeners Setup
function initEventListeners() {
  // Region Selector
  document.getElementById("region-selector").addEventListener("change", async (e) => {
    currentRegionId = e.target.value;
    await loadRegionalData(currentRegionId);
  });

  // Layer Toggles
  document.getElementById("layer-toggle-redzones").addEventListener("change", (e) => {
    if (e.target.checked) map.addLayer(redZoneLayerGroup);
    else map.removeLayer(redZoneLayerGroup);
  });

  document.getElementById("layer-toggle-orangezones").addEventListener("change", (e) => {
    if (e.target.checked) map.addLayer(orangeZoneLayerGroup);
    else map.removeLayer(orangeZoneLayerGroup);
  });

  document.getElementById("layer-toggle-habitations").addEventListener("change", (e) => {
    if (e.target.checked) map.addLayer(habitationsLayerGroup);
    else map.removeLayer(habitationsLayerGroup);
  });

  document.getElementById("layer-toggle-safesites").addEventListener("change", (e) => {
    if (e.target.checked) map.addLayer(safeSitesLayerGroup);
    else map.removeLayer(safeSitesLayerGroup);
  });

  document.getElementById("layer-toggle-vectors").addEventListener("change", (e) => {
    if (e.target.checked) map.addLayer(vectorsLayerGroup);
    else map.removeLayer(vectorsLayerGroup);
  });

  // Sliders input updates
  const sliderRain = document.getElementById("slider-rainfall");
  sliderRain.addEventListener("input", (e) => {
    document.getElementById("val-rainfall").textContent = `${e.target.value} mm`;
  });

  const sliderRiver = document.getElementById("slider-river");
  sliderRiver.addEventListener("input", (e) => {
    document.getElementById("val-river").textContent = `${e.target.value} m`;
  });

  const sliderSoil = document.getElementById("slider-soil");
  sliderSoil.addEventListener("input", (e) => {
    document.getElementById("val-soil").textContent = `${e.target.value}%`;
  });

  // Apply Simulation Button
  document.getElementById("btn-apply-simulation").addEventListener("click", async () => {
    const rainfall = Number(sliderRain.value);
    const riverLevel = Number(sliderRiver.value);
    const soilSaturation = Number(sliderSoil.value);

    await loadRegionalData(currentRegionId, {
      currentRainfall24hMm: rainfall,
      riverLevelM: riverLevel,
      soilSaturationPercent: soilSaturation
    });
  });

  // Disaster Preset Buttons
  document.querySelectorAll(".btn-preset").forEach(btn => {
    btn.addEventListener("click", async () => {
      const preset = btn.getAttribute("data-preset");
      try {
        const res = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regionId: currentRegionId,
            preset
          })
        });
        const json = await res.json();
        if (json.success) {
          assessmentData = json.data;
          updateUI(assessmentData);
        }
      } catch (err) {
        console.error("Simulation error:", err);
      }
    });
  });

  // Habitation Modal close
  document.getElementById("modal-close-btn").addEventListener("click", () => {
    document.getElementById("habitation-modal").classList.add("hidden");
  });

  // Fetch Live Satellite Weather Button
  const btnFetchLive = document.getElementById("btn-fetch-live-data");
  if (btnFetchLive) {
    btnFetchLive.addEventListener("click", async () => {
      const originalHTML = btnFetchLive.innerHTML;
      btnFetchLive.innerHTML = `<span class="animate-spin mr-1">⏳</span><span>Fetching Live Satellite Feeds...</span>`;
      btnFetchLive.disabled = true;

      try {
        const res = await fetch(`/api/live-weather?regionId=${currentRegionId}`);
        const json = await res.json();
        if (json.success && json.liveWeather) {
          assessmentData = json.data;
          updateUI(assessmentData);

          // Toast / badge feedback
          btnFetchLive.innerHTML = `<span>🛰️ Live Sync (${json.liveWeather.temperatureC}°C, ${json.liveWeather.estimated24hRainfallMm}mm)</span>`;
          btnFetchLive.classList.remove("bg-emerald-950/80");
          btnFetchLive.classList.add("bg-cyan-950/90", "border-cyan-400", "text-cyan-300");

          setTimeout(() => {
            btnFetchLive.innerHTML = originalHTML;
            btnFetchLive.classList.remove("bg-cyan-950/90", "border-cyan-400", "text-cyan-300");
            btnFetchLive.classList.add("bg-emerald-950/80");
            btnFetchLive.disabled = false;
            initIcons();
          }, 4500);
        } else {
          btnFetchLive.innerHTML = `<span>⚠️ Feed Unavailable</span>`;
          setTimeout(() => {
            btnFetchLive.innerHTML = originalHTML;
            btnFetchLive.disabled = false;
            initIcons();
          }, 2000);
        }
      } catch (err) {
        console.error("Live weather error:", err);
        btnFetchLive.innerHTML = originalHTML;
        btnFetchLive.disabled = false;
        initIcons();
      }
    });
  }

  // SDMA Action Plan Modal
  document.getElementById("btn-open-action-plan").addEventListener("click", async () => {
    await openActionPlanModal();
  });

  document.getElementById("action-plan-close-btn").addEventListener("click", () => {
    document.getElementById("action-plan-modal").classList.add("hidden");
  });

  // AI / ML Architecture Modal
  const btnOpenML = document.getElementById("btn-open-ml-modal");
  const mlModal = document.getElementById("ml-model-modal");
  const btnCloseML = document.getElementById("ml-modal-close-btn");

  if (btnOpenML && mlModal) {
    btnOpenML.addEventListener("click", () => {
      mlModal.classList.remove("hidden");
      initIcons();
    });
  }

  if (btnCloseML && mlModal) {
    btnCloseML.addEventListener("click", () => {
      mlModal.classList.add("hidden");
    });
  }

  // Priority Tier Filter Buttons in Tab 3
  document.querySelectorAll(".filter-tier").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-tier").forEach(b => b.classList.remove("active", "bg-blue-900/80", "text-white"));
      btn.classList.add("active", "bg-blue-900/80", "text-white");
      const tier = btn.getAttribute("data-tier");

      document.querySelectorAll(".hab-card").forEach(card => {
        if (tier === "ALL" || card.getAttribute("data-tier") === tier) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
}

// Tab navigation handler
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");

      tabs.forEach(t => {
        t.classList.remove("border-cyan-400", "text-cyan-400");
        t.classList.add("border-transparent", "text-slate-400");
      });
      tab.classList.add("border-cyan-400", "text-cyan-400");
      tab.classList.remove("border-transparent", "text-slate-400");

      contents.forEach(c => {
        if (c.id === target) c.classList.remove("hidden");
        else c.classList.add("hidden");
      });

      initIcons();
    });
  });
}

// Generate and Open Official Action Plan Modal
async function openActionPlanModal() {
  try {
    const res = await fetch(`/api/export/action-plan?regionId=${currentRegionId}`);
    const json = await res.json();
    if (!json.success) return;

    const plan = json.dispatchPlan;
    const container = document.getElementById("action-plan-content");

    let tableRows = plan.priorityRelocationRoster.map(r => `
      <tr class="${r.priorityTier === 'IMMEDIATE' ? 'bg-red-50 text-red-950 font-semibold' : ''}">
        <td class="border border-slate-300 p-2">${r.habitationName}</td>
        <td class="border border-slate-300 p-2 text-center font-mono">${r.population}</td>
        <td class="border border-slate-300 p-2 text-center">
          <span class="px-2 py-0.5 rounded text-xs ${r.priorityTier === 'IMMEDIATE' ? 'bg-red-600 text-white font-bold' : 'bg-amber-100 text-amber-800'}">
            ${r.priorityTier}
          </span>
        </td>
        <td class="border border-slate-300 p-2 text-center font-mono font-bold">${r.urgencyIndex}</td>
        <td class="border border-slate-300 p-2">${r.assignedSafeSite}</td>
        <td class="border border-slate-300 p-2 text-center font-mono">${r.transitDistanceKm} km</td>
      </tr>
    `).join("");

    let capacityRows = plan.carryingCapacitySiteAudit.map(s => `
      <tr>
        <td class="border border-slate-300 p-2 font-semibold">${s.siteName}</td>
        <td class="border border-slate-300 p-2 text-center font-mono">${s.netAbsorptionCapacity.toLocaleString()}</td>
        <td class="border border-slate-300 p-2 text-center font-mono font-bold text-blue-700">${s.currentAllocatedLoad.toLocaleString()}</td>
        <td class="border border-slate-300 p-2 text-center font-mono font-bold text-emerald-700">${s.remainingCapacity.toLocaleString()}</td>
        <td class="border border-slate-300 p-2 text-center font-mono">${s.utilizationRate}</td>
        <td class="border border-slate-300 p-2 text-xs">${s.bindingBottleneck}</td>
      </tr>
    `).join("");

    container.innerHTML = `
      <div class="border-b border-slate-300 pb-3 flex justify-between items-start text-xs font-mono">
        <div>
          <div><strong>DISPATCH NO:</strong> ${plan.dispatchId}</div>
          <div><strong>REGION:</strong> ${plan.regionMonitored}</div>
          <div><strong>STATUTORY BASE:</strong> ${plan.applicableActs}</div>
        </div>
        <div class="text-right">
          <div><strong>DATE & TIME:</strong> ${plan.generatedTimestamp}</div>
          <div><strong>COMMAND LEVEL:</strong> <span class="text-red-600 font-bold">${plan.alertLevel}</span></div>
        </div>
      </div>

      <!-- Executive Overview -->
      <div>
        <h3 class="font-bold text-base text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">1. Executive Vulnerability & Relocation Summary</h3>
        <div class="grid grid-cols-3 gap-3 text-xs bg-slate-100 p-3 rounded-lg border border-slate-300">
          <div>Total At-Risk Citizens: <strong>${plan.executiveSummary.totalEndangeredPopulation.toLocaleString()}</strong></div>
          <div>Immediate (Tier-1) Evacuees: <strong class="text-red-700">${plan.executiveSummary.immediateRelocationRequired.toLocaleString()}</strong></div>
          <div>Short-Term (Tier-2) Relocation: <strong class="text-amber-700">${plan.executiveSummary.shortTermRelocationRequired.toLocaleString()}</strong></div>
          <div>Active Multi-Hazard Red Zones: <strong>${plan.executiveSummary.redZonesActiveCount}</strong></div>
          <div>Safe Zones Surplus Headroom: <strong class="text-emerald-700">${plan.executiveSummary.safeSitesAbsorptionCapacitySurplus.toLocaleString()}</strong></div>
          <div>Total Habitations Monitored: <strong>${plan.executiveSummary.totalVulnerableHabitations}</strong></div>
        </div>
      </div>

      <!-- Habitation Allocation Roster -->
      <div>
        <h3 class="font-bold text-base text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">2. Prioritized Evacuation & Relocation Matrix</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse border border-slate-300">
            <thead class="bg-slate-200 text-slate-700">
              <tr>
                <th class="border border-slate-300 p-2">Habitation Name</th>
                <th class="border border-slate-300 p-2 text-center">Pop</th>
                <th class="border border-slate-300 p-2 text-center">Priority Tier</th>
                <th class="border border-slate-300 p-2 text-center">RUI Score</th>
                <th class="border border-slate-300 p-2">Assigned Safe Relocation Site</th>
                <th class="border border-slate-300 p-2 text-center">Transit Distance</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Carrying Capacity Audit -->
      <div>
        <h3 class="font-bold text-base text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">3. Candidate Relocation Sites Carrying Capacity Audit (CPHEEO 135 LPCD)</h3>
        <table class="w-full text-xs text-left border-collapse border border-slate-300">
          <thead class="bg-slate-200 text-slate-700">
            <tr>
              <th class="border border-slate-300 p-2">Safe Relocation Site</th>
              <th class="border border-slate-300 p-2 text-center">Gross Net Cap</th>
              <th class="border border-slate-300 p-2 text-center">Allotted Load</th>
              <th class="border border-slate-300 p-2 text-center">Surplus Headroom</th>
              <th class="border border-slate-300 p-2 text-center">Utilization</th>
              <th class="border border-slate-300 p-2">Binding Bottleneck</th>
            </tr>
          </thead>
          <tbody>
            ${capacityRows}
          </tbody>
        </table>
      </div>

      <!-- NDRF Logistical Requisition -->
      <div>
        <h3 class="font-bold text-base text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">4. NDRF & SDMA Emergency Resource Requisitions</h3>
        <div class="grid grid-cols-4 gap-3 text-center text-xs">
          <div class="p-2.5 bg-blue-50 border border-blue-200 rounded">
            <div class="text-slate-600">NDRF Battalions</div>
            <div class="text-lg font-bold text-blue-900 font-mono">${plan.ndrfLogisticalRequisition.ndrfRescueBattalionsRecommended} Units</div>
          </div>
          <div class="p-2.5 bg-amber-50 border border-amber-200 rounded">
            <div class="text-slate-600">Evacuation Buses</div>
            <div class="text-lg font-bold text-amber-900 font-mono">${plan.ndrfLogisticalRequisition.evacuationBusesRequired} Buses</div>
          </div>
          <div class="p-2.5 bg-cyan-50 border border-cyan-200 rounded">
            <div class="text-slate-600">Water Tankers (Daily)</div>
            <div class="text-lg font-bold text-cyan-900 font-mono">${plan.ndrfLogisticalRequisition.emergencyPotableWaterTankersDaily} Tankers</div>
          </div>
          <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded">
            <div class="text-slate-600">Transit Shelters</div>
            <div class="text-lg font-bold text-emerald-900 font-mono">${plan.ndrfLogisticalRequisition.temporarySheltersUnits} Tents</div>
          </div>
        </div>
      </div>

      <!-- Directives & Signature Block -->
      <div class="space-y-2 text-xs">
        <h3 class="font-bold text-slate-900 uppercase">5. Executive Action Directives</h3>
        <ol class="list-decimal list-inside space-y-1 text-slate-700">
          ${plan.sdmaDirectiveOrders.map(o => `<li>${o.replace(/^\d+\.\s*/, '')}</li>`).join('')}
        </ol>
      </div>

      <div class="pt-8 flex justify-between border-t border-slate-400 text-xs text-slate-700">
        <div>
          <div>_________________________________</div>
          <div class="font-bold">Commandant, NDRF Operations</div>
          <div>Ministry of Home Affairs, New Delhi</div>
        </div>
        <div class="text-right">
          <div>_________________________________</div>
          <div class="font-bold">Principal Secretary (Disaster Management)</div>
          <div>State Disaster Management Authority (SDMA)</div>
        </div>
      </div>
    `;

    document.getElementById("action-plan-modal").classList.remove("hidden");
    initIcons();
  } catch (err) {
    console.error("Action plan export failed:", err);
  }
}
