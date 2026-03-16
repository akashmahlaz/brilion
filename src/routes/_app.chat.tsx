import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
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
} from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string
}

export const Route = createFileRoute('/_app/chat')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) || undefined,
  }),
  component: ChatPage,
})

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

// ─── Channel label ───────────────────────────────────────────────────────────
const CHANNEL_META: Record<string, { label: string }> = {
  web: { label: 'Web' },
  whatsapp: { label: 'WhatsApp' },
  telegram: { label: 'Telegram' },
}

// ─── Main Chat Page ──────────────────────────────────────────────────────────
function ChatPage() {
  const { id: urlConvId } = Route.useSearch()
  const navigate = useNavigate()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [activeChannel, setActiveChannel] = useState<string>('web')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)

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

  // ─── Load conversation from URL search param ────────────────────────────
  useEffect(() => {
    if (urlConvId && urlConvId !== conversationId) {
      loadConversation(urlConvId)
    } else if (!urlConvId && conversationId) {
      // URL cleared — start fresh
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

  // Focus textarea
  useEffect(() => {
    if (!isLoading && activeChannel === 'web') textareaRef.current?.focus()
  }, [conversationId, isLoading, activeChannel])

  // ─── Data helpers ────────────────────────────────────────────────────────
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
        return data._id
      }
    } catch { /* ignore */ }
    return null
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
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'Failed to connect to server'
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

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto min-h-0 overscroll-contain"
      >
        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* ─── Empty state — new chat welcome ─────────────────────── */}
          {messages.length === 0 && !conversationId && (
            <div className="flex flex-col items-center justify-center min-h-[65vh]">
              <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-white/80 border border-gray-200/40 shadow-sm">
                <Sparkles className="size-7 text-gray-800" />
              </div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900">
                What can I help with?
              </h1>
              <p className="mt-2 text-sm text-gray-500 max-w-sm text-center">
                Ask me anything, automate tasks, or manage your channels — all from here.
              </p>

              {/* Suggestion chips */}
              <div className="mt-8 grid grid-cols-2 gap-2.5 w-full max-w-md">
                {[
                  { icon: Zap, text: 'What can you automate?', color: 'text-amber-600' },
                  { icon: MessageSquare, text: 'Check my channels', color: 'text-blue-600' },
                  { icon: Globe, text: 'Set up WhatsApp', color: 'text-emerald-600' },
                  { icon: Lightbulb, text: 'What models are available?', color: 'text-violet-600' },
                ].map(({ icon: Icon, text, color }) => (
                  <button
                    key={text}
                    onClick={() => { setInput(text); textareaRef.current?.focus() }}
                    className="flex items-center gap-2.5 rounded-xl border border-gray-200/60 bg-white/60 px-3.5 py-3 text-left text-sm text-gray-600 hover:bg-white hover:border-gray-300/60 hover:shadow-sm transition-all"
                  >
                    <Icon className={`size-4 shrink-0 ${color}`} />
                    <span>{text}</span>
                  </button>
                ))}
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
          <div className="relative flex items-end rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm shadow-sm focus-within:border-gray-300 focus-within:shadow-md transition-all">
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
  )
}
