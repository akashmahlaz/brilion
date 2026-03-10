import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Sparkles,
  Zap,
  MessageCircle,
  Bot,
  Check,
  ChevronRight,
  ChevronLeft,
  Key,
  ArrowRight,
  Send,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Badge } from '#/components/ui/badge'
import { Separator } from '#/components/ui/separator'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    try {
      const res = await apiFetch('/api/auth/session')
      if (!res.ok) throw redirect({ to: '/login' })
      const data = await res.json()
      if (!data?.user) throw redirect({ to: '/login' })
      if (data.user?.onboardingCompleted) throw redirect({ to: '/' })
      return { user: data.user }
    } catch (e) {
      if (e instanceof Response || (e && typeof e === 'object' && 'to' in e)) throw e
      throw redirect({ to: '/login' })
    }
  },
  component: OnboardingPage,
})

// Provider catalog with colored icon backgrounds instead of emoji
const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', color: 'bg-emerald-500/10 text-emerald-500', description: 'GPT-4o, GPT-4.1, o3', placeholder: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', color: 'bg-orange-500/10 text-orange-500', description: 'Claude 4, Sonnet', placeholder: 'sk-ant-...' },
  { id: 'google', name: 'Google AI', color: 'bg-blue-500/10 text-blue-500', description: 'Gemini 2.5 Pro/Flash', placeholder: 'AIza...' },
  { id: 'github', name: 'GitHub Models', color: 'bg-gray-500/10 text-gray-400', description: 'Free GPT-4o, Copilot', placeholder: 'ghp_...' },
  { id: 'xai', name: 'xAI', color: 'bg-white/10 text-foreground', description: 'Grok 3', placeholder: 'xai-...' },
  { id: 'openrouter', name: 'OpenRouter', color: 'bg-violet-500/10 text-violet-500', description: '200+ models', placeholder: 'sk-or-...' },
  { id: 'groq', name: 'Groq', color: 'bg-amber-600/10 text-amber-600', description: 'Llama 3, Mixtral (fast)', placeholder: 'gsk_...' },
  { id: 'together', name: 'Together AI', color: 'bg-red-500/10 text-red-500', description: 'Open-source models', placeholder: 'tok-...' },
  { id: 'deepseek', name: 'DeepSeek', color: 'bg-cyan-500/10 text-cyan-500', description: 'DeepSeek R1, V3', placeholder: 'sk-...' },
  { id: 'mistral', name: 'Mistral', color: 'bg-yellow-500/10 text-yellow-500', description: 'Mistral Large, Codestral', placeholder: 'api-...' },
]

const STEPS = [
  { title: 'Connect AI', icon: Zap, description: 'Add your AI provider keys' },
  { title: 'Channels', icon: MessageCircle, description: 'Connect WhatsApp & more' },
  { title: 'Persona', icon: Bot, description: 'Customize your AI agent' },
  { title: 'Ready!', icon: Sparkles, description: "You're all set" },
]

function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set())
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [agentName, setAgentName] = useState('My AI Assistant')
  const [agentPersonality, setAgentPersonality] = useState('helpful')

  async function saveProviderKey(providerId: string) {
    const key = providerKeys[providerId]
    if (!key?.trim()) return
    setSaving(providerId)
    try {
      const res = await apiFetch('/api/onboarding/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, apiKey: key.trim() }),
      })
      if (res.ok) {
        setConnectedProviders((prev) => new Set(prev).add(providerId))
        const name = AI_PROVIDERS.find((p) => p.id === providerId)?.name ?? providerId
        toast.success(`${name} connected successfully`)
      }
    } finally {
      setSaving(null)
    }
  }

  async function completeOnboarding() {
    await apiFetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    navigate({ to: '/' })
  }

  async function updateStep(newStep: number) {
    setStep(newStep)
    apiFetch('/api/onboarding/step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: newStep }),
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <span className="font-heading font-semibold">MyAI Setup</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={completeOnboarding}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          </div>
          {/* Step indicators */}
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                onClick={() => updateStep(i)}
                className={`flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  i === step
                    ? 'bg-primary/10 text-primary font-medium'
                    : i < step
                      ? 'text-primary/60'
                      : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                    i < step
                      ? 'bg-primary text-primary-foreground'
                      : i === step
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < step ? <Check className="size-3" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {step === 0 && (
          <StepAIProviders
            providers={AI_PROVIDERS}
            connectedProviders={connectedProviders}
            providerKeys={providerKeys}
            setProviderKeys={setProviderKeys}
            saveProviderKey={saveProviderKey}
            saving={saving}
          />
        )}
        {step === 1 && <StepChannels />}
        {step === 2 && (
          <StepPersona
            agentName={agentName}
            setAgentName={setAgentName}
            agentPersonality={agentPersonality}
            setAgentPersonality={setAgentPersonality}
          />
        )}
        {step === 3 && (
          <StepReady
            connectedProviders={connectedProviders}
            onComplete={completeOnboarding}
          />
        )}
      </div>

      {/* Navigation Footer */}
      <div className="border-t bg-card/50 backdrop-blur-sm sticky bottom-0">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4 py-4">
          <Button
            variant="outline"
            onClick={() => updateStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="mr-1 size-4" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => updateStep(step + 1)}>
              Next <ChevronRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button onClick={completeOnboarding}>
              Go to Dashboard <ArrowRight className="ml-1 size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 1: AI Providers ──────────────────────────────

function StepAIProviders({
  providers,
  connectedProviders,
  providerKeys,
  setProviderKeys,
  saveProviderKey,
  saving,
}: {
  providers: typeof AI_PROVIDERS
  connectedProviders: Set<string>
  providerKeys: Record<string, string>
  setProviderKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>
  saveProviderKey: (id: string) => void
  saving: string | null
}) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-semibold">Connect your AI providers</h2>
        <p className="text-muted-foreground mt-1">
          Add API keys for the AI models you want to use. You can add more later in Settings.
        </p>
      </div>

      {connectedProviders.size > 0 && (
        <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 rounded-lg px-3 py-2">
          <Check className="size-4" />
          {connectedProviders.size} provider{connectedProviders.size > 1 ? 's' : ''} connected
        </div>
      )}

      <div className="grid gap-3">
        {providers.map((provider) => {
          const isConnected = connectedProviders.has(provider.id)
          const isExpanded = expandedProvider === provider.id

          return (
            <Card
              key={provider.id}
              className={`transition-all ${isConnected ? 'border-primary/30 bg-primary/5' : 'hover:border-border/80'}`}
            >
              <button
                className="w-full text-left"
                onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-xl ${provider.color}`}>
                      <Zap className="size-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <CardDescription className="text-xs">{provider.description}</CardDescription>
                    </div>
                    {isConnected ? (
                      <Badge variant="outline" className="text-primary border-primary/30">
                        <Check className="mr-1 size-3" /> Connected
                      </Badge>
                    ) : (
                      <ChevronRight
                        className={`size-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    )}
                  </div>
                </CardHeader>
              </button>
              {isExpanded && !isConnected && (
                <CardContent className="pt-0 pb-3">
                  <Separator className="mb-3" />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`key-${provider.id}`} className="sr-only">
                        API Key
                      </Label>
                      <Input
                        id={`key-${provider.id}`}
                        type="password"
                        placeholder={provider.placeholder}
                        value={providerKeys[provider.id] ?? ''}
                        onChange={(e) =>
                          setProviderKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveProviderKey(provider.id)
                        }}
                      />
                    </div>
                    <Button
                      size="default"
                      onClick={() => saveProviderKey(provider.id)}
                      disabled={
                        !providerKeys[provider.id]?.trim() || saving === provider.id
                      }
                    >
                      {saving === provider.id ? (
                        'Saving…'
                      ) : (
                        <>
                          <Key className="mr-1 size-4" /> Save
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 2: Channels ──────────────────────────────────

function StepChannels() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-semibold">Connect your channels</h2>
        <p className="text-muted-foreground mt-1">
          Let your AI agent reach you on WhatsApp, Telegram, and more. You can set this up later.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="relative overflow-hidden hover:border-emerald-500/30 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <MessageCircle className="size-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-base">WhatsApp</CardTitle>
                <CardDescription className="text-xs">
                  Chat with your AI via WhatsApp
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Scan a QR code to link your WhatsApp. Your AI will respond to your messages instantly.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <a href="/channels">Set up after onboarding</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:border-blue-500/30 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Send className="size-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Telegram</CardTitle>
                <CardDescription className="text-xs">
                  Connect your Telegram bot
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Create a Telegram bot and connect it to get AI responses in Telegram chats.
            </p>
            <Badge variant="outline">Coming soon</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Step 3: Persona ───────────────────────────────────

function StepPersona({
  agentName,
  setAgentName,
  agentPersonality,
  setAgentPersonality,
}: {
  agentName: string
  setAgentName: (v: string) => void
  agentPersonality: string
  setAgentPersonality: (v: string) => void
}) {
  const personalities = [
    { id: 'helpful', label: 'Helpful & Friendly', emoji: '🤗' },
    { id: 'professional', label: 'Professional', emoji: '💼' },
    { id: 'creative', label: 'Creative & Fun', emoji: '🎨' },
    { id: 'concise', label: 'Brief & Direct', emoji: '⚡' },
    { id: 'teacher', label: 'Teacher / Tutor', emoji: '📚' },
    { id: 'coder', label: 'Coding Expert', emoji: '👨‍💻' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-semibold">Customize your agent</h2>
        <p className="text-muted-foreground mt-1">
          Give your AI a name and personality. You can change this anytime.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agent-name">Agent Name</Label>
          <Input
            id="agent-name"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="My AI Assistant"
          />
        </div>

        <div className="space-y-2">
          <Label>Personality</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {personalities.map((p) => (
              <button
                key={p.id}
                onClick={() => setAgentPersonality(p.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  agentPersonality === p.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 4: Ready ─────────────────────────────────────

function StepReady({
  connectedProviders,
  onComplete,
}: {
  connectedProviders: Set<string>
  onComplete: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10">
        <Sparkles className="size-10 text-primary" />
      </div>
      <div>
        <h2 className="text-3xl font-heading font-semibold">You're all set!</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Your AI agent is ready to go.{' '}
          {connectedProviders.size > 0
            ? `You've connected ${connectedProviders.size} AI provider${connectedProviders.size > 1 ? 's' : ''}.`
            : 'Add AI providers in Settings to get started.'}
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button size="lg" className="w-full h-12 text-base" onClick={onComplete}>
          <Sparkles className="mr-2 size-5" />
          Go to Dashboard
        </Button>
        <Button variant="outline" size="lg" className="w-full" asChild>
          <a href="/chat">Start a Chat</a>
        </Button>
      </div>
    </div>
  )
}
