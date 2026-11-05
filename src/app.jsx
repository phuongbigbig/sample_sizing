import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { STUDY_TYPES, ICONS, STEPS, visibleSteps, optionsFor, recommend, isComplete } from "./engine.js";
import { REFS, formatRef } from "./refs.js";

const EVIDENCE = {
  empirical: { label: "Empirical benchmark", cls: "ev-emp", help: "Numbers come from published empirical tests." },
  formula: { label: "Calculated", cls: "ev-calc", help: "Numbers are computed from a power formula with the stated assumptions." },
  heuristic: { label: "Planning heuristic", cls: "ev-heur", help: "No single benchmark exists; numbers are starting points to check with pilot data." },
  none: { label: "No benchmark", cls: "ev-none", help: "The literature gives no empirical sample size for this method." },
};

function Icon({ name, size = 18 }) {
  const p = {
    dna: <><path d="M4 1.5c0 3 8 4 8 6.5s-8 3.5-8 6.5" /><path d="M12 1.5c0 3-8 4-8 6.5s8 3.5 8 6.5" /><path d="M5 4.5h6M5 11.5h6" opacity=".45" /></>,
    search: <><circle cx="7" cy="7" r="4.8" /><path d="M10.6 10.6 14.5 14.5" /></>,
    globe: <><circle cx="8" cy="8" r="6.5" /><ellipse cx="8" cy="8" rx="2.8" ry="6.5" /><path d="M1.5 8h13" opacity=".5" /></>,
    bacteria: <><rect x="3" y="4.5" width="10" height="7" rx="3.5" /><circle cx="6.5" cy="8" r=".9" fill="currentColor" stroke="none" /><circle cx="9.5" cy="8" r=".9" fill="currentColor" stroke="none" /><path d="M13 8h2M1 8h2" /></>,
    flask: <><path d="M6 1.5v5L2 14h12L10 6.5v-5" strokeLinejoin="round" /><path d="M5 1.5h6M4 10.5h8" opacity=".5" /></>,
    clipboard: <><rect x="2.5" y="3" width="11" height="12" rx="1.5" /><rect x="5" y="1" width="6" height="3" rx="1" /><path d="M5 8h6M5 11h4" opacity=".5" /></>,
    book: <><path d="M1.5 2.5h4.5c1.1 0 2 .9 2 2v9c0-.8-.7-1.5-1.5-1.5h-5z" /><path d="M14.5 2.5H10c-1.1 0-2 .9-2 2v9c0-.8.7-1.5 1.5-1.5h5z" /></>,
    check: <path d="M3 8.5 6.5 12 13 4.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    sun: <><circle cx="8" cy="8" r="3" /><path d="M8 1v1.8M8 13.2V15M1 8h1.8M13.2 8H15M3 3l1.3 1.3M11.7 11.7 13 13M3 13l1.3-1.3M11.7 4.3 13 3" /></>,
    moon: <path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z" />,
    copy: <><rect x="5" y="5" width="9" height="9" rx="1.5" /><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" /></>,
    link: <><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2L7.6 4.2" /><path d="M9.5 6.5a3 3 0 0 0-4.2 0L3 8.8A3 3 0 0 0 7.2 13l1.2-1.2" /></>,
  }[name];
  return <svg className="ic" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">{p}</svg>;
}

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <g fill="none" stroke="var(--on-accent)" strokeWidth="2" strokeLinecap="round">
        <path d="M8 23V17M13 23V12M18 23V15M23 23V9" />
      </g>
      <circle cx="23" cy="9" r="2.2" fill="var(--on-accent)" />
    </svg>
  );
}

// ---------- URL state (shareable links) ----------
function readHash() {
  try { const h = decodeURIComponent(location.hash.slice(1)); if (!h) return {}; return Object.fromEntries(new URLSearchParams(h)); } catch { return {}; }
}
function writeHash(a) {
  const q = new URLSearchParams(Object.entries(a).filter(([, v]) => v != null && v !== ""));
  const s = q.toString();
  history.replaceState(null, "", s ? "#" + s : location.pathname + location.search);
}

// Drop anything in a pasted link that is not a valid answer, so old or edited
// links can never put the app into an impossible state.
function sanitize(h) {
  if (!STUDY_TYPES.some((t) => t.id === h.type)) return {};
  const out = { type: h.type };
  for (const st of STEPS[h.type]) {
    if (st.when && !st.when(out)) continue;
    const v = h[st.key];
    if (v == null || !optionsFor(st, out).some((o) => o.id === v)) break;
    out[st.key] = v;
  }
  for (const [k, v] of Object.entries(h)) {
    if (!(k in out) && !STEPS[h.type].some((s) => s.key === k) && k !== "type" && /^[a-z_]+$/.test(k) && Number.isFinite(parseFloat(v)) && parseFloat(v) > 0) out[k] = v;
  }
  return out;
}

function OptionButton({ opt, selected, onSelect, icon }) {
  return (
    <button type="button" className={"opt" + (selected ? " sel" : "")} aria-pressed={selected} onClick={onSelect}>
      <span className="opt-ic">{selected ? <Icon name="check" size={16} /> : icon ? <Icon name={icon} /> : <span className="dot" />}</span>
      <span className="opt-txt"><span className="opt-label">{opt.label}</span>{opt.hint && <span className="opt-hint">{opt.hint}</span>}</span>
    </button>
  );
}

function Step({ n, label, children }) {
  return (
    <fieldset className="step">
      <legend><span className="step-n">{n}</span>{label}</legend>
      {children}
    </fieldset>
  );
}

function Params({ params, a, set }) {
  if (!params || !params.length) return null;
  return (
    <div className="params">
      <div className="sub-h">Adjust assumptions</div>
      <div className="param-grid">
        {params.map((p) => (
          <label key={p.key} className="param">
            <span className="param-label">{p.label}</span>
            <input type="number" inputMode="decimal" step={p.step} min={p.min} max={p.max}
              value={a[p.key] ?? p.def}
              onChange={(e) => set(p.key, e.target.value)} />
            {p.help && <span className="param-help">{p.help}</span>}
          </label>
        ))}
      </div>
      <button type="button" className="link-btn" onClick={() => params.forEach((p) => set(p.key, null))}>Reset to defaults</button>
    </div>
  );
}

function RefCard({ r, i }) {
  const href = r.doi ? `https://doi.org/${r.doi}` : r.url;
  return (
    <li className="ref">
      <div className="ref-cite"><span className="ref-n">[{i}]</span>{r.cite}</div>
      <div className="ref-src"><em>{r.journal}</em>{r.year ? ` (${r.year})` : ""}{r.vol ? ` ${r.vol}` : ""}
        {href && <> · <a href={href} target="_blank" rel="noopener noreferrer">{r.doi ? "doi:" + r.doi : href.replace(/^https?:\/\//, "")}</a></>}
      </div>
      <div className="ref-note"><strong>What it supports: </strong>{r.note}</div>
    </li>
  );
}

function Result({ rec, a, set }) {
  const [copied, setCopied] = useState("");
  const refs = rec.refs.map((k) => REFS[k]).filter(Boolean);
  const ev = EVIDENCE[rec.evidence];
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
    setCopied(what); setTimeout(() => setCopied(""), 1800);
  };
  return (
    <section className="result" aria-live="polite">
      <div className="badges"><span className={"ev " + ev.cls} title={ev.help}>{ev.label}</span><span className="ev-help">{ev.help}</span></div>
      <h2>{rec.title}</h2>
      <p className="summary">{rec.summary}</p>
      <div className="metrics">
        {rec.metrics.map((m, i) => (
          <div className="metric" key={i}>
            <div className="m-label">{m.label}</div>
            <div className="m-value">{m.value}</div>
            {m.note && <div className="m-note">{m.note}</div>}
          </div>
        ))}
      </div>
      <Params params={rec.params} a={a} set={set} />
      <div className="sub-h">How the numbers were reached</div>
      <ul className="details">{rec.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
      <div className="info-grid">
        <div className="info"><div className="info-h">Power / criterion</div><div>{rec.power}</div></div>
        <div className="info"><div className="info-h">Tools to verify</div><div>{rec.tools}</div></div>
      </div>
      <details className="refs" open>
        <summary><Icon name="book" size={17} /> Sources ({refs.length})</summary>
        <ol>{refs.map((r, i) => <RefCard key={i} r={r} i={i + 1} />)}</ol>
      </details>
      <div className="actions">
        <button type="button" className="btn" onClick={() => copy(refs.map((r, i) => `[${i + 1}] ${formatRef(r)}`).join("\n"), "refs")}><Icon name="copy" size={16} />{copied === "refs" ? "Copied" : "Copy references"}</button>
        <button type="button" className="btn" onClick={() => copy(location.href, "link")}><Icon name="link" size={16} />{copied === "link" ? "Copied" : "Copy link to this result"}</button>
      </div>
    </section>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    try { const s = localStorage.getItem("ssn-theme"); if (s) return s; } catch {}
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("ssn-theme", theme); } catch {}
  }, [theme]);

  const [a, setA] = useState(() => sanitize(readHash()));
  useEffect(() => { writeHash(a); }, [a]);
  // Follow pasted links / back-forward navigation that only change the hash
  useEffect(() => {
    const on = () => setA(sanitize(readHash()));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // Setting a step clears all later steps of the same study type.
  const setStep = (key, val) => setA((prev) => {
    if (key === "type") return prev.type === val ? prev : { type: val };
    const steps = STEPS[prev.type] || [];
    const idx = steps.findIndex((s) => s.key === key);
    const next = { type: prev.type };
    steps.slice(0, idx).forEach((s) => { if (prev[s.key] != null) next[s.key] = prev[s.key]; });
    next[key] = val;
    return next;
  });
  const setParam = (key, val) => setA((prev) => { const n = { ...prev }; if (val == null || val === "") delete n[key]; else n[key] = val; return n; });

  const rec = useMemo(() => { try { return recommend(a); } catch (e) { console.error(e); return null; } }, [a]);
  const done = isComplete(a);
  const resRef = useRef(null);
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current && resRef.current) resRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    wasDone.current = done;
  }, [done]);

  const steps = a.type ? visibleSteps(a) : [];

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand"><Logo /><div><h1>Sample Size Navigator</h1><div className="tag">for biology, genetics and genomics</div></div></div>
        <button type="button" className="theme-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title="Toggle theme">
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
      </header>
      <p className="intro">Answer a few questions to get a sample size with the calculation or evidence behind it. Each result says whether the number is <b>calculated</b> from a power formula, taken from an <b>empirical benchmark</b>, or only a <b>planning heuristic</b>.</p>

      <Step n={1} label="Study type">
        <div className="grid cols-2">
          {STUDY_TYPES.map((t) => <OptionButton key={t.id} opt={t} icon={ICONS[t.id]} selected={a.type === t.id} onSelect={() => setStep("type", t.id)} />)}
        </div>
      </Step>

      {steps.map((st, i) => (
        <Step key={a.type + st.key} n={i + 2} label={st.label}>
          <div className={"grid cols-" + st.cols}>
            {optionsFor(st, a).map((opt) => <OptionButton key={opt.id} opt={opt} selected={a[st.key] === opt.id} onSelect={() => setStep(st.key, opt.id)} />)}
          </div>
        </Step>
      ))}

      <div ref={resRef}>{done && rec && <Result rec={rec} a={a} set={setParam} />}</div>

      {done && (
        <>
          <div className="caveat"><strong>Before you use these numbers.</strong> They are design-stage estimates under the stated assumptions. Run a formal power analysis with your own pilot data where possible, state the assumptions in your methods or proposal, and consult a statistician for clustered, longitudinal or multi-factor designs.</div>
          <button type="button" className="btn ghost wide" onClick={() => setA({})}>Start over</button>
        </>
      )}

      <footer>
        Qualitative guidance follows Wutich, Beresford &amp; Bernard (2024, <em>Int J Qual Methods</em>); quantitative guidance follows the cited power formulas and benchmark studies. Not a substitute for a statistician.
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
