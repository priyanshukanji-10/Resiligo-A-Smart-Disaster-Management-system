// Dynamic Multi-Hazard Risk & Zonation Engine
// Computes composite hazard index and polygon boundaries based on real-time triggers

const { predictHazardRisk, ML_MODEL_METADATA } = require("./mlModel");

// Ray-casting point-in-polygon algorithm
function isPointInPolygon(point, polygon) {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Calculate Haversine distance in Kilometers
function calculateDistanceKm(coord1, coord2) {
  const R = 6371; // Earth radius in km
  const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate dynamic composite Hazard Risk Index (HRI) for a habitation
 * Weights:
 * - Slope / Topography Factor: 25%
 * - Environmental Precipitation / Surge: 30%
 * - River / Waterway Proximity Factor: 20%
 * - Fault / Historical Disaster Recurrence: 25%
 */
function computeHabitationHazardScore(habitation, envState, hazardZones) {
  // 1. Terrain Slope Factor (Slopes > 30 deg in hills or < 2m elev in coast are high risk)
  let slopeRisk = 0;
  if (habitation.slopeDegree >= 35) slopeRisk = 1.0;
  else if (habitation.slopeDegree >= 28) slopeRisk = 0.8;
  else if (habitation.slopeDegree >= 20) slopeRisk = 0.55;
  else if (habitation.elevationM <= 3.0) slopeRisk = 0.95; // Coastal surge exposure
  else slopeRisk = 0.3;

  // 2. Precipitation / Water Level Surge Factor
  const rainStress = Math.min(1.0, (envState.currentRainfall24hMm || 40) / 180);
  const riverStress = Math.min(1.0, (envState.riverLevelM || 2.0) / (envState.dangerRiverLevelM || 4.5));
  const envRisk = (rainStress * 0.6) + (riverStress * 0.4);

  // 3. Proximity to active waterways / rivers
  let riverProxRisk = 0;
  if (habitation.distanceToRiverM <= 100) riverProxRisk = 1.0;
  else if (habitation.distanceToRiverM <= 300) riverProxRisk = 0.8;
  else if (habitation.distanceToRiverM <= 700) riverProxRisk = 0.5;
  else riverProxRisk = 0.2;

  // 4. Disaster History & Fault Proximity Factor
  const historyRisk = Math.min(1.0, habitation.disasterHistoryCount / 8);
  const faultRisk = habitation.distanceToMajorFaultKm < 1.0 ? 0.9 : 
                    habitation.distanceToMajorFaultKm < 3.0 ? 0.6 : 0.2;
  const geoHistoricalRisk = (historyRisk * 0.6) + (faultRisk * 0.4);

  // Run Machine Learning Hazard Susceptibility Inference Model
  const mlInference = predictHazardRisk({
    slopeDegree: habitation.slopeDegree,
    rainfall24hMm: envState.currentRainfall24hMm,
    soilSaturationPercent: envState.soilSaturationPercent,
    distanceToRiverM: habitation.distanceToRiverM,
    distanceToMajorFaultKm: habitation.distanceToMajorFaultKm,
    elevationM: habitation.elevationM
  });

  // Blend ML model probability (60%) with spatial multi-criteria baseline (40%)
  let compositeHRI = (mlInference.hazardProbability * 0.60) +
                     (((slopeRisk * 0.25) + (envRisk * 0.30) + (riverProxRisk * 0.20) + (geoHistoricalRisk * 0.25)) * 0.40);

  // Check if directly located within defined Red or Orange Polygons
  let isInsideRedZone = false;
  let isInsideOrangeZone = false;
  let containingZoneName = null;

  for (const zone of hazardZones) {
    if (isPointInPolygon(habitation.coordinates, zone.polygon)) {
      if (zone.level === "RED") {
        isInsideRedZone = true;
        containingZoneName = zone.name;
        compositeHRI = Math.max(compositeHRI, 0.78); // Force high risk in demarcated red zone
      } else if (zone.level === "ORANGE") {
        isInsideOrangeZone = true;
        containingZoneName = zone.name;
        compositeHRI = Math.max(compositeHRI, 0.52);
      }
    }
  }

  // Zone status tag
  const zoneStatus = isInsideRedZone ? "RED_ZONE" :
                     (isInsideOrangeZone || compositeHRI >= 0.65) ? "ORANGE_ZONE" : "BUFFER_ZONE";

  return {
    hriScore: Number(Math.min(1.0, compositeHRI).toFixed(3)),
    zoneStatus,
    isInsideRedZone,
    isInsideOrangeZone,
    containingZoneName,
    mlInference,
    breakdown: {
      terrainRisk: Number(slopeRisk.toFixed(2)),
      precipitationStress: Number(envRisk.toFixed(2)),
      riverProximityRisk: Number(riverProxRisk.toFixed(2)),
      historicalRecurrenceRisk: Number(geoHistoricalRisk.toFixed(2)),
      mlHazardProbability: mlInference.hazardProbability
    }
  };
}

/**
 * Dynamically expands or alters hazard zone polygons when rainfall / river spikes occur
 */
function getDynamicallyUpdatedZones(baseZones, envState) {
  const rainRatio = (envState.currentRainfall24hMm || 40) / 45; // 1.0 at baseline
  const riverRatio = (envState.riverLevelM || 2.0) / 2.5;

  return baseZones.map(zone => {
    let dynamicScore = zone.hazardScore;
    let dynamicLevel = zone.level;

    if (rainRatio > 1.8 || riverRatio > 1.6) {
      dynamicScore = Math.min(0.99, dynamicScore * 1.18);
      if (dynamicScore >= 0.70) dynamicLevel = "RED";
    }

    // Slightly expand polygon coordinates radially from centroid if severe rainfall
    let updatedPolygon = zone.polygon;
    if (rainRatio > 2.0) {
      // Find centroid
      let cLat = 0, cLng = 0;
      zone.polygon.forEach(([lat, lng]) => { cLat += lat; cLng += lng; });
      cLat /= zone.polygon.length;
      cLng /= zone.polygon.length;

      // Expand outward by 8% to 15%
      const expansionFactor = 1.0 + Math.min(0.18, (rainRatio - 1.0) * 0.08);
      updatedPolygon = zone.polygon.map(([lat, lng]) => [
        Number((cLat + (lat - cLat) * expansionFactor).toFixed(6)),
        Number((cLng + (lng - cLng) * expansionFactor).toFixed(6))
      ]);
    }

    return {
      ...zone,
      level: dynamicLevel,
      hazardScore: Number(dynamicScore.toFixed(3)),
      polygon: updatedPolygon,
      isExpandedDueToSimulation: rainRatio > 1.8
    };
  });
}

module.exports = {
  isPointInPolygon,
  calculateDistanceKm,
  computeHabitationHazardScore,
  getDynamicallyUpdatedZones
};
