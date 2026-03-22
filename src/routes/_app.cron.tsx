import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Clock,
  Plus,
  Play,
  Pause,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarClock,
  RefreshCw,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'
import { useForm } from '@tanstack/react-form'

export const Route = createFileRoute('/_app/cron')({
  component: CronPage,
})

interface CronJob {
  _id: string
  name: string
  description?: string
  schedule: string
  channel?: string
  prompt: string
  status: 'active' | 'paused' | 'error'
  lastRunAt: string | null
  lastRunStatus: 'success' | 'error' | null
  lastRunError?: string
  nextRunAt: string | null
  runCount: number
  createdAt: string
}

function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const cronForm = useForm({
    defaultValues: {
      name: '',
      schedule: '',
      channel: '',
      prompt: '',
    },
    onSubmit: async ({ value }) => {
      if (!value.name || !value.schedule || !value.prompt) {
        toast.error('Name, schedule, and prompt are required')
        return
      }
      try {
        const res = await apiFetch('/api/cron', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        })
        if (res.ok) {
          const data = await res.json()
          setJobs((prev) => [data.job, ...prev])
          setDialogOpen(false)
          cronForm.reset()
          toast.success('Cron job created')
        } else {
          const err = await res.json()
          toast.error(err.error || 'Failed to create job')
        }
      } catch {
        toast.error('Failed to create job')
      }
    },
  })

  async function loadJobs() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/cron')
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs)
      }
    } catch {
      // API may not be reachable
    }
    setLoading(false)
  }

  useEffect(() => {
    loadJobs()
  }, [])

  async function toggleJob(job: CronJob) {
    const newStatus = job.status === 'active' ? 'paused' : 'active'
    try {
      const res = await apiFetch('/api/cron', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job._id, status: newStatus }),
      })
      if (res.ok) {
        const data = await res.json()
        setJobs((prev) => prev.map((j) => (j._id === job._id ? data.job : j)))
        toast.success(`Job ${newStatus === 'active' ? 'enabled' : 'paused'}`)
      }
    } catch {
      toast.error('Failed to update job')
    }
  }

  async function deleteJob(id: string) {
    try {
      const res = await apiFetch(`/api/cron?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j._id !== id))
        toast.success('Job deleted')
      }
    } catch {
      toast.error('Failed to delete job')
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-semibold">Cron</h1>
              <p className="text-sm text-muted-foreground">
                Scheduled jobs with AI prompt execution and run history.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadJobs} disabled={loading}>
                <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="size-4 mr-2" />
                    New Job
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Cron Job</DialogTitle>
                    <DialogDescription>
                      Schedule a recurring AI prompt execution.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      cronForm.handleSubmit()
                    }}
                    className="space-y-4"
                  >
                    <cronForm.Field name="name">
                      {(field) => (
                        <div className="grid gap-2">
                          <Label>Name</Label>
                          <Input
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Daily Summary"
                          />
                        </div>
                      )}
                    </cronForm.Field>
                    <cronForm.Field name="schedule">
                      {(field) => (
                        <div className="grid gap-2">
                          <Label>Schedule (cron expression)</Label>
                          <Input
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="0 9 * * *"
                            className="font-mono"
                          />
                          <p className="text-xs text-muted-foreground">
                            Standard cron syntax: minute hour day month weekday
                          </p>
                        </div>
                      )}
                    </cronForm.Field>
                    <cronForm.Field name="channel">
                      {(field) => (
                        <div className="grid gap-2">
                          <Label>Channel (optional)</Label>
                          <Input
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="web, whatsapp, telegram"
                          />
                        </div>
                      )}
                    </cronForm.Field>
                    <cronForm.Field name="prompt">
                      {(field) => (
                        <div className="grid gap-2">
                          <Label>Prompt</Label>
                          <Textarea
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="What should the AI do on this schedule?"
                            rows={3}
                          />
                        </div>
                      )}
                    </cronForm.Field>
                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Create Job</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Cron Jobs List */}
          <div className="space-y-3">
            {jobs.map((job) => (
              <Card key={job._id} className={job.status === 'paused' ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                        <CalendarClock className="size-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{job.name}</CardTitle>
                        <CardDescription className="font-mono text-xs">
                          {job.schedule}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {job.status}
                      </Badge>
                      {job.channel && (
                        <Badge variant="secondary" className="text-xs">
                          {job.channel}
                        </Badge>
                      )}
                      {job.lastRunStatus === 'success' && (
                        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/30">
                          <CheckCircle2 className="size-3 mr-1" />
                          success
                        </Badge>
                      )}
                      {job.lastRunStatus === 'error' && (
                        <Badge variant="destructive">
                          <XCircle className="size-3 mr-1" />
                          error
                        </Badge>
                      )}
                      {!job.lastRunStatus && (
                        <Badge variant="secondary">
                          <AlertCircle className="size-3 mr-1" />
                          never run
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleJob(job)}>
                            {job.status === 'active' ? (
                              <>
                                <Pause className="mr-2 size-4" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 size-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteJob(job._id)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{job.prompt}</p>
                  <div className="flex gap-6 text-xs text-muted-foreground">
                    <span>Runs: {job.runCount}</span>
                    <span>Last run: {formatDate(job.lastRunAt)}</span>
                    <span>Next run: {formatDate(job.nextRunAt)}</span>
                  </div>
                  {job.lastRunError && (
                    <p className="text-xs text-destructive mt-1">{job.lastRunError}</p>
                  )}
                </CardContent>
              </Card>
            ))}

            {jobs.length === 0 && !loading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No scheduled jobs</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create a cron job to run AI prompts on a schedule.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
