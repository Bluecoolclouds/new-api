import { useState } from "react";
import { Copy, Check, Key, Zap, CreditCard, AlertCircle, Code2, BookOpen, ChevronRight, ExternalLink } from "lucide-react";

function cn(...c: (string | undefined | false | null)[]) { return c.filter(Boolean).join(" "); }

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  return { copied, copy };
}

const BASE = "https://api.example.com";

function CopyBtn({ text }: { text: string }) {
  const { copied, copy } = useCopy(text);
  return (
    <button onClick={copy} className="text-muted-foreground hover:text-foreground shrink-0 rounded p-1 transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function EndpointRow({ label, path }: { label: string; path: string }) {
  const full = `${BASE}${path}`;
  return (
    <div className="flex items-center gap-2 py-2 border-b last:border-0 border-border/50">
      <span className="text-muted-foreground text-xs w-36 shrink-0">{label}</span>
      <code className="text-foreground flex-1 font-mono text-xs truncate">{full}</code>
      <CopyBtn text={full} />
    </div>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const { copied, copy } = useCopy(code);
  return (
    <div className="relative rounded-xl border overflow-hidden">
      <div className="flex items-center justify-between bg-muted/60 border-b px-4 py-2">
        <span className="text-muted-foreground text-xs font-medium font-mono">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs transition-colors">
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
      <pre className="bg-muted/30 overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-foreground text-xs">{code}</code>
      </pre>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.12em]">{children}</span>
      <div className="flex-1 border-t border-border/50" />
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-card border border-border/60 rounded-xl overflow-hidden", className)}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted border border-border/60">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
    </div>
  );
}

const py = `from openai import OpenAI

client = OpenAI(
    api_key="sk-your-api-key",
    base_url="${BASE}/v1",
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Привет!"}],
)
print(response.choices[0].message.content)`;

const js = `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'sk-your-api-key',
  baseURL: '${BASE}/v1',
});

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Привет!' }],
});
console.log(response.choices[0].message.content);`;

const errors = [
  { code: "401", label: "Unauthorized", color: "text-red-500 bg-red-500/8 border-red-500/20", desc: "Неверный или истёкший API-ключ. Проверьте ключ в разделе «Ключи»." },
  { code: "429", label: "Too Many Requests", color: "text-amber-500 bg-amber-500/8 border-amber-500/20", desc: "Превышен лимит запросов. Проверьте лимиты ключа." },
  { code: "402", label: "Insufficient Balance", color: "text-orange-500 bg-orange-500/8 border-orange-500/20", desc: "Недостаточно средств. Пополните кошелёк." },
  { code: "404", label: "Model not found", color: "text-muted-foreground bg-muted/60 border-border/60", desc: "Модель недоступна для вашего ключа. Проверьте настройки доступа." },
  { code: "URL", label: "base_url wrong", color: "text-blue-500 bg-blue-500/8 border-blue-500/20", desc: "Base URL должен заканчиваться на /v1 без двойного слэша." },
  { code: "TLS", label: "SSL / TLS error", color: "text-muted-foreground bg-muted/60 border-border/60", desc: "Используйте HTTPS. Для тестов можно отключить проверку сертификата." },
];

const clients = [
  "VS Code + Continue", "Cursor", "Cherry Studio", "OpenCode", "JetBrains AI", "Zed", "Lobechat", "NextChat",
];

export function DocsV1() {
  const [tab, setTab] = useState<"python" | "js">("python");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1100px] px-6 py-10 flex flex-col gap-10">

        {/* Page header */}
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <BookOpen className="h-4 w-4" />
            <span>Документация</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Руководства</h1>
          <p className="text-muted-foreground mt-1.5 max-w-lg text-sm leading-relaxed">
            Подключение к API, настройка клиентов и управление балансом.
          </p>
        </div>

        {/* Section 1: Connection */}
        <div>
          <SectionLabel>Подключение</SectionLabel>
          <div className="grid gap-5 md:grid-cols-2">

            {/* Endpoints */}
            <Card>
              <CardHeader icon={<Zap className="h-4 w-4 text-primary" />} title="Эндпоинты API" subtitle="Совместимость с OpenAI SDK" />
              <div className="px-5 py-3">
                <EndpointRow label="Base URL" path="/v1" />
                <EndpointRow label="Chat completions" path="/v1/chat/completions" />
                <EndpointRow label="Models list" path="/v1/models" />
                <EndpointRow label="Embeddings" path="/v1/embeddings" />
              </div>
            </Card>

            {/* API Key */}
            <Card>
              <CardHeader icon={<Key className="h-4 w-4 text-primary" />} title="Получение API-ключа" subtitle="Личный кабинет → Ключи" />
              <div className="px-5 py-4 flex flex-col gap-3">
                {[
                  "Войдите в личный кабинет и перейдите в раздел Ключи.",
                  "Нажмите «Добавить ключ», задайте имя и лимиты.",
                  "Скопируйте ключ — он отображается только один раз.",
                  <>Вставьте ключ как <code className="bg-muted rounded px-1 font-mono text-xs">OPENAI_API_KEY</code>.</>,
                ].map((step, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">{i + 1}</span>
                    <span className="text-foreground leading-snug">{step}</span>
                  </div>
                ))}
                <a href="#" className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  Перейти к ключам <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </Card>

            {/* Code examples — full width */}
            <Card className="md:col-span-2">
              <CardHeader icon={<Code2 className="h-4 w-4 text-primary" />} title="Примеры кода" subtitle="Python · JavaScript / TypeScript" />
              <div className="px-5 py-4 flex flex-col gap-3">
                <div className="flex gap-1.5">
                  {(["python", "js"] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                      className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
                        tab === t ? "bg-foreground text-background border-foreground" : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground"
                      )}>
                      {t === "python" ? "Python" : "JavaScript"}
                    </button>
                  ))}
                </div>
                <CodeBlock code={tab === "python" ? py : js} lang={tab === "python" ? "python" : "javascript"} />
              </div>
            </Card>
          </div>
        </div>

        {/* Section 2: Clients + Top-up */}
        <div>
          <SectionLabel>Клиенты и оплата</SectionLabel>
          <div className="grid gap-5 md:grid-cols-2">

            {/* IDE Clients */}
            <Card>
              <CardHeader icon={<span className="text-sm">🖥️</span>} title="Клиенты и IDE" subtitle="OpenAI-совместимый API" />
              <div className="px-5 py-4 flex flex-col gap-4">
                <p className="text-muted-foreground text-sm">Укажите Base URL и ваш API-ключ в настройках:</p>
                <div className="flex flex-wrap gap-1.5">
                  {clients.map((c) => (
                    <a key={c} href="#" className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                      {c} <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                    </a>
                  ))}
                </div>
                <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Cursor:</span> Settings → Models → Base URL → <code className="font-mono">{BASE}/v1</code>
                </div>
              </div>
            </Card>

            {/* Top-up */}
            <Card>
              <CardHeader icon={<CreditCard className="h-4 w-4 text-primary" />} title="Пополнение баланса" subtitle="Карты и СБП" />
              <div className="px-5 py-4 flex flex-col gap-3">
                {[
                  "Перейдите в раздел Кошелёк.",
                  "Введите сумму и выберите способ оплаты (FreeKassa).",
                  "Оплатите картой или через СБП. Баланс зачисляется мгновенно.",
                ].map((step, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">{i + 1}</span>
                    <span className="text-foreground leading-snug">{step}</span>
                  </div>
                ))}
                <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5 text-xs text-muted-foreground mt-1">
                  💡 Стоимость запросов списывается автоматически. Следите за балансом в разделе Консоль.
                </div>
                <a href="#" className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  Пополнить баланс <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </Card>
          </div>
        </div>

        {/* Section 3: Troubleshooting */}
        <div>
          <SectionLabel>Устранение проблем</SectionLabel>
          <Card>
            <CardHeader icon={<AlertCircle className="h-4 w-4 text-amber-500" />} title="Частые ошибки" subtitle="Коды ошибок и решения" />
            <div className="grid sm:grid-cols-2 gap-px bg-border/30 p-px rounded-b-xl overflow-hidden">
              {errors.map((e) => (
                <div key={e.code} className="bg-card flex gap-3 p-4">
                  <span className={cn("mt-0.5 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none", e.color)}>
                    {e.code}
                  </span>
                  <div>
                    <div className="text-foreground text-xs font-semibold mb-0.5">{e.label}</div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
