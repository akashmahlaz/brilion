import { createFileRoute } from "@tanstack/react-router";
import { StartAuthJS } from "start-authjs";
import { authConfig } from "#/server/auth";

const { GET, POST } = StartAuthJS(authConfig);

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        console.log(`[AUTH HANDLER] GET ${url.pathname}${url.search}`);
        console.log(`[AUTH HANDLER] GET headers:`, Object.fromEntries(request.headers.entries()));
        try {
          const res = await GET({ request, response: new Response() });
          console.log(`[AUTH HANDLER] GET response: ${res.status} ${res.statusText}`);
          console.log(`[AUTH HANDLER] GET response headers:`, Object.fromEntries(res.headers.entries()));
          return res;
        } catch (err) {
          console.error(`[AUTH HANDLER] GET error:`, err);
          throw err;
        }
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        console.log(`[AUTH HANDLER] POST ${url.pathname}${url.search}`);
        console.log(`[AUTH HANDLER] POST headers:`, Object.fromEntries(request.headers.entries()));
        // Clone request to read body for logging without consuming it
        const clone = request.clone();
        try {
          const bodyText = await clone.text();
          console.log(`[AUTH HANDLER] POST body:`, bodyText.substring(0, 500));
        } catch {}
        try {
          const res = await POST({ request, response: new Response() });
          console.log(`[AUTH HANDLER] POST response: ${res.status} ${res.statusText}`);
          console.log(`[AUTH HANDLER] POST response headers:`, Object.fromEntries(res.headers.entries()));
          return res;
        } catch (err) {
          console.error(`[AUTH HANDLER] POST error:`, err);
          throw err;
        }
      },
    },
  },
});
