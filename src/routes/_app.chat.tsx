import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, User, Copy, Check } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { ScrollArea } from '#/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export const Route = createFileRoute('/_app/chat')({
  component: ChatPage,
})

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

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMessage: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
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
      const message = err instanceof Error ? err.message : 'Failed to connect to server'
      toast.error(message)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${message}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary/10">
                <Sparkles className="size-10 text-primary" />
              </div>
              <h2 className="text-2xl font-heading font-semibold">How can I help you?</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Ask me anything — I can chat, manage channels, search the web,
                edit workspace files, and more.
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
            placeholder="Ask your AI anything..."
            rows={1}
            className="min-h-[44px] max-h-[200px] resize-none rounded-2xl"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0 rounded-xl"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          AI may produce inaccurate results. Always verify important information.
        </p>
      </div>
    </div>
  )
}
