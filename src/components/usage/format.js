export function compact(n) {
    const units = [
        [1e9, "B"],
        [1e6, "M"],
        [1e3, "k"],
    ];
    for (const [size, suffix] of units) {
        if (Math.abs(n) >= size) {
            const value = n / size;
            return `${value >= 100 ? Math.round(value) : value.toFixed(1).replace(/\.0$/, "")}${suffix}`;
        }
    }
    return String(Math.round(n));
}

// Fixed locale so the server render and hydration agree.
export const integer = (n) => n.toLocaleString("en-US");

export function hourLabel(hour) {
    const suffix = hour < 12 ? "AM" : "PM";
    return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}

// Day keys are local calendar dates ("2026-10-12"); do all date math in UTC
// so the viewer's own time zone never shifts them.
export const parseDay = (key) => new Date(`${key}T00:00:00Z`);
export const dayKey = (date) => date.toISOString().slice(0, 10);

export function addDays(key, n) {
    const date = parseDay(key);
    date.setUTCDate(date.getUTCDate() + n);
    return dayKey(date);
}

export function shortDate(key) {
    return parseDay(key).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// Rough token counts (~1.3 tokens per word) for the "you've read X books" line.
const BOOKS = [
    { title: "the entire Harry Potter series", tokens: 1_400_000 },
    { title: "War and Peace", tokens: 760_000 },
    { title: "The Lord of the Rings", tokens: 620_000 },
    { title: "The Hobbit", tokens: 124_000 },
    { title: "The Little Prince", tokens: 22_000 },
];

export function bookComparison(tokens) {
    if (!tokens) return null;
    const book = BOOKS.find((b) => tokens / b.tokens >= 10) ?? BOOKS.at(-1);
    const ratio = tokens / book.tokens;
    if (ratio < 1) return `That's about ${Math.max(1, Math.round(ratio * 100))}% of ${book.title}.`;
    return `That's ~${integer(Math.round(ratio))}× more tokens than ${book.title}.`;
}
