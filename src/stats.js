// Sample-size formulas. Every function returns integers rounded UP.
// Cross-checked against statsmodels 0.15 (t-tests, ANOVA) and the RNASeqPower
// package documentation (Hart et al. 2013) — see tests/check.mjs.

// Inverse standard normal CDF (Acklam's rational approximation, |error| < 1.2e-9)
export function qnorm(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p <= 0 || p >= 1) return NaN;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

const zA = (alpha) => qnorm(1 - alpha / 2); // two-sided
const zB = (power) => qnorm(power);
const up = (x) => Math.ceil(x - 1e-9);

// Two independent groups, Cohen's d. Normal approximation with Guenther's
// small-sample correction (+ z_a^2/4); matches exact noncentral-t to the integer
// for d = 0.2–0.8 at 80% and 90% power.
export function nTwoGroup(d, power, alpha = 0.05) {
  const z = zA(alpha) + zB(power);
  return up((2 * z * z) / (d * d) + (zA(alpha) ** 2) / 4);
}

// Paired / within-subject, Cohen's dz (mean difference / SD of differences).
export function nPaired(dz, power, alpha = 0.05) {
  const z = zA(alpha) + zB(power);
  return up((z * z) / (dz * dz) + (zA(alpha) ** 2) / 2);
}

// One-way ANOVA, Cohen's f, alpha 0.05. Exact noncentral-F values (statsmodels
// FTestAnovaPower), per group, for [80%, 90%] power.
export const ANOVA_TABLE = {
  "0.1":  { 3: [323, 423], 4: [274, 356], 5: [240, 310], 6: [215, 276] },
  "0.25": { 3: [53, 69],   4: [45, 58],   5: [40, 51],   6: [36, 45] },
  "0.4":  { 3: [22, 28],   4: [19, 24],   5: [16, 21],   6: [15, 19] },
};

// Survival, log-rank, 1:1 allocation (Schoenfeld 1983): total events required.
export function eventsSchoenfeld(hr, power, alpha = 0.05) {
  const z = zA(alpha) + zB(power);
  return up((4 * z * z) / (Math.log(hr) ** 2));
}

// RNA-seq, per group (Hart et al. 2013; RNASeqPower):
// n = 2 (z_a/2 + z_b)^2 (1/depth + cv^2) / ln(FC)^2
// depth = expected read count for the gene; cv = biological coefficient of variation.
export function nHart(depth, cv, fc, power, alpha) {
  const z = zA(alpha) + zB(power);
  return up((2 * z * z * (1 / depth + cv * cv)) / (Math.log(fc) ** 2));
}

// GWAS quantitative trait, single-SNP test, unrelated individuals.
// NCP = n q2 / (1 - q2) (Sham & Purcell 2014) => n = z^2 (1 - q2) / q2
export function nGwasQuant(q2, power, alpha = 5e-8) {
  const z = zA(alpha) + zB(power);
  return up((z * z * (1 - q2)) / q2);
}

// GWAS case–control, allelic (additive) test, 1:1, rare-disease approximation
// (control allele frequency = MAF). Returns cases (= controls).
export function nGwasCC(maf, or, power, alpha = 5e-8) {
  const p0 = maf, p1 = (or * p0) / (1 - p0 + or * p0), pb = (p0 + p1) / 2;
  const alleles = (zA(alpha) * Math.sqrt(2 * pb * (1 - pb)) + zB(power) * Math.sqrt(p0 * (1 - p0) + p1 * (1 - p1))) ** 2 / (p1 - p0) ** 2;
  return up(alleles / 2);
}

// Diploid individuals needed to sample an allele of frequency p at least once
// with probability conf: 1 - (1 - p)^(2n) >= conf
export function nAlleleDetect(p, conf = 0.95) {
  return up(Math.log(1 - conf) / Math.log(1 - p) / 2);
}

// Patterson et al. 2006 detectability threshold for two equal subpopulations:
// structure is essentially undetectable when Fst < 1 / sqrt(n_individuals * n_markers)
export const fstThreshold = (nInd, nMarkers) => 1 / Math.sqrt(nInd * nMarkers);

// Cells per sample so that a cell type at frequency f yields >= k cells with
// probability conf (Poisson approximation to the binomial).
export function nCellsForType(f, k, conf = 0.95) {
  const pAtLeast = (lam) => { let term = Math.exp(-lam), cdf = term; for (let i = 1; i < k; i++) { term *= lam / i; cdf += term; } return 1 - cdf; };
  let lo = k, hi = k;
  while (pAtLeast(hi * f) < conf) hi *= 2;
  while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (pAtLeast(mid * f) >= conf) hi = mid; else lo = mid + 1; }
  return lo;
}

export const withLoss = (n, loss = 0.15) => up(n / (1 - loss));
export const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-US") : n);
