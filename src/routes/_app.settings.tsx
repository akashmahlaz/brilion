import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Key,
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  Cpu,
  Check,
  ChevronRight,
  Save,
  ExternalLink,
  Radio,
  Bot,
  Wrench,
  Brain,
  Clock,
  MonitorSmartphone,
  ScrollText,
  BarChart3,
  Bug,
  MessageSquare,
  Settings,
  Sparkles,
  User,
  Zap,
  BookOpen,
  Palette,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Badge } from '#/components/ui/badge'
import { Textarea } from '#/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Switch } from '#/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'
import { ProviderIcon } from '#/components/provider-icons'

interface Provider {
  id: string
  name: string
  description: string
  website: string
  configured: boolean
}

interface Model {
  id: string
  name: string
  provider: string
}

interface AuthProfile {
  profileId: string
  type: string
  provider: string
  tokenRef: string
  expiresAt?: string
}

interface WorkspaceFile {
  filename: string
  size: number
  updatedAt: string
}

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

const SETTINGS_NAV = [
  { label: 'General', icon: Settings, to: '/settings' as const, active: true },
  { separator: true, label: 'AI' },
  { label: 'Agents', icon: Bot, to: '/agents' as const },
  { label: 'Skills', icon: Brain, to: '/skills' as const },
  { label: 'Config', icon: Wrench, to: '/config' as const },
  { separator: true, label: 'Channels' },
  { label: 'Channels', icon: Radio, to: '/channels' as const },
  { label: 'Sessions', icon: MessageSquare, to: '/sessions' as const },
  { separator: true, label: 'System' },
  { label: 'Cron Jobs', icon: Clock, to: '/cron' as const },
  { label: 'Nodes', icon: MonitorSmartphone, to: '/nodes' as const },
  { label: 'Logs', icon: ScrollText, to: '/logs' as const },
  { label: 'Usage', icon: BarChart3, to: '/usage' as const },
  { label: 'Debug', icon: Bug, to: '/debug' as const },
] as const

function SettingsPage() {
  const router = useRouter()
  const pathname = router.state.location.pathname

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Settings navigation */}
      <nav className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-secondary overflow-y-auto">
        <div className="p-4">
          <h2 className="font-heading text-sm font-bold text-foreground tracking-tight">Settings</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Manage your workspace</p>
        </div>
        <div className="flex flex-col gap-0.5 px-2 pb-4">
          {SETTINGS_NAV.map((item, i) => {
            if ('separator' in item && item.separator) {
              return (
                <div key={i} className="pt-3 pb-1 px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              )
            }
            if (!('to' in item)) return null
            const Icon = item.icon
            const isActive = pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                  isActive
                    ? 'bg-primary/8 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {Icon && <Icon className="size-3.5 shrink-0" />}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Settings content — General tab */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 lg:px-6">
          <Tabs defaultValue="models" className="space-y-6">
            <TabsList className="rounded-xl">
              <TabsTrigger value="models" className="rounded-lg gap-2">
                <Cpu className="size-3.5" />
                Model Config
              </TabsTrigger>
              <TabsTrigger value="keys" className="rounded-lg gap-2">
                <Key className="size-3.5" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="workspace" className="rounded-lg gap-2">
                <FileText className="size-3.5" />
                Workspace
              </TabsTrigger>
              <TabsTrigger value="persona" className="rounded-lg gap-2">
                <Sparkles className="size-3.5" />
                Persona
              </TabsTrigger>
            </TabsList>

            <TabsContent value="models">
              <ModelConfigTab />
            </TabsContent>
            <TabsContent value="keys">
              <ApiKeysTab />
            </TabsContent>
            <TabsContent value="workspace">
              <WorkspaceTab />
            </TabsContent>
            <TabsContent value="persona">
              <PersonalizationTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// ─── Model Config Tab (OpenClaw-style) ─────────────────

function ModelConfigTab() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)

  useEffect(() => {
    loadProviders()
  }, [])

  async function loadProviders() {
    try {
      const res = await apiFetch('/api/models')
      if (res.ok) setProviders(await res.json())
    } catch {
      /* */
    }
  }

  async function selectProvider(id: string) {
    setSelectedProvider(id)
    setModels([])
    setSelectedModel(null)
    setLoadingModels(true)
    try {
      const res = await apiFetch(`/api/models?provider=${id}`)
      if (res.ok) setModels(await res.json())
    } catch {
      /* */
    } finally {
      setLoadingModels(false)
    }
  }

  async function saveKey() {
    if (!selectedProvider || !keyInput) return
    setSavingKey(true)
    try {
      await apiFetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, apiKey: keyInput }),
      })
      setKeyInput('')
      toast.success('API key saved')
      await loadProviders()
      // Reload models for this provider now that key is set
      await selectProvider(selectedProvider)
    } catch {
      toast.error('Failed to save key')
    } finally {
      setSavingKey(false)
    }
  }

  async function selectModel(modelId: string) {
    if (!selectedProvider) return
    const spec = `${selectedProvider}/${modelId}`
    setSelectedModel(modelId)
    try {
      await apiFetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'agents.defaults.model.primary',
          value: spec,
        }),
      })
      toast.success(`Model set to ${spec}`)
    } catch {
      toast.error('Failed to update model')
    }
  }

  const currentProvider = providers.find((p) => p.id === selectedProvider)

  return (
    <div className="space-y-6">
      {/* Step 1: Pick Provider */}
      <Card>
        <CardHeader>
          <CardTitle>1. Choose Provider</CardTitle>
          <CardDescription>
            Select an AI provider. Add your API key if not configured yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProvider(p.id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent ${selectedProvider === p.id ? 'border-primary bg-primary/5' : ''}`}
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
                  <ProviderIcon provider={p.id} className="size-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{p.name}</span>
                    {p.configured && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        <Check className="size-2.5 mr-0.5" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {p.description}
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: API Key (if not configured) */}
      {currentProvider && !currentProvider.configured && (
        <Card>
          <CardHeader>
            <CardTitle>2. Add API Key for {currentProvider.name}</CardTitle>
            <CardDescription>
              Get your key from{' '}
              <a
                href={currentProvider.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {currentProvider.website}
                <ExternalLink className="size-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Input
              type="password"
              placeholder="Enter API key..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="rounded-xl"
            />
            <Button
              onClick={saveKey}
              disabled={savingKey || !keyInput}
              className="rounded-xl shrink-0"
            >
              {savingKey ? 'Saving...' : 'Save Key'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Pick Model */}
      {selectedProvider && (currentProvider?.configured || models.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {currentProvider?.configured ? '2' : '3'}. Select Model
                </CardTitle>
                <CardDescription>
                  {models.length} models available from {currentProvider?.name}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => selectProvider(selectedProvider)}
              >
                <RefreshCw className="mr-2 size-3.5" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingModels ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : models.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No models found. Make sure the API key is correct.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => selectModel(m.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${selectedModel === m.id ? 'border-primary bg-primary/5' : ''}`}
                  >
                    {selectedModel === m.id && (
                      <Check className="size-3.5 text-primary shrink-0" />
                    )}
                    <span className="truncate font-mono text-xs">
                      {m.name || m.id}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── API Keys Tab ──────────────────────────────────────

function ApiKeysTab() {
  const [profiles, setProfiles] = useState<AuthProfile[]>([])
  const [newKey, setNewKey] = useState({ provider: '', token: '' })
  const [saving, setSaving] = useState(false)

  const ALL_PROVIDERS = [
    { id: 'github', label: 'GitHub' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'google', label: 'Google AI' },
    { id: 'openrouter', label: 'OpenRouter' },
    { id: 'xai', label: 'xAI' },
    { id: 'tavily', label: 'Tavily (Search)' },
    { id: 'vercel', label: 'Vercel' },
    { id: 'netlify', label: 'Netlify' },
    { id: 'maton', label: 'Maton Gateway' },
  ]

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    try {
      const res = await apiFetch('/api/keys')
      if (res.ok) setProfiles(await res.json())
    } catch {
      /* */
    }
  }

  async function saveApiKey() {
    if (!newKey.provider || !newKey.token) return
    setSaving(true)
    try {
      await apiFetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: newKey.provider, apiKey: newKey.token }),
      })
      setNewKey({ provider: '', token: '' })
      toast.success('Key saved')
      await loadProfiles()
    } catch {
      toast.error('Failed to save key')
    } finally {
      setSaving(false)
    }
  }

  async function removeKey(profileId: string) {
    await apiFetch(`/api/keys?profileId=${encodeURIComponent(profileId)}`, {
      method: 'DELETE',
    })
    toast.success('Key removed')
    await loadProfiles()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add API Key</CardTitle>
          <CardDescription>
            Add tokens for AI providers, search, deployment, and integrations.
            The AI uses these tokens to interact with services on your behalf.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Provider / Service</Label>
              <Select
                value={newKey.provider}
                onValueChange={(v) =>
                  setNewKey((k) => ({ ...k, provider: v }))
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {ALL_PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <ProviderIcon provider={p.id} className="size-3.5" />
                        <span>{p.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Token</Label>
              <Input
                type="password"
                placeholder="sk-... or ghp_... or nfp_..."
                value={newKey.token}
                onChange={(e) =>
                  setNewKey((k) => ({ ...k, token: e.target.value }))
                }
                className="rounded-xl"
              />
            </div>
          </div>
          <Button onClick={saveApiKey} disabled={saving} className="rounded-xl">
            <Plus className="mr-2 size-4" />
            {saving ? 'Saving...' : 'Add Key'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stored Keys</CardTitle>
          <CardDescription>
            Active API keys and tokens. The AI can use these through the web_request tool.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed p-8 text-center">
              <Key className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                No keys configured yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a key above to enable AI capabilities
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {profiles.map((p) => (
                <div
                  key={p.profileId}
                  className="flex items-center justify-between rounded-xl border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                      <ProviderIcon provider={p.provider} className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.provider}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {p.tokenRef || p.type}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeKey(p.profileId)}
                    className="size-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Workspace Tab (OpenClaw-style file editor) ────────

function WorkspaceTab() {
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [])

  async function loadFiles() {
    try {
      const res = await apiFetch('/api/workspace')
      if (res.ok) setFiles(await res.json())
    } catch {
      /* */
    }
  }

  async function selectFile(filename: string) {
    setSelectedFile(filename)
    setLoading(true)
    try {
      const res = await apiFetch(
        `/api/workspace?filename=${encodeURIComponent(filename)}`
      )
      if (res.ok) {
        const data = await res.json()
        setFileContent(data.content || '')
      }
    } catch {
      toast.error('Failed to load file')
    } finally {
      setLoading(false)
    }
  }

  async function saveFile() {
    if (!selectedFile) return
    setSaving(true)
    try {
      await apiFetch('/api/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedFile, content: fileContent }),
      })
      toast.success(`${selectedFile} saved`)
      await loadFiles()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const fileDescriptions: Record<string, string> = {
    'BOOTSTRAP.md': 'Main system instructions — defines core behavior',
    'SOUL.md': 'Agent identity & personality traits',
    'USER.md': 'Your preferences — how you like to work',
    'HEARTBEAT.md': 'Recurring task schedule',
    'TOOLS.md': 'Custom tool definitions & API instructions',
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* File List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Workspace Files</CardTitle>
          <CardDescription className="text-xs">
            Click a file to edit. Changes affect your AI's behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {files.map((f) => (
            <button
              key={f.filename}
              onClick={() => selectFile(f.filename)}
              className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-accent ${selectedFile === f.filename ? 'bg-accent' : ''}`}
            >
              <FileText className="size-4 shrink-0 text-chart-4" />
              <div className="min-w-0">
                <p className="text-sm font-medium font-mono truncate">
                  {f.filename}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {fileDescriptions[f.filename] || `${f.size} chars`}
                </p>
              </div>
            </button>
          ))}
          {files.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-mono">
              {selectedFile || 'Select a file'}
            </CardTitle>
            {selectedFile && (
              <Button
                size="sm"
                onClick={saveFile}
                disabled={saving}
                className="rounded-xl"
              >
                <Save className="mr-1.5 size-3.5" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedFile ? (
            loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="min-h-100 font-mono text-sm rounded-xl resize-y"
                placeholder="File content..."
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a file from the left to edit
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                These files define your AI agent's identity and behavior
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Personalization Tab (OpenClaw-inspired) ─────────────────────────────────

function PersonalizationTab() {
  const [saving, setSaving] = useState(false)
  const [persona, setPersona] = useState({
    // Identity
    aiName: 'Brilion',
    userNickname: '',
    // Personality
    communicationStyle: 'balanced',
    languagePreference: 'en',
    formality: 'balanced',
    // Memory
    memoryEnabled: true,
    memoryDepth: '30d',
    // Proactive
    proactiveEnabled: true,
    morningBriefing: true,
    briefingTime: '09:00',
    // Misc
    replyEmojis: true,
    voiceNotes: false,
  })

  async function save() {
    setSaving(true)
    try {
      await apiFetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'personalization', value: persona }),
      })
      toast.success('Personalization saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* OpenClaw-style intro */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5">
        <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-primary">Your AI, Your Way</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Brilion learns your name, your preferences, and how you like to communicate — then personalizes every interaction. Like OpenClaw, your AI builds a unique identity based on your relationship.
          </p>
        </div>
      </div>

      {/* Identity Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="size-4 text-primary" />
            <CardTitle className="text-base">Identity</CardTitle>
          </div>
          <CardDescription>How you and your AI introduce yourselves</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your AI's Name</Label>
              <Input
                value={persona.aiName}
                onChange={(e) => setPersona({ ...persona, aiName: e.target.value })}
                placeholder="e.g. Brilion, Aria, Max"
                className="rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                What you call your AI — it introduces itself with this name.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">What should AI call you?</Label>
              <Input
                value={persona.userNickname}
                onChange={(e) => setPersona({ ...persona, userNickname: e.target.value })}
                placeholder="e.g. Akash, Boss, Yaar"
                className="rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                The AI will address you by this name in every message.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communication Style */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <CardTitle className="text-base">Communication Style</CardTitle>
          </div>
          <CardDescription>How Brilion talks to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Personality</Label>
              <Select value={persona.communicationStyle} onValueChange={(v) => setPersona({ ...persona, communicationStyle: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly & Warm</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="direct">Direct & Concise</SelectItem>
                  <SelectItem value="playful">Playful & Fun</SelectItem>
                  <SelectItem value="desi">Desi Vibe (Hinglish)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Language</Label>
              <Select value={persona.languagePreference} onValueChange={(v) => setPersona({ ...persona, languagePreference: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="hinglish">Hinglish</SelectItem>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reply Emojis</Label>
              <div className="flex items-center gap-3 h-10 px-3 rounded-xl border border-input bg-background">
                <Switch
                  checked={persona.replyEmojis}
                  onCheckedChange={(v) => setPersona({ ...persona, replyEmojis: v })}
                />
                <span className="text-sm text-muted-foreground">
                  {persona.replyEmojis ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
            <div className="flex items-start gap-2">
              <div className="size-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="size-3 text-primary" />
              </div>
              <div className="text-[13px] text-foreground bg-card rounded-xl rounded-tl-sm px-3 py-2 border border-border shadow-sm max-w-sm">
                {persona.communicationStyle === 'desi'
                  ? `Hey ${persona.userNickname || 'yaar'}! 👋 Main ${persona.aiName} hun. Bata kya karna hai aaj? 😄`
                  : persona.communicationStyle === 'playful'
                    ? `Hey ${persona.userNickname || 'there'}! ✨ I'm ${persona.aiName}. What are we building today? 🚀`
                    : persona.communicationStyle === 'direct'
                      ? `Hi ${persona.userNickname || 'there'}. I'm ${persona.aiName}. What do you need?`
                      : `Hello ${persona.userNickname || 'there'}! I'm ${persona.aiName}. How can I help you today?`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memory Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <CardTitle className="text-base">Memory</CardTitle>
          </div>
          <CardDescription>How long Brilion remembers past conversations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Enable Long-term Memory</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Brilion remembers your preferences, past tasks, and important facts
              </p>
            </div>
            <Switch
              checked={persona.memoryEnabled}
              onCheckedChange={(v) => setPersona({ ...persona, memoryEnabled: v })}
            />
          </div>
          {persona.memoryEnabled && (
            <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
              {[
                { value: '7d', label: '7 days' },
                { value: '30d', label: '30 days' },
                { value: '90d', label: '90 days' },
                { value: 'forever', label: 'Forever' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPersona({ ...persona, memoryDepth: opt.value })}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    persona.memoryDepth === opt.value
                      ? 'border-primary bg-primary/8 text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <div className="rounded-xl bg-muted/40 px-3 py-2.5 text-[12px] text-muted-foreground">
            💡 Memories are stored securely in your workspace. You can view and delete them from Workspace → <code className="text-xs font-mono">MEMORY.md</code>
          </div>
        </CardContent>
      </Card>

      {/* Proactive Behavior */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <CardTitle className="text-base">Proactive Behavior</CardTitle>
          </div>
          <CardDescription>Brilion checks in on you — without you asking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Morning Briefing on WhatsApp</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Quick daily summary: calendar, tasks, weather, and AI suggestions
              </p>
            </div>
            <Switch
              checked={persona.morningBriefing}
              onCheckedChange={(v) => setPersona({ ...persona, morningBriefing: v })}
            />
          </div>
          {persona.morningBriefing && (
            <div className="flex items-center gap-3 px-4">
              <Label className="text-sm text-muted-foreground shrink-0">Briefing time</Label>
              <Input
                type="time"
                value={persona.briefingTime}
                onChange={(e) => setPersona({ ...persona, briefingTime: e.target.value })}
                className="w-32 rounded-xl"
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Proactive Suggestions</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Brilion notices patterns and suggests automation ideas proactively
              </p>
            </div>
            <Switch
              checked={persona.proactiveEnabled}
              onCheckedChange={(v) => setPersona({ ...persona, proactiveEnabled: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Voice Note Support</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Transcribe and respond to WhatsApp voice messages
              </p>
            </div>
            <Switch
              checked={persona.voiceNotes}
              onCheckedChange={(v) => setPersona({ ...persona, voiceNotes: v })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="rounded-xl px-6">
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Saving…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="size-3.5" />
              Save Personalization
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
