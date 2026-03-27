import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import type { UIMessage } from '@tanstack/ai-react'
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
  Wifi,
  Paperclip,
  Settings2,
  QrCode,
  Power,
  X,
  File as FileIcon,
  Loader2,
  Phone,
  Users,
  User,
  ChevronRight,
  Mic,
  MicOff,
  Volume2,
  Shield,
  PanelLeftClose,
  PanelLeft,
  Image as ImageIcon,
  Video,
  Wrench,
  ChevronUp,
  Bot,
  Download,
  Share2,
} from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { MagicCard } from '#/components/ui/magic-card'
import { BorderBeam } from '#/components/ui/border-beam'
import { BlurFade } from '#/components/ui/blur-fade'
import { Ripple } from '#/components/ui/ripple'
import { ShineBorder } from '#/components/ui/shine-border'
import { AnimatedShinyText } from '#/components/ui/animated-shiny-text'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'
import { useStore } from '@tanstack/react-store'
import { appStore, toggleChatPanel } from '#/lib/app-store'
import { useSession } from '#/lib/auth-client'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'

// ─── Parse message content — separate text from image/file attachments ───
const ATTACHMENT_RE = /\[(Image|File):\s*([^\]]+)\]\(([^)]+)\)/g

interface ParsedContent {
  text: string
  attachments: { type: 'image' | 'file'; name: string; url: string }[]
}

function parseMessageContent(content: string): ParsedContent {
  const attachments: ParsedContent['attachments'] = []
  const text = content.replace(ATTACHMENT_RE, (_, type, name, url) => {
    attachments.push({ type: type.toLowerCase() as 'image' | 'file', name: name.trim(), url })
    return ''
  }).trim()
  return { text, attachments }
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ToolCallPart {
  type: 'tool-invocation'
  toolName: string
  state: 'calling' | 'result' | 'error'
  args?: Record<string, unknown>
  result?: unknown
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls: ToolCallPart[]
  thinking?: string
  createdAt?: string
}

function extractTextFromParts(parts: any[] | undefined): string {
  if (!Array.isArray(parts)) return ''
  return parts
    .filter((p) => p?.type === 'text')
    .map((p) => p?.content || p?.text || '')
    .join('')
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
const CHANNEL_META: Record<string, { label: string; icon: typeof Globe; dotColor: string; bgColor: string; description: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-50 text-emerald-600', description: 'End-to-end encrypted messaging' },
  web: { label: 'Web Chat', icon: Globe, dotColor: 'bg-blue-500', bgColor: 'bg-blue-50 text-blue-600', description: 'Always available in browser' },
  telegram: { label: 'Telegram', icon: Send, dotColor: 'bg-sky-500', bgColor: 'bg-sky-50 text-sky-600', description: 'Bot-based messaging' },
}

// ─── File upload types ───────────────────────────────────────────────────────
interface AttachedFile {
  file: File
  preview?: string
  uploading?: boolean
  url?: string
  error?: string
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
          className="p-1 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground shadow-sm transition-all"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{copied ? 'Copied!' : 'Copy'}</TooltipContent>
    </Tooltip>
  )
}

// ─── Time formatting ─────────────────────────────────────────────────────────

// Tool name → human-readable label + icon info
const TOOL_LABELS: Record<string, { label: string; icon: 'search' | 'image' | 'video' | 'voice' | 'code' | 'wrench' | 'bot' }> = {
  tavily_search: { label: 'Searching the web', icon: 'search' },
  generate_image: { label: 'Generating image', icon: 'image' },
  generate_video: { label: 'Generating video', icon: 'video' },
  text_to_speech: { label: 'Converting to speech', icon: 'voice' },
  spawn_subagent: { label: 'Delegating to sub-agent', icon: 'bot' },
  web_request: { label: 'Making web request', icon: 'wrench' },
  github_read_file: { label: 'Reading GitHub file', icon: 'code' },
  github_write_file: { label: 'Writing to GitHub', icon: 'code' },
  github_list_repos: { label: 'Listing repositories', icon: 'code' },
  structured_output: { label: 'Generating structured data', icon: 'wrench' },
  memory_search: { label: 'Searching memory', icon: 'search' },
  memory_index: { label: 'Indexing memory', icon: 'wrench' },
  discover_skills: { label: 'Discovering skills', icon: 'search' },
  auto_create_skill: { label: 'Creating skill', icon: 'wrench' },
  update_model: { label: 'Switching model', icon: 'wrench' },
  update_config: { label: 'Updating config', icon: 'wrench' },
  read_workspace_file: { label: 'Reading workspace', icon: 'wrench' },
  write_workspace_file: { label: 'Writing to workspace', icon: 'wrench' },
}

function getToolIcon(iconType: string) {
  switch (iconType) {
    case 'search': return <Search className="size-3" />
    case 'image': return <ImageIcon className="size-3" />
    case 'video': return <Video className="size-3" />
    case 'voice': return <Volume2 className="size-3" />
    case 'code': return <ChevronRight className="size-3" />
    case 'bot': return <Bot className="size-3" />
    default: return <Wrench className="size-3" />
  }
}

// ─── Tool Call Log — shows AI processing steps ──────────────────────────────
function ToolCallLog({ toolCalls }: { toolCalls: ToolCallPart[] }) {
  const [expanded, setExpanded] = useState(false)

  if (!toolCalls.length) return null

  const hasActive = toolCalls.some(tc => tc.state === 'calling')
  const hasError = toolCalls.some(tc => tc.state === 'error')

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        {hasActive ? (
          <Loader2 className="size-3 animate-spin text-primary shrink-0" />
        ) : hasError ? (
          <X className="size-3 text-destructive shrink-0" />
        ) : (
          <Check className="size-3 text-emerald-500 shrink-0" />
        )}
        <span className="font-medium">
          {hasActive
            ? `Using ${toolCalls.filter(tc => tc.state === 'calling').map(tc => TOOL_LABELS[tc.toolName]?.label || tc.toolName).join(', ')}…`
            : `Used ${toolCalls.length} tool${toolCalls.length > 1 ? 's' : ''}`
          }
        </span>
        <ChevronUp className={`size-3 ml-auto transition-transform ${expanded ? '' : 'rotate-180'}`} />
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-3 py-2 space-y-1.5">
          {toolCalls.map((tc, idx) => {
            const meta = TOOL_LABELS[tc.toolName]
            const result = tc.result as any
            const hasErr = tc.state === 'error' || result?.error
            return (
              <div key={idx} className="flex items-start gap-2 text-[11px]">
                <span className={`mt-0.5 ${hasErr ? 'text-destructive' : tc.state === 'calling' ? 'text-primary' : 'text-emerald-500'}`}>
                  {tc.state === 'calling' ? <Loader2 className="size-2.5 animate-spin" /> : hasErr ? <X className="size-2.5" /> : <Check className="size-2.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{meta ? getToolIcon(meta.icon) : <Wrench className="size-3" />}</span>
                    <span className="font-medium text-foreground">{meta?.label || tc.toolName}</span>
                  </div>
                  {tc.args && Object.keys(tc.args).length > 0 && (
                    <p className="text-muted-foreground truncate mt-0.5">
                      {Object.entries(tc.args).map(([k, v]) =>
                        `${k}: ${typeof v === 'string' ? v.slice(0, 80) : JSON.stringify(v)?.slice(0, 60)}`
                      ).join(' · ')}
                    </p>
                  )}
                  {hasErr && result?.error && (
                    <p className="text-destructive mt-0.5">{String(result.error).slice(0, 200)}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Thinking block — shows model reasoning like ChatGPT ────────────────────
function ThinkingBlock({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
      >
        {isStreaming ? (
          <Loader2 className="size-3 animate-spin text-primary shrink-0" />
        ) : (
          <Sparkles className="size-3 text-primary/70 shrink-0" />
        )}
        <span className="font-medium">{isStreaming ? 'Thinking…' : 'Thought process'}</span>
        <ChevronUp className={`size-3 ml-auto transition-transform ${expanded ? '' : 'rotate-180'}`} />
      </button>
      {expanded && (
        <div className="border-t border-border/40 px-3 py-2">
          <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
      )}
    </div>
  )
}

// ─── Shimmer skeleton for media generation in-progress ──────────────────────
function getVideoAspectClass(size?: string): string {
  if (!size) return 'aspect-video w-80'
  const [w, h] = size.split('x').map(Number)
  if (!w || !h) return 'aspect-video w-80'
  if (h > w) return 'aspect-[9/16] w-56'
  if (w / h > 1.65) return 'aspect-[7/4] w-96'
  return 'aspect-video w-80'
}

function MediaSkeleton({ type, prompt, requestedSize }: { type: 'image' | 'audio' | 'video'; prompt?: string; requestedSize?: string }) {
  const config = {
    image: { label: 'Creating image', Icon: ImageIcon, size: 'aspect-square w-72' },
    video: { label: 'Generating video', Icon: Video, size: getVideoAspectClass(requestedSize) },
    audio: { label: 'Synthesizing audio', Icon: Volume2, size: 'h-16 w-72' },
  }[type]

  return (
    <BlurFade delay={0.1} direction="up">
      <div className="relative overflow-hidden rounded-2xl bg-muted/30 border border-border/50">
        <div className={`relative flex flex-col items-center justify-center gap-3 ${config.size}`}>
          {/* Animated background pulse */}
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5 animate-pulse" />

          {/* Ripple behind icon for image/video */}
          {type !== 'audio' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Ripple mainCircleSize={80} mainCircleOpacity={0.08} numCircles={3} />
            </div>
          )}

          {/* Icon with border beam */}
          <div className="relative flex size-12 items-center justify-center rounded-xl bg-card/80 backdrop-blur-sm border border-border/60 shadow-sm z-10">
            <config.Icon className="size-5 text-muted-foreground animate-pulse" />
            <BorderBeam size={40} duration={2.5} colorFrom="hsl(var(--primary))" colorTo="hsl(var(--primary) / 0.1)" borderWidth={1.5} />
          </div>

          {/* Label */}
          <AnimatedShinyText className="text-xs font-medium z-10">{config.label}…</AnimatedShinyText>

          {/* Shimmer sweep */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-foreground/3 to-transparent" />
        </div>

        {/* Prompt preview */}
        {prompt && (
          <div className="px-3 py-2 border-t border-border/30 bg-muted/20">
            <p className="text-[10px] text-muted-foreground/70 truncate">{prompt}</p>
          </div>
        )}
      </div>
    </BlurFade>
  )
}

// ─── Media action helpers ───────────────────────────────────────────────────
async function downloadMedia(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  } catch {
    // Fallback: open in new tab
    window.open(url, '_blank')
  }
}

async function shareMedia(url: string, title: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
    } catch { /* user cancelled */ }
  } else {
    await navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard')
  }
}

function MediaAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(e) }}
          className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground shadow-sm transition-all hover:bg-background"
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

function getMediaUrl(result: any, keys: string[]): string | null {
  for (const key of keys) {
    const val = result?.[key]
    if (typeof val === 'string' && val.length > 0) return val
  }
  if (typeof result?.asset?.url === 'string' && result.asset.url.length > 0) return result.asset.url
  return null
}

function isDocumentUrl(url: string): boolean {
  return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md|csv|json)$/i.test(url)
}

// ─── Media Results — renders images, audio, video from tool call results ────
function MediaResults({ toolCalls }: { toolCalls: ToolCallPart[] }) {
  const media: React.ReactNode[] = []

  for (let idx = 0; idx < toolCalls.length; idx++) {
    const tc = toolCalls[idx]
    // Show skeleton while tool is being called
    if (tc.state === 'calling') {
      if (tc.toolName === 'generate_image') {
        media.push(<MediaSkeleton key={`skel-img-${tc.toolName}-${idx}`} type="image" prompt={(tc.args as any)?.prompt} />)
      } else if (tc.toolName === 'text_to_speech') {
        media.push(<MediaSkeleton key={`skel-audio-${tc.toolName}-${idx}`} type="audio" />)
      } else if (tc.toolName === 'generate_video') {
        media.push(<MediaSkeleton key={`skel-video-${tc.toolName}-${idx}`} type="video" prompt={(tc.args as any)?.prompt} requestedSize={(tc.args as any)?.size} />)
      }
      continue
    }

    if (tc.state !== 'result' || !tc.result) continue
    const result = tc.result as any

    // Image generation result
    if (tc.toolName === 'generate_image' && !result.error) {
      const src = getMediaUrl(result, ['imageUrl']) || (result.imageBase64 ? `data:image/png;base64,${result.imageBase64}` : null)
      if (src) {
        media.push(
          <BlurFade key={`img-${tc.toolName}-${idx}`} delay={0.15} direction="up">
            <div className="group/media">
              {result.revisedPrompt && (
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">Image created</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="truncate max-w-80">{result.revisedPrompt}</span>
                </p>
              )}
              <div className="relative inline-block rounded-2xl overflow-hidden">
                <a href={src} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={src}
                    alt={result.revisedPrompt || 'Generated image'}
                    className="max-w-xs sm:max-w-sm max-h-96 rounded-2xl object-contain"
                    loading="lazy"
                  />
                </a>
              </div>
              <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover/media:opacity-100 transition-opacity">
                <MediaAction icon={<Download className="size-3.5" />} label="Download" onClick={() => downloadMedia(src, 'image.png')} />
                <MediaAction icon={<Share2 className="size-3.5" />} label="Share" onClick={() => shareMedia(src, result.revisedPrompt || 'Generated image')} />
              </div>
            </div>
          </BlurFade>
        )
      }
    }

    // TTS / audio result
    if (tc.toolName === 'text_to_speech' && !result.error) {
      const audioSrc = getMediaUrl(result, ['audioUrl']) || (result.audioBase64 ? `data:audio/${result.format || 'opus'};base64,${result.audioBase64}` : null)
      if (audioSrc) {
        media.push(
          <div key={`audio-${tc.toolName}-${idx}`} className="rounded-xl border border-border bg-card shadow-sm px-3 py-2.5 flex items-center gap-3 group/media">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Volume2 className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">Voice Message</p>
              <audio
                controls
                className="mt-1.5 w-full max-w-72 h-8 [&::-webkit-media-controls-panel]:bg-muted"
                src={audioSrc}
              />
            </div>
            <div className="flex gap-1 opacity-0 group-hover/media:opacity-100 transition-opacity self-start">
              <MediaAction icon={<Download className="size-3.5" />} label="Download" onClick={() => downloadMedia(audioSrc, `voice.${result.format || 'mp3'}`)} />
              <MediaAction icon={<Share2 className="size-3.5" />} label="Share" onClick={() => shareMedia(audioSrc, 'Voice message')} />
            </div>
          </div>
        )
      }
    }

    // Video generation result
    if (tc.toolName === 'generate_video' && !result.error) {
      const videoSrc = getMediaUrl(result, ['videoUrl', 'url'])
      if (result.status === 'completed' && videoSrc) {
        const videoAspect = getVideoAspectClass(result.size || (tc.args as any)?.size)
        media.push(
          <div key={`video-${tc.toolName}-${idx}`} className="inline-block rounded-xl border border-border overflow-hidden bg-card shadow-sm group/media relative">
            <video
              controls
              className={`${videoAspect} max-w-full max-h-112 object-cover bg-black`}
              src={videoSrc}
            />
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/media:opacity-100 transition-opacity">
              <MediaAction icon={<Download className="size-3.5" />} label="Download" onClick={() => downloadMedia(videoSrc, 'video.mp4')} />
              <MediaAction icon={<Share2 className="size-3.5" />} label="Share" onClick={() => shareMedia(videoSrc, result.prompt || 'Generated video')} />
            </div>
          </div>
        )
      } else if (result.status === 'timeout') {
        media.push(
          <div key={`video-pending-${tc.toolName}-${idx}`} className="rounded-xl border border-border bg-card px-3 py-2.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            <span>Video is still generating (Job: {result.jobId})</span>
          </div>
        )
      }
    }

    // Document/file results from tools
    const docUrl = getMediaUrl(result, ['documentUrl', 'fileUrl', 'url'])
    if (docUrl && isDocumentUrl(docUrl)) {
      const fileName = String(result.fileName || docUrl.split('/').pop() || 'document')
      media.push(
        <div key={`doc-${tc.toolName}-${idx}`} className="rounded-xl border border-border bg-card px-3 py-2.5 flex items-center gap-3 group/media">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
            <FileIcon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{fileName}</p>
            <p className="text-[11px] text-muted-foreground">Document generated</p>
          </div>
          <div className="flex gap-1 self-start">
            <MediaAction icon={<Download className="size-3.5" />} label="Download" onClick={() => downloadMedia(docUrl, fileName)} />
            <MediaAction icon={<Share2 className="size-3.5" />} label="Share" onClick={() => shareMedia(docUrl, fileName)} />
          </div>
        </div>
      )
    }

    if (tc.toolName === 'structured_output' && result?.data) {
      media.push(
        <div key={`structured-${idx}`} className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium text-foreground mb-2">Structured Output</p>
          <pre className="max-h-60 overflow-auto rounded-lg bg-muted p-2 text-[11px] text-foreground/90">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )
    }
  }

  if (media.length === 0) return null
  return <div className="space-y-2">{media}</div>
}

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
  const chatPanelExpanded = useStore(appStore, (s) => s.chatPanelExpanded)
  const { data: session } = useSession()
  const user = session?.user

  // Chat state — useChat manages messages + loading + streaming
  const convIdRef = useRef<string | null>(null)
  const {
    messages: chatMessages,
    sendMessage,
    isLoading,
    stop: stopChat,
    setMessages: setChatMessages,
    clear: clearChat,
    error: chatError,
  } = useChat({
    connection: fetchServerSentEvents('/api/chat', () => ({
      body: {
        conversationId: convIdRef.current,
      },
      credentials: 'same-origin' as RequestCredentials,
    })),
  })

  // Map UIMessage[] → our Message[] for rendering (preserving tool calls)
  const messages: Message[] = chatMessages.map((m: UIMessage) => {
    const parts = m.parts || []
    const textParts = parts.filter((p: any) => p.type === 'text')
    const thinkingParts = parts.filter((p: any) => p.type === 'thinking' || p.type === 'reasoning' || p.type === 'reasoning-text')
    // SDK uses type:'tool-call' with states: awaiting-input | input-streaming | input-complete
    const toolCallParts = parts.filter((p: any) => p.type === 'tool-call')
    const toolResultParts: any[] = parts.filter((p: any) => p.type === 'tool-result')
    return {
      role: m.role as Message['role'],
      content: textParts.map((p: any) => p.content).join('') ?? '',
      thinking: thinkingParts.map((p: any) => p.content || p.text || p.reasoning || '').join('') || undefined,
      toolCalls: toolCallParts.map((p: any) => {
        const hasOutput = p.output !== undefined
        const matchingResult = toolResultParts.find((r: any) => r.toolCallId === p.id) as any
        const isDone = hasOutput || (matchingResult?.state === 'complete')
        return {
          type: 'tool-invocation' as const,
          toolName: p.name || 'unknown',
          state: isDone ? 'result' as const : 'calling' as const,
          args: p.input || (p.arguments ? (() => { try { return JSON.parse(p.arguments) } catch { return undefined } })() : undefined),
          result: hasOutput ? p.output : matchingResult?.content ? (() => { try { return JSON.parse(matchingResult.content) } catch { return matchingResult.content } })() : undefined,
        }
      }),
      createdAt: (m as any).createdAt,
    }
  })

  // Show chat errors as toasts
  useEffect(() => {
    if (chatError) toast.error(chatError.message)
  }, [chatError])

  const [input, setInput] = useState('')
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

  // WhatsApp connection flow state
  const [waQrSession, setWaQrSession] = useState<{ sessionId: string; qrDataUrl: string | null; message: string } | null>(null)
  const [waConnecting, setWaConnecting] = useState(false)
  const [waSettings, setWaSettings] = useState<{ numberType: 'personal' | 'dedicated' | null; accessMode: 'all' | 'specific' | null; allowedNumbers: string }>({ numberType: null, accessMode: null, allowedNumbers: '' })
  const [channelPanelOpen, setChannelPanelOpen] = useState(false)
  const [channelPanelView, setChannelPanelView] = useState<'list' | 'whatsapp-connect' | 'whatsapp-settings' | 'telegram-connect'>('list')

  // File upload state
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])

  // Voice input state
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)

  // TTS playback state
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null)

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keep convIdRef in sync
  useEffect(() => { convIdRef.current = conversationId }, [conversationId])

  // Determine the primary channel to show (WhatsApp first priority)
  const primaryChannel = (() => {
    if (channelStatus.whatsapp) return 'whatsapp'
    if (channelStatus.telegram) return 'telegram'
    return 'whatsapp' // Show WhatsApp even when not connected — it's the primary CTA
  })()

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
      clearChat()
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
          const loaded = (data.messages || [])
            .filter((m: any) => m.role !== 'system' || m.content)
            .map((m: { role: string; content: string; createdAt?: string }, i: number) => ({
              id: String(i),
              role: m.role as 'user' | 'assistant',
              content: m.content || extractTextFromParts((m as any).parts) || '',
              parts: Array.isArray((m as any).parts) && (m as any).parts.length > 0
                ? (m as any).parts
                : [{ type: 'text' as const, content: m.content || '' }],
              createdAt: m.createdAt,
            }))
          setChatMessages(loaded)
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

  async function loadWaOnboarding() {
    try {
      const res = await apiFetch('/api/whatsapp?action=onboarding')
      if (!res.ok) return
      const data = await res.json()
      setWaSettings({
        numberType: data.phoneType || null,
        accessMode: data.dmPolicy === 'allowlist' ? 'specific' : data.dmPolicy === 'open' ? 'all' : null,
        allowedNumbers: (data.allowFrom || []).filter((n: string) => n !== '*').join(', '),
      })
    } catch { /* ignore */ }
  }

  async function saveWaSettings() {
    try {
      const dmPolicy = waSettings.accessMode === 'specific' ? 'allowlist' : waSettings.accessMode === 'all' ? 'open' : 'pairing'
      const allowFrom = waSettings.accessMode === 'specific'
        ? waSettings.allowedNumbers.split(',').map(n => n.trim().replace(/\D/g, '')).filter(Boolean)
        : ['*']

      const res = await apiFetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'onboarding',
          phoneType: waSettings.numberType,
          dmPolicy,
          allowFrom,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('WhatsApp settings saved')
      setChannelPanelOpen(false)
    } catch {
      toast.error('Failed to save WhatsApp settings')
    }
  }

  async function loadConversation(id: string) {
    try {
      const res = await apiFetch(`/api/chat?id=${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setConversationId(data._id)
      convIdRef.current = data._id
      setActiveChannel(data.channel || 'web')
      const loaded = (data.messages || [])
        .filter((m: any) => m.role !== 'system' || m.content)
        .map((m: { role: string; content: string; createdAt?: string }, i: number) => ({
          id: String(i),
          role: m.role as 'user' | 'assistant',
          content: m.content || extractTextFromParts((m as any).parts) || '',
          parts: Array.isArray((m as any).parts) && (m as any).parts.length > 0
            ? (m as any).parts
            : [{ type: 'text' as const, content: m.content || '' }],
          createdAt: m.createdAt,
        }))
      setChatMessages(loaded)
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
        navigate({ to: '/chat', search: { id: undefined } })
      }
      loadConversations()
    } catch {
      toast.error('Failed to delete')
    }
  }

  function startNewChat() {
    navigate({ to: '/chat', search: { id: undefined } })
    setConversationId(null)
    clearChat()
    setActiveChannel('web')
    setInput('')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function handleAbort() {
    stopChat()
  }

  function handleFileClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10 MB)`)
        continue
      }
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      const entry: AttachedFile = { file, preview, uploading: true }
      setAttachedFiles(prev => [...prev, entry])

      // Upload immediately
      const formData = new FormData()
      formData.append('file', file)
      apiFetch('/api/upload', { method: 'POST', body: formData })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Upload failed' }))
            throw new Error(err.error || 'Upload failed')
          }
          const data = await res.json()
          setAttachedFiles(prev => prev.map(f =>
            f.file === file ? { ...f, uploading: false, url: data.publicUrl || data.url } : f
          ))
        })
        .catch((err) => {
          setAttachedFiles(prev => prev.map(f =>
            f.file === file ? { ...f, uploading: false, error: err.message } : f
          ))
          toast.error(`Failed to upload ${file.name}`)
        })
    }
    e.target.value = ''
    textareaRef.current?.focus()
  }

  function removeAttachedFile(file: File) {
    setAttachedFiles(prev => {
      const entry = prev.find(f => f.file === file)
      if (entry?.preview) URL.revokeObjectURL(entry.preview)
      return prev.filter(f => f.file !== file)
    })
  }

  // ─── WhatsApp connect flow ─────────────────────────────────────────────
  async function startWhatsAppConnect() {
    setWaConnecting(true)
    setChannelPanelView('whatsapp-connect')
    try {
      const res = await apiFetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login' }),
      })
      const data = await res.json()
      setWaQrSession(data)

      if (data.sessionId) {
        const interval = setInterval(async () => {
          try {
            const pollRes = await apiFetch(`/api/whatsapp?action=login&sessionId=${data.sessionId}`)
            const pollData = await pollRes.json()
            setWaQrSession(prev => prev ? { ...prev, ...pollData } : prev)
            if (pollData.status === 'connected') {
              clearInterval(interval)
              toast.success('WhatsApp connected!')
              loadWaOnboarding()
              setChannelPanelView('whatsapp-settings')
              await loadChannelStatus()
            }
            if (pollData.status === 'failed' || pollData.status === 'timeout') {
              clearInterval(interval)
              setWaConnecting(false)
            }
          } catch { clearInterval(interval) }
        }, 2000)
        setTimeout(() => clearInterval(interval), 180000)
      }
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setWaConnecting(false)
    }
  }

  async function disconnectWhatsApp() {
    await apiFetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disconnect' }),
    })
    toast.success('WhatsApp disconnected')
    setWaQrSession(null)
    setChannelPanelView('list')
    await loadChannelStatus()
  }

  // ─── Voice input (Speech-to-Text) ──────────────────────────────────────
  const hasSpeechRecognition = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // ─── Slash Commands Menu ───────────────────────────────────────────────────
  const SLASH_COMMANDS = [
    { id: 'marketing', label: 'Marketing Agent', icon: Zap, prompt: 'Act as a marketing expert. Create a detailed go-to-market strategy for a new feature.' },
    { id: 'coding', label: 'Code Assistant', icon: FileIcon, prompt: 'Review my attached code and provide architectural improvements.' },
    { id: 'summarize', label: 'Summarize', icon: FileIcon, prompt: 'Summarize the key takeaways and action items from this text: ' },
    { id: 'automation', label: 'Automation', icon: Zap, prompt: 'Can you set up an automation rule to send a Slack message when a new user signs up?' }
  ]

  const showSlashMenu = input.trim() === '/'

  function handleCommandSelect(prompt: string) {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  function toggleVoiceInput() {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'

    let finalTranscript = ''
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interim = transcript
        }
      }
      setInput(prev => {
        const base = prev.replace(/\u200B$/, '') // remove interim placeholder
        return finalTranscript || (base + interim)
      })
    }

    recognition.onend = () => {
      setIsRecording(false)
      recognitionRef.current = null
      if (finalTranscript) {
        setInput(prev => (prev ? prev + ' ' : '') + finalTranscript)
      }
      textareaRef.current?.focus()
    }

    recognition.onerror = (event: any) => {
      setIsRecording(false)
      recognitionRef.current = null
      if (event.error !== 'aborted') {
        toast.error(`Voice input failed: ${event.error}`)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.stop() }
  }, [])

  // ─── TTS playback (Text-to-Speech) ─────────────────────────────────────
  // Try server-side OpenAI TTS first, fall back to browser speech synthesis
  const [ttsLoading, setTtsLoading] = useState<number | null>(null)

  async function speakMessage(text: string, msgIdx: number) {
    // Stop if already speaking this message
    if (speakingMsgIdx === msgIdx) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      setSpeakingMsgIdx(null)
      setTtsLoading(null)
      return
    }

    // Try server-side TTS first (much better quality)
    try {
      setTtsLoading(msgIdx)
      setSpeakingMsgIdx(msgIdx)
      const res = await apiFetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 4000), voice: 'nova' }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/${data.format || 'opus'};base64,${data.audioBase64}`)
          audio.onended = () => { setSpeakingMsgIdx(null); setTtsLoading(null) }
          audio.onerror = () => { setSpeakingMsgIdx(null); setTtsLoading(null) }
          setTtsLoading(null)
          await audio.play()
          return
        }
      }
    } catch {
      // Server TTS unavailable — fall through to browser
    }
    setTtsLoading(null)

    // Fallback: browser speech synthesis
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast.error('Text-to-speech is not available')
      setSpeakingMsgIdx(null)
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = navigator.language || 'en-US'
    utterance.onend = () => setSpeakingMsgIdx(null)
    utterance.onerror = () => setSpeakingMsgIdx(null)
    window.speechSynthesis.speak(utterance)
  }

  // ─── Send message ──────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim()
    const hasFiles = attachedFiles.some(f => f.url)
    if ((!text && !hasFiles) || isLoading) return

    // Check if any files are still uploading
    if (attachedFiles.some(f => f.uploading)) {
      toast.error('Please wait for files to finish uploading')
      return
    }

    if (activeChannel !== 'web') {
      toast.error('You can only send messages from the web chat.')
      return
    }

    // Build message content with file attachments
    let content = text
    const uploadedFiles = attachedFiles.filter(f => f.url)
    if (uploadedFiles.length > 0) {
      const fileSection = uploadedFiles
        .map(f => `[${f.file.type.startsWith('image/') ? 'Image' : 'File'}: ${f.file.name}](${f.url})`)
        .join('\n')
      content = content ? `${content}\n\n${fileSection}` : fileSection
    }

    setInput('')
    setAttachedFiles([])
    setIsNearBottom(true)
    setShowScrollBtn(false)

    try {
      let activeConvId = conversationId
      if (!activeConvId) {
        activeConvId = await createConversation()
      }
      convIdRef.current = activeConvId

      // useChat handles streaming, messages state, and loading state
      await sendMessage(content)
      loadConversations()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'Failed to connect'
      toast.error(message)
    } finally {
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [input, isLoading, conversationId, activeChannel, attachedFiles, sendMessage])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isChannelConversation = activeChannel !== 'web'

  // Filter conversations by search
  const filteredConversations = searchQuery
    ? conversations.filter(c =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations

  // Group conversations by date
  const groupedConversations = filteredConversations.reduce((acc, c) => {
    const date = new Date(c.updatedAt)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = diff / (1000 * 3600 * 24)
    
    let group = 'Older'
    if (days < 1 && date.getDate() === now.getDate()) group = 'Today'
    else if (days < 2) group = 'Yesterday'
    else if (days < 7) group = 'Previous 7 Days'
    else if (days < 30) group = 'Previous 30 Days'
    
    if (!acc[group]) acc[group] = []
    acc[group].push(c)
    return acc
  }, {} as Record<string, typeof filteredConversations>)

  // Define order for groups
  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older']

  // Active channel for display
  const primaryMeta = CHANNEL_META[primaryChannel] || CHANNEL_META.whatsapp
  const PrimaryIcon = primaryMeta.icon
  const connectedCount = Object.values(channelStatus).filter(Boolean).length

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* ════════ MIDDLE COLUMN — Conversation list (collapsible) ════════ */}
      <div className={`hidden md:flex shrink-0 flex-col bg-secondary border-r border-border transition-all duration-300 ease-out ${chatPanelExpanded ? 'w-72' : 'w-0 overflow-hidden border-r-0'}`}>
        {/* Panel header with collapse toggle */}
        <div className="p-3 space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={startNewChat}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98]"
            >
              <Plus className="size-4" />
              New Chat
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleChatPanel()}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                >
                  <PanelLeftClose className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Hide panel (Ctrl+Shift+B)</TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chats…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-2 scrollbar-thin">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                {searchQuery ? 'No chats match your search' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {groupOrder.map(group => {
                if (!groupedConversations[group] || groupedConversations[group].length === 0) return null
                return (
                  <div key={group} className="space-y-0.5">
                    <div className="px-2 pb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {group}
                    </div>
                    {groupedConversations[group].map((c) => {
                      const isActive = conversationId === c._id
                      const meta = CHANNEL_META[c.channel] || CHANNEL_META.web
                      return (
                        <button
                          key={c._id}
                          onClick={() => navigate({ to: '/chat', search: { id: c._id } })}
                          className={`group w-full text-left rounded-xl px-2.5 py-2.5 transition-all ${
                            isActive
                              ? 'bg-background shadow-sm border border-border/60'
                              : 'hover:bg-background/60'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${meta.dotColor}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-[13px] font-medium text-foreground">
                                  {c.title || 'Untitled'}
                                </span>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {formatTimeAgo(c.updatedAt)}
                                </span>
                              </div>
                              {c.lastMessage && (
                                <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                                  {c.lastMessage}
                                </p>
                              )}
                            </div>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(e) => deleteConversation(c._id, e)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') deleteConversation(c._id, e as any); }}
                              className="mt-0.5 opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground/40 hover:text-destructive transition-all cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ════════ RIGHT COLUMN — Chat area ════════ */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
        {/* ─── Floating controls (no top bar) ──────────────── */}
        <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {!chatPanelExpanded && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => toggleChatPanel()}
                    className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-sm"
                  >
                    <PanelLeft className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Show panel (Ctrl+Shift+B)</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* ═══ Channel Hub — Premium Popover ═══ */}
          <div className="pointer-events-auto">
          <Popover open={channelPanelOpen} onOpenChange={(open) => {
            setChannelPanelOpen(open)
            if (open) setChannelPanelView('list')
          }}>
            <PopoverTrigger asChild>
              <button className="relative flex items-center gap-2.5 rounded-full border border-border bg-card pl-3.5 pr-4 py-2 text-sm hover:border-primary/30 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-300 group overflow-hidden">
                {/* Subtle glow on hover */}
                <span className="absolute inset-0 bg-linear-to-r from-emerald-500/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative flex items-center gap-2.5">
                  {/* Status dot */}
                  <span className="relative flex size-2.5">
                    {channelStatus.whatsapp ? (
                      <>
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                      </>
                    ) : (
                      <span className="relative inline-flex size-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/20" />
                    )}
                  </span>
                  <PrimaryIcon className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-foreground font-semibold tracking-tight">
                    {channelStatus.whatsapp ? 'WhatsApp' : 'Connect'}
                  </span>
                  <span className="h-3.5 w-px bg-border" />
                  <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                    {connectedCount}/{Object.keys(CHANNEL_META).length}
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                </span>
              </button>
            </PopoverTrigger>

            <PopoverContent align="end" sideOffset={8} className="w-85 p-0 rounded-2xl border-border/80 shadow-[0_16px_70px_-12px_rgba(0,0,0,0.12)] overflow-hidden">

              {/* ═══════════ CHANNEL LIST VIEW ═══════════ */}
              {channelPanelView === 'list' && (
                <div>
                  <div className="px-4 pt-4 pb-3">
                    <h3 className="font-heading text-[15px] font-bold text-foreground tracking-tight">Channels</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Connect platforms to Brilion AI</p>
                  </div>

                  <div className="px-2 pb-2 space-y-1">
                    {Object.entries(CHANNEL_META).map(([key, meta], idx) => {
                      const connected = channelStatus[key] ?? false
                      const Icon = meta.icon
                      const isWeb = key === 'web'
                      return (
                        <BlurFade key={key} delay={0.05 * idx} direction="up">
                          <button
                            onClick={() => {
                              if (isWeb) return
                              if (key === 'whatsapp') {
                                if (connected) {
                                  loadWaOnboarding()
                                  setChannelPanelView('whatsapp-settings')
                                } else {
                                  startWhatsAppConnect()
                                }
                              } else if (key === 'telegram') {
                                setChannelPanelView('telegram-connect')
                              }
                            }}
                            className={`relative flex items-center gap-3 w-full rounded-xl px-3 py-3 text-left transition-all duration-200 overflow-hidden ${
                              isWeb
                                ? 'cursor-default'
                                : connected
                                  ? 'hover:bg-emerald-500/4 cursor-pointer'
                                  : 'hover:bg-accent cursor-pointer'
                            }`}
                          >
                            {/* Channel icon */}
                            <div className={`relative flex size-10 items-center justify-center rounded-xl ${meta.bgColor} shrink-0`}>
                              <Icon className="size-4.5" />
                              {connected && !isWeb && (
                                <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-emerald-500 border-2 border-card" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[13px] font-semibold text-foreground">{meta.label}</p>
                                {isWeb && (
                                  <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 rounded-full px-1.5 py-0.5">ALWAYS ON</span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {connected ? meta.description : (isWeb ? meta.description : 'Tap to connect')}
                              </p>
                            </div>
                            {connected && !isWeb ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-[10px] font-bold text-emerald-600">Live</span>
                                <span className="text-[9px] text-muted-foreground">Connected</span>
                              </div>
                            ) : isWeb ? (
                              <Wifi className="size-4 text-blue-500/70" />
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] text-primary font-medium">
                                Setup
                                <ChevronRight className="size-3" />
                              </div>
                            )}
                            {/* Active channel border beam */}
                            {connected && !isWeb && <BorderBeam size={40} duration={3} colorFrom="#25D366" colorTo="#128C7E" borderWidth={1.5} />}
                          </button>
                        </BlurFade>
                      )
                    })}
                  </div>

                  <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{connectedCount}</span> of {Object.keys(CHANNEL_META).length} active
                    </p>
                    <button
                      onClick={() => {
                        setChannelPanelOpen(false)
                        navigate({ to: '/channels' })
                      }}
                      className="text-[10px] text-primary font-medium hover:underline"
                    >
                      Manage all →
                    </button>
                  </div>
                </div>
              )}

              {/* ═══════════ WHATSAPP QR CONNECT VIEW ═══════════ */}
              {channelPanelView === 'whatsapp-connect' && (
                <div>
                  <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
                    <button onClick={() => setChannelPanelView('list')} className="p-1 rounded-lg hover:bg-accent transition-colors">
                      <ChevronDown className="size-3.5 rotate-90 text-muted-foreground" />
                    </button>
                    <div>
                      <h3 className="font-heading text-[15px] font-bold text-foreground tracking-tight">Connect WhatsApp</h3>
                      <p className="text-[11px] text-muted-foreground">Link your WhatsApp account</p>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    {waQrSession?.qrDataUrl ? (
                      <BlurFade delay={0.1} direction="up">
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative rounded-2xl bg-white p-4 shadow-sm border border-border overflow-hidden">
                            <img src={waQrSession.qrDataUrl} alt="WhatsApp QR" className="size-52" />
                            <BorderBeam size={80} duration={4} colorFrom="#25D366" colorTo="#075E54" />
                          </div>
                          <div className="text-center space-y-1.5">
                            <p className="text-[13px] text-foreground font-semibold">Scan with WhatsApp</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="size-5 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-[10px] font-bold">1</span>
                              Open WhatsApp
                              <span className="size-5 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-[10px] font-bold">2</span>
                              Linked Devices
                              <span className="size-5 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-[10px] font-bold">3</span>
                              Scan
                            </div>
                          </div>
                        </div>
                      </BlurFade>
                    ) : waConnecting ? (
                      <div className="relative flex flex-col items-center justify-center py-10 overflow-hidden">
                        <Ripple mainCircleSize={80} numCircles={4} mainCircleOpacity={0.12} />
                        <div className="relative z-10 flex flex-col items-center gap-3">
                          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100">
                            <Loader2 className="size-6 text-emerald-600 animate-spin" />
                          </div>
                          <p className="text-[12px] text-muted-foreground font-medium">Generating QR code…</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-6">
                        <div className="relative overflow-hidden flex size-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100">
                          <QrCode className="size-6 text-emerald-600" />
                        </div>
                        <div className="text-center">
                          <p className="text-[13px] text-foreground font-medium">Ready to connect</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{waQrSession?.message || 'Generate a QR code to link your WhatsApp'}</p>
                        </div>
                        <Button size="sm" onClick={startWhatsAppConnect} className="rounded-xl px-5">
                          <QrCode className="size-3.5 mr-1.5" />
                          Generate QR Code
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════ WHATSAPP SETTINGS VIEW ═══════════ */}
              {channelPanelView === 'whatsapp-settings' && (
                <div>
                  {/* Header with connected status */}
                  <div className="relative px-4 pt-4 pb-3 overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-br from-emerald-500/4 to-transparent" />
                    <div className="relative flex items-center gap-2.5">
                      <button onClick={() => setChannelPanelView('list')} className="p-1 rounded-lg hover:bg-accent transition-colors">
                        <ChevronDown className="size-3.5 rotate-90 text-muted-foreground" />
                      </button>
                      <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50">
                        <MessageCircle className="size-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-[15px] font-bold text-foreground tracking-tight">WhatsApp</h3>
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Connected
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Receiving messages • End-to-end encrypted</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 space-y-4">
                    {/* ── Number type ── */}
                    <BlurFade delay={0.05} direction="up">
                      <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
                          <Phone className="size-3" />
                          Number type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { value: 'personal' as const, label: 'Personal', desc: 'Your daily number', icon: Phone },
                            { value: 'dedicated' as const, label: 'Dedicated', desc: 'Separate for Brilion', icon: Shield },
                          ] as const).map(opt => {
                            const active = waSettings.numberType === opt.value
                            return (
                              <MagicCard
                                key={opt.value}
                                mode="gradient"
                                gradientColor={active ? 'rgba(37, 211, 102, 0.08)' : 'rgba(0,0,0,0.03)'}
                                gradientSize={150}
                                className="p-0! bg-transparent! cursor-pointer"
                              >
                                <button
                                  onClick={() => setWaSettings(s => ({ ...s, numberType: opt.value }))}
                                  className={`relative w-full rounded-xl border px-3 py-3 text-left transition-all duration-200 overflow-hidden ${
                                    active
                                      ? 'border-emerald-500/50 bg-emerald-500/6'
                                      : 'border-border hover:border-primary/20'
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <div className={`flex size-7 items-center justify-center rounded-lg shrink-0 ${
                                      active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'
                                    }`}>
                                      <opt.icon className="size-3.5" />
                                    </div>
                                    <div>
                                      <p className={`text-[12px] font-semibold ${active ? 'text-emerald-700' : 'text-foreground'}`}>{opt.label}</p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                                    </div>
                                  </div>
                                  {active && (
                                    <span className="absolute top-2 right-2 size-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                      <Check className="size-2.5 text-white" />
                                    </span>
                                  )}
                                  {active && <BorderBeam size={30} duration={3} colorFrom="#25D366" colorTo="#128C7E" borderWidth={1} />}
                                </button>
                              </MagicCard>
                            )
                          })}
                        </div>
                      </div>
                    </BlurFade>

                    {/* ── Access mode ── */}
                    <BlurFade delay={0.1} direction="up">
                      <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
                          <Users className="size-3" />
                          Who can message AI?
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { value: 'all' as const, label: 'Everyone', desc: 'All contacts can chat', icon: Users },
                            { value: 'specific' as const, label: 'Specific only', desc: 'Whitelist numbers', icon: Shield },
                          ] as const).map(opt => {
                            const active = waSettings.accessMode === opt.value
                            return (
                              <MagicCard
                                key={opt.value}
                                mode="gradient"
                                gradientColor={active ? 'rgba(37, 211, 102, 0.08)' : 'rgba(0,0,0,0.03)'}
                                gradientSize={150}
                                className="p-0! bg-transparent! cursor-pointer"
                              >
                                <button
                                  onClick={() => setWaSettings(s => ({ ...s, accessMode: opt.value }))}
                                  className={`relative w-full rounded-xl border px-3 py-3 text-left transition-all duration-200 overflow-hidden ${
                                    active
                                      ? 'border-emerald-500/50 bg-emerald-500/6'
                                      : 'border-border hover:border-primary/20'
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <div className={`flex size-7 items-center justify-center rounded-lg shrink-0 ${
                                      active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'
                                    }`}>
                                      <opt.icon className="size-3.5" />
                                    </div>
                                    <div>
                                      <p className={`text-[12px] font-semibold ${active ? 'text-emerald-700' : 'text-foreground'}`}>{opt.label}</p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                                    </div>
                                  </div>
                                  {active && (
                                    <span className="absolute top-2 right-2 size-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                      <Check className="size-2.5 text-white" />
                                    </span>
                                  )}
                                  {active && <BorderBeam size={30} duration={3} colorFrom="#25D366" colorTo="#128C7E" borderWidth={1} />}
                                </button>
                              </MagicCard>
                            )
                          })}
                        </div>
                      </div>
                    </BlurFade>

                    {/* ── Allowed numbers (conditional) ── */}
                    {waSettings.accessMode === 'specific' && (
                      <BlurFade delay={0.15} direction="up">
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
                            Allowed phone numbers
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="+91 98765 43210, +1 555 0123"
                              value={waSettings.allowedNumbers}
                              onChange={(e) => setWaSettings(s => ({ ...s, allowedNumbers: e.target.value }))}
                              className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all"
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">Separate with commas. Only these numbers can interact with your AI.</p>
                        </div>
                      </BlurFade>
                    )}

                    {/* ── Actions ── */}
                    <BlurFade delay={waSettings.accessMode === 'specific' ? 0.2 : 0.15} direction="up">
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 rounded-xl text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          onClick={saveWaSettings}
                          disabled={!waSettings.numberType || !waSettings.accessMode}
                        >
                          <Check className="size-3 mr-1.5" />
                          Save settings
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl text-[12px] text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={disconnectWhatsApp}
                        >
                          <Power className="size-3 mr-1" />
                          Disconnect
                        </Button>
                      </div>
                    </BlurFade>
                  </div>
                </div>
              )}

              {/* ═══════════ TELEGRAM CONNECT VIEW ═══════════ */}
              {channelPanelView === 'telegram-connect' && (
                <div>
                  <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
                    <button onClick={() => setChannelPanelView('list')} className="p-1 rounded-lg hover:bg-accent transition-colors">
                      <ChevronDown className="size-3.5 rotate-90 text-muted-foreground" />
                    </button>
                    <div>
                      <h3 className="font-heading text-[15px] font-bold text-foreground tracking-tight">Connect Telegram</h3>
                      <p className="text-[11px] text-muted-foreground">Set up your Telegram bot</p>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <BlurFade delay={0.1} direction="up">
                      <div className="flex flex-col items-center gap-4 py-4">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-sky-50 border border-sky-100">
                          <Send className="size-6 text-sky-600" />
                        </div>
                        <p className="text-[12px] text-muted-foreground text-center max-w-55">
                          Set up Telegram with your bot token in Channel Settings
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-[12px]"
                          onClick={() => {
                            setChannelPanelOpen(false)
                            navigate({ to: '/channels' })
                          }}
                        >
                          <Settings2 className="size-3 mr-1.5" />
                          Open Channel Settings
                        </Button>
                      </div>
                    </BlurFade>
                  </div>
                </div>
              )}

            </PopoverContent>
          </Popover>
          </div>
        </div>

        {/* ─── Messages area ─────────────────────────────────────────── */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto min-h-0 overscroll-contain scrollbar-thin"
        >
          <div className="mx-auto max-w-3xl px-4 py-6">
            {/* ─── Empty state — bento grid welcome ────────────────── */}
            {messages.length === 0 && !conversationId && (
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <BlurFade delay={0.1} direction="up">
                  <div className="relative mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-sm overflow-hidden">
                    <Sparkles className="size-7 text-primary" />
                    <BorderBeam size={50} duration={3} colorFrom="hsl(var(--primary))" colorTo="hsl(var(--primary) / 0.3)" borderWidth={1.5} />
                  </div>
                </BlurFade>
                <BlurFade delay={0.2} direction="up">
                  <h1 className="font-heading text-[28px] sm:text-[36px] font-extrabold tracking-[-0.035em] text-foreground leading-[1.1]">
                    <AnimatedShinyText className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.035em]">
                      Build, automate, and ship.
                    </AnimatedShinyText>
                  </h1>
                </BlurFade>
                <BlurFade delay={0.3} direction="up">
                  <p className="mt-2.5 text-[15px] text-muted-foreground max-w-sm text-center leading-relaxed">
                    Ask for image, video, audio, docs, integrations, or multi-step automation.
                  </p>
                </BlurFade>

                {/* Bento suggestion grid */}
                {/* <div className="mt-10 w-full max-w-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setInput('What can you automate for me?'); textareaRef.current?.focus() }}
                      className="col-span-2 flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left hover:border-ring/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-300"
                    >
                      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                        <Zap className="size-5" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-foreground">What can you automate?</p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">See all available automations and integrations</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setInput('Check my connected channels'); textareaRef.current?.focus() }}
                      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left hover:border-ring/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-300"
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <MessageSquare className="size-4.5" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-foreground">Check channels</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">WhatsApp, Telegram status</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setInput('Help me set up WhatsApp'); textareaRef.current?.focus() }}
                      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left hover:border-ring/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-300"
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                        <Globe className="size-4.5" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-foreground">Setup WhatsApp</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Connect your number</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setInput('What models are available?'); textareaRef.current?.focus() }}
                      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left hover:border-ring/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-300"
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                        <Lightbulb className="size-4.5" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-foreground">AI Models</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Browse available models</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setInput('Create a marketing plan for my product'); textareaRef.current?.focus() }}
                      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left hover:border-ring/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-300"
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                        <Sparkles className="size-4.5" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-foreground">Marketing plan</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">AI-powered strategy</p>
                      </div>
                    </button>
                  </div>
                </div> */}
              </div>
            )}

            {/* Empty conversation */}
            {messages.length === 0 && conversationId && (
              <div className="flex flex-col items-center justify-center min-h-[40vh]">
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              </div>
            )}

            {/* Channel read-only notice */}
            {isChannelConversation && conversationId && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-blue-50/80 border border-blue-200/40 px-3.5 py-2 text-xs text-blue-700">
                <Globe className="size-3.5 shrink-0" />
                Viewing {CHANNEL_META[activeChannel]?.label} conversation — replies are sent via {CHANNEL_META[activeChannel]?.label}
              </div>
            )}

            {/* ─── Message list ─────────────────────────────────────────── */}
            <div className="space-y-4 pb-4">
              {messages.map((msg, i) => {
                if (msg.role === 'system') {
                  return (
                    <div key={i} className="flex justify-center py-1">
                      <span className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
                        {msg.content}
                      </span>
                    </div>
                  )
                }

                const isUser = msg.role === 'user'
                const hasToolCalls = msg.toolCalls?.length > 0
                const derivedThinking = !msg.thinking && hasToolCalls
                  ? msg.toolCalls
                      .filter((tc) => tc.state === 'calling')
                      .map((tc) => TOOL_LABELS[tc.toolName]?.label || tc.toolName)
                      .join(' | ')
                  : undefined
                const parsedUserMessage = isUser ? parseMessageContent(msg.content) : null
                const userHasAttachments = !!(parsedUserMessage && parsedUserMessage.attachments.length > 0)
                const timestamp = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                return (
                  <div key={i} className={`group flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    {isUser ? (
                      <Avatar className="size-8 shrink-0 ring-1 ring-border shadow-sm">
                        {user?.image && <AvatarImage src={user.image} alt={user.name || ''} />}
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {user?.name?.charAt(0)?.toUpperCase() || <User className="size-3.5" />}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="relative flex size-8 shrink-0 select-none items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden ring-1 ring-primary/20 shadow-sm">
                        <Sparkles className="size-4" />
                        <BorderBeam size={25} duration={3} colorFrom="hsl(var(--primary))" colorTo="hsl(var(--primary) / 0.2)" borderWidth={1} />
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`relative max-w-[75%] min-w-15 ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-2xl px-3.5 py-2.5 shadow-sm ${
                        isUser
                          ? userHasAttachments
                            ? 'bg-transparent p-0 shadow-none'
                            : 'bg-primary/88 text-primary-foreground rounded-br-md'
                          : 'bg-card border border-border rounded-bl-md'
                      }`}>
                        {isUser ? (
                          (() => {
                            const { text, attachments } = parsedUserMessage || { text: '', attachments: [] }
                            return (
                              <div className="text-[14.5px] leading-relaxed">
                                {attachments.length > 0 && (
                                  <div className={`flex flex-wrap gap-2 ${text ? 'mb-2 justify-end' : ''}`}>
                                    {attachments.map((att, ai) =>
                                      att.type === 'image' ? (
                                        <MagicCard key={ai} className="overflow-hidden rounded-xl border border-border bg-card p-0" gradientColor="hsl(var(--primary) / 0.18)">
                                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                                            <img
                                              src={att.url}
                                              alt={att.name}
                                              className="max-w-56 max-h-56 object-cover"
                                            />
                                          </a>
                                        </MagicCard>
                                      ) : (
                                        <a key={ai} href={att.url} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground/90 hover:bg-muted transition-colors">
                                          <FileIcon className="size-4" />
                                          <span className="truncate max-w-40">{att.name}</span>
                                        </a>
                                      )
                                    )}
                                  </div>
                                )}
                                {text && (
                                  <p className={`whitespace-pre-wrap wrap-break-word ${
                                    userHasAttachments
                                      ? 'rounded-2xl rounded-br-md bg-primary/88 text-primary-foreground px-3.5 py-2.5 shadow-sm'
                                      : ''
                                  }`}>
                                    {text}
                                  </p>
                                )}
                              </div>
                            )
                          })()
                        ) : (
                          <div className="space-y-3">
                            {/* Thinking indicator */}
                            {(msg.thinking || derivedThinking) && (
                              <ThinkingBlock
                                content={msg.thinking || `Working on: ${derivedThinking}`}
                                isStreaming={isLoading && i === messages.length - 1 && !msg.content}
                              />
                            )}

                            {/* Tool calls */}
                            {hasToolCalls && <ToolCallLog toolCalls={msg.toolCalls} />}

                            {/* AI text response with markdown */}
                            {msg.content ? (
                              <div className="prose prose-sm max-w-none text-foreground/90 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-1.5 prose-pre:my-2 prose-pre:rounded-xl prose-pre:bg-muted prose-pre:text-foreground prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[13px] prose-headings:text-foreground prose-headings:font-heading wrap-break-word leading-relaxed">
                                <Markdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    img: ({ src, alt, ...props }) => {
                                      if (!src) return null
                                      return (
                                        <a href={src} target="_blank" rel="noopener noreferrer" className="block my-2">
                                          <img src={src} alt={alt || ''} {...props} className="max-w-72 max-h-56 rounded-lg object-cover border border-border" loading="lazy" />
                                        </a>
                                      )
                                    },
                                  }}
                                >
                                  {msg.content}
                                </Markdown>
                              </div>
                            ) : isLoading && i === messages.length - 1 ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="flex gap-1">
                                  <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                                  <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                                  <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                                </div>
                                <span className="text-xs">{hasToolCalls ? 'Working…' : 'Thinking…'}</span>
                              </div>
                            ) : !msg.content && !hasToolCalls ? (
                              <span className="text-muted-foreground text-xs italic">Preparing output…</span>
                            ) : null}

                            {/* Rendered media from tool results */}
                            {hasToolCalls && <MediaResults toolCalls={msg.toolCalls} />}
                          </div>
                        )}
                      </div>

                      {/* Timestamp + actions row */}
                      <div className={`flex items-center gap-1.5 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {timestamp && (
                          <span className="text-[10px] text-muted-foreground">{timestamp}</span>
                        )}
                        {isUser && timestamp && (
                          <Check className="size-3 text-muted-foreground/60" />
                        )}
                        {/* Action buttons for AI messages */}
                        {msg.content && !isUser && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => speakMessage(msg.content, i)}
                                  className={`p-1 rounded-md hover:bg-muted transition-colors ${
                                    speakingMsgIdx === i
                                      ? 'text-primary'
                                      : 'text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {ttsLoading === i ? <Loader2 className="size-3 animate-spin" /> : <Volume2 className="size-3" />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">{speakingMsgIdx === i ? 'Stop' : 'Listen'}</TooltipContent>
                            </Tooltip>
                            <CopyButton text={msg.content} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <BlurFade delay={0.05} direction="up">
                <div className="flex items-end gap-2">
                  <div className="relative flex size-8 shrink-0 select-none items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden ring-1 ring-primary/20 shadow-sm">
                    <Sparkles className="size-4" />
                    <BorderBeam size={25} duration={2} colorFrom="hsl(var(--primary))" colorTo="hsl(var(--primary) / 0.2)" borderWidth={1} />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-card border border-border px-3.5 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="size-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                        <span className="size-2 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                        <span className="size-2 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                      </div>
                      <AnimatedShinyText className="text-xs">Thinking…</AnimatedShinyText>
                    </div>
                  </div>
                </div>
                </BlurFade>
              )}
            </div>

            <div ref={messagesEndRef} className="h-px" aria-hidden="true" />
          </div>
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10">
            <ShineBorder
              shineColor={['hsl(var(--primary))', 'hsl(var(--muted-foreground))']}
              borderWidth={1}
              duration={6}
              className="rounded-full p-0!"
            >
              <Button
                onClick={() => scrollToBottom()}
                size="icon"
                variant="outline"
                className="rounded-full size-8 shadow-md border-0 bg-card/90 hover:bg-card text-muted-foreground"
              >
                <ChevronDown className="size-3.5" />
              </Button>
            </ShineBorder>
          </div>
        )}

        {/* ─── Floating Input Area ───── */}
        <div className="shrink-0 bg-linear-to-t from-background via-background to-transparent pt-2 pb-3 px-4">
          <div className="mx-auto max-w-3xl relative">
            
            {/* Slash commands popover */}
            {showSlashMenu && (
              <div className="absolute bottom-[calc(100%+8px)] left-0 w-64 rounded-xl border border-border bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border">
                  Quick Prompts
                </div>
                <div className="p-1">
                  {SLASH_COMMANDS.map(cmd => (
                    <button
                      key={cmd.id}
                      onClick={() => handleCommandSelect(cmd.prompt)}
                      className="w-full flex items-center gap-3 px-2 py-2 text-left rounded-md hover:bg-muted transition-colors text-sm"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <cmd.icon className="size-3.5" />
                      </div>
                      <span className="font-medium text-foreground">{cmd.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative flex flex-col rounded-[24px] border border-border bg-card/60 backdrop-blur-2xl shadow-sm focus-within:border-ring/30 focus-within:bg-card focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300">
              {/* Attached file previews inside the input box */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-4 pb-2">
                  {attachedFiles.map((af, i) => (
                    <div key={i} className="relative group flex items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs shadow-sm">
                      {af.preview ? (
                        <img src={af.preview} alt="" className="size-9 rounded-lg object-cover" />
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <FileIcon className="size-4" />
                        </div>
                      )}
                      <div className="min-w-0 pr-1">
                        <p className="truncate text-foreground font-medium max-w-32">{af.file.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {af.uploading ? 'Uploading…' : af.error ? af.error : `${(af.file.size / 1024).toFixed(0)} KB`}
                        </p>
                      </div>
                      {af.uploading && <Loader2 className="size-3.5 text-primary animate-spin shrink-0 mr-1" />}
                      <button
                        onClick={() => removeAttachedFile(af.file)}
                        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-border text-muted-foreground hover:bg-destructive hover:text-white opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative flex items-end rounded-2xl border border-border bg-card shadow-sm focus-within:border-ring/40 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.06)] transition-all">
              {/* File upload button */}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.txt,.csv,.md,.json,.doc,.docx,.xls,.xlsx" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleFileClick}
                    disabled={isChannelConversation}
                    className="absolute left-3 bottom-3 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40 transition-all"
                  >
                    <Paperclip className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Attach file</TooltipContent>
              </Tooltip>

              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isChannelConversation ? `Viewing ${CHANNEL_META[activeChannel]?.label} conversation` : 'Message Brilion…'}
                rows={1}
                className="min-h-14 max-h-40 resize-none border-0 bg-transparent pr-14 pl-12 py-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isLoading || isChannelConversation}
              />
              <div className="absolute right-3 bottom-3">
                {isLoading ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleAbort}
                        className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                      >
                        <StopCircle className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Stop generating</TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() && !attachedFiles.some(f => f.url) || isChannelConversation}
                    className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none transition-all"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                )}
              </div>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Brilion can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
