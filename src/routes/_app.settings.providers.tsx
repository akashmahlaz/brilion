import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { toast } from 'sonner'
import { ProviderIcon } from '#/components/provider-icons'
import { apiFetch } from '#/lib/api'
import { cn } from '#/lib/utils'

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
  createdAt?: string
  updatedAt?: string
}

interface CopilotFlow {
  userCode: string
  verificationUri: string
  deviceCode: string
  expiresIn: number
}

type ProviderKind = 'recommended' | 'model' | 'gateway' | 'integration'

interface ProviderMeta {
  kind: ProviderKind
  badge?: string
  setup: 'api-key' | 'oauth'
  shortDescription: string
  recommendedModel?: string
}

const PROVIDER_META: Record<string, ProviderMeta> = {
  'github-copilot': {
    kind: 'recommended',
    badge: 'Recommended',
    setup: 'oauth',
    shortDescription: 'Use models available through your Copilot subscription.',
    recommendedModel: 'gpt-4.1',
  },
  openai: {
    kind: 'recommended',
    badge: 'Most common',
    setup: 'api-key',
    shortDescription: 'GPT, o-series, realtime, and general purpose models.',
    recommendedModel: 'gpt-4.1',
  },
  anthropic: {
    kind: 'recommended',
    badge: 'Claude',
    setup: 'api-key',
    shortDescription: 'Claude models for reasoning, writing, and agents.',
    recommendedModel: 'claude-sonnet-4-20250514',
  },
  openrouter: {
    kind: 'gateway',
    badge: '200+ models',
    setup: 'api-key',
    shortDescription: 'One key for many providers including Qwen, DeepSeek, Claude, and Llama.',
  },
  github: {
    kind: 'gateway',
    badge: 'Marketplace',
    setup: 'api-key',
    shortDescription: 'GitHub Models Marketplace via the Azure AI inference endpoint.',
  },
  google: { kind: 'model', badge: 'Gemini', setup: 'api-key', shortDescription: 'Gemini Pro and Flash models.' },
  qwen: {
    kind: 'model',
    badge: 'Qwen',
    setup: 'api-key',
    shortDescription: 'Qwen models through Alibaba Cloud DashScope.',
    recommendedModel: 'qwen-plus',
  },
  xai: { kind: 'model', badge: 'Grok', setup: 'api-key', shortDescription: 'Grok models from xAI.' },
  mistral: { kind: 'model', setup: 'api-key', shortDescription: 'Mistral, Pixtral, and Codestral models.' },
  groq: { kind: 'model', badge: 'Fast', setup: 'api-key', shortDescription: 'Low-latency inference for open models.' },
  deepseek: { kind: 'model', badge: 'Low cost', setup: 'api-key', shortDescription: 'DeepSeek chat, reasoning, and coder models.' },
  cohere: { kind: 'model', setup: 'api-key', shortDescription: 'Command models for RAG and enterprise agents.' },
  cloudflare: { kind: 'model', setup: 'api-key', shortDescription: 'Workers AI models at the edge.' },
  fireworks: { kind: 'model', setup: 'api-key', shortDescription: 'Fast hosted open-source model inference.' },
  perplexity: { kind: 'model', badge: 'Search', setup: 'api-key', shortDescription: 'Sonar models with web search grounding.' },
  together: { kind: 'model', setup: 'api-key', shortDescription: 'Hosted open-source models.' },
  nebius: { kind: 'model', setup: 'api-key', shortDescription: 'High-performance hosted models.' },
  akash: { kind: 'model', setup: 'api-key', shortDescription: 'Decentralized AI cloud endpoint.' },
  replicate: { kind: 'model', setup: 'api-key', shortDescription: 'Hosted open-source and media models.' },
  minimax: { kind: 'model', setup: 'api-key', shortDescription: 'MiniMax text and multimodal models.' },
  tavily: { kind: 'integration', setup: 'api-key', shortDescription: 'Web search integration for RAG and research.' },
  vercel: { kind: 'integration', setup: 'api-key', shortDescription: 'Deployment and Vercel platform API token.' },
  netlify: { kind: 'integration', setup: 'api-key', shortDescription: 'Deployment and Netlify platform API token.' },
  maton: { kind: 'integration', setup: 'api-key', shortDescription: 'External gateway integration.' },
}

const RECOMMENDED_PROVIDER_IDS = ['github-copilot', 'openai', 'anthropic', 'openrouter']

export const Route = createFileRoute('/_app/settings/providers')({
  component: ProvidersPage,
})

function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [profiles, setProfiles] = useState<AuthProfile[]>([])
  const [currentModel, setCurrentModel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [recentProviderId, setRecentProviderId] = useState<string | null>(null)

  useEffect(() => {
    void loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [providerList, profileList, modelSpec] = await Promise.all([
        fetchProviders(),
        fetchProfiles(),
        fetchCurrentModel(),
      ])
      setProviders(providerList)
      setProfiles(profileList)
      setCurrentModel(modelSpec)
      setRecentProviderId(getMostRecentModelProvider(profileList, providerList))
    } catch (e) {
      console.error('[ProvidersPage] loadAll failed:', e)
      toast.error('Failed to load providers')
    } finally {
      setLoading(false)
    }
  }

  async function fetchProviders() {
    const res = await apiFetch('/api/models')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as Provider[]
  }

  async function fetchProfiles() {
    const res = await apiFetch('/api/keys')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as AuthProfile[]
  }

  async function fetchCurrentModel() {
    const res = await apiFetch('/api/config')
    if (!res.ok) return null
    const config = await res.json()
    return config.agents?.defaults?.model?.primary ?? null
  }

  function openProvider(id: string) {
    if (id === 'github-copilot') {
      setCopilotOpen(true)
      return
    }
    setActiveProviderId(id)
  }

  async function handleConnected(providerId: string) {
    setRecentProviderId(providerId)
    await loadAll()
  }

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matches = (provider: Provider) => {
      const meta = getProviderMeta(provider.id)
      return (
        !query ||
        provider.name.toLowerCase().includes(query) ||
        provider.id.toLowerCase().includes(query) ||
        provider.description.toLowerCase().includes(query) ||
        meta.shortDescription.toLowerCase().includes(query)
      )
    }

    const visibleProviders = providers.filter(matches)
    const connected = visibleProviders.filter((provider) => isModelProvider(provider) && provider.configured)
    const recommended = RECOMMENDED_PROVIDER_IDS
      .map((id) => visibleProviders.find((provider) => provider.id === id))
      .filter((provider): provider is Provider => !!provider && !provider.configured)
    const gateways = visibleProviders.filter((provider) => getProviderMeta(provider.id).kind === 'gateway' && !provider.configured)
    const modelProviders = visibleProviders.filter((provider) => getProviderMeta(provider.id).kind === 'model' && !provider.configured)
    const integrations = visibleProviders.filter((provider) => getProviderMeta(provider.id).kind === 'integration')

    return { connected, recommended, gateways, modelProviders, integrations }
  }, [providers, search])

  const activeProvider = providers.find((provider) => provider.id === activeProviderId)
  const activeProfile = profiles.find((profile) => profile.provider === activeProviderId)
  const copilotProfile = profiles.find((profile) => profile.provider === 'github-copilot')

  return (
    <div className="flex flex-col gap-6">
      <DefaultModelSelector
        providers={providers}
        profiles={profiles}
        currentModel={currentModel}
        recentProviderId={recentProviderId}
        loading={loading}
        onModelSelected={setCurrentModel}
        onConnectProvider={openProvider}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search providers, gateways, and integrations..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="rounded-xl pl-9"
        />
      </div>

      {loading ? (
        <ProvidersSkeleton />
      ) : (
        <div className="flex flex-col gap-7">
          {visibleGroups.connected.length > 0 && (
            <ProviderSection
              title="Connected model providers"
              description="These providers can be selected as the default route."
              providers={visibleGroups.connected}
              currentModel={currentModel}
              profiles={profiles}
              onOpen={openProvider}
            />
          )}

          {visibleGroups.recommended.length > 0 && (
            <ProviderSection
              title="Recommended first connections"
              description="Start here if you want chat and agents working quickly."
              providers={visibleGroups.recommended}
              currentModel={currentModel}
              profiles={profiles}
              onOpen={openProvider}
            />
          )}

          {visibleGroups.gateways.length > 0 && (
            <ProviderSection
              title="Model gateways"
              description="Use one gateway key to access many model families."
              providers={visibleGroups.gateways}
              currentModel={currentModel}
              profiles={profiles}
              onOpen={openProvider}
            />
          )}

          {visibleGroups.modelProviders.length > 0 && (
            <ProviderSection
              title="Direct model providers"
              description="Connect individual AI labs and inference providers."
              providers={visibleGroups.modelProviders}
              currentModel={currentModel}
              profiles={profiles}
              onOpen={openProvider}
            />
          )}

          {visibleGroups.integrations.length > 0 && (
            <ProviderSection
              title="Service integrations"
              description="These tokens power tools and deployments, not default chat models."
              providers={visibleGroups.integrations}
              currentModel={currentModel}
              profiles={profiles}
              onOpen={openProvider}
            />
          )}

          {Object.values(visibleGroups).every((group) => group.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No providers match "{search}"</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ConnectProviderDialog
        provider={activeProvider}
        profile={activeProfile}
        onOpenChange={(open) => !open && setActiveProviderId(null)}
        onConnected={handleConnected}
        onDisconnected={loadAll}
      />

      <CopilotConnectDialog
        open={copilotOpen}
        onOpenChange={setCopilotOpen}
        existingProfile={copilotProfile}
        currentModel={currentModel}
        onChanged={loadAll}
        onConnected={() => setRecentProviderId('github-copilot')}
        onModelSelected={setCurrentModel}
      />
    </div>
  )
}

function DefaultModelSelector({
  providers,
  profiles,
  currentModel,
  recentProviderId,
  loading,
  onModelSelected,
  onConnectProvider,
}: {
  providers: Provider[]
  profiles: AuthProfile[]
  currentModel: string | null
  recentProviderId: string | null
  loading: boolean
  onModelSelected: (modelSpec: string) => void
  onConnectProvider: (providerId: string) => void
}) {
  const connectedProviders = useMemo(
    () => providers.filter((provider) => provider.configured && isModelProvider(provider)),
    [providers],
  )
  const currentProviderId = currentModel?.includes('/') ? currentModel.split('/', 2)[0] : null
  const currentModelId = currentModel?.includes('/') ? currentModel.split('/', 2)[1] : currentModel
  const initialProviderId = recentProviderId ?? currentProviderId ?? connectedProviders[0]?.id ?? ''
  const [providerId, setProviderId] = useState(initialProviderId)
  const [modelId, setModelId] = useState(currentModelId ?? '')
  const [manualModelId, setManualModelId] = useState('')
  const [models, setModels] = useState<Model[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const nextProviderId = recentProviderId ?? currentProviderId ?? connectedProviders[0]?.id ?? ''
    setProviderId(nextProviderId)
  }, [recentProviderId, currentProviderId, connectedProviders])

  useEffect(() => {
    if (!providerId) {
      setModels([])
      setModelId('')
      return
    }
    void loadModels(providerId)
  }, [providerId])

  async function loadModels(nextProviderId: string) {
    setLoadingModels(true)
    setModelError(null)
    try {
      const res = await apiFetch(`/api/models?provider=${encodeURIComponent(nextProviderId)}`)
      if (!res.ok) throw new Error(`Could not fetch models (${res.status})`)
      const nextModels = (await res.json()) as Model[]
      setModels(nextModels)

      const currentModelBelongsHere = currentProviderId === nextProviderId && currentModelId
      const preferredModel = currentModelBelongsHere ? currentModelId : getProviderMeta(nextProviderId).recommendedModel
      const nextModelId = nextModels.find((model) => model.id === preferredModel)?.id ?? nextModels[0]?.id ?? ''
      setModelId(nextModelId)
      setManualModelId(nextModels.length === 0 ? preferredModel ?? '' : '')
    } catch (e) {
      setModels([])
      setModelId('')
      setManualModelId(getProviderMeta(nextProviderId).recommendedModel ?? '')
      setModelError(e instanceof Error ? e.message : 'Could not fetch models')
    } finally {
      setLoadingModels(false)
    }
  }

  async function saveDefaultModel() {
    const selectedModelId = modelId || manualModelId.trim()
    if (!providerId || !selectedModelId) return
    const spec = `${providerId}/${selectedModelId}`
    setSaving(true)
    try {
      const res = await apiFetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'agents.defaults.model.primary', value: spec }),
      })
      if (!res.ok) throw new Error('Failed to update default model')
      onModelSelected(spec)
      toast.success(`Default model set to ${spec}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set default model')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton className="h-40 rounded-lg" />

  const selectedProvider = providers.find((provider) => provider.id === providerId)
  const selectedProfile = profiles.find((profile) => profile.provider === providerId)
  const selectedModelId = modelId || manualModelId.trim()
  const canSave = !!providerId && !!selectedModelId && !saving

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default model route</CardTitle>
        <CardDescription>
          Choose the connected provider and model Brilion should use for chat and agents.
        </CardDescription>
        {connectedProviders.length > 0 && selectedProvider && (
          <CardAction>
            <Badge variant="secondary" className="rounded-full">
              {selectedProfile ? 'Recently connected' : 'Connected'}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {connectedProviders.length === 0 ? (
          <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-5 text-center">
            <div>
              <p className="text-sm font-medium">Connect a model provider first</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start with GitHub Copilot, OpenAI, Anthropic, or OpenRouter.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {RECOMMENDED_PROVIDER_IDS.map((id) => {
                const provider = providers.find((item) => item.id === id)
                if (!provider) return null
                return (
                  <Button key={id} variant="outline" onClick={() => onConnectProvider(id)} className="gap-2 rounded-xl">
                    <ProviderIcon provider={id} className="size-4" />
                    {provider.name}
                  </Button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
              <div className="flex flex-col gap-2">
                <Label>Default provider</Label>
                <Select value={providerId} onValueChange={setProviderId}>
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="Choose provider" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start">
                    <SelectGroup>
                      <SelectLabel>Connected providers</SelectLabel>
                      {connectedProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <span className="flex items-center gap-2">
                            <ProviderIcon provider={provider.id} className="size-4" />
                            {provider.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Default model</Label>
                {models.length > 0 ? (
                  <Select value={modelId} onValueChange={setModelId} disabled={loadingModels}>
                    <SelectTrigger className="h-10 w-full rounded-xl">
                      <SelectValue placeholder={loadingModels ? 'Fetching models...' : 'Choose model'} />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start">
                      <SelectGroup>
                        <SelectLabel>{selectedProvider?.name ?? 'Models'}</SelectLabel>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <span className="font-mono">{model.name || model.id}</span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={manualModelId}
                    onChange={(event) => setManualModelId(event.target.value)}
                    placeholder={loadingModels ? 'Fetching models...' : 'Enter model ID manually'}
                    disabled={loadingModels}
                    className="h-10 rounded-xl font-mono text-xs"
                  />
                )}
              </div>

              <Button onClick={saveDefaultModel} disabled={!canSave} className="h-10 rounded-xl gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Set default
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {loadingModels && (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" /> Fetching models
                </span>
              )}
              {!loadingModels && models.length > 0 && <span>{models.length} models available</span>}
              {!loadingModels && models.length === 0 && providerId && (
                <span>No model list returned; manual model ID is available.</span>
              )}
              {providerId && (
                <Button variant="ghost" size="sm" onClick={() => loadModels(providerId)} className="h-7 rounded-lg gap-1.5">
                  <RefreshCw className="size-3" /> Refresh
                </Button>
              )}
            </div>

            {modelError && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Model discovery failed</AlertTitle>
                <AlertDescription>{modelError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProviderSection({
  title,
  description,
  providers,
  currentModel,
  profiles,
  onOpen,
}: {
  title: string
  description: string
  providers: Provider[]
  currentModel: string | null
  profiles: AuthProfile[]
  onOpen: (providerId: string) => void
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold font-heading tracking-tight">{title}</h2>
          <Badge variant="outline" className="rounded-full text-[10px]">
            {providers.length}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            currentModel={currentModel}
            profile={profiles.find((profile) => profile.provider === provider.id)}
            onClick={() => onOpen(provider.id)}
          />
        ))}
      </div>
    </section>
  )
}

function ProviderCard({
  provider,
  currentModel,
  profile,
  onClick,
}: {
  provider: Provider
  currentModel: string | null
  profile?: AuthProfile
  onClick: () => void
}) {
  const meta = getProviderMeta(provider.id)
  const isDefault = currentModel?.startsWith(`${provider.id}/`)
  const defaultModelId = isDefault ? currentModel?.split('/', 2)[1] : null

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex min-h-36 flex-col gap-4 rounded-lg bg-card p-4 text-left ring-1 ring-foreground/10 transition-all hover:bg-accent/40 hover:ring-primary/30',
        provider.configured && 'ring-primary/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 items-center justify-center rounded-lg bg-background ring-1 ring-foreground/10">
            <ProviderIcon provider={provider.id} className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{provider.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{provider.id}</p>
          </div>
        </div>
        <Badge variant={provider.configured ? 'secondary' : 'outline'} className="shrink-0 rounded-full text-[10px]">
          {provider.configured ? 'Connected' : meta.setup === 'oauth' ? 'Login' : 'API key'}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <p className="line-clamp-2 text-xs text-muted-foreground">{meta.shortDescription || provider.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {meta.badge && <Badge variant="outline" className="rounded-full text-[10px]">{meta.badge}</Badge>}
          {isDefault && <Badge variant="secondary" className="rounded-full text-[10px]">Default</Badge>}
          {profile?.updatedAt && (
            <Badge variant="outline" className="rounded-full text-[10px]">Updated {formatShortDate(profile.updatedAt)}</Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {defaultModelId ?? (provider.configured ? profile?.tokenRef : provider.defaultBaseUrl ?? provider.website)}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          {provider.configured ? 'Configure' : 'Connect'}
          <Plus className="size-3" />
        </span>
      </div>
    </button>
  )
}

function ConnectProviderDialog({
  provider,
  profile,
  onOpenChange,
  onConnected,
  onDisconnected,
}: {
  provider?: Provider
  profile?: AuthProfile
  onOpenChange: (open: boolean) => void
  onConnected: (providerId: string) => Promise<void>
  onDisconnected: () => Promise<void>
}) {
  const [keyInput, setKeyInput] = useState('')
  const [baseUrlInput, setBaseUrlInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [models, setModels] = useState<Model[]>([])
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!provider) return
    setKeyInput('')
    setBaseUrlInput(provider.defaultBaseUrl ?? '')
    setShowKey(false)
    setConnecting(false)
    setModels([])
    setError(null)
    setConnected(false)
  }, [provider?.id])

  async function connect() {
    if (!provider || !keyInput.trim()) return
    setConnecting(true)
    setError(null)
    try {
      const testRes = await apiFetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider.id,
          apiKey: keyInput.trim(),
          baseUrl: baseUrlInput.trim() || undefined,
        }),
      })
      if (!testRes.ok) {
        const data = await testRes.json().catch(() => ({}))
        throw new Error(data?.error || 'Could not validate this API key')
      }
      const fetchedModels = (await testRes.json()) as Model[]

      const saveRes = await apiFetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider.id,
          apiKey: keyInput.trim(),
          baseUrl: baseUrlInput.trim() || undefined,
        }),
      })
      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to save key')
      }

      setModels(fetchedModels)
      setConnected(true)
      toast.success(`${provider.name} connected`)
      await onConnected(provider.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  async function disconnect() {
    if (!profile) return
    try {
      const res = await apiFetch(`/api/keys?profileId=${encodeURIComponent(profile.profileId)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Provider disconnected')
      await onDisconnected()
      onOpenChange(false)
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  if (!provider) return null

  const meta = getProviderMeta(provider.id)
  const hasModels = models.length > 0

  return (
    <Dialog open={!!provider} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-11 items-center justify-center rounded-lg bg-background ring-1 ring-foreground/10">
              <ProviderIcon provider={provider.id} className="size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>{provider.name}</DialogTitle>
              <DialogDescription className="mt-1">{meta.shortDescription || provider.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-6 py-5">
          {provider.id === 'github' && (
            <Alert>
              <AlertCircle />
              <AlertTitle>GitHub Models Marketplace</AlertTitle>
              <AlertDescription>
                This is not GitHub Copilot. It uses a GitHub token with the Marketplace Models inference endpoint.
              </AlertDescription>
            </Alert>
          )}

          {profile && !connected && (
            <Alert>
              <Check />
              <AlertTitle>Already connected</AlertTitle>
              <AlertDescription>
                A key is saved as {profile.tokenRef}. Paste a new key only if you want to replace it.
              </AlertDescription>
            </Alert>
          )}

          {!connected ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>API key</Label>
                  {provider.website && (
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Get key
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={keyInput}
                    onChange={(event) => setKeyInput(event.target.value)}
                    placeholder={getKeyPlaceholder(provider.id)}
                    className="h-10 rounded-xl pr-10 font-mono text-xs"
                    autoComplete="off"
                    disabled={connecting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  We validate the key by fetching available models, then save it encrypted.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Base URL</Label>
                <Input
                  value={baseUrlInput}
                  onChange={(event) => setBaseUrlInput(event.target.value)}
                  placeholder={provider.defaultBaseUrl || 'Optional custom endpoint'}
                  className="h-10 rounded-xl font-mono text-xs"
                  disabled={connecting}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Alert>
                <Check />
                <AlertTitle>{provider.name} is connected</AlertTitle>
                <AlertDescription>
                  {hasModels
                    ? `${models.length} models were discovered. Choose the default model from the top selector.`
                    : 'The key was saved, but the provider did not return a model list. Use the manual model field in the default selector.'}
                </AlertDescription>
              </Alert>
              {hasModels && (
                <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2">
                  {models.slice(0, 24).map((model) => (
                    <div key={model.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs hover:bg-accent">
                      <span className="truncate font-mono">{model.id}</span>
                      {model.id === meta.recommendedModel && <Badge variant="secondary" className="rounded-full text-[10px]">Recommended</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Connection failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          {profile && !connected && (
            <Button variant="ghost" onClick={disconnect} className="mr-auto text-destructive hover:text-destructive gap-2">
              <Trash2 className="size-4" />
              Disconnect
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {connected ? 'Choose default' : 'Cancel'}
          </Button>
          {!connected && (
            <Button onClick={connect} disabled={connecting || !keyInput.trim()} className="gap-2">
              {connecting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Connect and fetch models
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CopilotConnectDialog({
  open,
  onOpenChange,
  existingProfile,
  currentModel,
  onChanged,
  onConnected,
  onModelSelected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingProfile?: AuthProfile
  currentModel: string | null
  onChanged: () => void
  onConnected: () => void
  onModelSelected: (spec: string) => void
}) {
  const [flow, setFlow] = useState<CopilotFlow | null>(null)
  const [polling, setPolling] = useState(false)
  const [success, setSuccess] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const expiryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) {
      stopPolling()
      setError(null)
      return
    }
    if (existingProfile) {
      setSuccess(true)
      void loadModels()
    }
  }, [open, existingProfile?.profileId])

  useEffect(() => () => stopPolling(), [])

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    if (expiryRef.current) clearTimeout(expiryRef.current)
    pollRef.current = null
    expiryRef.current = null
    setPolling(false)
  }

  async function loadModels() {
    setLoadingModels(true)
    try {
      const res = await apiFetch('/api/models?provider=github-copilot')
      if (res.ok) setModels(await res.json())
    } catch (e) {
      console.error('[Copilot] loadModels failed:', e)
    } finally {
      setLoadingModels(false)
    }
  }

  const startLogin = useCallback(async () => {
    setStarting(true)
    setError(null)
    setFlow(null)
    setSuccess(false)
    stopPolling()
    try {
      const res = await apiFetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copilot-device-code' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to start GitHub login')
      }
      const data = await res.json()
      const nextFlow: CopilotFlow = {
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        deviceCode: data.device_code,
        expiresIn: data.expires_in,
      }
      setFlow(nextFlow)
      setPolling(true)

      pollRef.current = setInterval(async () => {
        const checkRes = await apiFetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'copilot-check', deviceCode: nextFlow.deviceCode }),
        }).catch(() => null)
        if (!checkRes?.ok) return
        const checkData = await checkRes.json()
        if (checkData.access_token) {
          stopPolling()
          setSuccess(true)
          toast.success('GitHub Copilot connected')
          onConnected()
          onChanged()
          await loadModels()
        } else if (checkData.error && checkData.error !== 'authorization_pending' && checkData.error !== 'slow_down') {
          stopPolling()
          setError(`Login failed: ${checkData.error}`)
        }
      }, (data.interval || 5) * 1000)

      expiryRef.current = setTimeout(() => {
        stopPolling()
        setError('Code expired. Please start again.')
      }, nextFlow.expiresIn * 1000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setStarting(false)
    }
  }, [onChanged, onConnected])

  async function selectModel(modelId: string) {
    const spec = `github-copilot/${modelId}`
    try {
      const res = await apiFetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'agents.defaults.model.primary', value: spec }),
      })
      if (!res.ok) throw new Error('Failed to update model')
      onModelSelected(spec)
      toast.success(`Default model set to ${modelId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set default model')
    }
  }

  async function disconnect() {
    if (!existingProfile) return
    try {
      const res = await apiFetch(`/api/keys?profileId=${encodeURIComponent(existingProfile.profileId)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('GitHub Copilot disconnected')
      await onChanged()
      onOpenChange(false)
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-11 items-center justify-center rounded-lg bg-background ring-1 ring-foreground/10">
              <ProviderIcon provider="github-copilot" className="size-7" />
            </div>
            <div>
              <DialogTitle>GitHub Copilot Chat</DialogTitle>
              <DialogDescription className="mt-1">
                Sign in with GitHub device login to use models from your Copilot subscription.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-56 flex-col gap-4 px-6 py-5">
          {!flow && !success && (
            <div className="flex flex-col gap-4">
              <Alert>
                <AlertCircle />
                <AlertTitle>Copilot is different from GitHub Models</AlertTitle>
                <AlertDescription>
                  Copilot uses your GitHub account. GitHub Models Marketplace uses a token and a separate inference endpoint.
                </AlertDescription>
              </Alert>
              <Button onClick={startLogin} disabled={starting} className="w-full gap-2">
                {starting ? <Loader2 className="size-4 animate-spin" /> : <ProviderIcon provider="github" className="size-4" />}
                Sign in with GitHub
              </Button>
            </div>
          )}

          {flow && !success && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-5 text-center">
                <p className="text-xs text-muted-foreground">Enter this code on GitHub</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <code className="font-mono text-3xl font-bold tracking-[0.25em]">{flow.userCode}</code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(flow.userCode)
                      toast.success('Code copied')
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <Button asChild className="w-full gap-2">
                <a href={flow.verificationUri} target="_blank" rel="noopener noreferrer">
                  Open GitHub device page
                  <ExternalLink className="size-4" />
                </a>
              </Button>
              {polling && (
                <p className="inline-flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Waiting for authorization...
                </p>
              )}
            </div>
          )}

          {success && (
            <div className="flex flex-col gap-4">
              <Alert>
                <Check />
                <AlertTitle>Copilot is connected</AlertTitle>
                <AlertDescription>
                  Choose a default model here or use the provider/model selector at the top of the page.
                </AlertDescription>
              </Alert>
              {loadingModels ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-9 rounded-lg" />)}
                </div>
              ) : (
                <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2">
                  {models.map((model) => {
                    const isDefault = `github-copilot/${model.id}` === currentModel
                    return (
                      <button
                        key={model.id}
                        onClick={() => selectModel(model.id)}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent',
                          isDefault && 'bg-accent',
                        )}
                      >
                        <span className="truncate font-mono">{model.id}</span>
                        {isDefault && <Badge variant="secondary" className="rounded-full text-[10px]">Default</Badge>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Login failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          {success && existingProfile && (
            <Button variant="ghost" onClick={disconnect} className="mr-auto text-destructive hover:text-destructive gap-2">
              <Trash2 className="size-4" />
              Disconnect
            </Button>
          )}
          {flow && !success && <Button variant="outline" onClick={startLogin}>New code</Button>}
          <Button onClick={() => onOpenChange(false)} variant={success ? 'default' : 'outline'}>
            {success ? 'Done' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProvidersSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-40" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-lg" />)}
      </div>
    </div>
  )
}

function getProviderMeta(providerId: string): ProviderMeta {
  return PROVIDER_META[providerId] ?? {
    kind: 'integration',
    setup: 'api-key',
    shortDescription: 'External service integration.',
  }
}

function isModelProvider(provider: Provider) {
  return getProviderMeta(provider.id).kind !== 'integration'
}

function getMostRecentModelProvider(profiles: AuthProfile[], providers: Provider[]) {
  const modelProviderIds = new Set(providers.filter(isModelProvider).map((provider) => provider.id))
  return profiles
    .filter((profile) => modelProviderIds.has(profile.provider))
    .sort((a, b) => getProfileTime(b) - getProfileTime(a))[0]?.provider ?? null
}

function getProfileTime(profile: AuthProfile) {
  return new Date(profile.updatedAt ?? profile.createdAt ?? 0).getTime()
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

function getKeyPlaceholder(providerId: string) {
  if (providerId === 'openai') return 'sk-...'
  if (providerId === 'anthropic') return 'sk-ant-...'
  if (providerId === 'qwen') return 'sk-... or DashScope key'
  return 'Paste API key'
}
