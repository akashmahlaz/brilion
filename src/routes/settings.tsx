import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Key, Plus, Trash2, RefreshCw, Shield, FileText } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Badge } from '#/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'

const API_BASE = 'http://localhost:4000'

interface Provider {
  id: string
  name: string
  configured: boolean
  models: { id: string; name: string }[]
}

interface AuthProfile {
  profileId: string
  type: string
  provider: string
  expiresAt?: string
}

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [profiles, setProfiles] = useState<AuthProfile[]>([])
  const [newKey, setNewKey] = useState({ provider: '', token: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProviders()
    loadProfiles()
  }, [])

  async function loadProviders() {
    try {
      const res = await fetch(`${API_BASE}/api/models/providers`)
      setProviders(await res.json())
    } catch {
      /* server not running yet */
    }
  }

  async function loadProfiles() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/profiles`)
      setProfiles(await res.json())
    } catch {
      /* server not running yet */
    }
  }

  async function saveApiKey() {
    if (!newKey.provider || !newKey.token) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/api/auth/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey),
      })
      setNewKey({ provider: '', token: '' })
      await loadProfiles()
      await loadProviders()
    } finally {
      setSaving(false)
    }
  }

  async function removeKey(profileId: string) {
    await fetch(`${API_BASE}/api/auth/keys/${encodeURIComponent(profileId)}`, {
      method: 'DELETE',
    })
    await loadProfiles()
    await loadProviders()
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
        {/* Page Title */}
        <div className="px-4 lg:px-6">
          <h1 className="text-lg font-heading font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground/70 mt-1">Manage API keys, providers, and workspace configuration</p>
        </div>

        <div className="px-4 lg:px-6">
          <Tabs defaultValue="keys" className="space-y-6">
            <TabsList className="rounded-lg h-9 p-0.5">
              <TabsTrigger value="keys" className="rounded-md gap-1.5 text-xs h-8 px-3">
                <Key className="size-3" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="providers" className="rounded-md gap-1.5 text-xs h-8 px-3">
                <Shield className="size-3" />
                Providers
              </TabsTrigger>
              <TabsTrigger value="workspace" className="rounded-md gap-1.5 text-xs h-8 px-3">
                <FileText className="size-3" />
                Workspace
              </TabsTrigger>
            </TabsList>

            {/* API Keys Tab */}
            <TabsContent value="keys" className="space-y-4">
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Add API Key</CardTitle>
                  <CardDescription className="text-xs">
                    Connect a new AI provider by adding its API key.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Provider</Label>
                      <select
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={newKey.provider}
                        onChange={(e) =>
                          setNewKey((k) => ({ ...k, provider: e.target.value }))
                        }
                      >
                        <option value="">Select provider...</option>
                        <option value="github">GitHub Models</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="google">Google AI</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="xai">xAI</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">API Token</Label>
                      <Input
                        type="password"
                        placeholder="sk-..."
                        value={newKey.token}
                        onChange={(e) =>
                          setNewKey((k) => ({ ...k, token: e.target.value }))
                        }
                        className="rounded-lg h-9 text-xs"
                      />
                    </div>
                  </div>
                  <Button onClick={saveApiKey} disabled={saving} className="rounded-lg text-xs h-8 press-effect">
                    <Plus className="mr-1.5 size-3.5" />
                    {saving ? 'Saving...' : 'Add Key'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="animate-slide-up" style={{ animationDelay: '50ms' }}>
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Stored Keys</CardTitle>
                  <CardDescription className="text-xs">
                    Active API keys and authentication profiles.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profiles.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-border/40 bg-muted/10 p-8 text-center">
                      <Key className="mx-auto size-7 text-muted-foreground/30 mb-3" />
                      <p className="text-xs font-medium text-muted-foreground">
                        No API keys configured yet
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/50">
                        Add a key above to get started
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {profiles.map((p) => (
                        <div
                          key={p.profileId}
                          className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/15 p-2.5 hover:bg-muted/25 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                              <Key className="size-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-medium">{p.provider}</p>
                              <p className="text-[10px] text-muted-foreground/60">
                                {p.type}
                                {p.expiresAt &&
                                  ` · expires ${new Date(p.expiresAt).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeKey(p.profileId)}
                            className="rounded-lg size-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Providers Tab */}
            <TabsContent value="providers" className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={loadProviders} className="rounded-lg text-xs h-8 press-effect">
                  <RefreshCw className="mr-1.5 size-3" />
                  Refresh
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {providers.map((p) => (
                  <Card key={p.id} className="@container/card animate-slide-up">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-heading text-sm">{p.name}</CardTitle>
                        <Badge
                          variant={p.configured ? 'default' : 'secondary'}
                          className="rounded-md text-[10px] font-mono"
                        >
                          {p.configured ? 'Active' : 'No Key'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[11px] text-muted-foreground/60">
                        {p.models.length} models available
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {providers.length === 0 && (
                  <div className="col-span-full rounded-xl border-2 border-dashed border-border/40 bg-muted/10 p-8 text-center">
                    <Shield className="mx-auto size-7 text-muted-foreground/30 mb-3" />
                    <p className="text-xs font-medium text-muted-foreground">
                      No providers loaded
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/50">
                      Make sure the server is running on port 4000
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Workspace Tab */}
            <TabsContent value="workspace">
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Workspace Files</CardTitle>
                  <CardDescription className="text-xs">
                    These files define your agent's identity and behavior.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      {
                        name: 'BOOTSTRAP.md',
                        desc: 'Main system instructions',
                      },
                      { name: 'SOUL.md', desc: 'Agent identity & personality' },
                      { name: 'USER.md', desc: 'Your preferences' },
                      {
                        name: 'HEARTBEAT.md',
                        desc: 'Recurring task schedule',
                      },
                      { name: 'TOOLS.md', desc: 'Custom tool definitions' },
                    ].map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-muted/15 p-2.5 hover:bg-muted/25 transition-colors"
                      >
                        <div className="flex size-8 items-center justify-center rounded-lg bg-chart-4/10">
                          <FileText className="size-3.5 text-chart-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium font-mono">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {file.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="text-[11px] text-muted-foreground/50">
                  Edit these files to customize how your agent responds.
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
