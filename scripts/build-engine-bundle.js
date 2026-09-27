const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'server', 'data');
const engineDir = path.join(rootDir, 'server', 'engine');
const publicDir = path.join(rootDir, 'public');

// We can load them directly via require in Node, and generate a clean standalone JS file!
const himalayanSector = require(path.join(dataDir, 'himalayan_sector'));
const westernGhats = require(path.join(dataDir, 'western_ghats'));
const coastalSector = require(path.join(dataDir, 'coastal_sector'));

// Read engine source code
function getCleanSource(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  // Strip require statements and module.exports
  src = src.replace(/const\s+\{[^}]+\}\s*=\s*require\([^)]+\);?/g, '');
  src = src.replace(/const\s+\w+\s*=\s*require\([^)]+\);?/g, '');
  src = src.replace(/module\.exports\s*=\s*\{[^}]*\};?/g, '');
  return src;
}

const mlModelSrc = getCleanSource(path.join(engineDir, 'mlModel.js'));
const hazardEngineSrc = getCleanSource(path.join(engineDir, 'hazardEngine.js'));
const carryingCapacitySrc = getCleanSource(path.join(engineDir, 'carryingCapacityEngine.js'));
const relocationEngineSrc = getCleanSource(path.join(engineDir, 'relocationEngine.js'));
const ahpEngineSrc = getCleanSource(path.join(engineDir, 'ahpEngine.js'));
const routingEngineSrc = getCleanSource(path.join(engineDir, 'routingEngine.js'));
const citizenReportEngineSrc = getCleanSource(path.join(engineDir, 'citizenReportEngine.js'));

const bundleContent = `// RESILIGO Standalone Client-Side Engine for GitHub Pages & Offline Operations
(function(window) {
  'use strict';

  // 1. Embedded Datasets
  const himalayanSector = ${JSON.stringify(himalayanSector, null, 2)};
  const westernGhats = ${JSON.stringify(westernGhats, null, 2)};
  const coastalSector = ${JSON.stringify(coastalSector, null, 2)};

  const regions = {
    "himalayan-uttarakhand": himalayanSector,
    "western-ghats-kerala": westernGhats,
    "coastal-odisha": coastalSector
  };

  // 2. ML Model Engine
  ${mlModelSrc}

  // 3. Hazard Engine
  ${hazardEngineSrc}

  // 4. Carrying Capacity Engine
  ${carryingCapacitySrc}

  // 5. Relocation Prioritization & Allocation Engine
  ${relocationEngineSrc}

  // 6. Saaty AHP Engine
  ${ahpEngineSrc}

  // 7. Routing & Chokepoint Engine
  ${routingEngineSrc}

  // 8. Civilian Report Engine (persisted to localStorage if available)
  ${citizenReportEngineSrc}

  // Override citizen reports with localStorage cache if present
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('resiligo_citizen_reports');
      if (stored) {
        civilianReports = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('localStorage read error:', e);
    }

    const origSubmit = submitCivilianReport;
    submitCivilianReport = function(data) {
      const report = origSubmit(data);
      try {
        localStorage.setItem('resiligo_citizen_reports', JSON.stringify(civilianReports));
      } catch (e) {}
      return report;
    };

    const origUpdate = updateReportStatus;
    updateReportStatus = function(id, status, action) {
      const report = origUpdate(id, status, action);
      try {
        localStorage.setItem('resiligo_citizen_reports', JSON.stringify(civilianReports));
      } catch (e) {}
      return report;
    };
  }

  // 9. Simulation Engine
  async function fetchLiveWeatherData(lat, lng) {
    try {
      const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lng + "&current=temperature_2m,relative_humidity_2m,precipitation,rain,surface_pressure,wind_speed_10m&hourly=precipitation&forecast_days=1";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Weather API error: " + response.status);
      const data = await response.json();
      
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

  function runRegionalAssessment(regionId = "himalayan-uttarakhand", customEnvOverrides = {}) {
    const baseData = regions[regionId] || regions["himalayan-uttarakhand"];

    const envState = {
      ...baseData.environmentalBaseline,
      ...customEnvOverrides
    };

    const dynamicZones = getDynamicallyUpdatedZones(baseData.hazardZones, envState);

    const evaluatedHabitations = baseData.habitations.map(hab => {
      const hazardAssessment = computeHabitationHazardScore(hab, envState, dynamicZones);
      const relocationAssessment = computeRelocationUrgency(hab, hazardAssessment);

      return {
        ...hab,
        hazard: hazardAssessment,
        relocation: relocationAssessment
      };
    });

    const allocationSolution = solveRelocationAllocation(evaluatedHabitations, baseData.candidateSafeSites);

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

  // 10. Market Benchmark Static Data
  const MARKET_BENCHMARK = {
    title: "Comparison between Available Market-models and RESILIGO",
    features: [
      { feature: "Multi-Hazard Support", isro: "Yes", sachet: "Yes", resiligo: "Yes" },
      { feature: "GIS-Based Hazard Mapping", isro: "Yes", sachet: "No", resiligo: "Yes" },
      { feature: "Satellite / DEM Data Integration", isro: "Yes", sachet: "No", resiligo: "Yes" },
      { feature: "Real-Time / Near-Real-Time Updates", isro: "Yes", sachet: "Yes", resiligo: "Yes" },
      { feature: "AI/ML-Based Risk Prediction", isro: "Limited", sachet: "No", resiligo: "Yes" },
      { feature: "Population Exposure Analysis", isro: "Yes", sachet: "Limited", resiligo: "Yes" },
      { feature: "Vulnerability Assessment", isro: "Limited", sachet: "No", resiligo: "Yes" },
      { feature: "Dynamic Red-Zone Identification", isro: "Limited", sachet: "No", resiligo: "Yes" },
      { feature: "Relocation Priority Ranking", isro: "No", sachet: "No", resiligo: "Yes" },
      { feature: "Safe Relocation Site Identification", isro: "No", sachet: "No", resiligo: "Yes" },
      { feature: "Carrying Capacity Assessment", isro: "No", sachet: "No", resiligo: "Yes" },
      { feature: "End-to-End Relocation Planning", isro: "No", sachet: "No", resiligo: "Yes" }
    ],
    references: [
      { citation: "K. Ullah, Y. Wang, Z. Fang, L. Wang, and M. Rahman, 'Multi-hazard susceptibility mapping based on Convolutional Neural Networks', Geoscience Frontiers, vol. 13, no. 5, p. 101425, Sep. 2022, doi: 10.1016/j.gsf.2022.101425." },
      { citation: "J. Gacu et al., 'Integrated multi-hazard risk assessment under compound disasters using analytical hierarchy process (AHP)', Heliyon, vol. 11, no. 3, p. e43173, Feb. 2025, doi: 10.1016/j.heliyon.2025.e43173." },
      { citation: "B. Pradhan, 'Landslide susceptibility mapping of a catchment area using analytical hierarchy process, remote sensing and GIS keys', International Journal of Computer and Information Engineering, vol. 4, no. 12, pp. 1958–1965, 2010." },
      { citation: "S. A. Ologunorisa and E. C. Chinda, 'Suitability analysis of resettlement sites for flood disaster victims using GIS and remote sensing', Journal of Environmental Science and Technology, vol. 8, no. 3, pp. 118–127, 2015, doi: 10.5923/j.env.20150503.02." },
      { citation: "T. L. Saaty, 'Decision making with the analytic hierarchy process', International Journal of Services Sciences, vol. 1, no. 1, pp. 83–98, 2008, doi: 10.1504/IJSS.2008.017590." },
      { citation: "National Disaster Management Authority (NDMA), 'National Disaster Management Guidelines: Management of Landslides and Snow Avalanches', Government of India, New Delhi, Tech. Rep., 2009. [Online]. Available: https://ndma.gov.in" }
    ]
  };

  // 11. Dispatch Action Plan Generator
  function generateActionPlan(regionId = "himalayan-uttarakhand") {
    const assessment = runRegionalAssessment(regionId);
    return {
      dispatchId: "NDRF-HQ-DISPATCH-" + Date.now().toString().slice(-6),
      statutoryAuthority: "National Disaster Management Authority (NDMA) & State DM Division, Ministry of Home Affairs",
      applicableActs: "Disaster Management Act 2005 (Sections 30, 34, 38 & 39)",
      generatedTimestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      regionMonitored: assessment.region.name,
      alertLevel: assessment.kpis.immediateRelocationCount > 0 ? "RED_CRITICAL_EVACUATION" : "ORANGE_ALERT",
      executiveSummary: {
        totalVulnerableHabitations: assessment.kpis.totalHabitationsMonitored,
        totalEndangeredPopulation: assessment.kpis.totalPopulationMonitored,
        immediateRelocationRequired: assessment.kpis.immediateRelocationPopulation,
        shortTermRelocationRequired: assessment.kpis.shortTermRelocationPopulation,
        mediumTermRelocationRequired: assessment.kpis.mediumTermRelocationPopulation,
        redZonesActiveCount: assessment.kpis.redZonesActiveCount,
        safeSitesAbsorptionCapacitySurplus: assessment.kpis.netSafeAbsorptionCapacityRemaining
      },
      priorityRelocationRoster: assessment.habitations.map(h => ({
        habitationName: h.name,
        population: h.population,
        priorityTier: h.relocation.priorityTier,
        urgencyIndex: h.relocation.ruiScore,
        hazardCategory: h.hazard.zoneStatus,
        assignedSafeSite: assessment.relocationAllocations.find(a => a.habitationId === h.id)?.assignedSiteName || "UNASSIGNED",
        transitDistanceKm: assessment.relocationAllocations.find(a => a.habitationId === h.id)?.distanceKm || "N/A"
      })),
      carryingCapacitySiteAudit: assessment.safeSites.map(s => ({
        siteName: s.siteName,
        usableLandHectares: s.capacities.usableLandHectares,
        waterCapacityPersons: s.capacities.waterCapacityPersons,
        spatialCapacityPersons: s.capacities.spatialCapacityPersons,
        netAbsorptionCapacity: s.metrics.netCapacityPersons,
        currentAllocatedLoad: s.metrics.allottedPopulation,
        remainingCapacity: s.metrics.remainingAbsorptionCapacity,
        utilizationRate: s.metrics.utilizationPercentage + "%",
        bindingBottleneck: s.metrics.bindingBottleneck
      })),
      ndrfLogisticalRequisition: assessment.logisticsRequirements,
      sdmaDirectiveOrders: [
        "1. Direct District Magistrates to issue evacuation orders under Section 34 of DM Act for all Tier-1 (Immediate) habitations.",
        "2. Mobilize NDRF Battalion transit teams with all-terrain evacuation buses and emergency life-support equipment.",
        "3. Enforce immediate construction freeze and prohibit re-entry into demarcated Multi-Hazard Red Zones.",
        "4. Deploy Central Public Health & Environmental Engineering (CPHEEO) mobile water purification filtration units to ensure 135 LPCD standard at candidate relocation zones.",
        "5. Direct Revenue and Land Survey departments to commence land-titling and permanent rehabilitation parcel allotment at designated safe plateau zones."
      ]
    };
  }

  // Export to Global
  window.ResiligoEngine = {
    regions,
    runRegionalAssessment,
    solveSaatyAHP,
    getEvacuationCorridors,
    getCivilianReports,
    submitCivilianReport,
    updateReportStatus,
    getMarketBenchmark: () => MARKET_BENCHMARK,
    generateActionPlan,
    fetchLiveWeatherData
  };

})(typeof window !== 'undefined' ? window : this);
`;

fs.writeFileSync(path.join(publicDir, 'resiligo-engine.js'), bundleContent, 'utf8');
console.log('Successfully bundled resiligo-engine.js into public/ !');
