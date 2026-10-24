import { useState } from "react"
import { hourLabel, integer } from "./format"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const LEVEL_OPACITY = [0.25, 0.5, 0.75, 1]

/** matrix: 7 rows (Mon..Sun) x 24 hourly response counts. */
export default function Punchcard({ matrix }) {
    const [active, setActive] = useState(null)

    // Quartile bins over non-empty cells keep a few heavy hours from
    // washing every other cell out.
    const values = matrix.flat().filter((v) => v > 0).sort((a, b) => a - b)
    const thresholds = [0.25, 0.5, 0.75].map((q) => values[Math.floor(q * (values.length - 1))] ?? 0)
    const level = (v) => thresholds.filter((t) => v > t).length

    let peak = { day: 0, hour: 0, value: 0 }
    matrix.forEach((row, day) => row.forEach((value, hour) => {
        if (value > peak.value) peak = { day, hour, value }
    }))
    const shown = active ?? peak

    return (
        <div>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: "2rem repeat(24, minmax(0, 1fr))" }}>
                {matrix.map((row, day) => [
                    <div key={`label-${day}`} className="self-center text-[11px] leading-none text-neutral-500 dark:text-[#8a8a8a]">
                        {day % 2 === 0 ? WEEKDAYS[day] : ""}
                    </div>,
                    ...row.map((value, hour) => (
                        <div
                            key={`${day}-${hour}`}
                            tabIndex={0}
                            aria-label={`${WEEKDAYS[day]} ${hourLabel(hour)}: ${integer(value)} responses`}
                            onMouseEnter={() => setActive({ day, hour, value })}
                            onMouseLeave={() => setActive(null)}
                            onFocus={() => setActive({ day, hour, value })}
                            onBlur={() => setActive(null)}
                            className="aspect-square rounded-[3px] outline-none ring-neutral-500 focus-visible:ring-2 dark:ring-neutral-400"
                            style={
                                value > 0
                                    ? { background: "var(--series-1)", opacity: LEVEL_OPACITY[level(value)] }
                                    : { background: "var(--viz-empty)" }
                            }
                        />
                    )),
                ])}
                <div />
                {Array.from({ length: 24 }, (_, hour) => (
                    <div key={hour} className="pt-1 text-center text-[11px] leading-none text-neutral-500 dark:text-[#8a8a8a]">
                        {hour % 6 === 0 ? hourLabel(hour).replace(" ", "").toLowerCase() : ""}
                    </div>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 dark:text-[#8a8a8a]">
                <span className="tabular-nums">
                    {shown.value > 0
                        ? `${active ? "" : "Busiest: "}${WEEKDAYS[shown.day]} ${hourLabel(shown.hour)} · ${integer(shown.value)} responses`
                        : "No activity in this range"}
                </span>
                <span className="flex items-center gap-1" aria-hidden="true">
                    Less
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--viz-empty)" }} />
                    {LEVEL_OPACITY.map((opacity) => (
                        <span key={opacity} className="h-2.5 w-2.5 rounded-[3px]"
                            style={{ background: "var(--series-1)", opacity }} />
                    ))}
                    More
                </span>
            </div>
        </div>
    )
}
