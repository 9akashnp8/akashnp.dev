// Reads the per-device files the usage-sync Claude Code plugin commits to the
// data repository. Runs at build time only, so the token never reaches a page.

const API = "https://api.github.com";

export async function fetchDeviceFiles({ repo, branch = "main", folder = "devices", token }) {
    if (!repo) return [];
    const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "akashnp.dev-build",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const listing = await fetch(`${API}/repos/${repo}/contents/${folder}?ref=${encodeURIComponent(branch)}`, { headers });
    // No repository or folder yet: nothing has synced, which the page says.
    if (listing.status === 404) return [];
    if (!listing.ok) {
        // Unauthenticated calls share 60 an hour per IP, which shared build machines run out of.
        const hint = token ? "" : " (set USAGE_DATA_TOKEN to a read-only token to lift the rate limit)";
        throw new Error(`GitHub answered ${listing.status} listing ${repo}/${folder}${hint}`);
    }

    const entries = (await listing.json()).filter((entry) => entry.type === "file" && entry.name.endsWith(".json"));
    return Promise.all(
        entries.map(async (entry) => {
            const file = await fetch(entry.url, { headers: { ...headers, Accept: "application/vnd.github.raw+json" } });
            if (!file.ok) throw new Error(`GitHub answered ${file.status} reading ${entry.path}`);
            return file.json();
        }),
    );
}
