import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { resolveProviderKey } from "../auth-profiles";

const TAVILY_API_URL = "https://api.tavily.com/search";

export const tavilySearch = toolDefinition({
  name: "tavily_search",
  description:
    "Search the web using Tavily API. Returns relevant search results with snippets. Use this when the user asks about current events, factual questions, or anything that requires up-to-date information.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    searchDepth: z
      .enum(["basic", "advanced"])
      .optional()
      .describe("Search depth — basic is faster, advanced is more thorough"),
    maxResults: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe("Maximum number of results (1-10)"),
    includeAnswer: z
      .boolean()
      .optional()
      .describe("Whether to include a direct AI-generated answer"),
  }),
}).server(async ({
    query,
    searchDepth = "basic",
    maxResults = 5,
    includeAnswer = true,
  }) => {
    const apiKey = await resolveProviderKey("tavily");
    if (!apiKey) {
      return {
        error:
          "Tavily API key not configured. Add it in Settings → API Keys with provider 'tavily'.",
      };
    }

    const res = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: searchDepth,
        max_results: maxResults,
        include_answer: includeAnswer,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: `Tavily API error (${res.status}): ${text}` };
    }

    const data = await res.json();
    return {
      answer: data.answer || null,
      results: (data.results || []).map(
        (r: { title: string; url: string; content: string; score: number }) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          relevanceScore: r.score,
        })
      ),
      query,
    };
  },
);
