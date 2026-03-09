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
import { Badge } from '#/components/ui/badge'

const API_BASE = 'http://localhost:4000'

export const Route = createFileRoute('/channels')({
  component: ChannelsPage,
})

function ChannelsPage() {
  const [waStatus, setWaStatus] = useState<{ connected: boolean } | null>(null)
  const [qrSession, setQrSession] = useState<{
    sessionId: string
    qrDataUrl: string | null
    message: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/status`)
      setWaStatus(await res.json())
    } catch {
      setWaStatus(null)
    }
  }

  async function startLogin() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/login`, {
        method: 'POST',
      })
      const data = await res.json()
      setQrSession(data)
    } catch (err) {
      setQrSession({
        sessionId: '',
        qrDataUrl: null,
        message: `Failed: ${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setLoading(false)
    }
  }

  async function disconnect() {
    await fetch(`${API_BASE}/api/whatsapp/disconnect`, { method: 'POST' })
    await fetchStatus()
    setQrSession(null)
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
        {/* Page Title */}
        <div className="px-4 lg:px-6">
          <h1 className="text-lg font-heading font-semibold tracking-tight">Messaging Channels</h1>
          <p className="text-sm text-muted-foreground/70 mt-1">Connect your AI agent to messaging platforms</p>
        </div>

        {/* Channel Status Cards */}
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
          {/* WhatsApp */}
          <Card className="@container/card overflow-hidden animate-slide-up">
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/15">
                  <MessageCircle className="size-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-heading text-base">WhatsApp</CardTitle>
                  <CardDescription className="text-xs">Baileys Web Client</CardDescription>
                </div>
                <Badge
                  variant={waStatus?.connected ? 'default' : 'secondary'}
                  className="gap-1.5 text-[10px] font-mono"
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
              {waStatus?.connected ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchStatus} className="rounded-lg text-xs press-effect">
                    <RefreshCw className="mr-1.5 size-3" />
                    Refresh
                  </Button>
                  <Button variant="destructive" size="sm" onClick={disconnect} className="rounded-lg text-xs press-effect">
                    <PowerOff className="mr-1.5 size-3" />
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button onClick={startLogin} disabled={loading} className="rounded-lg text-xs press-effect">
                    <QrCode className="mr-1.5 size-3.5" />
                    {loading ? 'Connecting...' : 'Connect via QR Code'}
                  </Button>

                  {qrSession?.qrDataUrl && (
                    <div className="flex flex-col items-center gap-4 rounded-xl border border-border/50 bg-muted/20 p-6">
                      <p className="text-xs text-muted-foreground font-medium">
                        Scan with WhatsApp on your phone
                      </p>
                      <div className="rounded-xl bg-white p-3">
                        <img
                          src={qrSession.qrDataUrl}
                          alt="WhatsApp QR Code"
                          className="size-48"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground/60">
                        {qrSession.message}
                      </p>
                    </div>
                  )}

                  {qrSession && !qrSession.qrDataUrl && (
                    <p className="text-xs text-muted-foreground rounded-lg bg-muted/30 px-3 py-2.5">
                      {qrSession.message}
                    </p>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="text-[11px] text-muted-foreground/50">
              End-to-end encrypted messaging via Baileys
            </CardFooter>
          </Card>

          {/* Telegram */}
          <Card className="@container/card animate-slide-up" style={{ animationDelay: '50ms' }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/15">
                  <SendIcon className="size-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-heading text-base">Telegram</CardTitle>
                  <CardDescription className="text-xs">Grammy Bot API</CardDescription>
                </div>
                <Badge variant="secondary" className="gap-1.5 text-[10px] font-mono">
                  <WifiOff className="size-3" />
                  Not Set
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-xl border border-border/40 bg-muted/15 p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Add your Telegram Bot Token in{' '}
                  <span className="font-medium text-foreground">Settings → API Keys</span>
                  {' '}to enable your agent on Telegram.
                </p>
              </div>
            </CardContent>

            <CardFooter className="text-[11px] text-muted-foreground/50">
              Powered by grammy framework
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
