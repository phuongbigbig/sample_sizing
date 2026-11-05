// Questionnaire definition + recommendation engine.
// Each study type = ordered steps. A step is shown when all previous steps are
// answered and its optional `when(a)` is true. Changing a step clears every
// later step (handled in App).
import * as S from "./stats.js";

const o = (id, label, hint) => ({ id, label, hint });

export const STUDY_TYPES = [
  o("rnaseq", "RNA-seq / transcriptomics"),
  o("gwas", "GWAS / SNP association"),
  o("popgen", "Population genetics / genomics"),
  o("microbiome", "Metagenomics / microbiome"),
  o("experimental", "Experimental biology (in vivo / in vitro)"),
  o("qualitative", "Qualitative / mixed methods"),
];
export const ICONS = { rnaseq: "dna", gwas: "search", popgen: "globe", microbiome: "bacteria", experimental: "flask", qualitative: "clipboard" };

const EXP_EFFECT = {
  two_group: { sym: "d", opts: [o("0.8", "Large (d = 0.8)"), o("0.5", "Medium (d = 0.5)"), o("0.2", "Small (d = 0.2)"), o("unknown", "Unknown — no pilot data")] },
  paired: { sym: "dz", opts: [o("0.8", "Large (dz = 0.8)"), o("0.5", "Medium (dz = 0.5)"), o("0.2", "Small (dz = 0.2)"), o("unknown", "Unknown — no pilot data")] },
  anova: { sym: "f", opts: [o("0.4", "Large (f = 0.40)"), o("0.25", "Medium (f = 0.25)"), o("0.1", "Small (f = 0.10)"), o("unknown", "Unknown — no pilot data")] },
  survival: { sym: "HR", opts: [o("0.5", "Large (HR = 0.50)", "e.g. mortality halved"), o("0.67", "Medium (HR = 0.67)"), o("0.8", "Small (HR = 0.80)"), o("unknown", "Unknown — no pilot data")] },
};

export const STEPS = {
  rnaseq: [
    { key: "goal", label: "Analytical goal", cols: 1, options: [
      o("de_large", "Detect large fold-changes (≥ 2×)"),
      o("de_moderate", "Detect moderate fold-changes (≈ 1.5×)"),
      o("de_small", "Detect small fold-changes (≈ 1.25×)"),
      o("exploratory", "Exploratory / pilot study"),
      o("scrnaseq", "Single-cell RNA-seq (DE between conditions)"),
    ] },
    { key: "org", label: "Biological variability of your samples", cols: 1, options: [
      o("inbred", "Low — inbred line, clonal or cell culture", "typical biological CV ≈ 0.1"),
      o("outbred", "Typical — outbred individuals (farmed or wild fish, bivalves, humans)", "typical biological CV ≈ 0.4"),
    ] },
  ],
  gwas: [
    { key: "trait", label: "Trait type", cols: 2, options: [
      o("cc", "Binary (case–control)", "e.g. disease resistance, survival after challenge"),
      o("qt", "Quantitative", "e.g. growth, fillet yield, body weight"),
    ] },
    { key: "or", label: "Expected odds ratio of the risk allele", cols: 2, when: (a) => a.trait === "cc", options: [
      o("3", "OR = 3.0 (major-effect locus)"), o("2", "OR = 2.0"), o("1.5", "OR = 1.5"), o("1.2", "OR = 1.2 (typical human complex trait)"),
    ] },
    { key: "maf", label: "Minor allele frequency of the causal variant", cols: 3, when: (a) => a.trait === "cc", options: [
      o("0.05", "0.05"), o("0.1", "0.10"), o("0.2", "0.20"), o("0.3", "0.30"), o("0.5", "0.50"),
    ] },
    { key: "q2", label: "Phenotypic variance explained by the locus", cols: 2, when: (a) => a.trait === "qt", options: [
      o("0.1", "10% (major QTL)"), o("0.05", "5%"), o("0.02", "2%"), o("0.01", "1%"), o("0.005", "0.5% (typical polygenic hit)"),
    ] },
    { key: "alpha", label: "Genome-wide significance threshold", cols: 1, options: [
      o("5e-8", "5 × 10⁻⁸ (conventional, human)"),
      o("5e-7", "5 × 10⁻⁷ (Bonferroni for ≈100K SNPs)"),
      o("1e-6", "1 × 10⁻⁶ (Bonferroni for ≈50K SNPs)"),
    ] },
  ],
  popgen: [
    { key: "goal", label: "Primary analysis", cols: 1, options: [
      o("diversity", "Genetic diversity and differentiation (He, Ho, AR, Fst)"),
      o("structure", "Population structure / clustering (PCA, ADMIXTURE, STRUCTURE)"),
      o("parentage", "Parentage / relatedness assignment"),
      o("selection", "Selection scans / genotype–environment association"),
      o("demography", "Demographic history / effective population size (Ne)"),
    ] },
    { key: "marker", label: "Marker type", cols: 2, options: [
      o("ssr", "Microsatellites (SSR)"), o("snp_panel", "SNP panel (< 1,000 SNPs)"),
      o("rad", "RAD-seq / ddRAD / GBS (≥ 1,000 SNPs)"), o("wgs", "WGS or SNP array (≥ 10,000 SNPs)"),
    ] },
  ],
  microbiome: [
    { key: "goal", label: "Primary analysis", cols: 1, options: [
      o("alpha", "Alpha diversity comparison"), o("beta", "Beta diversity / community composition (PERMANOVA)"),
      o("da", "Differential abundance of taxa"), o("biomarker", "Biomarker discovery / classification (machine learning)"),
    ] },
  ],
  experimental: [
    { key: "design", label: "Design and test", cols: 2, options: [
      o("two_group", "Two independent groups (t-test)"), o("paired", "Paired / before–after (paired t-test)"),
      o("anova", "Three or more groups (one-way ANOVA)"), o("survival", "Survival / time-to-death (log-rank, Cox)"),
    ] },
    { key: "k", label: "Number of groups", cols: 4, when: (a) => a.design === "anova", options: [o("3", "3"), o("4", "4"), o("5", "5"), o("6", "6")] },
    { key: "effect", label: "Expected effect size", cols: 2, optionsFn: (a) => (EXP_EFFECT[a.design] || EXP_EFFECT.two_group).opts },
  ],
  qualitative: [
    { key: "goal", label: "Analytical approach", cols: 1, options: [
      o("theme", "Identify a list of themes (theme / code saturation)"), o("meaning", "Richly describe themes (meaning saturation)"),
      o("grounded", "Build theory (grounded theory, theoretical saturation)"), o("metatheme", "Compare themes across sites or cultures (metathemes)"),
      o("freelist", "Free lists / cultural domain (saturation in salience)"), o("ethno", "Ethnography (observation + interviews)"),
      o("content", "Content analysis (classical or qualitative)"), o("reflexive", "Reflexive thematic analysis (Braun & Clarke)"),
    ] },
  ],
};

export function visibleSteps(a) {
  const steps = STEPS[a.type] || [];
  const out = [];
  for (const st of steps) {
    if (st.when && !st.when(a)) continue;
    out.push(st);
    if (a[st.key] == null) break; // stop at first unanswered
  }
  return out;
}
export function isComplete(a) {
  const steps = (STEPS[a.type] || []).filter((st) => !st.when || st.when(a));
  return !!a.type && steps.every((st) => a[st.key] != null);
}
export function optionsFor(step, a) { return step.optionsFn ? step.optionsFn(a) : step.options; }

// numeric assumption read from answers or default
const num = (a, key, def) => { const v = parseFloat(a[key]); return Number.isFinite(v) && v > 0 ? v : def; };

// ---------- Recommendations ----------
export function recommend(a) {
  if (!isComplete(a)) return null;
  return ({ rnaseq, gwas, popgen, microbiome, experimental, qualitative })[a.type](a);
}

function rnaseq(a) {
  const cvDef = a.org === "inbred" ? 0.1 : 0.4;
  const fcDef = { de_large: 2, de_moderate: 1.5, de_small: 1.25, exploratory: 2, scrnaseq: 2 }[a.goal];
  const fc = num(a, "fc", fcDef), cv = num(a, "cv", cvDef), depth = num(a, "depth", 20), alpha = num(a, "alpha_r", 0.01);
  const n80 = S.nHart(depth, cv, fc, 0.8, alpha), n90 = S.nHart(depth, cv, fc, 0.9, alpha);
  const params = [
    { key: "fc", label: "Fold change to detect", def: fcDef, step: 0.05, min: 1.05, max: 10 },
    { key: "cv", label: "Biological CV (BCV)", def: cvDef, step: 0.05, min: 0.01, max: 2, help: "√(dispersion) from DESeq2/edgeR on pilot data" },
    { key: "depth", label: "Read count of the gene", def: 20, step: 1, min: 1, max: 100000, help: "expected counts for a gene you care about; low-expressed genes need more replicates" },
    { key: "alpha_r", label: "Per-gene α", def: 0.01, step: 0.001, min: 0.000001, max: 0.1, help: "0.01–0.001 approximates transcriptome-wide FDR control" },
  ];
  const formulaLine = `Hart et al. (2013) formula at FC ${fc}, CV ${cv}, ${depth} reads/gene, α ${alpha}: ${n80} per group (80% power), ${n90} (90%).`;

  if (a.goal === "scrnaseq") {
    const f = num(a, "ctf", 0.02), k = num(a, "ctk", 50);
    const cells = S.nCellsForType(f, Math.round(k));
    return {
      title: "Single-cell RNA-seq — DE between conditions", evidence: "formula",
      summary: "Two separate numbers: biological samples per condition (the unit of inference) and cells captured per sample (enough cells of the rarest type you will test).",
      metrics: [
        { label: "Samples / condition", value: Math.max(3, n80), note: "80% power, pseudobulk" },
        { label: "Samples / condition", value: Math.max(3, n90), note: "90% power, pseudobulk" },
        { label: "Cells / sample", value: S.fmt(cells), note: `≥ ${Math.round(k)} cells of a type at ${(f * 100).toFixed(1)}% (95% prob.)` },
      ],
      params: [...params, { key: "ctf", label: "Frequency of rarest cell type tested", def: 0.02, step: 0.005, min: 0.001, max: 1 }, { key: "ctk", label: "Cells of that type needed per sample", def: 50, step: 5, min: 1, max: 5000 }],
      details: [
        "Differential expression between conditions should be run on pseudobulk counts (cells summed per sample per cell type); cells from one individual are not independent replicates (Squair et al. 2021).",
        "Because pseudobulk counts behave like bulk RNA-seq, the replicate number comes from the bulk formula: " + formulaLine,
        "A floor of 3 samples per condition is applied: fewer gives no usable dispersion estimate.",
        `Cells per sample: smallest number such that a cell type at frequency ${f} yields at least ${Math.round(k)} cells with 95% probability (Poisson approximation). Add a margin for cells lost in QC (often 10–30%).`,
        "For simulation-based power by cell type and expression level, use POWSC (Su et al. 2020) with pilot data.",
      ],
      power: "80% / 90%, per-gene α as set above",
      tools: "POWSC, scPower, RNASeqPower on pseudobulk, muscat / DESeq2 pseudobulk",
      refs: ["squair2021", "su2020powsc", "hart2013", "edgerGuide"],
    };
  }

  const floorMin = 3, floorRec = 6;
  const min = Math.max(floorMin, n80), rec = Math.max(floorRec, n90);
  const goalTxt = { de_large: "large fold-changes", de_moderate: "moderate fold-changes", de_small: "small fold-changes", exploratory: "exploratory / pilot" }[a.goal];
  return {
    title: `Bulk RNA-seq — ${goalTxt}`, evidence: "formula",
    summary: "Biological replicates per group. The number is the larger of a calculated value (Hart et al. 2013) and empirical floors from benchmark studies (3 = statistical minimum; 6 = Schurch et al. 2016 recommendation).",
    metrics: [
      { label: "Minimum", value: min, note: n80 >= floorMin ? "80% power (formula)" : "floor of 3 applies" },
      { label: "Recommended", value: rec, note: n90 >= floorRec ? "90% power (formula)" : "Schurch floor of 6 applies" },
      { label: "Plus 15% loss", value: S.withLoss(rec), note: "failed libraries, outliers" },
    ],
    params,
    details: [
      formulaLine,
      a.org === "outbred"
        ? "Outbred animals (e.g. striped catfish, bivalves) have much larger biological variation than the isogenic yeast in Schurch et al. (2016); their replicate numbers are a lower bound for you, not a target."
        : "Low-variability systems are close to the Schurch et al. (2016) setting: with 3 replicates only 20–40% of DE genes were found overall, rising to >85% for genes changing more than 4-fold.",
      "Schurch et al. (2016) recommend ≥ 6 replicates for every experiment and ≥ 12 when finding most DE genes matters; > 20 were needed to recover > 85% of DE genes regardless of fold change.",
      "Below 12 replicates, edgeR gave the best balance of true and false positives in that benchmark.",
      "Replicates raise power more than extra depth once depth is moderate (Liu et al. 2014; Lamarre et al. 2018). Lamarre et al. recommend ≥ 4 replicates and 20 M reads per sample for tomato.",
      a.goal === "exploratory" ? "Pilot runs are best used to estimate dispersion (BCV) for the main study; treat DE lists from n = 3 as hypotheses and validate (qPCR or independent samples)." : "Replace the default CV with the square root of the dispersion estimated from your own pilot or public data — it changes n more than any other input.",
    ],
    power: "80% (minimum) and 90% (recommended), per-gene α as set above",
    tools: "RNASeqPower (formula used here), RnaSeqSampleSize, PROPER (simulation)",
    refs: ["schurch2016", "hart2013", "edgerGuide", "lamarre2018", "liu2014", "zhao2018", "wu2015proper", ...(a.org === "outbred" ? ["todd2016"] : ["conesa2016"])],
  };
}

function gwas(a) {
  const alpha = parseFloat(a.alpha);
  const aTxt = { "5e-8": "5 × 10⁻⁸", "5e-7": "5 × 10⁻⁷", "1e-6": "1 × 10⁻⁶" }[a.alpha];
  if (a.trait === "cc") {
    const or = parseFloat(a.or), maf = parseFloat(a.maf);
    const n80 = S.nGwasCC(maf, or, 0.8, alpha), n90 = S.nGwasCC(maf, or, 0.9, alpha);
    return {
      title: `GWAS — case–control, OR ${or}, MAF ${maf}`, evidence: "formula",
      summary: "Number of cases, with an equal number of controls, to detect one causal SNP at the chosen genome-wide threshold.",
      metrics: [
        { label: "Cases (= controls)", value: S.fmt(n80), note: "80% power" },
        { label: "Cases (= controls)", value: S.fmt(n90), note: "90% power" },
        { label: "Total genotyped", value: S.fmt(2 * n90), note: "at 90% power" },
      ],
      details: [
        `Allelic (additive) test, 1:1 case:control, α = ${aTxt}, causal SNP genotyped directly. The risk-allele frequency in controls is taken as the MAF (appropriate when cases are a small fraction of the population).`,
        "Power falls if the causal variant is only tagged by a SNP in partial LD: the effective sample size is multiplied by r², so with r² = 0.8 you need about 1.25× these numbers (Spencer et al. 2009).",
        "For challenge-survival traits in aquaculture, a binary dead/alive phenotype loses information; analysing time-to-death or day of death as a quantitative trait usually gives more power.",
        "Aquaculture GWAS samples come from full-sib families. Relatedness reduces the effective number of independent individuals; analyse with a mixed model (GEMMA, GCTA-MLMA) and treat these numbers as lower bounds.",
        "The figures assume one SNP of the stated effect; a polygenic trait with many small effects needs far larger samples (Visscher et al. 2017).",
      ],
      power: `80% and 90% at α = ${aTxt}`,
      tools: "Genetic Power Calculator, QUANTO, genpwr (R), GCTA-GREML power calculator",
      refs: ["spencer2009", "sham2014", "hong2012", "visscher2017"],
    };
  }
  const q2 = parseFloat(a.q2);
  const n80 = S.nGwasQuant(q2, 0.8, alpha), n90 = S.nGwasQuant(q2, 0.9, alpha);
  return {
    title: `GWAS — quantitative trait, locus explains ${(q2 * 100).toFixed(1)}%`, evidence: "formula",
    summary: "Phenotyped and genotyped individuals needed to detect one locus explaining the chosen share of phenotypic variance.",
    metrics: [
      { label: "Individuals", value: S.fmt(n80), note: "80% power" },
      { label: "Individuals", value: S.fmt(n90), note: "90% power" },
      { label: "Plus 15% loss", value: S.fmt(S.withLoss(n90)), note: "genotyping failures, outliers" },
    ],
    details: [
      `Single-SNP regression test, unrelated individuals, α = ${aTxt}. Non-centrality = n·q²/(1−q²) (Sham & Purcell 2014), so n = (z₁₋α/₂ + z₁₋β)² (1−q²)/q².`,
      "Variance explained by a SNP is 2p(1−p)β² / Var(y); a 5% QTL is a major-effect locus. Most polygenic hits explain < 0.5%.",
      "If the causal variant is tagged by an array SNP with LD r², divide q² by r² in your thinking: n grows by about 1/r² (Spencer et al. 2009).",
      "Aquaculture breeding populations are family-structured: use a mixed model to control relatedness, and expect lower power than these unrelated-sample figures.",
      "Genomic selection (predicting breeding values) is a different goal: accuracy depends on training-population size, heritability and relatedness to selection candidates, not on single-SNP power.",
    ],
    power: `80% and 90% at α = ${aTxt}`,
    tools: "Genetic Power Calculator, GCTA-GREML power calculator, genpwr (R)",
    refs: ["sham2014", "spencer2009", "visscher2017", "hong2012"],
  };
}

function popgen(a) {
  const hi = a.marker === "rad" || a.marker === "wgs";
  const mName = { ssr: "SSR", snp_panel: "SNP panel", rad: "RAD-seq/GBS", wgs: "WGS/array" }[a.marker];
  const det5 = S.nAlleleDetect(0.05), det1 = S.nAlleleDetect(0.01);
  if (a.goal === "diversity") {
    const m = a.marker === "ssr" ? [15, "25–30", det5] : a.marker === "snp_panel" ? [15, 25, det5] : [8, "15–25", det5];
    return {
      title: `Genetic diversity & differentiation — ${mName}`, evidence: "empirical",
      summary: "Individuals per population for accurate allele frequencies, heterozygosity and pairwise Fst.",
      metrics: [
        { label: "Minimum", value: m[0], note: a.marker === "ssr" || a.marker === "snp_panel" ? "SaSii lower bound" : "Nazareno et al. 2017" },
        { label: "Recommended", value: m[1], note: a.marker === "ssr" ? "Hale et al. 2012" : "SaSii range" },
        { label: "Rare alleles", value: m[2], note: "detect a 5% allele (95% prob.)" },
      ],
      details: [
        a.marker === "ssr"
          ? "SSR: precision of allele frequency, He and Fst improved only minimally above 25–30 individuals per population (Hale et al. 2012); SaSii analyses of SSR datasets gave 15–30 (Scaketti et al. 2025)."
          : hi ? "With ≥ 1,000 SNPs, about 8 individuals per population estimated diversity and Fst accurately (Nazareno et al. 2017); simulations found 4–6 enough for Fst (Willing et al. 2012). SaSii analyses gave 5–25 for SNP data (Scaketti et al. 2025)."
            : "With fewer than ~1,000 SNPs the small-sample results of Nazareno et al. (2017) and Willing et al. (2012) do not apply; use the upper part of the SaSii SNP range (5–25).",
        `Calculated: to sample an allele at 5% frequency at least once with 95% probability you need ${det5} diploid individuals; at 1% frequency, ${det1}. Allelic richness and private-allele counts depend on this, so rarefy to a common sample size when comparing populations.`,
        "Before the main study, run SaSii on pilot genotypes from your own species to see where estimates stabilise.",
      ],
      power: "Estimation precision (not hypothesis testing) — check with resampling",
      tools: "SaSii (R), hierfstat, adegenet, GenAlEx, ADZE (rarefaction)",
      refs: ["hale2012", "nazareno2017", "willing2012", "scaketti2025"],
    };
  }
  if (a.goal === "structure") {
    const mk = num(a, "markers", { ssr: 15, snp_panel: 500, rad: 5000, wgs: 50000 }[a.marker]);
    const fst = num(a, "fst", 0.02);
    const nDet = Math.ceil(1 / (fst * fst * mk));
    const snp = a.marker !== "ssr";
    return {
      title: `Population structure — ${mName}`, evidence: "heuristic",
      summary: "Individuals per sampled population. Detectability of structure depends on the product of individuals and markers, and on how differentiated the populations are.",
      metrics: [
        { label: "Minimum / pop.", value: hi ? 10 : 25, note: hi ? "planning heuristic" : "Hale et al. 2012 basis" },
        { label: "Recommended / pop.", value: hi ? 20 : 30, note: "planning heuristic" },
        snp ? { label: "Detectability floor", value: S.fmt(nDet), note: `total individuals, Fst ${fst}, ${S.fmt(mk)} SNPs` } : { label: "Weak structure", value: 50, note: "planning heuristic" },
      ],
      params: snp ? [
        { key: "markers", label: "Number of SNPs (after LD pruning)", def: { snp_panel: 500, rad: 5000, wgs: 50000 }[a.marker], step: 100, min: 10, max: 10000000 },
        { key: "fst", label: "Smallest Fst you want to detect", def: 0.02, step: 0.005, min: 0.0005, max: 0.5 },
      ] : null,
      details: [
        snp ? `Calculated check (Patterson et al. 2006): structure between two equal populations is essentially undetectable when Fst < 1/√(individuals × markers). For Fst ${fst} with ${S.fmt(mk)} unlinked SNPs this threshold is crossed at ${S.fmt(nDet)} individuals in total. This is a floor: reliable inference needs comfortably more.` : "Patterson et al. (2006)'s detectability threshold is derived for biallelic markers and is not applied to SSRs here.",
        "The per-population numbers are planning heuristics, not results from a single benchmark: they combine the allele-frequency precision results above with the need to estimate admixture proportions per individual.",
        "Sample populations evenly: uneven sample sizes bias STRUCTURE's choice of K (Puechmaille 2016). Subsample to equal sizes if needed.",
        "Prune SNPs in strong LD before counting markers; linked SNPs do not add independent information.",
      ],
      power: "Detectability threshold (Patterson et al. 2006) + heuristic margins",
      tools: "smartPCA / EIGENSOFT, ADMIXTURE, DAPC (adegenet), STRUCTURE with subsampling",
      refs: ["patterson2006", "puechmaille2016", "hale2012", "nazareno2017"],
    };
  }
  if (a.goal === "parentage") {
    return {
      title: "Parentage / relatedness assignment", evidence: "heuristic",
      summary: "Assignment success depends on sampling every candidate parent and on marker informativeness, more than on a count of offspring.",
      unitNote: "Check by simulation with your own allele frequencies before genotyping.",
      metrics: [
        { label: "Candidate parents", value: "All", note: "unsampled parents cause errors" },
        { label: "Loci — SSR", value: "≈ 10–20", note: "highly polymorphic" },
        { label: "Loci — SNP", value: "≈ 100–500", note: "MAF > 0.2 preferred" },
      ],
      details: [
        "Genotype every candidate parent (all broodstock used in the cross). Likelihood methods can allow for unsampled parents, but accuracy drops (Jones et al. 2010).",
        "Marker counts above are typical ranges reported in the parentage literature, not guarantees: run a simulation (CERVUS, COLONY or Sequoia) with your allele frequencies, number of candidates and a realistic genotyping error rate.",
        "Prefer SNPs with high minor allele frequency; low-MAF SNPs carry little exclusion power.",
        "Offspring sample size per family is set by the downstream goal (e.g. estimating family contributions or heritability), not by the assignment itself.",
      ],
      power: "Simulated assignment rate at your target confidence (e.g. 95%)",
      tools: "Sequoia (R), COLONY, CERVUS, APIS",
      refs: ["jones2010", "huisman2017"],
    };
  }
  if (a.goal === "selection") {
    return {
      title: `Selection scans / GEA — ${mName}`, evidence: "heuristic",
      summary: "Individuals per population or environment. No single empirical benchmark exists; power depends on selection strength, demography and the number of populations.",
      metrics: [
        { label: "Minimum / pop.", value: 20, note: "planning heuristic" },
        { label: "Recommended / pop.", value: "30–50", note: "planning heuristic" },
        { label: "Populations", value: "≥ 6–10", note: "for GEA methods" },
      ],
      details: [
        "The false-positive rate and power of Fst outlier tests depend strongly on demographic history and sampling design (Lotterhos & Whitlock 2014); calibrate on neutral simulations of your own system.",
        "Genotype–environment association methods gain more from sampling many populations across the environmental gradient than from many individuals per population (Forester et al. 2016).",
        hi ? "Genome-wide markers are needed; scans with few hundred SNPs miss most selected regions." : "Selection scans need genome-wide markers (RAD-seq or WGS); SSR or small SNP panels are not suitable.",
        "For selected vs. wild aquaculture stocks, sample several hatchery lines and several wild populations so that drift in one line is not mistaken for selection.",
      ],
      power: "Simulate (SLiM, fastsimcoal2) under your demographic model",
      tools: "pcadapt, OutFLANK, BayPass, LFMM 2, RDA (vegan)",
      refs: ["lotterhos2014", "forester2016"],
    };
  }
  return {
    title: `Demographic history / Ne — ${mName}`, evidence: "heuristic",
    summary: "Individuals per population. Precision of Ne and demographic parameters depends on both sample size and number of loci.",
    metrics: [
      { label: "Minimum / pop.", value: hi ? 10 : 30, note: "planning heuristic" },
      { label: "Recommended / pop.", value: hi ? "20–30" : 50, note: "planning heuristic" },
      { label: "LD-based Ne", value: "≥ 50", note: "and ≥ 1/10 of true Ne if possible" },
    ],
    details: [
      "SFS-based inference (fastsimcoal2, dadi) works with modest samples per population when many unlinked SNPs are available (Excoffier et al. 2013).",
      "LD-based Ne: precision depends on sample size and number of loci; when the sample is small relative to true Ne the confidence interval often includes infinity (Waples & Do 2010). For large hatchery or wild populations, sample more individuals.",
      "For hatchery broodstock with small census size, genotype the whole broodstock if possible.",
      "The numbers here are heuristics; check identifiability of your model parameters by simulating data sets of your planned size.",
    ],
    power: "Confidence-interval width / parameter identifiability by simulation",
    tools: "NeEstimator v2, GONE, fastsimcoal2, dadi, DIYABC-RF",
    refs: ["excoffier2013", "waples2010"],
  };
}

function microbiome(a) {
  const base = {
    alpha: { t: "Alpha diversity", m: [10, 20, 30], refs: ["larosa2012", "kelly2015"], d: "Alpha-diversity indices are single numbers per sample, so standard two-group power (t-test / Wilcoxon) applies once you know their SD — for example, 20 per group detects d ≈ 0.9 at 80% power." },
    beta: { t: "Beta diversity / composition", m: [15, 25, 40], refs: ["kelly2015", "quince2017"], d: "PERMANOVA power depends on the effect size ω² and within-group dispersion of your distance matrix; simulate with micropower using pilot distances (Kelly et al. 2015)." },
    da: { t: "Differential abundance", m: [20, 30, 50], refs: ["nearing2022", "lin2020", "kelly2015"], d: "Hundreds of taxa are tested with multiple-testing correction, and methods disagree strongly on the same data (Nearing et al. 2022); use a compositionality-aware method (ANCOM-BC, ALDEx2) and report agreement between methods." },
    biomarker: { t: "Biomarker discovery / classification", m: [50, 100, 200], refs: ["topcuoglu2020", "wirbel2021"], d: "Classifier performance from small data sets is optimistic and unstable; use nested cross-validation, report variability across folds (Topçuoğlu et al. 2020) and validate on an independent cohort (Wirbel et al. 2021)." },
  }[a.goal];
  const per = a.goal === "biomarker" ? "total samples" : "per group";
  return {
    title: `Microbiome — ${base.t}`, evidence: "heuristic",
    summary: "No validated universal sample size exists for microbiome studies: required n depends on between-subject variability, which is large and system-specific. Use these as planning starting points, then calculate with pilot data.",
    metrics: [
      { label: "Minimum", value: base.m[0], note: per },
      { label: "Recommended", value: base.m[1], note: per },
      { label: "Well-powered", value: base.m[2], note: per },
    ],
    details: [
      base.d,
      a.goal === "alpha" ? `Calculated example: two-group t-test, 80% power, α 0.05 — d = 0.8 needs ${S.nTwoGroup(0.8, 0.8)} per group, d = 0.5 needs ${S.nTwoGroup(0.5, 0.8)}.` : null,
      "For aquaculture (fish gut, water, sediment), the tank or pond is usually the experimental unit; fish sampled from the same tank are not independent replicates (see Experimental biology).",
      "Include extraction blanks and a mock community; contamination matters most in low-biomass samples (Quince et al. 2017).",
      "Multiply the per-group number by the number of groups for the total.",
    ].filter(Boolean),
    power: "Calculate with pilot data (micropower, HMP) — the numbers above are not power results",
    tools: "micropower, HMP (R), ANCOM-BC2, ALDEx2, MaAsLin2, SIAMCAT, mikropml",
    refs: [...base.refs, "quince2017"],
  };
}

function experimental(a) {
  const unknown = a.effect === "unknown";
  const presetMed = { two_group: 0.5, paired: 0.5, anova: 0.25, survival: 0.67 }[a.design];
  const es = unknown ? presetMed : parseFloat(a.effect);
  const unitNote = "n counts experimental units — the tanks, cages, ponds or culture flasks independently assigned to a treatment — not the individuals measured inside them.";
  const common = [
    unknown ? `Effect size unknown: the conventional "medium" value is used (${EXP_EFFECT[a.design].sym} = ${presetMed}). Conventions are a last resort — base the effect size on the smallest biologically important difference or on pilot data.` : null,
    unitNote + " Treating fish within one tank as replicates is pseudoreplication and inflates false positives (Lazic 2010). With several fish per tank, analyse tank means or use a mixed model with tank as a random effect.",
  ];
  if (a.design === "two_group" || a.design === "paired") {
    const d = num(a, "es", es);
    const f = a.design === "paired" ? S.nPaired : S.nTwoGroup;
    const n80 = f(d, 0.8), n90 = f(d, 0.9);
    const lab = a.design === "paired" ? "pairs" : "per group";
    return {
      title: a.design === "paired" ? "Paired design (paired t-test)" : "Two independent groups (t-test)", evidence: "formula",
      summary: a.design === "paired"
        ? `Number of pairs (subjects measured twice) to detect dz = ${d} at α = 0.05, two-sided.`
        : `Experimental units per group to detect d = ${d} at α = 0.05, two-sided.`,
      metrics: [
        { label: "Minimum", value: n80, note: `${lab}, 80% power` },
        { label: "Recommended", value: n90, note: `${lab}, 90% power` },
        { label: "Plus 15% loss", value: S.withLoss(n90), note: "mortality, dropouts" },
      ],
      params: [{ key: "es", label: a.design === "paired" ? "Effect size dz" : "Effect size d", def: es, step: 0.05, min: 0.05, max: 5, help: a.design === "paired" ? "mean difference ÷ SD of the differences" : "difference in means ÷ pooled SD" }],
      details: [
        a.design === "paired"
          ? "dz is the mean within-subject difference divided by the SD of the differences — not the same as d. With a correlation r between repeated measures, dz = d / √(2(1 − r)), so high correlation makes paired designs far more efficient."
          : "Values agree with exact noncentral-t calculations (G*Power, statsmodels) for d = 0.2–0.8; formula: n = 2(z₁₋α/₂ + z₁₋β)²/d² + z₁₋α/₂²/4.",
        ...common,
        "Non-normal outcomes analysed with Wilcoxon / Mann–Whitney need about 15% more units than the t-test numbers.",
      ].filter(Boolean),
      power: "80% (minimum) and 90% (recommended), α = 0.05 two-sided",
      tools: "G*Power 3.1, pwr (R), statsmodels (Python)",
      refs: ["cohen1988", "faul2007", "lazic2010"],
    };
  }
  if (a.design === "anova") {
    const k = parseInt(a.k, 10);
    const key = String(es);
    const [n80, n90] = S.ANOVA_TABLE[key][k];
    return {
      title: `${k}-group one-way ANOVA`, evidence: "formula",
      summary: `Experimental units per group to detect Cohen's f = ${es} across ${k} groups (overall F-test, α = 0.05).`,
      metrics: [
        { label: "Minimum", value: n80, note: "per group, 80% power" },
        { label: "Recommended", value: n90, note: "per group, 90% power" },
        { label: "Total units", value: S.fmt(k * S.withLoss(n90)), note: "90% power + 15% loss" },
      ],
      details: [
        "Exact noncentral-F calculation (statsmodels FTestAnovaPower; identical to G*Power). Note that per-group n falls as k rises for the same f, because f describes the spread of all group means.",
        "f = SD of the group means ÷ within-group SD. For f you can also use f = √(η²/(1 − η²)).",
        "The numbers power the overall F-test only. If your question is a specific pairwise comparison after correction (Tukey, Bonferroni), size the study with the two-group calculation at the corrected α instead.",
        ...common,
      ].filter(Boolean),
      power: "80% and 90%, α = 0.05, overall F-test",
      tools: "G*Power 3.1, pwr::pwr.anova.test (R), statsmodels",
      refs: ["cohen1988", "faul2007", "lazic2010"],
    };
  }
  // survival
  const hr = es, pEv = num(a, "pev", 0.5);
  const e80 = S.eventsSchoenfeld(hr, 0.8), e90 = S.eventsSchoenfeld(hr, 0.9);
  const per = (e) => Math.ceil(e / pEv / 2);
  return {
    title: `Survival comparison (log-rank / Cox), HR = ${hr}`, evidence: "formula",
    summary: "Power in survival analysis is driven by the number of deaths (events), not the number of animals. Animals needed = events ÷ expected proportion that die during the trial.",
    metrics: [
      { label: "Events needed", value: e80, note: "total, 80% power" },
      { label: "Animals / group", value: S.fmt(per(e80)), note: `80% power, ${Math.round(pEv * 100)}% die` },
      { label: "Animals / group", value: S.fmt(per(e90)), note: `90% power (${e90} events)` },
    ],
    params: [{ key: "pev", label: "Expected overall mortality during the trial", def: 0.5, step: 0.05, min: 0.05, max: 1, help: "pooled across both groups, from pilot challenge or literature" }],
    details: [
      "Schoenfeld (1983) formula for 1:1 allocation: events D = 4(z₁₋α/₂ + z₁₋β)² / (ln HR)², α = 0.05 two-sided.",
      "In disease-challenge trials fish share tanks, so deaths are clustered. Replicate tanks per treatment (at least 3) and analyse with a mixed-effects Cox model (tank as random effect); the sample size above then needs inflating by the design effect 1 + (m − 1)·ICC, where m = fish per tank.",
      unknown ? `Effect size unknown: HR = ${presetMed} used as a moderate default. Use relative percent survival or pilot challenge data to set HR.` : null,
    ].filter(Boolean),
    power: "80% and 90%, α = 0.05 two-sided",
    tools: "powerSurvEpi (R), G*Power (Cox regression), PASS",
    refs: ["schoenfeld1983", "lazic2010", "faul2007"],
  };
}

function qualitative(a) {
  const R = {
    theme: { title: "Theme (code) saturation", evidence: "empirical", m: [["Interviews", 9, "minimum"], ["Interviews", "12–13", "mean across studies"], ["Focus groups", 4, "mean 5–6"]],
      details: ["Theme saturation = identifying a high share (~90%) of themes. Hennink & Kaiser (2022) found 9–17 interviews or 4–8 focus groups across empirical tests, for relatively homogeneous samples and narrow objectives.", "Guest et al. (2006): saturation occurred within the first 12 interviews; basic elements of metathemes were present by 6.", "Web-based interviews may need many more (estimates of 30–67; Squire et al. 2024).", "Theme lists suit codebook development or survey design; they rarely support a theoretical contribution on their own (Wutich et al. 2024).", "For cognitive-interview pretesting of surveys, Wutich et al. (2024) cite 55–75 interviews to detect most high-impact problems."],
      refs: ["wutich2024", "guest2006", "hennink2022", "hennink2017", "hennink2019", "squire2024"] },
    meaning: { title: "Meaning saturation", evidence: "empirical", m: [["Interviews", 24, ""], ["Focus groups", 8, ""], ["Interviews (range)", "16–24", "Hennink et al. 2017"]],
      details: ["Meaning saturation = understanding the full depth and variation of each theme, not only that it exists.", "Hennink et al. (2017): code saturation at 9 interviews, meaning saturation at 16–24. For focus groups, 4 groups reached code saturation and more were needed for meaning (Hennink et al. 2019); Wutich et al. (2024) give 8.", "Wutich et al. (2024) identify meaning saturation as the most useful saturation concept for descriptive thematic research."],
      refs: ["wutich2024", "hennink2017", "hennink2019", "hennink2022"] },
    grounded: { title: "Theoretical saturation (grounded theory)", evidence: "empirical", m: [["Interviews", 20, "typical lower bound"], ["Interviews", "20–30+", "meta-analyses"], ["A priori", "Not fixed", "iterative sampling"]],
      details: ["Theoretical saturation cannot be fixed in advance; sampling continues until no new properties of categories emerge (Glaser & Strauss 1967).", "Reviews of published grounded theory studies show 20–30+ interviews are typically sufficient to claim theoretical saturation (Mason 2010; Thomson 2011).", "Document theoretical sampling decisions; reviewers look for them."],
      refs: ["wutich2024", "thomson2011", "mason2010", "glaser1967"] },
    metatheme: { title: "Metatheme saturation (cross-site)", evidence: "empirical", m: [["Interviews / site", 20, "each metatheme seen once"], ["Interviews / site", "20–40", "recommended"], ["Interviews / site", 39, "each seen ≥ 3 times"]],
      details: ["Hagaman & Wutich (2017), four sites: all metathemes appeared within 20 interviews per site; reliable identification (≥ 3 occurrences per site) took up to 39.", "Heterogeneous samples saturated faster (~18) than homogeneous samples (35–39) — a result that still needs replication.", "Each site needs adequate sampling in its own right."],
      refs: ["wutich2024", "hagaman2017"] },
    freelist: { title: "Saturation in salience (free lists)", evidence: "empirical", m: [["Free lists", 10, "if exhaustively probed"], ["Salient items", "≈ 95%", "captured by 10 lists"], ["Probing", "Essential", "see note"]],
      details: ["About 10 exhaustive free lists produce 95% of salient items (Weller et al. 2018).", "Superficial interviewing with few probes reaches apparent saturation quickly while missing items — a false stopping point.", "Salience (Smith's S) identifies the items to carry into structured questions or surveys."],
      refs: ["wutich2024", "weller2018"] },
    ethno: { title: "Ethnography", evidence: "empirical", m: [["Data documents", 50, "≈ 80% of themes"], ["Data documents", 81, "≈ 90% of themes"], ["Structured interviews", "20–30", "cultural consensus"]],
      details: ["DiStefano & Yang (2024): 50 documents (33 observation field notes + 17 interview transcripts) identified 80% of themes; 81 (55 + 26) identified 90%.", "Cultural consensus analysis of structured questions: about 20–30 informants per topic (Weller 2007); not applicable to free lists, pile sorts or unstructured interviews.", "Time in the field and language ability affect what informants share on sensitive topics (Wutich et al. 2024)."],
      refs: ["wutich2024", "distefano2024", "weller2007"] },
    content: { title: "Content analysis", evidence: "formula", m: [["Classical", "Power analysis", "random sample or census"], ["Qualitative", "Information power", "judgement-based"], ["Cross-case", "≈ 2×", "e.g. men vs. women"]],
      details: ["Classical content analysis that generalises to a corpus needs a random sample or census, with size set by statistical power (Krippendorff 2013; Weller 2015 gives an accessible method).", "Qualitative content analysis: information power (Malterud et al. 2016) — larger samples for broader aims, less specific samples, no guiding theory, weaker data and cross-case analysis. It gives no formula for a number.", "Comparing two groups roughly doubles the sample needed for one (Wutich et al. 2024)."],
      refs: ["wutich2024", "krippendorff2013", "weller2015", "malterud2016"] },
    reflexive: { title: "Reflexive thematic analysis", evidence: "none", m: [["Empirical guidance", "None", ""], ["Approach", "Pragmatic range", "set by aims and resources"], ["Optional", "PRICE model", "Naeem et al. 2024"]],
      details: ["Braun & Clarke argue that saturation does not fit reflexive TA and that sample size should be justified pragmatically from research goals, time and resources.", "Naeem et al. (2024) propose the PRICE model as a step toward assessing saturation in thematic analysis.", "Wutich et al. (2024) note that this lack of guidance disadvantages researchers in grant review; justify your range explicitly (e.g. with information power)."],
      refs: ["wutich2024", "braun2021", "naeem2024", "malterud2016"] },
  }[a.goal];
  return {
    title: R.title, evidence: R.evidence,
    summary: "Guidance from Wutich, Beresford & Bernard (2024) and the primary studies it draws on.",
    metrics: R.m.map(([label, value, note]) => ({ label, value, note })),
    details: R.details,
    power: "Saturation or information power — not statistical power",
    tools: a.goal === "content" ? "G*Power (classical), information-power checklist" : "Saturation tables / code-emergence curves; Buckley (2022) 10-step protocol",
    refs: R.refs,
  };
}
