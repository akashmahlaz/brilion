import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  RefreshCw,
  Save,
  Code2,
  FormInput,
  Tag,
  Search,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Switch } from '#/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_app/config')({
  component: ConfigPage,
})

interface ConfigField {
  key: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'select'
  label: string
  description: string
  tag: string
  options?: string[]
}

const CONFIG_TAGS = ['all', 'general', 'model', 'channels', 'safety', 'advanced'] as const

function ConfigPage() {
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [rawJson, setRawJson] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTag, setActiveTag] = useState<string>('all')
  const [searchFilter, setSearchFilter] = useState('')

  async function loadConfig() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        setRawJson(JSON.stringify(data, null, 2))
      }
    } catch {
      toast.error('Failed to load configuration')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadConfig()
  }, [])

  // Build config fields from the loaded config — schema-driven like OpenClaw
  const configFields: ConfigField[] = [
    {
      key: 'model',
      value: String(config.model || ''),
      type: 'select',
      label: 'Default Model',
      description: 'The default AI model for all conversations',
      tag: 'model',
      options: [
        'anthropic/claude-opus-4-6',
        'anthropic/claude-sonnet-4',
        'openai/gpt-4o',
        'openai/o3',
        'google/gemini-2.5-pro',
        'mistral/mistral-large-latest',
        'xai/grok-3',
      ],
    },
    {
      key: 'provider',
      value: String(config.provider || ''),
      type: 'select',
      label: 'Default Provider',
      description: 'Primary AI provider',
      tag: 'model',
      options: ['anthropic', 'openai', 'google', 'mistral', 'xai'],
    },
    {
      key: 'systemPrompt',
      value: String(config.systemPrompt || ''),
      type: 'string',
      label: 'System Prompt',
      description: 'The base system prompt for all agents',
      tag: 'general',
    },
    {
      key: 'maxTokens',
      value: String(config.maxTokens || '4096'),
      type: 'number',
      label: 'Max Tokens',
      description: 'Maximum response token limit',
      tag: 'model',
    },
    {
      key: 'temperature',
      value: String(config.temperature || '0.7'),
      type: 'number',
      label: 'Temperature',
      description: 'Sampling temperature (0-2)',
      tag: 'model',
    },
    {
      key: 'whatsappEnabled',
      value: String(config.whatsappEnabled ?? true),
      type: 'boolean',
      label: 'WhatsApp Channel',
      description: 'Enable WhatsApp messaging channel',
      tag: 'channels',
    },
    {
      key: 'telegramEnabled',
      value: String(config.telegramEnabled ?? true),
      type: 'boolean',
      label: 'Telegram Channel',
      description: 'Enable Telegram messaging channel',
      tag: 'channels',
    },
    {
      key: 'safetyFilter',
      value: String(config.safetyFilter ?? true),
      type: 'boolean',
      label: 'Safety Filter',
      description: 'Enable content safety filtering on responses',
      tag: 'safety',
    },
    {
      key: 'debugMode',
      value: String(config.debugMode ?? false),
      type: 'boolean',
      label: 'Debug Mode',
      description: 'Enable verbose debug logging',
      tag: 'advanced',
    },
  ]

  const filteredFields = configFields.filter((f) => {
    const tagMatch = activeTag === 'all' || f.tag === activeTag
    const searchMatch =
      !searchFilter ||
      f.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
      f.key.toLowerCase().includes(searchFilter.toLowerCase())
    return tagMatch && searchMatch
  })

  async function handleSave() {
    setSaving(true)
    try {
      const res = await apiFetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        toast.success('Configuration saved')
      } else {
        toast.error('Failed to save configuration')
      }
    } catch {
      toast.error('Failed to save configuration')
    }
    setSaving(false)
  }

  async function handleRawSave() {
    setSaving(true)
    try {
      const parsed = JSON.parse(rawJson)
      const res = await apiFetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      if (res.ok) {
        setConfig(parsed)
        toast.success('Configuration saved from JSON')
      } else {
        toast.error('Failed to save')
      }
    } catch {
      toast.error('Invalid JSON')
    }
    setSaving(false)
  }

  function updateField(key: string, value: string | boolean | number) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-semibold">Config</h1>
              <p className="text-sm text-muted-foreground">
                Schema-driven configuration editor with form and raw JSON views.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadConfig} disabled={loading}>
                <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <Tabs defaultValue="form" className="space-y-4">
            <TabsList>
              <TabsTrigger value="form">
                <FormInput className="size-4 mr-2" />
                Form
              </TabsTrigger>
              <TabsTrigger value="json">
                <Code2 className="size-4 mr-2" />
                Raw JSON
              </TabsTrigger>
            </TabsList>

            {/* Form View — OpenClaw style with tag filters */}
            <TabsContent value="form" className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter config..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-1.5">
                  {CONFIG_TAGS.map((tag) => (
                    <Badge
                      key={tag}
                      variant={activeTag === tag ? 'default' : 'outline'}
                      className="cursor-pointer capitalize"
                      onClick={() => setActiveTag(tag)}
                    >
                      <Tag className="size-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <Card>
                <CardContent className="pt-6 space-y-6">
                  {filteredFields.map((field) => (
                    <div key={field.key} className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={field.key} className="text-sm font-medium">
                          {field.label}
                        </Label>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {field.tag}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                      {field.type === 'string' && field.key === 'systemPrompt' ? (
                        <Textarea
                          id={field.key}
                          value={String(config[field.key] || '')}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          rows={4}
                          className="font-mono text-xs"
                        />
                      ) : field.type === 'string' ? (
                        <Input
                          id={field.key}
                          value={String(config[field.key] || '')}
                          onChange={(e) => updateField(field.key, e.target.value)}
                        />
                      ) : field.type === 'number' ? (
                        <Input
                          id={field.key}
                          type="number"
                          value={String(config[field.key] || '')}
                          onChange={(e) => updateField(field.key, Number(e.target.value))}
                          className="max-w-[200px]"
                        />
                      ) : field.type === 'boolean' ? (
                        <Switch
                          id={field.key}
                          checked={config[field.key] === true || config[field.key] === 'true'}
                          onCheckedChange={(checked) => updateField(field.key, checked)}
                        />
                      ) : field.type === 'select' && field.options ? (
                        <Select
                          value={String(config[field.key] || '')}
                          onValueChange={(v) => updateField(field.key, v)}
                        >
                          <SelectTrigger className="max-w-sm">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                    </div>
                  ))}

                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="size-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Raw JSON View */}
            <TabsContent value="json" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Raw Configuration</CardTitle>
                  <CardDescription>
                    Edit the configuration as raw JSON. Changes are applied on save.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    rows={24}
                    className="font-mono text-xs"
                  />
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleRawSave} disabled={saving}>
                      <Save className="size-4 mr-2" />
                      {saving ? 'Saving...' : 'Save JSON'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
