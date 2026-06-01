import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { AnimateInView } from '@/components/animate-in-view'

interface Model {
  name: string
  label: string
  provider: string
  inputApinet: number
  outputApinet: number
  inputRetail: number
  outputRetail: number
  note?: string
}

const MODELS: Model[] = [
  {
    name: 'Gemini 3 Flash',
    label: 'gemini-3-flash',
    provider: 'Google',
    inputApinet: 0.5,
    outputApinet: 3.0,
    inputRetail: 1.25,
    outputRetail: 7.0,
  },
  {
    name: 'GPT-5.5',
    label: 'gpt-5.5',
    provider: 'OpenAI',
    inputApinet: 0.4,
    outputApinet: 0.8,
    inputRetail: 2.0,
    outputRetail: 8.0,
  },
  {
    name: 'GPT-5.4',
    label: 'gpt-5.4',
    provider: 'OpenAI',
    inputApinet: 0.12,
    outputApinet: 0.24,
    inputRetail: 0.6,
    outputRetail: 1.2,
  },
  {
    name: 'Grok-4 Fast',
    label: 'grok-4-fast',
    provider: 'xAI',
    inputApinet: 12.5,
    outputApinet: 12.5,
    inputRetail: 25.0,
    outputRetail: 25.0,
    note: '~$0.025/req',
  },
  {
    name: 'DeepSeek V4 Pro',
    label: 'deepseek-v4-pro',
    provider: 'DeepSeek',
    inputApinet: 3.0,
    outputApinet: 6.0,
    inputRetail: 8.0,
    outputRetail: 16.0,
  },
  {
    name: 'DeepSeek V3.2',
    label: 'deepseek-v3.2',
    provider: 'DeepSeek',
    inputApinet: 2.0,
    outputApinet: 3.0,
    inputRetail: 4.0,
    outputRetail: 6.0,
  },
]

const VOLUMES = [
  { label: '1M', value: 1, desc: 'тест' },
  { label: '10M', value: 10, desc: 'стартап' },
  { label: '100M', value: 100, desc: 'прод' },
  { label: '1B', value: 1000, desc: 'энтерпрайз' },
]

const PROVIDER_COLORS: Record<string, string> = {
  Google: 'text-blue-400',
  OpenAI: 'text-emerald-400',
  xAI: 'text-purple-400',
  DeepSeek: 'text-cyan-400',
}

export function Calculator() {
  const { t } = useTranslation()
  const [selectedModel, setSelectedModel] = useState(0)
  const [selectedVolume, setSelectedVolume] = useState(1)

  const model = MODELS[selectedModel]
  const volume = VOLUMES[selectedVolume].value

  const blendedApinet = (model.inputApinet + model.outputApinet) / 2
  const blendedRetail = (model.inputRetail + model.outputRetail) / 2

  const apinetCost = (blendedApinet * volume) / 1000
  const retailCost = (blendedRetail * volume) / 1000
  const saved = retailCost - apinetCost
  const discount = retailCost > 0 ? Math.round((saved / retailCost) * 100) : 0

  const fmt = (n: number) =>
    n >= 1000
      ? `$${(n / 1000).toFixed(1)}K`
      : n >= 1
        ? `$${n.toFixed(2)}`
        : `$${n.toFixed(3)}`

  return (
    <section className='relative z-10 overflow-hidden px-6 py-24 md:py-32'
      style={{ background: 'oklch(0.09 0.015 250)' }}
    >
      {/* Ambient glow orbs */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10'
        style={{
          background: [
            'radial-gradient(ellipse 55% 40% at 20% 60%, oklch(0.45 0.18 270 / 22%) 0%, transparent 70%)',
            'radial-gradient(ellipse 45% 35% at 80% 30%, oklch(0.55 0.20 200 / 18%) 0%, transparent 70%)',
            'radial-gradient(ellipse 60% 50% at 50% 110%, oklch(0.40 0.15 250 / 25%) 0%, transparent 60%)',
          ].join(', '),
        }}
      />

      {/* Large soft glow behind card */}
      <div
        aria-hidden
        className='pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2'
        style={{
          width: '900px',
          height: '500px',
          background: 'radial-gradient(ellipse at center, oklch(0.50 0.20 260 / 14%) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-16 text-center md:mb-20'>
          <p className='mb-3 text-xs font-medium tracking-widest uppercase text-white/40'>
            {t('Calculator')}
          </p>
          <h2 className='text-2xl font-bold tracking-tight text-white md:text-3xl'>
            {t('How much will you save')}
          </h2>
          <p className='mx-auto mt-3 max-w-md text-sm text-white/50'>
            {t('Compare APINET prices with direct provider rates')}
          </p>
        </AnimateInView>

        <AnimateInView animation='fade-up' delay={100}>
          {/* Card with ring glow */}
          <div
            className='relative overflow-hidden rounded-2xl'
            style={{
              background: 'oklch(0.13 0.018 250)',
              border: '1px solid oklch(0.28 0.04 250 / 60%)',
              boxShadow: '0 0 0 1px oklch(0.35 0.10 260 / 20%), 0 32px 80px -16px oklch(0.10 0.02 250 / 80%), 0 0 60px -10px oklch(0.45 0.18 260 / 15%)',
            }}
          >
            <div className='grid gap-0 lg:grid-cols-2'>
              {/* Left: controls */}
              <div className='space-y-7 p-8' style={{ borderRight: '1px solid oklch(0.22 0.03 250 / 60%)' }}>
                {/* Model selector */}
                <div>
                  <label className='mb-3 block text-[10px] font-bold tracking-[0.15em] uppercase text-white/40'>
                    {t('Model')}
                  </label>
                  <div className='grid grid-cols-2 gap-2'>
                    {MODELS.map((m, i) => (
                      <button
                        key={m.label}
                        onClick={() => setSelectedModel(i)}
                        className='rounded-lg px-3 py-2.5 text-left text-xs transition-all duration-150'
                        style={
                          selectedModel === i
                            ? {
                                background: 'oklch(0.25 0.06 260 / 60%)',
                                border: '1px solid oklch(0.55 0.18 260 / 50%)',
                                color: 'oklch(0.82 0.10 220)',
                              }
                            : {
                                background: 'oklch(0.17 0.02 250 / 70%)',
                                border: '1px solid oklch(0.28 0.03 250 / 50%)',
                                color: 'oklch(0.65 0.02 250)',
                              }
                        }
                      >
                        <div className='font-semibold text-white/80'>{m.name}</div>
                        <div className={`mt-0.5 text-[10px] font-mono ${PROVIDER_COLORS[m.provider] ?? 'text-white/40'}`}>
                          {m.note ?? m.label}
                        </div>
                        <div className='mt-1 font-mono text-[10px] text-white/35'>
                          in ${m.inputApinet} · out ${m.outputApinet}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume selector */}
                <div>
                  <label className='mb-3 block text-[10px] font-bold tracking-[0.15em] uppercase text-white/40'>
                    {t('Tokens per month')}
                  </label>
                  <div className='grid grid-cols-4 gap-2'>
                    {VOLUMES.map((v, i) => (
                      <button
                        key={v.label}
                        onClick={() => setSelectedVolume(i)}
                        className='rounded-lg px-2 py-2.5 text-center text-xs transition-all duration-150'
                        style={
                          selectedVolume === i
                            ? {
                                background: 'oklch(0.25 0.06 260 / 60%)',
                                border: '1px solid oklch(0.55 0.18 260 / 50%)',
                              }
                            : {
                                background: 'oklch(0.17 0.02 250 / 70%)',
                                border: '1px solid oklch(0.28 0.03 250 / 50%)',
                              }
                        }
                      >
                        <div className='font-semibold text-white/80'>{v.label}</div>
                        <div className='mt-0.5 text-[10px] text-white/35'>{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rate comparison */}
                <div
                  className='space-y-3 rounded-xl p-4'
                  style={{ background: 'oklch(0.17 0.02 250 / 60%)', border: '1px solid oklch(0.25 0.03 250 / 50%)' }}
                >
                  <div className='flex items-center justify-between text-xs'>
                    <span className='text-white/40'>{t('APINET rate')} (in/out)</span>
                    <span className='font-mono font-semibold text-emerald-400'>
                      ${model.inputApinet} / ${model.outputApinet} /1M
                    </span>
                  </div>
                  <div className='h-px' style={{ background: 'oklch(0.25 0.03 250 / 40%)' }} />
                  <div className='flex items-center justify-between text-xs'>
                    <span className='text-white/40'>{t('Retail rate')} (in/out)</span>
                    <span className='font-mono text-white/30 line-through'>
                      ${model.inputRetail} / ${model.outputRetail} /1M
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: result */}
              <div className='flex flex-col justify-center p-8 text-center'>
                {/* Big savings number */}
                <div className='mb-8'>
                  {discount > 0 ? (
                    <>
                      <div
                        className='text-5xl font-bold tracking-tight tabular-nums md:text-6xl'
                        style={{
                          background: 'linear-gradient(135deg, oklch(0.75 0.18 165), oklch(0.72 0.16 200))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        -{discount}%
                      </div>
                      <div className='mt-2 text-sm text-white/40'>
                        {t('savings vs direct')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className='text-4xl font-bold text-white/30'>≈</div>
                      <div className='mt-2 text-sm text-white/40'>
                        {t('similar price')}
                      </div>
                    </>
                  )}
                </div>

                {/* Cost breakdown */}
                <div
                  className='mb-8 space-y-4 rounded-xl p-5'
                  style={{ background: 'oklch(0.17 0.02 250 / 60%)', border: '1px solid oklch(0.25 0.03 250 / 50%)' }}
                >
                  <div>
                    <div className='mb-1 text-xs text-white/40'>{t('You pay with APINET')}</div>
                    <div className='text-2xl font-bold tabular-nums text-white'>
                      {fmt(apinetCost)}
                      <span className='ml-1 text-sm font-normal text-white/40'>/{t('month')}</span>
                    </div>
                  </div>
                  <div className='h-px' style={{ background: 'oklch(0.25 0.03 250 / 40%)' }} />
                  <div className='flex items-center justify-between'>
                    <div>
                      <div className='mb-0.5 text-xs text-white/40'>{t('Direct cost')}</div>
                      <div className='text-base tabular-nums text-white/25 line-through'>
                        {fmt(retailCost)}
                      </div>
                    </div>
                    {saved > 0 && (
                      <div
                        className='rounded-lg px-3 py-1.5 text-sm font-semibold text-emerald-400'
                        style={{ background: 'oklch(0.30 0.10 165 / 25%)', border: '1px solid oklch(0.45 0.15 165 / 30%)' }}
                      >
                        {t('Save')} {fmt(saved)}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  className='group w-full rounded-lg'
                  render={<Link to='/sign-up' />}
                >
                  {t('Start saving now')}
                  <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                </Button>
                <p className='mt-3 text-xs text-white/30'>
                  {t('No card required · Cancel anytime')}
                </p>
              </div>
            </div>
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}
