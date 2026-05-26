import { useState, useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Copy, Check, Key, Zap, CreditCard, AlertCircle, Code2,
  BookOpen, ArrowRight, ExternalLink,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout'
import { cn } from '@/lib/utils'

/* ─── Copy hook ─────────────────────────────────────────────────────────── */
function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return { copied, copy }
}

/* ─── Code block with macOS-style header ───────────────────────────────── */
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const { copied, copy } = useCopy(code)
  return (
    <div className='rounded-xl border overflow-hidden'>
      <div className='flex items-center justify-between bg-muted/40 border-b px-4 py-2'>
        <div className='flex gap-1.5'>
          <span className='h-2.5 w-2.5 rounded-full bg-red-400/70' />
          <span className='h-2.5 w-2.5 rounded-full bg-amber-400/70' />
          <span className='h-2.5 w-2.5 rounded-full bg-green-400/70' />
        </div>
        <span className='text-muted-foreground text-[10px] font-mono'>{lang}</span>
        <button
          onClick={copy}
          className='flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs transition-colors'
        >
          {copied ? <Check className='h-3 w-3 text-green-500' /> : <Copy className='h-3 w-3' />}
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
      <pre className='bg-muted/20 overflow-x-auto px-5 py-4'>
        <code className='font-mono text-foreground text-[12.5px] leading-[1.7]'>{code}</code>
      </pre>
    </div>
  )
}

/* ─── Endpoint row ──────────────────────────────────────────────────────── */
function EndpointRow({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopy(value)
  return (
    <div className='flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors border-b last:border-0 border-border/40'>
      <span className='text-xs text-muted-foreground w-32 shrink-0'>{label}</span>
      <code className='flex-1 font-mono text-xs text-foreground truncate'>{value}</code>
      <button
        onClick={copy}
        className='shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded'
        aria-label='Copy'
      >
        {copied ? <Check className='h-3.5 w-3.5 text-green-500' /> : <Copy className='h-3.5 w-3.5' />}
      </button>
    </div>
  )
}

/* ─── Section card wrapper ──────────────────────────────────────────────── */
function SectionCard({
  icon, title, subtitle, children, id,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
  id?: string
}) {
  return (
    <div id={id} className='rounded-xl border border-border/60 bg-card overflow-hidden scroll-mt-6'>
      <div className='flex items-center gap-3 px-5 py-3.5 border-b border-border/50'>
        <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted border border-border/60'>
          {icon}
        </div>
        <div>
          <div className='text-sm font-semibold text-foreground'>{title}</div>
          {subtitle && <div className='text-xs text-muted-foreground'>{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

/* ─── Sidebar nav item ──────────────────────────────────────────────────── */
function NavItem({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium w-full text-left transition-colors',
        active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

/* ─── Main component ────────────────────────────────────────────────────── */
export function Docs() {
  const { t } = useTranslation()
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const [activeTab, setActiveTab] = useState<'python' | 'js'>('python')
  const [activeSection, setActiveSection] = useState('quickstart')

  const sectionIds = ['quickstart', 'endpoints', 'clients', 'topup', 'errors'] as const
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  /* track active section on scroll */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    )
    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const clients = [
    { label: 'VS Code + Continue', href: 'https://continue.dev' },
    { label: 'Cursor', href: 'https://www.cursor.com' },
    { label: 'Cherry Studio', href: 'https://cherry-ai.com' },
    { label: 'OpenCode', href: 'https://opencode.ai' },
    { label: 'JetBrains AI', href: 'https://www.jetbrains.com/ai' },
    { label: 'Zed', href: 'https://zed.dev' },
    { label: 'Lobechat', href: 'https://lobechat.com' },
    { label: 'NextChat', href: 'https://nextchat.dev' },
  ]

  const pythonExample = `from openai import OpenAI

client = OpenAI(
    api_key="sk-your-api-key",
    base_url="${baseUrl}/v1",
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Привет!"}],
)
print(response.choices[0].message.content)`

  const jsExample = `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'sk-your-api-key',
  baseURL: '${baseUrl}/v1',
});

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Привет!' }],
});
console.log(response.choices[0].message.content);`

  const errors = [
    { code: '401', label: 'Unauthorized', dot: 'bg-red-500', desc: t('Неверный или истёкший API-ключ. Проверьте ключ в разделе «Ключи» и убедитесь, что он активен.') },
    { code: '429', label: 'Too Many Requests', dot: 'bg-amber-500', desc: t('Превышен лимит запросов. Проверьте лимиты ключа или обратитесь в поддержку.') },
    { code: '402', label: 'Insufficient Balance', dot: 'bg-orange-500', desc: t('Недостаточно средств на балансе. Пополните кошелёк.') },
    { code: '404', label: 'Model not found', dot: 'bg-muted-foreground/60', desc: t('Модель недоступна для вашего ключа. Проверьте настройки доступа в разделе «Ключи».') },
    { code: 'URL', label: 'base_url wrong', dot: 'bg-blue-500', desc: t('Убедитесь что Base URL указан без двойного слэша и заканчивается на /v1.') },
    { code: 'TLS', label: 'SSL / TLS error', dot: 'bg-muted-foreground/60', desc: t('Используйте HTTPS-адрес. Если запускаете локально, отключите проверку сертификата только для тестов.') },
  ]

  return (
    <PublicLayout>
      <div className='flex w-full min-h-0'>

        {/* ── Left sidebar ── */}
        <aside className='hidden lg:flex w-52 shrink-0 flex-col border-r border-border/60 bg-muted/10 pt-6 px-3 gap-1 sticky top-0 h-[calc(100vh-var(--header-height,60px))] overflow-y-auto'>
          <div className='flex items-center gap-2 px-3 mb-4'>
            <BookOpen className='h-4 w-4 text-muted-foreground' />
            <span className='text-sm font-semibold text-foreground'>{t('Документация')}</span>
          </div>

          <div className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1'>
            {t('Начало работы')}
          </div>
          <NavItem
            icon={<Zap className='h-3.5 w-3.5' />}
            label={t('Быстрый старт')}
            active={activeSection === 'quickstart'}
            onClick={() => scrollTo('quickstart')}
          />
          <NavItem
            icon={<Key className='h-3.5 w-3.5' />}
            label={t('API-ключи')}
            active={activeSection === 'endpoints'}
            onClick={() => scrollTo('endpoints')}
          />

          <div className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mt-4 mb-1'>
            {t('Интеграция')}
          </div>
          <NavItem
            icon={<span className='text-xs'>🖥️</span>}
            label={t('Клиенты и IDE')}
            active={activeSection === 'clients'}
            onClick={() => scrollTo('clients')}
          />
          <NavItem
            icon={<CreditCard className='h-3.5 w-3.5' />}
            label={t('Оплата')}
            active={activeSection === 'topup'}
            onClick={() => scrollTo('topup')}
          />

          <div className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mt-4 mb-1'>
            {t('Справка')}
          </div>
          <NavItem
            icon={<AlertCircle className='h-3.5 w-3.5' />}
            label={t('Ошибки')}
            active={activeSection === 'errors'}
            onClick={() => scrollTo('errors')}
          />
        </aside>

        {/* ── Main content ── */}
        <main className='flex-1 min-w-0 overflow-y-auto'>
          <div className='mx-auto max-w-[860px] px-6 py-10 flex flex-col gap-10 sm:px-8'>

            {/* Quick-start ── */}
            <div id='quickstart'>
              <div className='mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                {t('Быстрый старт')}
              </div>
              <h1 className='text-2xl font-bold tracking-tight text-foreground mb-1'>
                {t('Три шага до первого запроса')}
              </h1>
              <p className='text-muted-foreground text-sm mb-6'>
                {t('Займёт меньше пяти минут.')}
              </p>

              {/* 3-step cards */}
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8'>
                {[
                  {
                    icon: <Key className='h-5 w-5 text-primary' />,
                    title: t('Создайте ключ'),
                    desc: t('Ключи → Добавить ключ'),
                    to: '/_authenticated/keys/' as const,
                  },
                  {
                    icon: <CreditCard className='h-5 w-5 text-primary' />,
                    title: t('Пополните баланс'),
                    desc: t('Кошелёк → FreeKassa / СБП'),
                    to: '/wallet/' as const,
                  },
                  {
                    icon: <Code2 className='h-5 w-5 text-primary' />,
                    title: t('Отправьте запрос'),
                    desc: t('Скопируйте пример ниже'),
                    to: '/docs' as const,
                  },
                ].map((s, i) => (
                  <Link
                    key={i}
                    to={s.to}
                    className='group flex flex-col gap-2.5 rounded-xl border border-border/60 bg-card p-4 hover:border-foreground/20 hover:shadow-sm transition-all'
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border/50'>
                        {s.icon}
                      </div>
                      <ArrowRight className='h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors' />
                    </div>
                    <div>
                      <div className='text-sm font-semibold text-foreground'>{s.title}</div>
                      <div className='text-xs text-muted-foreground mt-0.5'>{s.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Code example */}
              <div className='rounded-xl border border-border/60 bg-card overflow-hidden'>
                <div className='flex items-center justify-between px-5 py-3.5 border-b border-border/50'>
                  <div className='flex items-center gap-2'>
                    <Code2 className='h-4 w-4 text-muted-foreground' />
                    <span className='text-sm font-semibold text-foreground'>{t('Пример кода')}</span>
                  </div>
                  <div className='flex gap-1'>
                    {(['python', 'js'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                          activeTab === tab
                            ? 'bg-foreground text-background'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {tab === 'python' ? 'Python' : 'JS'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className='p-4'>
                  <CodeBlock
                    code={activeTab === 'python' ? pythonExample : jsExample}
                    lang={activeTab === 'python' ? 'python' : 'javascript'}
                  />
                </div>
              </div>
            </div>

            {/* Endpoints ── */}
            <SectionCard
              id='endpoints'
              icon={<Zap className='h-4 w-4 text-primary' />}
              title={t('Эндпоинты API')}
              subtitle={t('Совместимость с OpenAI SDK')}
            >
              <div>
                <EndpointRow label='Base URL' value={`${baseUrl}/v1`} />
                <EndpointRow label='Chat completions' value={`${baseUrl}/v1/chat/completions`} />
                <EndpointRow label='Models' value={`${baseUrl}/v1/models`} />
                <EndpointRow label='Embeddings' value={`${baseUrl}/v1/embeddings`} />
              </div>
            </SectionCard>

            {/* Clients ── */}
            <SectionCard
              id='clients'
              icon={<span className='text-sm leading-none'>🖥️</span>}
              title={t('Клиенты и IDE')}
              subtitle={t('Приложения, поддерживающие OpenAI-совместимый API')}
            >
              <div className='p-5 flex flex-col gap-4'>
                <p className='text-muted-foreground text-sm'>
                  {t('Укажите Base URL и ваш API-ключ в настройках любого из этих клиентов:')}
                </p>
                <div className='flex flex-wrap gap-2'>
                  {clients.map((c) => (
                    <a
                      key={c.label}
                      href={c.href}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:border-foreground/20 transition-colors'
                    >
                      {c.label}
                      <ExternalLink className='h-2.5 w-2.5 text-muted-foreground' />
                    </a>
                  ))}
                </div>
                <div className='rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-xs'>
                  <span className='font-semibold text-foreground'>{t('Пример для Cursor:')} </span>
                  <span className='text-muted-foreground'>Settings → Models → Base URL → </span>
                  <code className='font-mono text-foreground'>{baseUrl}/v1</code>
                </div>
              </div>
            </SectionCard>

            {/* Top-up ── */}
            <SectionCard
              id='topup'
              icon={<CreditCard className='h-4 w-4 text-primary' />}
              title={t('Пополнение баланса')}
              subtitle={t('Банковские карты и СБП')}
            >
              <div className='p-5 flex flex-col gap-3'>
                {[
                  <>{t('Перейдите в раздел')} <Link to='/wallet/' className='text-primary hover:underline'>{t('Кошелёк')}</Link>.</>,
                  t('Введите сумму и выберите способ оплаты (FreeKassa).'),
                  t('Оплатите через банковскую карту или СБП. Баланс зачисляется автоматически.'),
                ].map((step, i) => (
                  <div key={i} className='flex gap-3 text-sm'>
                    <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5'>
                      {i + 1}
                    </span>
                    <span className='text-foreground leading-snug'>{step}</span>
                  </div>
                ))}
                <div className='rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5 text-xs text-muted-foreground mt-1'>
                  💡 {t('Стоимость запросов списывается автоматически. Следите за балансом в разделе')}{' '}
                  <Link to='/dashboard' className='text-primary hover:underline'>{t('Консоль')}</Link>.
                </div>
                <Link
                  to='/wallet/'
                  className='mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline'
                >
                  {t('Пополнить баланс')} <ArrowRight className='h-3.5 w-3.5' />
                </Link>
              </div>
            </SectionCard>

            {/* Errors ── */}
            <SectionCard
              id='errors'
              icon={<AlertCircle className='h-4 w-4 text-amber-500' />}
              title={t('Коды ошибок')}
              subtitle={t('Частые проблемы и решения')}
            >
              <div className='divide-y divide-border/40'>
                {errors.map((e) => (
                  <div key={e.code} className='flex items-start gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors'>
                    <div className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', e.dot)} />
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-0.5'>
                        <code className='font-mono text-xs font-bold text-foreground'>{e.code}</code>
                        <span className='text-xs text-muted-foreground'>{e.label}</span>
                      </div>
                      <p className='text-xs text-muted-foreground leading-relaxed'>{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

          </div>
        </main>

      </div>
    </PublicLayout>
  )
}
