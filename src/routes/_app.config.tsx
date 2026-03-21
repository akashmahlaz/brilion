import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
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
import { useRanger } from '@tanstack/react-ranger'
import { useDebouncedValue } from '@tanstack/react-pacer'

export const Route = createFileRoute('/_app/config')({
  component: ConfigPage,
})

interface ConfigField {
  key: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'array' | 'range'
  label: string
  description: string
  tag: string
  options?: string[]
  min?: number
  max?: number
  step?: number
}

const CONFIG_TAGS = ['all', 'general', 'model', 'channels', 'advanced'] as const

/** Read a nested value from an object using dot-notation path */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((curr: any, key) => curr?.[key], obj)
}

/** Immutably set a nested value using dot-notation path */
function setNestedValue(obj: Record<string, any>, path: string, value: any): Record<string, any> {
  const clone = JSON.parse(JSON.stringify(obj))
  const keys = path.split('.')
  let cursor: any = clone
  for (let i = 0; i < keys.length - 1; i++) {
    if (cursor[keys[i]] == null || typeof cursor[keys[i]] !== 'object') {
      cursor[keys[i]] = {}
    }
    cursor = cursor[keys[i]]
  }
  cursor[keys[keys.length - 1]] = value
  return clone
}

// Schema-mapped config fields — keys match exact MongoDB paths
const CONFIG_FIELDS: ConfigField[] = [
  {
    key: 'agents.defaults.model.primary',
    type: 'select',
    label: 'Default Model',
    description: 'Primary AI model for all conversations (format: provider/model-id)',
    tag: 'model',
    options: [
      'github/gpt-4o',
      'github/gpt-4.1',
      'github/gpt-4.1-mini',
      'github-copilot/gpt-4o',
      'github-copilot/claude-sonnet-4-20250514',
      'github-copilot/gemini-2.0-flash',
      'anthropic/claude-opus-4-5',
      'anthropic/claude-sonnet-4-5',
      'openai/gpt-4o',
      'openai/gpt-4.1',
      'openai/o3',
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      'mistral/mistral-large-latest',
      'xai/grok-3',
      'openrouter/meta-llama/llama-3.3-70b-instruct',
    ],
  },
  {
    key: 'systemPrompt',
    type: 'string',
    label: 'System Prompt',
    description: 'Base system prompt injected into every conversation',
    tag: 'general',
  },
  // WhatsApp
  {
    key: 'channels.whatsapp.enabled',
    type: 'boolean',
    label: 'WhatsApp — Enabled',
    description: 'Allow incoming messages through WhatsApp',
    tag: 'channels',
  },
  {
    key: 'channels.whatsapp.dmPolicy',
    type: 'select',
    label: 'WhatsApp — DM Policy',
    description: 'Who can send the AI a direct message on WhatsApp',
    tag: 'channels',
    options: ['open', 'pairing', 'allowlist', 'disabled'],
  },
  {
    key: 'channels.whatsapp.selfChatMode',
    type: 'boolean',
    label: 'WhatsApp — Self-Chat Mode',
    description: 'AI replies when you message your own WhatsApp number',
    tag: 'channels',
  },
  {
    key: 'channels.whatsapp.allowFrom',
    type: 'array',
    label: 'WhatsApp — Allowed Senders',
    description: 'Comma-separated phone numbers allowed to message (use * for everyone)',
    tag: 'channels',
  },
  {
    key: 'channels.whatsapp.groupPolicy',
    type: 'select',
    label: 'WhatsApp — Group Policy',
    description: 'How the AI behaves in WhatsApp group chats',
    tag: 'channels',
    options: ['open', 'allowlist', 'disabled'],
  },
  // Telegram
  {
    key: 'channels.telegram.enabled',
    type: 'boolean',
    label: 'Telegram — Enabled',
    description: 'Allow incoming messages through Telegram',
    tag: 'channels',
  },
  {
    key: 'channels.telegram.dmPolicy',
    type: 'select',
    label: 'Telegram — DM Policy',
    description: 'Who can send the AI a direct message on Telegram',
    tag: 'channels',
    options: ['open', 'pairing', 'allowlist', 'disabled'],
  },
  // Advanced
  {
    key: 'agents.defaults.maxConcurrent',
    type: 'number',
    label: 'Max Concurrent Requests',
    description: 'Maximum simultaneous AI requests',
    tag: 'advanced',
  },
  {
    key: 'agents.defaults.model.temperature',
    type: 'range',
    label: 'Temperature',
    description: 'Controls randomness. Lower = more focused, higher = more creative.',
    tag: 'model',
    min: 0,
    max: 2,
    step: 0.1,
  },
  {
    key: 'agents.defaults.model.maxTokens',
    type: 'range',
    label: 'Max Output Tokens',
    description: 'Maximum tokens in the AI response.',
    tag: 'model',
    min: 256,
    max: 16384,
    step: 256,
  },
]

function RangeField({
  value,
  min,
  max,
  stepSize,
  onChange,
}: {
  value: number
  min: number
  max: number
  stepSize: number
  onChange: (v: number) => void
}) {
  const [values, setValues] = useState([value])
  const rangerRef = useRef<HTMLDivElement>(null)

  const rangerInstance = useRanger<HTMLDivElement>({
    getRangerElement: () => rangerRef.current,
    values,
    min,
    max,
    stepSize,
    onChange: (instance) => {
      const v = instance.sortedValues[0]
      setValues([v])
      onChange(v)
    },
  })

  return (
    <div className="flex items-center gap-4 max-w-md">
      <div
        ref={rangerRef}
        className="relative h-2 flex-1 rounded-full bg-muted cursor-pointer select-none"
      >
        {rangerInstance.getSteps().map((step, i) => (
          <div
            key={i}
            className="absolute h-full bg-primary rounded-full"
            style={{ left: `${step.left}%`, width: `${step.width}%` }}
          />
        ))}
        {rangerInstance.handles().map((handle, i) => (
          <button
            key={i}
            onKeyDown={handle.onKeyDownHandler}
            onMouseDown={handle.onMouseDownHandler}
            onTouchStart={handle.onTouchStart}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={handle.value}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-4 rounded-full bg-primary border-2 border-background shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ left: `${rangerInstance.getPercentageForValue(handle.value)}%` }}
          />
        ))}
      </div>
      <span className="text-sm font-mono w-16 text-right">{values[0]}</span>
    </div>
  )
}

function ConfigPage() {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [rawJson, setRawJson] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTag, setActiveTag] = useState<string>('all')
  const [searchFilter, setSearchFilter] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchFilter, { wait: 250 })

  async function fetchConfig() {
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
    fetchConfig()
  }, [])

  function updateField(key: string, value: string | boolean | number | string[]) {
    setConfig((prev) => setNestedValue(prev, key, value))
  }

  const filteredFields = CONFIG_FIELDS.filter((f) => {
    const tagMatch = activeTag === 'all' || f.tag === activeTag
    const searchMatch =
      !debouncedSearch ||
      f.label.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      f.key.toLowerCase().includes(debouncedSearch.toLowerCase())
    return tagMatch && searchMatch
  })

  async function handleSave() {
    setSaving(true)
    try {
      // Use PATCH with path/value for each field to avoid overwriting unrelated config
      for (const field of CONFIG_FIELDS) {
        const value = getNestedValue(config, field.key)
        if (value !== undefined) {
          await apiFetch('/api/config', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: field.key, value }),
          })
        }
      }
      toast.success('Configuration saved')
    } catch {
      toast.error('Failed to save configuration')
    }
    setSaving(false)
  }

  async function handleRawSave() {
    setSaving(true)
    try {
      const parsed = JSON.parse(rawJson)
      // Strip Mongoose metadata before sending
      const { _id, __v, createdAt, updatedAt, userId, ...updates } = parsed
      void _id; void __v; void createdAt; void updatedAt; void userId
      const res = await apiFetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const saved = await res.json()
        setConfig(saved)
        setRawJson(JSON.stringify(saved, null, 2))
        toast.success('Configuration saved from JSON')
      } else {
        toast.error('Failed to save')
      }
    } catch {
      toast.error('Invalid JSON — check syntax and try again')
    }
    setSaving(false)
  }

  function renderField(field: ConfigField) {
    const raw = getNestedValue(config, field.key)

    if (field.type === 'boolean') {
      return (
        <Switch
          id={field.key}
          checked={raw === true}
          onCheckedChange={(checked) => updateField(field.key, checked)}
        />
      )
    }

    if (field.type === 'select' && field.options) {
      return (
        <Select value={String(raw ?? '')} onValueChange={(v) => updateField(field.key, v)}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (field.type === 'array') {
      const display = Array.isArray(raw) ? raw.join(', ') : String(raw ?? '*')
      return (
        <Input
          id={field.key}
          value={display}
          placeholder="*, +1234567890, +9876543210"
          onChange={(e) =>
            updateField(
              field.key,
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      )
    }

    if (field.type === 'range') {
      return (
        <RangeField
          value={typeof raw === 'number' ? raw : field.min ?? 0}
          min={field.min ?? 0}
          max={field.max ?? 100}
          stepSize={field.step ?? 1}
          onChange={(v) => updateField(field.key, v)}
        />
      )
    }

    if (field.type === 'number') {
      return (
        <Input
          id={field.key}
          type="number"
          value={String(raw ?? '')}
          onChange={(e) => updateField(field.key, Number(e.target.value))}
          className="max-w-50"
        />
      )
    }

    // string — detect system prompt for textarea
    if (field.key === 'systemPrompt') {
      return (
        <Textarea
          id={field.key}
          value={String(raw ?? '')}
          onChange={(e) => updateField(field.key, e.target.value)}
          rows={5}
          className="font-mono text-xs"
          placeholder="You are a helpful AI assistant..."
        />
      )
    }

    return (
      <Input
        id={field.key}
        value={String(raw ?? '')}
        onChange={(e) => updateField(field.key, e.target.value)}
      />
    )
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-semibold">Config</h1>
              <p className="text-sm text-muted-foreground">
                Schema-driven configuration editor. Field keys map directly to the database schema.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchConfig} disabled={loading}>
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

            {/* Form View */}
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
                <div className="flex gap-1.5 flex-wrap">
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
                  {filteredFields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No fields match your filter.
                    </p>
                  )}
                  {filteredFields.map((field) => (
                    <div key={field.key} className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={field.key} className="text-sm font-medium">
                          {field.label}
                        </Label>
                        <Badge variant="outline" className="text-[10px] capitalize font-mono">
                          {field.tag}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                      {renderField(field)}
                    </div>
                  ))}

                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave} disabled={saving || loading}>
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
                    Direct JSON editor. Only edit if you know the exact schema paths. Invalid
                    changes can break AI replies.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    rows={28}
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
