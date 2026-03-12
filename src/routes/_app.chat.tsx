import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
  Sparkles,
  User,
  Copy,
  Check,
  Plus,
  Trash2,
  MessageCircle,
  Globe,
  ChevronDown,
  StopCircle,
} from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string
}

interface ConversationSummary {
  _id: string
  title: string
  channel: 'web' | 'whatsapp' | 'telegram'
  foreignId?: string
  model?: string
  messageCount?: number
  lastMessage?: string | null
  updatedAt: string
  createdAt: string
}

export const Route = createFileRoute('/_app/chat')({
  component: ChatPage,
})

// ─── Channel helpers ─────────────────────────────────────────────────────────
const CHANNEL_META: Record<string, { label: string; color: string; dotColor: string; icon: typeof Globe }> = {
  web: { label: 'Web', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', dotColor: 'bg-blue-500', icon: Globe },
  whatsapp: { label: 'WhatsApp', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', dotColor: 'bg-emerald-500', icon: MessageCircle },
  telegram: { label: 'Telegram', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', dotColor: 'bg-sky-500', icon: Send },
}

function ChannelBadge({ channel }: { channel: string }) {
  const meta = CHANNEL_META[channel] || CHANNEL_META.web
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${meta.color}`}>
      <Icon className="size-2.5" />
      {meta.label}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => {
            navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border text-muted-foreground hover:text-foreground transition-all"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">{copied ? 'Copied!' : 'Copy'}</TooltipContent>
    </Tooltip>
  )
}

type FilterChannel = 'all' | 'web' | 'whatsapp' | 'telegram'

// ─── Main Chat Page ──────────────────────────────────────────────────────────
function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeChannel, setActiveChannel] = useState<string>('web')
  const [filterChannel, setFilterChannel] = useState<FilterChannel>('all')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)

  // Refs — native div scroll container, NOT Radix ScrollArea
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Scroll helpers ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback((instant = false) => {
    const el = messagesContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: instant ? 'instant' : 'smooth' })
  }, [])

  const checkIfNearBottom = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return true
    const threshold = 120
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }, [])

  // Track scroll position
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const handler = () => {
      const near = checkIfNearBottom()
      setIsNearBottom(near)
      setShowScrollBtn(!near)
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [checkIfNearBottom])

  // Auto-scroll when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom()
    }
  }, [messages, isNearBottom, scrollToBottom])

  // Load conversations on mount + poll
  useEffect(() => {
    loadConversations()
    pollRef.current = setInterval(loadConversations, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Auto-refresh active channel conversations for incoming messages
  useEffect(() => {
    if (!conversationId || activeChannel === 'web') return
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/chat?id=${encodeURIComponent(conversationId)}`)
        if (res.ok) {
          const data = await res.json()
          setMessages(
            (data.messages || []).map((m: { role: string; content: string; createdAt?: string }) => ({
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
            }))
          )
        }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [conversationId, activeChannel])

  // Focus textarea when conversation changes
  useEffect(() => {
    if (!isLoading && activeChannel === 'web') {
      textareaRef.current?.focus()
    }
  }, [conversationId, isLoading, activeChannel])

  // ─── Data helpers ────────────────────────────────────────────────────────
  async function loadConversations() {
    try {
      const res = await apiFetch('/api/chat')
      if (res.ok) setConversations(await res.json())
    } catch { /* ignore */ }
  }

  async function loadConversation(id: string) {
    try {
      const res = await apiFetch(`/api/chat?id=${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setConversationId(data._id)
      setActiveChannel(data.channel || 'web')
      setMessages(
        (data.messages || []).map((m: { role: string; content: string; createdAt?: string }) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        }))
      )
      // Instant scroll when switching conversations
      requestAnimationFrame(() => scrollToBottom(true))
    } catch {
      toast.error('Failed to load conversation')
    }
  }

  async function createConversation(): Promise<string | null> {
    try {
      const res = await apiFetch('/api/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat', channel: 'web' }),
      })
      if (res.ok) {
        const data = await res.json()
        setConversationId(data._id)
        setActiveChannel('web')
        loadConversations()
        return data._id
      }
    } catch { /* ignore */ }
    return null
  }

  async function deleteConversation(id: string) {
    try {
      await apiFetch(`/api/chat?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (conversationId === id) {
        setConversationId(null)
        setMessages([])
      }
      loadConversations()
    } catch {
      toast.error('Failed to delete conversation')
    }
  }

  function startNewChat() {
    setConversationId(null)
    setActiveChannel('web')
    setMessages([])
    setInput('')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function handleAbort() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
  }

  // ─── Send message ──────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    if (activeChannel !== 'web') {
      toast.error('You can only send messages from the web chat.')
      return
    }

    const userMessage: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    // Reset scroll state so auto-scroll works during streaming
    setIsNearBottom(true)
    setShowScrollBtn(false)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      let activeConvId = conversationId
      if (!activeConvId) {
        activeConvId = await createConversation()
      }

      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          conversationId: activeConvId,
        }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error(`Server error: ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let assistantContent = ''
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: assistantContent,
          }
          return updated
        })
      }

      loadConversations()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'Failed to connect to server'
      toast.error(message)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${message}` },
      ])
    } finally {
      abortRef.current = null
      setIsLoading(false)
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [input, isLoading, messages, conversationId, activeChannel, scrollToBottom])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const filteredConversations = filterChannel === 'all'
    ? conversations
    : conversations.filter((c) => c.channel === filterChannel)

  const isChannelConversation = activeChannel !== 'web'

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100dvh-var(--header-height))] overflow-hidden">
      {/* ─── Conversation sidebar ─────────────────────────────────────── */}
      <div className="hidden md:flex w-72 flex-col border-r bg-muted/30">
        <div className="flex items-center justify-between p-3 border-b shrink-0">
          <span className="text-sm font-medium">Conversations</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" onClick={startNewChat}>
                <Plus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New chat</TooltipContent>
          </Tooltip>
        </div>

        {/* Channel filter tabs */}
        <div className="flex gap-1 p-2 border-b shrink-0">
          {(['all', 'web', 'whatsapp', 'telegram'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                filterChannel === ch
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {ch === 'all' ? 'All' : CHANNEL_META[ch]?.label || ch}
            </button>
          ))}
        </div>

        {/* Conversation list — native overflow for reliable scrolling */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-2 space-y-0.5">
            {filteredConversations.map((c) => (
              <button
                key={c._id}
                type="button"
                className={`group w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                  conversationId === c._id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                }`}
                onClick={() => loadConversation(c._id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`size-2 rounded-full shrink-0 ${CHANNEL_META[c.channel]?.dotColor || 'bg-gray-400'}`} />
                      <span className="truncate text-xs font-medium">{c.title || 'Untitled'}</span>
                    </div>
                    {c.lastMessage && (
                      <p className="text-[11px] text-muted-foreground truncate pl-3.5">
                        {c.lastMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(c.updatedAt)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(c._id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.stopPropagation(); deleteConversation(c._id) }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="size-3" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
            {filteredConversations.length === 0 && (
              <p className="px-3 py-8 text-xs text-muted-foreground text-center">
                {filterChannel === 'all' ? 'No conversations yet' : `No ${CHANNEL_META[filterChannel]?.label} conversations`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Main chat area ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Channel header bar */}
        {conversationId && (
          <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/20 shrink-0">
            <ChannelBadge channel={activeChannel} />
            <span className="text-sm font-medium truncate">
              {conversations.find(c => c._id === conversationId)?.title || 'Chat'}
            </span>
            {isChannelConversation && (
              <span className="text-xs text-muted-foreground ml-auto">
                Read-only — replies go via {CHANNEL_META[activeChannel]?.label}
              </span>
            )}
          </div>
        )}

        {/* ─── Messages container — native scroll, properly constrained ─── */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto min-h-0 overscroll-contain"
        >
          <div className="mx-auto max-w-3xl px-4 py-6">
            {/* Empty state — no conversation selected */}
            {messages.length === 0 && !conversationId && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="size-8 text-primary" />
                </div>
                <h2 className="text-xl font-heading font-semibold">How can I help you?</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Chat here or connect WhatsApp/Telegram to see all conversations in one place.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    'What can you do?',
                    'Check my channels',
                    'List available models',
                    'Help me set up WhatsApp',
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); textareaRef.current?.focus() }}
                      className="rounded-xl border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty conversation */}
            {messages.length === 0 && conversationId && (
              <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              </div>
            )}

            {/* ─── Message list ─────────────────────────────────────────── */}
            <div className="space-y-5">
              {messages.map((msg, i) => {
                if (msg.role === 'system') {
                  return (
                    <div key={i} className="flex justify-center py-1">
                      <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-3 py-1">
                        {msg.content}
                      </span>
                    </div>
                  )
                }

                const isUser = msg.role === 'user'
                return (
                  <div key={i} className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
                    {!isUser && (
                      <Avatar className="size-7 shrink-0 mt-1">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          <Sparkles className="size-3.5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`relative group max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-1.5 prose-pre:my-2 prose-pre:rounded-xl prose-code:before:content-none prose-code:after:content-none prose-code:bg-background/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs break-words">
                          <Markdown remarkPlugins={[remarkGfm]}>
                            {msg.content || '…'}
                          </Markdown>
                        </div>
                      )}
                      {msg.content && <CopyButton text={msg.content} />}
                      {msg.createdAt && (
                        <span className="block mt-1 text-[10px] opacity-50">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {isUser && (
                      <Avatar className="size-7 shrink-0 mt-1">
                        <AvatarFallback className="bg-secondary text-xs">
                          <User className="size-3.5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )
              })}

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3">
                  <Avatar className="size-7 shrink-0 mt-1">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      <Sparkles className="size-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scroll anchor — stays at very bottom */}
            <div ref={messagesEndRef} className="h-px" aria-hidden="true" />
          </div>
        </div>

        {/* Scroll to bottom FAB */}
        {showScrollBtn && (
          <div className="absolute bottom-20 right-6 z-10">
            <Button
              onClick={() => scrollToBottom()}
              size="icon"
              variant="outline"
              className="rounded-full size-9 shadow-lg"
            >
              <ChevronDown className="size-4" />
            </Button>
          </div>
        )}

        {/* ─── Input Area — pinned to bottom ──────────────────────────── */}
        <div className="border-t bg-background/95 backdrop-blur-sm p-3 shrink-0">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isChannelConversation ? `Viewing ${CHANNEL_META[activeChannel]?.label} — reply happens there` : 'Message…'}
              rows={1}
              className="min-h-[42px] max-h-[160px] resize-none rounded-2xl text-sm"
              disabled={isLoading || isChannelConversation}
            />
            {isLoading ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleAbort}
                    size="icon"
                    variant="destructive"
                    className="shrink-0 rounded-xl size-[42px]"
                  >
                    <StopCircle className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Stop generating</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isChannelConversation}
                size="icon"
                className="shrink-0 rounded-xl size-[42px]"
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
