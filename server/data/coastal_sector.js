// Odisha Coastal Sector (Kendrapara - Satabhaya / Rajnagar)
// Coastal erosion, cyclone storm surge, sea-level intrusion

module.exports = {
  regionId: "coastal-odisha",
  regionName: "Odisha Coastal Belt (Kendrapara - Satabhaya)",
  center: [20.6500, 86.8800],
  zoom: 12,
  description: "Vulnerable Bay of Bengal coastal stretch with severe shoreline retreat (>3m/year), recurring supercyclonic storm surges, and saline ingress.",

  environmentalBaseline: {
    avgAnnualRainfallMm: 1550,
    currentRainfall24hMm: 30,
    riverLevelM: 1.5,
    dangerRiverLevelM: 3.8,
    slopeAngleAvgDeg: 2,
    soilSaturationPercent: 65,
    activeFaultProximityKm: 25.0
  },

  habitations: [
    {
      id: "HAB-OD-01",
      name: "Old Satabhaya Coastal Fisher Hamlet",
      coordinates: [20.6420, 86.8950],
      population: 520,
      households: 104,
      kutchaHousePercentage: 88,
      vulnerableDemographics: { children: 95, elderly: 78, disabled: 16 },
      slopeDegree: 1,
      elevationM: 2.2, // Extremely low elevation above MSL!
      disasterHistoryCount: 9,
      accessRoadType: "Eroded sandy bund road (submerged at high tide)",
      distanceToMajorFaultKm: 28.0,
      distanceToRiverM: 120, // Distance to sea/estuary
      economicIndex: "Artisanal Fisherfolk & Daily Wagers",
      primaryHazard: "Severe Coastal Erosion & Storm Inundation"
    },
    {
      id: "HAB-OD-02",
      name: "Kanhupur Beach Clustered Basti",
      coordinates: [20.6600, 86.9100],
      population: 410,
      households: 82,
      kutchaHousePercentage: 80,
      vulnerableDemographics: { children: 75, elderly: 55, disabled: 10 },
      slopeDegree: 1,
      elevationM: 2.5,
      disasterHistoryCount: 7,
      accessRoadType: "Unpaved tidal creek causeway",
      distanceToMajorFaultKm: 29.0,
      distanceToRiverM: 150,
      economicIndex: "Fisheries & Crab Catching",
      primaryHazard: "Shoreline Engulfment & Tidal Breach"
    },
    {
      id: "HAB-OD-03",
      name: "Rabindranagar Embankment Settlement",
      coordinates: [20.6350, 86.8700],
      population: 340,
      households: 68,
      kutchaHousePercentage: 65,
      vulnerableDemographics: { children: 60, elderly: 45, disabled: 8 },
      slopeDegree: 2,
      elevationM: 3.5,
      disasterHistoryCount: 5,
      accessRoadType: "Earthen embankment crest road",
      distanceToMajorFaultKm: 27.0,
      distanceToRiverM: 400,
      economicIndex: "Paddy & Inland Aquaculture",
      primaryHazard: "Embankment Overtopping & Saline Inundation"
    },
    {
      id: "HAB-OD-04",
      name: "Gupti Estuarine Landing Village",
      coordinates: [20.6150, 86.8400],
      population: 460,
      households: 92,
      kutchaHousePercentage: 50,
      vulnerableDemographics: { children: 70, elderly: 52, disabled: 11 },
      slopeDegree: 2,
      elevationM: 4.2,
      disasterHistoryCount: 4,
      accessRoadType: "Single-lane paved rural road",
      distanceToMajorFaultKm: 25.0,
      distanceToRiverM: 900,
      economicIndex: "Trading & Fisheries",
      primaryHazard: "Estuarine Surge & Waterlogging"
    }
  ],

  candidateSafeSites: [
    {
      id: "SAFE-OD-01",
      name: "Bagapatia Resilient Model Colony",
      coordinates: [20.6120, 86.7850],
      totalLandAreaHectares: 35.0,
      usableLandAreaHectares: 26.0,
      terrainSlopeDeg: 2,
      elevationM: 8.5, // High ground safe from 100-yr storm surge
      distanceToNearestFaultKm: 22.0,
      distanceToRiverM: 3500,
      
      potableWaterYieldLPD: 480000,
      perCapitaWaterRequirementLPCD: 135,
      accessRoadWidthM: 9.0, // Multi-lane disaster resilient corridor
      nearestHospitalKm: 2.0,
      primarySchoolsAvailable: 3,
      powerGridAvailableKVA: 900,
      soilBearingCapacityKPa: 200,
      ecologicalBufferCompliant: true,
      existingLocalPopulation: 350
    },
    {
      id: "SAFE-OD-02",
      name: "Rajnagar Inland Upland Landbank",
      coordinates: [20.5750, 86.7400],
      totalLandAreaHectares: 28.0,
      usableLandAreaHectares: 21.0,
      terrainSlopeDeg: 3,
      elevationM: 11.2,
      distanceToNearestFaultKm: 20.0,
      distanceToRiverM: 4200,
      
      potableWaterYieldLPD: 380000,
      perCapitaWaterRequirementLPCD: 135,
      accessRoadWidthM: 10.0,
      nearestHospitalKm: 1.0,
      primarySchoolsAvailable: 4,
      powerGridAvailableKVA: 1100,
      soilBearingCapacityKPa: 230,
      ecologicalBufferCompliant: true,
      existingLocalPopulation: 500
    }
  ],

  hazardZones: [
    {
      id: "ZONE-OD-RED-01",
      name: "Satabhaya High-Tide Active Incursion Zone",
      level: "RED",
      dominantHazard: "Direct Shoreline Erosion (>4m/yr) & Surge Inundation",
      hazardScore: 0.91,
      polygon: [
        [20.670, 86.885],
        [20.672, 86.930],
        [20.625, 86.915],
        [20.622, 86.865],
        [20.650, 86.870]
      ],
      description: "Severe coastal erosion zone where tidal waves breach coastal dunes. Land mass permanently receding into the Bay of Bengal."
    },
    {
      id: "ZONE-OD-ORANGE-01",
      name: "Rajnagar Creek Saline Surge Buffer",
      level: "ORANGE",
      dominantHazard: "Secondary Tidal Surge & Embankment Weakening",
      hazardScore: 0.55,
      polygon: [
        [20.640, 86.850],
        [20.635, 86.875],
        [20.610, 86.860],
        [20.615, 86.835]
      ],
      description: "Vulnerable to saline backwater intrusion during high spring tides and moderate cyclonic activity."
    }
  ]
};
