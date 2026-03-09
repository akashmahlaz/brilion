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
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
          {/* WhatsApp */}
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
              {waStatus?.connected ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchStatus} className="rounded-xl">
                    <RefreshCw className="mr-2 size-4" />
                    Refresh
                  </Button>
                  <Button variant="destructive" size="sm" onClick={disconnect} className="rounded-xl">
                    <PowerOff className="mr-2 size-4" />
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button onClick={startLogin} disabled={loading} className="rounded-xl">
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

          {/* Telegram */}
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
                <Badge variant="secondary" className="gap-1.5">
                  <WifiOff className="size-3" />
                  Not Set
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  Add your Telegram Bot Token in{' '}
                  <span className="font-medium text-foreground">Settings → API Keys</span>
                  {' '}to enable your agent on Telegram.
                </p>
              </div>
            </CardContent>

            <CardFooter className="text-sm text-muted-foreground">
              Powered by grammy framework
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
