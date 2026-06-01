import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimateInView } from '@/components/animate-in-view'

interface CounterProps {
  end: number
  suffix?: string
  prefix?: string
  duration?: number
  decimals?: number
}

function Counter(props: CounterProps) {
  const { end, suffix = '', prefix = '', duration = 1600, decimals = 0 } = props
  const ref = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  const formatValue = useCallback(
    (v: number) =>
      decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString(),
    [decimals]
  )

  const animate = useCallback(() => {
    const el = ref.current
    if (!el) return
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      el.textContent = `${prefix}${formatValue(eased * end)}${suffix}`
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, prefix, suffix, formatValue])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      el.textContent = `${prefix}${formatValue(end)}${suffix}`
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true
          animate()
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [animate, end, prefix, suffix, formatValue])

  return (
    <span ref={ref} className='tabular-nums'>
      {prefix}0{suffix}
    </span>
  )
}

const PRICING_HIGHLIGHTS = [
  { value: '$0.14', label: 'за 1M токенов', model: 'DeepSeek V4 Flash', saved: 'от $1.00' },
  { value: '$1.74', label: 'за 1M токенов', model: 'DeepSeek V4 Pro', saved: 'от $3.00' },
  { value: '$0.28', label: 'за 1M токенов', model: 'DeepSeek R1', saved: 'от $4.00' },
  { value: '$2.00', label: 'за 1M токенов', model: 'Claude Opus 4', saved: 'от $15.00' },
  { value: '$0.30', label: 'за 1M токенов', model: 'GPT-4.1 Mini', saved: 'от $0.40' },
]

export function Stats() {
  const { t } = useTranslation()

  const counters = [
    { end: 660, suffix: '+', label: t('models available') },
    { end: 50, suffix: '+', label: t('upstream services') },
    { end: 100, suffix: '+', label: t('billing types') },
    { end: 99.9, suffix: '%', label: t('uptime SLA'), decimals: 1 },
  ]

  return (
    <div className='relative z-10'>
      {/* Pricing highlights strip */}
      <AnimateInView animation='fade-up'>
        <div className='border-border/40 bg-muted/5 border-y'>
          <div className='mx-auto max-w-6xl px-6 py-6'>
            <div className='mb-4 flex items-center gap-2'>
              <span className='text-muted-foreground text-[10px] font-bold tracking-[0.15em] uppercase'>
                {t('Model Pricing')}
              </span>
              <div className='bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full px-2 py-0.5 text-[10px] font-semibold'>
                {t('Live rates')}
              </div>
            </div>
            <div className='flex flex-wrap items-stretch gap-px overflow-hidden rounded-xl border border-border/40 bg-border/40'>
              {PRICING_HIGHLIGHTS.map((item, i) => (
                <div
                  key={i}
                  className='group bg-background hover:bg-muted/20 flex flex-1 min-w-[140px] flex-col items-center justify-center px-4 py-4 text-center transition-colors duration-200'
                >
                  <span className='text-xl font-bold tracking-tight text-foreground tabular-nums'>
                    {item.value}
                  </span>
                  <span className='text-muted-foreground mt-0.5 text-[11px]'>
                    {item.label}
                  </span>
                  <span className='mt-1 text-xs font-medium text-foreground/70'>
                    {item.model}
                  </span>
                  <span className='text-muted-foreground/50 mt-0.5 text-[10px] line-through'>
                    {item.saved} {t('retail')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimateInView>

      {/* Counters strip */}
      <div className='border-border/40 bg-muted/10 border-b'>
        <div className='mx-auto max-w-6xl px-6 py-10 md:py-12'>
          <div className='grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12'>
            {counters.map((s, i) => (
              <AnimateInView key={s.label} delay={i * 80} animation='fade-up' className='flex flex-col items-center text-center'>
                <span className='text-2xl font-bold tracking-tight md:text-3xl'>
                  <Counter end={s.end} suffix={s.suffix} decimals={s.decimals} />
                </span>
                <span className='text-muted-foreground mt-1.5 text-xs'>
                  {s.label}
                </span>
              </AnimateInView>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
