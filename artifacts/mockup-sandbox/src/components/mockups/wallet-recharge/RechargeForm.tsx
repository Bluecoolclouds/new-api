import { useState } from "react";
import { ArrowRight, Gift, Loader2, Receipt, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── helpers ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const QUOTA_PER_DOLLAR = 500_000;
const EXCHANGE_RATE = 90; // rub per usd (for display)

function formatRub(n: number) {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}
function formatCredits(q: number) {
  if (q >= 1_000_000) return `${(q / 1_000_000).toFixed(2)} M`;
  if (q >= 1_000) return `${(q / 1_000).toFixed(1)} K`;
  return q.toString();
}

// ── payment method data ───────────────────────────────────────────────────────

type Method = {
  type: string;
  name: string;
  subtitle: string;
  icon: string;
  minTopup?: number;
};

const METHODS: Method[] = [
  { type: "freekassa", name: "FreeKassa", subtitle: "Карты / СБП", icon: "💳", minTopup: 100 },
  { type: "waffo", name: "Waffo Pay", subtitle: "Электронные кошельки", icon: "⚡", minTopup: 50 },
  { type: "stripe", name: "Stripe", subtitle: "Card / Bank", icon: "🏦", minTopup: 1 },
];

const PRESETS = [100, 300, 500, 1000, 3000, 5000, 10000, 30000];

// ── MethodCard ────────────────────────────────────────────────────────────────

function MethodCard({
  method,
  selected,
  disabled,
  onClick,
}: {
  method: Method;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-all duration-150 min-w-[76px] flex-shrink-0",
        "hover:border-foreground/40 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-foreground bg-foreground/5 ring-1 ring-foreground/20"
          : "border-border bg-background",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60">
        <span className="text-2xl leading-none">{method.icon}</span>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs font-semibold leading-tight">{method.name}</span>
        <span className="text-muted-foreground text-[10px] leading-tight">{method.subtitle}</span>
      </div>
    </button>
  );
}

// ── SummaryRow ────────────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", highlight && "text-green-600 dark:text-green-400")}>
        {value}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function RechargeForm() {
  const [amount, setAmount] = useState(500);
  const [inputVal, setInputVal] = useState("500");
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);

  const minTopup = selectedMethod?.minTopup ?? 50;
  const maxTopup = 50000;

  // Simulate a discount for Waffo (as an example)
  const discountRate = selectedMethod?.type === "waffo" ? 0.85 : 1.0;
  const paymentAmount = discountRate < 1 ? Math.round(amount * discountRate) : amount;
  const bonusPct = discountRate < 1 ? Math.round((1 / discountRate - 1) * 100) : 0;
  const equivalentAmount = discountRate < 1 ? amount : null;

  const totalCredits = Math.round((amount / EXCHANGE_RATE) * QUOTA_PER_DOLLAR);
  const ratePerMillion = totalCredits > 0 && paymentAmount > 0
    ? paymentAmount / (totalCredits / 1_000_000)
    : null;

  const canProceed = !!selectedMethod && amount >= minTopup;

  const handleAmountInput = (val: string) => {
    setInputVal(val);
    const n = parseInt(val) || 0;
    if (n >= 0) setAmount(n);
  };

  const handleSlider = (val: number) => {
    setAmount(val);
    setInputVal(val.toString());
  };

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 pt-8">
      <Card className="w-full max-w-3xl gap-0 overflow-hidden py-0">
        {/* Header */}
        <CardHeader className="border-b px-5 py-4 flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <WalletCards className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Пополнить баланс</CardTitle>
              <CardDescription className="text-xs">Выберите сумму и способ оплаты</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0 mt-0.5">
            <Receipt className="h-4 w-4" />
            История заказов
          </Button>
        </CardHeader>

        <CardContent className="space-y-5 p-5">
          {/* ── Payment Method Cards ──────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Способ оплаты
            </Label>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <MethodCard
                  key={m.type}
                  method={m}
                  selected={selectedMethod?.type === m.type}
                  disabled={false}
                  onClick={() => setSelectedMethod(m)}
                />
              ))}
            </div>
          </div>

          {/* ── Amount + Summary ─────────────────────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
            {/* LEFT */}
            <div className="space-y-3">
              <Label
                htmlFor="topup-amount"
                className="text-muted-foreground text-xs font-medium tracking-wider uppercase"
              >
                Сумма пополнения
              </Label>

              {/* Input */}
              <div className="relative">
                <Input
                  id="topup-amount"
                  type="number"
                  value={inputVal}
                  onChange={(e) => handleAmountInput(e.target.value)}
                  min={minTopup}
                  placeholder={`Минимум ${minTopup}`}
                  className="h-10 pr-8 text-base font-medium"
                />
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                  ₽
                </span>
              </div>

              {/* Slider */}
              <div className="px-0.5">
                <input
                  type="range"
                  min={minTopup}
                  max={maxTopup}
                  step={1}
                  value={Math.min(Math.max(amount, minTopup), maxTopup)}
                  onChange={(e) => handleSlider(parseInt(e.target.value))}
                  className="w-full cursor-pointer accent-foreground"
                  style={{ height: "4px" }}
                />
                <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
                  <span>{minTopup}</span>
                  <span>{maxTopup.toLocaleString()}</span>
                </div>
              </div>

              {/* Preset chips */}
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setAmount(p); setInputVal(p.toString()); }}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      amount === p
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    )}
                  >
                    {p.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT: Summary panel */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase mb-1">
                  Итого
                </p>
                <p className="text-2xl font-bold leading-none">
                  {formatRub(paymentAmount)}
                  <span className="text-base font-normal text-muted-foreground ml-1">₽</span>
                </p>
              </div>

              <div className="border-t pt-2.5 space-y-2">
                {bonusPct > 0 && (
                  <SummaryRow label="Выгода" value={`+${bonusPct}%`} highlight />
                )}
                {equivalentAmount != null && (
                  <SummaryRow
                    label="Без скидки"
                    value={`${formatRub(equivalentAmount)} ₽`}
                  />
                )}
                {ratePerMillion != null && ratePerMillion > 0 && (
                  <SummaryRow
                    label="Курс"
                    value={`${formatRub(ratePerMillion)} ₽ / 1M`}
                  />
                )}
                {totalCredits > 0 && (
                  <SummaryRow
                    label="Всего получите"
                    value={formatCredits(totalCredits)}
                  />
                )}
              </div>

              <Button
                className="w-full gap-2 mt-1"
                disabled={!canProceed}
                onClick={() => alert(`Оплата: ${paymentAmount} ₽ через ${selectedMethod?.name}`)}
              >
                <ArrowRight className="h-4 w-4" />
                Перейти к оплате
              </Button>

              {!selectedMethod && (
                <p className="text-muted-foreground text-center text-[11px]">
                  Выберите способ оплаты выше
                </p>
              )}
            </div>
          </div>

          {/* Bonus banner */}
          {bonusPct > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2">
              <Gift className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <p className="text-xs text-green-700 dark:text-green-400">
                Через Waffo Pay вы экономите{" "}
                <strong>+{bonusPct}%</strong> — платите {formatRub(paymentAmount)} ₽ вместо{" "}
                {formatRub(amount)} ₽
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
