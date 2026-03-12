import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
  Sparkles,
  User,
  Copy,
  Check,
  Plus,
  MessageSquare,
  Trash2,
  MessageCircle,
  Globe,
} from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { ScrollArea } from '#/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

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
  updatedAt: string
  createdAt: string
}

export const Route = createFileRoute('/_app/chat')({
  component: ChatPage,
})

const CHANNEL_META: Record<string, { label: string; color: string; icon: typeof Globe }> = {
  web: { label: 'Web', color: 'bg-blue-500/10 text-blue-600', icon: Globe },
  whatsapp: { label: 'WhatsApp', color: 'bg-emerald-500/10 text-emerald-600', icon: MessageCircle },
  telegram: { label: 'Telegram', color: 'bg-sky-500/10 text-sky-600', icon: Send },
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
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success('Copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
      }}
      className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border text-muted-foreground hover:text-foreground transition-all"
      title="Copy message"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  )
}

type FilterChannel = 'all' | 'web' | 'whatsapp' | 'telegram'

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeChannel, setActiveChannel] = useState<string>('web')
  const [filterChannel, setFilterChannel] = useState<FilterChannel>('all')
  const scrollRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadConversations()
    // Poll for new conversations (WhatsApp/Telegram messages create them server-side)
    pollRef.current = setInterval(loadConversations, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-refresh active conversation for incoming channel messages
  useEffect(() => {
    if (!conversationId || activeChannel === 'web') return
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/chat?id=${conversationId}`)
        if (res.ok) {
          const data = await res.json()
          setMessages(
            (data.messages || []).map((m: any) => ({
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

  async function loadConversations() {
    try {
      const res = await apiFetch('/api/chat')
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch { /* ignore */ }
  }

  async function loadConversation(id: string) {
    try {
      const res = await apiFetch(`/api/chat?id=${id}`)
      if (res.ok) {
        const data = await res.json()
        setConversationId(data._id)
        setActiveChannel(data.channel || 'web')
        setMessages(
          (data.messages || []).map((m: any) => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          }))
        )
      }
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
      await apiFetch(`/api/chat?id=${id}`, { method: 'DELETE' })
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
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    // Only allow sending from web channel
    if (activeChannel !== 'web') {
      toast.error('You can only send messages from the web chat. Channel messages are read-only here.')
      return
    }

    const userMessage: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

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
      const message = err instanceof Error ? err.message : 'Failed to connect to server'
      toast.error(message)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${message}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, conversationId, activeChannel])

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

  return (
    <div className="flex h-[calc(100svh-var(--header-height))]">
      {/* Conversation sidebar */}
      <div className="hidden md:flex w-72 flex-col border-r bg-muted/30">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="text-sm font-medium">Conversations</span>
          <Button variant="ghost" size="icon" className="size-7" onClick={startNewChat}>
            <Plus className="size-4" />
          </Button>
        </div>

        {/* Channel filter tabs */}
        <div className="flex gap-1 p-2 border-b">
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

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredConversations.map((c) => (
              <div
                key={c._id}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                  conversationId === c._id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                }`}
                onClick={() => loadConversation(c._id)}
              >
                <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-xs">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={c.channel} />
                    <span className="text-[10px] text-muted-foreground">
                      {formatTimeAgo(c.updatedAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(c._id)
                  }}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            {filteredConversations.length === 0 && (
              <p className="px-3 py-6 text-xs text-muted-foreground text-center">
                {filterChannel === 'all' ? 'No conversations yet' : `No ${CHANNEL_META[filterChannel]?.label} conversations`}
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Channel header bar for non-web conversations */}
        {conversationId && (
          <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/20">
            <ChannelBadge channel={activeChannel} />
            <span className="text-sm font-medium truncate">
              {conversations.find(c => c._id === conversationId)?.title || 'Chat'}
            </span>
            {isChannelConversation && (
              <span className="text-xs text-muted-foreground ml-auto">
                Read-only — messages flow from {CHANNEL_META[activeChannel]?.label}
              </span>
            )}
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-8">
            {messages.length === 0 && !conversationId && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary/10">
                  <Sparkles className="size-10 text-primary" />
                </div>
                <h2 className="text-2xl font-heading font-semibold">How can I help you?</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Chat here or connect WhatsApp/Telegram to see all conversations in one place.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {[
                    'What can you do?',
                    'Check my channels',
                    'List available models',
                    'Help me set up WhatsApp',
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-xl border px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.length === 0 && conversationId && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-sm text-muted-foreground">No messages in this conversation yet.</p>
              </div>
            )}

            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="size-8 shrink-0 mt-1">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Sparkles className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {msg.role === 'system' && (
                    <div className="w-full text-center">
                      <span className="text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">
                        {msg.content}
                      </span>
                    </div>
                  )}
                  {msg.role !== 'system' && (
                    <div
                      className={`relative group max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2 prose-pre:rounded-xl prose-code:before:content-none prose-code:after:content-none prose-code:bg-background/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs">
                          <Markdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </Markdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                      {msg.content && <CopyButton text={msg.content} />}
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <Avatar className="size-8 shrink-0 mt-1">
                      <AvatarFallback className="bg-secondary">
                        <User className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-4">
                  <Avatar className="size-8 shrink-0 mt-1">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Sparkles className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <div className="flex gap-1">
                      <span className="size-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:0ms]" />
                      <span className="size-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:150ms]" />
                      <span className="size-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-background/80 backdrop-blur-sm p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isChannelConversation ? `Messages from ${CHANNEL_META[activeChannel]?.label} — view only` : 'Ask your AI anything...'}
              rows={1}
              className="min-h-[44px] max-h-[200px] resize-none rounded-2xl"
              disabled={isLoading || isChannelConversation}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isChannelConversation}
              size="icon"
              className="shrink-0 rounded-xl"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {isChannelConversation
              ? `Viewing ${CHANNEL_META[activeChannel]?.label} conversation. Reply happens through that channel.`
              : 'AI may produce inaccurate results. Always verify important information.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}
