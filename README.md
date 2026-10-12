# akashnp.dev

My personal website built with Astro & React.

## Inspirations

- https://paco.me/
- https://brianlovin.com/
- https://www.sj.land/
- https://brittanychiang.com/

## Claude Code usage (`/usage`)

Claude Code only reports usage for the machine it runs on. `/usage` adds up every
device: each one writes its own aggregate file to `src/data/claude-usage/<device>.json`,
and the page merges them at build time.

On each device, from a clone of this repo:

```sh
npm run usage:sync -- --device macbook --label "MacBook Pro" --push
```

- Reads transcripts from `~/.claude/projects` (or `$CLAUDE_CONFIG_DIR`, or `--claude-dir`).
- Writes daily per-model token counts only: no prompts, paths, project names or session ids.
- `--tz Asia/Kolkata` buckets days and hours in one zone so devices line up (defaults to the system zone).
- `--push` commits only that device's file, rebases and pushes. Each device owns one file, so syncs never conflict.
- Claude Code deletes transcripts after `cleanupPeriodDays` (30 by default). Days already in the file are kept,
  so sync at least that often, or raise `cleanupPeriodDays` in `~/.claude/settings.json`.

Run it on a schedule (e.g. daily cron) to keep the page current. In `npm run dev` with no device files,
the page shows clearly-labelled sample data.
