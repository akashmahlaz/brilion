import { Check, Loader2, Circle, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'

type StepStatus = 'complete' | 'running' | 'pending' | 'error'

interface PipelineStep {
  title: string
  subtitle: string
  status: StepStatus
}

const DEMO_STEPS: PipelineStep[] = [
  { title: 'Compile', subtitle: '0 errors, 1 warning', status: 'complete' },
  { title: 'Security Audit', subtitle: 'Score: 94/100', status: 'complete' },
  { title: 'Test Suite', subtitle: '24/31 passing...', status: 'running' },
  { title: 'Simulation', subtitle: 'Fork mainnet & dry run', status: 'pending' },
  { title: 'Deploy', subtitle: 'Ethereum Mainnet', status: 'pending' },
]

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'complete':
      return (
        <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
          <Check className="size-4 text-emerald-500" />
        </div>
      )
    case 'running':
      return (
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30 animate-pulse-ring">
          <Loader2 className="size-4 text-primary animate-spin" />
        </div>
      )
    case 'error':
      return (
        <div className="flex size-8 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/30">
          <Circle className="size-4 text-red-400" />
        </div>
      )
    default:
      return (
        <div className="flex size-8 items-center justify-center rounded-full bg-muted ring-1 ring-border">
          <Circle className="size-3.5 text-muted-foreground/40" />
        </div>
      )
  }
}

function connectorColor(from: StepStatus, to: StepStatus) {
  if (from === 'complete' && to === 'complete') return 'bg-emerald-500/40'
  if (from === 'complete' && to === 'running') return 'bg-gradient-to-r from-emerald-500/40 to-primary/40'
  return 'bg-border/60'
}

export function DeployPipeline({ steps = DEMO_STEPS }: { steps?: PipelineStep[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <ArrowRight className="size-4 text-primary" />
              Deploy Pipeline
            </CardTitle>
            <CardDescription className="mt-1">
              Compile → Audit → Test → Simulate → Deploy
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-0">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center flex-1 min-w-0 last:flex-none">
              {/* Step node */}
              <div className="flex flex-col items-center gap-2 min-w-0">
                <StepIcon status={step.status} />
                <div className="text-center min-w-0 px-1">
                  <p className={`text-xs font-medium truncate ${
                    step.status === 'complete'
                      ? 'text-foreground'
                      : step.status === 'running'
                        ? 'text-primary'
                        : 'text-muted-foreground/60'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5">
                    {step.subtitle}
                  </p>
                </div>
              </div>

              {/* Connector */}
              {i < steps.length - 1 && (
                <div className={`h-[2px] flex-1 mx-1 rounded-full min-w-3 ${connectorColor(step.status, steps[i + 1].status)}`} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
