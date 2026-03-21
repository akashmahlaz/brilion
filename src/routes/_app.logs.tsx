import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ScrollText,
  Download,
  Pause,
  Play,
  Search,
  Trash2,
} from 'lucide-react'
import {
  Card,
  CardContent,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { apiFetch } from '#/lib/api'
import { toast } from 'sonner'

export const Route = createFileRoute('/_app/logs')({
  component: LogsPage,
})

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  _id: string
  createdAt: string
  level: LogLevel
  source: string
  message: string
  meta?: Record<string, unknown>
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  debug: 'text-muted-foreground',
}

function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const [debouncedFilter] = useDebouncedValue(filter, { wait: 300 })
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [levelCounts, setLevelCounts] = useState<Record<string, number>>({})
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const parentRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadLogs = useCallback(async (append = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (levelFilter !== 'all') params.set('level', levelFilter)
      if (sourceFilter !== 'all') params.set('source', sourceFilter)
      if (append && cursor) params.set('cursor', cursor)

      const res = await apiFetch(`/api/logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (append) {
          setLogs((prev) => [...prev, ...data.logs])
        } else {
          setLogs(data.logs)
        }
        setCursor(data.nextCursor)
        setHasMore(data.hasMore)
        setLevelCounts(data.levelCounts || {})
      }
    } catch {
      // API may not be reachable
    }
    setLoading(false)
  }, [levelFilter, sourceFilter, cursor])

  // Initial load + refresh on filter change
  useEffect(() => {
    setCursor(null)
    setLogs([])
    loadLogs(false)
  }, [levelFilter, sourceFilter])

  // Live polling when not paused
  useEffect(() => {
    if (paused) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(() => {
      loadLogs(false)
    }, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [paused, levelFilter, sourceFilter])

  // Filter logs client-side by text search
  const filteredLogs = debouncedFilter
    ? logs.filter((l) => l.message.toLowerCase().includes(debouncedFilter.toLowerCase()))
    : logs

  const sources = Array.from(new Set(logs.map((l) => l.source))).sort()

  // Virtual list
  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 20,
  })

  function exportLogs() {
    const text = filteredLogs
      .map((l) => `${l.createdAt} [${l.level.toUpperCase()}] [${l.source}] ${l.message}`)
      .join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brilion-logs-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function clearLogs() {
    try {
      const res = await apiFetch('/api/logs', { method: 'DELETE' })
      if (res.ok) {
        setLogs([])
        setCursor(null)
        toast.success('Logs cleared')
      }
    } catch {
      toast.error('Failed to clear logs')
    }
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-heading font-semibold">Logs</h1>
              <p className="text-sm text-muted-foreground">
                Live tail log viewer with filtering and export.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={paused ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPaused(!paused)}
              >
                {paused ? (
                  <>
                    <Play className="size-4 mr-1" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="size-4 mr-1" />
                    Pause
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={exportLogs}>
                <Download className="size-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={clearLogs}>
                <Trash2 className="size-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Filter logs..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-30">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info {levelCounts.info ? `(${levelCounts.info})` : ''}</SelectItem>
                <SelectItem value="warn">Warn {levelCounts.warn ? `(${levelCounts.warn})` : ''}</SelectItem>
                <SelectItem value="error">Error {levelCounts.error ? `(${levelCounts.error})` : ''}</SelectItem>
                <SelectItem value="debug">Debug {levelCounts.debug ? `(${levelCounts.debug})` : ''}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-35">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs">
              {filteredLogs.length} entries
            </Badge>
          </div>

          {/* Virtualized Log Output — terminal style */}
          <Card className="bg-[#0d1117] border-border/50">
            <CardContent className="p-0">
              <div
                ref={parentRef}
                className="h-[calc(100vh-320px)] overflow-y-auto font-mono text-xs"
              >
                <div
                  className="relative w-full p-3"
                  style={{ height: `${virtualizer.getTotalSize()}px` }}
                >
                  {virtualizer.getVirtualItems().map((vItem) => {
                    const log = filteredLogs[vItem.index]
                    return (
                      <div
                        key={log._id}
                        className="absolute top-0 left-0 w-full flex gap-3 py-0.5 hover:bg-white/5 px-5 rounded"
                        style={{
                          height: `${vItem.size}px`,
                          transform: `translateY(${vItem.start}px)`,
                        }}
                      >
                        <span className="text-muted-foreground shrink-0 w-21">
                          {formatTime(log.createdAt)}
                        </span>
                        <span
                          className={`shrink-0 w-11 uppercase font-bold ${LEVEL_COLORS[log.level] ?? 'text-muted-foreground'}`}
                        >
                          {log.level}
                        </span>
                        <span className="text-purple-400 shrink-0 w-20 truncate">
                          {log.source}
                        </span>
                        <span className="text-[#c9d1d9] truncate flex-1">{log.message}</span>
                      </div>
                    )
                  })}
                </div>
                {filteredLogs.length === 0 && !loading && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <ScrollText className="size-8 mr-2" />
                    No logs matching filters
                  </div>
                )}
              </div>
              {hasMore && (
                <div className="p-2 text-center border-t border-border/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadLogs(true)}
                    disabled={loading}
                    className="text-xs text-muted-foreground"
                  >
                    {loading ? 'Loading...' : 'Load more'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
