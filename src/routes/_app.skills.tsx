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
  Star,
  Filter,
  LayoutGrid,
  Wand2,
  CheckCircle2,
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
import { useForm } from '@tanstack/react-form'

interface Skill {
  _id: string
  name: string
  description: string
  content: string
  isEnabled: boolean
  category?: string
  version?: string
  downloads?: number
  rating?: number
  ratingCount?: number
  createdBy: 'system' | 'user' | 'ai' | 'marketplace'
  createdAt: string
}

interface MarketplaceResult {
  slug: string
  name: string
  description: string
  author: string
  downloads: number
  stars: number
  highlighted: boolean
  official: boolean
}

interface CatalogSkill {
  slug: string
  name: string
  description: string
  emoji: string
  category: string
  tags: string[]
  requires: string[]
  source: string
  featured: boolean
  installs: number
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
              <TabsTrigger value="catalog" className="gap-1.5">
                <LayoutGrid className="size-3.5" />
                Catalog
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="gap-1.5">
                <Store className="size-3.5" />
                Marketplace
              </TabsTrigger>
            </TabsList>

            <TabsContent value="installed" className="mt-4">
              <InstalledSkillsTab />
            </TabsContent>
            <TabsContent value="catalog" className="mt-4">
              <CatalogTab />
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
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [loading, setLoading] = useState(true)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const loadSkills = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (searchQuery) params.set('q', searchQuery)
      if (sortBy) params.set('sort', sortBy)
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await apiFetch(`/api/skills${qs}`)
      if (res.ok) {
        const data = await res.json()
        // Handle both old (array) and new (object) formats
        if (Array.isArray(data)) {
          setSkills(data)
        } else {
          setSkills(data.skills || [])
          setCategories(data.categories || [])
        }
      }
    } catch {
      /* server error */
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchQuery, sortBy])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  async function toggleSkill(id: string, currentState: boolean) {
    await apiFetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', skillId: id, isEnabled: !currentState }),
    })
    await loadSkills()
  }

  async function deleteSkill(id: string) {
    await apiFetch(`/api/skills?id=${id}`, { method: 'DELETE' })
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
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex items-center gap-1">
              <Filter className="size-3.5 text-muted-foreground" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-sm"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="createdAt">Newest</option>
            <option value="name">Name</option>
            <option value="downloads">Downloads</option>
            <option value="rating">Rating</option>
          </select>
        </div>
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
                    {skill.category && skill.category !== 'general' && (
                      <Badge variant="secondary" className="text-[10px]">
                        {skill.category}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs gap-1">
                      {creatorIcon(skill.createdBy)}
                      {skill.createdBy}
                    </Badge>
                    <button
                      onClick={() => toggleSkill(skill._id, skill.isEnabled)}
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
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {(skill.downloads ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Download className="size-3" /> {skill.downloads}
                      </span>
                    )}
                    {(skill.rating ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="size-3" /> {skill.rating?.toFixed(1)}
                      </span>
                    )}
                    {skill.version && (
                      <span>v{skill.version}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
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
                            await apiFetch('/api/skills', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ...data, skillId: editingSkill._id }),
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Catalog Tab ───────────────────────────────────────

const CATEGORY_EMOJIS: Record<string, string> = {
  productivity: '📋',
  development: '💻',
  communication: '💬',
  automation: '⚙️',
  'smart-home': '🏠',
  media: '🎨',
  finance: '💰',
  search: '🔍',
  writing: '✍️',
  data: '📊',
  general: '🔧',
}

function CatalogTab() {
  const [skills, setSkills] = useState<CatalogSkill[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [installingSlug, setInstallingSlug] = useState<string | null>(null)
  const [installedSlugs, setInstalledSlugs] = useState<Set<string>>(new Set())

  const loadCatalog = useCallback(async () => {
    try {
      const params = new URLSearchParams({ action: 'catalog' })
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (searchQuery) params.set('q', searchQuery)
      const res = await apiFetch(`/api/skills?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSkills(data.skills || [])
        setCategories(data.categories || [])
      }
    } catch {
      /* server error */
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchQuery])

  // Also load installed skills to know which are already installed
  const loadInstalled = useCallback(async () => {
    try {
      const res = await apiFetch('/api/skills')
      if (res.ok) {
        const data = await res.json()
        const names = new Set(
          (data.skills || data || []).map((s: Skill) => s.name)
        )
        setInstalledSlugs(names as Set<string>)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    loadCatalog()
    loadInstalled()
  }, [loadCatalog, loadInstalled])

  async function seedCatalog() {
    setSeeding(true)
    try {
      const res = await apiFetch('/api/skills?action=seed-catalog')
      if (res.ok) {
        toast.success('Skill catalog seeded!')
        await loadCatalog()
      }
    } catch {
      toast.error('Failed to seed catalog')
    } finally {
      setSeeding(false)
    }
  }

  async function installSkill(skill: CatalogSkill) {
    setInstallingSlug(skill.slug)
    try {
      const res = await apiFetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install-catalog', slug: skill.slug }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'already-installed') {
          toast.info(`"${skill.name}" is already installed`)
        } else {
          toast.success(`Installed "${skill.name}" ${skill.emoji}`)
          setInstalledSlugs((prev) => new Set([...prev, skill.name]))
        }
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

  const isInstalled = (skill: CatalogSkill) => installedSlugs.has(skill.name)

  // Separate featured from the rest
  const featuredSkills = skills.filter((s) => s.featured && !searchQuery)
  const allSkills = searchQuery ? skills : skills.filter((s) => !s.featured)

  return (
    <div className="space-y-6">
      {/* Search + Category + Seed */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter className="size-3.5 text-muted-foreground" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_EMOJIS[c] || '🔧'} {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={seedCatalog} disabled={seeding}>
          {seeding ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Wand2 className="mr-1 size-3" />}
          Seed Catalog
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-32" />
                <div className="h-4 bg-muted rounded w-48 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : skills.length === 0 && !searchQuery ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutGrid className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">Catalog is empty</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Seed the catalog with curated skills to get started.
            </p>
            <Button onClick={seedCatalog} disabled={seeding}>
              {seeding ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Wand2 className="mr-1 size-4" />}
              Seed Catalog
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Featured */}
          {featuredSkills.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                <Star className="size-3.5" /> Featured Skills
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featuredSkills.map((skill) => (
                  <CatalogSkillCard
                    key={skill.slug}
                    skill={skill}
                    installed={isInstalled(skill)}
                    installing={installingSlug === skill.slug}
                    onInstall={() => installSkill(skill)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Skills */}
          {allSkills.length > 0 && (
            <div>
              {featuredSkills.length > 0 && (
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  All Skills
                </h3>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allSkills.map((skill) => (
                  <CatalogSkillCard
                    key={skill.slug}
                    skill={skill}
                    installed={isInstalled(skill)}
                    installing={installingSlug === skill.slug}
                    onInstall={() => installSkill(skill)}
                  />
                ))}
              </div>
            </div>
          )}

          {skills.length === 0 && searchQuery && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="size-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No results</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  No skills match "{searchQuery}". Try a different search term.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function CatalogSkillCard({
  skill,
  installed,
  installing,
  onInstall,
}: {
  skill: CatalogSkill
  installed: boolean
  installing: boolean
  onInstall: () => void
}) {
  return (
    <Card className={`transition-colors ${installed ? 'border-primary/30 bg-primary/5' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">{skill.emoji}</span>
            <CardTitle className="text-base truncate">{skill.name}</CardTitle>
          </div>
          <Badge
            variant="secondary"
            className="text-[10px] shrink-0"
          >
            {CATEGORY_EMOJIS[skill.category] || '🔧'} {skill.category}
          </Badge>
        </div>
        <CardDescription className="text-xs line-clamp-2">
          {skill.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skill.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {skill.installs > 0 && (
              <span className="flex items-center gap-1">
                <Download className="size-3" /> {skill.installs}
              </span>
            )}
            {skill.requires.length > 0 && (
              <span className="text-[10px]">
                Needs: {skill.requires.slice(0, 2).join(', ')}
              </span>
            )}
          </div>
          {installed ? (
            <Button variant="outline" size="sm" disabled className="gap-1">
              <CheckCircle2 className="size-3 text-primary" /> Installed
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onInstall}
              disabled={installing}
              className="gap-1"
            >
              {installing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Download className="size-3" />
              )}
              Install
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Marketplace Tab ───────────────────────────────────

function MarketplaceTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MarketplaceResult[]>([])
  const [trending, setTrending] = useState<MarketplaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [sortBy, setSortBy] = useState<'downloads' | 'newest' | 'trending' | 'stars'>('downloads')
  const [installingSlug, setInstallingSlug] = useState<string | null>(null)
  const [installedSlugs, setInstalledSlugs] = useState<Set<string>>(new Set())

  // Load installed skills to show install status
  const loadInstalled = useCallback(async () => {
    try {
      const res = await apiFetch('/api/skills')
      if (res.ok) {
        const data = await res.json()
        const names = new Set(
          (data.skills || data || []).map((s: Skill) => s.name)
        )
        setInstalledSlugs(names as Set<string>)
      }
    } catch { /* ignore */ }
  }, [])

  // Load popular/trending skills on mount
  const loadTrending = useCallback(async () => {
    setLoadingTrending(true)
    try {
      const params = new URLSearchParams({
        action: 'clawhub-browse',
        sort: sortBy,
        limit: '20',
      })
      const res = await apiFetch(`/api/skills?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTrending(data.results || [])
      }
    } catch { /* server error */ }
    finally {
      setLoadingTrending(false)
    }
  }, [sortBy])

  useEffect(() => {
    loadTrending()
    loadInstalled()
  }, [loadTrending, loadInstalled])

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

  async function install(skill: MarketplaceResult) {
    setInstallingSlug(skill.slug)
    try {
      const res = await apiFetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'install-clawhub',
          slug: skill.slug,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'already-installed') {
          toast.info(`"${skill.name}" is already installed`)
        } else {
          toast.success(`Installed "${skill.name}" from ClawHub`)
          setInstalledSlugs((prev) => new Set([...prev, skill.slug]))
        }
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

  const displayResults = query.trim() && results.length > 0 ? results : trending
  const isSearchMode = query.trim() && results.length > 0

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search 34,000+ ClawHub skills..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className="pl-9 h-9"
          />
        </div>
        <Button onClick={search} disabled={searching} size="sm" className="h-9">
          {searching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </div>

      {/* Sort controls (only for browse mode) */}
      {!isSearchMode && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          {(['downloads', 'trending', 'newest', 'stars'] as const).map((s) => (
            <Button
              key={s}
              variant={sortBy === s ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => setSortBy(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      {/* Results */}
      {(loadingTrending && !isSearchMode) ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-32" />
                <div className="h-4 bg-muted rounded w-48 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : displayResults.length > 0 ? (
        <>
          {isSearchMode && (
            <p className="text-sm text-muted-foreground">
              {results.length} results for "{query}"
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayResults.map((skill) => (
              <Card
                key={skill.slug}
                className={`transition-colors ${
                  installedSlugs.has(skill.slug) ? 'border-primary/30 bg-primary/5' : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base truncate">
                      {skill.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                      {skill.official && (
                        <Badge variant="default" className="text-[10px]">
                          Official
                        </Badge>
                      )}
                      {skill.highlighted && !skill.official && (
                        <Badge variant="secondary" className="text-[10px]">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs line-clamp-2">
                    {skill.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    {skill.author && (
                      <span className="flex items-center gap-1">
                        <User className="size-3" /> {skill.author}
                      </span>
                    )}
                    {skill.downloads > 0 && (
                      <span className="flex items-center gap-1">
                        <Download className="size-3" /> {skill.downloads.toLocaleString()}
                      </span>
                    )}
                    {skill.stars > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="size-3" /> {skill.stars}
                      </span>
                    )}
                  </div>
                  {installedSlugs.has(skill.slug) ? (
                    <Button variant="outline" size="sm" disabled className="gap-1">
                      <CheckCircle2 className="size-3 text-primary" /> Installed
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => install(skill)}
                      disabled={installingSlug === skill.slug}
                      className="gap-1"
                    >
                      {installingSlug === skill.slug ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Download className="size-3" />
                      )}
                      Install
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : !searching ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">ClawHub Marketplace</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Search across 34,000+ community-built AI skills. Skills are MIT-0 licensed and install instantly.
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
  const form = useForm({
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      content: initial?.content ?? '',
    },
    onSubmit: ({ value }) => {
      onSave(value)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      <form.Field name="name">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="skill-name">Name</Label>
            <Input
              id="skill-name"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="e.g., code-reviewer"
            />
          </div>
        )}
      </form.Field>
      <form.Field name="description">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="skill-desc">Description</Label>
            <Input
              id="skill-desc"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="What this skill does"
            />
          </div>
        )}
      </form.Field>
      <form.Field name="content">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="skill-content">Instructions</Label>
            <Textarea
              id="skill-content"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="You are a code reviewer. When reviewing code, focus on..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>
        )}
      </form.Field>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" type="button" onClick={onCancel}>
          <X className="mr-1 size-4" /> Cancel
        </Button>
        <form.Subscribe selector={(s) => s.values}>
          {(values) => (
            <Button type="submit" disabled={!values.name || !values.content}>
              <Save className="mr-1 size-4" /> Save
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
