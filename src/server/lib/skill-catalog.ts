import { SkillCatalog } from "../models/skill-catalog";
import { connectDB } from "../db";

/**
 * Curated skill catalog — available for all users to browse and install.
 * Sourced from Brilion defaults, OpenClaw-compatible skills, and community.
 *
 * These are NOT auto-installed. Users browse the catalog and choose what to install.
 * Each skill uses existing Brilion tools (web_request, github, tavily_search, memory, etc.)
 */
const CATALOG_SKILLS = [
  // ── Productivity ──────────────────────────────────────────────
  {
    slug: "daily-digest",
    name: "Daily Digest",
    description: "Generate a daily summary of tasks, events, and priorities",
    emoji: "📋",
    category: "productivity",
    source: "builtin",
    featured: true,
    sortOrder: 1,
    tags: ["morning", "briefing", "tasks", "summary"],
    requires: ["memory"],
    content: `---
name: daily-digest
description: Generate a daily summary of tasks, events, and priorities
emoji: 📋
---

# Daily Digest

When the user asks for a "daily digest", "morning briefing", or "what's on today":

1. Check USER.md for known tasks, projects, and deadlines
2. Search memory for recent conversations and commitments
3. Format a structured daily briefing with priority tasks, recent context, and reminders
4. Keep it concise and actionable with bullet points`,
  },
  {
    slug: "meeting-notes",
    name: "Meeting Notes",
    description: "Capture, format, and summarize meeting notes with action items",
    emoji: "📝",
    category: "productivity",
    featured: true,
    sortOrder: 2,
    tags: ["meeting", "notes", "summary", "action-items"],
    requires: ["memory"],
    source: "builtin",
    content: `---
name: meeting-notes
description: Capture, format, and summarize meeting notes
emoji: 📝
---

# Meeting Notes

When the user shares meeting notes or asks to "take notes":

1. Extract attendees, decisions, action items (with owners + deadlines), key topics
2. Format as structured notes with Meeting Summary, Key Decisions, Action Items, Notes sections
3. Save action items to USER.md using write_workspace_file
4. Offer to set reminders for deadlines`,
  },
  {
    slug: "email-drafter",
    name: "Email Drafter",
    description: "Draft professional emails matching the user's style and tone",
    emoji: "✉️",
    category: "communication",
    featured: true,
    sortOrder: 3,
    tags: ["email", "writing", "draft", "professional"],
    requires: [],
    source: "builtin",
    content: `---
name: email-drafter
description: Draft professional emails matching the user's style
emoji: ✉️
---

# Email Drafter

When the user asks to write, draft, or compose an email:

1. Check USER.md and SOUL.md for the user's name, title, communication style, and signature
2. Draft email with clear subject, appropriate greeting, key points, call to action, professional sign-off
3. Offer variations: formal vs casual, shorter vs detailed
4. Match the user's writing style from SOUL.md`,
  },

  // ── Development ───────────────────────────────────────────────
  {
    slug: "code-reviewer",
    name: "Code Reviewer",
    description: "Review code for bugs, security issues, and best practices",
    emoji: "🔍",
    category: "development",
    featured: true,
    sortOrder: 4,
    tags: ["code", "review", "security", "bugs", "best-practices"],
    requires: [],
    source: "builtin",
    content: `---
name: code-reviewer
description: Review code for bugs, security, and best practices
emoji: 🔍
---

# Code Reviewer

When the user shares code for review:

1. **Security Scan**: Check for injection, XSS, auth issues, secrets in code
2. **Bug Detection**: Logic errors, off-by-one, null refs, race conditions
3. **Best Practices**: Naming, structure, error handling, performance
4. **Suggestions**: Specific, actionable improvements with code examples

Format: 🔴 Critical, 🟡 Warnings, 🟢 Suggestions, ✅ What's Good`,
  },
  {
    slug: "vercel-deploy",
    name: "Vercel Deploy",
    description: "Deploy and manage projects on Vercel via API",
    emoji: "▲",
    category: "development",
    sortOrder: 10,
    tags: ["vercel", "deploy", "hosting", "ci-cd"],
    requires: ["web_request", "vercel token"],
    source: "builtin",
    content: `---
name: vercel-deploy
description: Deploy and manage Vercel projects using the Vercel API
emoji: ▲
---

# Vercel Deployment

Use **web_request** tool with tokenProvider: "vercel" and API base https://api.vercel.com

Common operations:
- List projects: GET /v9/projects
- Create deployment: POST /v13/deployments with gitSource
- Set env var: POST /v10/projects/{id}/env
- Get domains: GET /v9/projects/{id}/domains
- List deployments: GET /v6/deployments?projectId={id}

Always check if vercel token is configured. Guide user to Settings → API Keys if not.`,
  },
  {
    slug: "netlify-deploy",
    name: "Netlify Deploy",
    description: "Deploy and manage sites on Netlify via API",
    emoji: "🌐",
    category: "development",
    sortOrder: 11,
    tags: ["netlify", "deploy", "hosting"],
    requires: ["web_request", "netlify token"],
    source: "builtin",
    content: `---
name: netlify-deploy
description: Deploy and manage Netlify sites using the Netlify API
emoji: 🌐
---

# Netlify Deployment

Use **web_request** with tokenProvider: "netlify" and base https://api.netlify.com/api/v1

Common operations:
- List sites: GET /sites
- List deploys: GET /sites/{id}/deploys
- Trigger build hook: POST the build hook URL
- Set env: PATCH /sites/{id} with build_settings.env

Check netlify token first. Guide user to Settings → API Keys if not configured.`,
  },
  {
    slug: "github-pr-manager",
    name: "GitHub PR Manager",
    description: "Manage pull requests, reviews, and CI status on GitHub",
    emoji: "🐙",
    category: "development",
    sortOrder: 12,
    tags: ["github", "pull-request", "ci", "code-review"],
    requires: ["github"],
    source: "openclaw",
    content: `---
name: github-pr-manager
description: Manage GitHub PRs, reviews, and CI pipelines
emoji: 🐙
---

# GitHub PR Manager

When user asks about PRs, code reviews, or CI:

1. Use github tools to list PRs, check CI status, read review comments
2. Summarize PR status: open/merged/closed, review status, CI pass/fail
3. Help draft PR descriptions and review comments
4. Monitor CI runs and report failures
5. Help resolve merge conflicts by analyzing file changes`,
  },

  // ── Automation ────────────────────────────────────────────────
  {
    slug: "web-monitor",
    name: "Web Monitor",
    description: "Monitor websites for changes — prices, availability, content updates",
    emoji: "🌐",
    category: "automation",
    featured: true,
    sortOrder: 5,
    tags: ["monitor", "scrape", "prices", "availability", "alerts"],
    requires: ["web_request", "memory"],
    source: "builtin",
    content: `---
name: web-monitor
description: Monitor websites for changes and send alerts
emoji: 🌐
---

# Web Monitor

When user asks to monitor a website:

1. Use web_request to fetch the target URL
2. Extract relevant content (prices, availability, text)
3. Compare with stored state from memory
4. Report changes clearly
5. Save current state via memory for future comparison`,
  },
  {
    slug: "webhook-handler",
    name: "Webhook Handler",
    description: "Process incoming webhook events and trigger automated responses",
    emoji: "🔔",
    category: "automation",
    sortOrder: 20,
    tags: ["webhook", "trigger", "automation", "events"],
    requires: [],
    source: "builtin",
    content: `---
name: webhook-handler
description: Process webhook payloads and trigger actions
emoji: 🔔
---

# Webhook Handler

When processing a webhook event:

1. Parse the payload (GitHub push, Stripe payment, form submission, etc.)
2. Identify the event type and extract key data
3. Determine appropriate action based on event type
4. Execute the action (notify user, update records, trigger downstream API calls)
5. Confirm completion or report issues`,
  },
  {
    slug: "cron-scheduler",
    name: "Cron Scheduler",
    description: "Set up recurring automated tasks — reminders, reports, checks",
    emoji: "⏰",
    category: "automation",
    sortOrder: 21,
    tags: ["cron", "schedule", "recurring", "reminder", "automated"],
    requires: [],
    source: "builtin",
    content: `---
name: cron-scheduler
description: Manage scheduled and recurring automated tasks
emoji: ⏰
---

# Cron Scheduler

When user wants recurring tasks:

1. Ask what they want automated and how often
2. Set up the cron job with the right schedule expression
3. Define what the task does (check status, send digest, monitor prices, etc.)
4. Confirm the schedule and first run time
5. Offer to list/edit/delete existing cron jobs`,
  },

  // ── Communication ─────────────────────────────────────────────
  {
    slug: "whatsapp-assistant",
    name: "WhatsApp Assistant",
    description: "Manage WhatsApp messages, contacts, and groups",
    emoji: "📱",
    category: "communication",
    sortOrder: 30,
    tags: ["whatsapp", "messaging", "contacts"],
    requires: ["whatsapp"],
    source: "builtin",
    content: `---
name: whatsapp-assistant
description: Help manage WhatsApp conversations and contacts
emoji: 📱
---

# WhatsApp Assistant

When user asks about WhatsApp:

1. Check connection status and help connect if needed
2. Help compose messages with the right tone
3. Summarize conversation history when asked
4. Help manage contact lists and groups
5. Draft broadcast messages`,
  },
  {
    slug: "social-media-manager",
    name: "Social Media Manager",
    description: "Draft posts, manage content calendar, and analyze engagement",
    emoji: "📣",
    category: "communication",
    sortOrder: 31,
    tags: ["social", "twitter", "linkedin", "instagram", "facebook", "content"],
    requires: ["web_request"],
    source: "builtin",
    content: `---
name: social-media-manager
description: Draft social posts, manage content calendar, analyze engagement
emoji: 📣
---

# Social Media Manager

When user needs social media help:

1. Draft posts optimized for each platform (Twitter/X: concise, LinkedIn: professional, Instagram: visual + hashtags)
2. Maintain a content calendar in USER.md
3. Suggest posting schedules based on audience
4. Help with hashtag research using web search
5. Use web_request to interact with platform APIs when tokens are configured`,
  },

  // ── Search & Research ─────────────────────────────────────────
  {
    slug: "deep-researcher",
    name: "Deep Researcher",
    description: "Multi-source research — web search, academic papers, news analysis",
    emoji: "🔬",
    category: "search",
    featured: true,
    sortOrder: 6,
    tags: ["research", "search", "analysis", "academic", "news"],
    requires: ["tavily_search", "web_request"],
    source: "builtin",
    content: `---
name: deep-researcher
description: Multi-source research with analysis and synthesis
emoji: 🔬
---

# Deep Researcher

When user asks to research a topic:

1. Perform multiple tavily_search queries from different angles
2. Cross-reference sources for accuracy
3. Synthesize findings into a structured report:
   - Executive Summary
   - Key Findings (with source links)
   - Analysis & Implications
   - Open Questions
4. Save research to memory for future reference`,
  },
  {
    slug: "weather",
    name: "Weather",
    description: "Get current weather and forecasts for any location",
    emoji: "☔",
    category: "search",
    sortOrder: 40,
    tags: ["weather", "forecast", "temperature"],
    requires: ["web_request"],
    source: "openclaw",
    content: `---
name: weather
description: Get current weather and forecasts for any location
emoji: ☔
---

# Weather Skill

When user asks about weather:

1. Use web_request to fetch from https://wttr.in/{location}?format=j1 (JSON)
   or https://api.open-meteo.com/v1/forecast for detailed data
2. Present: temperature, conditions, humidity, wind
3. Include tomorrow's forecast if asked
4. No API key needed — wttr.in and Open-Meteo are free`,
  },

  // ── Writing ───────────────────────────────────────────────────
  {
    slug: "content-writer",
    name: "Content Writer",
    description: "Write blog posts, articles, copy with SEO optimization",
    emoji: "✍️",
    category: "writing",
    sortOrder: 50,
    tags: ["blog", "article", "copywriting", "seo", "content"],
    requires: ["tavily_search"],
    source: "builtin",
    content: `---
name: content-writer
description: Write blog posts, articles, and copy with SEO optimization
emoji: ✍️
---

# Content Writer

When user asks to write content:

1. Research the topic with tavily_search for current context
2. Create an outline based on top-ranking content structure
3. Write with: compelling headline, engaging intro, structured body with H2/H3s, strong conclusion + CTA
4. Optimize for SEO: target keywords, meta description suggestion, internal linking opportunities
5. Match tone from SOUL.md if available`,
  },
  {
    slug: "summarizer",
    name: "Summarizer",
    description: "Summarize articles, documents, videos, and long conversations",
    emoji: "🧾",
    category: "writing",
    sortOrder: 51,
    tags: ["summarize", "tldr", "digest", "extract"],
    requires: ["web_request"],
    source: "openclaw",
    content: `---
name: summarizer
description: Summarize content from URLs, documents, conversations
emoji: 🧾
---

# Summarizer

When user asks to summarize:

1. If URL: fetch with web_request, extract main content
2. If pasted text: process directly
3. Generate: TL;DR (1-2 sentences), Key Points (bullet list), Detailed Summary (3-5 paragraphs)
4. For long conversations: extract decisions, action items, key themes
5. Offer different levels: brief / standard / detailed`,
  },
  {
    slug: "translator",
    name: "Translator",
    description: "Translate text between languages with cultural context",
    emoji: "🌍",
    category: "writing",
    sortOrder: 52,
    tags: ["translate", "language", "i18n", "localization"],
    requires: [],
    source: "builtin",
    content: `---
name: translator
description: Translate text with cultural context and nuance
emoji: 🌍
---

# Translator

When user asks to translate:

1. Detect source language automatically
2. Translate preserving tone, idioms, and cultural context
3. Note any phrases that don't translate directly
4. For formal/business text: maintain professional register
5. For casual text: use natural, colloquial equivalents
6. Offer alternative translations for ambiguous phrases`,
  },

  // ── Finance ───────────────────────────────────────────────────
  {
    slug: "expense-tracker",
    name: "Expense Tracker",
    description: "Track expenses, categorize spending, and generate reports",
    emoji: "💰",
    category: "finance",
    sortOrder: 60,
    tags: ["expense", "budget", "spending", "money", "finance"],
    requires: ["memory"],
    source: "builtin",
    content: `---
name: expense-tracker
description: Track and categorize expenses
emoji: 💰
---

# Expense Tracker

When user mentions expenses or spending:

1. Extract: amount, category, date, description, payment method
2. Store in memory with searchable tags
3. Categories: food, transport, shopping, utilities, entertainment, health, subscriptions, other
4. On request: generate spending summary by category, period, or trend
5. Alert if spending in a category seems unusually high compared to history`,
  },
  {
    slug: "crypto-tracker",
    name: "Crypto Tracker",
    description: "Track cryptocurrency prices, portfolio, and market trends",
    emoji: "₿",
    category: "finance",
    sortOrder: 61,
    tags: ["crypto", "bitcoin", "ethereum", "trading", "portfolio"],
    requires: ["web_request"],
    source: "builtin",
    content: `---
name: crypto-tracker
description: Track crypto prices and market trends
emoji: ₿
---

# Crypto Tracker

When user asks about crypto:

1. Fetch prices from CoinGecko API (free, no key): web_request GET https://api.coingecko.com/api/v3/simple/price?ids={coins}&vs_currencies=usd
2. For market data: /coins/{id}/market_chart?vs_currency=usd&days=7
3. Show: current price, 24h change, 7d trend
4. If user has a portfolio stored in USER.md, calculate total value and P&L
5. Never give financial advice — present data only`,
  },

  // ── Data ──────────────────────────────────────────────────────
  {
    slug: "data-analyzer",
    name: "Data Analyzer",
    description: "Analyze CSV/JSON data — statistics, patterns, insights",
    emoji: "📊",
    category: "data",
    sortOrder: 70,
    tags: ["data", "csv", "json", "analytics", "statistics"],
    requires: [],
    source: "builtin",
    content: `---
name: data-analyzer
description: Analyze structured data and generate insights
emoji: 📊
---

# Data Analyzer

When user shares data (CSV, JSON, tables):

1. Parse and validate the data structure
2. Calculate key statistics: count, mean, median, min/max, std deviation
3. Identify patterns, outliers, and trends
4. Generate insights in plain language
5. Suggest visualizations (describe charts to create)
6. Offer to filter, sort, or transform the data`,
  },
  {
    slug: "pdf-processor",
    name: "PDF Processor",
    description: "Extract text, summarize, and analyze PDF documents",
    emoji: "📄",
    category: "data",
    sortOrder: 71,
    tags: ["pdf", "document", "extract", "ocr"],
    requires: ["web_request"],
    source: "openclaw",
    content: `---
name: pdf-processor
description: Extract and analyze content from PDF documents
emoji: 📄
---

# PDF Processor

When user shares a PDF or asks to process one:

1. If uploaded: read the file content from the attachment
2. Extract key information: title, author, sections, tables
3. Summarize the document with key points
4. Answer specific questions about the content
5. Extract structured data (tables → JSON/CSV)`,
  },

  // ── Smart Home / IoT ─────────────────────────────────────────
  {
    slug: "smart-home",
    name: "Smart Home",
    description: "Control smart home devices — lights, thermostats, speakers",
    emoji: "🏠",
    category: "smart-home",
    sortOrder: 80,
    tags: ["smart-home", "iot", "lights", "hue", "thermostat", "alexa"],
    requires: ["web_request"],
    source: "openclaw",
    content: `---
name: smart-home
description: Control smart home devices via APIs
emoji: 🏠
---

# Smart Home

When user wants to control smart home devices:

1. Check what integrations are configured (Hue, smart speakers, thermostats)
2. Use web_request with appropriate API endpoints
3. For Philips Hue: web_request to local bridge API
4. For other devices: use manufacturer REST APIs with stored tokens
5. Common commands: lights on/off, set brightness/color, set temperature, play music`,
  },

  // ── Media ─────────────────────────────────────────────────────
  {
    slug: "image-creator",
    name: "Image Creator",
    description: "Generate images from descriptions using DALL-E",
    emoji: "🎨",
    category: "media",
    sortOrder: 90,
    tags: ["image", "dall-e", "art", "generate", "visual"],
    requires: ["image_generate"],
    source: "builtin",
    content: `---
name: image-creator
description: Generate images from text descriptions
emoji: 🎨
---

# Image Creator

When user wants to create an image:

1. Enhance the user's description into a detailed prompt (style, composition, lighting, mood)
2. Use the image_generate tool with the enhanced prompt
3. Offer style variations: photorealistic, illustration, minimalist, vintage
4. Suggest improvements based on the result
5. Remember user's style preferences in USER.md`,
  },
  {
    slug: "video-creator",
    name: "Video Creator",
    description: "Generate short videos from descriptions using Sora",
    emoji: "🎬",
    category: "media",
    sortOrder: 91,
    tags: ["video", "sora", "generate", "animation"],
    requires: ["video_generate"],
    source: "builtin",
    content: `---
name: video-creator
description: Generate short videos from text descriptions
emoji: 🎬
---

# Video Creator

When user wants to create a video:

1. Craft a detailed video prompt: scene, action, camera movement, mood, style
2. Use the video_generate tool with the prompt
3. Suggest duration and aspect ratio based on use case
4. Offer to iterate on the prompt based on results`,
  },

  // ── Notion / Notes ────────────────────────────────────────────
  {
    slug: "notion-manager",
    name: "Notion Manager",
    description: "Create and manage Notion pages, databases, and blocks",
    emoji: "📝",
    category: "productivity",
    sortOrder: 100,
    tags: ["notion", "notes", "database", "wiki", "workspace"],
    requires: ["web_request", "notion token"],
    source: "openclaw",
    content: `---
name: notion-manager
description: Manage Notion workspace via the Notion API
emoji: 📝
---

# Notion Manager

Use web_request with tokenProvider: "notion" and base https://api.notion.com/v1

Common operations:
- Search: POST /search with query
- Create page: POST /pages with parent + properties
- Get database: GET /databases/{id}
- Query database: POST /databases/{id}/query with filters
- Create block: PATCH /blocks/{id}/children

Always include Notion-Version: 2022-06-28 header.
Check if notion token is configured. Guide user to Settings → API Keys if not.`,
  },

  // ── Trello / Project Management ───────────────────────────────
  {
    slug: "trello-manager",
    name: "Trello Manager",
    description: "Manage Trello boards, lists, and cards via API",
    emoji: "📋",
    category: "productivity",
    sortOrder: 101,
    tags: ["trello", "kanban", "project", "tasks", "boards"],
    requires: ["web_request", "trello token"],
    source: "openclaw",
    content: `---
name: trello-manager
description: Manage Trello boards, lists, and cards
emoji: 📋
---

# Trello Manager

Use web_request with tokenProvider: "trello" and base https://api.trello.com/1

Common operations:
- List boards: GET /members/me/boards
- Get lists: GET /boards/{id}/lists
- Create card: POST /cards with name, idList, desc
- Move card: PUT /cards/{id} with idList
- Add comment: POST /cards/{id}/actions/comments

Check for trello token first. Guide user to Settings → API Keys if not configured.`,
  },

  // ── Spotify ───────────────────────────────────────────────────
  {
    slug: "spotify-player",
    name: "Spotify Player",
    description: "Search music, control playback, manage playlists on Spotify",
    emoji: "🎵",
    category: "media",
    sortOrder: 92,
    tags: ["spotify", "music", "playlist", "player"],
    requires: ["web_request", "spotify token"],
    source: "openclaw",
    content: `---
name: spotify-player
description: Control Spotify playback and manage playlists
emoji: 🎵
---

# Spotify Player

Use web_request with tokenProvider: "spotify" and base https://api.spotify.com/v1

Common operations:
- Search: GET /search?q={query}&type=track,artist,album
- Play: PUT /me/player/play with uris
- Pause: PUT /me/player/pause
- Current track: GET /me/player/currently-playing
- Playlists: GET /me/playlists
- Add to playlist: POST /playlists/{id}/tracks

Check for spotify token. Guide user to Settings → API Keys if not configured.`,
  },

  // ── Learning ──────────────────────────────────────────────────
  {
    slug: "study-buddy",
    name: "Study Buddy",
    description: "Create flashcards, quizzes, and study plans from any material",
    emoji: "📚",
    category: "productivity",
    sortOrder: 102,
    tags: ["study", "flashcards", "quiz", "learning", "education"],
    requires: ["memory"],
    source: "builtin",
    content: `---
name: study-buddy
description: Create study materials from any content
emoji: 📚
---

# Study Buddy

When user wants to study or learn:

1. Break the topic into key concepts
2. Create flashcards: front (question/term) → back (answer/definition)
3. Generate quiz questions (multiple choice, true/false, fill-in-blank)
4. Build a spaced-repetition schedule
5. Store progress in memory for future sessions
6. Use web search to supplement learning with current examples`,
  },
];

/**
 * Seed the global skill catalog.
 * Upserts by slug — safe to run multiple times.
 */
export async function seedSkillCatalog(): Promise<number> {
  await connectDB();

  let upserted = 0;
  for (const skill of CATALOG_SKILLS) {
    const result = await SkillCatalog.findOneAndUpdate(
      { slug: skill.slug },
      { $set: skill },
      { upsert: true, new: true }
    );
    if (result) upserted++;
  }

  return upserted;
}

/**
 * Get the full catalog for display.
 */
export async function getCatalogSkills(options?: {
  category?: string;
  search?: string;
  featured?: boolean;
}): Promise<any[]> {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (options?.category && options.category !== "all") {
    filter.category = options.category;
  }
  if (options?.featured) {
    filter.featured = true;
  }
  if (options?.search) {
    filter.$text = { $search: options.search };
  }

  return SkillCatalog.find(filter)
    .sort({ sortOrder: 1, installs: -1 })
    .lean();
}

/**
 * Get all unique categories in the catalog.
 */
export async function getCatalogCategories(): Promise<string[]> {
  await connectDB();
  return SkillCatalog.distinct("category");
}

/**
 * Increment install count for a catalog skill.
 */
export async function incrementCatalogInstalls(slug: string): Promise<void> {
  await SkillCatalog.updateOne({ slug }, { $inc: { installs: 1 } });
}
