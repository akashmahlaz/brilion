import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  MessageCircle,
  Send as SendIcon,
  QrCode,
  RefreshCw,
  PowerOff,
  Wifi,
  WifiOff,
  Smartphone,
  Phone,
  Shield,
  Users,
  Check,
  ChevronRight,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Badge } from '#/components/ui/badge'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_app/channels')({
  component: ChannelsPage,
})

function ChannelsPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
          <WhatsAppCard />
          <TelegramCard />
        </div>
      </div>
    </div>
  )
}

// ─── WhatsApp Card with Onboarding ─────────────────────

function WhatsAppCard() {
  const [waStatus, setWaStatus] = useState<{
    connected: boolean
    onboarded: boolean
    phoneType: string | null
    dmPolicy: string
  } | null>(null)
  const [qrSession, setQrSession] = useState<{
    sessionId: string
    qrDataUrl: string | null
    message: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0) // 0=not started, 1=phone type, 2=dm policy, 3=done
  const [phoneType, setPhoneType] = useState<'personal' | 'separate'>('personal')
  const [dmPolicy, setDmPolicy] = useState<'open' | 'pairing' | 'allowlist'>('pairing')
  const [allowList, setAllowList] = useState('')

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const res = await apiFetch('/api/whatsapp?action=status')
      if (res.ok) {
        const data = await res.json()
        setWaStatus(data)
        if (data.connected && !data.onboarded) {
          setOnboardingStep(1)
        }
      }
    } catch {
      setWaStatus(null)
    }
  }

  async function startLogin() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login' }),
      })
      const data = await res.json()
      setQrSession(data)

      // Start polling for status
      if (data.sessionId) {
        const interval = setInterval(async () => {
          try {
            const pollRes = await apiFetch(
              `/api/whatsapp?action=login&sessionId=${data.sessionId}`
            )
            const pollData = await pollRes.json()
            setQrSession((prev) =>
              prev ? { ...prev, ...pollData } : prev
            )
            if (pollData.status === 'connected') {
              clearInterval(interval)
              toast.success('WhatsApp connected!')
              setOnboardingStep(1)
              await fetchStatus()
            }
            if (
              pollData.status === 'failed' ||
              pollData.status === 'timeout'
            ) {
              clearInterval(interval)
            }
          } catch {
            clearInterval(interval)
          }
        }, 2000)
        // Auto-stop after 3 minutes
        setTimeout(() => clearInterval(interval), 180000)
      }
    } catch (err) {
      toast.error(
        `Failed: ${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setLoading(false)
    }
  }

  async function disconnect() {
    await apiFetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disconnect' }),
    })
    toast.success('Disconnected')
    await fetchStatus()
    setQrSession(null)
    setOnboardingStep(0)
  }

  async function completeOnboarding() {
    try {
      await apiFetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'onboarding',
          phoneType,
          dmPolicy,
          allowFrom:
            dmPolicy === 'allowlist'
              ? allowList
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : ['*'],
        }),
      })
      toast.success('WhatsApp onboarding complete!')
      setOnboardingStep(0)
      await fetchStatus()
    } catch {
      toast.error('Failed to save onboarding')
    }
  }

  return (
    <Card className="@container/card overflow-hidden">
      <CardHeader className="relative">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
            <MessageCircle className="size-6 text-emerald-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">WhatsApp</CardTitle>
            <CardDescription>Baileys Web Client</CardDescription>
          </div>
          <Badge
            variant={waStatus?.connected ? 'default' : 'secondary'}
            className="gap-1.5"
          >
            {waStatus?.connected ? (
              <>
                <Wifi className="size-3" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="size-3" />
                Offline
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Connected + Onboarded */}
        {waStatus?.connected && waStatus.onboarded && onboardingStep === 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-emerald-500" />
              <span>
                Phone: <strong>{waStatus.phoneType || 'personal'}</strong>
              </span>
              <span className="text-muted-foreground">·</span>
              <span>
                DM Policy: <strong>{waStatus.dmPolicy}</strong>
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStatus}
                className="rounded-xl"
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={disconnect}
                className="rounded-xl"
              >
                <PowerOff className="mr-2 size-4" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : /* Connected but onboarding needed */
        waStatus?.connected && onboardingStep > 0 ? (
          <WhatsAppOnboarding
            step={onboardingStep}
            setStep={setOnboardingStep}
            phoneType={phoneType}
            setPhoneType={setPhoneType}
            dmPolicy={dmPolicy}
            setDmPolicy={setDmPolicy}
            allowList={allowList}
            setAllowList={setAllowList}
            onComplete={completeOnboarding}
          />
        ) : (
          /* Not connected — show QR login */
          <div className="space-y-4">
            <Button
              onClick={startLogin}
              disabled={loading}
              className="rounded-xl"
            >
              <QrCode className="mr-2 size-4" />
              {loading ? 'Connecting...' : 'Connect via QR Code'}
            </Button>

            {qrSession?.qrDataUrl && (
              <div className="flex flex-col items-center gap-4 rounded-xl border p-6">
                <p className="text-sm text-muted-foreground">
                  Scan with WhatsApp on your phone
                </p>
                <div className="rounded-xl bg-white p-3">
                  <img
                    src={qrSession.qrDataUrl}
                    alt="WhatsApp QR Code"
                    className="size-56"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {qrSession.message}
                </p>
              </div>
            )}

            {qrSession && !qrSession.qrDataUrl && (
              <p className="text-sm text-muted-foreground rounded-lg bg-muted p-3">
                {qrSession.message}
              </p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="text-sm text-muted-foreground">
        End-to-end encrypted messaging via Baileys
      </CardFooter>
    </Card>
  )
}

// ─── WhatsApp Onboarding Flow (OpenClaw-style) ────────

function WhatsAppOnboarding({
  step,
  setStep,
  phoneType,
  setPhoneType,
  dmPolicy,
  setDmPolicy,
  allowList,
  setAllowList,
  onComplete,
}: {
  step: number
  setStep: (s: number) => void
  phoneType: 'personal' | 'separate'
  setPhoneType: (t: 'personal' | 'separate') => void
  dmPolicy: 'open' | 'pairing' | 'allowlist'
  setDmPolicy: (p: 'open' | 'pairing' | 'allowlist') => void
  allowList: string
  setAllowList: (v: string) => void
  onComplete: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4 text-emerald-500" />
        Connected! Let's configure how your AI handles messages.
      </div>

      {/* Step 1: Phone Type */}
      {step >= 1 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Is this your personal phone or a separate phone?
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setPhoneType('personal')
                setStep(2)
              }}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent ${phoneType === 'personal' && step > 1 ? 'border-primary bg-primary/5' : ''}`}
            >
              <Smartphone className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Personal Phone</p>
                <p className="text-xs text-muted-foreground">
                  I use this number daily
                </p>
              </div>
            </button>
            <button
              onClick={() => {
                setPhoneType('separate')
                setStep(2)
              }}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent ${phoneType === 'separate' && step > 1 ? 'border-primary bg-primary/5' : ''}`}
            >
              <Phone className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Separate Phone</p>
                <p className="text-xs text-muted-foreground">
                  Dedicated for the AI agent
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: DM Policy */}
      {step >= 2 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Who can DM your AI agent?
          </Label>
          <div className="space-y-2">
            {[
              {
                id: 'open' as const,
                icon: Users,
                title: 'Open',
                desc: 'Anyone can message the AI',
              },
              {
                id: 'pairing' as const,
                icon: Shield,
                title: 'Pairing',
                desc: 'Users must send a pairing request first',
              },
              {
                id: 'allowlist' as const,
                icon: Check,
                title: 'Allowlist',
                desc: 'Only approved numbers can message',
              },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setDmPolicy(opt.id)
                  setStep(opt.id === 'allowlist' ? 2 : 3)
                }}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent ${dmPolicy === opt.id ? 'border-primary bg-primary/5' : ''}`}
              >
                <opt.icon className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{opt.title}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {dmPolicy === opt.id && (
                  <Check className="size-4 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Allowlist input */}
      {step >= 2 && dmPolicy === 'allowlist' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Allowed phone numbers (comma-separated)
          </Label>
          <Input
            placeholder="+1234567890, +0987654321"
            value={allowList}
            onChange={(e) => setAllowList(e.target.value)}
            className="rounded-xl"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStep(3)}
            disabled={!allowList.trim()}
            className="rounded-xl"
          >
            Continue
            <ChevronRight className="ml-1 size-3.5" />
          </Button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step >= 3 && (
        <Button onClick={onComplete} className="rounded-xl w-full">
          <Check className="mr-2 size-4" />
          Complete Setup
        </Button>
      )}
    </div>
  )
}

// ─── Telegram Card ─────────────────────────────────────

function TelegramCard() {
  const [status, setStatus] = useState<{
    connected: boolean
    username: string | null
  } | null>(null)
  const [botToken, setBotToken] = useState('')
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const res = await apiFetch('/api/telegram?action=status')
      if (res.ok) setStatus(await res.json())
    } catch {
      setStatus(null)
    }
  }

  async function connect() {
    if (!botToken.trim()) return
    setConnecting(true)
    try {
      const res = await apiFetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', botToken }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(`Telegram connected as @${data.username}`)
        setBotToken('')
        await fetchStatus()
      } else {
        toast.error(data.error || 'Failed to connect')
      }
    } catch (err) {
      toast.error(
        `Failed: ${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setConnecting(false)
    }
  }

  async function disconnect() {
    await apiFetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disconnect' }),
    })
    toast.success('Telegram disconnected')
    await fetchStatus()
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10">
            <SendIcon className="size-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Telegram</CardTitle>
            <CardDescription>Grammy Bot API</CardDescription>
          </div>
          <Badge
            variant={status?.connected ? 'default' : 'secondary'}
            className="gap-1.5"
          >
            {status?.connected ? (
              <>
                <Wifi className="size-3" />
                @{status.username}
              </>
            ) : (
              <>
                <WifiOff className="size-3" />
                Offline
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {status?.connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Bot is running and receiving messages as @{status.username}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStatus}
                className="rounded-xl"
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={disconnect}
                className="rounded-xl"
              >
                <PowerOff className="mr-2 size-4" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                1. Open <strong>@BotFather</strong> on Telegram
              </p>
              <p className="text-sm text-muted-foreground">
                2. Send <code className="bg-muted px-1 py-0.5 rounded text-xs">/newbot</code> and follow the prompts
              </p>
              <p className="text-sm text-muted-foreground">
                3. Copy the bot token and paste it below
              </p>
            </div>

            <div className="space-y-2">
              <Label>Bot Token</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="123456:ABC-DEF..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="rounded-xl"
                />
                <Button
                  onClick={connect}
                  disabled={connecting || !botToken.trim()}
                  className="rounded-xl shrink-0"
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="text-sm text-muted-foreground">
        Powered by Grammy framework
      </CardFooter>
    </Card>
  )
}
