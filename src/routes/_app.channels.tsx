import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import {
  MessageCircle,
  Send as SendIcon,
  QrCode,
  RefreshCw,
  PowerOff,
  Wifi,
  WifiOff,
  Settings2,
  Plus,
  X,
  Shield,
  Users,
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
import { Switch } from '#/components/ui/switch'
import { Separator } from '#/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_app/channels')({
  component: ChannelsPage,
})

function ChannelsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 py-6 md:gap-6 md:py-8">
        <div className="px-4 lg:px-6 space-y-1.5">
          <h2 className="font-heading text-[28px] font-extrabold text-foreground tracking-tight">Channels</h2>
          <p className="text-[15px] text-muted-foreground">
            Connect messaging platforms to your AI agent.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2">
          <WhatsAppCard />
          <TelegramCard />
        </div>
      </div>
    </div>
  )
}

// ─── WhatsApp Card ─────────────────────────────────────

function WhatsAppCard() {
  const [waStatus, setWaStatus] = useState<{
    connected: boolean
    dmPolicy: string
  } | null>(null)
  const [qrSession, setQrSession] = useState<{
    sessionId: string
    qrDataUrl: string | null
    message: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<{
    dmPolicy: string
    groupPolicy: string
    selfChatMode: boolean
    allowFrom: string[]
    groupAllowFrom: string[]
  } | null>(null)
  const [newAllowNumber, setNewAllowNumber] = useState('')
  const [newGroupAllowNumber, setNewGroupAllowNumber] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchStatus()
    fetchConfig()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])




  async function fetchStatus() {
    try {
      const res = await apiFetch('/api/whatsapp?action=status')
      if (res.ok) {
        const data = await res.json()
        setWaStatus(data)
      }
    } catch {
      setWaStatus(null)
    }
  }

  const fetchConfig = useCallback(async () => {
    try {
      const res = await apiFetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        const wa = data.channels?.whatsapp
        if (wa) {
          setConfig({
            dmPolicy: wa.dmPolicy || 'pairing',
            groupPolicy: wa.groupPolicy || 'disabled',
            selfChatMode: wa.selfChatMode ?? true,
            allowFrom: wa.allowFrom || ['*'],
            groupAllowFrom: wa.groupAllowFrom || ['*'],
          })
        }
      }
    } catch {
      // Config not available yet
    }
  }, [])

  async function saveChannelConfig(updates: Record<string, unknown>) {
    setSaving(true)
    try {
      for (const [key, value] of Object.entries(updates)) {
        await apiFetch('/api/config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: `channels.whatsapp.${key}`, value }),
        })
      }
      toast.success('WhatsApp settings saved')
      await fetchConfig()
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
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
  }

  async function logout() {
    await apiFetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    toast.success('Logged out & session cleared')
    await fetchStatus()
    setQrSession(null)
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
        {waStatus?.connected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              WhatsApp is connected and receiving messages.
            </p>
            <div className="flex flex-wrap gap-2">
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
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
                className="rounded-xl"
              >
                <Settings2 className="mr-2 size-4" />
                {showConfig ? 'Hide Settings' : 'Settings'}
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
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="rounded-xl text-destructive hover:text-destructive"
              >
                Logout &amp; Clear
              </Button>
            </div>

            {showConfig && config && (
              <>
                <Separator />
                <div className="space-y-5">
                  {/* Self-Chat Mode */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Self-Chat Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        Message yourself to talk with AI
                      </p>
                    </div>
                    <Switch
                      checked={config.selfChatMode}
                      onCheckedChange={(checked) => {
                        setConfig({ ...config, selfChatMode: checked })
                        saveChannelConfig({ selfChatMode: checked })
                      }}
                    />
                  </div>

                  {/* DM Policy */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">DM Policy</Label>
                    </div>
                    <Select
                      value={config.dmPolicy}
                      onValueChange={(value) => {
                        setConfig({ ...config, dmPolicy: value })
                        saveChannelConfig({ dmPolicy: value })
                      }}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled — ignore all DMs</SelectItem>
                        <SelectItem value="pairing">Pairing — require pairing code</SelectItem>
                        <SelectItem value="allowlist">Allowlist — approved numbers only</SelectItem>
                        <SelectItem value="open">Open — respond to anyone</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {config.dmPolicy === 'disabled' && 'AI will not respond to any direct messages.'}
                      {config.dmPolicy === 'pairing' && 'New contacts must send a pairing code to activate AI.'}
                      {config.dmPolicy === 'allowlist' && 'Only numbers in your allowlist can chat with AI.'}
                      {config.dmPolicy === 'open' && 'Anyone can message your number and get AI responses.'}
                    </p>
                  </div>

                  {/* DM Allowlist — shown for both allowlist and pairing modes */}
                  {(config.dmPolicy === 'allowlist' || config.dmPolicy === 'pairing') && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {config.dmPolicy === 'pairing' ? 'Pre-approved Numbers (skip pairing)' : 'Allowed Numbers (DMs)'}
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {config.allowFrom.filter(n => n !== '*').map((num) => (
                          <Badge key={num} variant="secondary" className="gap-1 pl-2.5 pr-1">
                            {num}
                            <button
                              type="button"
                              className="ml-1 rounded-full p-0.5 hover:bg-muted"
                              onClick={() => {
                                const updated = config.allowFrom.filter(n => n !== num)
                                setConfig({ ...config, allowFrom: updated })
                                saveChannelConfig({ allowFrom: updated })
                              }}
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="919876543210"
                          value={newAllowNumber}
                          onChange={(e) => setNewAllowNumber(e.target.value)}
                          className="rounded-xl"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl shrink-0"
                          disabled={!newAllowNumber.trim()}
                          onClick={() => {
                            const raw = newAllowNumber.trim()
                            if (!raw) return
                            // Normalize: strip non-digits for robust matching
                            const num = raw.replace(/\D/g, '')
                            if (!num) return
                            const updated = [...config.allowFrom.filter(n => n !== '*'), num]
                            setConfig({ ...config, allowFrom: updated })
                            saveChannelConfig({ allowFrom: updated })
                            setNewAllowNumber('')
                          }}
                        >
                          <Plus className="mr-1 size-4" />
                          Add
                        </Button>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Group Policy */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">Group Policy</Label>
                    </div>
                    <Select
                      value={config.groupPolicy}
                      onValueChange={(value) => {
                        setConfig({ ...config, groupPolicy: value })
                        saveChannelConfig({ groupPolicy: value })
                      }}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled — ignore group messages</SelectItem>
                        <SelectItem value="allowlist">Allowlist — approved groups only</SelectItem>
                        <SelectItem value="open">Open — respond in all groups</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {config.groupPolicy === 'disabled' && 'AI will not respond in any groups.'}
                      {config.groupPolicy === 'allowlist' && 'AI only responds in groups from the allowlist (when @mentioned).'}
                      {config.groupPolicy === 'open' && 'AI responds in all groups when @mentioned.'}
                    </p>
                  </div>

                  {/* Group Allowlist */}
                  {config.groupPolicy === 'allowlist' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Allowed Groups</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {config.groupAllowFrom.filter(n => n !== '*').map((gid) => (
                          <Badge key={gid} variant="secondary" className="gap-1 pl-2.5 pr-1">
                            {gid}
                            <button
                              type="button"
                              className="ml-1 rounded-full p-0.5 hover:bg-muted"
                              onClick={() => {
                                const updated = config.groupAllowFrom.filter(n => n !== gid)
                                setConfig({ ...config, groupAllowFrom: updated })
                                saveChannelConfig({ groupAllowFrom: updated })
                              }}
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Group JID or name"
                          value={newGroupAllowNumber}
                          onChange={(e) => setNewGroupAllowNumber(e.target.value)}
                          className="rounded-xl"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl shrink-0"
                          disabled={!newGroupAllowNumber.trim()}
                          onClick={() => {
                            const gid = newGroupAllowNumber.trim()
                            if (!gid) return
                            const updated = [...config.groupAllowFrom.filter(n => n !== '*'), gid]
                            setConfig({ ...config, groupAllowFrom: updated })
                            saveChannelConfig({ groupAllowFrom: updated })
                            setNewGroupAllowNumber('')
                          }}
                        >
                          <Plus className="mr-1 size-4" />
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
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
                <div className="rounded-xl bg-background p-3">
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
