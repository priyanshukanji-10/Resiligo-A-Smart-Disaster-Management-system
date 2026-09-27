-const express = require("express");
const router = express.Router();
const { regions, runRegionalAssessment, fetchLiveWeatherData } = require("../engine/simulationEngine");
const { ML_MODEL_METADATA } = require("../engine/mlModel");

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

module.exports = router;
