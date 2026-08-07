const OPENVERSE = "https://api.openverse.org/v1/images/";

export interface OpenverseImage {
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

interface OpenverseResponse {
    result_count: number;
    page_count: number;
    results: Array<{
        id: string;
        title: string;
        url: string;
        thumbnail: string;
        creator: string;
        license: string;
        license_url: string;
        width: number;
        height: number;
        foreign_landing_url: string;
        mature: boolean;
    }>;
}

export async function searchOpenverse(query: string, pageSize = 12): Promise<OpenverseImage[]> {
    const params = new URLSearchParams({ q: query, page_size: String(pageSize), mature: "false" });
    const res = await fetch(`${OPENVERSE}?${params}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as OpenverseResponse;
    return data.results
        .filter((r) => !r.mature)
        .map((r) => ({
            id: r.id,
            title: r.title,
            url: r.url,
            thumbnail: r.thumbnail,
            creator: r.creator,
            license: r.license,
            width: r.width,
            height: r.height,
            foreign_landing_url: r.foreign_landing_url,
        }));
}
