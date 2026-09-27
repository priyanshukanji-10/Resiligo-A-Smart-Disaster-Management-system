// Relocation Urgency Scoring & Capacitated Safe Allocation Engine
// Solves multi-criteria vulnerability prioritization and constrained site assignment

const { calculateDistanceKm } = require("./hazardEngine");
const { assessSiteCarryingCapacity } = require("./carryingCapacityEngine");

/**
 * Computes Relocation Urgency Index (RUI) for a habitation
 * Weights:
 * - Hazard Exposure (HRI): 40%
 * - Structural Housing Fragility (Kutcha %): 25%
 * - Demographic Vulnerability (Children + Elderly + Disabled): 20%
 * - Route Cutoff / Isolation Risk: 15%
 */
function computeRelocationUrgency(habitation, hazardAssessment) {
  const hri = hazardAssessment.hriScore;

  // 1. Kutcha Housing Vulnerability [0 - 1]
  const housingFragility = (habitation.kutchaHousePercentage || 50) / 100;

  // 2. Demographic Vulnerability [0 - 1]
  const vulCount = (habitation.vulnerableDemographics.children || 0) +
                   (habitation.vulnerableDemographics.elderly || 0) +
                   (habitation.vulnerableDemographics.disabled || 0) * 1.5;
  const demoRatio = Math.min(1.0, vulCount / habitation.population);

  // 3. Egress / Cutoff Risk
  let egressRisk = 0.3;
  const roadDesc = (habitation.accessRoadType || "").toLowerCase();
  if (roadDesc.includes("footbridge") || roadDesc.includes("submerged") || roadDesc.includes("no vehicle")) {
    egressRisk = 1.0;
  } else if (roadDesc.includes("single narrow") || roadDesc.includes("fragile") || roadDesc.includes("unpaved")) {
    egressRisk = 0.8;
  } else if (roadDesc.includes("steep") || roadDesc.includes("rockfall")) {
    egressRisk = 0.6;
  }

  // Composite RUI
  let rui = (hri * 0.40) +
            (housingFragility * 0.25) +
            (demoRatio * 0.20) +
            (egressRisk * 0.15);

  // If directly in Red Zone and has cutoff risk, elevate RUI
  if (hazardAssessment.isInsideRedZone) {
    rui = Math.max(rui, 0.76);
  }

  rui = Number(Math.min(1.0, rui).toFixed(3));

  // Determine Relocation Tier
  let priorityTier = "MEDIUM_TERM";
  let timeHorizon = "6 to 24 Months";
  let priorityBadge = "Tier 3: Medium-Term Relocation";
  let color = "#eab308"; // Amber / Yellow

  if (rui >= 0.72 || hazardAssessment.isInsideRedZone) {
    priorityTier = "IMMEDIATE";
    timeHorizon = "0 to 30 Days (Urgent Evacuation & Transit)";
    priorityBadge = "Tier 1: Immediate Relocation";
    color = "#ef4444"; // Red
  } else if (rui >= 0.50) {
    priorityTier = "SHORT_TERM";
    timeHorizon = "1 to 6 Months (Pre-Monsoon Relocation)";
    priorityBadge = "Tier 2: Short-Term Relocation";
    color = "#f97316"; // Orange
  }

  return {
    ruiScore: rui,
    priorityTier,
    timeHorizon,
    priorityBadge,
    color,
    factors: {
      hazardIndex: hri,
      housingFragility: Number(housingFragility.toFixed(2)),
      demographicVulnerability: Number(demoRatio.toFixed(2)),
      egressCutoffRisk: Number(egressRisk.toFixed(2))
    }
  };
}

/**
 * Capacitated Relocation Allocation Solver
 * Matches prioritized habitations to nearest safe relocation sites respecting carrying capacity
 */
function solveRelocationAllocation(habitations, candidateSites) {
  // Deep clone sites to track cumulative capacity allocations
  const sitePool = candidateSites.map(s => ({
    ...s,
    allocatedPopulation: 0,
    allocatedHabitations: []
  }));

  // Sort habitations by Relocation Urgency Index descending (highest urgency first)
  const sortedHabitations = [...habitations].sort((a, b) => b.relocation.ruiScore - a.relocation.ruiScore);

  const allocations = [];
  const unassignedHabitations = [];

  for (const hab of sortedHabitations) {
    // Calculate distance to all sites
    const candidateOptions = sitePool.map(site => {
      const distanceKm = calculateDistanceKm(hab.coordinates, site.coordinates);
      const capacityAssessment = assessSiteCarryingCapacity(site, site.allocatedPopulation);
      return {
        site,
        distanceKm: Number(distanceKm.toFixed(2)),
        remainingCapacity: capacityAssessment.metrics.remainingAbsorptionCapacity,
        suitabilityScore: capacityAssessment.suitability.score
      };
    });

    // Sort candidate sites: prioritize sites with capacity, then by shortest distance
    candidateOptions.sort((a, b) => {
      const aHasCapacity = a.remainingCapacity >= hab.population;
      const bHasCapacity = b.remainingCapacity >= hab.population;

      if (aHasCapacity && !bHasCapacity) return -1;
      if (!aHasCapacity && bHasCapacity) return 1;
      return a.distanceKm - b.distanceKm;
    });

    // Pick top feasible site
    const bestSiteOption = candidateOptions[0];

    if (bestSiteOption && bestSiteOption.remainingCapacity >= hab.population) {
      // Allocate to this site
      bestSiteOption.site.allocatedPopulation += hab.population;
      bestSiteOption.site.allocatedHabitations.push(hab.id);

      const travelTimeMinutes = Math.round(bestSiteOption.distanceKm * 2.8); // Mountain/rural transit speed avg

      allocations.push({
        habitationId: hab.id,
        habitationName: hab.name,
        population: hab.population,
        households: hab.households,
        urgencyTier: hab.relocation.priorityTier,
        assignedSiteId: bestSiteOption.site.id,
        assignedSiteName: bestSiteOption.site.name,
        assignedSiteCoordinates: bestSiteOption.site.coordinates,
        originCoordinates: hab.coordinates,
        distanceKm: bestSiteOption.distanceKm,
        estimatedTransitTimeMin: travelTimeMinutes,
        transitStatus: "OPTIMALLY_ALLOCATED",
        routeNotes: `Transit via regional road corridor; distance ${bestSiteOption.distanceKm} km.`
      });
    } else {
      // Deficit / overflow!
      unassignedHabitations.push({
        habitationId: hab.id,
        habitationName: hab.name,
        population: hab.population,
        reason: "EXCEEDS_REGIONAL_CARRYING_CAPACITY",
        recommendation: "Requires satellite transit camp requisition or secondary safe zone expansion."
      });
    }
  }

  // Compute final evaluated states of all safe sites
  const evaluatedSites = sitePool.map(site => {
    return assessSiteCarryingCapacity(site, site.allocatedPopulation);
  });

  // Calculate NDRF logistical requirements for allocated populations
  const totalImmediatePop = habitations
    .filter(h => h.relocation.priorityTier === "IMMEDIATE")
    .reduce((sum, h) => sum + h.population, 0);

  const totalRelocatedPop = habitations.reduce((sum, h) => sum + h.population, 0);

  const logisticsRequirements = {
    totalTargetPopulation: totalRelocatedPop,
    immediateEvacuationPopulation: totalImmediatePop,
    ndrfRescueBattalionsRecommended: Math.ceil(totalImmediatePop / 350),
    evacuationBusesRequired: Math.ceil(totalImmediatePop / 40),
    temporarySheltersUnits: Math.ceil(totalImmediatePop / 5), // 5 persons per family tent
    emergencyPotableWaterTankersDaily: Math.ceil((totalImmediatePop * 40) / 10000), // Emergency 40 LPCD during transit
    mobileMedicalUnits: Math.max(2, Math.ceil(totalImmediatePop / 500))
  };

  return {
    allocations,
    unassignedHabitations,
    evaluatedSites,
    logisticsRequirements
  };
}

module.exports = {
  computeRelocationUrgency,
  solveRelocationAllocation
};
