#!/usr/bin/env node
// Collects Claude Code token usage on this device and writes an aggregate
// summary to src/data/claude-usage/<device>.json. Run it on every device you
// use Claude Code on; the /usage page merges all device files at build time.
//
// Only daily per-model counts leave the machine: no prompts, file paths,
// project names or session ids are written.
//
// Usage:
//   node scripts/claude-usage.mjs --device <name> [--label "Work laptop"]
//                                 [--tz Asia/Kolkata] [--claude-dir ~/.claude]
//                                 [--push]

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { homedir, hostname } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(repoRoot, "src", "data", "claude-usage");

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith("--")) continue;
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next === undefined || next.startsWith("--")) {
            args[key] = true;
        } else {
            args[key] = next;
            i++;
        }
    }
    return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 13).join("\n"));
    process.exit(0);
}

const device = String(args.device || hostname()).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
const label = typeof args.label === "string" ? args.label : undefined;
const timeZone = typeof args.tz === "string" ? args.tz : Intl.DateTimeFormat().resolvedOptions().timeZone;
const claudeDir = (typeof args["claude-dir"] === "string" ? args["claude-dir"] : process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"))
    .replace(/^~(?=$|\/|\\)/, homedir());
const projectsDir = join(claudeDir, "projects");

if (!existsSync(projectsDir)) {
    console.error(`No Claude Code transcripts found at ${projectsDir}`);
    process.exit(1);
}

// Bucket timestamps into calendar days and hours in a single time zone so
// devices in different zones still line up on the same dashboard.
const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
});

function localDayAndHour(timestamp) {
    const parts = Object.fromEntries(dateParts.formatToParts(new Date(timestamp)).map((p) => [p.type, p.value]));
    return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

function listTranscripts(dir) {
    const files = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) files.push(...listTranscripts(full));
        else if (entry.endsWith(".jsonl")) files.push(full);
    }
    return files;
}

function emptyDay() {
    return { sessions: 0, messages: 0, hours: new Array(24).fill(0), models: {} };
}

const days = {};
const seenMessages = new Set();
const seenSessions = new Set();
const seenUserEntries = new Set();

for (const file of listTranscripts(projectsDir)) {
    const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
    for await (const line of lines) {
        if (!line.includes('"timestamp"')) continue;
        let entry;
        try {
            entry = JSON.parse(line);
        } catch {
            continue;
        }
        if (!entry.timestamp || (entry.type !== "user" && entry.type !== "assistant")) continue;

        const { day, hour } = localDayAndHour(entry.timestamp);
        const bucket = (days[day] ??= emptyDay());

        if (entry.sessionId && !seenSessions.has(entry.sessionId)) {
            seenSessions.add(entry.sessionId);
            bucket.sessions++;
        }

        if (entry.type === "user") {
            // Resumed sessions replay earlier entries; count each uuid once.
            if (entry.isMeta || (entry.uuid && seenUserEntries.has(entry.uuid))) continue;
            if (entry.uuid) seenUserEntries.add(entry.uuid);
            bucket.messages++;
            continue;
        }

        const message = entry.message;
        const usage = message?.usage;
        if (!usage || !message.model || message.model === "<synthetic>") continue;
        // One API response is logged once per content block with identical usage.
        const key = message.id ? `${message.id}:${entry.requestId ?? ""}` : entry.uuid;
        if (seenMessages.has(key)) continue;
        seenMessages.add(key);

        bucket.messages++;
        bucket.hours[hour]++;
        const model = (bucket.models[message.model] ??= { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, requests: 0 });
        model.input += usage.input_tokens ?? 0;
        model.output += usage.output_tokens ?? 0;
        model.cacheRead += usage.cache_read_input_tokens ?? 0;
        model.cacheWrite += usage.cache_creation_input_tokens ?? 0;
        model.requests++;
    }
}

// Claude Code prunes old transcripts (cleanupPeriodDays, 30 by default), so
// keep days already recorded in the existing file. When both have a day, the
// fuller one wins: a day can be partially pruned but never grows backwards.
const outFile = join(outDir, `${device}.json`);
const previous = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf8")) : null;
const merged = { ...(previous?.days ?? {}) };
for (const [day, bucket] of Object.entries(days)) {
    if (!merged[day] || merged[day].messages <= bucket.messages) merged[day] = bucket;
}

const sortedDays = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
const output = {
    device,
    label: label ?? previous?.label ?? device,
    timeZone,
    updatedAt: new Date().toISOString(),
    days: sortedDays,
};

mkdirSync(outDir, { recursive: true });
// Keep the 24-slot hour arrays on one line so diffs stay readable.
const json = JSON.stringify(output, null, 2).replace(/\[\s+([\d,\s]+?)\s+\]/g, (_, inner) => `[${inner.split(/,\s*/).join(", ")}]`);
writeFileSync(outFile, json + "\n");

const totals = Object.values(days).reduce(
    (acc, d) => {
        acc.messages += d.messages;
        acc.sessions += d.sessions;
        for (const m of Object.values(d.models)) acc.tokens += m.input + m.output + m.cacheRead + m.cacheWrite;
        return acc;
    },
    { sessions: 0, messages: 0, tokens: 0 },
);
console.log(
    `${device}: scanned ${Object.keys(days).length} days, ${totals.sessions} sessions, ` +
        `${totals.messages} messages, ${totals.tokens.toLocaleString()} tokens -> ${outFile}`,
);

if (args.push) {
    const git = (...gitArgs) => execFileSync("git", gitArgs, { cwd: repoRoot, stdio: "inherit" });
    git("add", outFile);
    try {
        execFileSync("git", ["diff", "--cached", "--quiet", "--", outFile], { cwd: repoRoot });
        console.log("No usage changes to commit.");
    } catch {
        git("commit", "-m", `chore(usage): sync claude code usage from ${device}`, "--", outFile);
        git("pull", "--rebase", "--autostash");
        git("push");
    }
}
