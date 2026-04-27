import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
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
  Copy,
  Loader2,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldCheck,
  Zap as ZapIcon,
  Search,
  Globe,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '#/components/ui/tooltip'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'
import { ProviderIcon } from '#/components/provider-icons'
import { PROVIDER_CATALOG } from '#/server/lib/providers'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '#/components/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#/components/ui/collapsible'
import { Skeleton } from '#/components/ui/skeleton'
import { Separator } from '#/components/ui/separator'

interface Provider {
  id: string
  name: string
  description: string
  website: string
  configured: boolean
  modelsEndpoint?: string
  defaultBaseUrl?: string
  freeModels?: string[]
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
  baseUrl?: string
}

interface WorkspaceFile {
  filename: string
  size: number
  updatedAt: string
}

// ─── Provider Categories ──────────────────────────────────

const AI_MODEL_PROVIDERS = ['github', 'github-copilot', 'openai', 'anthropic', 'google', 'openrouter', 'xai', 'mistral', 'groq', 'deepseek', 'cohere', 'cloudflare', 'fireworks', 'perplexity', 'together', 'nebius', 'akash', 'replicate', 'minimax']
const SEARCH_PROVIDERS = ['tavily']
const DEPLOY_PROVIDERS = ['vercel', 'netlify', 'maton']

function getProviderCategory(id: string): 'ai' | 'search' | 'deploy' {
  if (AI_MODEL_PROVIDERS.includes(id)) return 'ai'
  if (SEARCH_PROVIDERS.includes(id)) return 'search'
  return 'deploy'
}

// ─── Settings Navigation ─────────────────────────────────

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

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 lg:px-6">
          <Tabs defaultValue="providers" className="space-y-6">
            <TabsList className="rounded-xl">
              <TabsTrigger value="providers" className="rounded-lg gap-2">
                <ShieldCheck className="size-3.5" />
                Providers
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

            <TabsContent value="providers">
              <ProvidersTab />
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

// ─── Providers Tab (Unified grid + drawer) ────────────────

function ProvidersTab() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [profiles, setProfiles] = useState<AuthProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeProvider, setActiveProvider] = useState<string | null>(null) // sheet open state
  const [currentModel, setCurrentModel] = useState<string | null>(null)

  // Per-provider key state (populated when drawer opens)
  const [keyInput, setKeyInput] = useState('')
  const [baseUrlInput, setBaseUrlInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Model fetching
  const [models, setModels] = useState<Model[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  // Copilot flow
  const [copilotFlow, setCopilotFlow] = useState<{
    userCode: string; verificationUri: string; deviceCode: string; expiresIn: number
  } | null>(null)
  const [copilotPolling, setCopilotPolling] = useState(false)
  const [copilotSuccess, setCopilotSuccess] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeProviderData = providers.find(p => p.id === activeProvider)
  const isCopilot = activeProvider === 'github-copilot'
  const existingProfile = profiles.find(p => p.provider === activeProvider)

  useEffect(() => {
    loadAll()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      await Promise.all([loadProviders(), loadProfiles(), loadCurrentModel()])
    } catch (e) {
      console.error('[ProvidersTab] loadAll failed:', e)
      toast.error('Failed to load providers')
    } finally {
      setLoading(false)
    }
  }

  async function loadCurrentModel() {
    try {
      const res = await apiFetch('/api/config')
      if (res.ok) {
        const config = await res.json()
        setCurrentModel(config.agents?.defaults?.model?.primary || 'gpt-4o')
      }
    } catch (e) {
      console.error('[ProvidersTab] loadCurrentModel failed:', e)
    }
  }

  async function loadProviders() {
    try {
      const res = await apiFetch('/api/models')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setProviders(await res.json())
    } catch (e) {
      console.error('[ProvidersTab] loadProviders failed:', e)
      throw e
    }
  }

  async function loadProfiles() {
    try {
      const res = await apiFetch('/api/keys')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setProfiles(await res.json())
    } catch (e) {
      console.error('[ProvidersTab] loadProfiles failed:', e)
      throw e
    }
  }

  async function openProviderDrawer(providerId: string) {
    setActiveProvider(providerId)
    setKeyInput('')
    setBaseUrlInput('')
    setShowKey(false)
    setTestResult(null)
    setModels([])
    setSelectedModel(null)
    setCopilotFlow(null)
    setCopilotSuccess(false)
    if (pollRef.current) clearInterval(pollRef.current)
    setCopilotPolling(false)

    // Pre-fill base URL if provider has a default
    const p = PROVIDER_CATALOG.find(p => p.id === providerId)
    if (p?.defaultBaseUrl) setBaseUrlInput(p.defaultBaseUrl)

    // Load models if already configured
    if (providers.find(p => p.id === providerId)?.configured) {
      await fetchModels(providerId)
    }
  }

  function closeDrawer() {
    setActiveProvider(null)
    setTestResult(null)
    if (pollRef.current) clearInterval(pollRef.current)
    setCopilotPolling(false)
  }

  async function fetchModels(providerId: string) {
    setLoadingModels(true)
    try {
      const res = await apiFetch(`/api/models?provider=${providerId}`)
      if (res.ok) setModels(await res.json())
    } catch (e) {
      console.error('[ProvidersTab] fetchModels failed:', e)
    } finally {
      setLoadingModels(false)
    }
  }

  async function testConnection(providerId: string, apiKey: string, baseUrl?: string) {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await apiFetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, apiKey, baseUrl }),
      })
      if (res.ok) {
        const fetchedModels = await res.json()
        setModels(fetchedModels)
        setTestResult({ ok: true, message: `Connected! Found ${fetchedModels.length} models.` })
        toast.success(`Connected! Found ${fetchedModels.length} models.`)
      } else {
        const data = await res.json().catch(() => ({}))
        setTestResult({ ok: false, message: data?.error || 'Invalid API key or network error.' })
        toast.error(data?.error || 'Connection failed')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Connection test failed'
      setTestResult({ ok: false, message: msg })
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  async function saveKeyWithTest() {
    if (!activeProvider || !keyInput) return
    setSaving(true)
    setTestResult(null)
    try {
      const res = await apiFetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider,
          apiKey: keyInput,
          baseUrl: baseUrlInput || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Save failed (${res.status})`)
      }
      toast.success('API key saved')
      await Promise.all([loadProviders(), loadProfiles()])
      closeDrawer()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save key'
      toast.error(msg)
      setTestResult({ ok: false, message: msg })
    } finally {
      setSaving(false)
    }
  }

  async function removeKey(profileId: string) {
    try {
      const res = await apiFetch(`/api/keys?profileId=${encodeURIComponent(profileId)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Key removed')
      await Promise.all([loadProviders(), loadProfiles()])
      if (activeProvider) await fetchModels(activeProvider)
    } catch (e) {
      toast.error('Failed to remove key')
    }
  }

  async function selectModel(modelId: string) {
    if (!activeProvider) return
    const spec = `${activeProvider}/${modelId}`
    setSelectedModel(modelId)
    try {
      await apiFetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'agents.defaults.model.primary', value: spec }),
      })
      setCurrentModel(spec)
      toast.success(`Model set to ${spec}`)
    } catch {
      toast.error('Failed to update model')
    }
  }

  // Copilot device login
  const startCopilotLogin = useCallback(async () => {
    setCopilotFlow(null)
    setCopilotSuccess(false)
    try {
      const res = await apiFetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copilot-device-code' }),
      })
      if (!res.ok) throw new Error('Failed to start device flow')
      const data = await res.json()
      setCopilotFlow({
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        deviceCode: data.device_code,
        expiresIn: data.expires_in,
      })

      setCopilotPolling(true)
      const interval = (data.interval || 5) * 1000
      pollRef.current = setInterval(async () => {
        try {
          const checkRes = await apiFetch('/api/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'copilot-check', deviceCode: data.device_code }),
          })
          if (!checkRes.ok) return
          const checkData = await checkRes.json()
          if (checkData.access_token) {
            clearInterval(pollRef.current!)
            pollRef.current = null
            setCopilotPolling(false)
            setCopilotSuccess(true)
            toast.success('GitHub Copilot connected!')
            await Promise.all([loadProviders(), loadProfiles()])
            await fetchModels('github-copilot')
          } else if (checkData.error && checkData.error !== 'authorization_pending' && checkData.error !== 'slow_down') {
            clearInterval(pollRef.current!)
            pollRef.current = null
            setCopilotPolling(false)
            toast.error(`Login failed: ${checkData.error}`)
          }
        } catch (err) {
          console.warn('[copilot-login] poll error:', err)
        }
      }, interval)

      setTimeout(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; setCopilotPolling(false) }
      }, data.expires_in * 1000)
    } catch {
      toast.error('Failed to start Copilot login')
    }
  }, [])

  // Group providers
  const aiProviders = providers.filter(p => getProviderCategory(p.id) === 'ai')
  const searchProviders = providers.filter(p => getProviderCategory(p.id) === 'search')
  const deployProviders = providers.filter(p => getProviderCategory(p.id) === 'deploy')

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Current Model Banner */}
      <CurrentModelBanner currentModel={currentModel} />

      {/* AI Model Providers */}
      <ProviderSection
        title="AI Models"
        description="Configure API keys for AI model providers"
        icon={<Cpu className="size-4" />}
        providers={aiProviders}
        onSelect={openProviderDrawer}
        loading={loading}
      />

      <Separator />

      {/* Search & Tools */}
      <ProviderSection
        title="Search & Tools"
        description="Web search and utility providers"
        icon={<Search className="size-4" />}
        providers={searchProviders}
        onSelect={openProviderDrawer}
        loading={loading}
      />

      <Separator />

      {/* Deployment */}
      <ProviderSection
        title="Deployment"
        description="Deployment platform integrations"
        icon={<Globe className="size-4" />}
        providers={deployProviders}
        onSelect={openProviderDrawer}
        loading={loading}
      />

      {/* Provider Config Drawer */}
      <ProviderDrawer
        provider={activeProviderData}
        profile={existingProfile}
        keyInput={keyInput}
        setKeyInput={setKeyInput}
        baseUrlInput={baseUrlInput}
        setBaseUrlInput={setBaseUrlInput}
        showKey={showKey}
        setShowKey={setShowKey}
        saving={saving}
        testing={testing}
        testResult={testResult}
        models={models}
        loadingModels={loadingModels}
        selectedModel={selectedModel}
        isCopilot={isCopilot}
        copilotFlow={copilotFlow}
        copilotPolling={copilotPolling}
        copilotSuccess={copilotSuccess}
        onClose={closeDrawer}
        onTest={() => testConnection(activeProvider!, keyInput, baseUrlInput || undefined)}
        onSave={saveKeyWithTest}
        onRemove={(pid) => removeKey(pid)}
        onSelectModel={selectModel}
        onCopilotLogin={startCopilotLogin}
        currentModel={currentModel}
      />
    </div>
  )
}

// ─── Provider Section ─────────────────────────────────────

function ProviderSection({
  title, description, icon, providers, onSelect, loading
}: {
  title: string
  description: string
  icon: React.ReactNode
  providers: Provider[]
  onSelect: (id: string) => void
  loading: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <h3 className="text-sm font-semibold font-heading">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => {
          const isSelected = false // managed by drawer
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`group relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-200 hover:shadow-md ${
                p.configured
                  ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                  : 'border-border hover:border-primary/30 hover:bg-accent/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                  p.configured ? 'bg-emerald-500/10' : 'bg-muted group-hover:bg-primary/10'
                }`}>
                  <ProviderIcon provider={p.id} className="size-5" />
                </div>
                {p.configured && (
                  <Badge variant="default" className="rounded-full text-[10px] px-2 py-0.5 gap-1 bg-emerald-500/90 border-0">
                    <Check className="size-2.5" />
                    Active
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-sm font-semibold font-heading tracking-tight">{p.name}</span>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{p.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Current Model Banner ────────────────────────────────

function CurrentModelBanner({ currentModel }: { currentModel: string | null }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-linear-to-r from-primary/5 via-primary/3 to-transparent px-5 py-4">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
        <Cpu className="size-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Current Model</p>
        <p className="text-base font-mono font-semibold text-foreground truncate mt-0.5">
          {currentModel || 'Not configured'}
        </p>
      </div>
      {currentModel && (
        <Badge variant="outline" className="shrink-0 rounded-full text-[10px] px-2.5 py-0.5 gap-1.5">
          <ProviderIcon
            provider={currentModel.includes('/') ? currentModel.split('/')[0] : 'openai'}
            className="size-3"
          />
          {currentModel.includes('/') ? currentModel.split('/')[0] : 'auto'}
        </Badge>
      )}
    </div>
  )
}

// ─── Provider Drawer (Sheet) ────────────────────────────

function ProviderDrawer({
  provider, profile, keyInput, setKeyInput, baseUrlInput, setBaseUrlInput,
  showKey, setShowKey, saving, testing, testResult, models, loadingModels,
  selectedModel, isCopilot, copilotFlow, copilotPolling, copilotSuccess,
  onClose, onTest, onSave, onRemove, onSelectModel, onCopilotLogin, currentModel,
}: ProviderDrawerProps) {
  if (!provider) return null

  const hasExistingKey = provider.configured || profile

  return (
    <Sheet open={!!provider} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col overflow-y-auto">
        <SheetHeader className="space-y-3 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <ProviderIcon provider={provider.id} className="size-5 text-primary" />
            </div>
            <div>
              <SheetTitle>{provider.name}</SheetTitle>
              <SheetDescription className="text-xs">{provider.description}</SheetDescription>
            </div>
          </div>
          {provider.website && (
            <a
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline w-fit"
            >
              Get API key <ExternalLink className="size-3" />
            </a>
          )}
        </SheetHeader>

        <div className="flex-1 space-y-6 p-6">
          {/* Copilot OAuth flow */}
          {isCopilot ? (
            <CopilotOAuthSection
              copilotFlow={copilotFlow}
              copilotPolling={copilotPolling}
              copilotSuccess={copilotSuccess}
              hasExistingKey={hasExistingKey}
              onLogin={onCopilotLogin}
            />
          ) : (
            <>
              {/* API Key Input */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">API Key</Label>
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    placeholder={hasExistingKey ? 'Enter new key to replace...' : 'sk-... or key...'}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="rounded-xl pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {hasExistingKey && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Check className="size-3 text-emerald-600" />
                    Existing key is stored. Enter a new one to replace it.
                  </p>
                )}
              </div>

              {/* Base URL (Advanced) */}
              <Collapsible className="space-y-2">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
                    <ChevronRight className="size-3 transition-transform data-open:rotate-90" />
                    Advanced: Custom Base URL
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-1">
                  <Input
                    placeholder={provider.defaultBaseUrl || 'https://api.example.com/v1'}
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    className="rounded-xl font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave empty to use provider's default endpoint.
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Test Result Alert */}
              {testResult && (
                <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
                  testResult.ok
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-destructive/10 border-destructive/30'
                }`}>
                  {testResult.ok ? (
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <p className="text-xs">{testResult.message}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl gap-2"
                  onClick={onTest}
                  disabled={testing || !keyInput}
                >
                  {testing ? <Loader2 className="size-3.5 animate-spin" /> : <ZapIcon className="size-3.5" />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button
                  className="flex-1 rounded-xl gap-2"
                  onClick={onSave}
                  disabled={saving || !keyInput}
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  {saving ? 'Saving...' : 'Save Key'}
                </Button>
              </div>

              {/* Remove existing key */}
              {profile && (
                <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Key className="size-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-mono">{profile.tokenRef}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive gap-1.5 rounded-lg"
                    onClick={() => onRemove(profile.profileId)}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Model Picker */}
          {models.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Select Model</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-lg text-xs gap-1.5"
                  onClick={() => {
                    const p = provider
                    if (p) apiFetch(`/api/models?provider=${p.id}`).then(r => r.ok && r.json().then(setModels)).catch(() => {})
                  }}
                >
                  <RefreshCw className="size-3" />
                  Refresh
                </Button>
              </div>
              {loadingModels ? (
                <div className="grid gap-2 grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                </div>
              ) : (
                <div className="grid gap-2 grid-cols-2 max-h-64 overflow-y-auto">
                  {models.map((m) => {
                    const spec = `${provider.id}/${m.id}`
                    const isActive = spec === currentModel
                    const isSelected = selectedModel === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => onSelectModel(m.id)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all text-xs ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : isActive
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : 'border-border hover:border-primary/30 hover:bg-accent'
                        }`}
                      >
                        <div className={`size-6 shrink-0 rounded-md flex items-center justify-center ${
                          isSelected ? 'bg-primary/15' : isActive ? 'bg-emerald-500/10' : 'bg-muted'
                        }`}>
                          {isSelected ? <Check className="size-3 text-primary" /> : isActive ? <Zap className="size-3 text-emerald-600" /> : <Cpu className="size-3 text-muted-foreground" />}
                        </div>
                        <span className="font-mono truncate">{m.name || m.id}</span>
                        {isActive && !isSelected && (
                          <Badge variant="outline" className="ml-auto shrink-0 rounded-full text-[9px] px-1.5 py-0.5 text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                            current
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Copilot OAuth Section ────────────────────────────────

function CopilotOAuthSection({
  copilotFlow, copilotPolling, copilotSuccess, hasExistingKey, onLogin
}: {
  copilotFlow: ProviderDrawerProps['copilotFlow']
  copilotPolling: boolean
  copilotSuccess: boolean
  hasExistingKey: boolean
  onLogin: () => void
}) {
  return (
    <div className="space-y-4">
      {!copilotFlow && !copilotSuccess && (
        <>
          <p className="text-sm text-muted-foreground">
            Sign in with your GitHub account to use Copilot models for free.
          </p>
          {hasExistingKey && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Check className="size-3 text-emerald-600" />
              Already connected. Login again to re-authenticate.
            </p>
          )}
          <Button onClick={onLogin} className="w-full rounded-xl gap-2">
            <LogIn className="size-4" />
            Login with GitHub Device Code
          </Button>
        </>
      )}

      {copilotFlow && !copilotSuccess && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Go to{' '}
              <a href={copilotFlow.verificationUri} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                {copilotFlow.verificationUri}
              </a>{' '}
              and enter this code:
            </p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-3xl font-bold font-mono tracking-widest text-foreground">
                {copilotFlow.userCode}
              </code>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => navigator.clipboard.writeText(copilotFlow.userCode)}>
                <Copy className="size-4" />
              </Button>
            </div>
            {copilotPolling && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Waiting for authorization...
              </div>
            )}
          </div>
        </div>
      )}

      {copilotSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
          <Check className="size-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            GitHub Copilot connected successfully!
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Type for ProviderDrawer props ─────────────────────

interface ProviderDrawerProps {
  provider?: Provider
  profile?: AuthProfile
  keyInput: string
  setKeyInput: (v: string) => void
  baseUrlInput: string
  setBaseUrlInput: (v: string) => void
  showKey: boolean
  setShowKey: (v: boolean) => void
  saving: boolean
  testing: boolean
  testResult: { ok: boolean; message: string } | null
  models: Model[]
  loadingModels: boolean
  selectedModel: string | null
  isCopilot: boolean
  copilotFlow: { userCode: string; verificationUri: string; deviceCode: string; expiresIn: number } | null
  copilotPolling: boolean
  copilotSuccess: boolean
  onClose: () => void
  onTest: () => void
  onSave: () => void
  onRemove: (profileId: string) => void
  onSelectModel: (modelId: string) => void
  onCopilotLogin: () => void
  currentModel: string | null
}

// ─── Workspace Tab ────────────────────────────────────────

function WorkspaceTab() {
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadFiles() }, [])

  async function loadFiles() {
    try {
      const res = await apiFetch('/api/workspace')
      if (res.ok) setFiles(await res.json())
    } catch (e) { console.error('[WorkspaceTab] loadFiles failed:', e) }
  }

  async function selectFile(filename: string) {
    setSelectedFile(filename)
    setLoading(true)
    try {
      const res = await apiFetch(`/api/workspace?filename=${encodeURIComponent(filename)}`)
      if (res.ok) {
        const data = await res.json()
        setFileContent(data.content || '')
      }
    } catch (e) {
      console.error('[WorkspaceTab] selectFile failed:', e)
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
    } catch (e) {
      console.error('[WorkspaceTab] saveFile failed:', e)
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Workspace Files</CardTitle>
          <CardDescription className="text-xs">Click a file to edit. Changes affect your AI's behavior.</CardDescription>
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
                <p className="text-sm font-medium font-mono truncate">{f.filename}</p>
                <p className="text-[10px] text-muted-foreground">{fileDescriptions[f.filename] || `${f.size} chars`}</p>
              </div>
            </button>
          ))}
          {files.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-mono">{selectedFile || 'Select a file'}</CardTitle>
            {selectedFile && (
              <Button size="sm" onClick={saveFile} disabled={saving} className="rounded-xl">
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
              <p className="text-sm text-muted-foreground">Select a file from the left to edit</p>
              <p className="text-xs text-muted-foreground mt-1">These files define your AI agent's identity and behavior</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Personalization Tab ─────────────────────────────────

function PersonalizationTab() {
  const [saving, setSaving] = useState(false)
  const [persona, setPersona] = useState({
    aiName: 'Brilion',
    userNickname: '',
    communicationStyle: 'balanced',
    languagePreference: 'en',
    formality: 'balanced',
    memoryEnabled: true,
    memoryDepth: '30d',
    proactiveEnabled: true,
    morningBriefing: true,
    briefingTime: '09:00',
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
    } catch (e) {
      console.error('[PersonalizationTab] save failed:', e)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5">
        <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-primary">Your AI, Your Way</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Brilion learns your name, your preferences, and how you like to communicate — then personalizes every interaction. Like OpenClaw, your AI builds a unique identity based on your relationship.
          </p>
        </div>
      </div>

      {/* Identity */}
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
              <Input value={persona.aiName} onChange={(e) => setPersona({ ...persona, aiName: e.target.value })} placeholder="e.g. Brilion, Aria, Max" className="rounded-xl" />
              <p className="text-[11px] text-muted-foreground">What you call your AI — it introduces itself with this name.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">What should AI call you?</Label>
              <Input value={persona.userNickname} onChange={(e) => setPersona({ ...persona, userNickname: e.target.value })} placeholder="e.g. Akash, Boss, Yaar" className="rounded-xl" />
              <p className="text-[11px] text-muted-foreground">The AI will address you by this name in every message.</p>
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
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
                <Switch checked={persona.replyEmojis} onCheckedChange={(v) => setPersona({ ...persona, replyEmojis: v })} />
                <span className="text-sm text-muted-foreground">{persona.replyEmojis ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
            <div className="flex items-start gap-2">
              <div className="size-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="size-3 text-primary" />
              </div>
              <div className="text-[13px] text-foreground bg-card rounded-xl rounded-tl-sm px-3 py-2 border border-border shadow-sm max-w-sm">
                {persona.communicationStyle === 'desi'
                  ? `Hey ${persona.userNickname || 'yaar'}! Main ${persona.aiName} hun. Bata kya karna hai aaj?`
                  : persona.communicationStyle === 'playful'
                    ? `Hey ${persona.userNickname || 'there'}! I'm ${persona.aiName}. What are we building today?`
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
              <p className="text-[12px] text-muted-foreground mt-0.5">Brilion remembers your preferences, past tasks, and important facts</p>
            </div>
            <Switch checked={persona.memoryEnabled} onCheckedChange={(v) => setPersona({ ...persona, memoryEnabled: v })} />
          </div>
          {persona.memoryEnabled && (
            <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
              {[{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }, { value: 'forever', label: 'Forever' }].map((opt) => (
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
            Memories are stored securely in your workspace. You can view and delete them from Workspace → <code className="text-xs font-mono">MEMORY.md</code>
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
              <p className="text-[12px] text-muted-foreground mt-0.5">Quick daily summary: calendar, tasks, weather, and AI suggestions</p>
            </div>
            <Switch checked={persona.morningBriefing} onCheckedChange={(v) => setPersona({ ...persona, morningBriefing: v })} />
          </div>
          {persona.morningBriefing && (
            <div className="flex items-center gap-3 px-4">
              <Label className="text-sm text-muted-foreground shrink-0">Briefing time</Label>
              <Input type="time" value={persona.briefingTime} onChange={(e) => setPersona({ ...persona, briefingTime: e.target.value })} className="w-32 rounded-xl" />
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Proactive Suggestions</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Brilion notices patterns and suggests automation ideas proactively</p>
            </div>
            <Switch checked={persona.proactiveEnabled} onCheckedChange={(v) => setPersona({ ...persona, proactiveEnabled: v })} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Voice Note Support</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Transcribe and respond to WhatsApp voice messages</p>
            </div>
            <Switch checked={persona.voiceNotes} onCheckedChange={(v) => setPersona({ ...persona, voiceNotes: v })} />
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