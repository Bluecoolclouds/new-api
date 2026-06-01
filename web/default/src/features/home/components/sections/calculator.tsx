import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { AnimateInView } from '@/components/animate-in-view'

interface Model {
  name: string
  apinet: number
  retail: number
  label: string
}

const MODELS: Model[] = [
  { name: 'DeepSeek V4 Flash', apinet: 0.14, retail: 1.0, label: 'deepseek-v4-flash' },
  { name: 'DeepSeek V4 Pro', apinet: 1.74, retail: 3.0, label: 'deepseek-v4-pro' },
  { name: 'DeepSeek R1', apinet: 0.28, retail: 4.0, label: 'deepseek-r1' },
  { name: 'Claude Opus 4', apinet: 2.0, retail: 15.0, label: 'claude-opus-4' },
  { name: 'GPT-4.1', apinet: 2.0, retail: 2.0, label: 'gpt-4.1' },
  { name: 'Gemini 2.5 Flash', apinet: 0.30, retail: 0.30, label: 'gemini-2.5-flash' },
]

const VOLUMES = [
  { label: '1M', value: 1, desc: 'тестирование' },
  { label: '10M', value: 10, desc: 'стартап' },
  { label: '100M', value: 100, desc: 'продакшн' },
  { label: '1B', value: 1000, desc: 'энтерпрайз' },
]

export function Calculator() {
  const { t } = useTranslation()
  const [selectedModel, setSelectedModel] = useState(0)
  const [selectedVolume, setSelectedVolume] = useState(1)

  const model = MODELS[selectedModel]
  const volume = VOLUMES[selectedVolume].value

  const apinetCost = (model.apinet * volume) / 1000
  const retailCost = (model.retail * volume) / 1000
  const saved = retailCost - apinetCost
  const discount = retailCost > 0 ? Math.round((saved / retailCost) * 100) : 0

  const fmt = (n: number) =>
    n >= 1000
      ? `$${(n / 1000).toFixed(1)}K`
      : n >= 1
        ? `$${n.toFixed(2)}`
        : `$${n.toFixed(3)}`

  return (
    <section className='border-border/40 relative z-10 border-t px-6 py-24 md:py-32'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-16 text-center md:mb-20'>
          <p className='text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase'>
            {t('Calculator')}
          </p>
          <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('How much will you save')}
          </h2>
          <p className='text-muted-foreground mx-auto mt-3 max-w-md text-sm'>
            {t('Compare APINET prices with direct provider rates')}
          </p>
        </AnimateInView>

        <AnimateInView animation='fade-up' delay={100}>
          <div className='border-border/40 bg-muted/5 overflow-hidden rounded-2xl border'>
            <div className='grid gap-0 lg:grid-cols-2'>
              {/* Left: controls */}
              <div className='border-border/30 space-y-8 p-8 lg:border-r'>
                {/* Model selector */}
                <div>
                  <label className='text-muted-foreground mb-3 block text-xs font-medium tracking-widest uppercase'>
                    {t('Model')}
                  </label>
                  <div className='grid grid-cols-2 gap-2'>
                    {MODELS.map((m, i) => (
                      <button
                        key={m.label}
                        onClick={() => setSelectedModel(i)}
                        className={`rounded-lg border px-3 py-2.5 text-left text-xs transition-all duration-150 ${
                          selectedModel === i
                            ? 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'border-border/40 hover:border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className='font-medium'>{m.name}</div>
                        <div className='mt-0.5 font-mono text-[10px] opacity-60'>{m.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume selector */}
                <div>
                  <label className='text-muted-foreground mb-3 block text-xs font-medium tracking-widest uppercase'>
                    {t('Tokens per month')}
                  </label>
                  <div className='grid grid-cols-4 gap-2'>
                    {VOLUMES.map((v, i) => (
                      <button
                        key={v.label}
                        onClick={() => setSelectedVolume(i)}
                        className={`rounded-lg border px-3 py-2.5 text-center text-xs transition-all duration-150 ${
                          selectedVolume === i
                            ? 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'border-border/40 hover:border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className='font-semibold'>{v.label}</div>
                        <div className='mt-0.5 text-[10px] opacity-60'>{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rate comparison */}
                <div className='border-border/30 space-y-2 rounded-xl border p-4'>
                  <div className='flex items-center justify-between text-xs'>
                    <span className='text-muted-foreground'>{t('APINET rate')}</span>
                    <span className='font-mono font-semibold text-emerald-600 dark:text-emerald-400'>
                      ${model.apinet}/1M
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-xs'>
                    <span className='text-muted-foreground'>{t('Retail rate')}</span>
                    <span className='text-muted-foreground font-mono line-through'>
                      ${model.retail}/1M
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
                      <div className='bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent tabular-nums md:text-6xl'>
                        -{discount}%
                      </div>
                      <div className='text-muted-foreground mt-2 text-sm'>
                        {t('savings vs direct')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className='text-muted-foreground text-4xl font-bold'>≈</div>
                      <div className='text-muted-foreground mt-2 text-sm'>
                        {t('similar price')}
                      </div>
                    </>
                  )}
                </div>

                {/* Cost breakdown */}
                <div className='border-border/30 mb-8 space-y-4 rounded-xl border p-5'>
                  <div>
                    <div className='text-muted-foreground mb-1 text-xs'>{t('You pay with APINET')}</div>
                    <div className='text-2xl font-bold tabular-nums text-foreground'>
                      {fmt(apinetCost)}
                      <span className='text-muted-foreground ml-1 text-sm font-normal'>/{t('month')}</span>
                    </div>
                  </div>
                  <div className='bg-border/40 h-px' />
                  <div className='flex items-center justify-between'>
                    <div>
                      <div className='text-muted-foreground mb-0.5 text-xs'>{t('Direct cost')}</div>
                      <div className='text-muted-foreground text-base tabular-nums line-through'>
                        {fmt(retailCost)}
                      </div>
                    </div>
                    {saved > 0 && (
                      <div className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg px-3 py-1.5 text-sm font-semibold'>
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
                <p className='text-muted-foreground mt-3 text-xs'>
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
