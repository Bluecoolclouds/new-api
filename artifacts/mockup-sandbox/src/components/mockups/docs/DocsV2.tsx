import { useState } from "react";
import { Copy, Check, Key, Zap, CreditCard, AlertCircle, Code2, ArrowRight, ExternalLink, BookOpen } from "lucide-react";

function cn(...c: (string | undefined | false | null)[]) { return c.filter(Boolean).join(" "); }
function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  return { copied, copy };
}

const BASE = "https://api.example.com";

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
  { code: "401", label: "Unauthorized", dot: "bg-red-500", desc: "Неверный API-ключ. Проверьте ключ и убедитесь, что он активен." },
  { code: "429", label: "Too Many Requests", dot: "bg-amber-500", desc: "Превышен лимит запросов. Проверьте лимиты ключа." },
  { code: "402", label: "Insufficient Balance", dot: "bg-orange-500", desc: "Недостаточно средств. Пополните кошелёк." },
  { code: "404", label: "Model not found", dot: "bg-muted-foreground", desc: "Модель недоступна. Проверьте настройки доступа в «Ключах»." },
  { code: "URL", label: "base_url wrong", dot: "bg-blue-500", desc: "Base URL должен заканчиваться на /v1 без двойного слэша." },
  { code: "TLS", label: "SSL / TLS error", dot: "bg-muted-foreground", desc: "Используйте HTTPS-адрес." },
];

const clients = ["VS Code + Continue", "Cursor", "Cherry Studio", "OpenCode", "JetBrains AI", "Zed", "Lobechat", "NextChat"];

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const { copied, copy } = useCopy(code);
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="flex items-center justify-between bg-muted/40 border-b px-4 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
        </div>
        <span className="text-muted-foreground text-[10px] font-mono">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs transition-colors">
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "ok" : "copy"}
        </button>
      </div>
      <pre className="bg-zinc-950/[0.03] dark:bg-zinc-50/[0.03] overflow-x-auto px-5 py-4">
        <code className="font-mono text-foreground text-[12.5px] leading-[1.7]">{code}</code>
      </pre>
    </div>
  );
}

function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={cn(
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium w-full text-left transition-colors",
      active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
    )}>
      {icon}
      {label}
    </button>
  );
}

export function DocsV2() {
  const [tab, setTab] = useState<"python" | "js">("python");
  const [section, setSection] = useState("quickstart");

  return (
    <div className="min-h-screen bg-background flex">

      {/* Left sidebar */}
      <aside className="w-52 shrink-0 border-r border-border/60 bg-muted/20 flex flex-col pt-6 px-3 gap-1">
        <div className="flex items-center gap-2 px-3 mb-4">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Документация</span>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1">Начало работы</div>
        <NavItem icon={<Zap className="h-3.5 w-3.5" />} label="Быстрый старт" active={section === "quickstart"} />
        <NavItem icon={<Key className="h-3.5 w-3.5" />} label="API-ключи" />
        <NavItem icon={<Code2 className="h-3.5 w-3.5" />} label="Примеры кода" />
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mt-4 mb-1">Интеграция</div>
        <NavItem icon={<span className="text-xs">🖥️</span>} label="Клиенты и IDE" />
        <NavItem icon={<CreditCard className="h-3.5 w-3.5" />} label="Оплата" />
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mt-4 mb-1">Справка</div>
        <NavItem icon={<AlertCircle className="h-3.5 w-3.5" />} label="Ошибки" />
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] px-8 py-10 flex flex-col gap-10">

          {/* Quick-start strip */}
          <div>
            <div className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Быстрый старт</div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Три шага до первого запроса</h1>
            <p className="text-muted-foreground text-sm mb-6">Займёт меньше пяти минут.</p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { n: "1", icon: <Key className="h-5 w-5 text-primary" />, title: "Создайте ключ", desc: "Ключи → Добавить ключ", href: "#" },
                { n: "2", icon: <CreditCard className="h-5 w-5 text-primary" />, title: "Пополните баланс", desc: "Кошелёк → FreeKassa / СБП", href: "#" },
                { n: "3", icon: <Code2 className="h-5 w-5 text-primary" />, title: "Отправьте запрос", desc: "Скопируйте пример ниже", href: "#" },
              ].map((s) => (
                <a key={s.n} href={s.href}
                  className="group flex flex-col gap-2.5 rounded-xl border border-border/60 bg-card p-4 hover:border-foreground/20 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border/50">
                      {s.icon}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                  </div>
                </a>
              ))}
            </div>

            {/* Code */}
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Пример кода</span>
                </div>
                <div className="flex gap-1">
                  {(["python", "js"] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                      className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                      )}>
                      {t === "python" ? "Python" : "JS"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <CodeBlock code={tab === "python" ? py : js} lang={tab === "python" ? "python" : "javascript"} />
              </div>
            </div>
          </div>

          {/* Endpoints */}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border/50">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Эндпоинты API</div>
                <div className="text-xs text-muted-foreground">Совместимость с OpenAI SDK</div>
              </div>
            </div>
            <div className="divide-y divide-border/40">
              {[
                { label: "Base URL", path: "/v1" },
                { label: "Chat completions", path: "/v1/chat/completions" },
                { label: "Models", path: "/v1/models" },
                { label: "Embeddings", path: "/v1/embeddings" },
              ].map(({ label, path }) => {
                const full = `${BASE}${path}`;
                const { copied, copy } = useCopy(full);
                return (
                  <div key={path} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                    <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
                    <code className="flex-1 font-mono text-xs text-foreground truncate">{full}</code>
                    <button onClick={copy} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* IDE Clients */}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border/50">
                <span className="text-sm">🖥️</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Клиенты и IDE</div>
                <div className="text-xs text-muted-foreground">OpenAI-совместимый API</div>
              </div>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {clients.map((c) => (
                  <a key={c} href="#"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:border-foreground/20 transition-colors">
                    {c}
                    <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                  </a>
                ))}
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-xs">
                <span className="font-semibold text-foreground">Cursor:</span>
                <span className="text-muted-foreground"> Settings → Models → Base URL → </span>
                <code className="font-mono text-foreground">{BASE}/v1</code>
              </div>
            </div>
          </div>

          {/* Errors */}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border/50">
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Коды ошибок</div>
                <div className="text-xs text-muted-foreground">Частые проблемы и решения</div>
              </div>
            </div>
            <div className="divide-y divide-border/40">
              {errors.map((e) => (
                <div key={e.code} className="flex items-start gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", e.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <code className="font-mono text-xs font-bold text-foreground">{e.code}</code>
                      <span className="text-xs text-muted-foreground">{e.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
