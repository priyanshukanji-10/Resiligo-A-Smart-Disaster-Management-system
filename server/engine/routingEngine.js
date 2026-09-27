// Safe Routing Engine: Dynamic Evacuation Corridors & Chokepoint Identification
// Models road network nodes, bridge lifelines, and real-time transit status for rescue convoys

/**
 * Regional Evacuation Corridors & Transit Chokepoints
 */
const EVACUATION_CORRIDORS = {
  "himalayan-uttarakhand": [
    {
      id: "CORR-UT-01",
      name: "NH-07 Alaknanda High-Terrace Evacuation Artery",
      routeType: "National Highway (Primary Heavy Evacuation)",
      startNode: "Joshimath Central Hub",
      endNode: "Pipalkoti Terrace Safe Site B",
      lengthKm: 28.5,
      capacityVehiclesPerHour: 450,
      path: [
        [30.5564, 79.5662],
        [30.5450, 79.5400],
        [30.5100, 79.5000],
        [30.4700, 79.4600],
        [30.4300, 79.4300]
      ],
      chokepoints: [
        {
          id: "CP-UT-01",
          name: "Helang Gorge Single-Lane Bridge",
          coordinates: [30.5350, 79.5420],
          chokeType: "STRUCTURAL_BOTTLENECK",
          description: "Narrow single-lane Bailey bridge over torrential gorge. Water levels within 1.2m of bridge deck.",
          status: "WARNING_RESTRICTED",
          riskScore: 0.72,
          evacuationBottleneck: "Limits convoy speed to 15 km/h; heavy NDRF water bowsers require single-file crossing."
        },
        {
          id: "CP-UT-02",
          name: "Singdhar Scarp Rockfall Zone",
          coordinates: [30.5610, 79.5690],
          chokeType: "ACTIVE_MASS_MOVEMENT",
          description: "Active tension crack crown with recurring shooting stones during rainfall >40mm/hr.",
          status: "CRITICAL_AVOID",
          riskScore: 0.89,
          evacuationBottleneck: "Blocked for civilian passenger vehicles. Requires NDRF bulldozer escort."
        }
      ],
      clearanceStatus: "AMBER_RESTRICTED_CONVOY",
      recommendedSpeedKmh: 25
    },
    {
      id: "CORR-UT-02",
      name: "Dhaka Plateau Emergency Mountain Bypass",
      routeType: "District Secondary Paved Road",
      startNode: "Sunil / Upper Wards",
      endNode: "Dhaka Plateaus Safe Habitat Zone",
      lengthKm: 6.2,
      capacityVehiclesPerHour: 220,
      path: [
        [30.5615, 79.5630],
        [30.5700, 79.5550],
        [30.5820, 79.5450]
      ],
      chokepoints: [
        {
          id: "CP-UT-03",
          name: "Dhaka Spring Culvert",
          coordinates: [30.5740, 79.5520],
          chokeType: "CULVERT_DEBRIS_CLOGGING",
          description: "Seasonal torrent culvert prone to pine needle and boulder clogging.",
          status: "MONITORED_CLEAR",
          riskScore: 0.35,
          evacuationBottleneck: "Cleared by local PWD squad. Passable for 40-seater evacuation buses."
        }
      ],
      clearanceStatus: "GREEN_CLEAR_TRANSIT",
      recommendedSpeedKmh: 35
    }
  ],
  "western-ghats-kerala": [
    {
      id: "CORR-KL-01",
      name: "Meppadi-Chooralmala Emergency Feeder Highway",
      routeType: "State Highway 54 Trunk Line",
      startNode: "Chooralmala Plantation Ground Zero",
      endNode: "Kalpetta Relief Township",
      lengthKm: 14.8,
      capacityVehiclesPerHour: 380,
      path: [
        [11.5160, 76.1350],
        [11.5400, 76.1280],
        [11.5700, 76.1050],
        [11.6050, 76.0820]
      ],
      chokepoints: [
        {
          id: "CP-KL-01",
          name: "Iruvanjippuzha Concrete Bridgehead",
          coordinates: [11.5280, 76.1320],
          chokeType: "RIVER_OVERTOPPING_RISK",
          description: "Primary bridge across the debris channel. River surge within 0.8m of foundation pier.",
          status: "HIGH_ALERT_WARNING",
          riskScore: 0.84,
          evacuationBottleneck: "NDRF rubberized inflatable boats on standby if river rises 0.5m."
        }
      ],
      clearanceStatus: "AMBER_RESTRICTED_CONVOY",
      recommendedSpeedKmh: 30
    }
  ],
  "coastal-odisha": [
    {
      id: "CORR-OD-01",
      name: "Satabhaya-Bagapatia Resettlement Embankment Highway",
      routeType: "Coastal Cyclone Resilient Evacuation Corridor",
      startNode: "Old Satabhaya Beach",
      endNode: "Bagapatia Resilient Model Colony",
      lengthKm: 12.2,
      capacityVehiclesPerHour: 500,
      path: [
        [20.6420, 86.8950],
        [20.6300, 86.8500],
        [20.6180, 86.8100],
        [20.6120, 86.7850]
      ],
      chokepoints: [
        {
          id: "CP-OD-01",
          name: "Rajnagar Tidal Creek Sluice Causeway",
          coordinates: [20.6280, 86.8450],
          chokeType: "TIDAL_BREACH_ZONE",
          description: "Low-lying estuarine causeway vulnerable to supercyclonic storm surge submergence.",
          status: "TIDE_DEPENDENT",
          riskScore: 0.65,
          evacuationBottleneck: "Inundated during high tide crest (+2.5m). Evacuation must time around low-tide window."
        }
      ],
      clearanceStatus: "GREEN_CLEAR_TRANSIT",
      recommendedSpeedKmh: 45
    }
  ]
};

/**
 * Evaluate evacuation route feasibility under simulated environmental conditions
 */
function getEvacuationCorridors(regionId = "himalayan-uttarakhand", rainfallMm = 45, riverLevelM = 2.1) {
  const baseCorridors = EVACUATION_CORRIDORS[regionId] || EVACUATION_CORRIDORS["himalayan-uttarakhand"];

  return baseCorridors.map(corr => {
    let clearance = corr.clearanceStatus;
    const dynamicChokepoints = corr.chokepoints.map(cp => {
      let risk = cp.riskScore;
      let status = cp.status;

      if (rainfallMm > 120 || riverLevelM > 4.0) {
        risk = Math.min(0.98, Number((risk * 1.25).toFixed(2)));
        if (risk >= 0.80) {
          status = "CRITICAL_AVOID";
          clearance = "RED_COMPROMISED";
        }
      }

      return {
        ...cp,
        currentRiskScore: risk,
        currentStatus: status
      };
    });

    return {
      ...corr,
      chokepoints: dynamicChokepoints,
      dynamicClearanceStatus: clearance,
      safetyRating: clearance === "RED_COMPROMISED" ? "HIGH_RISK_DIVERT" : 
                    clearance === "AMBER_RESTRICTED_CONVOY" ? "PILOT_ESCORT_REQUIRED" : "OPEN_TRANSIT"
    };
  });
}

module.exports = {
  getEvacuationCorridors
};
