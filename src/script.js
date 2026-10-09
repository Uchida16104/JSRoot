const STORAGE_KEY = 'jsroot.tasks.v1';
const byId = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const runtimeEvents = [];
let tasks = [];
let storageAvailable = false;
let sqlDatabasePromise = null;
let phpModulePromise = null;
let motionModulePromise = null;

function setStatus(id, message, kind = 'info') {
  const element = byId(id);
  if (!element) return;
  element.textContent = message;
  element.dataset.kind = kind;
}

function logRuntime(message, kind = 'info') {
  const time = new Date().toLocaleTimeString();
  runtimeEvents.unshift(`[${time}] ${kind.toUpperCase()}: ${message}`);
  if (runtimeEvents.length > 12) runtimeEvents.length = 12;
  const output = byId('runtime-log');
  if (output) output.textContent = runtimeEvents.join('\n');
  const badge = byId('runtime-badge');
  if (badge) badge.textContent = kind === 'error' ? 'Runtime: warnings' : 'Runtime: ready';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function safeStorage() {
  try {
    const key = `${STORAGE_KEY}.probe`;
    window.localStorage.setItem(key, 'ok');
    window.localStorage.removeItem(key);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  const badge = byId('storage-badge');
  if (badge) badge.textContent = storageAvailable ? 'Storage: local' : 'Storage: memory';
}

function saveTasks() {
  if (!storageAvailable) {
    setStatus('task-status', 'Browser storage is unavailable; tasks will remain until this page is closed.', 'error');
    return false;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    setStatus('task-status', 'Tasks saved on this device.', 'success');
    return true;
  } catch (error) {
    storageAvailable = false;
    const badge = byId('storage-badge');
    if (badge) badge.textContent = 'Storage: memory';
    setStatus('task-status', 'Could not save to browser storage. Tasks remain available for this session.', 'error');
    logRuntime(`LocalStorage write failed: ${error.message}`, 'error');
    return false;
  }
}

function loadTasks() {
  if (!storageAvailable) return;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new TypeError('Stored task data is not an array.');
    tasks = parsed.filter((task) => task && typeof task.id === 'string' && typeof task.text === 'string')
      .map((task) => ({ id: task.id, text: task.text.slice(0, 180), done: Boolean(task.done) }));
  } catch (error) {
    tasks = [];
    setStatus('task-status', 'Saved data could not be read; a fresh list has been started.', 'error');
    logRuntime(`LocalStorage read failed: ${error.message}`, 'error');
  }
}

function renderTasks() {
  const list = byId('task-list');
  const empty = byId('task-empty');
  if (!list || !empty) return;
  list.replaceChildren();
  empty.hidden = tasks.length > 0;

  for (const task of tasks) {
    const item = document.createElement('li');
    item.className = `task-item${task.done ? ' done' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', `Mark ${task.text} as ${task.done ? 'incomplete' : 'complete'}`);
    checkbox.addEventListener('change', () => {
      tasks = tasks.map((entry) => entry.id === task.id ? { ...entry, done: checkbox.checked } : entry);
      saveTasks();
      renderTasks();
    });

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'task-remove';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${task.text}`);
    remove.addEventListener('click', () => {
      tasks = tasks.filter((entry) => entry.id !== task.id);
      saveTasks();
      renderTasks();
    });

    item.append(checkbox, text, remove);
    list.append(item);
  }

  const completed = tasks.filter((task) => task.done).length;
  const counter = byId('task-count');
  if (counter) {
    counter.replaceChildren();
    const countText = document.createTextNode(String(completed));
    const total = document.createElement('span');
    total.className = 'muted';
    total.textContent = ` / ${tasks.length}`;
    counter.append(countText, total);
  }
}

function addTask(text) {
  const cleaned = String(text).trim().slice(0, 180);
  if (!cleaned) {
    setStatus('task-status', 'Enter a task before adding it.', 'error');
    return;
  }
  tasks.unshift({ id: makeId(), text: cleaned, done: false });
  saveTasks();
  renderTasks();
}

function makeId() {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadScript(url, { module = false } = {}) {
  if (module) return import(/* @vite-ignore */ url);
  return new Promise((resolve, reject) => {
    const selector = `script[data-jsroot-src="${CSS.escape(url)}"]`;
    const existing = document.querySelector(selector);
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${url}`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.jsrootSrc = url;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error(`Failed to load ${url}`));
    }, { once: true });
    document.head.append(script);
  });
}

const frameworkCatalog = {
  native: {
    label: 'Native HTML / CSS',
    summary: 'No external CSS framework is loaded. The page remains usable on its own.',
    markup: '<main class="demo"><span class="eyebrow">NATIVE HTML</span><h1>Simple by default.</h1><p>A clean base, semantic controls, and no framework dependency.</p><button id="demo-action" type="button">Try the button</button><p id="demo-status" aria-live="polite">Waiting for interaction.</p></main>',
    css: 'body{font:16px system-ui;color:#172033;background:#f4f6fb;margin:0;padding:24px}.demo{max-width:520px;margin:0 auto;padding:24px;border:1px solid #dde3ef;border-radius:18px;background:#fff}.eyebrow{font-size:12px;letter-spacing:.13em;color:#4264bf;font-weight:800}h1{font-size:30px;line-height:1.1;margin:12px 0}p{color:#56627a}button{border:0;background:#314fb5;color:white;padding:10px 14px;border-radius:9px;font-weight:700}',
    scripts: '',
    behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{document.getElementById('demo-status').textContent='Native click handler ran.'})"
  },
  easemotion: {
    label: 'EaseMotion CSS', summary: 'Animation-first utility classes loaded from jsDelivr.',
    cssLinks: ['https://cdn.jsdelivr.net/npm/easemotion-css/easemotion.min.css'],
    markup: '<main class="demo ease-fade-in ease-slide-up"><span class="label">EASEMOTION CSS</span><h1 class="ease-slide-up">Bring the interface to life.</h1><p>Use human-readable animation and layout utilities.</p><button class="ease-btn ease-btn-primary" id="demo-action" type="button">Replay entrance</button><p id="demo-status" aria-live="polite">EaseMotion CSS preview.</p></main>',
    css: 'body{font-family:system-ui;background:#f1f4fb;color:#1a2540;padding:24px;margin:0}.demo{max-width:520px;margin:auto;padding:28px;background:#fff;border:1px solid #dce2ef;border-radius:20px}.label{font-size:12px;font-weight:bold;letter-spacing:.12em;color:#4a65c2}h1{font-size:28px}p{color:#59657d}button{padding:10px 14px;border-radius:9px;border:0;background:#324fb5;color:white}',
    scripts: '', behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{document.getElementById('demo-status').textContent='Replay requested. Reload the preview to replay library animations.'})"
  },
  tailwind: {
    label: 'Tailwind CSS', summary: 'Tailwind browser CDN is useful for quick prototypes.',
    scripts: '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>',
    markup: '<main class="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-7 shadow-xl"><span class="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">Tailwind CSS</span><h1 class="mt-3 text-3xl font-black tracking-tight text-slate-900">Compose with utilities.</h1><p class="mt-3 text-slate-600">Rapid layout experiments, directly in the browser.</p><button id="demo-action" class="mt-5 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white">Try interaction</button><p id="demo-status" class="mt-3 text-sm text-slate-500" aria-live="polite">Ready to interact.</p></main>',
    behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{document.getElementById('demo-status').textContent='Tailwind preview button clicked.'})"
  },
  bootstrap: {
    label: 'Bootstrap', summary: 'Bootstrap 5 provides responsive components and layout utilities.',
    cssLinks: ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css'],
    scripts: '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>',
    markup: '<main class="container py-4"><div class="card shadow-sm"><div class="card-body"><span class="badge text-bg-primary">BOOTSTRAP</span><h1 class="h3 mt-3">Build responsive UIs.</h1><p class="text-secondary">A familiar component system for practical interfaces.</p><button class="btn btn-primary" id="demo-action" type="button">Run demo</button><p id="demo-status" class="small text-secondary mt-3 mb-0" aria-live="polite">Ready to interact.</p></div></div></main>',
    behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{document.getElementById('demo-status').textContent='Bootstrap preview button clicked.'})"
  },
  htmx: {
    label: 'HTMX', summary: 'HTMX can extend HTML with AJAX and event-driven behavior; a server endpoint is needed for network swaps.',
    scripts: '<script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.4"></script>',
    markup: '<main class="demo"><span class="eyebrow">HTMX</span><h1>HTML-driven interaction.</h1><p>This static demo uses a local event to avoid requesting a non-existent server endpoint.</p><button id="demo-action" type="button" hx-on:click="document.getElementById(&quot;demo-status&quot;).textContent = &quot;HTMX event attribute received the click.&quot;">Fire local event</button><p id="demo-status" aria-live="polite">Ready. No server endpoint is configured.</p></main>',
    css: 'body{font:16px system-ui;color:#172033;background:#f5f7fb;padding:24px;margin:0}.demo{max-width:520px;margin:auto;padding:26px;background:white;border:1px solid #dce3ef;border-radius:16px}.eyebrow{color:#405fc0;font-weight:800;font-size:12px;letter-spacing:.13em}h1{font-size:28px}p{color:#5d687c}button{padding:11px 15px;border:0;border-radius:9px;background:#3856b5;color:white;font-weight:700}',
    behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{const target=document.getElementById('demo-status');if(target&&target.textContent==='Ready. No server endpoint is configured.')target.textContent='Local click handled. Configure a real endpoint to demonstrate an HTMX content swap.'})"
  },
  alpine: {
    label: 'Alpine.js', summary: 'Alpine.js adds declarative, lightweight interactions directly in HTML.',
    scripts: '<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.9/dist/cdn.min.js"></script>',
    markup: '<main class="demo" x-data="{ count: 0 }"><span class="eyebrow">ALPINE.JS</span><h1>State in your markup.</h1><p>Use x-data and x-on to express a tiny interactive state.</p><button type="button" @click="count++">Count: <span x-text="count">0</span></button><p id="demo-status" aria-live="polite">Click to increment the counter.</p></main>',
    css: 'body{font:16px system-ui;color:#172033;background:#f5f7fb;padding:24px;margin:0}.demo{max-width:520px;margin:auto;padding:26px;background:white;border:1px solid #dce3ef;border-radius:16px}.eyebrow{color:#405fc0;font-weight:800;font-size:12px;letter-spacing:.13em}h1{font-size:28px}p{color:#5d687c}button{padding:11px 15px;border:0;border-radius:9px;background:#3856b5;color:white;font-weight:700}',
    behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{document.getElementById('demo-status').textContent='Alpine.js preview ready.'})"
  },
  hyperscript: {
    label: '_hyperscript', summary: 'A natural-language-inspired syntax for HTML event behavior.',
    scripts: '<script src="https://cdn.jsdelivr.net/npm/hyperscript.org@0.9.93/dist/_hyperscript.min.js"></script>',
    markup: '<main class="demo"><span class="eyebrow">_HYPERSCRIPT</span><h1>Describe behavior inline.</h1><p>Click the panel to toggle its active state.</p><button id="demo-action" type="button" _="on click toggle .active on me">Toggle active style</button><p id="demo-status" aria-live="polite">The button uses _hyperscript when its CDN is available.</p></main>',
    css: 'body{font:16px system-ui;color:#172033;background:#f5f7fb;padding:24px;margin:0}.demo{max-width:520px;margin:auto;padding:26px;background:white;border:1px solid #dce3ef;border-radius:16px}.eyebrow{color:#405fc0;font-weight:800;font-size:12px;letter-spacing:.13em}h1{font-size:28px}p{color:#5d687c}button{padding:11px 15px;border:0;border-radius:9px;background:#3856b5;color:white;font-weight:700}.active{background:#126d55;color:white;box-shadow:0 0 0 4px #b7f1df}',
    behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{document.getElementById('demo-status').textContent='Clicked. If the CDN is available, _hyperscript toggles the button class.'})"
  },
  motion: {
    label: 'Motion', summary: 'Motion animates DOM and SVG elements with JavaScript.',
    scripts: '<script type="module">import { animate } from "https://cdn.jsdelivr.net/npm/motion@12.23.12/+esm";window.jsrootAnimate=animate;</script>',
    markup: '<main class="demo"><span class="eyebrow">MOTION</span><h1>Motion with intent.</h1><p>Click the tile to animate it using Motion when the module loads.</p><button id="demo-action" type="button">Animate tile</button><div id="motion-tile" style="width:45px;height:45px;background:linear-gradient(145deg,#7c9cff,#59e1c0);border-radius:14px;margin-top:18px"></div><p id="demo-status" aria-live="polite">Ready to animate.</p></main>',
    css: 'body{font:16px system-ui;color:#172033;background:#f5f7fb;padding:24px;margin:0}.demo{max-width:520px;margin:auto;padding:26px;background:white;border:1px solid #dce3ef;border-radius:16px}.eyebrow{color:#405fc0;font-weight:800;font-size:12px;letter-spacing:.13em}h1{font-size:28px}p{color:#5d687c}button{padding:11px 15px;border:0;border-radius:9px;background:#3856b5;color:white;font-weight:700}',
    behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{const tile=document.getElementById('motion-tile');if(window.jsrootAnimate&&tile){window.jsrootAnimate(tile,{x:[0,100,0],rotate:[0,18,0],scale:[1,1.12,1]},{duration:0.8});document.getElementById('demo-status').textContent='Motion animation started.'}else{tile?.animate([{transform:'translateX(0)'},{transform:'translateX(100px)'},{transform:'translateX(0)'}],{duration:800});document.getElementById('demo-status').textContent='Using the native Web Animations fallback.'}})"
  },
  daisyui: {
    label: 'daisyUI + Tailwind', summary: 'daisyUI components are used alongside the Tailwind browser CDN.',
    cssLinks: ['https://cdn.jsdelivr.net/npm/daisyui@5'],
    scripts: '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>',
    markup: '<main class="card mx-auto max-w-xl bg-base-100 shadow-xl"><div class="card-body"><div class="badge badge-primary">DAISYUI</div><h1 class="card-title text-2xl">Reusable components.</h1><p>Use semantic component classes and Tailwind utilities together.</p><div class="card-actions justify-start"><button class="btn btn-primary" id="demo-action" type="button">Try component</button></div><p id="demo-status" aria-live="polite">Preview is ready.</p></div></main>',
    css: 'body{background:#f5f7fb;padding:24px;margin:0;font-family:system-ui}p{color:#576174}', behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{document.getElementById('demo-status').textContent='daisyUI component clicked.'})"
  },
  bulma: {
    label: 'Bulma', summary: 'Bulma is a CSS framework with readable component classes.',
    cssLinks: ['https://cdn.jsdelivr.net/npm/bulma@1.0.4/css/bulma.min.css'],
    markup: '<main class="section"><div class="container"><div class="box"><span class="tag is-info is-light">BULMA</span><h1 class="title is-3 mt-3">Readable by design.</h1><p class="subtitle is-6">Compose a card with expressive CSS classes.</p><button class="button is-link" id="demo-action" type="button">Try Bulma</button><p id="demo-status" class="help mt-3" aria-live="polite">Preview is ready.</p></div></div></main>', behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{document.getElementById('demo-status').textContent='Bulma button clicked.'})"
  },
  foundation: {
    label: 'Foundation', summary: 'Foundation supplies responsive grid and UI primitives.',
    cssLinks: ['https://cdn.jsdelivr.net/npm/foundation-sites@6.9.0/dist/css/foundation.min.css'],
    markup: '<main class="grid-container"><div class="callout primary"><span>FOUNDATION</span><h1>Flexible responsive layout.</h1><p>Use the grid and component styles to structure content.</p><button class="button" id="demo-action" type="button">Try Foundation</button><p id="demo-status" aria-live="polite">Preview is ready.</p></div></main>', behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{document.getElementById('demo-status').textContent='Foundation button clicked.'})"
  },
  materialize: {
    label: 'Materialize', summary: 'Materialize provides Material Design inspired controls.',
    cssLinks: ['https://cdn.jsdelivr.net/npm/materialize-css@1.0.0/dist/css/materialize.min.css'],
    scripts: '<script src="https://cdn.jsdelivr.net/npm/materialize-css@1.0.0/dist/js/materialize.min.js"></script>',
    markup: '<main class="container" style="padding-top:24px"><div class="card"><div class="card-content"><span class="new badge blue" data-badge-caption="">MATERIALIZE</span><span class="card-title">Material-inspired UI</span><p>Build a focused interface with familiar component styles.</p></div><div class="card-action"><a href="#" id="demo-action">Run demo</a><p id="demo-status" aria-live="polite">Preview is ready.</p></div></div></main>', behavior: "document.getElementById('demo-action')?.addEventListener('click',(event)=>{event.preventDefault();document.getElementById('demo-status').textContent='Materialize demo activated.'})"
  },
  uikit: {
    label: 'UIkit', summary: 'UIkit includes a modular CSS framework and JavaScript components.',
    cssLinks: ['https://cdn.jsdelivr.net/npm/uikit@3.23.0/dist/css/uikit.min.css'],
    scripts: '<script src="https://cdn.jsdelivr.net/npm/uikit@3.23.0/dist/js/uikit.min.js"></script>',
    markup: '<main class="uk-container uk-margin-top"><div class="uk-card uk-card-default uk-card-body uk-border-rounded"><span class="uk-label">UIKIT</span><h1 class="uk-card-title">Modular by design.</h1><p>Responsive components with a consistent visual language.</p><button class="uk-button uk-button-primary" id="demo-action" type="button">Try UIkit</button><p id="demo-status" class="uk-text-meta" aria-live="polite">Preview is ready.</p></div></main>', behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{document.getElementById('demo-status').textContent='UIkit button clicked.'})"
  },
  semantic: {
    label: 'Semantic UI', summary: 'Semantic UI uses human-readable class names for UI components.',
    cssLinks: ['https://cdn.jsdelivr.net/npm/semantic-ui@2.5.0/dist/semantic.min.css'],
    markup: '<main class="ui text container" style="padding-top:28px"><div class="ui raised very padded segment"><div class="ui blue label">SEMANTIC UI</div><h1 class="ui header">Classes that read clearly.</h1><p>Compose reusable components using expressive class names.</p><button class="ui primary button" id="demo-action" type="button">Try Semantic UI</button><p id="demo-status" aria-live="polite">Preview is ready.</p></div></main>', behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{document.getElementById('demo-status').textContent='Semantic UI button clicked.'})"
  },
  pico: {
    label: 'Pico CSS', summary: 'Pico CSS styles semantic HTML with minimal class usage.',
    cssLinks: ['https://cdn.jsdelivr.net/npm/@picocss/pico@2.1.1/css/pico.min.css'],
    markup: '<main class="container" style="padding-top:24px"><article><small>PICO CSS</small><h1>Semantic HTML first.</h1><p>Get a clean default interface with minimal markup.</p><button id="demo-action" type="button">Try Pico</button><p id="demo-status" aria-live="polite">Preview is ready.</p></article></main>', behavior: "document.getElementById('demo-action')?.addEventListener('click',()=>{document.getElementById('demo-status').textContent='Pico CSS button clicked.'})"
  }
};

function buildPreviewDocument(key) {
  const item = frameworkCatalog[key] || frameworkCatalog.native;
  const cssLinks = (item.cssLinks || []).map((url) => `<link rel="stylesheet" href="${escapeHtml(url)}">`).join('\n');
  const css = `<style>body{margin:0} ${item.css || ''}</style>`;
  // Script tags are constant project-authored snippets; no user input is interpolated into executable markup.
  const extraScripts = item.scripts || '';
  const behavior = `<script>try{${item.behavior || ''}}catch(error){const status=document.getElementById('demo-status');if(status)status.textContent='Demo initialization error: '+error.message;}</script>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${cssLinks}${css}<title>${escapeHtml(item.label)} preview</title></head><body>${item.markup}${extraScripts}${behavior}</body></html>`;
}

function renderPreview() {
  const select = byId('toolkit-select');
  const frame = byId('toolkit-frame');
  if (!select || !frame) return;
  const key = select.value;
  const item = frameworkCatalog[key] || frameworkCatalog.native;
  frame.srcdoc = buildPreviewDocument(key);
  setStatus('preview-status', `Loading ${item.label}. CDN-based features require a network connection.`);
  frame.addEventListener('load', () => {
    setStatus('preview-status', `${item.label} preview loaded. A blocked or unavailable CDN may leave some styles or behaviors inactive.`, 'success');
  }, { once: true });
  logRuntime(`Preview selected: ${item.label}`);
}

async function getSqlDatabase() {
  if (!sqlDatabasePromise) {
    sqlDatabasePromise = (async () => {
      const moduleUrl = 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.js';
      await loadScript(moduleUrl);
      if (typeof window.initSqlJs !== 'function') throw new Error('sql.js loaded without exposing initSqlJs.');
      const SQL = await window.initSqlJs({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${file}` });
      const db = new SQL.Database();
      db.run('CREATE TABLE demo_items (id INTEGER PRIMARY KEY, label TEXT NOT NULL);');
      db.run("INSERT INTO demo_items (label) VALUES ('HTML'), ('CSS'), ('JavaScript');");
      return db;
    })().catch((error) => {
      sqlDatabasePromise = null;
      throw error;
    });
  }
  return sqlDatabasePromise;
}

function formatSqlResults(results) {
  if (!Array.isArray(results) || results.length === 0) return 'Query completed. No rows returned.';
  return results.map((result) => {
    const lines = [result.columns.join(' | '), result.columns.map(() => '---').join(' | '), ...result.values.map((row) => row.map((value) => String(value ?? 'NULL')).join(' | '))];
    return lines.join('\n');
  }).join('\n\n');
}

async function runSql() {
  const query = byId('sql-query')?.value.trim();
  if (!query) {
    setStatus('sql-status', 'Enter a SQL query first.', 'error');
    return;
  }
  const button = byId('run-sql');
  if (button) button.disabled = true;
  setStatus('sql-status', 'Loading sql.js and running the query…');
  try {
    const db = await getSqlDatabase();
    const results = db.exec(query);
    byId('sql-output').textContent = formatSqlResults(results);
    setStatus('sql-status', 'Query completed in the browser. This in-memory database is not persisted.', 'success');
    logRuntime('sql.js query completed.');
  } catch (error) {
    byId('sql-output').textContent = `Query could not run.\n${error.message}`;
    setStatus('sql-status', `SQL demo unavailable or query invalid: ${error.message}`, 'error');
    logRuntime(`sql.js failed: ${error.message}`, 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

async function getPhpModule() {
  if (!phpModulePromise) {
    phpModulePromise = import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/phpjs@1.3.2/+esm')
      .then((module) => module.default || module)
      .catch((error) => {
        phpModulePromise = null;
        throw error;
      });
  }
  return phpModulePromise;
}

function fallbackSprintf(template, ...values) {
  let index = 0;
  return String(template).replace(/%([sdif])/g, (match, kind) => {
    if (index >= values.length) return match;
    const value = values[index++];
    if (kind === 'd' || kind === 'i') return String(Number.parseInt(value, 10) || 0);
    if (kind === 'f') return String(Number.parseFloat(value) || 0);
    return String(value);
  });
}

async function runPhpDemo() {
  const name = String(byId('format-name')?.value || 'developer').trim().slice(0, 80) || 'developer';
  const rawCount = Number(byId('format-count')?.value ?? 0);
  const count = Number.isFinite(rawCount) ? Math.max(0, Math.min(999999, Math.trunc(rawCount))) : 0;
  const template = 'Hello, %s! You have %d completed builds.';
  try {
    const php = await getPhpModule();
    const sprintf = php.sprintf || php.default?.sprintf;
    if (typeof sprintf !== 'function') throw new Error('The loaded php.js module does not expose sprintf.');
    byId('php-output').textContent = sprintf(template, name, count);
    setStatus('php-status', 'Formatted with php.js.', 'success');
    logRuntime('php.js helper executed.');
  } catch (error) {
    byId('php-output').textContent = fallbackSprintf(template, name, count);
    setStatus('php-status', 'php.js could not be loaded; the local sprintf fallback was used.', 'error');
    logRuntime(`php.js unavailable: ${error.message}`, 'error');
  }
}

async function runMotionDemo() {
  const target = byId('motion-target');
  if (!target) return;
  if (reducedMotion) {
    target.animate([{ opacity: 1 }, { opacity: 0.65 }, { opacity: 1 }], { duration: 180 });
    setStatus('motion-status', 'Reduced-motion preference detected; used a subtle native animation.', 'success');
    return;
  }
  const button = byId('run-motion');
  if (button) button.disabled = true;
  try {
    if (!motionModulePromise) {
      motionModulePromise = import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/motion@12.23.12/+esm')
        .catch((error) => { motionModulePromise = null; throw error; });
    }
    const motion = await motionModulePromise;
    if (typeof motion.animate !== 'function') throw new Error('Motion module did not expose animate().');
    await motion.animate(target, { x: [0, 86, 0], rotate: [0, 12, -12, 0], scale: [1, 1.12, 1] }, { duration: 0.85, easing: 'ease-in-out' }).finished;
    setStatus('motion-status', 'Animation completed with Motion.', 'success');
    logRuntime('Motion animation completed.');
  } catch (error) {
    target.animate([{ transform: 'translateX(0) rotate(0)' }, { transform: 'translateX(86px) rotate(12deg)' }, { transform: 'translateX(0) rotate(0)' }], { duration: 850, easing: 'ease-in-out' });
    setStatus('motion-status', 'Motion CDN unavailable; used the native Web Animations API fallback.', 'error');
    logRuntime(`Motion unavailable: ${error.message}`, 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

function bindEvents() {
  byId('task-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = byId('task-input');
    addTask(input?.value || '');
    if (input) {
      input.value = '';
      input.focus();
    }
  });
  byId('clear-completed')?.addEventListener('click', () => {
    const before = tasks.length;
    tasks = tasks.filter((task) => !task.done);
    saveTasks();
    renderTasks();
    setStatus('task-status', `Removed ${before - tasks.length} completed task(s).`, 'success');
  });
  byId('clear-tasks')?.addEventListener('click', () => {
    if (!tasks.length) {
      setStatus('task-status', 'There are no tasks to delete.');
      return;
    }
    tasks = [];
    saveTasks();
    renderTasks();
    setStatus('task-status', 'All tasks deleted.', 'success');
  });
  byId('toolkit-select')?.addEventListener('change', renderPreview);
  byId('reload-preview')?.addEventListener('click', renderPreview);
  byId('run-sql')?.addEventListener('click', runSql);
  byId('reset-sql')?.addEventListener('click', () => {
    const input = byId('sql-query');
    if (input) input.value = "SELECT 'JSRoot' AS project, 2026 AS year;";
    setStatus('sql-status', 'Query reset. sql.js has not been loaded yet.');
    byId('sql-output').textContent = 'Results will appear here.';
  });
  byId('run-php')?.addEventListener('click', runPhpDemo);
  byId('run-motion')?.addEventListener('click', runMotionDemo);
  byId('clear-log')?.addEventListener('click', () => {
    runtimeEvents.length = 0;
    byId('runtime-log').textContent = 'Runtime log cleared.';
    const badge = byId('runtime-badge');
    if (badge) badge.textContent = 'Runtime: ready';
  });
  byId('check-runtime')?.addEventListener('click', () => {
    const summary = `JavaScript: ${typeof window !== 'undefined' ? 'available' : 'unavailable'}\nLocalStorage: ${storageAvailable ? 'available' : 'fallback mode'}\nTasks in memory: ${tasks.length}\nToolkit options: ${Object.keys(frameworkCatalog).length}\nReduced motion: ${reducedMotion ? 'yes' : 'no'}`;
    byId('runtime-log').textContent = summary;
    logRuntime('Runtime check completed.');
  });
}

window.addEventListener('error', (event) => {
  const message = event.message || 'Unknown browser error';
  logRuntime(`Browser error: ${message}`, 'error');
});
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || String(event.reason || 'Unknown promise rejection');
  logRuntime(`Unhandled promise rejection: ${message}`, 'error');
});

function initialize() {
  safeStorage();
  loadTasks();
  renderTasks();
  bindEvents();
  renderPreview();
  logRuntime('JSRoot initialized successfully.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
