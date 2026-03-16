import { motion } from 'framer-motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion'

const FAQ_ITEMS = [
  {
    q: 'How does Brilion work with WhatsApp?',
    a: 'You connect your WhatsApp number during setup. Once linked, you can send natural language commands like "Create a Facebook ad for my summer sale" or "Deploy the latest commit to Vercel." Brilion understands context, asks for clarification if needed, and executes the action across your connected platforms.',
  },
  {
    q: 'Is my data safe? Do you access my accounts?',
    a: 'Security is our top priority. Brilion uses OAuth and API keys to connect to your platforms — we never store your passwords. All data is encrypted in transit and at rest. You can revoke any integration at any time. We never read your personal messages or access accounts beyond what you explicitly authorize.',
  },
  {
    q: 'Which platforms can I connect?',
    a: 'Brilion currently supports 30+ integrations including WhatsApp, Telegram, Facebook Ads, Instagram, Google (Calendar, Meet, Gmail), Binance, Stripe, Shopify, GitHub, Vercel, YouTube, Slack, and more. We add new integrations every week based on user requests.',
  },
  {
    q: 'Can I use Brilion without WhatsApp?',
    a: 'Absolutely. While WhatsApp is our most popular channel, you can also use Brilion through Telegram or our web chat interface. All channels have the same capabilities — choose whatever feels natural to you.',
  },
  {
    q: 'What AI models does Brilion use?',
    a: 'Brilion is multi-model by design. We use GPT-4o, Claude, Gemini, and other frontier models depending on the task. For creative tasks we pick the best model for the job, for code we use specialized models, and for trading we use models optimized for speed. You don\'t need to think about it — we handle model routing automatically.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. The Starter plan is completely free — you get 3 app integrations and 50 AI commands per month. It\'s designed to let you experience the platform before committing. When you need more, upgrade to Pro for unlimited everything.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, no contracts. Cancel from your settings page with one click. Your data stays available for 30 days after cancellation. If you change your mind, you can reactivate with all your integrations and history intact.',
  },
  {
    q: 'How is this different from Zapier or Make?',
    a: 'Zapier and Make require you to build workflows visually with triggers and actions. Brilion is conversational — you describe what you want in plain English and the AI figures out the workflow. No drag-and-drop, no learning curve. Plus, Brilion can handle complex multi-step tasks that would require dozens of Zapier zaps, all from one message.',
  },
]

export function FAQ() {
  return (
    <section id="faq" className="relative py-24 sm:py-32 border-t border-gray-200/60">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[3px] mb-4">
            FAQ
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-[1.15]">
            Questions?
            <br />
            <span className="text-gray-400">
              We&apos;ve got answers.
            </span>
          </h2>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="rounded-xl border border-gray-200/60 bg-white px-6 shadow-sm data-[state=open]:shadow-md data-[state=open]:border-gray-200 transition-all duration-200"
              >
                <AccordionTrigger className="text-left text-[15px] font-semibold text-gray-900 hover:no-underline py-5 [&[data-state=open]>svg]:rotate-180">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[14px] text-gray-500 leading-relaxed pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
