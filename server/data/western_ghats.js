// Kerala Western Ghats Sector (Wayanad - Meppadi / Chooralmala)
// Heavy rainfall, steep slopes, debris flow channels, soil piping

module.exports = {
  regionId: "western-ghats-kerala",
  regionName: "Kerala Western Ghats (Wayanad / Meppadi)",
  center: [11.5200, 76.1300],
  zoom: 12,
  description: "High precipitation zone in Western Ghats prone to massive debris flows, soil liquefaction, and river course diversion during intense monsoon bursts.",

  environmentalBaseline: {
    avgAnnualRainfallMm: 3600,
    currentRainfall24hMm: 60,
    riverLevelM: 2.8,
    dangerRiverLevelM: 5.0,
    slopeAngleAvgDeg: 31,
    soilSaturationPercent: 72,
    activeFaultProximityKm: 4.2
  },

  habitations: [
    {
      id: "HAB-KL-01",
      name: "Chooralmala Plantation Settlement",
      coordinates: [11.5160, 76.1350],
      population: 620,
      households: 124,
      kutchaHousePercentage: 70,
      vulnerableDemographics: { children: 115, elderly: 88, disabled: 18 },
      slopeDegree: 34,
      elevationM: 890,
      disasterHistoryCount: 6,
      accessRoadType: "Single concrete bridge across Iruvanjippuzha (Extreme flood risk)",
      distanceToMajorFaultKm: 3.5,
      distanceToRiverM: 50,
      economicIndex: "Tea Plantation Laborers",
      primaryHazard: "Mass Debris Torrent & Channel Inundation"
    },
    {
      id: "HAB-KL-02",
      name: "Mundakkai Slope Colony",
      coordinates: [11.5300, 76.1480],
      population: 490,
      households: 98,
      kutchaHousePercentage: 78,
      vulnerableDemographics: { children: 92, elderly: 74, disabled: 14 },
      slopeDegree: 39,
      elevationM: 1040,
      disasterHistoryCount: 9,
      accessRoadType: "Steep estate road prone to roadbed collapse",
      distanceToMajorFaultKm: 2.8,
      distanceToRiverM: 120,
      economicIndex: "Low-Income Plantation Workers",
      primaryHazard: "Catastrophic Hillside Crown Failure"
    },
    {
      id: "HAB-KL-03",
      name: "Attamala Ridge Hamlet",
      coordinates: [11.5050, 76.1550],
      population: 310,
      households: 62,
      kutchaHousePercentage: 58,
      vulnerableDemographics: { children: 54, elderly: 40, disabled: 7 },
      slopeDegree: 36,
      elevationM: 1120,
      disasterHistoryCount: 4,
      accessRoadType: "Narrow unpaved jeep track",
      distanceToMajorFaultKm: 4.1,
      distanceToRiverM: 350,
      economicIndex: "Tribal & Forest Edge Farmers",
      primaryHazard: "Slope Cleavage & Isolation due to Road Washout"
    },
    {
      id: "HAB-KL-04",
      name: "Punchirimattom Upper Valley",
      coordinates: [11.5380, 76.1600],
      population: 280,
      households: 56,
      kutchaHousePercentage: 84,
      vulnerableDemographics: { children: 50, elderly: 38, disabled: 9 },
      slopeDegree: 42,
      elevationM: 1210,
      disasterHistoryCount: 7,
      accessRoadType: "Steep single trail (no vehicle access)",
      distanceToMajorFaultKm: 3.1,
      distanceToRiverM: 90,
      economicIndex: "Marginal Workers",
      primaryHazard: "Epicenter of Flash Debris Surge"
    },
    {
      id: "HAB-KL-05",
      name: "Meppadi Valley Outskirts",
      coordinates: [11.5520, 76.1220],
      population: 520,
      households: 104,
      kutchaHousePercentage: 42,
      vulnerableDemographics: { children: 85, elderly: 62, disabled: 10 },
      slopeDegree: 19,
      elevationM: 780,
      disasterHistoryCount: 3,
      accessRoadType: "Two-lane state highway feeder",
      distanceToMajorFaultKm: 5.2,
      distanceToRiverM: 600,
      economicIndex: "Small Business & Agriculture",
      primaryHazard: "Monsoon Waterlogging & Localized Slips"
    }
  ],

  candidateSafeSites: [
    {
      id: "SAFE-KL-01",
      name: "Kalpetta Plateau Rehabilitation Township",
      coordinates: [11.6050, 76.0820],
      totalLandAreaHectares: 25.0,
      usableLandAreaHectares: 18.5,
      terrainSlopeDeg: 5,
      elevationM: 750,
      distanceToNearestFaultKm: 8.0,
      distanceToRiverM: 1900,
      
      potableWaterYieldLPD: 420000,
      perCapitaWaterRequirementLPCD: 135,
      accessRoadWidthM: 12.0, // State Highway corridor
      nearestHospitalKm: 1.5,
      primarySchoolsAvailable: 4,
      powerGridAvailableKVA: 1200,
      soilBearingCapacityKPa: 240,
      ecologicalBufferCompliant: true,
      existingLocalPopulation: 450
    },
    {
      id: "SAFE-KL-02",
      name: "Kottathara Safe Terraced Land Bank",
      coordinates: [11.6300, 76.1200],
      totalLandAreaHectares: 16.0,
      usableLandAreaHectares: 12.0,
      terrainSlopeDeg: 7,
      elevationM: 770,
      distanceToNearestFaultKm: 7.2,
      distanceToRiverM: 1400,
      
      potableWaterYieldLPD: 210000,
      perCapitaWaterRequirementLPCD: 135,
      accessRoadWidthM: 7.5,
      nearestHospitalKm: 3.2,
      primarySchoolsAvailable: 2,
      powerGridAvailableKVA: 600,
      soilBearingCapacityKPa: 210,
      ecologicalBufferCompliant: true,
      existingLocalPopulation: 200
    }
  ],

  hazardZones: [
    {
      id: "ZONE-KL-RED-01",
      name: "Mundakkai-Chooralmala Debris Fan Basin",
      level: "RED",
      dominantHazard: "Debris Torrent & Flash Slope Collapse",
      hazardScore: 0.94,
      polygon: [
        [11.545, 76.140],
        [11.535, 76.165],
        [11.512, 76.145],
        [11.510, 76.128],
        [11.528, 76.125]
      ],
      description: "Severe hazard zone covering the origin funnel and primary drainage of the high-velocity debris avalanche."
    },
    {
      id: "ZONE-KL-ORANGE-01",
      name: "Meppadi South-East Buffer Ridge",
      level: "ORANGE",
      dominantHazard: "Secondary Slope Liquefaction",
      hazardScore: 0.61,
      polygon: [
        [11.555, 76.120],
        [11.548, 76.138],
        [11.530, 76.135],
        [11.535, 76.115]
      ],
      description: "High moisture retention zone with potential for lateral slip propagation during multi-day precipitation spells."
    }
  ]
};
