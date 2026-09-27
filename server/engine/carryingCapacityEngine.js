// Carrying Capacity Assessment Engine for Safe Relocation Sites
// Evaluates Spatial, Hydrological (CPHEEO 135 LPCD), Civic, and Ecological thresholds

/**
 * Evaluates comprehensive Carrying Capacity of a candidate safe site
 * @param {Object} site Candidate site data
 * @param {number} allottedPopulation Currently assigned displaced population
 */
function assessSiteCarryingCapacity(site, allottedPopulation = 0) {
  const CPHEEO_WATER_NORM_LPCD = site.perCapitaWaterRequirementLPCD || 135;

  // 1. Spatial Land Capacity (Persons)
  // Maximum safe density based on terrain slope (steep hills require lower density to avoid slope instability)
  let maxDensityPersonsPerHa = 220;
  if (site.terrainSlopeDeg > 10) maxDensityPersonsPerHa = 160;
  else if (site.terrainSlopeDeg > 6) maxDensityPersonsPerHa = 190;
  else maxDensityPersonsPerHa = 250;

  const spatialCapacity = Math.floor(site.usableLandAreaHectares * maxDensityPersonsPerHa);

  // 2. Hydrological / Water Carrying Capacity (Persons)
  // CPHEEO guidelines: 135 Liters per capita per day
  const waterCapacity = Math.floor(site.potableWaterYieldLPD / CPHEEO_WATER_NORM_LPCD);

  // 3. Civic & Health Capacity (Persons)
  // Power grid (0.35 kVA per capita estimate) and hospital distance
  const powerCapacity = Math.floor((site.powerGridAvailableKVA * 1000) / 350);
  const roadTransitFeasibility = site.accessRoadWidthM >= 7.0 ? "EXCELLENT_MULTI_LANE" : 
                                 site.accessRoadWidthM >= 5.5 ? "MODERATE_SINGLE_LANE" : "RESTRICTED";

  // Civic capacity ceiling (weighted minimum of spatial, power, and road factors)
  const civicCapacity = Math.min(spatialCapacity * 1.2, powerCapacity);

  // 4. Determine Gross Carrying Capacity and Critical Bottleneck
  let grossCapacity = Math.min(spatialCapacity, waterCapacity);
  let bindingBottleneck = "NONE";

  if (waterCapacity < spatialCapacity) {
    bindingBottleneck = "POTABLE_WATER_YIELD";
    grossCapacity = waterCapacity;
  } else {
    bindingBottleneck = "USABLE_LAND_AREA";
    grossCapacity = spatialCapacity;
  }

  // 5. Net Available Capacity (after baseline resident population)
  const baselineExistingResidents = site.existingLocalPopulation || 0;
  const netCapacity = Math.max(0, grossCapacity - baselineExistingResidents);

  // 6. Current Utilization & Headroom
  const currentTotalLoad = baselineExistingResidents + allottedPopulation;
  const remainingAbsorptionCapacity = Math.max(0, grossCapacity - currentTotalLoad);
  const utilizationPercentage = Number(((currentTotalLoad / grossCapacity) * 100).toFixed(1));

  // 7. Ecological & Geological Suitability Score [0 - 100]
  let suitabilityScore = 100;
  if (site.terrainSlopeDeg > 10) suitabilityScore -= 12;
  if (site.distanceToNearestFaultKm < 5.0) suitabilityScore -= 15;
  if (site.distanceToRiverM < 1500) suitabilityScore -= 10;
  if (site.nearestHospitalKm > 4.0) suitabilityScore -= 8;
  if (!site.ecologicalBufferCompliant) suitabilityScore -= 25;

  let suitabilityRating = "HIGHLY_SUITABLE";
  if (suitabilityScore < 60) suitabilityRating = "POOR_SUITABILITY";
  else if (suitabilityScore < 80) suitabilityRating = "MODERATELY_SUITABLE";

  return {
    siteId: site.id,
    siteName: site.name,
    coordinates: site.coordinates,
    metrics: {
      grossCapacityPersons: grossCapacity,
      netCapacityPersons: netCapacity,
      allottedPopulation,
      remainingAbsorptionCapacity,
      utilizationPercentage,
      isSaturated: remainingAbsorptionCapacity <= 0,
      bindingBottleneck,
      bottleneckDescription: getBottleneckText(bindingBottleneck, waterCapacity, spatialCapacity)
    },
    capacities: {
      spatialCapacityPersons: spatialCapacity,
      waterCapacityPersons: waterCapacity,
      powerCapacityPersons: powerCapacity,
      waterYieldLPD: site.potableWaterYieldLPD,
      usableLandHectares: site.usableLandAreaHectares
    },
    suitability: {
      score: suitabilityScore,
      rating: suitabilityRating,
      terrainSlopeDeg: site.terrainSlopeDeg,
      roadAccess: roadTransitFeasibility,
      hospitalDistanceKm: site.nearestHospitalKm,
      ecologicalCompliant: site.ecologicalBufferCompliant
    }
  };
}

function getBottleneckText(bottleneck, waterCap, spatialCap) {
  if (bottleneck === "POTABLE_WATER_YIELD") {
    return `Water constrained: Daily yield caps sustainable population to ${waterCap.toLocaleString()} persons (vs ${spatialCap.toLocaleString()} land capacity) under CPHEEO 135 LPCD norms.`;
  } else if (bottleneck === "USABLE_LAND_AREA") {
    return `Land constrained: Topography limits buildable footprint to ${spatialCap.toLocaleString()} persons (water available for ${waterCap.toLocaleString()} persons).`;
  }
  return "Balanced resources: No severe binding deficit detected.";
}

module.exports = {
  assessSiteCarryingCapacity
};
