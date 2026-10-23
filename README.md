# TSP SAP Framework — Getting Started

**Current stable release: [v0.11.0](https://github.com/TSP-LAC-HR-DEVELOPMENTS/tsp-sap-development-template/releases/tag/v0.11.0) — approved for general internal TSP use.**

Official template: [TSP-LAC-HR-DEVELOPMENTS/tsp-sap-development-template](https://github.com/TSP-LAC-HR-DEVELOPMENTS/tsp-sap-development-template). Approved baseline: `fe9941059ab23db1e2344e98988e644d9884b0f8`. Framework release approval does not approve customer deliverables or imply live SAP environment acceptance.

A static page that takes an SAP Integration consultant from zero to their first development with the TSP SAP Development Framework, using **VS Code**, **Codex** and the **TSP-LAC-HR-DEVELOPMENTS** GitHub organization.

- **Part A — Get ready (once):** VS Code + Python extension, Git, Python 3.11+ and the Framework's packages (`PyYAML`, `openpyxl`, `python-docx`), Codex in Agent mode, GitHub organization access, ready check.
- **Part B — Start a development (every solution):** repository name builder (`<CLIENT>_<SOLUTION-ID>_<SHORT-DESCRIPTION>`, same rules as the Solution Identity Contract), create from `TSP-LAC-HR-DEVELOPMENTS/tsp-sap-development-template`, `Start a new project.`, working with Codex, saving work to GitHub.
- **Help:** glossary and troubleshooting.

Written in plain English for Spanish and Portuguese speakers: short sentences, no idioms.

## Run locally

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

## Deploy

`.github/workflows/pages.yml` publishes on every push to `main`. Set **Settings → Pages → Source → GitHub Actions**. On GitHub Free the repository must be public, so the page holds no system addresses, credentials or client data.

No build, backend, analytics or remote assets. Ticks and the Windows/macOS choice are stored only in the viewer's browser.
