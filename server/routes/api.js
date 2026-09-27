const express = require("express");
const router = express.Router();
const { regions, runRegionalAssessment, fetchLiveWeatherData } = require("../engine/simulationEngine");
const { ML_MODEL_METADATA } = require("../engine/mlModel");
const { solveSaatyAHP } = require("../engine/ahpEngine");
const { getEvacuationCorridors } = require("../engine/routingEngine");
const { getCivilianReports, submitCivilianReport, updateReportStatus } = require("../engine/citizenReportEngine");

// Get Machine Learning Model Details & Explainable AI Weights
router.get("/ml/model-info", (req, res) => {
  res.json({
    success: true,
    model: ML_MODEL_METADATA
  });
});


// Fetch actual live real-time satellite/meteorological data
router.get("/live-weather", async (req, res) => {
  try {
    const regionId = req.query.regionId || "himalayan-uttarakhand";
    const region = regions[regionId] || regions["himalayan-uttarakhand"];
    const [lat, lng] = region.center;

    const liveWeather = await fetchLiveWeatherData(lat, lng);
    if (!liveWeather) {
      return res.status(503).json({ success: false, message: "Live weather service unavailable, using baseline." });
    }

    // Optionally apply live rainfall to the dynamic assessment
    const assessment = runRegionalAssessment(regionId, {
      currentRainfall24hMm: Math.max(15, Math.round(liveWeather.estimated24hRainfallMm)),
      soilSaturationPercent: Math.min(95, Math.round(liveWeather.humidityPercent * 0.8))
    });

    res.json({
      success: true,
      liveWeather,
      data: assessment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// 1. Get available disaster regions
router.get("/regions", (req, res) => {
  const regionList = Object.values(regions).map(r => ({
    id: r.regionId,
    name: r.regionName,
    center: r.center,
    zoom: r.zoom,
    description: r.description
  }));
  res.json({ success: true, count: regionList.length, regions: regionList });
});

// 2. Get active regional assessment (with optional query triggers)
router.get("/assessment", (req, res) => {
  try {
    const regionId = req.query.regionId || "himalayan-uttarakhand";
    const customOverrides = {};

    if (req.query.rainfall) customOverrides.currentRainfall24hMm = Number(req.query.rainfall);
    if (req.query.riverLevel) customOverrides.riverLevelM = Number(req.query.riverLevel);
    if (req.query.soilSaturation) customOverrides.soilSaturationPercent = Number(req.query.soilSaturation);

    const assessment = runRegionalAssessment(regionId, customOverrides);
    res.json({ success: true, data: assessment });
  } catch (error) {
    console.error("Assessment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Trigger simulation scenario presets
router.post("/simulate", (req, res) => {
  try {
    const { regionId = "himalayan-uttarakhand", preset = "baseline", customOverrides = {} } = req.body;

    let simulationParams = { ...customOverrides };

    if (preset === "cloudburst") {
      simulationParams.currentRainfall24hMm = 185;
      simulationParams.riverLevelM = 4.4;
      simulationParams.soilSaturationPercent = 94;
    } else if (preset === "flash_flood") {
      simulationParams.currentRainfall24hMm = 140;
      simulationParams.riverLevelM = 4.8; // Exceeds danger mark
      simulationParams.soilSaturationPercent = 88;
    } else if (preset === "cyclone_surge") {
      simulationParams.currentRainfall24hMm = 160;
      simulationParams.riverLevelM = 4.6;
      simulationParams.soilSaturationPercent = 92;
    } else if (preset === "baseline") {
      // Natural baseline reset
    }

    const assessment = runRegionalAssessment(regionId, simulationParams);
    res.json({
      success: true,
      appliedPreset: preset,
      appliedParams: simulationParams,
      data: assessment
    });
  } catch (error) {
    console.error("Simulation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Generate Official SDMA / NDRF Relocation Action Plan Dispatch
router.get("/export/action-plan", (req, res) => {
  try {
    const regionId = req.query.regionId || "himalayan-uttarakhand";
    const assessment = runRegionalAssessment(regionId);

    const dispatchPlan = {
      dispatchId: `NDRF-HQ-DISPATCH-${Date.now().toString().slice(-6)}`,
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
        utilizationRate: `${s.metrics.utilizationPercentage}%`,
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

    res.json({ success: true, dispatchPlan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Saaty Analytic Hierarchy Process (AHP) Pairwise Matrix & Consistency Ratio (CR < 0.10)
router.get("/ahp/weights", (req, res) => {
  try {
    const ahpResults = solveSaatyAHP();
    res.json({ success: true, ahp: ahpResults });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Safe Evacuation Corridors & Chokepoint Identification Engine
router.get("/evacuation-corridors", (req, res) => {
  try {
    const regionId = req.query.regionId || "himalayan-uttarakhand";
    const rainfall = Number(req.query.rainfall) || 45;
    const riverLevel = Number(req.query.riverLevel) || 2.1;

    const corridors = getEvacuationCorridors(regionId, rainfall, riverLevel);
    res.json({ success: true, count: corridors.length, corridors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Crowdsourced Civilian Hazard Desk (Citizen Portal Telemetry)
router.get("/citizen-reports", (req, res) => {
  try {
    const regionId = req.query.regionId || null;
    const reports = getCivilianReports(regionId);
    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/citizen-reports", (req, res) => {
  try {
    const report = submitCivilianReport(req.body);
    res.status(201).json({ success: true, report, message: "Civilian hazard report logged and dispatched to NDRF ground squad." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/citizen-reports/:id/verify", (req, res) => {
  try {
    const { id } = req.params;
    const { status = "VERIFIED_BY_NDRF", action = "Verified by NDRF Quick Reaction Team. Evacuation alert issued." } = req.body;
    const updated = updateReportStatus(id, status, action);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }
    res.json({ success: true, report: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. Competitive Market Comparison Matrix (Slide 6 Benchmark)
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
    {
      citation: "K. Ullah, Y. Wang, Z. Fang, L. Wang, and M. Rahman, 'Multi-hazard susceptibility mapping based on Convolutional Neural Networks', Geoscience Frontiers, vol. 13, no. 5, p. 101425, Sep. 2022, doi: 10.1016/j.gsf.2022.101425."
    },
    {
      citation: "J. Gacu et al., 'Integrated multi-hazard risk assessment under compound disasters using analytical hierarchy process (AHP)', Heliyon, vol. 11, no. 3, p. e43173, Feb. 2025, doi: 10.1016/j.heliyon.2025.e43173."
    },
    {
      citation: "B. Pradhan, 'Landslide susceptibility mapping of a catchment area using analytical hierarchy process, remote sensing and GIS keys', International Journal of Computer and Information Engineering, vol. 4, no. 12, pp. 1958–1965, 2010."
    },
    {
      citation: "S. A. Ologunorisa and E. C. Chinda, 'Suitability analysis of resettlement sites for flood disaster victims using GIS and remote sensing', Journal of Environmental Science and Technology, vol. 8, no. 3, pp. 118–127, 2015, doi: 10.5923/j.env.20150503.02."
    },
    {
      citation: "T. L. Saaty, 'Decision making with the analytic hierarchy process', International Journal of Services Sciences, vol. 1, no. 1, pp. 83–98, 2008, doi: 10.1504/IJSS.2008.017590."
    },
    {
      citation: "National Disaster Management Authority (NDMA), 'National Disaster Management Guidelines: Management of Landslides and Snow Avalanches', Government of India, New Delhi, Tech. Rep., 2009. [Online]. Available: https://ndma.gov.in"
    }
  ]
};

router.get("/market-comparison", (req, res) => {
  res.json({ success: true, comparison: MARKET_BENCHMARK });
});

module.exports = router;
