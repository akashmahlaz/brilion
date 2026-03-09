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
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Tabs defaultValue="keys" className="space-y-6">
            <TabsList className="rounded-xl">
              <TabsTrigger value="keys" className="rounded-lg gap-2">
                <Key className="size-3.5" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="providers" className="rounded-lg gap-2">
                <Shield className="size-3.5" />
                Providers
              </TabsTrigger>
              <TabsTrigger value="workspace" className="rounded-lg gap-2">
                <FileText className="size-3.5" />
                Workspace
              </TabsTrigger>
            </TabsList>

            {/* API Keys Tab */}
            <TabsContent value="keys" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Add API Key</CardTitle>
                  <CardDescription>
                    Connect a new AI provider by adding its API key.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <select
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                      <Label>API Token</Label>
                      <Input
                        type="password"
                        placeholder="sk-..."
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
                    Active API keys and authentication profiles.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profiles.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed p-8 text-center">
                      <Key className="mx-auto size-8 text-muted-foreground" />
                      <p className="mt-2 text-sm font-medium text-muted-foreground">
                        No API keys configured yet
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Add a key above to get started
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
                              <Key className="size-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{p.provider}</p>
                              <p className="text-xs text-muted-foreground">
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
            </TabsContent>

            {/* Providers Tab */}
            <TabsContent value="providers" className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={loadProviders} className="rounded-xl">
                  <RefreshCw className="mr-2 size-4" />
                  Refresh
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {providers.map((p) => (
                  <Card key={p.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle>{p.name}</CardTitle>
                        <Badge
                          variant={p.configured ? 'default' : 'secondary'}
                        >
                          {p.configured ? 'Active' : 'No Key'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {p.models.length} models available
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {providers.length === 0 && (
                  <div className="col-span-full rounded-xl border-2 border-dashed p-8 text-center">
                    <Shield className="mx-auto size-8 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium text-muted-foreground">
                      No providers loaded
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Make sure the server is running on port 4000
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Workspace Tab */}
            <TabsContent value="workspace">
              <Card>
                <CardHeader>
                  <CardTitle>Workspace Files</CardTitle>
                  <CardDescription>
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
                        className="flex items-center gap-3 rounded-xl border p-3"
                      >
                        <div className="flex size-9 items-center justify-center rounded-xl bg-chart-4/10">
                          <FileText className="size-4 text-chart-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium font-mono">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {file.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
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
