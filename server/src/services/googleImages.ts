const UNSPLASH = "https://unsplash.com/napi/search/photos";

export interface ScrapedImage {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    creator: string;
    license: string;
    width: number;
    height: number;
    foreign_landing_url: string;
}

interface UnsplashResult {
    id: string;
    alt_description: string | null;
    urls: { regular: string; thumb: string };
    user: { name: string; username: string };
    links: { html: string };
    width: number;
    height: number;
}

interface UnsplashResponse {
    results: UnsplashResult[];
}

export async function searchWebImages(query: string): Promise<ScrapedImage[]> {
    const params = new URLSearchParams({ query, per_page: "20" });
    try {
        const res = await fetch(`${UNSPLASH}?${params}`, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(8_000),
        });
        if (!res.ok) return [];
        const data = (await res.json()) as UnsplashResponse;
        return (data.results ?? []).map((r) => ({
            id: `unsplash-${r.id}`,
            title: r.alt_description ?? query,
            url: r.urls.regular,
            thumbnail: r.urls.thumb,
            creator: r.user.name,
            license: "Unsplash",
            width: r.width,
            height: r.height,
            foreign_landing_url: r.links.html,
        }));
    } catch {
        return [];
    }
}
