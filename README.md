# JSRoot

JSRoot is a dependency-free static web application starter built with JavaScript and GitHub Actions. It demonstrates isolated previews for popular CSS and UI libraries, browser-side utilities, a SQLite demo, a PHP-style helper demo, animation, and a task list persisted with `localStorage`.

## Source layout

```text
JSRoot/
├── README.md
├── build.mjs
├── src/
│   └── script.js
└── .github/
    └── workflows/
        └── page.yml
```

The workflow generates `dist/index.html` and `dist/script.js` during CI. The generated `dist/` directory is a build artifact, not an additional source directory that must be committed. The repository source stays limited to the four files shown above.

## Features

- Static build using Node.js built-in modules only; no `package.json` or install step is required.
- GitHub Pages deployment from the `main` branch and manual workflow dispatch.
- A library preview that loads one framework at a time inside a sandboxed iframe to reduce global CSS conflicts.
- Optional integrations for EaseMotion CSS, Tailwind CSS, Bootstrap, HTMX, Alpine.js, `_hyperscript`, Motion, daisyUI, Bulma, Foundation, Materialize, UIkit, Semantic UI, and Pico CSS.
- A task list that attempts to persist data in `localStorage` and falls back to in-memory state when browser storage is unavailable.
- A browser-side SQLite example powered by sql.js, loaded on demand.
- A PHP-style formatting example that tries php.js first and retains a local fallback.
- Reduced-motion-aware animation and user-visible status messages for optional library loading failures.

## Run locally

Requirements: Node.js 20 or newer.

```bash
node --check build.mjs
node --check src/script.js
node build.mjs
```

Then serve `dist/` over HTTP. For example, with Python available:

```bash
python3 -m http.server 8000 --directory dist
```

Open <http://localhost:8000>. Serving over HTTP is recommended over opening `index.html` directly, especially for WebAssembly and ES module features.

## Deploy to GitHub Pages

1. Create a GitHub repository named **JSRoot** and push these four source files to the `main` branch.
2. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
3. Push a commit to `main`, or open **Actions → Deploy JSRoot to GitHub Pages → Run workflow**.
4. After the workflow succeeds, open the Pages URL shown in the workflow summary.

The workflow has read access to repository contents and write access only to Pages deployment resources and the required OIDC token. It uses relative asset paths so the app also works at a project Pages URL such as `https://OWNER.github.io/JSRoot/`.

## External services and reliability notes

The core page and build do not require a framework CDN. Selecting a preview or using a library demo makes a browser request to that library's CDN. SQL.js also downloads its WebAssembly file. Network filters, outages, browser extensions, CDN changes, and browser support can affect these optional integrations; the app reports failures and keeps local task functionality available. No web application can guarantee that all errors are impossible in every external environment.

Tailwind's browser/Play CDN is intended for prototyping and development. For a production application with a strict asset policy, pin and self-host the libraries you need, or compile only the selected framework into static assets.

## File responsibilities

- `build.mjs` — validates the source entry point and generates a self-contained HTML shell plus the browser script in `dist/`.
- `src/script.js` — task state, library previews, optional library loading, examples, and runtime error reporting.
- `.github/workflows/page.yml` — syntax checks, static build, and GitHub Pages deployment.

## License

Choose and add a license before distributing this project. JSRoot does not relicense third-party frameworks; each library remains subject to its own license and terms.
