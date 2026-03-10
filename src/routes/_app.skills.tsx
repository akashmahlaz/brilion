import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Brain,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  Sparkles,
  User,
  Bot,
  Search,
  Download,
  Store,
  Package,
  Loader2,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Badge } from '#/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { apiFetch } from '#/lib/api'
import { toast } from 'sonner'

interface Skill {
  _id: string
  name: string
  description: string
  content: string
  isEnabled: boolean
  createdBy: 'system' | 'user' | 'ai'
  createdAt: string
}

interface MarketplaceResult {
  name: string
  full_name: string
  description: string
  html_url: string
  stargazers_count: number
  topics: string[]
}

export const Route = createFileRoute('/_app/skills')({
  component: SkillsPage,
})

function SkillsPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="mb-6">
            <h1 className="text-2xl font-heading font-semibold">Skills</h1>
            <p className="text-sm text-muted-foreground">
              Custom instructions that shape how your AI behaves. Browse the marketplace or create your own.
            </p>
          </div>

          <Tabs defaultValue="installed">
            <TabsList>
              <TabsTrigger value="installed" className="gap-1.5">
                <Package className="size-3.5" />
                Installed
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="gap-1.5">
                <Store className="size-3.5" />
                Marketplace
              </TabsTrigger>
            </TabsList>

            <TabsContent value="installed" className="mt-4">
              <InstalledSkillsTab />
            </TabsContent>
            <TabsContent value="marketplace" className="mt-4">
              <MarketplaceTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// ─── Installed Skills Tab ──────────────────────────────

function InstalledSkillsTab() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const loadSkills = useCallback(async () => {
    try {
      const res = await apiFetch('/api/skills')
      if (res.ok) setSkills(await res.json())
    } catch {
      /* server error */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  async function toggleSkill(id: string) {
    await apiFetch(`/api/skills/${id}/toggle`, { method: 'PATCH' })
    await loadSkills()
  }

  async function deleteSkill(id: string) {
    await apiFetch(`/api/skills/${id}`, { method: 'DELETE' })
    await loadSkills()
  }

  const creatorIcon = (by: string) => {
    switch (by) {
      case 'system':
        return <Sparkles className="size-3" />
      case 'ai':
        return <Bot className="size-3" />
      default:
        return <User className="size-3" />
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 size-4" /> New Skill
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Skill</DialogTitle>
              <DialogDescription>
                Add a new skill to customize your AI's behavior.
              </DialogDescription>
            </DialogHeader>
            <SkillForm
              onSave={async (data) => {
                await apiFetch('/api/skills', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                })
                setIsCreateOpen(false)
                await loadSkills()
              }}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded w-40 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : skills.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No skills yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Skills tell your AI how to behave. Create one or browse the marketplace.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 size-4" /> Create Your First Skill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <Card
              key={skill._id}
              className={`transition-colors ${!skill.isEnabled ? 'opacity-60' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-mono truncate">
                    {skill.name}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs gap-1">
                      {creatorIcon(skill.createdBy)}
                      {skill.createdBy}
                    </Badge>
                    <button
                      onClick={() => toggleSkill(skill._id)}
                      className="text-muted-foreground hover:text-foreground"
                      title={skill.isEnabled ? 'Disable' : 'Enable'}
                    >
                      {skill.isEnabled ? (
                        <ToggleRight className="size-5 text-primary" />
                      ) : (
                        <ToggleLeft className="size-5" />
                      )}
                    </button>
                  </div>
                </div>
                {skill.description && (
                  <CardDescription className="text-xs line-clamp-1">
                    {skill.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 font-mono bg-muted/30 rounded-lg p-2">
                  {skill.content}
                </pre>
                <div className="flex gap-1 mt-3">
                  <Dialog
                    open={editingSkill?._id === skill._id}
                    onOpenChange={(open) => !open && setEditingSkill(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSkill(skill)}
                      >
                        <Pencil className="mr-1 size-3" /> Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Edit Skill</DialogTitle>
                        <DialogDescription>
                          Modify this skill's behavior.
                        </DialogDescription>
                      </DialogHeader>
                      {editingSkill && (
                        <SkillForm
                          initial={editingSkill}
                          onSave={async (data) => {
                            await apiFetch(`/api/skills/${editingSkill._id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(data),
                            })
                            setEditingSkill(null)
                            await loadSkills()
                          }}
                          onCancel={() => setEditingSkill(null)}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive-foreground hover:text-destructive"
                    onClick={() => deleteSkill(skill._id)}
                  >
                    <Trash2 className="mr-1 size-3" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Marketplace Tab ───────────────────────────────────

function MarketplaceTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MarketplaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [installingSlug, setInstallingSlug] = useState<string | null>(null)

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await apiFetch(
        `/api/skills?action=search&q=${encodeURIComponent(query)}`
      )
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
      }
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function install(result: MarketplaceResult) {
    setInstallingSlug(result.full_name)
    try {
      const [owner, repo] = result.full_name.split('/')
      const res = await apiFetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'install',
          slug: result.name,
          repo: `${owner}/${repo}`,
        }),
      })
      if (res.ok) {
        toast.success(`Installed "${result.name}"`)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Install failed')
      }
    } catch {
      toast.error('Install failed')
    } finally {
      setInstallingSlug(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search ClawHub marketplace..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className="rounded-xl pl-9"
          />
        </div>
        <Button onClick={search} disabled={searching} className="rounded-xl">
          {searching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </div>

      {results.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <Card key={r.full_name}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-mono truncate">
                    {r.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs gap-1 shrink-0">
                    {r.stargazers_count} stars
                  </Badge>
                </div>
                <CardDescription className="text-xs line-clamp-2">
                  {r.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {r.topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {r.topics.slice(0, 5).map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => install(r)}
                    disabled={installingSlug === r.full_name}
                    className="rounded-xl"
                  >
                    {installingSlug === r.full_name ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <Download className="mr-1 size-3" />
                    )}
                    Install
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    asChild
                  >
                    <a
                      href={r.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !searching ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">ClawHub Marketplace</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Search for community skills to extend your AI's capabilities. Skills from ClawHub are installed directly.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

// ─── Skill Form ────────────────────────────────────────

function SkillForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Skill
  onSave: (data: { name: string; description: string; content: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [content, setContent] = useState(initial?.content ?? '')

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="skill-name">Name</Label>
        <Input
          id="skill-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., code-reviewer"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="skill-desc">Description</Label>
        <Input
          id="skill-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this skill does"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="skill-content">Instructions</Label>
        <Textarea
          id="skill-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="You are a code reviewer. When reviewing code, focus on..."
          rows={8}
          className="font-mono text-sm"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          <X className="mr-1 size-4" /> Cancel
        </Button>
        <Button
          onClick={() => onSave({ name, description, content })}
          disabled={!name || !content}
        >
          <Save className="mr-1 size-4" /> Save
        </Button>
      </div>
    </div>
  )
}
