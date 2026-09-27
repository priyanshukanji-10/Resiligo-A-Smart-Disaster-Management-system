// Uttarakhand Himalayan Sector (Joshimath - Alaknanda Valley)
// High-risk mountainous region prone to landslides, subsidence, and cloudburst flash floods

module.exports = {
  regionId: "himalayan-uttarakhand",
  regionName: "Uttarakhand Himalayan Sector (Joshimath - Chamoli)",
  center: [30.5564, 79.5662],
  zoom: 12,
  description: "Steep terrain prone to active slope toe-cutting, cloudbursts along Alaknanda & Dhauliganga catchments, and historical ground subsidence.",
  
  // Historical & physical baselines
  environmentalBaseline: {
    avgAnnualRainfallMm: 1450,
    currentRainfall24hMm: 45,
    riverLevelM: 2.1,
    dangerRiverLevelM: 4.5,
    slopeAngleAvgDeg: 34,
    soilSaturationPercent: 58,
    activeFaultProximityKm: 1.8
  },

  // Habitations / Villages at risk
  habitations: [
    {
      id: "HAB-UT-01",
      name: "Sunil Ward Settlement",
      coordinates: [30.5615, 79.5630],
      population: 480,
      households: 96,
      kutchaHousePercentage: 68,
      vulnerableDemographics: { children: 85, elderly: 72, disabled: 12 },
      slopeDegree: 38,
      elevationM: 1980,
      disasterHistoryCount: 5, // Past landslide & subsidence events in last 10 yrs
      accessRoadType: "Single narrow unpaved track (Egress vulnerable)",
      distanceToMajorFaultKm: 0.4,
      distanceToRiverM: 650,
      economicIndex: "Low-Income / Subsistence Agriculture",
      primaryHazard: "Landslide & Active Subsidence"
    },
    {
      id: "HAB-UT-02",
      name: "Marwari Lower Hamlet",
      coordinates: [30.5480, 79.5680],
      population: 320,
      households: 64,
      kutchaHousePercentage: 75,
      vulnerableDemographics: { children: 60, elderly: 48, disabled: 8 },
      slopeDegree: 32,
      elevationM: 1720,
      disasterHistoryCount: 7,
      accessRoadType: "Direct riverside footbridge (cut-off in high water)",
      distanceToMajorFaultKm: 1.1,
      distanceToRiverM: 80,
      economicIndex: "Low-Income",
      primaryHazard: "Flash Flood & Riverbed Toe Erosion"
    },
    {
      id: "HAB-UT-03",
      name: "Singdhar Slope Clustered Basti",
      coordinates: [30.5590, 79.5710],
      population: 590,
      households: 118,
      kutchaHousePercentage: 55,
      vulnerableDemographics: { children: 110, elderly: 90, disabled: 15 },
      slopeDegree: 36,
      elevationM: 1920,
      disasterHistoryCount: 4,
      accessRoadType: "Single-lane paved road (prone to rockfall)",
      distanceToMajorFaultKm: 0.7,
      distanceToRiverM: 820,
      economicIndex: "Lower-Middle Income",
      primaryHazard: "Progressive Ground Cracking & Mudslide"
    },
    {
      id: "HAB-UT-04",
      name: "Gandhinaagar Riverside Basti",
      coordinates: [30.5520, 79.5600],
      population: 410,
      households: 82,
      kutchaHousePercentage: 62,
      vulnerableDemographics: { children: 76, elderly: 58, disabled: 9 },
      slopeDegree: 28,
      elevationM: 1760,
      disasterHistoryCount: 6,
      accessRoadType: "Steep stepped trail",
      distanceToMajorFaultKm: 1.4,
      distanceToRiverM: 140,
      economicIndex: "Low-Income",
      primaryHazard: "Debris Flow & Cloudburst Inundation"
    },
    {
      id: "HAB-UT-05",
      name: "Auli Foothill Basti (Upper Tier)",
      coordinates: [30.5720, 79.5800],
      population: 260,
      households: 52,
      kutchaHousePercentage: 35,
      vulnerableDemographics: { children: 42, elderly: 30, disabled: 4 },
      slopeDegree: 24,
      elevationM: 2150,
      disasterHistoryCount: 2,
      accessRoadType: "Two-lane paved mountain road",
      distanceToMajorFaultKm: 2.6,
      distanceToRiverM: 1600,
      economicIndex: "Middle Income / Tourism Allied",
      primaryHazard: "Snow Avalanches & Moderate Slope Creep"
    },
    {
      id: "HAB-UT-06",
      name: "Helang Valley Slum Cluster",
      coordinates: [30.5350, 79.5420],
      population: 380,
      households: 76,
      kutchaHousePercentage: 82,
      vulnerableDemographics: { children: 72, elderly: 54, disabled: 11 },
      slopeDegree: 35,
      elevationM: 1540,
      disasterHistoryCount: 8,
      accessRoadType: "Fragile bridge across gorge",
      distanceToMajorFaultKm: 0.9,
      distanceToRiverM: 60,
      economicIndex: "Migrant Labor & Marginal Farmers",
      primaryHazard: "Torrential Flash Floods & Debris Surge"
    }
  ],

  // Candidate Safe Relocation Sites for Carrying Capacity Evaluation
  candidateSafeSites: [
    {
      id: "SAFE-UT-01",
      name: "Dhaka Plateaus Safe Habitat Zone",
      coordinates: [30.5820, 79.5450],
      totalLandAreaHectares: 14.5,
      usableLandAreaHectares: 10.2, // Deducting green buffers & rocky outcroppings
      terrainSlopeDeg: 8, // Gentle safe plateau
      elevationM: 1950,
      distanceToNearestFaultKm: 6.2,
      distanceToRiverM: 2200,
      
      // Infrastructure & Utility Capacities
      potableWaterYieldLPD: 180000, // Liters per day (Gravity springs + borewells)
      perCapitaWaterRequirementLPCD: 135, // CPHEEO national standard
      accessRoadWidthM: 7.0, // Double lane heavy vehicle access
      nearestHospitalKm: 3.5,
      primarySchoolsAvailable: 2,
      powerGridAvailableKVA: 500,
      soilBearingCapacityKPa: 220, // Stable granite gneiss bedrock
      ecologicalBufferCompliant: true, // Outside reserve forest & biosphere core
      existingLocalPopulation: 150 // Residents already using partial civic services
    },
    {
      id: "SAFE-UT-02",
      name: "Pipalkoti Terrace Expansion Site B",
      coordinates: [30.4300, 79.4300],
      totalLandAreaHectares: 22.0,
      usableLandAreaHectares: 16.5,
      terrainSlopeDeg: 6,
      elevationM: 1340,
      distanceToNearestFaultKm: 8.5,
      distanceToRiverM: 1400,
      
      potableWaterYieldLPD: 320000,
      perCapitaWaterRequirementLPCD: 135,
      accessRoadWidthM: 10.0, // National Highway spur
      nearestHospitalKm: 1.2,
      primarySchoolsAvailable: 3,
      powerGridAvailableKVA: 850,
      soilBearingCapacityKPa: 260,
      ecologicalBufferCompliant: true,
      existingLocalPopulation: 320
    },
    {
      id: "SAFE-UT-03",
      name: "Koti High-Terrace Rehabilitation Parcel",
      coordinates: [30.5750, 79.5200],
      totalLandAreaHectares: 8.5,
      usableLandAreaHectares: 5.8,
      terrainSlopeDeg: 11,
      elevationM: 1820,
      distanceToNearestFaultKm: 4.8,
      distanceToRiverM: 1800,
      
      potableWaterYieldLPD: 85000, // Water is more constrained here!
      perCapitaWaterRequirementLPCD: 135,
      accessRoadWidthM: 5.5,
      nearestHospitalKm: 4.8,
      primarySchoolsAvailable: 1,
      powerGridAvailableKVA: 280,
      soilBearingCapacityKPa: 190,
      ecologicalBufferCompliant: true,
      existingLocalPopulation: 90
    }
  ],

  // Defined Hazard Risk Zones (Multi-Hazard Baseline Polygons)
  hazardZones: [
    {
      id: "ZONE-UT-RED-01",
      name: "Alaknanda Gorge & Sunil Subsidence Escarpment",
      level: "RED", // Prohibited Zone (Unfit for permanent human habitation)
      dominantHazard: "Active Slope Failure & High Toe Erosion",
      hazardScore: 0.88,
      polygon: [
        [30.568, 79.555],
        [30.565, 79.575],
        [30.550, 79.578],
        [30.542, 79.565],
        [30.545, 79.550],
        [30.560, 79.548]
      ],
      description: "Severe shear fractures observed along slope. Slope angle > 35 degrees with saturated debris. High probability of catastrophic mass movement."
    },
    {
      id: "ZONE-UT-RED-02",
      name: "Helang Riverine Inundation & Debris Cone",
      level: "RED",
      dominantHazard: "Cloudburst Flash Flood & Boulder Torrent",
      hazardScore: 0.82,
      polygon: [
        [30.540, 79.535],
        [30.542, 79.550],
        [30.530, 79.552],
        [30.525, 79.540],
        [30.532, 79.530]
      ],
      description: "Catchment confluence zone with acute constriction. Severe flash flood funneling during precipitation exceeding 40mm/hr."
    },
    {
      id: "ZONE-UT-ORANGE-01",
      name: "Singdhar-Upper Foothills Buffer Corridor",
      level: "ORANGE", // Restricted / High Monitoring Buffer Zone
      dominantHazard: "Progressive Surface Tension Cracks",
      hazardScore: 0.58,
      polygon: [
        [30.575, 79.560],
        [30.572, 79.585],
        [30.555, 79.588],
        [30.548, 79.580],
        [30.565, 79.570]
      ],
      description: "Buffer corridor adjacent to critical scarps. Moderate risk during monsoon. Infiltration controls and strict construction moratorium required."
    }
  ]
};
