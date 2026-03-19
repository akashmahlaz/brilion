import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
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

export const Route = createFileRoute('/_app/logs')({
  component: LogsPage,
})

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  source: string
  message: string
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  debug: 'text-muted-foreground',
}


function generateMockLogs(count: number): LogEntry[] {
  const sources = ['gateway', 'chat', 'whatsapp', 'telegram', 'agent', 'skills', 'cron']
  const messages: Record<LogLevel, string[]> = {
    info: [
      'Request processed successfully',
      'Channel connection established',
      'Session created for user',
      'Model response generated',
      'Health check passed',
      'Skill loaded: web_search',
    ],
    warn: [
      'Rate limit approaching threshold',
      'Slow response from provider (2.3s)',
      'Session nearing token limit',
      'Retry attempt 2/3 for API call',
    ],
    error: [
      'Failed to connect to provider',
      'WebSocket connection lost',
      'Invalid API key for provider',
      'Tool execution failed: timeout',
    ],
    debug: [
      'Parsing message payload',
      'Token count: 1,234 / 4,096',
      'Cache hit for model config',
      'Webhook delivery attempt',
    ],
  }
  const levels: LogLevel[] = ['info', 'info', 'info', 'info', 'warn', 'warn', 'error', 'debug', 'debug', 'debug']

  return Array.from({ length: count }, (_, i) => {
    const level = levels[Math.floor(Math.random() * levels.length)]
    const msgs = messages[level]
    return {
      id: String(i),
      timestamp: new Date(Date.now() - (count - i) * 2000).toISOString(),
      level,
      source: sources[Math.floor(Math.random() * sources.length)],
      message: msgs[Math.floor(Math.random() * msgs.length)],
    }
  })
}

function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(() => generateMockLogs(50))
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const logEndRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Live tail — add new logs every 2s
  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      const newLogs = generateMockLogs(1).map((l) => ({
        ...l,
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
      }))
      setLogs((prev) => [...prev.slice(-499), ...newLogs])
    }, 2000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [paused])

  // Auto-scroll
  useEffect(() => {
    if (!paused) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, paused])

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false
    if (sourceFilter !== 'all' && log.source !== sourceFilter) return false
    if (filter && !log.message.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  const sources = Array.from(new Set(logs.map((l) => l.source))).sort()

  function exportLogs() {
    const text = filteredLogs
      .map((l) => `${l.timestamp} [${l.level.toUpperCase()}] [${l.source}] ${l.message}`)
      .join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brilion-logs-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function clearLogs() {
    setLogs([])
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
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px]">
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

          {/* Log Output — terminal style */}
          <Card className="bg-[#0d1117] border-border/50">
            <CardContent className="p-0">
              <div className="h-[calc(100vh-320px)] overflow-y-auto font-mono text-xs">
                <div className="p-3 space-y-px">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-3 py-0.5 hover:bg-white/5 px-2 rounded"
                    >
                      <span className="text-muted-foreground shrink-0 w-[85px]">
                        {formatTime(log.timestamp)}
                      </span>
                      <span
                        className={`shrink-0 w-[42px] uppercase font-bold ${LEVEL_COLORS[log.level]}`}
                      >
                        {log.level}
                      </span>
                      <span className="text-purple-400 shrink-0 w-[80px] truncate">
                        {log.source}
                      </span>
                      <span className="text-[#c9d1d9]">{log.message}</span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
                {filteredLogs.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <ScrollText className="size-8 mr-2" />
                    No logs matching filters
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
