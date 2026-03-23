import { toolDefinition, chat } from "@tanstack/ai";
import { z } from "zod";
import { resolveModel } from "../providers";

/**
 * Create the structured_output tool — lets the AI produce structured JSON data
 * using a schema the AI defines at runtime.
 */
export function createStructuredOutputTool(userId: string) {
  return toolDefinition({
    name: "structured_output",
    description:
      "Generate structured JSON data from a prompt. Use when you need to produce well-typed data like lists, tables, analyses, or any structured information. You describe the schema you want and the data to extract.",
    inputSchema: z.object({
      prompt: z.string().describe("What data to generate or extract"),
      schemaDescription: z.string().describe("Description of the JSON structure wanted, e.g. 'array of objects with name, email, role fields'"),
    }),
  }).server(async ({ prompt, schemaDescription }: { prompt: string; schemaDescription: string }) => {
    try {
      const adapter = await resolveModel("gpt-4.1-mini", userId).catch(() =>
        resolveModel(undefined, userId)
      );

      const result = await chat({
        adapter,
        messages: [
          {
            role: "user",
            content: `Generate a valid JSON response for this request:\n\n${prompt}\n\nThe output must be a JSON object matching this schema: ${schemaDescription}\n\nRespond ONLY with valid JSON, no markdown fences, no explanation.`,
          },
        ],
        systemPrompts: ["You are a structured data generator. Always respond with valid JSON only. No markdown, no explanation, just the JSON."],
        tools: [],
        stream: false,
      }) as string;

      // Try to parse the result as JSON
      const cleaned = result.replace(/^```json?\n?|\n?```$/g, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        return { data: parsed, raw: cleaned };
      } catch {
        return { data: null, raw: cleaned, warning: "Response was not valid JSON" };
      }
    } catch (e) {
      return { error: `Structured output failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  });
}
