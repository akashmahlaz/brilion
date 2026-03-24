/**
 * ClawHub API Client — Bridge to the ClawHub skill marketplace (34,000+ skills).
 *
 * Public REST API at https://clawhub.ai/api/v1/
 * Docs: https://github.com/openclaw/clawhub/blob/main/docs/cli.md
 *
 * No auth required for search/browse/download — ClawHub skills are MIT-0 licensed.
 */

const CLAWHUB_BASE = "https://clawhub.ai";
const API_BASE = `${CLAWHUB_BASE}/api/v1`;
const REQUEST_TIMEOUT = 15_000;

// ─── Types ──────────────────────────────────────────────

export interface ClawHubSkill {
  slug: string;
  displayName: string;
  ownerHandle: string;
  summary: string;
  stats: {
    downloads: number;
    stars: number;
    versions: number;
  };
  badges?: {
    highlighted?: boolean;
    official?: boolean;
  };
  latestVersion?: string;
  updatedAt?: string;
}

export interface ClawHubSearchResult {
  skills: ClawHubSkill[];
  total: number;
}

export interface ClawHubSkillDetail extends ClawHubSkill {
  files?: Array<{ path: string; size: number }>;
  parsed?: {
    name?: string;
    description?: string;
    emoji?: string;
    metadata?: Record<string, unknown>;
  };
}

// ─── Helpers ────────────────────────────────────────────

async function clawHubFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "brilion-agent/1.0",
        ...options?.headers,
      },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeQuery(query: string): string {
  // Strip anything that isn't alphanumeric, spaces, hyphens, or dots
  return query.replace(/[^\w\s\-\.]/g, "").trim().slice(0, 200);
}

// ─── Search ─────────────────────────────────────────────

/**
 * Search ClawHub marketplace using their vector search.
 * Maps to: `GET /api/v1/search?q=...`
 */
export async function searchClawHubSkills(
  query: string,
  limit = 20
): Promise<ClawHubSearchResult> {
  const q = sanitizeQuery(query);
  if (!q) return { skills: [], total: 0 };

  try {
    const res = await clawHubFetch(
      `/search?q=${encodeURIComponent(q)}&limit=${limit}`
    );

    if (!res.ok) {
      console.warn(`[clawhub] Search failed: ${res.status}`);
      return { skills: [], total: 0 };
    }

    const data = await res.json();

    // Normalize response — ClawHub may return skills in various formats
    const skills: ClawHubSkill[] = normalizeSkillList(data);

    return { skills, total: skills.length };
  } catch (err) {
    console.warn("[clawhub] Search error:", err);
    return { skills: [], total: 0 };
  }
}

// ─── Browse / Explore ───────────────────────────────────

/**
 * Browse popular/trending skills.
 * Maps to: `GET /api/v1/skills?limit=...&sort=...`
 */
export async function exploreClawHubSkills(options?: {
  limit?: number;
  sort?: "newest" | "downloads" | "installs" | "trending" | "stars";
}): Promise<ClawHubSkill[]> {
  const limit = options?.limit ?? 25;
  const sort = options?.sort ?? "downloads";

  try {
    const res = await clawHubFetch(`/skills?limit=${limit}&sort=${sort}`);

    if (!res.ok) {
      console.warn(`[clawhub] Explore failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return normalizeSkillList(data);
  } catch (err) {
    console.warn("[clawhub] Explore error:", err);
    return [];
  }
}

// ─── Get Skill Detail ───────────────────────────────────

/**
 * Get full skill detail including version info.
 * Maps to: `GET /api/v1/skills/{slug}`
 */
export async function getClawHubSkill(
  slug: string
): Promise<ClawHubSkillDetail | null> {
  const safeSlug = slug.replace(/[^a-z0-9\-]/gi, "").slice(0, 100);
  if (!safeSlug) return null;

  try {
    const res = await clawHubFetch(`/skills/${encodeURIComponent(safeSlug)}`);

    if (!res.ok) return null;

    const data = await res.json();
    return normalizeSkillDetail(data);
  } catch (err) {
    console.warn(`[clawhub] Get skill "${slug}" error:`, err);
    return null;
  }
}

// ─── Download SKILL.md Content ──────────────────────────

/**
 * Fetch the SKILL.md content for a given skill slug.
 *
 * Strategy:
 * 1. Try the ClawHub download/file API
 * 2. Fall back to the GitHub backup mirror (openclaw/clawhub-skills-backup)
 * 3. Fall back to raw skill page scraping
 */
export async function getClawHubSkillContent(
  slug: string
): Promise<string | null> {
  const safeSlug = slug.replace(/[^a-z0-9\-]/gi, "").slice(0, 100);
  if (!safeSlug) return null;

  // Strategy 1: ClawHub API file endpoint
  try {
    const res = await clawHubFetch(
      `/skills/${encodeURIComponent(safeSlug)}/files/SKILL.md`
    );
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 10) return text;
    }
  } catch {
    /* try next strategy */
  }

  // Strategy 2: Try download endpoint (returns zip — extract SKILL.md)
  try {
    const res = await clawHubFetch(
      `/download?slug=${encodeURIComponent(safeSlug)}`
    );
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      // If it returns text directly (some endpoints do)
      if (contentType.includes("text") || contentType.includes("markdown")) {
        const text = await res.text();
        if (text && text.length > 10) return text;
      }
      // If zip, we need to extract — for now skip and try fallback
    }
  } catch {
    /* try next strategy */
  }

  // Strategy 3: GitHub backup mirror
  const backupUrls = [
    `https://raw.githubusercontent.com/openclaw/clawhub-skills-backup/main/${safeSlug}/SKILL.md`,
    `https://raw.githubusercontent.com/openclaw/clawhub-skills-backup/main/skills/${safeSlug}/SKILL.md`,
  ];

  for (const url of backupUrls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "brilion-agent/1.0" },
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 10) return text;
      }
    } catch {
      /* try next */
    }
  }

  // Strategy 4: Fetch the skill detail page and try to extract content
  try {
    const detail = await getClawHubSkill(safeSlug);
    if (detail?.parsed) {
      // Build a minimal SKILL.md from parsed metadata
      return buildSkillMdFromMeta(safeSlug, detail);
    }
  } catch {
    /* no content available */
  }

  return null;
}

// ─── Normalizers ────────────────────────────────────────

function normalizeSkillList(data: any): ClawHubSkill[] {
  // Handle multiple possible response shapes
  const items = Array.isArray(data)
    ? data
    : data?.skills || data?.results || data?.items || [];

  return items
    .map((item: any) => normalizeSkillItem(item))
    .filter(Boolean) as ClawHubSkill[];
}

function normalizeSkillItem(item: any): ClawHubSkill | null {
  if (!item) return null;

  return {
    slug: item.slug || item.name || "",
    displayName:
      item.displayName ||
      item.name ||
      item.slug ||
      "",
    ownerHandle: item.ownerHandle || item.owner || item.author || "unknown",
    summary:
      item.summary ||
      item.description ||
      item.parsed?.description ||
      "",
    stats: {
      downloads:
        item.stats?.downloads || item.downloads || item.installCount || 0,
      stars: item.stats?.stars || item.stars || item.stargazers_count || 0,
      versions: item.stats?.versions || 0,
    },
    badges: {
      highlighted: item.badges?.highlighted != null,
      official: item.badges?.official != null,
    },
    latestVersion: item.latestVersion || item.version || undefined,
    updatedAt: item.updatedAt || item.updated_at || undefined,
  };
}

function normalizeSkillDetail(data: any): ClawHubSkillDetail {
  const base = normalizeSkillItem(data.skill || data) as ClawHubSkill;
  return {
    ...base,
    files: data.files || data.skill?.files || [],
    parsed: data.parsed || data.skill?.parsed || undefined,
  };
}

function buildSkillMdFromMeta(
  slug: string,
  detail: ClawHubSkillDetail
): string {
  const name = detail.parsed?.name || detail.displayName || slug;
  const desc = detail.parsed?.description || detail.summary || "";
  const emoji = detail.parsed?.emoji || "🔧";

  return `---
name: ${name}
description: ${desc}
emoji: ${emoji}
---

# ${name}

${desc}

*Installed from ClawHub marketplace — originally by @${detail.ownerHandle}*
`;
}
