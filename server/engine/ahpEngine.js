// Saaty Analytic Hierarchy Process (AHP) Multi-Criteria Decision Analysis (MCDA)
// Formally verifies consistency ratio (CR < 0.10) for multi-hazard weight assignment

/**
 * 5 Criteria Pairwise Comparison Matrix (Saaty 1-9 Fundamental Scale):
 * Criteria:
 * C1: Cumulative 24h Rainfall Anomaly (IMD Gridded)
 * C2: Terrain Slope Gradient (CartoDEM / SRTM)
 * C3: Topographic Wetness Index (TWI) & Soil Saturation
 * C4: Proximity to Drainage / River Streams
 * C5: Major Thrust / Active Fault Line Proximity
 */
const CRITERIA_NAMES = [
  "Rainfall Anomaly (IMD)",
  "Terrain Slope (CartoDEM)",
  "Soil Wetness Index (TWI)",
  "Stream Proximity (Drainage)",
  "Fault Line Proximity (Neotectonics)"
];

// Saaty Pairwise Matrix A [5x5]
const PAIRWISE_MATRIX = [
  [1.000, 1.333, 1.667, 3.000, 5.000], // C1: Rainfall
  [0.750, 1.000, 1.333, 2.500, 4.000], // C2: Slope
  [0.600, 0.750, 1.000, 2.000, 3.500], // C3: Wetness
  [0.333, 0.400, 0.500, 1.000, 2.500], // C4: Stream
  [0.200, 0.250, 0.286, 0.400, 1.000]  // C5: Fault
];

// Random Inconsistency Index (RI) for n = 5 as per Saaty (1980)
const RI_5 = 1.12;

/**
 * Solves the principal eigenvector and validates Consistency Ratio (CR)
 */
function solveSaatyAHP() {
  const n = PAIRWISE_MATRIX.length;

  // 1. Column sums
  const colSums = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += PAIRWISE_MATRIX[i][j];
    }
  }

  // 2. Normalized matrix & Priority Vector (Principal Eigenvector w)
  const priorityVector = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let rowNormSum = 0;
    for (let j = 0; j < n; j++) {
      rowNormSum += PAIRWISE_MATRIX[i][j] / colSums[j];
    }
    priorityVector[i] = Number((rowNormSum / n).toFixed(4));
  }

  // 3. Compute Lambda Max (λ_max)
  let lambdaMax = 0;
  for (let j = 0; j < n; j++) {
    lambdaMax += colSums[j] * priorityVector[j];
  }

  // 4. Consistency Index (CI) & Consistency Ratio (CR)
  const ci = (lambdaMax - n) / (n - 1);
  const cr = ci / RI_5;
  const isConsistent = cr < 0.10;

  return {
    criteria: CRITERIA_NAMES,
    pairwiseMatrix: PAIRWISE_MATRIX,
    weights: {
      rainfall: priorityVector[0],
      slope: priorityVector[1],
      soilWetness: priorityVector[2],
      streamProximity: priorityVector[3],
      faultProximity: priorityVector[4]
    },
    weightPercentages: {
      rainfallPct: Math.round(priorityVector[0] * 100),
      slopePct: Math.round(priorityVector[1] * 100),
      soilWetnessPct: Math.round(priorityVector[2] * 100),
      streamProximityPct: Math.round(priorityVector[3] * 100),
      faultProximityPct: Math.round(priorityVector[4] * 100)
    },
    consistencyMetrics: {
      lambdaMax: Number(lambdaMax.toFixed(4)),
      consistencyIndexCI: Number(ci.toFixed(4)),
      randomInconsistencyRI: RI_5,
      consistencyRatioCR: Number(cr.toFixed(4)),
      isConsistent,
      statusMessage: isConsistent
        ? `Mathematically Valid (CR = ${cr.toFixed(3)} < 0.10 as per Saaty Standard)`
        : "Inconsistent Pairwise Judgments"
    }
  };
}

module.exports = {
  solveSaatyAHP
};
