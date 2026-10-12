// Merges the per-device files written by scripts/claude-usage.mjs into one
// compact payload for the usage dashboard. Runs at build time.

const MAX_SERIES = 8;
const FAMILIES = ["opus", "sonnet", "haiku", "fable", "instant"];

// claude-opus-5-5 -> "Opus 5.5", claude-3-5-sonnet-20241022 -> "Sonnet 3.5"
export function modelDisplayName(id) {
    const parts = id.replace(/^claude-/, "").replace(/\[.*\]$/, "").replace(/-\d{8}$/, "").split("-");
    const family = parts.find((p) => FAMILIES.includes(p));
    const version = parts.filter((p) => /^\d+$/.test(p));
    if (!family) return id;
    return `${family[0].toUpperCase()}${family.slice(1)}${version.length ? ` ${version.join(".")}` : ""}`;
}

const tokensOf = (m) => m.input + m.output + m.cacheRead + m.cacheWrite;

// Rank series by all-time tokens so colors follow the entity, not the
// selected range. Past MAX_SERIES the tail folds into "Other".
function rankSeries(totals) {
    const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([name]) => name);
    if (ranked.length <= MAX_SERIES) return { names: ranked, indexOf: (n) => ranked.indexOf(n) };
    const kept = ranked.slice(0, MAX_SERIES - 1);
    return { names: [...kept, "Other"], indexOf: (n) => (kept.includes(n) ? kept.indexOf(n) : MAX_SERIES - 1) };
}

export function buildUsageData(deviceFiles) {
    const files = deviceFiles.filter((f) => f && f.days);
    if (!files.length) return null;

    const modelTotals = {};
    const deviceTotals = {};
    for (const file of files) {
        deviceTotals[file.device] = 0;
        for (const day of Object.values(file.days)) {
            for (const [id, m] of Object.entries(day.models)) {
                const name = modelDisplayName(id);
                modelTotals[name] = (modelTotals[name] ?? 0) + tokensOf(m);
                deviceTotals[file.device] += tokensOf(m);
            }
        }
    }
    const models = rankSeries(modelTotals);
    const deviceOrder = Object.entries(deviceTotals).sort((a, b) => b[1] - a[1]).map(([id]) => id);
    const devices = deviceOrder.map((id) => {
        const file = files.find((f) => f.device === id);
        return { id, label: file.label ?? id, updatedAt: file.updatedAt };
    });

    const byDate = {};
    for (const file of files) {
        const deviceIndex = deviceOrder.indexOf(file.device);
        for (const [date, day] of Object.entries(file.days)) {
            const row = (byDate[date] ??= {
                d: date,
                s: 0,
                m: 0,
                h: new Array(24).fill(0),
                mt: models.names.map(() => [0, 0, 0, 0]),
                dt: deviceOrder.map(() => [0, 0, 0]),
            });
            row.s += day.sessions;
            row.m += day.messages;
            day.hours.forEach((count, hour) => (row.h[hour] += count));
            let dayTokens = 0;
            for (const [id, m] of Object.entries(day.models)) {
                const t = row.mt[models.indexOf(modelDisplayName(id))];
                t[0] += m.input;
                t[1] += m.output;
                t[2] += m.cacheRead;
                t[3] += m.cacheWrite;
                dayTokens += tokensOf(m);
            }
            const d = row.dt[deviceIndex];
            d[0] += day.sessions;
            d[1] += day.messages;
            d[2] += dayTokens;
        }
    }

    const days = Object.values(byDate).sort((a, b) => a.d.localeCompare(b.d));
    return {
        models: models.names,
        devices,
        updatedAt: files.map((f) => f.updatedAt).sort().at(-1),
        days,
    };
}

// Deterministic sample data so the dashboard can be previewed in dev before
// any device has synced. Never used in production builds.
export function demoDeviceFiles(endDate = new Date()) {
    let seed = 42;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const devices = [
        { device: "macbook-pro", label: "MacBook Pro", weight: 1, active: 0.75 },
        { device: "work-laptop", label: "Work laptop", weight: 1.4, active: 0.6, weekdaysOnly: true },
        { device: "desktop", label: "Desktop", weight: 0.7, active: 0.35 },
    ];
    const eras = [
        { until: 70, models: { "claude-sonnet-5": 0.6, "claude-opus-5": 0.35, "claude-haiku-5-5": 0.05 } },
        { until: 30, models: { "claude-sonnet-5": 0.35, "claude-opus-5": 0.25, "claude-opus-5-5": 0.25, "claude-sonnet-5-5": 0.15 } },
        { until: -1, models: { "claude-opus-5-5": 0.45, "claude-sonnet-5-5": 0.3, "claude-fable-5-1": 0.2, "claude-haiku-5-5": 0.05 } },
    ];
    const totalDays = 120;
    return devices.map((dev) => {
        const days = {};
        for (let ago = totalDays; ago >= 0; ago--) {
            const date = new Date(endDate);
            date.setDate(date.getDate() - ago);
            const weekday = date.getDay();
            if (dev.weekdaysOnly && (weekday === 0 || weekday === 6)) continue;
            if (rand() > dev.active) continue;
            const era = eras.find((e) => ago > e.until);
            const sessions = 1 + Math.floor(rand() * 6 * dev.weight);
            const messages = Math.floor(sessions * (60 + rand() * 260));
            const hours = new Array(24).fill(0);
            const peak = dev.weekdaysOnly ? 10 : 21;
            for (let i = 0; i < messages / 2; i++) {
                const hour = Math.round(peak + (rand() + rand() + rand() - 1.5) * 6);
                hours[(hour + 24) % 24]++;
            }
            const models = {};
            for (const [id, share] of Object.entries(era.models)) {
                if (rand() > share * 2.2) continue;
                const responses = Math.max(1, Math.round((messages / 2) * share));
                models[id] = {
                    input: Math.round(responses * (2 + rand() * 30)),
                    output: Math.round(responses * (300 + rand() * 900)),
                    cacheRead: Math.round(responses * (30000 + rand() * 60000)),
                    cacheWrite: Math.round(responses * (1500 + rand() * 4000)),
                    requests: responses,
                };
            }
            days[date.toISOString().slice(0, 10)] = { sessions, messages, hours, models };
        }
        return { device: dev.device, label: dev.label, timeZone: "Asia/Kolkata", updatedAt: endDate.toISOString(), days };
    });
}
