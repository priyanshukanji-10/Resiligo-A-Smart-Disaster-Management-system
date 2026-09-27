// Civilian Hazard Portal Engine: Crowdsourced Ground Telemetry
// Collects, verifies, and actions grassroots hazard reports from local citizens

let civilianReports = [
  {
    id: "CIT-REP-0101",
    regionId: "himalayan-uttarakhand",
    reporterName: "Rajendra Rawat (Gram Pradhan)",
    contactPhone: "+91 94120 XXXXX",
    hazardType: "NEW_TENSION_CRACKS",
    severity: "HIGH",
    locationName: "Sunil Ward Upper Pedestrian Path",
    coordinates: [30.5630, 79.5645],
    affectedHouseholds: 18,
    description: "Deep surface shear cracks observed opening up by 4 cm after continuous rain. Water seepage noticed under retaining wall.",
    reportedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: "VERIFIED_BY_NDRF",
    officialActionTaken: "Field patrol dispatched. Section 34 precautionary evacuation flagged for 18 families."
  },
  {
    id: "CIT-REP-0102",
    regionId: "himalayan-uttarakhand",
    reporterName: "Meenakshi Devi (Resident)",
    contactPhone: "+91 98370 XXXXX",
    hazardType: "RIVER_SURGE_DEBRIS",
    severity: "CRITICAL",
    locationName: "Marwari Bridgehead Bank",
    coordinates: [30.5475, 79.5685],
    affectedHouseholds: 24,
    description: "Alaknanda river water suddenly turned dark muddy brown with churning boulders. Riverbed toe erosion eating into foundation stones.",
    reportedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "ACTION_IN_PROGRESS",
    officialActionTaken: "High-alert siren sounded. Immediate Tier-1 transit convoy mobilized."
  },
  {
    id: "CIT-REP-0201",
    regionId: "western-ghats-kerala",
    reporterName: "Jose Joseph (Estate Supervisor)",
    contactPhone: "+91 97450 XXXXX",
    hazardType: "SOIL_PIPING_MUDFLOW",
    severity: "CRITICAL",
    locationName: "Punchirimattom Upper Ridge",
    coordinates: [11.5410, 76.1620],
    affectedHouseholds: 30,
    description: "Unusual muddy gush springing from tea plantation root layer. Soil liquefaction and minor debris slip underway.",
    reportedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    status: "VERIFIED_BY_NDRF",
    officialActionTaken: "District Collector order issued for immediate evacuation to Kalpetta camp."
  }
];

function getCivilianReports(regionId = null) {
  if (!regionId) return civilianReports;
  return civilianReports.filter(r => r.regionId === regionId);
}

function submitCivilianReport(reportData) {
  const newReport = {
    id: `CIT-REP-${Date.now().toString().slice(-4)}`,
    regionId: reportData.regionId || "himalayan-uttarakhand",
    reporterName: reportData.reporterName || "Anonymous Citizen",
    contactPhone: reportData.contactPhone || "Confidential",
    hazardType: reportData.hazardType || "SURFACE_CRACK",
    severity: reportData.severity || "MEDIUM",
    locationName: reportData.locationName || "Local Habitation",
    coordinates: reportData.coordinates || [30.5564, 79.5662],
    affectedHouseholds: Number(reportData.affectedHouseholds) || 1,
    description: reportData.description || "Local hazard reported by resident.",
    reportedAt: new Date().toISOString(),
    status: "PENDING_VERIFICATION",
    officialActionTaken: "Queued for District Disaster Control Room verification."
  };

  civilianReports.unshift(newReport);
  return newReport;
}

function updateReportStatus(reportId, status, actionTaken) {
  const report = civilianReports.find(r => r.id === reportId);
  if (report) {
    report.status = status;
    if (actionTaken) report.officialActionTaken = actionTaken;
    return report;
  }
  return null;
}

module.exports = {
  getCivilianReports,
  submitCivilianReport,
  updateReportStatus
};
