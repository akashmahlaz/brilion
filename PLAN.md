# Brilion — Product & Business Plan

> **Version:** 1.0 · **Date:** March 2026 · **Status:** Internal Draft
> **One-liner:** The AI operating system that automates your entire digital life — no setup, no API keys, just describe what you want.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision](#2-product-vision)
3. [Architecture & AI Provider Strategy](#3-architecture--ai-provider-strategy)
4. [Sarvam AI Integration](#4-sarvam-ai-integration)
5. [Multi-Model AI Gateway](#5-multi-model-ai-gateway)
6. [Platform Integrations ("Connect" Pattern)](#6-platform-integrations-connect-pattern)
7. [Voice & Telephony](#7-voice--telephony)
8. [Browser-Based Advantage](#8-browser-based-advantage)
9. [Skill Ecosystem & ClawHub Bridge](#9-skill-ecosystem--clawhub-bridge)
10. [Feature Roadmap](#10-feature-roadmap)
11. [Business Model & Revenue](#11-business-model--revenue)
12. [Market Analysis & Competitive Landscape](#12-market-analysis--competitive-landscape)
13. [Financial Projections](#13-financial-projections)
14. [Investment Strategy](#14-investment-strategy)
15. [Go-To-Market](#15-go-to-market)
16. [Risk Analysis](#16-risk-analysis)
17. [Technical Appendix](#17-technical-appendix)

---

## 1. Executive Summary

**Brilion** is a multi-tenant SaaS **Personal AI Operating System** built on the OpenClaw open-source core. It delivers a single, unified AI interface that connects to every tool a person or business uses — Office apps, social media, trading platforms, code repos, communication channels — and automates workflows across all of them through natural language.

**The core insight:** Users shouldn't need to configure AI providers, learn prompt engineering, or manage API keys. They open Brilion, describe what they want in plain language, and the AI does it — calling the right models, tools, and services behind the scenes.

**Key differentiators:**
- **Zero-config AI** — We provide all AI models (chat, vision, voice, video, image) through our gateway. Users never see an API key.
- **34,000+ skills** — Bridge to ClawHub marketplace + curated Brilion catalog, installable in one click.
- **Platform hub** — Connect any service (Office 365, Google, social media, trading, coding) and the AI operates on it.
- **Voice-first call centers** — Buy phone numbers, let AI answer, make outbound calls. Full Twilio/Telnyx integration.
- **Browser-native** — No desktop app needed. Works everywhere, leverages server-side browser automation for web tasks.
- **Multilingual from day one** — Sarvam AI integration for 22 Indian languages + English, covering 1.4B people.

---

## 2. Product Vision

### What Users See

```
┌─────────────────────────────────────────────────────────┐
│  BRILION                                                │
├──────────┬──────────────────────────────────────────────┤
│ Chat     │  ┌────────────────────────────────────────┐  │
│ Office   │  │  "Schedule a meeting with Priya for    │  │
│ Social   │  │   Thursday, draft a PowerPoint about   │  │
│ Trading  │  │   Q1 results, and post the summary     │  │
│ Coding   │  │   on LinkedIn"                         │  │
│ Channels │  │                                        │  │
│ Skills   │  │  ✅ Meeting created on Google Calendar  │  │
│ Agents   │  │  ✅ PowerPoint draft ready (3 slides)   │  │
│ Phone    │  │  ✅ LinkedIn post drafted — approve?     │  │
│ Config   │  └────────────────────────────────────────┘  │
│ Logs     │  [Type a message...]              🎤 📎 ➤  │
└──────────┴──────────────────────────────────────────────┘
```

### The "Connect" Pattern

Every platform tab follows a consistent UX:

1. **User clicks a platform** (e.g., "Office" → "PowerPoint")
2. **"Connect" button** — OAuth/API key flow
3. **Connected state** — AI now has access. Rich info panel shows:
   - Recent documents/activity
   - Quick actions ("Create new presentation", "Export to PDF")
   - Usage stats and insights
4. **AI can now operate** — "Open my latest PowerPoint and add a slide about revenue"

This pattern scales to **any** platform without unique UI per service.

---

## 3. Architecture & AI Provider Strategy

### Core Principle: Users Never Configure AI

```
┌── User ──┐     ┌── Brilion Gateway ──┐     ┌── AI Providers ──────┐
│           │     │                      │     │                      │
│  "Make a  │────▶│  Model Router        │────▶│  Sarvam AI (default) │
│   video"  │     │  ┌─────────────┐     │     │  Anthropic (Claude)  │
│           │     │  │ Task Detect  │     │     │  OpenAI (GPT)        │
│           │◀────│  │ Model Pick   │     │◀────│  Google (Gemini)     │
│  [video]  │     │  │ Fallback     │     │     │  Mistral             │
│           │     │  └─────────────┘     │     │  xAI (Grok)          │
└───────────┘     └──────────────────────┘     │  Kling AI (video)    │
                                               │  ElevenLabs (voice)  │
                                               └──────────────────────┘
```

### Smart Model Router

The gateway selects the best model per task:

| Task | Default Provider | Fallback | Why |
|------|-----------------|----------|-----|
| Chat (English) | Sarvam 105B (FREE) | Claude Sonnet | Free tier keeps costs zero |
| Chat (Indian languages) | Sarvam 105B | Sarvam 30B | Best Indic language support |
| Reasoning/Complex | Claude Opus 4 | GPT-4.1 | Frontier reasoning |
| Code generation | Claude Sonnet 4 | GPT-4.1 | Best code quality |
| Vision/OCR | Sarvam Vision | GPT-4o | ₹1.50/page is very cheap |
| Image generation | DALL-E 3 | Flux Pro | Established quality |
| Video generation | Kling AI 3.0 | Sora 2 | Best video quality |
| Text-to-Speech | Sarvam Bulbul v3 | ElevenLabs | 10 Indian languages |
| Speech-to-Text | Sarvam STT | Whisper | ₹30/hour, 22 languages |
| Translation | Sarvam Translate | Google Translate | 22 Indian languages |
| Web search | Tavily / Brave | Perplexity | Structured search results |

### Cost Optimization

The key insight: **Sarvam AI offers FREE chat completions** (both 105B and 30B models). This means:

- **Base chat cost = ₹0** for the majority of conversations
- Only pay for premium tasks (video, image, complex reasoning)
- Sarvam's TTS/STT is 5-10x cheaper than alternatives for Indian languages
- We mark up premium operations while keeping basic chat free

---

## 4. Sarvam AI Integration

### Why Sarvam AI

Sarvam AI (sarvam.ai) is India's full-stack sovereign AI platform. They provide exactly what Brilion needs:

| API | Capability | Pricing | Brilion Use |
|-----|-----------|---------|-------------|
| **Chat Completions** | sarvam-105b, sarvam-30b, sarvam-m | **FREE** (per token) | Default chat model — zero cost |
| **Chat (32K context)** | sarvam-105b-32k, sarvam-30b-16k | **FREE** | Long conversations, document analysis |
| **Text-to-Speech** | Bulbul v3 (10 languages) | ₹30/10K chars | Voice replies, audio content |
| **Speech-to-Text** | Saaras (22 languages) | ₹30/hour | Voice messages, call transcription |
| **STT + Translate** | Transcribe + translate in one call | ₹30/hour | Multilingual voice notes |
| **Translation** | 22 Indian languages + English | ₹20/10K chars | Real-time message translation |
| **Transliteration** | Script conversion | ₹20/10K chars | Hindi ↔ Hinglish |
| **Language Detection** | Auto-detect language | ₹3.50/10K chars | Auto-route to correct model |
| **Vision** | Document digitization, image analysis | ₹1.50/page | OCR, document processing |

### API Integration

Sarvam uses **OpenAI-compatible** `/v1/chat/completions` endpoint:

```
POST https://api.sarvam.ai/v1/chat/completions
Authorization: Bearer <sarvam_api_key>

{
  "model": "sarvam-105b",
  "messages": [...],
  "stream": true,
  "tools": [...],       // ← function calling supported
  "reasoning_effort": "high",  // ← built-in reasoning mode
  "wiki_grounding": true       // ← Wikipedia-grounded responses
}
```

### Sarvam-Specific Features to Leverage

1. **Wiki Grounding** — `wiki_grounding: true` gives factual, sourced answers without needing search tools
2. **Reasoning Effort** — `reasoning_effort: "high"` for complex tasks, `"low"` for fast chat
3. **Tool Calling** — Full function calling support, compatible with our AG-UI pipeline
4. **Streaming** — SSE streaming for real-time chat UX
5. **SOC 2 + ISO certified** — Enterprise-grade security for B2B customers

### Cost Example (1,000 active users)

| API | Monthly Usage | Cost |
|-----|--------------|------|
| Chat Completions | 500K messages | **₹0** (free) |
| TTS (voice replies) | 50K messages × 200 chars = 10M chars | ₹30,000 |
| STT (voice notes) | 5,000 hours of audio | ₹150,000 |
| Translation | 20M characters | ₹40,000 |
| Vision | 10,000 pages | ₹15,000 |
| **Total Sarvam cost** | | **₹235,000/mo (~$2,800)** |

That's $2.80/user/month for unlimited chat + all voice/vision features.

---

## 5. Multi-Model AI Gateway

### Available Models (Real, Validated)

Brilion will only allow switching to **actually available** models. The model router validates against live provider APIs:

**Chat Models:**
- Sarvam: sarvam-105b, sarvam-105b-32k, sarvam-30b, sarvam-30b-16k, sarvam-m
- Anthropic: claude-sonnet-4-20250514, claude-opus-4-20250514, claude-haiku-3-20250307
- OpenAI: gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-4o, o4-mini
- Google: gemini-2.5-pro, gemini-2.5-flash
- Mistral: mistral-large-latest, mistral-medium-latest
- xAI: grok-3, grok-3-mini

**Specialty Models:**
- Image: dall-e-3, flux-pro, stable-diffusion-3.5
- Video: kling-v3, sora-2
- Voice: bulbul-v3, elevenlabs-multilingual-v2, openai-tts-1
- Code: claude-sonnet-4 (recommended), codestral

### User Model Switching (Fixed)

When the AI switches models, it now **validates against real available models** before confirming. No more "switched to gpt-15" errors — the system checks provider APIs and rejects invalid models with suggestions.

---

## 6. Platform Integrations ("Connect" Pattern)

### Tier 1 — Launch (Q2 2026)

| Platform | Connect Via | AI Capabilities |
|----------|-----------|-----------------|
| **Google Workspace** | OAuth 2.0 | Calendar (CRUD), Gmail (read/send/draft), Docs (view/edit), YouTube (upload/manage) |
| **Microsoft Office 365** | OAuth 2.0 (MS Graph) | Outlook (email), PowerPoint (create/edit), Word (document ops), Excel (data), Teams (messages) |
| **WhatsApp** | Baileys (already built) | Send/receive messages, voice notes, group management |
| **Telegram** | grammY (already built) | Full bot + group management |

### Tier 2 — Growth (Q3 2026)

| Platform | Connect Via | AI Capabilities |
|----------|-----------|-----------------|
| **LinkedIn** | OAuth 2.0 | Post content, manage connections, job search |
| **Twitter/X** | OAuth 2.0 | Tweet, schedule, analyze trends, DMs |
| **Instagram** | Meta Graph API | Post images/reels, manage comments, analytics |
| **Facebook** | Meta Graph API | Page management, ads, Marketplace |
| **GitHub** | OAuth + Personal Token | Repos, PRs, issues, code review, deploy |
| **Vercel/Netlify** | API tokens | Deploy, manage domains, view analytics |

### Tier 3 — Enterprise (Q4 2026)

| Platform | Connect Via | AI Capabilities |
|----------|-----------|-----------------|
| **Binance/Zerodha** | API keys | Portfolio tracking, trade execution (with confirmation) |
| **Slack** | OAuth | Workspace management, message automation |
| **Discord** | Bot token | Server management, moderation |
| **Notion** | OAuth | Page CRUD, database queries |
| **Shopify** | OAuth | Order management, inventory, customer support |
| **Stripe** | API key | Payment tracking, invoice generation |
| **HubSpot/Salesforce** | OAuth | CRM automation, lead management |

### The "Office" Tab Deep Dive

```
┌─────────────────────────────────────────────────────────────┐
│  📎 Office                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ 📊 PowerPoint│  │ 📝 Word     │  │ 📈 Excel    │        │
│  │  Connected ✅│  │  Connected ✅│  │  Connect 🔗 │        │
│  │  12 decks   │  │  47 docs    │  │              │        │
│  │  Last: 2h   │  │  Last: 1d   │  │  Click to    │        │
│  └─────────────┘  └─────────────┘  │  authorize   │        │
│                                     └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ 📧 Outlook  │  │ 👥 Teams    │  │ 📓 OneNote  │        │
│  │  Connected ✅│  │  Connect 🔗 │  │  Connect 🔗 │        │
│  │  3 unread   │  │              │  │              │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ── Recent Activity ──────────────────────────────────     │
│  📊 Q1 Revenue Deck — edited 2 hours ago                    │
│  📝 Project Brief v3 — shared with team yesterday           │
│  📧 4 emails need reply — oldest is from Priya (urgent)     │
│                                                             │
│  ── Quick Actions ────────────────────────────────────     │
│  [Create Presentation] [Draft Email] [Summarize Docs]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Voice & Telephony

### The Vision

Users buy a phone number through Brilion. The AI answers calls, makes calls, and handles conversations — perfect for:

- **Call centers** — AI handles first-line support in 22 Indian languages
- **Personal assistant** — "Call the restaurant and book a table for 4 tonight"
- **Sales automation** — Outbound calls to leads with AI-driven conversation
- **Appointment reminders** — "Call Mrs. Sharma at 3 PM to confirm her appointment"

### Architecture

```
┌── Caller ──┐     ┌── Twilio ──────┐     ┌── Brilion ─────────┐
│             │     │                │     │                     │
│  Phone call │────▶│  Webhook       │────▶│  STT (Sarvam)       │
│  "+91..."   │     │  Media Stream  │     │  ↓                  │
│             │     │                │     │  AI Processing       │
│             │◀────│  TTS Stream    │◀────│  ↓                  │
│  [Hears AI] │     │                │     │  TTS (Sarvam Bulbul) │
└─────────────┘     └────────────────┘     └─────────────────────┘
```

### Provider Options

| Provider | Strength | Pricing | Integration |
|----------|----------|---------|-------------|
| **Twilio** | Most established, global numbers | $1/month/number + $0.0085/min | OpenClaw extension exists |
| **Telnyx** | Cheaper, good for India | Lower per-minute | Extension exists |
| **Plivo** | India-focused, competitive | ₹0.50/min India | Extension exists |
| **Exotel** | India enterprise standard | Custom | Potential partner |

### Revenue per Call Center Client

- Client buys 10 numbers: ₹500/month to provider, ₹2,000/month to us
- Handles 5,000 calls/month: ~833 hours of audio
- STT cost: 833 × ₹30 = ₹25,000
- TTS cost: ~10M chars = ₹30,000
- Total cost to us: ~₹55,000
- We charge: ₹150,000/month
- **Margin: ~63%**

---

## 8. Browser-Based Advantage

### OpenClaw Uses Chromium — We Don't Need It

OpenClaw ships with a full Chromium sandbox (Dockerfile.sandbox-browser) for:
- Web scraping and automation
- Browser control (CDP protocol)
- Screenshot capture
- Form filling

**Brilion's approach is different:** Since we're a browser-based SaaS, we can:

1. **Server-side browser pool** — Headless Chromium instances in containers for web automation tasks
2. **No client install** — Users access from any browser, any device
3. **API-first** — Most automation is through APIs (MS Graph, Google APIs) rather than browser automation
4. **Fallback to browser** — When no API exists, use server-side Chromium to interact with websites

### What This Means for Users

- No desktop app to install
- Works on mobile browsers
- AI can browse the web on the user's behalf (server-side)
- Screenshot verification before actions ("Here's what I'm about to click — proceed?")

### When to Use Browser Automation

| Scenario | Approach |
|----------|----------|
| Google Calendar CRUD | Google Calendar API (fast, reliable) |
| LinkedIn post | LinkedIn API (if available) or browser automation |
| Fill a government form | Server-side Chromium + AI vision |
| Monitor a website for changes | Headless browser with periodic checks |
| Scrape competitor pricing | Browser + extraction pipeline |

---

## 9. Skill Ecosystem & ClawHub Bridge

### Current State (Built)

| Component | Status | Description |
|-----------|--------|-------------|
| ClawHub API Client | ✅ Built | HTTP bridge to 34,744 skills |
| Skill Installer | ✅ Built | Install from ClawHub + raw content |
| Skill Discovery Tool | ✅ Built | AI searches both local catalog + ClawHub |
| Catalog (30 curated) | ✅ Built | Brilion-curated skill database |
| Marketplace UI | ✅ Built | Browse trending, search, one-click install |
| Auto-Skill Creator | ✅ Built | AI creates skills from natural language |

### How It Works for Users

1. User says: "I want to track my expenses"
2. AI searches both Brilion catalog and ClawHub marketplace
3. Finds "expense-tracker" skill (4,200 installs, ★47)
4. Offers to install → User says "yes" → Installed in 2 seconds
5. AI now has expense tracking instructions loaded → Immediately functional

---

## 10. Feature Roadmap

### Phase 1: Foundation (Current — Q1 2026) ✅

- [x] Chat with multi-model support (Anthropic, OpenAI, Google, Mistral, xAI)
- [x] WhatsApp + Telegram channels
- [x] Skill ecosystem with ClawHub bridge (34K+ skills)
- [x] Dashboard tabs (Google, Social, Trading, Coding)
- [x] Chat sidebar expand/collapse with hotkeys
- [x] Model switching with validation

### Phase 2: AI Provider & Platform Hub (Q2 2026)

- [ ] **Sarvam AI integration** — Default free chat model + TTS/STT/Translate
- [ ] **Smart model router** — Auto-pick best model per task
- [ ] **Office 365 integration** — PowerPoint, Word, Excel, Outlook, Teams
- [ ] **Google Workspace deep integration** — Beyond calendar (Docs, Sheets, Slides)
- [ ] **Platform "Connect" pattern** — Unified OAuth flow for all services
- [ ] **MCP server bridge** — Dynamic tool registration without restart

### Phase 3: Voice & Communication (Q3 2026)

- [ ] **Twilio/Plivo integration** — Buy numbers, AI-powered calling
- [ ] **Inbound call handling** — STT → AI → TTS in real-time
- [ ] **Outbound calls** — AI makes calls on user's behalf
- [ ] **Discord + Slack channels** — Full integration from OpenClaw
- [ ] **Email channel** — Gmail/Outlook as AI communication channel
- [ ] **Signal + iMessage** — Encrypted messaging support

### Phase 4: Media & Enterprise (Q4 2026)

- [ ] **Video generation** — Kling AI 3.0 + Sora 2 integration
- [ ] **Image generation** — Enhanced with Flux Pro, DALL-E 3
- [ ] **Server-side browser automation** — Headless Chromium for web tasks
- [ ] **Multi-agent routing** — Specialized agents per domain
- [ ] **Enterprise accounts** — Team management, shared credits, audit logs
- [ ] **Shopify/Stripe integration** — E-commerce automation

### Phase 5: Scale & Monetize (2027)

- [ ] **Mobile app** — React Native (Expo) with push notifications
- [ ] **White-label** — Businesses deploy their own branded Brilion
- [ ] **Marketplace revenue** — Skill authors earn from installs
- [ ] **Canvas/Whiteboard** — Visual collaboration with AI
- [ ] **Workflow builder** — Visual automation like Zapier, but AI-native
- [ ] **Plugin SDK** — Third-party developers build integrations

---

## 11. Business Model & Revenue

### Revenue Streams

| Stream | Model | Target % of Revenue |
|--------|-------|-------------------|
| **Subscription (B2C)** | Freemium → Pro → Premium | 40% |
| **Enterprise licenses (B2B)** | Per-seat + usage | 30% |
| **Call center / Telephony** | Per-minute + number fees | 15% |
| **Marketplace commission** | 20% cut on paid skills | 5% |
| **API access** | Usage-based for developers | 5% |
| **White-label** | One-time + monthly | 5% |

### Pricing Tiers (B2C)

| Tier | Price | Includes | Target |
|------|-------|----------|--------|
| **Free** | ₹0 | 50 messages/day, 1 channel, basic model (Sarvam 30B) | Trial users |
| **Pro** | ₹999/month (~$12) | Unlimited chat, 3 channels, all models, TTS/STT, 5 platform connects | Power users |
| **Premium** | ₹2,999/month (~$36) | Everything + phone numbers, call handling, priority models, video gen | Professionals |
| **Business** | ₹9,999/month (~$120) | 10 seats, API access, custom skills, SLA, dedicated support | Small teams |

### Pricing Tiers (B2B Enterprise)

| Tier | Price | Use Case |
|------|-------|----------|
| **Startup** | ₹25,000/month | Up to 50 agents, basic integrations |
| **Growth** | ₹75,000/month | 200 agents, all channels, call center |
| **Enterprise** | Custom | Unlimited, on-prem option, custom models, SLA |

### Unit Economics

| Metric | Value |
|--------|-------|
| Cost per free user | ~₹0 (Sarvam free tier) |
| Cost per Pro user | ~₹150/month (AI + infra) |
| Cost per Premium user | ~₹400/month |
| Pro user LTV (24 months) | ₹24,000 |
| CAC target | ₹3,000 |
| LTV/CAC ratio | 8:1 |

---

## 12. Market Analysis & Competitive Landscape

### Total Addressable Market

| Segment | India TAM | Global TAM |
|---------|----------|-----------|
| AI assistants (B2C) | $2.5B by 2028 | $35B by 2028 |
| Contact center AI | $1.2B by 2028 | $18B by 2028 |
| Business automation | $3.8B by 2028 | $45B by 2028 |
| **Total opportunity** | **$7.5B** | **$98B** |

### Competitive Landscape

| Competitor | Strength | Weakness | Brilion Edge |
|-----------|----------|----------|-------------|
| **ChatGPT** | Best LLM, brand recognition | No integrations, no automation, no Indian languages | Full platform integration, Sarvam for Indic |
| **Google Gemini** | Deep Google integration | Locked to Google ecosystem | Multi-platform, open |
| **Claude** | Best reasoning | Chat-only, no actions | Action-oriented, tool calling |
| **OpenClaw** | Open-source, desktop, 26 channels | Self-hosted, technical users only | Managed SaaS, zero-config, business-ready |
| **Zapier/Make** | Workflow automation | No AI intelligence, config-heavy | Natural language → automation |
| **Sarvam Samvaad** | Indian language voice agents | Enterprise-only, no general AI | Consumer + enterprise, full-stack |
| **Bland.ai/Vapi** | AI phone calls | Phone-only, no platform integration | Calls + chat + platforms + everything |

### Why We Win

1. **India-first** — Sarvam's free models + 22 languages = unbeatable cost for 1.4B people
2. **Actions, not just chat** — We don't just answer questions, we DO things
3. **Open-source core** — OpenClaw's 26 channels + 34K skills = no one can match breadth
4. **Platform hub** — One AI for Office, Social, Trading, Coding, Phone = replacement for 10 apps
5. **Zero-config** — Users never see an API key, model name, or configuration screen

---

## 13. Financial Projections

### Year 1 (2026-2027)

| Quarter | Users | Paying Users | MRR | Costs | Net |
|---------|-------|-------------|-----|-------|-----|
| Q2 2026 | 5,000 | 200 | ₹200K | ₹150K | ₹50K |
| Q3 2026 | 25,000 | 1,500 | ₹1.5M | ₹600K | ₹900K |
| Q4 2026 | 80,000 | 5,000 | ₹5M | ₹1.8M | ₹3.2M |
| Q1 2027 | 200,000 | 15,000 | ₹15M | ₹4.5M | ₹10.5M |

### Year 1 Summary

| Metric | Target |
|--------|--------|
| Total users | 200,000 |
| Paying users | 15,000 (7.5% conversion) |
| ARR | ₹180M (~$2.1M) |
| Burn rate | ₹4.5M/month |
| Runway needed | ₹54M (~$650K) for 12 months |

### Year 2 (2027-2028) — Growth

| Metric | Target |
|--------|--------|
| Total users | 2M |
| Paying users | 120,000 |
| B2B clients | 200 |
| ARR | ₹2.4B (~$29M) |
| Gross margin | 65% |
| EBITDA | ₹600M profitable |

### Year 3 (2028-2029) — Scale

| Metric | Target |
|--------|--------|
| Total users | 10M |
| Paying users | 600,000 |
| B2B clients | 1,500 |
| ARR | ₹12B (~$144M) |
| Gross margin | 72% |
| Valuation target | ₹120B (~$1.4B) at 10x revenue |

---

## 14. Investment Strategy

### Seed Round (Immediate — Q2 2026)

| Detail | Value |
|--------|-------|
| **Raising** | $500K - $1M |
| **Valuation** | $5M pre-money |
| **Use of funds** | 60% Engineering (4 devs), 20% AI costs, 10% infra, 10% marketing |
| **Milestones** | 25K users, Office integration, Sarvam integration, voice calling MVP |
| **Timeline** | 6 months |

### Series A (Q1 2027)

| Detail | Value |
|--------|-------|
| **Raising** | $5M - $8M |
| **Valuation** | $30-50M |
| **Use of funds** | 50% Engineering (15 devs), 20% sales, 15% AI costs, 15% ops |
| **Milestones** | 200K users, 15K paying, 50 B2B clients, profitable unit economics |
| **Timeline** | 12-18 months |

### Series B (2028)

| Detail | Value |
|--------|-------|
| **Raising** | $25M - $40M |
| **Valuation** | $200-400M |
| **Use of funds** | Global expansion, mobile app, enterprise sales team, white-label |
| **Milestones** | 2M users, 200 B2B, $29M ARR |

### Potential Investors (India-focused)

- **Accel India** — Early-stage AI bets (backed Flipkart, Swiggy)
- **Peak XV (Sequoia India)** — Enterprise SaaS focus
- **Lightspeed India** — AI-native companies
- **Blume Ventures** — Developer tools, SaaS
- **Nexus Venture Partners** — Infrastructure + AI
- **Together Fund** — Pre-seed/seed for AI startups
- **Sarvam AI** — Strategic investor (we're their distribution channel)

### Strategic Partnership Opportunities

| Partner | Value Exchange |
|---------|---------------|
| **Sarvam AI** | We distribute their models to millions; they give us priority API access + credits |
| **Twilio** | We bring call center clients; they provide discounted minutes |
| **Microsoft** | We drive Office 365 adoption in India; they provide Startup credits |
| **ClawHub/OpenClaw** | We're the largest SaaS distribution of their ecosystem |

---

## 15. Go-To-Market

### Phase 1: Developer & Power User (Q2 2026)

- **Channel:** Product Hunt, Hacker News, Twitter/X, Dev.to
- **Hook:** "ChatGPT that actually DOES things — connects to your tools and automates"
- **Target:** Indie hackers, developers, content creators
- **Metric:** 25,000 signups in 3 months

### Phase 2: WhatsApp India (Q3 2026)

- **Channel:** WhatsApp forwards, Instagram Reels, YouTube shorts
- **Hook:** "Type in Hindi, get things done — your AI assistant that speaks your language"
- **Target:** Indian professionals (25-45), small business owners
- **Metric:** 100,000 users (viral loop via WhatsApp sharing)

### Phase 3: B2B Call Centers (Q4 2026)

- **Channel:** Direct sales, LinkedIn outreach, industry events
- **Hook:** "Replace 50 call center agents with AI that speaks 22 languages — 90% cost reduction"
- **Target:** BPOs, insurance firms, banks, e-commerce customer support
- **Metric:** 50 enterprise contracts

### Phase 4: Enterprise & Global (2027)

- **Channel:** Sales team, partnership channel, G2 reviews
- **Hook:** "The AI operating system for your business — connects everything, automates anything"
- **Target:** Mid-market companies (100-5000 employees)
- **Metric:** 200 enterprise clients, global expansion started

---

## 16. Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Sarvam changes pricing | Medium | High | Multi-provider fallback, negotiate contract early |
| OpenClaw license change | Low | High | Fork is legal (MIT), maintain independent codebase |
| Competition from ChatGPT/Gemini adding actions | High | Medium | Move fast, platform integrations are our moat |
| Twilio costs spike | Medium | Medium | Multi-provider (Telnyx, Plivo), negotiate volume discounts |
| API provider downtime | Medium | Medium | Automatic failover between providers |
| Data privacy/compliance (India DPDP Act) | Medium | High | Data residency in India, Sarvam is sovereign |
| User trust for financial/trading actions | Medium | High | Confirmation flows, sandbox mode, audit logs |
| Scaling infrastructure costs | High | Medium | Optimize with caching, edge deployment, spot instances |

---

## 17. Technical Appendix

### Current Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | TanStack Start (React 19 + Vite 7 + Nitro SSR) |
| **UI** | shadcn/ui (new-york style) + Tailwind CSS 4 + Radix UI |
| **Auth** | Auth.js with JWT (Google, LinkedIn, Credentials) |
| **Database** | MongoDB + Mongoose 9 |
| **API** | oRPC + tRPC + REST |
| **AI** | Vercel AI SDK 6 (Anthropic, OpenAI, Google, Mistral, xAI) |
| **Messaging** | grammY (Telegram), Baileys (WhatsApp) |
| **Skills** | ClawHub bridge (34K+), Brilion catalog (30 curated) |

### To Add

| Component | Technology | Priority |
|-----------|-----------|----------|
| **Sarvam AI** | Direct HTTP client (OpenAI-compatible) | P0 |
| **MS Graph** | @microsoft/microsoft-graph-client | P0 |
| **Twilio** | twilio SDK | P1 |
| **Kling AI** | REST API client | P2 |
| **Browser automation** | Playwright (server-side) | P2 |
| **Redis** | BullMQ job queues (already partially built) | P1 |
| **Mobile** | Expo + React Native | P3 |

### Key API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/chat` | AG-UI streaming chat with multi-model support |
| `GET/POST /api/skills` | Skill CRUD, ClawHub browse/install |
| `POST /api/channels` | Channel management (WhatsApp, Telegram, etc.) |
| `GET/POST /api/config` | User configuration, AI persona |
| `POST /api/voice/call` | Initiate AI phone call (planned) |
| `POST /api/connect/:platform` | OAuth flow for platform integrations (planned) |

---

## Summary

Brilion is positioned to be the **default AI interface for India's digital workforce** — not by being the smartest AI (that's Sarvam/Anthropic/OpenAI's job), but by being the **best connected** AI. The one that:

1. Speaks your language (22 Indian languages, free)
2. Connects to your tools (Office, Social, Trading, Code)
3. Makes phone calls on your behalf
4. Automates what you describe in plain words
5. Costs nothing to start and scales with you

**The goal is simple:** When someone in India (and eventually the world) thinks "I need AI to help me work" — they think Brilion.

---

*This document is a living plan. Updated as the product evolves.*
