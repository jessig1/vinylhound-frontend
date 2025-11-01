export type SearchItem = {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  subtitle?: string;
  href?: string;
  url?: string;
  [key: string]: unknown;
};

export type SectionResult = {
  name: string;
  items: SearchItem[];
};

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "/api"
).replace(/\/$/, "");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toItems(value: unknown): SearchItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord) as SearchItem[];
}

function normaliseSections(payload: unknown): SectionResult[] {
  if (Array.isArray(payload)) {
    if (payload.every(isRecord)) {
      // Interpret as an array of section descriptors
      const sections = payload
        .map((entry, index) => {
          const name =
            typeof entry.section === "string"
              ? entry.section
              : typeof entry.name === "string"
              ? entry.name
              : `Section ${index + 1}`;
          const items = toItems(entry.items ?? entry.results ?? entry.data ?? entry.entries);

          if (items.length === 0) {
            return null;
          }

          return { name, items };
        })
        .filter(Boolean) as SectionResult[];

      if (sections.length > 0) {
        return sections;
      }
    }

    if (payload.every(isRecord)) {
      return [{ name: "Results", items: payload as SearchItem[] }];
    }
  }

  if (isRecord(payload)) {
    if (Array.isArray(payload.sections)) {
      return normaliseSections(payload.sections);
    }

    if (Array.isArray(payload.results)) {
      const grouped = new Map<string, SearchItem[]>();

      payload.results.forEach((entry) => {
        if (!isRecord(entry)) {
          return;
        }

        const sectionName =
          typeof entry.section === "string" ? entry.section : typeof entry.type === "string" ? entry.type : "Results";
        if (!grouped.has(sectionName)) {
          grouped.set(sectionName, []);
        }

        grouped.get(sectionName)!.push(entry as SearchItem);
      });

      return Array.from(grouped.entries()).map(([name, items]) => ({ name, items }));
    }

    const sections = Object.entries(payload)
      .map(([name, value]) => ({ name, items: toItems(value) }))
      .filter((section) => section.items.length > 0);

    if (sections.length > 0) {
      return sections;
    }
  }

  return [];
}

function buildUrl(path: string, query: Record<string, string>): string {
  const base = `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const searchParams = new URLSearchParams(query);
  const queryString = searchParams.toString();

  return queryString.length > 0 ? `${base}?${queryString}` : base;
}

export async function search(query: string, { signal }: { signal?: AbortSignal } = {}): Promise<SectionResult[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const response = await fetch(buildUrl("/search", { q: trimmed }), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Search request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return normaliseSections(payload);
}
