import type { CSSProperties } from 'react'
import { cn } from '#/lib/utils'

// ─── Branded SVGs from @lobehub/icons-static-svg ────────────
// Color variants where available, monochrome fallback otherwise.
import openaiSvg from '@lobehub/icons-static-svg/icons/openai.svg?raw'
import anthropicSvg from '@lobehub/icons-static-svg/icons/anthropic.svg?raw'
import googleSvg from '@lobehub/icons-static-svg/icons/gemini-color.svg?raw'
import githubSvg from '@lobehub/icons-static-svg/icons/github.svg?raw'
import copilotSvg from '@lobehub/icons-static-svg/icons/githubcopilot.svg?raw'
import xaiSvg from '@lobehub/icons-static-svg/icons/xai.svg?raw'
import mistralSvg from '@lobehub/icons-static-svg/icons/mistral-color.svg?raw'
import groqSvg from '@lobehub/icons-static-svg/icons/groq.svg?raw'
import deepseekSvg from '@lobehub/icons-static-svg/icons/deepseek-color.svg?raw'
import cohereSvg from '@lobehub/icons-static-svg/icons/cohere-color.svg?raw'
import cloudflareSvg from '@lobehub/icons-static-svg/icons/workersai-color.svg?raw'
import fireworksSvg from '@lobehub/icons-static-svg/icons/fireworks-color.svg?raw'
import perplexitySvg from '@lobehub/icons-static-svg/icons/perplexity-color.svg?raw'
import togetherSvg from '@lobehub/icons-static-svg/icons/together-color.svg?raw'
import nebiusSvg from '@lobehub/icons-static-svg/icons/nebius.svg?raw'
import akashSvg from '@lobehub/icons-static-svg/icons/akashchat.svg?raw'
import replicateSvg from '@lobehub/icons-static-svg/icons/replicate.svg?raw'
import minimaxSvg from '@lobehub/icons-static-svg/icons/minimax-color.svg?raw'
import openrouterSvg from '@lobehub/icons-static-svg/icons/openrouter.svg?raw'
import qwenSvg from '@lobehub/icons-static-svg/icons/qwen-color.svg?raw'
import tavilySvg from '@lobehub/icons-static-svg/icons/tavily-color.svg?raw'
import vercelSvg from '@lobehub/icons-static-svg/icons/vercel.svg?raw'

const GENERIC_KEY_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`

const NETLIFY_SVG = `<svg viewBox="0 0 24 24" fill="#00C7B7"><path d="M16.934 8.519a1.044 1.044 0 0 1 .303.23l2.349-1.045-2.192-2.171-.491 2.954h.031Zm1.621 4.915-3.328-3.293a.96.96 0 0 1-.084-.09l-1.973.876c.026.083.042.17.042.261a1 1 0 0 1-.333.745l1.16 3.562 4.516-2.061Zm-7.09-3.21a.958.958 0 0 1 .172-.052l.138-2.621-3.794-1.81v5.389l2.94-1.307a.954.954 0 0 1 .544.4Zm.817-.28a.956.956 0 0 1 .346.1l1.785-.793-2.932-1.4-.126 2.395a.95.95 0 0 1 .927-.302Zm-1.334 1.476a1 1 0 0 1-.222-.38l-2.692 1.197 2.656 2.633.258-3.45Zm.644.007.004.04-.253 3.394 4.258-1.885-1.099-3.37a.953.953 0 0 1-.353.085.958.958 0 0 1-.537-.165l-2.02.901Zm5.472 1.752-5.06 2.309L15.058 20l2.955-2.955.26-1.57-1.25-2.523Zm-6.37 2.094-3.105-3.078-.13.795 2.86 3.564.375-1.281Zm-2.36-4.477-1.543-.694v3.27l1.543-2.576Zm7.753-2.966-1.986-.935-.13 2.467 2.116-1.532Zm-4.37-3.506-4.49 1.995 4.017 1.917-.138-1.36.053-.033.558-2.519ZM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0Z"/></svg>`

const MATON_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 6v12l8 4 8-4V6l-8-4Zm0 2.236L18 7v10l-6 3-6-3V7l6-2.764Z"/><path d="M8 10h8v4H8z"/></svg>`

const PROVIDER_SVG_MAP: Record<string, string> = {
  openai: openaiSvg,
  anthropic: anthropicSvg,
  google: googleSvg,
  github: githubSvg,
  'github-copilot': copilotSvg,
  xai: xaiSvg,
  mistral: mistralSvg,
  groq: groqSvg,
  deepseek: deepseekSvg,
  cohere: cohereSvg,
  cloudflare: cloudflareSvg,
  fireworks: fireworksSvg,
  perplexity: perplexitySvg,
  together: togetherSvg,
  nebius: nebiusSvg,
  akash: akashSvg,
  replicate: replicateSvg,
  minimax: minimaxSvg,
  "minimax-anthropic": minimaxSvg,
  qwen: qwenSvg,
  dashscope: qwenSvg,
  openrouter: openrouterSvg,
  tavily: tavilySvg,
  vercel: vercelSvg,
  netlify: NETLIFY_SVG,
  maton: MATON_SVG,
}

export interface ProviderIconProps {
  provider: string
  className?: string
  style?: CSSProperties
}

/**
 * Renders the brand SVG for a provider. Color variant from lobehub where
 * available, monochrome otherwise. Size via Tailwind class (default `size-5`).
 */
export function ProviderIcon({ provider, className, style }: ProviderIconProps) {
  const svg = PROVIDER_SVG_MAP[provider] ?? GENERIC_KEY_SVG
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center [&_svg]:size-full [&_svg]:block',
        'size-5',
        className,
      )}
      style={style}
      // Static SVGs imported from a vetted package (lobehub) + small literal set.
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-hidden="true"
    />
  )
}

export const PROVIDER_IDS = Object.keys(PROVIDER_SVG_MAP)
