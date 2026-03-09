import { useMemo } from 'react'
import { Shield, Flame, Code } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip'

interface FunctionAnalysis {
  name: string
  complexity: number
  gasEstimate: number
  riskLevel: 'low' | 'medium' | 'high'
  type: 'read' | 'write' | 'payable'
}

const DEMO_FUNCTIONS: FunctionAnalysis[] = [
  { name: 'initialize', complexity: 3, gasEstimate: 85000, riskLevel: 'low', type: 'write' },
  { name: 'deposit', complexity: 5, gasEstimate: 120000, riskLevel: 'medium', type: 'payable' },
  { name: 'withdraw', complexity: 8, gasEstimate: 180000, riskLevel: 'high', type: 'payable' },
  { name: 'balanceOf', complexity: 1, gasEstimate: 3200, riskLevel: 'low', type: 'read' },
  { name: 'transfer', complexity: 6, gasEstimate: 95000, riskLevel: 'medium', type: 'write' },
  { name: 'approve', complexity: 2, gasEstimate: 46000, riskLevel: 'low', type: 'write' },
  { name: 'stake', complexity: 7, gasEstimate: 155000, riskLevel: 'medium', type: 'payable' },
  { name: 'unstake', complexity: 9, gasEstimate: 210000, riskLevel: 'high', type: 'payable' },
  { name: 'getRewards', complexity: 4, gasEstimate: 72000, riskLevel: 'low', type: 'read' },
  { name: 'setFee', complexity: 2, gasEstimate: 28000, riskLevel: 'medium', type: 'write' },
  { name: 'pause', complexity: 1, gasEstimate: 26000, riskLevel: 'low', type: 'write' },
  { name: 'emergencyExit', complexity: 10, gasEstimate: 320000, riskLevel: 'high', type: 'payable' },
]

function getRiskColor(risk: 'low' | 'medium' | 'high') {
  switch (risk) {
    case 'low': return 'bg-emerald-500'
    case 'medium': return 'bg-amber-500'
    case 'high': return 'bg-red-400'
  }
}

function getRiskGlow(risk: 'low' | 'medium' | 'high') {
  switch (risk) {
    case 'low': return 'shadow-emerald-500/20'
    case 'medium': return 'shadow-amber-500/20'
    case 'high': return 'shadow-red-400/30'
  }
}

export function ContractDNA({ functions = DEMO_FUNCTIONS }: { functions?: FunctionAnalysis[] }) {
  const maxGas = useMemo(() => Math.max(...functions.map(f => f.gasEstimate)), [functions])
  const avgRisk = useMemo(() => {
    const scores = functions.map(f => f.riskLevel === 'high' ? 3 : f.riskLevel === 'medium' ? 2 : 1)
    return scores.reduce((a, b) => a + b, 0) / scores.length
  }, [functions])
  const securityScore = Math.round(100 - (avgRisk - 1) * 30)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Code className="size-4 text-primary" />
              Contract DNA
            </CardTitle>
            <CardDescription className="mt-1">
              Function complexity &amp; risk fingerprint
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-xs font-mono">
              <Shield className="size-3" />
              {securityScore}/100
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs font-mono">
              <Flame className="size-3" />
              {functions.length} fn
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="flex items-end gap-[3px] h-28 px-1">
            {functions.map((fn, i) => {
              const heightPercent = Math.max(15, (fn.complexity / 10) * 100)
              const opacityByGas = 0.4 + (fn.gasEstimate / maxGas) * 0.6
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex-1 flex flex-col items-center justify-end cursor-pointer group"
                      style={{ height: '100%' }}
                    >
                      <div
                        className={`w-full rounded-t-sm ${getRiskColor(fn.riskLevel)} transition-all duration-300 group-hover:shadow-lg ${getRiskGlow(fn.riskLevel)} group-hover:brightness-110`}
                        style={{
                          height: `${heightPercent}%`,
                          opacity: opacityByGas,
                          minHeight: '4px',
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="font-mono font-medium">{fn.name}()</div>
                    <div className="text-muted-foreground mt-0.5">
                      Gas: ~{fn.gasEstimate.toLocaleString()} · Risk: {fn.riskLevel} · {fn.type}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500" /> Low
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-500" /> Med
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-red-400" /> High
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground/60">
            Height = complexity · Opacity = gas cost
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
