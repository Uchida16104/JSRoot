import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_SCRIPT = path.join(ROOT, 'src', 'script.js');
const DIST_DIR = path.resolve(ROOT, 'dist');
const OUTPUT_SCRIPT = path.join(DIST_DIR, 'script.js');
const OUTPUT_HTML = path.join(DIST_DIR, 'index.html');

function assertInsideRoot(targetPath, rootPath) {
  const relative = path.relative(rootPath, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside the project root: ${targetPath}`);
  }
}

assertInsideRoot(DIST_DIR, ROOT);

let scriptSource;
try {
  scriptSource = readFileSync(SOURCE_SCRIPT, 'utf8');
} catch (error) {
  throw new Error(`Cannot read required source file ${path.relative(ROOT, SOURCE_SCRIPT)}: ${error.message}`);
}

if (!scriptSource.trim()) {
  throw new Error('The browser entry point src/script.js must not be empty.');
}

rmSync(DIST_DIR, { recursive: true, force: true });
mkdirSync(DIST_DIR, { recursive: true });
copyFileSync(SOURCE_SCRIPT, OUTPUT_SCRIPT);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <meta name="theme-color" content="#111827">
  <meta name="description" content="JSRoot: a JavaScript and GitHub Pages UI toolkit lab.">
  <title>JSRoot — JavaScript UI Lab</title>
  <style>
    :root{color-scheme:dark;--bg:#0b1020;--surface:#121a2d;--surface-2:#18233a;--line:#2a3650;--text:#edf2ff;--muted:#9aa8c3;--accent:#7c9cff;--accent-2:#59e1c0;--danger:#ff8f9a;--radius:18px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(ellipse at top left,#17264a 0,transparent 38%),var(--bg);color:var(--text);line-height:1.55}button,input,textarea,select{font:inherit}button{cursor:pointer}a{color:#a9bbff}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid var(--accent-2);outline-offset:3px}.skip-link{position:absolute;left:-999px;top:0}.skip-link:focus{left:1rem;top:1rem;z-index:20;background:#fff;color:#111;padding:.7rem;border-radius:8px}
    .shell{width:min(1180px,calc(100% - 32px));margin:0 auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 0;border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none;font-weight:800;letter-spacing:-.04em;font-size:1.2rem}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:13px;background:linear-gradient(145deg,#7c9cff,#59e1c0);color:#08111f;font-weight:900}.top-actions{display:flex;gap:10px;flex-wrap:wrap}.button{border:1px solid var(--line);border-radius:10px;background:var(--surface-2);color:var(--text);padding:9px 13px;transition:transform .18s ease,border-color .18s ease,background .18s ease}.button:hover{border-color:#7088c4;transform:translateY(-1px)}.button.primary{background:var(--accent);color:#071126;border-color:transparent;font-weight:750}.button.subtle{background:transparent}.button.danger{color:var(--danger)}
    .hero{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(230px,.7fr);gap:24px;align-items:center;padding:46px 0 30px}.eyebrow{color:var(--accent-2);font-size:.78rem;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.hero h1{font-size:clamp(2.4rem,6vw,4.6rem);line-height:1.02;letter-spacing:-.065em;margin:.45rem 0 1rem;max-width:760px}.gradient-text{background:linear-gradient(100deg,#a9bcff,#68e7ce);-webkit-background-clip:text;background-clip:text;color:transparent}.hero p{max-width:700px;color:var(--muted);font-size:1.05rem}.hero-panel{padding:24px;border:1px solid var(--line);border-radius:var(--radius);background:linear-gradient(150deg,rgba(28,41,68,.95),rgba(16,24,42,.92));box-shadow:0 25px 70px #0003}.hero-panel .metric{font-size:2.5rem;font-weight:850;letter-spacing:-.06em}.hero-panel p{margin:0;color:var(--muted);font-size:.93rem}.pill-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.pill{border:1px solid #35476b;background:#18243c;color:#c9d5ff;border-radius:999px;padding:5px 10px;font-size:.76rem}
    .section-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:28px 0 14px}.section-head h2{font-size:1.35rem;letter-spacing:-.025em;margin:0}.section-head p{margin:4px 0 0;color:var(--muted);font-size:.9rem}.grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}.card{grid-column:span 6;min-width:0;border:1px solid var(--line);border-radius:var(--radius);background:linear-gradient(155deg,rgba(20,29,49,.98),rgba(15,23,40,.98));padding:22px;box-shadow:0 18px 45px #0002}.card.full{grid-column:1/-1}.card.third{grid-column:span 4}.card-title{display:flex;align-items:center;gap:10px;margin:0 0 6px;font-size:1.05rem}.icon-tile{display:grid;place-items:center;flex:none;width:34px;height:34px;border:1px solid #35466a;background:#1b2947;border-radius:11px;color:var(--accent-2);font-weight:800}.card-desc{margin:0 0 18px;color:var(--muted);font-size:.9rem}.field-label{display:block;color:#cad5ed;font-size:.85rem;font-weight:700;margin-bottom:7px}.field,select.field,textarea.field{width:100%;min-width:0;background:#0c1426;color:var(--text);border:1px solid #34425e;border-radius:10px;padding:11px 12px}.field::placeholder{color:#70809e}.field-row{display:flex;gap:9px}.field-row>.field{flex:1}.button-row{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}.muted{color:var(--muted)}.small{font-size:.8rem}.status{min-height:1.4em;margin:10px 0 0;color:var(--muted);font-size:.82rem}.status[data-kind="success"]{color:var(--accent-2)}.status[data-kind="error"]{color:var(--danger)}.preview-frame{display:block;width:100%;height:270px;border:1px solid #35425b;border-radius:13px;background:#fff;margin-top:14px}.preview-note{margin:.6rem 0 0;color:var(--muted);font-size:.8rem}
    .task-list{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:8px}.task-item{display:flex;align-items:center;gap:10px;border:1px solid #2c3954;background:#0d1629;padding:10px 11px;border-radius:11px}.task-item input[type=checkbox]{width:18px;height:18px;accent-color:var(--accent-2);flex:none}.task-text{flex:1;overflow-wrap:anywhere}.task-item.done .task-text{text-decoration:line-through;color:#75839f}.task-remove{border:0;background:transparent;color:#9daac2;padding:4px 6px;border-radius:6px}.task-remove:hover{color:var(--danger);background:#2c1d2c}.empty-state{border:1px dashed #34425e;border-radius:11px;padding:18px;text-align:center;color:var(--muted);margin-top:15px}.code-output{white-space:pre-wrap;overflow-wrap:anywhere;max-height:220px;overflow:auto;margin:14px 0 0;padding:14px;border:1px solid #2a3854;border-radius:11px;background:#080d18;color:#c8d5f3;font: .82rem/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}.subhead{font-size:.88rem;font-weight:800;margin:18px 0 7px}.footer{border-top:1px solid var(--line);margin-top:40px;padding:24px 0 38px;color:var(--muted);font-size:.82rem;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:780px){.hero{grid-template-columns:1fr;padding-top:34px}.grid{grid-template-columns:1fr}.card,.card.third{grid-column:1/-1}.hero-panel{max-width:none}.topbar{align-items:flex-start}.section-head{align-items:flex-start;flex-direction:column}}@media(max-width:480px){.shell{width:min(100% - 22px,1180px)}.card{padding:17px}.hero h1{font-size:2.65rem}.field-row{flex-direction:column}.topbar{flex-direction:column}.top-actions{width:100%}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="shell topbar">
    <a class="brand" href="./" aria-label="JSRoot home"><span class="brand-mark" aria-hidden="true">JS</span><span>JSRoot <span class="muted">/ UI Lab</span></span></a>
    <nav class="top-actions" aria-label="Quick links"><a class="button subtle" href="#toolkit-lab">Toolkit lab</a><a class="button subtle" href="#browser-tools">Browser tools</a><a class="button primary" href="#tasks">Try the app ↘</a></nav>
  </header>
  <main id="main" class="shell">
    <section class="hero" aria-labelledby="hero-title">
      <div>
        <div class="eyebrow">Static-first · GitHub Pages · JavaScript</div>
        <h1 id="hero-title">One root.<br><span class="gradient-text">Many ways to build.</span></h1>
        <p>Explore front-end toolkits, run browser-side experiments, and keep a small task list without a backend. Optional libraries load only when selected, and the core interface remains usable when a CDN is unavailable.</p>
        <div class="pill-row" aria-label="Project properties"><span class="pill">No install step</span><span class="pill">Sandboxed previews</span><span class="pill">Local-first tasks</span><span class="pill">GitHub Actions</span></div>
      </div>
      <aside class="hero-panel" aria-label="Project summary"><div class="eyebrow">Workspace status</div><div class="metric" id="task-count">0 <span class="muted">/ 0</span></div><p>tasks complete</p><div class="pill-row"><span class="pill" id="storage-badge">Storage: checking</span><span class="pill" id="runtime-badge">Runtime: ready</span></div></aside>
    </section>

    <div class="section-head"><div><h2>01 / Toolkit lab</h2><p>Preview one framework at a time in an isolated frame.</p></div></div>
    <section id="toolkit-lab" class="grid" aria-label="Toolkit preview">
      <article class="card full">
        <h3 class="card-title"><span class="icon-tile" aria-hidden="true">UI</span>Framework & behavior preview</h3>
        <p class="card-desc">Pick a toolkit to load its CDN in the preview sandbox. The parent application does not combine all framework stylesheets, which avoids most global CSS collisions.</p>
        <label class="field-label" for="toolkit-select">Choose a library</label>
        <div class="field-row"><select class="field" id="toolkit-select"><option value="native">Native HTML / CSS</option><option value="easemotion">EaseMotion CSS</option><option value="tailwind">Tailwind CSS</option><option value="bootstrap">Bootstrap</option><option value="htmx">HTMX</option><option value="alpine">Alpine.js</option><option value="hyperscript">_hyperscript</option><option value="motion">Motion</option><option value="daisyui">daisyUI + Tailwind</option><option value="bulma">Bulma</option><option value="foundation">Foundation</option><option value="materialize">Materialize</option><option value="uikit">UIkit</option><option value="semantic">Semantic UI</option><option value="pico">Pico CSS</option></select><button class="button primary" id="reload-preview" type="button">Load preview</button></div>
        <p class="status" id="preview-status" role="status" aria-live="polite">Native preview is ready.</p>
        <iframe id="toolkit-frame" class="preview-frame" title="Selected UI toolkit preview" sandbox="allow-scripts allow-forms" loading="lazy" referrerpolicy="no-referrer"></iframe>
        <p class="preview-note">Preview content is illustrative. Most CSS frameworks are loaded as stylesheets; behavior libraries are included in the frame that demonstrates them.</p>
      </article>
    </section>

    <div class="section-head"><div><h2>02 / Browser tools</h2><p>Optional libraries run in the browser. No application server is required.</p></div></div>
    <section id="browser-tools" class="grid" aria-label="Browser tools">
      <article class="card">
        <h3 class="card-title"><span class="icon-tile" aria-hidden="true">SQL</span>SQLite in the browser</h3>
        <p class="card-desc">Load sql.js on demand and query a tiny in-memory table. The database is intentionally temporary; the task list below uses LocalStorage instead.</p>
        <label class="field-label" for="sql-query">SQL query</label>
        <textarea class="field" id="sql-query" rows="3" spellcheck="false">SELECT 'JSRoot' AS project, 2026 AS year;</textarea>
        <div class="button-row"><button class="button primary" id="run-sql" type="button">Run SQL demo</button><button class="button" id="reset-sql" type="button">Reset query</button></div>
        <p class="status" id="sql-status" role="status" aria-live="polite">sql.js has not been loaded yet.</p>
        <pre class="code-output" id="sql-output" aria-label="SQL result">Results will appear here.</pre>
      </article>
      <article class="card">
        <h3 class="card-title"><span class="icon-tile" aria-hidden="true">PHP</span>PHP-style helper</h3>
        <p class="card-desc">Try a PHP-like <code>sprintf</code> helper. JSRoot attempts to load php.js as an optional module; a small built-in fallback keeps the example usable if the package cannot be loaded.</p>
        <label class="field-label" for="format-name">Name</label><input class="field" id="format-name" value="developer" maxlength="80" autocomplete="off">
        <label class="field-label" for="format-count" style="margin-top:12px">Completed builds</label><input class="field" id="format-count" type="number" min="0" max="999999" value="4">
        <div class="button-row"><button class="button primary" id="run-php" type="button">Format message</button></div>
        <p class="status" id="php-status" role="status" aria-live="polite">Using the local fallback until php.js is available.</p>
        <pre class="code-output" id="php-output">Hello, developer! You have 4 completed builds.</pre>
      </article>
      <article class="card">
        <h3 class="card-title"><span class="icon-tile" aria-hidden="true">↗</span>Motion</h3>
        <p class="card-desc">Load Motion from a pinned CDN module when requested. A CSS animation fallback is used if the module cannot be imported or reduced motion is preferred.</p>
        <div style="padding:18px;border:1px solid #2a3955;border-radius:13px;background:#0c1426;display:grid;place-items:center;min-height:110px"><div id="motion-target" style="width:54px;height:54px;display:grid;place-items:center;border-radius:16px;background:linear-gradient(145deg,#7c9cff,#59e1c0);color:#08111f;font-weight:900">JS</div></div>
        <div class="button-row"><button class="button primary" id="run-motion" type="button">Animate tile</button></div>
        <p class="status" id="motion-status" role="status" aria-live="polite">Animation is ready.</p>
      </article>
      <article class="card">
        <h3 class="card-title"><span class="icon-tile" aria-hidden="true">JS</span>Runtime health</h3>
        <p class="card-desc">Optional dependency failures are reported here. Core task and preview controls do not depend on successful SQL, php.js, or Motion loading.</p>
        <pre class="code-output" id="runtime-log" role="log" aria-live="polite">JSRoot runtime initialized.</pre>
        <div class="button-row"><button class="button" id="clear-log" type="button">Clear log</button><button class="button" id="check-runtime" type="button">Check runtime</button></div>
      </article>
    </section>

    <div class="section-head"><div><h2>03 / Local task board</h2><p>Tasks are stored on this device when browser storage is available.</p></div></div>
    <section id="tasks" class="grid" aria-label="Task board">
      <article class="card full">
        <h3 class="card-title"><span class="icon-tile" aria-hidden="true">✓</span>Quick tasks</h3>
        <p class="card-desc">Add tasks, mark them complete, or remove them. No account or server-side database is used.</p>
        <form id="task-form">
          <label class="field-label" for="task-input">New task</label>
          <div class="field-row"><input class="field" id="task-input" name="task" placeholder="e.g. Review the deployment workflow" maxlength="180" autocomplete="off" required><button class="button primary" type="submit">Add task</button></div>
        </form>
        <p class="status" id="task-status" role="status" aria-live="polite">Your task list is ready.</p>
        <ul class="task-list" id="task-list" aria-label="Saved tasks"></ul>
        <div id="task-empty" class="empty-state">No tasks yet. Add one above to get started.</div>
        <div class="button-row"><button class="button" id="clear-completed" type="button">Clear completed</button><button class="button danger" id="clear-tasks" type="button">Delete all tasks</button></div>
      </article>
    </section>
  </main>
  <footer class="shell footer"><span>JSRoot · Static JavaScript workspace</span><span>Built with Node.js built-ins and GitHub Actions · Optional CDN integrations</span></footer>
  <script type="module" src="./script.js"></script>
</body>
</html>
`;

writeFileSync(OUTPUT_HTML, html, 'utf8');
console.log(`Built JSRoot successfully: ${path.relative(ROOT, OUTPUT_HTML)} and ${path.relative(ROOT, OUTPUT_SCRIPT)}`);
