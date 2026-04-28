import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { FileText, Save, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

interface WorkspaceFile {
  filename: string
  size: number
  updatedAt: string
}

export const Route = createFileRoute('/_app/settings/workspace')({
  component: WorkspaceTab,
})

const FILE_DESCRIPTIONS: Record<string, string> = {
  'BOOTSTRAP.md': 'Main system instructions — defines core behavior',
  'SOUL.md': 'Agent identity & personality traits',
  'USER.md': 'Your preferences — how you like to work',
  'HEARTBEAT.md': 'Recurring task schedule',
  'TOOLS.md': 'Custom tool definitions & API instructions',
}

function WorkspaceTab() {
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [])

  async function loadFiles() {
    try {
      const res = await apiFetch('/api/workspace')
      if (res.ok) setFiles(await res.json())
    } catch (e) {
      console.error('[WorkspaceTab] loadFiles failed:', e)
    }
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

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Workspace Files</CardTitle>
          <CardDescription className="text-xs">
            Click a file to edit. Changes affect your AI's behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {files.map((f) => (
            <button
              key={f.filename}
              onClick={() => selectFile(f.filename)}
              className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-accent ${
                selectedFile === f.filename ? 'bg-accent' : ''
              }`}
            >
              <FileText className="size-4 shrink-0 text-chart-4" />
              <div className="min-w-0">
                <p className="text-sm font-medium font-mono truncate">{f.filename}</p>
                <p className="text-[10px] text-muted-foreground">
                  {FILE_DESCRIPTIONS[f.filename] || `${f.size} chars`}
                </p>
              </div>
            </button>
          ))}
          {files.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          )}
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
              <p className="text-xs text-muted-foreground mt-1">
                These files define your AI agent's identity and behavior
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
