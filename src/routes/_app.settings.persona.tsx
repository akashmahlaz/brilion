import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Sparkles, User, Palette, BookOpen, Zap, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { toast } from 'sonner'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/_app/settings/persona')({
  component: PersonalizationTab,
})

function PersonalizationTab() {
  const [saving, setSaving] = useState(false)
  const [persona, setPersona] = useState({
    aiName: 'Brilion',
    userNickname: '',
    communicationStyle: 'balanced',
    languagePreference: 'en',
    formality: 'balanced',
    memoryEnabled: true,
    memoryDepth: '30d',
    proactiveEnabled: true,
    morningBriefing: true,
    briefingTime: '09:00',
    replyEmojis: true,
    voiceNotes: false,
  })

  async function save() {
    setSaving(true)
    try {
      await apiFetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'personalization', value: persona }),
      })
      toast.success('Personalization saved')
    } catch (e) {
      console.error('[PersonalizationTab] save failed:', e)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5">
        <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-primary">Your AI, Your Way</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Brilion learns your name, your preferences, and how you like to communicate — then personalizes every interaction.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="size-4 text-primary" />
            <CardTitle className="text-base">Identity</CardTitle>
          </div>
          <CardDescription>How you and your AI introduce yourselves</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your AI's Name</Label>
              <Input
                value={persona.aiName}
                onChange={(e) => setPersona({ ...persona, aiName: e.target.value })}
                placeholder="e.g. Brilion, Aria, Max"
                className="rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                What you call your AI — it introduces itself with this name.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">What should AI call you?</Label>
              <Input
                value={persona.userNickname}
                onChange={(e) => setPersona({ ...persona, userNickname: e.target.value })}
                placeholder="e.g. Akash, Boss, Yaar"
                className="rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                The AI will address you by this name in every message.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <CardTitle className="text-base">Communication Style</CardTitle>
          </div>
          <CardDescription>How Brilion talks to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Personality</Label>
              <Select
                value={persona.communicationStyle}
                onValueChange={(v) => setPersona({ ...persona, communicationStyle: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly & Warm</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="direct">Direct & Concise</SelectItem>
                  <SelectItem value="playful">Playful & Fun</SelectItem>
                  <SelectItem value="desi">Desi Vibe (Hinglish)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Language</Label>
              <Select
                value={persona.languagePreference}
                onValueChange={(v) => setPersona({ ...persona, languagePreference: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="hinglish">Hinglish</SelectItem>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reply Emojis</Label>
              <div className="flex items-center gap-3 h-10 px-3 rounded-xl border border-input bg-background">
                <Switch
                  checked={persona.replyEmojis}
                  onCheckedChange={(v) => setPersona({ ...persona, replyEmojis: v })}
                />
                <span className="text-sm text-muted-foreground">
                  {persona.replyEmojis ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
            <div className="flex items-start gap-2">
              <div className="size-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="size-3 text-primary" />
              </div>
              <div className="text-[13px] text-foreground bg-card rounded-xl rounded-tl-sm px-3 py-2 border border-border shadow-sm max-w-sm">
                {persona.communicationStyle === 'desi'
                  ? `Hey ${persona.userNickname || 'yaar'}! Main ${persona.aiName} hun. Bata kya karna hai aaj?`
                  : persona.communicationStyle === 'playful'
                    ? `Hey ${persona.userNickname || 'there'}! I'm ${persona.aiName}. What are we building today?`
                    : persona.communicationStyle === 'direct'
                      ? `Hi ${persona.userNickname || 'there'}. I'm ${persona.aiName}. What do you need?`
                      : `Hello ${persona.userNickname || 'there'}! I'm ${persona.aiName}. How can I help you today?`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <CardTitle className="text-base">Memory</CardTitle>
          </div>
          <CardDescription>How long Brilion remembers past conversations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Enable Long-term Memory</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Brilion remembers your preferences, past tasks, and important facts
              </p>
            </div>
            <Switch
              checked={persona.memoryEnabled}
              onCheckedChange={(v) => setPersona({ ...persona, memoryEnabled: v })}
            />
          </div>
          {persona.memoryEnabled && (
            <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
              {[
                { value: '7d', label: '7 days' },
                { value: '30d', label: '30 days' },
                { value: '90d', label: '90 days' },
                { value: 'forever', label: 'Forever' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPersona({ ...persona, memoryDepth: opt.value })}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    persona.memoryDepth === opt.value
                      ? 'border-primary bg-primary/8 text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <CardTitle className="text-base">Proactive Behavior</CardTitle>
          </div>
          <CardDescription>Brilion checks in on you — without you asking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Morning Briefing on WhatsApp</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Quick daily summary: calendar, tasks, weather, and AI suggestions
              </p>
            </div>
            <Switch
              checked={persona.morningBriefing}
              onCheckedChange={(v) => setPersona({ ...persona, morningBriefing: v })}
            />
          </div>
          {persona.morningBriefing && (
            <div className="flex items-center gap-3 px-4">
              <Label className="text-sm text-muted-foreground shrink-0">Briefing time</Label>
              <Input
                type="time"
                value={persona.briefingTime}
                onChange={(e) => setPersona({ ...persona, briefingTime: e.target.value })}
                className="w-32 rounded-xl"
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Proactive Suggestions</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Brilion notices patterns and suggests automation ideas proactively
              </p>
            </div>
            <Switch
              checked={persona.proactiveEnabled}
              onCheckedChange={(v) => setPersona({ ...persona, proactiveEnabled: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Voice Note Support</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Transcribe and respond to WhatsApp voice messages
              </p>
            </div>
            <Switch
              checked={persona.voiceNotes}
              onCheckedChange={(v) => setPersona({ ...persona, voiceNotes: v })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="rounded-xl px-6 gap-2">
          {saving ? (
            <>
              <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-3.5" />
              Save Personalization
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
