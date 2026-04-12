# MSF Ability Search

A mobile-optimized web app for searching Marvel Strike Force character abilities by keyword. Built to help find counters in War and Crucible.

## Features

- **Fuzzy ability search** — Find characters whose abilities mention keywords like "speed down", "prevent", "heal block"
- **Character/trait filtering** — Filter by character name, team, origin, role, or alignment
- **Keyword highlighting** — Matching portions of ability text are highlighted in results
- **Passive-first results** — Passive abilities are prioritized since they're always active
- **Expandable ability cards** — Focus on matched abilities with option to view all four
- **Mobile optimized** — Designed for quick lookups on your phone during gameplay

## Development

```bash
npm install
npm run dev
```

## Data Pipeline

Character data is fetched from the [MSF API](https://developer.marvelstrikeforce.com) and stored as static JSON. A GitHub Action runs daily to keep data fresh.

To fetch data locally:

```bash
MSF_API_KEY=your_key MSF_ACCESS_TOKEN=your_token npm run fetch-data
```

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `MSF_API_KEY` | Your API key from the MSF developer portal |
| `MSF_ACCESS_TOKEN` | OAuth2 bearer token for the MSF API |

## Deployment

Deployed automatically to GitHub Pages on push to `main` via GitHub Actions.

## Tech Stack

- React + Vite
- Fuse.js for fuzzy search
- GitHub Pages for hosting
- GitHub Actions for CI/CD and data updates
