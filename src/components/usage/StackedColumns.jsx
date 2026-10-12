import { useEffect, useRef, useState } from "react"
import { compact, integer } from "./format"

const HEIGHT = 180
const AXIS_BAND = 22
const Y_LABEL_WIDTH = 36
const GAP = 2

function niceMax(value) {
    if (value <= 0) return 1
    const magnitude = 10 ** Math.floor(Math.log10(value))
    const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value)
    return step * magnitude
}

// Column with a 4px rounded data-end and a square baseline.
function topRoundedRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h)
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

/**
 * buckets: [{ label, values: number[] }] where values align with series.
 * series:  [{ name, color }]
 */
export default function StackedColumns({ buckets, series, unit = "tokens" }) {
    const wrapperRef = useRef(null)
    const [width, setWidth] = useState(600)
    const [active, setActive] = useState(null)

    useEffect(() => {
        const el = wrapperRef.current
        if (!el) return
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const totals = buckets.map((b) => b.values.reduce((a, v) => a + v, 0))
    const max = niceMax(Math.max(...totals, 0))
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)

    const plotWidth = Math.max(width - Y_LABEL_WIDTH, 50)
    const band = plotWidth / Math.max(buckets.length, 1)
    const barWidth = Math.max(Math.min(24, band - GAP), 1)
    const y = (v) => HEIGHT - (v / max) * HEIGHT

    // Label roughly every 70px so dates never collide.
    const labelEvery = Math.max(1, Math.ceil(70 / band))

    const activeBucket = active === null ? null : buckets[active]
    const tooltipLeft = active === null ? 0 : Y_LABEL_WIDTH + band * (active + 0.5)

    return (
        <div ref={wrapperRef} className="relative w-full select-none">
            <svg width={width} height={HEIGHT + AXIS_BAND + 8} className="block overflow-visible" role="img"
                aria-label={`Daily ${unit} stacked by series`}>
                <g transform="translate(0, 4)">
                    {ticks.map((t) => (
                        <g key={t}>
                            <line x1={Y_LABEL_WIDTH} x2={width} y1={y(t)} y2={y(t)}
                                stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth="1" />
                            <text x={Y_LABEL_WIDTH - 8} y={y(t)} dy="0.32em" textAnchor="end"
                                className="tabular-nums" fontSize="11" fill="var(--viz-muted)">
                                {compact(t)}
                            </text>
                        </g>
                    ))}

                    {buckets.map((bucket, i) => {
                        const x = Y_LABEL_WIDTH + band * i + (band - barWidth) / 2
                        const visible = bucket.values
                            .map((value, s) => ({ value, s }))
                            .filter(({ value }) => value > 0)
                        let base = 0
                        return (
                            <g key={bucket.label} opacity={active === null || active === i ? 1 : 0.6}>
                                {visible.map(({ value, s }, k) => {
                                    const top = y(base + value)
                                    const bottom = y(base)
                                    base += value
                                    // 2px surface gap between stacked segments.
                                    const h = Math.max(bottom - top - (k > 0 ? GAP : 0), 0.5)
                                    const isTop = k === visible.length - 1
                                    return isTop ? (
                                        <path key={s} d={topRoundedRect(x, top, barWidth, h, 4)} fill={series[s].color} />
                                    ) : (
                                        <rect key={s} x={x} y={top} width={barWidth} height={h} fill={series[s].color} />
                                    )
                                })}
                            </g>
                        )
                    })}

                    {buckets.map((bucket, i) =>
                        (buckets.length - 1 - i) % labelEvery === 0 ? (
                            <text key={bucket.label} x={Y_LABEL_WIDTH + band * (i + 0.5)} y={HEIGHT + 16}
                                textAnchor="middle" fontSize="11" fill="var(--viz-muted)">
                                {bucket.label}
                            </text>
                        ) : null
                    )}

                    {/* Hit targets span the whole band, larger than the mark. */}
                    {buckets.map((bucket, i) => (
                        <rect key={bucket.label} x={Y_LABEL_WIDTH + band * i} y={0} width={band} height={HEIGHT}
                            fill="transparent" tabIndex={0} aria-label={`${bucket.label}: ${integer(totals[i])} ${unit}`}
                            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
                            onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                            className="outline-none" />
                    ))}
                </g>
            </svg>

            {activeBucket && (
                <div
                    className="pointer-events-none absolute top-0 z-10 min-w-[10rem] rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-neutral-800"
                    style={{
                        left: Math.min(Math.max(tooltipLeft, 80), width - 80),
                        transform: "translateX(-50%)",
                    }}
                >
                    <div className="mb-1 font-medium">{activeBucket.label}</div>
                    {activeBucket.values.map((value, s) =>
                        value > 0 ? (
                            <div key={s} className="flex items-center gap-2 tabular-nums">
                                <span className="h-2 w-2 rounded-sm" style={{ background: series[s].color }} />
                                <span className="whitespace-nowrap text-neutral-500 dark:text-neutral-400">{series[s].name}</span>
                                <span className="ml-auto pl-3">{compact(value)}</span>
                            </div>
                        ) : null
                    )}
                    <div className="mt-1 flex border-t border-black/10 pt-1 tabular-nums dark:border-white/10">
                        <span className="text-neutral-500 dark:text-neutral-400">Total</span>
                        <span className="ml-auto">{compact(totals[active])}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
