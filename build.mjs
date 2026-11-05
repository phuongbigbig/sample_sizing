// Build: bundles src/app.jsx (+ React) into one minified script and inlines it
// into src/template.html -> dist/index.html. Run: node build.mjs
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const out = await build({
  entryPoints: ["src/app.jsx"], bundle: true, minify: true, write: false, format: "iife",
  jsx: "automatic", target: ["es2019"], define: { "process.env.NODE_ENV": '"production"' }, legalComments: "none",
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = readFileSync("src/template.html", "utf8").replace("/*__BUNDLE__*/", () => js);
mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", html);
console.log(`dist/index.html  ${(html.length / 1024).toFixed(0)} KB`);
