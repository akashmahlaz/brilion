/* ── Logo Carousel ──
   Text-based brand wordmarks in a scrolling marquee.
   Clean card on warm paper, fade edges, infinite scroll.
*/

interface Logo {
  name: string
}

const LOGOS: Logo[] = [
  { name: 'Spotify' },
  { name: 'Google' },
  { name: 'Microsoft' },
  { name: 'WhatsApp' },
  { name: 'YouTube' },
  { name: 'Instagram' },
  { name: 'Binance' },
  { name: 'Telegram' },
  { name: 'Shopify' },
  { name: 'Stripe' },
  { name: 'Slack' },
  { name: 'GitHub' },
]

function LogoItem({ name }: { name: string }) {
  switch (name) {
    case 'Spotify':
      return (
        <div className="flex items-center gap-2 px-8 select-none">
          <svg viewBox="0 0 24 24" className="size-7" fill="#1DB954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          <span className="text-xl font-semibold text-gray-400">Spotify</span>
        </div>
      )
    case 'Google':
      return (
        <div className="flex items-center px-8 select-none">
          <span className="text-2xl font-medium tracking-tight">
            <span className="text-[#4285F4]">G</span>
            <span className="text-[#EA4335]">o</span>
            <span className="text-[#FBBC05]">o</span>
            <span className="text-[#4285F4]">g</span>
            <span className="text-[#34A853]">l</span>
            <span className="text-[#EA4335]">e</span>
          </span>
        </div>
      )
    case 'Microsoft':
      return (
        <div className="flex items-center gap-2 px-8 select-none">
          <div className="grid grid-cols-2 gap-0.5 size-5">
            <div className="bg-[#F25022] rounded-[1px]" />
            <div className="bg-[#7FBA00] rounded-[1px]" />
            <div className="bg-[#00A4EF] rounded-[1px]" />
            <div className="bg-[#FFB900] rounded-[1px]" />
          </div>
          <span className="text-xl font-semibold text-gray-600">Microsoft</span>
        </div>
      )
    case 'WhatsApp':
      return (
        <div className="flex items-center gap-2 px-8 select-none">
          <svg viewBox="0 0 24 24" className="size-6" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span className="text-xl font-semibold text-gray-500">WhatsApp</span>
        </div>
      )
    case 'YouTube':
      return (
        <div className="flex items-center gap-1.5 px-8 select-none">
          <div className="relative flex size-7 items-center justify-center rounded-md bg-[#FF0000]">
            <div className="ml-0.5 size-0 border-y-[5px] border-y-transparent border-l-8 border-l-white" />
          </div>
          <span className="text-xl font-semibold text-gray-800">YouTube</span>
        </div>
      )
    case 'Instagram':
      return (
        <div className="flex items-center px-8 select-none">
          <span
            className="text-2xl text-gray-700"
            style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
          >
            Instagram
          </span>
        </div>
      )
    case 'Binance':
      return (
        <div className="flex items-center gap-2 px-8 select-none">
          <svg viewBox="0 0 24 24" className="size-5" fill="#F3BA2F">
            <path d="M12 0L7.172 4.828l1.768 1.768L12 3.536l3.06 3.06 1.768-1.768L12 0zm-7.172 7.172L0 12l4.828 4.828 1.768-1.768L3.536 12l3.06-3.06-1.768-1.768zM12 8.464L8.464 12 12 15.536 15.536 12 12 8.464zm7.172-1.292l-1.768 1.768L20.464 12l-3.06 3.06 1.768 1.768L24 12l-4.828-4.828zM12 20.464l-3.06-3.06-1.768 1.768L12 24l4.828-4.828-1.768-1.768L12 20.464z" />
          </svg>
          <span className="text-xl font-bold text-[#F3BA2F]">Binance</span>
        </div>
      )
    case 'Telegram':
      return (
        <div className="flex items-center gap-2 px-8 select-none">
          <svg viewBox="0 0 24 24" className="size-6" fill="#26A5E4">
            <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          <span className="text-xl font-semibold text-gray-500">Telegram</span>
        </div>
      )
    case 'Shopify':
      return (
        <div className="flex items-center gap-2 px-8 select-none">
          <svg viewBox="0 0 24 24" className="size-6" fill="#96BF48">
            <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.125-.192-.21-.192s-1.765-.124-1.765-.124-1.16-1.16-1.298-1.298a.67.67 0 00-.233-.132v20.993l-.085.044zm-2.468-18.308c-.006-.006-.395-.106-.93-.106-.188 0-.395.012-.608.042-.192-1.16-.924-2.214-2.43-2.214h-.114c-.37-.462-.825-.67-1.224-.67-3.03 0-4.486 3.787-4.94 5.712l-2.124.656c-.66.208-.68.228-.766.852-.066.462-1.782 13.72-1.782 13.72l13.39 2.508V5.68c-.176-.002-.34-.006-.472-.009zm-3.253-.462c-.006 0-.018.006-.024.006 0-.066.006-.138.006-.21.468-1.357 1.35-2.55 2.262-2.55z" />
          </svg>
          <span className="text-xl font-bold text-[#96BF48]">Shopify</span>
        </div>
      )
    case 'Stripe':
      return (
        <div className="flex items-center px-8 select-none">
          <span className="text-2xl font-bold text-[#635BFF]">Stripe</span>
        </div>
      )
    case 'Slack':
      return (
        <div className="flex items-center gap-2 px-8 select-none">
          <span className="text-xl font-bold text-gray-600">Slack</span>
        </div>
      )
    case 'GitHub':
      return (
        <div className="flex items-center gap-2 px-8 select-none">
          <svg viewBox="0 0 24 24" className="size-6" fill="#181717">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          <span className="text-xl font-semibold text-gray-800">GitHub</span>
        </div>
      )
    default:
      return null
  }
}

export function LogoCarousel() {
  return (
    <section className="relative py-14 sm:py-16">
      {/* Label */}
      <p className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-[3px] mb-10">
        Connected to all your everyday apps
      </p>

      {/* Full-width marquee with fade edges */}
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-32 bg-linear-to-r from-[#F8F7F3] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-linear-to-l from-[#F8F7F3] to-transparent z-10 pointer-events-none" />

        {/* Row */}
        <div className="flex w-max items-center animate-[logo-scroll_35s_linear_infinite] hover:paused">
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <LogoItem key={`${logo.name}-${i}`} name={logo.name} />
          ))}
        </div>
      </div>
    </section>
  )
}
