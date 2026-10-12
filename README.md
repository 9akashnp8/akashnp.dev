# akashnp.dev

My personal website built with Astro & React.

## Inspirations

- https://paco.me/
- https://brianlovin.com/
- https://www.sj.land/
- https://brittanychiang.com/

## Claude Code usage (`/usage`)

Claude Code only reports usage for the machine it runs on. `/usage` adds up every
device. Each machine runs the [usage-sync](https://github.com/9akashnp8/claude-code-plugins#usage-sync)
Claude Code plugin, which commits that machine's daily totals to
`9akashnp8/claude-usage-data` as `devices/<device>.json`. The page reads every
file there at build time and merges them.

Build settings (all optional):

| Variable | Default | What it is |
| --- | --- | --- |
| `USAGE_DATA_REPO` | `9akashnp8/claude-usage-data` | The data repository; empty to read none |
| `USAGE_DATA_BRANCH` | `main` | Its branch |
| `USAGE_DATA_FOLDER` | `devices` | The folder holding the device files |
| `USAGE_DATA_TOKEN` | none | A read-only token: needed for a private repository, and recommended anyway, since unauthenticated GitHub calls share 60 an hour per IP |

- The plugin pushes to the data repository, not to this one, so the site needs a
  scheduled rebuild (a daily deploy hook, for example) to pick up new usage.
- A production build fails when GitHub can't be read, so a bad build never
  replaces the published page with an empty one. A missing repository or folder
  just means nothing has synced yet.
- Files in `src/data/claude-usage/` are merged in too. `npm run usage:sync -- --device <name>`
  writes one from local transcripts, for history the plugin can't import (it skips
  transcripts of 4 MB or more). Where both sources have a device, each day keeps the
  fuller copy.
- In `npm run dev` with no device files, the page shows clearly labelled sample data.
