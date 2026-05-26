import {
  Activity, AlertCircle, ArrowRight, BarChart3, BookOpen, CheckCircle2,
  Circle, CreditCard, FileText, KeyRound, Layers, RadioTower, Settings,
  ShieldCheck, Terminal, TrendingUp, Zap,
} from "lucide-react";

const MOCK = {
  balance: "0.00 $",
  usage: "0.00 $",
  requests: "0",
  latency: "—",
  successRate: "—",
  steps: [
    { label: "Создать API-ключ", done: false },
    { label: "Пополнить баланс", done: false },
    { label: "Отправить запрос", done: false },
  ],
  actions: [
    { icon: KeyRound, label: "API-ключи", sub: "Управление доступом" },
    { icon: FileText, label: "Логи запросов", sub: "Отладка и аудит" },
    { icon: BookOpen, label: "Цены", sub: "Тарифы моделей" },
    { icon: RadioTower, label: "Каналы", sub: "Провайдеры" },
  ],
  metrics: [
    { label: "Баланс", value: "0 $", icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Расход сегодня", value: "0 $", icon: TrendingUp, color: "text-sky-400", bg: "bg-sky-500/10" },
    { label: "Запросов / 24ч", value: "0", icon: Activity, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Успешных", value: "—", icon: CheckCircle2, color: "text-amber-400", bg: "bg-amber-500/10" },
  ],
};

function Sparkline({ color }: { color: string }) {
  const pts = [30, 45, 20, 60, 40, 55, 35, 50].map((y, i) => `${i * 14},${60 - y}`).join(" ");
  return (
    <svg viewBox="0 0 98 60" className="h-8 w-full opacity-60" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function CommandCenter() {
  return (
    <div className="min-h-screen bg-[#0d0f14] text-slate-200 font-sans flex flex-col">

      {/* ── Top status bar ── */}
      <div className="border-b border-white/5 bg-[#111318] px-5 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="size-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Layers className="size-3 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">APINET</span>
          </div>
          <span className="text-white/10">|</span>
          <span className="text-xs text-slate-400 font-mono">Обзор</span>
        </div>

        {/* Live status pills */}
        <div className="flex items-center gap-2">
          {[
            { dot: "bg-emerald-400", label: "Система ОК" },
            { dot: "bg-sky-400", label: "Задержка: —" },
            { dot: "bg-violet-400", label: "Баланс: 0 $" },
          ].map(({ dot, label }) => (
            <span key={label} className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-2.5 py-0.5 text-[11px] text-slate-300">
              <span className={`size-1.5 rounded-full ${dot} animate-pulse`} />
              {label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-white/8 bg-white/5 p-1.5 text-slate-400 hover:text-slate-200 transition-colors">
            <Settings className="size-3.5" />
          </button>
          <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">П</div>
        </div>
      </div>

      {/* ── Main body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left nav strip */}
        <nav className="flex w-12 flex-col items-center gap-1 border-r border-white/5 bg-[#111318] py-3">
          {[
            { icon: BarChart3, active: true },
            { icon: KeyRound, active: false },
            { icon: CreditCard, active: false },
            { icon: FileText, active: false },
            { icon: Activity, active: false },
          ].map(({ icon: Icon, active }, i) => (
            <button
              key={i}
              className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
                active ? "bg-violet-500/20 text-violet-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-3 overflow-auto p-4">

          {/* ── Metric tiles ── */}
          <div className="grid grid-cols-4 gap-3">
            {MOCK.metrics.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-xl border border-white/6 bg-[#151820] p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-medium tracking-wider uppercase text-slate-500">{label}</div>
                    <div className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</div>
                  </div>
                  <div className={`rounded-lg p-1.5 ${bg}`}>
                    <Icon className={`size-3.5 ${color}`} />
                  </div>
                </div>
                <Sparkline color={color.replace("text-", "").replace("-400", "")} />
              </div>
            ))}
          </div>

          {/* ── Middle row ── */}
          <div className="grid flex-1 grid-cols-[minmax(0,1fr)_320px] gap-3">

            {/* Left: setup + code terminal */}
            <div className="rounded-xl border border-white/6 bg-[#151820] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <div>
                  <div className="text-[10px] font-medium tracking-wider uppercase text-slate-500">Начало работы</div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5">Запустите первый запрос</div>
                </div>
                <span className="rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">0/3</span>
              </div>

              <div className="flex flex-1 gap-0">
                {/* Steps */}
                <div className="flex w-48 shrink-0 flex-col gap-0 border-r border-white/5 p-3">
                  {MOCK.steps.map((s, i) => (
                    <div key={s.label} className="flex items-start gap-2 py-2">
                      <div className="relative flex flex-col items-center">
                        <div className={`size-5 rounded-full border-2 flex items-center justify-center ${s.done ? "border-emerald-500 bg-emerald-500/20" : "border-white/15 bg-white/5"}`}>
                          {s.done ? <CheckCircle2 className="size-3 text-emerald-400" /> : <Circle className="size-3 text-slate-600" />}
                        </div>
                        {i < MOCK.steps.length - 1 && <div className="mt-1 h-7 w-px bg-white/8" />}
                      </div>
                      <span className={`mt-0.5 text-xs ${s.done ? "text-emerald-400" : "text-slate-400"}`}>{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Code preview */}
                <div className="flex-1 p-4 font-mono">
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-red-500/70" />
                    <span className="size-2 rounded-full bg-amber-500/70" />
                    <span className="size-2 rounded-full bg-emerald-500/70" />
                    <span className="ml-2 text-[10px] text-slate-500">first-request.sh</span>
                  </div>
                  <div className="space-y-0.5 text-[11px] leading-5">
                    <div><span className="text-sky-400">curl</span> <span className="text-slate-300">/v1/chat/completions \</span></div>
                    <div className="pl-2"><span className="text-slate-500">-H</span> <span className="text-amber-300">"Content-Type: application/json"</span> <span className="text-slate-300">\</span></div>
                    <div className="pl-2"><span className="text-slate-500">-H</span> <span className="text-amber-300">"Authorization: Bearer sk-..."</span> <span className="text-slate-300">\</span></div>
                    <div className="pl-2"><span className="text-slate-500">-d</span> <span className="text-emerald-300">'&#123;"model":"gpt-4o-mini",</span></div>
                    <div className="pl-4"><span className="text-emerald-300">"messages":[&#123;"role":"user",</span></div>
                    <div className="pl-6"><span className="text-emerald-300">"content":"Hello!"&#125;]&#125;'</span></div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 transition-colors">
                      <Terminal className="size-3" /> Создать ключ
                    </button>
                    <button className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/8 transition-colors">
                      Скопировать
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: quick actions */}
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-white/6 bg-[#151820] p-3">
                <div className="mb-2 text-[10px] font-medium tracking-wider uppercase text-slate-500">Рекомендуемые действия</div>
                <div className="space-y-1">
                  {MOCK.actions.map(({ icon: Icon, label, sub }) => (
                    <button key={label} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5 transition-colors group">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/5 group-hover:bg-violet-500/15 transition-colors">
                        <Icon className="size-3.5 text-slate-400 group-hover:text-violet-400 transition-colors" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-200">{label}</div>
                        <div className="text-[10px] text-slate-500 truncate">{sub}</div>
                      </div>
                      <ArrowRight className="size-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/6 bg-[#151820] p-3 flex-1">
                <div className="mb-2 text-[10px] font-medium tracking-wider uppercase text-slate-500">Статус системы</div>
                <div className="space-y-2">
                  {[
                    { label: "API Gateway", status: "ОК", ok: true },
                    { label: "База данных", status: "ОК", ok: true },
                    { label: "Провайдеры", status: "Не настроено", ok: false },
                  ].map(({ label, status, ok }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{label}</span>
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${ok ? "text-emerald-400" : "text-amber-400"}`}>
                        <span className={`size-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`} />
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom info row ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { title: "Информация об API", icon: RadioTower, items: ["BASE URL: текущий домен", "Задержка: —", "Версия: v1"] },
              { title: "Объявления", icon: AlertCircle, items: ["Новых объявлений нет", "", ""] },
              { title: "Производительность", icon: Zap, items: ["Успешных запросов: —", "Средняя задержка: —", "Throughput: —"] },
            ].map(({ title, icon: Icon, items }) => (
              <div key={title} className="rounded-xl border border-white/6 bg-[#151820] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="size-3.5 text-slate-500" />
                  <div className="text-[10px] font-medium tracking-wider uppercase text-slate-500">{title}</div>
                </div>
                <div className="space-y-1">
                  {items.filter(Boolean).map((item) => (
                    <div key={item} className="text-xs text-slate-400">{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
