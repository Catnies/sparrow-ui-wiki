# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
npm install
```

**Note**: feel free to use the package manager of your choice.

## Local Development

```bash
npm run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

GitHub Actions builds and deploys the documentation whenever commits are pushed to
`master`. The workflow can also be started manually from the Actions tab.

The deployment follows the same workflow as Sparrow Sync Wiki:

1. Install locked dependencies with `npm ci` using Node.js 22.
2. Build both English and Simplified Chinese documentation with `npm run build`.
3. Update the `gh-pages` branch with the generated site and `.nojekyll`.
4. Upload the Pages artifact and deploy it to GitHub Pages.

The `gh-pages` branch contains generated output only; edit documentation on
`master`. In repository **Settings → Pages**, the source must be **GitHub Actions**.
The workflow uses the built-in `GITHUB_TOKEN`; no personal token is required.

- English: https://catnies.github.io/sparrow-ui-wiki/
- 简体中文: https://catnies.github.io/sparrow-ui-wiki/zh-Hans/

Workflow: [deploy-pages.yml](.github/workflows/deploy-pages.yml).
