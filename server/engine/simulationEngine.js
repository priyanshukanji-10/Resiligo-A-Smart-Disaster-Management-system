// Real-time Hazard Trigger & What-If Scenario Simulation Engine

const himalayanSector = require("../data/himalayan_sector");
const westernGhats = require("../data/western_ghats");
const coastalSector = require("../data/coastal_sector");
const { computeHabitationHazardScore, getDynamicallyUpdatedZones } = require("./hazardEngine");
const { computeRelocationUrgency, solveRelocationAllocation } = require("./relocationEngine");
const { assessSiteCarryingCapacity } = require("./carryingCapacityEngine");

// Cache of region datasets
const regions = {
  "himalayan-uttarakhand": himalayanSector,
  "western-ghats-kerala": westernGhats,
  "coastal-odisha": coastalSector
};

/**
 * Fetch real-time live meteorological data from Open-Meteo API
 */
async function fetchLiveWeatherData(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,surface_pressure,wind_speed_10m&hourly=precipitation&forecast_days=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
    const data = await response.json();
    
    // Sum hourly precipitation for last/next 24h or current precipitation
    const hourlyPrecip = data.hourly?.precipitation || [];
    const totalRain24h = hourlyPrecip.length > 0 
      ? Number(hourlyPrecip.slice(0, 24).reduce((a, b) => a + b, 0).toFixed(1))
      : Number((data.current?.precipitation || 0).toFixed(1));

    return {
      isLive: true,
      source: "Open-Meteo Satellite/Reanalysis & GFS Forecast",
      temperatureC: data.current?.temperature_2m,
      humidityPercent: data.current?.relative_humidity_2m,
      currentRainfallMm: data.current?.precipitation || 0,
      estimated24hRainfallMm: Math.max(totalRain24h, data.current?.precipitation || 0),
      windSpeedKmh: data.current?.wind_speed_10m,
      elevationM: data.elevation,
      fetchedAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn("Could not fetch live weather, falling back to regional baseline:", err.message);
    return null;
  }
}


/**
 * Runs full dynamic analysis for a region with simulated or live environmental parameters
 */
function runRegionalAssessment(regionId = "himalayan-uttarakhand", customEnvOverrides = {}) {
  const baseData = regions[regionId] || regions["himalayan-uttarakhand"];

  // Merge environmental triggers
  const envState = {
    ...baseData.environmentalBaseline,
    ...customEnvOverrides
  };

  // 1. Compute dynamic hazard zones (expands polygons if extreme rainfall / river surge)
  const dynamicZones = getDynamicallyUpdatedZones(baseData.hazardZones, envState);

  // 2. Compute hazard risk & relocation urgency for each habitation
  const evaluatedHabitations = baseData.habitations.map(hab => {
    const hazardAssessment = computeHabitationHazardScore(hab, envState, dynamicZones);
    const relocationAssessment = computeRelocationUrgency(hab, hazardAssessment);

    return {
      ...hab,
      hazard: hazardAssessment,
      relocation: relocationAssessment
    };
  });

  // 3. Solve capacitated relocation allocation
  const allocationSolution = solveRelocationAllocation(evaluatedHabitations, baseData.candidateSafeSites);

  // 4. Summarize system-wide KPIs
  const totalPopulation = evaluatedHabitations.reduce((s, h) => s + h.population, 0);
  const immediatePop = evaluatedHabitations
    .filter(h => h.relocation.priorityTier === "IMMEDIATE")
    .reduce((s, h) => s + h.population, 0);
  const shortTermPop = evaluatedHabitations
    .filter(h => h.relocation.priorityTier === "SHORT_TERM")
    .reduce((s, h) => s + h.population, 0);
  const mediumTermPop = evaluatedHabitations
    .filter(h => h.relocation.priorityTier === "MEDIUM_TERM")
    .reduce((s, h) => s + h.population, 0);

  const totalGrossSafeCapacity = allocationSolution.evaluatedSites.reduce(
    (s, site) => s + site.metrics.grossCapacityPersons, 0
  );
  const totalRemainingAbsorptionCapacity = allocationSolution.evaluatedSites.reduce(
    (s, site) => s + site.metrics.remainingAbsorptionCapacity, 0
  );

  return {
    timestamp: new Date().toISOString(),
    region: {
      id: baseData.regionId,
      name: baseData.regionName,
      center: baseData.center,
      zoom: baseData.zoom,
      description: baseData.description
    },
    environmentalState: envState,
    kpis: {
      totalHabitationsMonitored: evaluatedHabitations.length,
      totalPopulationMonitored: totalPopulation,
      immediateRelocationCount: evaluatedHabitations.filter(h => h.relocation.priorityTier === "IMMEDIATE").length,
      immediateRelocationPopulation: immediatePop,
      shortTermRelocationPopulation: shortTermPop,
      mediumTermRelocationPopulation: mediumTermPop,
      redZonesActiveCount: dynamicZones.filter(z => z.level === "RED").length,
      safeSitesCount: baseData.candidateSafeSites.length,
      totalSafeGrossCapacity: totalGrossSafeCapacity,
      netSafeAbsorptionCapacityRemaining: totalRemainingAbsorptionCapacity,
      regionalCapacityBufferRatio: Number((totalRemainingAbsorptionCapacity / (immediatePop || 1)).toFixed(2))
    },
    hazardZones: dynamicZones,
    habitations: evaluatedHabitations,
    safeSites: allocationSolution.evaluatedSites,
    relocationAllocations: allocationSolution.allocations,
    unassignedHabitations: allocationSolution.unassignedHabitations,
    logisticsRequirements: allocationSolution.logisticsRequirements
  };
}

module.exports = {
  regions,
  runRegionalAssessment,
  fetchLiveWeatherData
};
