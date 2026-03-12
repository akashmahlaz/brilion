# Brilion — AI Gateway Dashboard

## Project Stack
- **Framework:** TanStack Start (React 19 + Vite 7 + Nitro SSR)
- **UI:** shadcn/ui (new-york style) + Tailwind CSS 4 + Radix UI
- **Auth:** Auth.js with JWT (Google, LinkedIn, Credentials)
- **Database:** MongoDB + Mongoose 9
- **API:** oRPC + tRPC + REST
- **AI:** Vercel AI SDK 6 (Anthropic, OpenAI, Google, Mistral, xAI)
- **Messaging:** grammY (Telegram), Baileys (WhatsApp)

## Design System Rules

### Component Patterns
- Use **shadcn/ui components** exclusively for all UI — no custom replacements
- Follow shadcn composition: `CardHeader` > `CardTitle` > `CardDescription` > `CardContent` > `CardFooter`
- Use `cn()` for conditional classes (from `#/lib/utils`)
- Use semantic colors: `bg-primary`, `text-muted-foreground` — never raw colors like `bg-blue-500`
- Use `size-*` when width = height (e.g., `size-10` not `w-10 h-10`)
- Use `gap-*` with flex, never `space-x-*` / `space-y-*`

### Scrolling
- For chat/log views: use native `overflow-y-auto` with `min-h-0` in flex containers
- Never rely on Radix ScrollArea for scroll-position-dependent logic
- Always pair `flex-1` with `overflow-hidden` or `min-h-0` on parents

### Routing
- File-based routes in `src/routes/` using TanStack Router
- Layout route: `_app.tsx` wraps authenticated pages with Sidebar + Header
- Route naming: `_app.<page>.tsx` for dashboard pages
- Run `bunx @tanstack/router-cli generate` after adding/removing routes

### API Conventions
- Use `apiFetch()` from `#/lib/api` for all client → server calls
- API routes live in `src/routes/api/`
- Server-side DB logic in `src/server/`

### Architecture (OpenClaw-inspired)
Navigation order: Overview, Chat, Channels, Sessions, Agents, Config, Skills, Cron, Nodes, Logs, Usage, Debug

### Fonts
- Body: Plus Jakarta Sans
- Headings: Space Grotesk (`font-heading`)
- Code: JetBrains Mono (`font-mono`)
