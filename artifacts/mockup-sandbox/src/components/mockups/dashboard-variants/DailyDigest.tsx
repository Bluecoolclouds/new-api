import {
  ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Circle,
  CreditCard, FileText, KeyRound, RadioTower, Sparkles,
  TrendingUp, Wallet, Zap,
} from "lucide-react";

function HealthRing({ pct }: { pct: number }) {
  const r = 28, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#ffffff12" strokeWidth="5" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke="url(#hg)" strokeWidth="5"
        strokeLinecap="round" strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill="white">{pct}%</text>
    </svg>
  );
}

const steps = [
  { label: "Создать API-ключ", sub: "Для вашего приложения или сервиса", done: false, to: "API Keys" },
  { label: "Добавить средства", sub: "Поддерживайте достаточный баланс", done: false, to: "Кошелёк" },
  { label: "Отправить запрос", sub: "Проверьте маршрутизацию в Playground", done: false, to: "Playground" },
];

const actions = [
  { icon: KeyRound, label: "API-ключи", sub: "Создать ключ", grad: "from-violet-500/20 to-violet-600/10", accent: "text-violet-400", border: "border-violet-500/20" },
  { icon: RadioTower, label: "Каналы", sub: "Провайдеры", grad: "from-sky-500/20 to-sky-600/10", accent: "text-sky-400", border: "border-sky-500/20" },
  { icon: FileText, label: "Логи", sub: "Запросы и биллинг", grad: "from-emerald-500/20 to-emerald-600/10", accent: "text-emerald-400", border: "border-emerald-500/20" },
  { icon: BookOpen, label: "Цены", sub: "Тарифы моделей", grad: "from-amber-500/20 to-amber-600/10", accent: "text-amber-400", border: "border-amber-500/20" },
];

const stats = [
  { label: "Баланс", value: "0 $", icon: Wallet, sub: "Остаток на счёте", grad: "from-violet-600 to-indigo-600", light: "bg-violet-500/15" },
  { label: "Расход сегодня", value: "0 $", icon: TrendingUp, sub: "За последние 24 ч", grad: "from-sky-600 to-cyan-600", light: "bg-sky-500/15" },
  { label: "Запросов", value: "0", icon: Zap, sub: "Всего сделано", grad: "from-emerald-600 to-teal-600", light: "bg-emerald-500/15" },
];

export function DailyDigest() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  const hour = now.getHours();
  const greeting = hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";

  return (
    <div className="min-h-screen bg-[#0d0f14] text-slate-200 font-sans">

      {/* ── Hero greeting banner ── */}
      <div className="relative overflow-hidden border-b border-white/6 bg-gradient-to-r from-[#12142a] via-[#0d1020] to-[#0d0f14] px-8 py-5">
        {/* Background glow */}
        <div className="pointer-events-none absolute -left-10 -top-10 size-64 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="pointer-events-none absolute right-20 top-0 size-48 rounded-full bg-sky-600/8 blur-3xl" />

        <div className="relative flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="size-3 text-violet-400" />
              <span className="capitalize">{dateStr}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {greeting}! <span className="bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent">Добро пожаловать</span>
            </h1>
            <p className="text-sm text-slate-400">Ваш API-шлюз готов. Настройте первый ключ чтобы начать.</p>
          </div>

          {/* Health score */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] font-medium tracking-wider uppercase text-slate-500">Здоровье системы</div>
              <div className="text-sm font-semibold text-violet-400">Отлично</div>
            </div>
            <HealthRing pct={92} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-6">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map(({ label, value, icon: Icon, sub, grad, light }) => (
            <div key={label} className="group relative overflow-hidden rounded-2xl border border-white/6 bg-[#131620] p-5">
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${grad} opacity-0 transition-opacity group-hover:opacity-5`} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-medium tracking-wider uppercase text-slate-500">{label}</div>
                  <div className="mt-1.5 text-3xl font-bold tabular-nums text-white">{value}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <ArrowUpRight className="size-3 text-slate-600" />
                    {sub}
                  </div>
                </div>
                <div className={`rounded-xl p-2.5 ${light}`}>
                  <Icon className="size-5 text-white/60" />
                </div>
              </div>
              {/* Mini bar */}
              <div className="mt-4 h-1 w-full rounded-full bg-white/5">
                <div className={`h-1 w-0 rounded-full bg-gradient-to-r ${grad}`} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Middle section ── */}
        <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-4">

          {/* Getting started — roadmap style */}
          <div className="rounded-2xl border border-white/6 bg-[#131620] p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="text-[10px] font-medium tracking-wider uppercase text-slate-500">Начало работы</div>
                <h2 className="mt-0.5 text-base font-semibold text-white">Запустите API-шлюз за несколько минут</h2>
              </div>
              <span className="rounded-full bg-white/5 border border-white/8 px-2.5 py-1 text-[10px] text-slate-400">0 / 3</span>
            </div>

            <div className="flex flex-col gap-0">
              {steps.map((step, i) => (
                <div key={step.label} className="flex gap-3">
                  {/* Connector */}
                  <div className="flex flex-col items-center">
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 ${step.done ? "border-violet-500 bg-violet-500/20" : "border-white/10 bg-white/5"}`}>
                      {step.done
                        ? <CheckCircle2 className="size-4 text-violet-400" />
                        : <span className="text-xs font-bold text-slate-500">{i + 1}</span>}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`w-px flex-1 my-1 ${step.done ? "bg-violet-500/40" : "bg-white/6"}`} style={{ minHeight: 28 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`mb-3 flex-1 rounded-xl border px-4 py-3 transition-colors hover:border-violet-500/30 hover:bg-violet-500/5 cursor-pointer ${step.done ? "border-violet-500/20 bg-violet-500/5" : "border-white/6 bg-white/3"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-sm font-medium ${step.done ? "text-violet-300 line-through" : "text-slate-200"}`}>{step.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{step.sub}</div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-violet-400">
                        {step.to} <ArrowRight className="size-3" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: wallet shortcut + CTA */}
          <div className="flex flex-col gap-4">
            {/* Balance card */}
            <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/15 to-indigo-600/10 p-4">
              <div className="pointer-events-none absolute -right-4 -top-4 size-24 rounded-full bg-violet-500/10 blur-2xl" />
              <div className="relative">
                <CreditCard className="size-5 text-violet-400 mb-2" />
                <div className="text-[10px] font-medium uppercase tracking-wider text-violet-400/70">Остаток</div>
                <div className="text-2xl font-bold text-white mt-1">0 $</div>
                <div className="text-xs text-slate-400 mt-1">Баланс исчерпан</div>
                <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors">
                  <Wallet className="size-3.5" /> Пополнить кошелёк
                </button>
              </div>
            </div>

            {/* Quick signal */}
            <div className="rounded-2xl border border-white/6 bg-[#131620] p-4 flex-1">
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-3">Статус маршрута</div>
              <div className="space-y-2.5">
                {[
                  { label: "Маршрут активен", val: "Текущий домен", ok: true },
                  { label: "Авторизация", val: "Нужен ключ", ok: false },
                  { label: "Модели", val: "Загрузка…", ok: null },
                ].map(({ label, val, ok }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className={`flex items-center gap-1 text-[10px] font-medium ${ok === true ? "text-emerald-400" : ok === false ? "text-amber-400" : "text-slate-500"}`}>
                      <span className={`size-1.5 rounded-full ${ok === true ? "bg-emerald-400" : ok === false ? "bg-amber-400 animate-pulse" : "bg-slate-600"}`} />
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick actions grid ── */}
        <div>
          <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-slate-500">Рекомендуемые действия</div>
          <div className="grid grid-cols-4 gap-3">
            {actions.map(({ icon: Icon, label, sub, grad, accent, border }) => (
              <button key={label} className={`group flex flex-col items-start gap-3 rounded-2xl border ${border} bg-gradient-to-br ${grad} p-4 text-left hover:brightness-110 transition-all`}>
                <div className={`rounded-xl border ${border} bg-black/20 p-2`}>
                  <Icon className={`size-4 ${accent}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">{label}</div>
                  <div className="text-xs text-slate-500">{sub}</div>
                </div>
                <ArrowRight className={`size-3.5 ${accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
