import { UserSkill } from "../models/user-skill";
import { connectDB } from "../db";

/**
 * Built-in starter skills that get auto-installed for new users.
 * These demonstrate the skill system and provide useful defaults.
 */
const DEFAULT_SKILLS = [
  {
    name: "daily-digest",
    description: "Generate a daily summary of tasks, events, and priorities",
    category: "productivity",
    content: `---
name: daily-digest
description: Generate a daily summary of tasks, events, and priorities
emoji: 📋
hooks:
  - heartbeat_start
---

# Daily Digest Skill

When the user asks for a "daily digest", "morning briefing", or "what's on today":

1. Check USER.md for known tasks, projects, and deadlines
2. Search memory for recent conversations and commitments
3. Format a structured daily briefing:

## Morning Briefing
### Priority Tasks
- List top 3-5 tasks based on urgency and deadlines

### Recent Context  
- Key decisions or discussions from yesterday
- Open questions that need follow-up

### Reminders
- Upcoming deadlines within the next 48 hours
- Scheduled meetings or events mentioned previously

Keep it concise and actionable. Use bullet points.`,
  },
  {
    name: "meeting-notes",
    description: "Capture, format, and summarize meeting notes",
    category: "productivity",
    content: `---
name: meeting-notes
description: Capture, format, and summarize meeting notes
emoji: 📝
---

# Meeting Notes Skill

When the user shares meeting notes, says "summarize this meeting", or asks to "take notes":

1. Extract key information:
   - **Attendees**: Who was mentioned
   - **Decisions**: Any decisions made
   - **Action Items**: Tasks assigned with owners and deadlines
   - **Key Topics**: Main discussion points

2. Format as structured notes:

## Meeting Summary
**Date**: [today's date]
**Topic**: [inferred from content]

### Key Decisions
- [Decision 1]

### Action Items
- [ ] [Task] — Owner: [name] — Due: [date if mentioned]

### Notes
- [Key discussion points]

3. Save important action items to USER.md using write_workspace_file
4. Offer to set reminders for deadlines`,
  },
  {
    name: "code-reviewer",
    description: "Review code for bugs, security issues, and best practices",
    category: "development",
    content: `---
name: code-reviewer
description: Review code for bugs, security issues, and best practices
emoji: 🔍
---

# Code Review Skill

When the user shares code and asks for a review:

1. **Security Scan**: Check for common vulnerabilities (injection, XSS, auth issues, secrets in code)
2. **Bug Detection**: Look for logic errors, off-by-one, null references, race conditions
3. **Best Practices**: Evaluate naming, structure, error handling, performance
4. **Suggestions**: Provide specific, actionable improvements with code examples

Format your review as:

## Code Review

### 🔴 Critical Issues
- [Security/bug issues that must be fixed]

### 🟡 Warnings  
- [Best practice violations, potential issues]

### 🟢 Suggestions
- [Nice-to-have improvements]

### ✅ What's Good
- [Positive aspects to reinforce]

Be specific — reference line numbers and show corrected code snippets.`,
  },
  {
    name: "web-monitor",
    description: "Monitor websites for changes and send alerts",
    category: "automation",
    content: `---
name: web-monitor
description: Monitor websites for changes and send alerts
emoji: 🌐
---

# Web Monitor Skill

When the user asks to monitor a website or check for updates:

1. Use web_request to fetch the target URL
2. Extract relevant content (prices, availability, text changes)
3. Compare with previously stored state (check USER.md or memory)
4. Report changes clearly

## Usage Examples
- "Monitor [url] for price changes"
- "Check if [product] is back in stock"  
- "Watch [page] for updates"

## Monitoring Approach
1. Fetch current state with web_request
2. Search memory for previous state: memory_search("web monitor [url]")
3. Compare and report differences
4. Save current state to workspace for future comparison

Always tell the user what you found and whether anything changed.`,
  },
  {
    name: "email-drafter",
    description: "Draft professional emails matching the user's style",
    category: "communication",
    content: `---
name: email-drafter
description: Draft professional emails matching the user's style
emoji: ✉️
---

# Email Drafter Skill

When the user asks to write, draft, or compose an email:

1. Check USER.md and SOUL.md for:
   - User's name and title
   - Communication style preferences
   - Signature format
   - Known contacts and relationships

2. Draft the email with:
   - **Subject Line**: Clear, specific, action-oriented
   - **Opening**: Appropriate greeting based on relationship
   - **Body**: Clear purpose, key points, call to action
   - **Closing**: Professional sign-off matching user's style

3. Offer variations:
   - Formal vs. casual
   - Shorter vs. more detailed

4. Remember the user's email preferences in USER.md

Match the user's writing style from SOUL.md. If unsure, default to professional but warm.`,
  },
];

/**
 * Install default skills for a new user.
 * Skips skills that already exist (idempotent).
 */
export async function installDefaultSkills(userId: string): Promise<number> {
  await connectDB();

  let installed = 0;
  for (const skill of DEFAULT_SKILLS) {
    const exists = await UserSkill.findOne({ userId, name: skill.name });
    if (exists) continue;

    await UserSkill.create({
      userId,
      name: skill.name,
      description: skill.description,
      content: skill.content,
      category: skill.category,
      isEnabled: true,
      createdBy: "system",
    });
    installed++;
  }

  return installed;
}

/**
 * Get list of available default skill names (for UI display).
 */
export function getDefaultSkillCatalog() {
  return DEFAULT_SKILLS.map((s) => ({
    name: s.name,
    description: s.description,
    category: s.category,
  }));
}
