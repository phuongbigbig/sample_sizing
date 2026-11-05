// Enumerate every answer path through the questionnaire via the app's own engine,
// load each as a URL hash, and check the rendered result.
import { chromium } from "playwright";
import { STEPS, optionsFor, STUDY_TYPES } from "../src/engine.js";
const url = "file://" + process.cwd() + "/dist/index.html";
function paths(type) {
  const out = [];
  const rec = (a, i) => {
    const steps = STEPS[type];
    if (i >= steps.length) { out.push(a); return; }
    const st = steps[i];
    if (st.when && !st.when(a)) return rec(a, i + 1);
    for (const o of optionsFor(st, a)) rec({ ...a, [st.key]: o.id }, i + 1);
  };
  rec({ type }, 0); return out;
}
const browser = await chromium.launch({ executablePath: process.env.CH });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); // offline-safe
let total = 0, bad = [];
for (const t of STUDY_TYPES) for (const a of paths(t.id)) {
  total++;
  await page.goto("about:blank"); await page.goto(url + "#" + new URLSearchParams(a).toString());
  const ok = await page.locator(".result h2").count();
  const txt = ok ? await page.locator(".result").innerText() : "";
  if (!ok || /NaN|undefined|Infinity|null/.test(txt)) bad.push({ a, ok, snippet: txt.slice(0, 200) });
}
console.log(`paths rendered: ${total}, problems: ${bad.length}`); bad.slice(0,10).forEach(b => console.log(JSON.stringify(b)));
// Real click path + downstream reset + param edit
await page.goto(url);
await page.getByRole("button", { name: /Experimental biology/ }).click();
await page.getByRole("button", { name: /Three or more groups/ }).click();
await page.getByRole("button", { name: /^4$/ }).click();
await page.getByRole("button", { name: /Medium \(f = 0.25\)/ }).click();
console.log("ANOVA k=4 f=.25 metric:", await page.locator(".m-value").first().innerText(), "(expect 45)");
await page.getByRole("button", { name: /Survival/ }).click(); // change design -> later steps must clear
console.log("after design change, result shown:", await page.locator(".result").count(), "(expect 0)");
await page.getByRole("button", { name: /Medium \(HR = 0.67\)/ }).click();
await page.locator('input[type=number]').fill("0.7");
console.log("survival events / per group @70%:", await page.locator(".m-value").allInnerTexts(), "(expect 196, 140, 188)");
console.log("hash:", new URL(page.url()).hash);
// hash-only navigation must update the result (pasted link / back button)
await page.evaluate(() => { location.hash = "type=rnaseq&goal=de_large&org=outbred"; }); await page.waitForTimeout(200);
console.log("RNA-seq FC2 outbred:", await page.locator(".m-value").allInnerTexts());
// screenshots
for (const [w, h, theme, name] of [[1280, 900, "light", "desk-light"], [1280, 900, "dark", "desk-dark"], [390, 844, "light", "mobile"]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(url + "#type=gwas&trait=cc&or=1.5&maf=0.3&alpha=5e-8");
  await page.evaluate(t => { localStorage.setItem("ssn-theme", t); }, theme); await page.reload();
  await page.screenshot({ path: `tests/${name}.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(name, "horizontal overflow:", overflow);
}
console.log("console errors/warnings (excluding blocked fonts):", errors.filter(e=>!/ERR_FAILED/.test(e)).length ? errors.filter(e=>!/ERR_FAILED/.test(e)) : "none");
await browser.close();
