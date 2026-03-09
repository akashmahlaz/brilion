import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import {
  Send,
  User,
  Fingerprint,
  MessageSquare,
  Sparkles,
  Shield,
  BookOpen,
  ScanLine,
  Flame,
  FlaskConical,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { ScrollArea } from '#/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'

const API_BASE = 'http://localhost:4000'

type AIMode = 'chat' | 'generate' | 'audit' | 'explain'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const MODE_CONFIG: Record<AIMode, { label: string; icon: typeof MessageSquare; description: string }> = {
  chat: { label: 'Chat', icon: MessageSquare, description: 'General conversation with your AI agent' },
  generate: { label: 'Generate', icon: Sparkles, description: 'Generate smart contracts & code' },
  audit: { label: 'Audit', icon: Shield, description: 'Security analysis & vulnerability scanning' },
  explain: { label: 'Explain', icon: BookOpen, description: 'Code explanation & documentation' },
}

export const Route = createFileRoute('/chat')({
  component: ChatPage,
})

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<AIMode>('chat')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return

    const userMessage: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, mode }),
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
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Failed to connect to server'}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const ModeIcon = MODE_CONFIG[mode].icon

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] flex-col">
      {/* Mode Selector Bar */}
      <div className="flex items-center gap-1.5 border-b border-border/40 px-4 py-2 bg-card/30 glass-surface">
        {(Object.keys(MODE_CONFIG) as AIMode[]).map((m) => {
          const Icon = MODE_CONFIG[m].icon
          const isActive = mode === m
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 press-effect ${
                isActive
                  ? 'bg-primary/15 text-primary ring-1 ring-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="size-3.5" />
              {MODE_CONFIG[m].label}
            </button>
          )
        })}
        <div className="ml-auto">
          <Badge variant="outline" className="text-[10px] font-mono gap-1 text-muted-foreground/60">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Agent connected
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
              <div className="relative mb-6">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
                  <Fingerprint className="size-8 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500/20 ring-2 ring-background flex items-center justify-center">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
              <h2 className="text-xl font-heading font-semibold mb-2 tracking-tight">
                {mode === 'chat' && 'How can I help you?'}
                {mode === 'generate' && 'What shall I build?'}
                {mode === 'audit' && 'Ready to scan your code'}
                {mode === 'explain' && 'Paste code to explain'}
              </h2>
              <p className="text-sm text-muted-foreground/70 max-w-md leading-relaxed">
                {MODE_CONFIG[mode].description}. Powered by your connected AI providers.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {mode === 'chat' && ['What can you do?', 'Check my channels', 'List available models'].map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="rounded-lg border border-border/60 bg-card/50 px-3.5 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors press-effect">{s}</button>
                ))}
                {mode === 'generate' && ['ERC-20 token contract', 'NFT marketplace', 'Staking vault'].map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="rounded-lg border border-border/60 bg-card/50 px-3.5 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors press-effect">{s}</button>
                ))}
                {mode === 'audit' && ['Scan for reentrancy', 'Check access control', 'Gas optimization'].map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="rounded-lg border border-border/60 bg-card/50 px-3.5 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors press-effect">{s}</button>
                ))}
                {mode === 'explain' && ['What does this contract do?', 'Explain the modifier', 'Break down this function'].map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="rounded-lg border border-border/60 bg-card/50 px-3.5 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors press-effect">{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="size-7 shrink-0 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                      <ModeIcon className="size-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/40 ring-1 ring-border/30'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                {msg.role === 'user' && (
                  <Avatar className="size-7 shrink-0 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-secondary">
                      <User className="size-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3 animate-fade-in">
                <Avatar className="size-7 shrink-0 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                    <ModeIcon className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-xl bg-muted/40 ring-1 ring-border/30 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                    <span className="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                    <span className="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border/40 bg-card/30 glass-surface p-4">
        <div className="mx-auto max-w-3xl">
          {/* Quick Actions */}
          <div className="flex gap-1.5 mb-3">
            <button
              onClick={() => setInput('Scan for vulnerabilities')}
              className="flex items-center gap-1 rounded-md border border-border/40 bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors press-effect"
            >
              <ScanLine className="size-3" />
              Scan
            </button>
            <button
              onClick={() => setInput('Optimize gas usage')}
              className="flex items-center gap-1 rounded-md border border-border/40 bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors press-effect"
            >
              <Flame className="size-3" />
              Gas
            </button>
            <button
              onClick={() => setInput('Generate unit tests')}
              className="flex items-center gap-1 rounded-md border border-border/40 bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors press-effect"
            >
              <FlaskConical className="size-3" />
              Tests
            </button>
          </div>

          <div className="relative flex items-end gap-2 rounded-xl border border-border/60 bg-card p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring/50 transition-shadow">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message Brilion AI (${MODE_CONFIG[mode].label} mode)...`}
              rows={1}
              className="min-h-[36px] max-h-[180px] resize-none border-0 bg-transparent px-2 text-[13px] shadow-none focus-visible:ring-0"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0 rounded-lg size-8 press-effect"
            >
              <Send className="size-3.5" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/40 font-medium">
            Brilion AI may produce inaccurate results. Always verify contract code before deploying.
          </p>
        </div>
      </div>
    </div>
  )
}
