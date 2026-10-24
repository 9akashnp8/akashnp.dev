import { useMemo, useState } from "react"
import Punchcard from "./Punchcard"
import StackedColumns from "./StackedColumns"
import { addDays, bookComparison, compact, hourLabel, integer, parseDay, shortDate } from "./format"

const TABS = ["Overview", "Models", "Devices"]
const RANGES = [
    { id: "all", label: "All", days: null },
    { id: "30d", label: "30d", days: 30 },
    { id: "7d", label: "7d", days: 7 },
]
// Past ~3 months a column per day gets too thin to read; switch to weeks.
const WEEKLY_AFTER_DAYS = 92

const seriesColor = (index) => `var(--series-${index + 1})`
const sum = (list) => list.reduce((a, b) => a + b, 0)

function Segmented({ options, value, onChange, label }) {
    return (
        <div role="tablist" aria-label={label} className="flex gap-1">
            {options.map((option) => (
                <button
                    key={option.id}
                    role="tab"
                    aria-selected={value === option.id}
                    onClick={() => onChange(option.id)}
                    className={`rounded-md px-2 py-1 text-sm transition-colors ${
                        value === option.id
                            ? "bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white"
                            : "text-neutral-500 hover:text-black dark:text-[#8a8a8a] dark:hover:text-white"
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}

function StatTile({ label, value }) {
    return (
        <div className="rounded-lg bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">{label}</div>
            <div className="truncate text-lg font-semibold">{value}</div>
        </div>
    )
}

function LegendRow({ color, name, detail, share }) {
    return (
        <li className="flex flex-wrap items-center gap-x-3 py-1 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
            <span className="min-w-0 flex-1 truncate md:flex-none">{name}</span>
            {/* Detail drops to its own line on phones so the name never gets squeezed out. */}
            <span className="order-last w-full pl-[22px] text-xs text-neutral-500 tabular-nums dark:text-neutral-400 md:order-none md:ml-auto md:w-auto md:pl-0 md:text-sm">{detail}</span>
            <span className="w-12 text-right tabular-nums">{share}</span>
        </li>
    )
}

function percent(part, whole) {
    if (!whole) return "0%"
    const value = (part / whole) * 100
    return `${value < 0.1 && value > 0 ? "<0.1" : value.toFixed(1)}%`
}

// Rows for every calendar day in the range, zero-filled.
function rowsInRange(data, rangeDays) {
    const last = data.days.at(-1).d
    const first = rangeDays ? addDays(last, -(rangeDays - 1)) : data.days[0].d
    const byDate = Object.fromEntries(data.days.map((row) => [row.d, row]))
    const rows = []
    for (let key = first; key <= last; key = addDays(key, 1)) {
        rows.push(byDate[key] ?? { d: key, s: 0, m: 0, h: new Array(24).fill(0), mt: [], dt: [] })
    }
    return rows
}

function bucketize(rows, valuesOf) {
    const weekly = rows.length > WEEKLY_AFTER_DAYS
    const size = weekly ? 7 : 1
    const buckets = []
    // Group from the most recent day backwards so the last bucket is a full week.
    for (let end = rows.length; end > 0; end -= size) {
        const chunk = rows.slice(Math.max(0, end - size), end)
        const values = chunk.map(valuesOf).reduce((acc, v) => acc.map((a, i) => a + (v[i] ?? 0)))
        buckets.unshift({ label: shortDate(chunk[0].d), values })
    }
    return { buckets, weekly }
}

export default function UsageDashboard({ data }) {
    const [tab, setTab] = useState("Overview")
    const [range, setRange] = useState("all")

    const view = useMemo(() => {
        const rows = rowsInRange(data, RANGES.find((r) => r.id === range).days)
        const modelTotals = data.models.map((_, i) => [0, 1, 2, 3].map((k) => sum(rows.map((r) => r.mt[i]?.[k] ?? 0))))
        const deviceTotals = data.devices.map((_, i) => [0, 1, 2].map((k) => sum(rows.map((r) => r.dt[i]?.[k] ?? 0))))
        const modelTokens = modelTotals.map(sum)
        const totalTokens = sum(modelTokens)

        const hours = new Array(24).fill(0)
        // Monday-first rows; getUTCDay() is Sunday-first.
        const punchcard = Array.from({ length: 7 }, () => new Array(24).fill(0))
        for (const row of rows) {
            const weekday = (parseDay(row.d).getUTCDay() + 6) % 7
            row.h.forEach((count, hour) => {
                hours[hour] += count
                punchcard[weekday][hour] += count
            })
        }
        const peakHour = hours.indexOf(Math.max(...hours))
        const favorite = modelTokens.indexOf(Math.max(...modelTokens))

        return {
            rows,
            totalTokens,
            modelTotals,
            modelTokens,
            deviceTotals,
            punchcard,
            sessions: sum(rows.map((r) => r.s)),
            messages: sum(rows.map((r) => r.m)),
            activeDays: rows.filter((r) => r.m > 0).length,
            peakHour: hours[peakHour] > 0 ? hourLabel(peakHour) : "—",
            favorite: totalTokens > 0 ? data.models[favorite] : "—",
            models: bucketize(rows, (r) => data.models.map((_, i) => sum(r.mt[i] ?? []))),
            devices: bucketize(rows, (r) => data.devices.map((_, i) => r.dt[i]?.[2] ?? 0)),
        }
    }, [data, range])

    const modelSeries = data.models.map((name, i) => ({ name, color: seriesColor(i) }))
    const deviceSeries = data.devices.map((device, i) => ({ name: device.label, color: seriesColor(i) }))
    const lastSynced = shortDate(data.updatedAt.slice(0, 10))

    return (
        <section className="usage-root rounded-xl border border-black/10 bg-neutral-50 p-4 dark:border-white/10 dark:bg-neutral-800/40 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <Segmented label="View" value={tab} onChange={setTab}
                    options={TABS.map((t) => ({ id: t, label: t }))} />
                <Segmented label="Time range" value={range} onChange={setRange} options={RANGES} />
            </div>

            {tab === "Overview" && (
                <div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        <StatTile label="Sessions" value={integer(view.sessions)} />
                        <StatTile label="Messages" value={integer(view.messages)} />
                        <StatTile label="Total tokens" value={compact(view.totalTokens)} />
                        <StatTile label="Active days" value={integer(view.activeDays)} />
                        <StatTile label="Peak hour" value={view.peakHour} />
                        <StatTile label="Favorite model" value={view.favorite} />
                    </div>
                    <h3 className="mb-2 mt-5 text-sm text-neutral-500 dark:text-neutral-400">
                        When I code — responses by weekday and hour
                    </h3>
                    <Punchcard matrix={view.punchcard} />
                    {bookComparison(view.totalTokens) && (
                        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                            {bookComparison(view.totalTokens)}
                        </p>
                    )}
                </div>
            )}

            {tab === "Models" && (
                <div>
                    <h3 className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
                        Tokens per {view.models.weekly ? "week" : "day"} by model
                    </h3>
                    <StackedColumns buckets={view.models.buckets} series={modelSeries} />
                    <ul className="mt-3">
                        {data.models.map((name, i) =>
                            view.modelTokens[i] > 0 ? (
                                <LegendRow
                                    key={name}
                                    color={seriesColor(i)}
                                    name={name}
                                    detail={`${compact(view.modelTotals[i][0])} in · ${compact(view.modelTotals[i][1])} out · ${compact(view.modelTotals[i][2] + view.modelTotals[i][3])} cache`}
                                    share={percent(view.modelTokens[i], view.totalTokens)}
                                />
                            ) : null
                        )}
                    </ul>
                </div>
            )}

            {tab === "Devices" && (
                <div>
                    <h3 className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
                        Tokens per {view.devices.weekly ? "week" : "day"} by device
                    </h3>
                    <StackedColumns buckets={view.devices.buckets} series={deviceSeries} />
                    <ul className="mt-3">
                        {data.devices.map((device, i) => (
                            <LegendRow
                                key={device.id}
                                color={seriesColor(i)}
                                name={device.label}
                                detail={`${integer(view.deviceTotals[i][0])} sessions · synced ${shortDate(device.updatedAt.slice(0, 10))}`}
                                share={percent(view.deviceTotals[i][2], view.totalTokens)}
                            />
                        ))}
                    </ul>
                </div>
            )}

            <p className="mt-4 border-t border-black/10 pt-3 text-xs text-neutral-500 dark:border-white/10 dark:text-[#8a8a8a]">
                Claude Code usage merged from {data.devices.length} device{data.devices.length === 1 ? "" : "s"} · last synced {lastSynced}
            </p>
        </section>
    )
}
