import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Copy, Check, Key, Zap, CreditCard, AlertCircle, Code2, BookOpen } from 'lucide-react'
import { PublicLayout } from '@/components/layout'
import { cn } from '@/lib/utils'

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

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const { copied, copy } = useCopy(code)
  return (
    <div className='group relative'>
      {label && (
        <div className='text-muted-foreground mb-1.5 text-xs font-medium'>{label}</div>
      )}
      <div className='bg-muted/60 flex items-center gap-3 rounded-lg border px-4 py-3'>
        <code className='text-foreground flex-1 overflow-x-auto whitespace-pre font-mono text-sm leading-relaxed'>
          {code}
        </code>
        <button
          onClick={copy}
          className='text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1 transition-colors'
          aria-label='Copy'
        >
          {copied ? <Check className='h-4 w-4 text-green-500' /> : <Copy className='h-4 w-4' />}
        </button>
      </div>
    </div>
  )
}

function Chip({ label, icon, href }: { label: string; icon?: string; href?: string }) {
  const inner = (
    <span className='bg-card hover:bg-muted/60 flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors'>
      {icon && <img src={icon} alt='' className='h-4 w-4 rounded object-contain' />}
      {label}
    </span>
  )
  if (href) {
    return (
      <a href={href} target='_blank' rel='noopener noreferrer'>
        {inner}
      </a>
    )
  }
  return inner
}

interface DocCardProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

function DocCard({ icon, title, subtitle, children, className }: DocCardProps) {
  return (
    <div
      className={cn(
        'bg-card/80 border-border/60 flex min-w-0 flex-col overflow-hidden rounded-xl border shadow-[0_8px_32px_rgba(0,0,0,0.06)]',
        className
      )}
    >
      <div className='border-border/60 flex items-start gap-3 border-b px-5 py-4'>
        <div className='bg-background border-border/60 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm'>
          {icon}
        </div>
        <div className='min-w-0'>
          <div className='text-foreground text-base font-semibold leading-tight'>{title}</div>
          {subtitle && (
            <div className='text-muted-foreground mt-0.5 text-sm'>{subtitle}</div>
          )}
        </div>
      </div>
      <div className='flex flex-col gap-4 p-5'>{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopy(value)
  return (
    <div className='flex flex-col gap-1'>
      <span className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
        {label}
      </span>
      <div className='bg-muted/40 group flex items-center gap-2 rounded-lg border px-3 py-2'>
        <code className='text-foreground flex-1 overflow-x-auto font-mono text-sm'>{value}</code>
        <button
          onClick={copy}
          className='text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 transition-colors'
        >
          {copied ? <Check className='h-3.5 w-3.5 text-green-500' /> : <Copy className='h-3.5 w-3.5' />}
        </button>
      </div>
    </div>
  )
}

export function Docs() {
  const { t } = useTranslation()
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

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

  const [activeTab, setActiveTab] = useState<'python' | 'js'>('python')

  return (
    <PublicLayout>
      <main className='mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-10 sm:px-6'>
        {/* Hero */}
        <div className='flex flex-col gap-2'>
          <div className='text-muted-foreground flex items-center gap-2 text-sm'>
            <BookOpen className='h-4 w-4' />
            <span>{t('Документация')}</span>
          </div>
          <h1 className='text-foreground text-3xl font-bold tracking-tight sm:text-4xl'>
            {t('Руководства')}
          </h1>
          <p className='text-muted-foreground mt-1 max-w-xl text-base leading-relaxed'>
            {t('Всё необходимое для начала работы: подключение к API, настройка клиентов и управление балансом.')}
          </p>
        </div>

        {/* Grid */}
        <div className='grid gap-6 md:grid-cols-2'>

          {/* Card 1 – Endpoint info */}
          <DocCard
            icon={<Zap className='text-primary h-5 w-5' />}
            title={t('Эндпоинты API')}
            subtitle={t('Совместимость с OpenAI SDK')}
          >
            <InfoRow label={t('Base URL')} value={`${baseUrl}/v1`} />
            <InfoRow label={t('Chat completions')} value={`${baseUrl}/v1/chat/completions`} />
            <InfoRow label={t('Models list')} value={`${baseUrl}/v1/models`} />
            <InfoRow label={t('Embeddings')} value={`${baseUrl}/v1/embeddings`} />
          </DocCard>

          {/* Card 2 – API key */}
          <DocCard
            icon={<Key className='text-primary h-5 w-5' />}
            title={t('Получение API-ключа')}
            subtitle={t('Личный кабинет → Ключи')}
          >
            <ol className='text-foreground flex flex-col gap-3 text-sm'>
              <li className='flex gap-3'>
                <span className='bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold'>1</span>
                <span>{t('Войдите в личный кабинет и перейдите в раздел')} <Link to='/keys/' className='text-primary hover:underline'>{t('Ключи')}</Link>.</span>
              </li>
              <li className='flex gap-3'>
                <span className='bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold'>2</span>
                <span>{t('Нажмите «Добавить ключ», задайте имя и лимиты.')}</span>
              </li>
              <li className='flex gap-3'>
                <span className='bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold'>3</span>
                <span>{t('Скопируйте ключ — он отображается только один раз.')}</span>
              </li>
              <li className='flex gap-3'>
                <span className='bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold'>4</span>
                <span>{t('Вставьте ключ в ваше приложение или IDE как')}{' '}<code className='bg-muted rounded px-1 font-mono text-xs'>OPENAI_API_KEY</code>.</span>
              </li>
            </ol>
            <Link
              to='/_authenticated/keys/'
              className='bg-primary text-primary-foreground hover:bg-primary/90 mt-1 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors'
            >
              {t('Перейти к ключам →')}
            </Link>
          </DocCard>

          {/* Card 3 – Code examples */}
          <DocCard
            icon={<Code2 className='text-primary h-5 w-5' />}
            title={t('Примеры кода')}
            subtitle={t('Python · JavaScript / TypeScript')}
            className='md:col-span-2'
          >
            <div className='flex gap-2'>
              {(['python', 'js'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                    activeTab === tab
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground border-transparent'
                  )}
                >
                  {tab === 'python' ? 'Python' : 'JavaScript'}
                </button>
              ))}
            </div>
            <CodeBlock code={activeTab === 'python' ? pythonExample : jsExample} />
          </DocCard>

          {/* Card 4 – IDE clients */}
          <DocCard
            icon={<span className='text-base'>🖥️</span>}
            title={t('Клиенты и IDE')}
            subtitle={t('Приложения, поддерживающие OpenAI-совместимый API')}
          >
            <p className='text-muted-foreground text-sm'>
              {t('Укажите Base URL и ваш API-ключ в настройках любого из этих клиентов:')}
            </p>
            <div className='flex flex-wrap gap-2'>
              {clients.map((c) => (
                <Chip key={c.label} label={c.label} href={c.href} />
              ))}
            </div>
            <div className='bg-muted/40 rounded-lg border p-3 text-sm'>
              <span className='text-muted-foreground'>{t('Пример для Cursor:')} </span>
              <span className='text-foreground'>{t('Settings → Models → Base URL →')}{' '}</span>
              <code className='font-mono'>{baseUrl}/v1</code>
            </div>
          </DocCard>

          {/* Card 5 – Top-up */}
          <DocCard
            icon={<CreditCard className='text-primary h-5 w-5' />}
            title={t('Пополнение баланса')}
            subtitle={t('Банковские карты и СБП')}
          >
            <ol className='text-foreground flex flex-col gap-3 text-sm'>
              <li className='flex gap-3'>
                <span className='bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold'>1</span>
                <span>{t('Перейдите в раздел')} <Link to='/wallet/' className='text-primary hover:underline'>{t('Кошелёк')}</Link>.</span>
              </li>
              <li className='flex gap-3'>
                <span className='bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold'>2</span>
                <span>{t('Введите сумму и выберите способ оплаты (FreeKassa).')}</span>
              </li>
              <li className='flex gap-3'>
                <span className='bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold'>3</span>
                <span>{t('Оплатите через банковскую карту или СБП. Баланс зачисляется автоматически.')}</span>
              </li>
            </ol>
            <div className='text-muted-foreground bg-muted/40 rounded-lg border p-3 text-sm'>
              💡 {t('Стоимость запросов списывается автоматически. Следите за балансом в разделе')} <Link to='/dashboard' className='text-primary hover:underline'>{t('Консоль')}</Link>.
            </div>
            <Link
              to='/wallet/'
              className='bg-primary text-primary-foreground hover:bg-primary/90 mt-1 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors'
            >
              {t('Пополнить баланс →')}
            </Link>
          </DocCard>

          {/* Card 6 – Troubleshooting */}
          <DocCard
            icon={<AlertCircle className='text-amber-500 h-5 w-5' />}
            title={t('Устранение проблем')}
            subtitle={t('Частые ошибки и решения')}
            className='md:col-span-2'
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              {[
                {
                  code: '401 Unauthorized',
                  desc: t('Неверный или истёкший API-ключ. Проверьте ключ в разделе «Ключи» и убедитесь, что он активен.'),
                },
                {
                  code: '429 Too Many Requests',
                  desc: t('Превышен лимит запросов. Проверьте лимиты ключа или обратитесь в поддержку.'),
                },
                {
                  code: '402 Insufficient Balance',
                  desc: t('Недостаточно средств на балансе. Пополните кошелёк.'),
                },
                {
                  code: 'Model not found',
                  desc: t('Модель недоступна для вашего ключа. Проверьте настройки доступа в разделе «Ключи».'),
                },
                {
                  code: 'base_url wrong',
                  desc: t('Убедитесь что Base URL указан без двойного слэша и заканчивается на /v1.'),
                },
                {
                  code: 'SSL / TLS error',
                  desc: t('Используйте HTTPS-адрес. Если запускаете локально, отключите проверку сертификата только для тестов.'),
                },
              ].map((item) => (
                <div key={item.code} className='bg-muted/40 flex flex-col gap-1.5 rounded-lg border p-3'>
                  <code className='text-foreground font-mono text-sm font-semibold'>{item.code}</code>
                  <p className='text-muted-foreground text-sm leading-relaxed'>{item.desc}</p>
                </div>
              ))}
            </div>
          </DocCard>

        </div>
      </main>
    </PublicLayout>
  )
}
