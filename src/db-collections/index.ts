import {
  createCollection,
  localOnlyCollectionOptions,
} from '@tanstack/react-db'
import { z } from 'zod'

// ─── Chat Messages (demo/streaming) ──────────────────

const MessageSchema = z.object({
  id: z.number(),
  text: z.string(),
  user: z.string(),
})

export type Message = z.infer<typeof MessageSchema>

export const messagesCollection = createCollection(
  localOnlyCollectionOptions({
    getKey: (message) => message.id,
    schema: MessageSchema,
  }),
)

// ─── Notifications (real-time in-app) ────────────────

const NotificationSchema = z.object({
  id: z.string(),
  type: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string(),
  message: z.string().optional(),
  timestamp: z.number(),
  read: z.boolean(),
})

export type ClientNotification = z.infer<typeof NotificationSchema>

export const notificationsCollection = createCollection(
  localOnlyCollectionOptions({
    getKey: (n) => n.id,
    schema: NotificationSchema,
  }),
)

// ─── Live Log Entries (streaming tail) ───────────────

const LogEntrySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  level: z.enum(['info', 'warn', 'error', 'debug']),
  source: z.string(),
  message: z.string(),
})

export type ClientLogEntry = z.infer<typeof LogEntrySchema>

export const logsCollection = createCollection(
  localOnlyCollectionOptions({
    getKey: (l) => l.id,
    schema: LogEntrySchema,
  }),
)

// ─── Conversation Summaries (reactive sidebar) ───────

const ConversationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  channel: z.enum(['web', 'whatsapp', 'telegram']),
  messageCount: z.number(),
  updatedAt: z.string(),
})

export type ClientConversation = z.infer<typeof ConversationSummarySchema>

export const conversationsCollection = createCollection(
  localOnlyCollectionOptions({
    getKey: (c) => c.id,
    schema: ConversationSummarySchema,
  }),
)
