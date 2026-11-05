# Sample Size Navigator

Single-file web app (`index.html`) giving sample-size guidance for RNA-seq, GWAS,
population genetics, microbiome, experimental biology and qualitative research.
Every result is labelled **Calculated**, **Empirical benchmark**, **Planning heuristic**
or **No benchmark**, and lists its sources with DOIs.

## Deploy (GitHub Pages)
Upload `index.html` to the repository root → Settings → Pages → Deploy from branch `main` / root.
React is bundled inside the file; the only external request is the Inter web font
(the page falls back to system fonts offline).

## Edit and rebuild
    npm install
    node build.mjs            # writes dist/index.html
    node tests/check.mjs      # formula checks against statsmodels / RNASeqPower values

- `src/stats.js`   power formulas
- `src/engine.js`  questions and recommendation logic
- `src/refs.js`    reference database (verified citations and what each supports)
- `src/app.jsx`    interface; `src/template.html` styles and page shell

Results are shareable: the answers are stored in the URL after `#`.
