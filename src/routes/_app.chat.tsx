import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  StopCircle,
  ArrowUp,
  Zap,
  MessageSquare,
  Globe,
  Lightbulb,
  Search,
  Plus,
  Trash2,
  MessageCircle,
  Send,
  CheckCircle2,
  Circle,
  Wifi,
  WifiOff,
} from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
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
  lastMessage?: string | null
  updatedAt: string
  createdAt: string
}

export const Route = createFileRoute('/_app/chat')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) || undefined,
  }),
  component: ChatPage,
})

// ─── Channel config ──────────────────────────────────────────────────────────
const CHANNEL_META: Record<string, { label: string; icon: typeof Globe; color: string; dotColor: string }> = {
  web: { label: 'Web Chat', icon: Globe, color: 'text-blue-600', dotColor: 'bg-blue-500' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-600', dotColor: 'bg-emerald-500' },
  telegram: { label: 'Telegram', icon: Send, color: 'text-sky-600', dotColor: 'bg-sky-500' },
}

// ─── Copy button ─────────────────────────────────────────────────────────────
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
          className="opacity-0 group-hover:opacity-100 absolute -bottom-3 right-2 p-1 rounded-lg bg-white/90 border border-gray-200/60 text-gray-400 hover:text-gray-700 shadow-sm transition-all"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{copied ? 'Copied!' : 'Copy'}</TooltipContent>
    </Tooltip>
  )
}

// ─── Time formatting ─────────────────────────────────────────────────────────
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

// ─── Main Chat Page ──────────────────────────────────────────────────────────
function ChatPage() {
  const { id: urlConvId } = Route.useSearch()
  const navigate = useNavigate()

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [activeChannel, setActiveChannel] = useState<string>('web')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)

  // Conversation list state
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Channel status state
  const [channelStatus, setChannelStatus] = useState<Record<string, boolean>>({
    web: true, whatsapp: false, telegram: false,
  })

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ─── Scroll helpers ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback((instant = false) => {
    const el = messagesContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: instant ? 'instant' : 'smooth' })
  }, [])

  const checkIfNearBottom = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }, [])

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

  useEffect(() => {
    if (isNearBottom) scrollToBottom()
  }, [messages, isNearBottom, scrollToBottom])

  // ─── Load conversations + channel status on mount ───────────────────────
  useEffect(() => {
    loadConversations()
    loadChannelStatus()
    const poll = setInterval(loadConversations, 5000)
    return () => clearInterval(poll)
  }, [])

  // ─── Load conversation from URL search param ────────────────────────────
  useEffect(() => {
    if (urlConvId && urlConvId !== conversationId) {
      loadConversation(urlConvId)
    } else if (!urlConvId && conversationId) {
      setConversationId(null)
      setMessages([])
      setActiveChannel('web')
    }
  }, [urlConvId])

  // Auto-refresh channel (non-web) conversations
  useEffect(() => {
    if (!conversationId || activeChannel === 'web') return
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/chat?id=${encodeURIComponent(conversationId)}`)
        if (res.ok) {
          const data = await res.json()
          setMessages(
            (data.messages || []).map((m: { role: string; content: string; createdAt?: string }) => ({
              role: m.role, content: m.content, createdAt: m.createdAt,
            }))
          )
        }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [conversationId, activeChannel])

  useEffect(() => {
    if (!isLoading && activeChannel === 'web') textareaRef.current?.focus()
  }, [conversationId, isLoading, activeChannel])

  // ─── Data helpers ────────────────────────────────────────────────────────
  async function loadConversations() {
    try {
      const res = await apiFetch('/api/chat')
      if (res.ok) setConversations(await res.json())
    } catch { /* ignore */ }
  }

  async function loadChannelStatus() {
    try {
      const [waRes, tgRes] = await Promise.all([
        apiFetch('/api/whatsapp?action=status').then(r => r.ok ? r.json() : null).catch(() => null),
        apiFetch('/api/telegram?action=status').then(r => r.ok ? r.json() : null).catch(() => null),
      ])
      setChannelStatus({
        web: true,
        whatsapp: waRes?.connected ?? false,
        telegram: tgRes?.connected ?? false,
      })
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
          role: m.role, content: m.content, createdAt: m.createdAt,
        }))
      )
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
        navigate({ to: '/chat', search: { id: data._id }, replace: true })
        loadConversations()
        return data._id
      }
    } catch { /* ignore */ }
    return null
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await apiFetch(`/api/chat?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (conversationId === id) {
        navigate({ to: '/chat' })
      }
      loadConversations()
    } catch {
      toast.error('Failed to delete')
    }
  }

  function startNewChat() {
    navigate({ to: '/chat' })
    setConversationId(null)
    setMessages([])
    setActiveChannel('web')
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
        body: JSON.stringify({ messages: newMessages, conversationId: activeConvId }),
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
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
          return updated
        })
      }

      loadConversations()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'Failed to connect'
      toast.error(message)
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${message}` }])
    } finally {
      abortRef.current = null
      setIsLoading(false)
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [input, isLoading, messages, conversationId, activeChannel])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isChannelConversation = activeChannel !== 'web'
  const connectedCount = Object.values(channelStatus).filter(Boolean).length

  // Filter conversations by search
  const filteredConversations = searchQuery
    ? conversations.filter(c =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* ════════ MIDDLE COLUMN — Conversation list ════════ */}
      <div className="hidden md:flex w-72 shrink-0 flex-col border-r border-gray-200/50 bg-white/50">
        {/* New chat + Search */}
        <div className="p-3 space-y-2 shrink-0">
          <button
            onClick={startNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            <Plus className="size-4" />
            New Chat
          </button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200/60 bg-white/80 py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-2">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare className="size-8 text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">
                {searchQuery ? 'No chats match your search' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredConversations.map((c) => {
                const isActive = conversationId === c._id
                const meta = CHANNEL_META[c.channel] || CHANNEL_META.web
                return (
                  <button
                    key={c._id}
                    onClick={() => navigate({ to: '/chat', search: { id: c._id } })}
                    className={`group w-full text-left rounded-lg px-2.5 py-2 transition-all ${
                      isActive
                        ? 'bg-white shadow-sm border border-gray-200/60'
                        : 'hover:bg-white/70'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${meta.dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-gray-800">
                            {c.title || 'Untitled'}
                          </span>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {formatTimeAgo(c.updatedAt)}
                          </span>
                        </div>
                        {c.lastMessage && (
                          <p className="truncate text-[11px] text-gray-400 mt-0.5">
                            {c.lastMessage}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => deleteConversation(c._id, e)}
                        className="mt-0.5 opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ════════ RIGHT COLUMN — Chat area ════════ */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-[#FAFAF8]">
        {/* ─── Top bar: Channel split button ─────────────────────────── */}
        <div className="flex items-center justify-between shrink-0 px-4 py-2.5 border-b border-gray-200/40">
          <div className="flex items-center gap-2">
            {conversationId && (
              <span className="text-sm font-medium text-gray-700 truncate max-w-60">
                {conversations.find(c => c._id === conversationId)?.title || 'Chat'}
              </span>
            )}
          </div>

          {/* Channel split button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-gray-200/60 bg-white px-3 py-1.5 text-sm hover:border-gray-300/60 hover:shadow-sm transition-all">
                {channelStatus.whatsapp ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                ) : (
                  <Circle className="size-3.5 text-gray-300" />
                )}
                <span className="text-gray-700 font-medium">Channels</span>
                <ChevronDown className="size-3 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Connected Channels</p>
              </div>
              {Object.entries(CHANNEL_META).map(([key, meta]) => {
                const connected = channelStatus[key] ?? false
                const Icon = meta.icon
                return (
                  <DropdownMenuItem key={key} className="gap-3 py-2.5" onSelect={(e) => e.preventDefault()}>
                    <div className={`flex size-8 items-center justify-center rounded-lg ${connected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-[11px] text-gray-400">
                        {connected ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                    {connected ? (
                      <Wifi className="size-3.5 text-emerald-500" />
                    ) : (
                      <WifiOff className="size-3.5 text-gray-300" />
                    )}
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-xs text-gray-500 justify-center">
                Manage in Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ─── Messages area ─────────────────────────────────────────── */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto min-h-0 overscroll-contain"
        >
          <div className="mx-auto max-w-2xl px-4 py-6">
            {/* ─── Empty state — bento grid welcome ────────────────── */}
            {messages.length === 0 && !conversationId && (
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-white border border-gray-200/60 shadow-sm">
                  <Sparkles className="size-6 text-gray-800" />
                </div>
                <h1 className="font-heading text-xl font-bold tracking-tight text-gray-900">
                  What can I help with?
                </h1>
                <p className="mt-1.5 text-sm text-gray-400 max-w-xs text-center">
                  Chat, automate, or manage — everything from one place.
                </p>

                {/* Bento suggestion grid */}
                <div className="mt-8 w-full max-w-lg">
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Large card */}
                    <button
                      onClick={() => { setInput('What can you automate for me?'); textareaRef.current?.focus() }}
                      className="col-span-2 flex items-center gap-4 rounded-2xl border border-gray-200/60 bg-white p-4 text-left hover:border-gray-300/60 hover:shadow-sm transition-all"
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                        <Zap className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">What can you automate?</p>
                        <p className="text-[12px] text-gray-400 mt-0.5">See all available automations and integrations</p>
                      </div>
                    </button>

                    {/* Smaller cards */}
                    <button
                      onClick={() => { setInput('Check my connected channels'); textareaRef.current?.focus() }}
                      className="flex flex-col gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 text-left hover:border-gray-300/60 hover:shadow-sm transition-all"
                    >
                      <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <MessageSquare className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Check channels</p>
                        <p className="text-[11px] text-gray-400">WhatsApp, Telegram status</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setInput('Help me set up WhatsApp'); textareaRef.current?.focus() }}
                      className="flex flex-col gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 text-left hover:border-gray-300/60 hover:shadow-sm transition-all"
                    >
                      <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Globe className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Setup WhatsApp</p>
                        <p className="text-[11px] text-gray-400">Connect your number</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setInput('What models are available?'); textareaRef.current?.focus() }}
                      className="flex flex-col gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 text-left hover:border-gray-300/60 hover:shadow-sm transition-all"
                    >
                      <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                        <Lightbulb className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">AI Models</p>
                        <p className="text-[11px] text-gray-400">Browse available models</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setInput('Create a marketing plan for my product'); textareaRef.current?.focus() }}
                      className="flex flex-col gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 text-left hover:border-gray-300/60 hover:shadow-sm transition-all"
                    >
                      <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                        <Sparkles className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Marketing plan</p>
                        <p className="text-[11px] text-gray-400">AI-powered strategy</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty conversation */}
            {messages.length === 0 && conversationId && (
              <div className="flex flex-col items-center justify-center min-h-[40vh]">
                <p className="text-sm text-gray-400">No messages yet.</p>
              </div>
            )}

            {/* Channel read-only notice */}
            {isChannelConversation && conversationId && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50/80 border border-amber-200/40 px-3.5 py-2 text-xs text-amber-700">
                <Globe className="size-3.5 shrink-0" />
                Viewing {CHANNEL_META[activeChannel]?.label} conversation — replies are sent via {CHANNEL_META[activeChannel]?.label}
              </div>
            )}

            {/* ─── Message list ─────────────────────────────────────────── */}
            <div className="space-y-6">
              {messages.map((msg, i) => {
                if (msg.role === 'system') {
                  return (
                    <div key={i} className="flex justify-center py-1">
                      <span className="text-[11px] text-gray-400 bg-gray-100/60 rounded-full px-3 py-1">
                        {msg.content}
                      </span>
                    </div>
                  )
                }

                const isUser = msg.role === 'user'
                return (
                  <div key={i} className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
                    {!isUser && (
                      <div className="size-7 shrink-0 mt-0.5 rounded-lg bg-white border border-gray-200/60 flex items-center justify-center shadow-sm">
                        <Sparkles className="size-3.5 text-gray-700" />
                      </div>
                    )}
                    <div
                      className={`relative group max-w-[85%] ${
                        isUser
                          ? 'rounded-2xl rounded-br-md bg-gray-900 text-white px-4 py-2.5'
                          : 'pt-0.5'
                      }`}
                    >
                      {isUser ? (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                          {msg.content}
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none text-gray-800 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-1.5 prose-pre:my-2.5 prose-pre:rounded-xl prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:before:content-none prose-code:after:content-none prose-code:bg-gray-100 prose-code:text-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-headings:text-gray-900 prose-headings:font-heading wrap-break-word leading-relaxed">
                          <Markdown remarkPlugins={[remarkGfm]}>
                            {msg.content || '…'}
                          </Markdown>
                        </div>
                      )}
                      {msg.content && !isUser && <CopyButton text={msg.content} />}
                      {msg.createdAt && (
                        <span className={`block mt-1 text-[10px] ${isUser ? 'text-white/50' : 'text-gray-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3">
                  <div className="size-7 shrink-0 mt-0.5 rounded-lg bg-white border border-gray-200/60 flex items-center justify-center shadow-sm">
                    <Sparkles className="size-3.5 text-gray-700" />
                  </div>
                  <div className="flex items-center gap-1 px-3 py-2">
                    <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                    <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                    <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>

            <div ref={messagesEndRef} className="h-px" aria-hidden="true" />
          </div>
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
            <Button
              onClick={() => scrollToBottom()}
              size="icon"
              variant="outline"
              className="rounded-full size-8 shadow-md border-gray-200/60 bg-white/90 hover:bg-white"
            >
              <ChevronDown className="size-3.5" />
            </Button>
          </div>
        )}

        {/* ─── Input Area ─────────────────────────────────────────────── */}
        <div className="shrink-0 px-4 pb-4 pt-2">
          <div className="mx-auto max-w-2xl">
            <div className="relative flex items-end rounded-2xl border border-gray-200/60 bg-white shadow-sm focus-within:border-gray-300 focus-within:shadow-md transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isChannelConversation ? `Viewing ${CHANNEL_META[activeChannel]?.label} conversation` : 'Message Brilion…'}
                rows={1}
                className="min-h-12 max-h-40 resize-none border-0 bg-transparent pr-12 pl-4 py-3 text-sm placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isLoading || isChannelConversation}
              />
              <div className="absolute right-2 bottom-2">
                {isLoading ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleAbort}
                        size="icon"
                        className="size-8 rounded-xl bg-gray-900 hover:bg-gray-800"
                      >
                        <StopCircle className="size-4 text-white" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Stop generating</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isChannelConversation}
                    size="icon"
                    className="size-8 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-gray-400">
              Brilion can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
