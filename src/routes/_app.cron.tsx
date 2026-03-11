import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
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
  Webhook,
  MessageSquare,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
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

export const Route = createFileRoute('/_app/cron')({
  component: CronPage,
})

interface CronJob {
  id: string
  name: string
  schedule: string
  delivery: 'channel' | 'webhook'
  target: string
  prompt: string
  enabled: boolean
  lastRun: string | null
  lastStatus: 'success' | 'error' | 'pending' | null
  nextRun: string
}

function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([
    {
      id: '1',
      name: 'Daily Summary',
      schedule: '0 9 * * *',
      delivery: 'channel',
      target: 'web',
      prompt: 'Generate a daily summary of pending tasks and upcoming events.',
      enabled: true,
      lastRun: new Date(Date.now() - 3600000).toISOString(),
      lastStatus: 'success',
      nextRun: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      id: '2',
      name: 'Weekly Report',
      schedule: '0 8 * * 1',
      delivery: 'webhook',
      target: 'https://hooks.example.com/report',
      prompt: 'Compile a weekly progress report with key metrics.',
      enabled: false,
      lastRun: null,
      lastStatus: null,
      nextRun: new Date(Date.now() + 604800000).toISOString(),
    },
  ])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newJob, setNewJob] = useState<{
    name: string
    schedule: string
    delivery: 'channel' | 'webhook'
    target: string
    prompt: string
  }>({
    name: '',
    schedule: '',
    delivery: 'channel',
    target: '',
    prompt: '',
  })

  function toggleJob(id: string) {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, enabled: !j.enabled } : j)),
    )
    toast.success('Job updated')
  }

  function deleteJob(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id))
    toast.success('Job deleted')
  }

  function addJob() {
    if (!newJob.name || !newJob.schedule) {
      toast.error('Name and schedule are required')
      return
    }
    const job: CronJob = {
      id: String(Date.now()),
      ...newJob,
      enabled: true,
      lastRun: null,
      lastStatus: null,
      nextRun: new Date(Date.now() + 60000).toISOString(),
    }
    setJobs((prev) => [...prev, job])
    setDialogOpen(false)
    setNewJob({ name: '', schedule: '', delivery: 'channel', target: '', prompt: '' })
    toast.success('Cron job created')
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
                Scheduled jobs with delivery modes, channel/webhook targeting, and run history.
              </p>
            </div>
            <div className="flex gap-2">
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
                      Schedule a recurring AI prompt delivery.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Name</Label>
                      <Input
                        value={newJob.name}
                        onChange={(e) => setNewJob((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Daily Summary"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Schedule (cron expression)</Label>
                      <Input
                        value={newJob.schedule}
                        onChange={(e) => setNewJob((p) => ({ ...p, schedule: e.target.value }))}
                        placeholder="0 9 * * *"
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Standard cron syntax: minute hour day month weekday
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label>Delivery Mode</Label>
                      <Select
                        value={newJob.delivery}
                        onValueChange={(v) =>
                          setNewJob((p) => ({ ...p, delivery: v as 'channel' | 'webhook' }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="channel">Channel</SelectItem>
                          <SelectItem value="webhook">Webhook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>
                        {newJob.delivery === 'channel' ? 'Channel' : 'Webhook URL'}
                      </Label>
                      <Input
                        value={newJob.target}
                        onChange={(e) => setNewJob((p) => ({ ...p, target: e.target.value }))}
                        placeholder={
                          newJob.delivery === 'channel'
                            ? 'web, whatsapp, telegram'
                            : 'https://hooks.example.com/...'
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Prompt</Label>
                      <Textarea
                        value={newJob.prompt}
                        onChange={(e) => setNewJob((p) => ({ ...p, prompt: e.target.value }))}
                        placeholder="What should the AI do on this schedule?"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addJob}>Create Job</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Cron Jobs List */}
          <div className="space-y-3">
            {jobs.map((job) => (
              <Card key={job.id} className={!job.enabled ? 'opacity-60' : ''}>
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
                      <Badge variant="outline" className="gap-1">
                        {job.delivery === 'channel' ? (
                          <MessageSquare className="size-3" />
                        ) : (
                          <Webhook className="size-3" />
                        )}
                        {job.delivery}
                      </Badge>
                      {job.lastStatus === 'success' && (
                        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/30">
                          <CheckCircle2 className="size-3 mr-1" />
                          success
                        </Badge>
                      )}
                      {job.lastStatus === 'error' && (
                        <Badge variant="destructive">
                          <XCircle className="size-3 mr-1" />
                          error
                        </Badge>
                      )}
                      {!job.lastStatus && (
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
                          <DropdownMenuItem onClick={() => toggleJob(job.id)}>
                            {job.enabled ? (
                              <>
                                <Pause className="mr-2 size-4" />
                                Disable
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 size-4" />
                                Enable
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteJob(job.id)}
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
                    <span>
                      Target: <span className="font-mono">{job.target}</span>
                    </span>
                    <span>Last run: {formatDate(job.lastRun)}</span>
                    <span>Next run: {formatDate(job.nextRun)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {jobs.length === 0 && (
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
