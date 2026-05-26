/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useState, useEffect, useMemo } from 'react'
import { Gift, ExternalLink, Loader2, Receipt, WalletCards, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import {
  formatCurrency,
  formatQuotaShort,
  getPaymentIcon,
  getMinTopupAmount,
} from '../lib'
import { QUOTA_PER_DOLLAR, DEFAULT_DISCOUNT_RATE } from '../constants'
import type {
  PaymentMethod,
  PresetAmount,
  TopupInfo,
  CreemProduct,
  WaffoPayMethod,
} from '../types'
import { CreemProductsSection } from './creem-products-section'

// ============================================================================
// Method Subtitle Helper
// ============================================================================

function getMethodSubtitle(type: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    alipay: t('Alipay'),
    wxpay: t('WeChat Pay'),
    stripe: t('Card / Bank'),
    freekassa: t('Cards / SBP'),
    waffo: t('Waffo Pay'),
    waffo_pancake: t('Waffo'),
    creem: t('Creem'),
  }
  return map[type] || ''
}

// ============================================================================
// Summary Row Component
// ============================================================================

function SummaryRow({
  label,
  value,
  highlight,
  muted,
}: {
  label: string
  value: string
  highlight?: boolean
  muted?: boolean
}) {
  return (
    <div className='flex items-center justify-between gap-2'>
      <span className={cn('text-sm', muted ? 'text-muted-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-medium',
          highlight && 'text-green-600 dark:text-green-400'
        )}
      >
        {value}
      </span>
    </div>
  )
}

// ============================================================================
// Payment Method Card Component
// ============================================================================

function MethodCard({
  icon,
  name,
  subtitle,
  selected,
  disabled,
  loading,
  onClick,
}: {
  icon: React.ReactNode
  name: string
  subtitle?: string
  selected: boolean
  disabled?: boolean
  loading?: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-all duration-150',
        'hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-foreground/60 bg-foreground/5 dark:bg-foreground/10'
          : 'border-border bg-background',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      <div className={cn(
        'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors',
        selected ? 'bg-foreground/10' : 'bg-muted/60'
      )}>
        {loading ? (
          <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
        ) : (
          <span className='[&>svg]:h-6 [&>svg]:w-6 [&>img]:h-6 [&>img]:w-6'>
            {icon}
          </span>
        )}
      </div>
      <div className='flex flex-col gap-0.5 min-w-0 flex-1'>
        <span className='text-sm font-semibold leading-tight'>{name}</span>
        {subtitle && (
          <span className='text-muted-foreground text-xs leading-tight'>{subtitle}</span>
        )}
      </div>
      {selected && (
        <div className='flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-foreground'>
          <svg className='h-3 w-3 text-background' viewBox='0 0 12 12' fill='none'>
            <path d='M2 6l3 3 5-5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
          </svg>
        </div>
      )}
    </button>
  )
}

// ============================================================================
// Props
// ============================================================================

interface RechargeFormCardProps {
  topupInfo: TopupInfo | null
  presetAmounts: PresetAmount[]
  selectedPreset: number | null
  onSelectPreset: (preset: PresetAmount) => void
  topupAmount: number
  onTopupAmountChange: (amount: number) => void
  paymentAmount: number
  calculating: boolean
  onPaymentMethodSelect: (method: PaymentMethod) => void
  onMethodChange?: (method: PaymentMethod) => void
  paymentLoading: string | null
  redemptionCode: string
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
  topupLink?: string
  loading?: boolean
  priceRatio?: number
  usdExchangeRate?: number
  discountRate?: number
  onOpenBilling?: () => void
  creemProducts?: CreemProduct[]
  enableCreemTopup?: boolean
  onCreemProductSelect?: (product: CreemProduct) => void
  enableWaffoTopup?: boolean
  waffoPayMethods?: WaffoPayMethod[]
  waffoMinTopup?: number
  onWaffoMethodSelect?: (method: WaffoPayMethod, index: number) => void
  enableWaffoPancakeTopup?: boolean
  enableFreeKassaTopup?: boolean
  rawUsdExchangeRate?: number
}

// ============================================================================
// Main Component
// ============================================================================

export function RechargeFormCard({
  topupInfo,
  presetAmounts,
  selectedPreset,
  onSelectPreset,
  topupAmount,
  onTopupAmountChange,
  paymentAmount,
  calculating,
  onPaymentMethodSelect,
  onMethodChange,
  paymentLoading,
  redemptionCode,
  onRedemptionCodeChange,
  onRedeem,
  redeeming,
  topupLink,
  loading,
  priceRatio = 1,
  usdExchangeRate = 1,
  discountRate = DEFAULT_DISCOUNT_RATE,
  onOpenBilling,
  creemProducts,
  enableCreemTopup,
  onCreemProductSelect,
  enableWaffoTopup,
  waffoPayMethods,
  waffoMinTopup,
  onWaffoMethodSelect,
  enableWaffoPancakeTopup,
  enableFreeKassaTopup,
  rawUsdExchangeRate = 1,
}: RechargeFormCardProps) {
  const { t } = useTranslation()

  // Use rawUsdExchangeRate (always the actual RUB rate, even in USD-display mode)
  const rubRate = rawUsdExchangeRate > 1 ? rawUsdExchangeRate : usdExchangeRate

  const [localAmount, setLocalAmount] = useState(topupAmount.toString())
  const [localSelectedMethod, setLocalSelectedMethod] = useState<PaymentMethod | null>(null)
  const [localCurrency, setLocalCurrency] = useState<'rub' | 'usd'>(
    rubRate > 1 ? 'rub' : 'usd'
  )

  const displaySymbol = localCurrency === 'rub' ? '₽' : '$'
  const showCurrencyToggle = rubRate > 1

  const toDisplay = (usdAmount: number) =>
    localCurrency === 'rub' && rubRate > 1 ? Math.round(usdAmount * rubRate) : usdAmount
  const toBase = (displayAmount: number) =>
    localCurrency === 'rub' && rubRate > 1
      ? displayAmount / rubRate
      : displayAmount

  useEffect(() => {
    const display = localCurrency === 'rub' && rubRate > 1
      ? Math.round(topupAmount * rubRate)
      : topupAmount
    setLocalAmount(display.toString())
  }, [topupAmount, localCurrency, rubRate])

  const hasConfigurableTopup =
    topupInfo?.enable_online_topup ||
    topupInfo?.enable_stripe_topup ||
    enableWaffoTopup ||
    enableWaffoPancakeTopup ||
    enableFreeKassaTopup
  const hasAnyTopup = hasConfigurableTopup || enableCreemTopup
  const hasStandardPaymentMethods =
    Array.isArray(topupInfo?.pay_methods) && topupInfo.pay_methods.length > 0
  const hasWaffoPaymentMethods =
    Array.isArray(waffoPayMethods) && waffoPayMethods.length > 0
  const minTopup = getMinTopupAmount(topupInfo)
  const maxTopup = Math.max(minTopup * 200, 10000)
  const redemptionEnabled = topupInfo?.enable_redemption !== false

  // Build unified methods list — only FreeKassa for now
  const allMethodCards = useMemo(() => {
    const methods: { method: PaymentMethod; waffoIndex?: number }[] = []

    if (enableFreeKassaTopup) {
      methods.push({
        method: { type: 'freekassa', name: 'FreeKassa' },
      })
    }

    return methods
  }, [enableFreeKassaTopup])

  const handleAmountChange = (value: string) => {
    setLocalAmount(value)
    const numValue = parseFloat(value) || 0
    if (numValue >= 0) {
      onTopupAmountChange(toBase(numValue))
    }
  }

  const handleSliderChange = (value: number) => {
    setLocalAmount(value.toString())
    onTopupAmountChange(toBase(value))
  }

  const handleCurrencySwitch = (c: 'rub' | 'usd') => {
    setLocalCurrency(c)
    const newDisplayAmt = c === 'rub' && rubRate > 1
      ? Math.round(topupAmount * rubRate)
      : topupAmount
    setLocalAmount(newDisplayAmt.toString())
  }

  const handleMethodCardClick = (method: PaymentMethod, waffoIndex?: number) => {
    setLocalSelectedMethod(method)

    // For waffo sub-methods, trigger directly
    if (waffoIndex !== undefined && onWaffoMethodSelect && waffoPayMethods) {
      onWaffoMethodSelect(waffoPayMethods[waffoIndex], waffoIndex)
      return
    }

    // Notify parent to recalculate (no dialog)
    if (onMethodChange) {
      onMethodChange(method)
    }
  }

  const handleProceedToPayment = () => {
    if (!localSelectedMethod) return
    // This triggers the full payment flow (confirm dialog, etc.)
    onPaymentMethodSelect(localSelectedMethod)
  }

  // ── Summary calculations ───────────────────────────────────────────────
  const bonusPct =
    discountRate < DEFAULT_DISCOUNT_RATE
      ? Math.round((1 / discountRate - 1) * 100)
      : 0

  const equivalentAmount =
    discountRate < DEFAULT_DISCOUNT_RATE && paymentAmount > 0
      ? paymentAmount / discountRate
      : null

  const totalCredits = topupAmount * QUOTA_PER_DOLLAR
  const totalCreditsM = totalCredits / 1_000_000
  const ratePerMillion =
    totalCreditsM > 0 && paymentAmount > 0
      ? paymentAmount / totalCreditsM
      : null

  const canProceed =
    !!localSelectedMethod &&
    topupAmount >= minTopup &&
    !paymentLoading &&
    !calculating

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className='gap-0 overflow-hidden py-0'>
        <CardHeader className='border-b p-3 !pb-3 sm:p-5 sm:!pb-5'>
          <Skeleton className='h-6 w-32' />
          <Skeleton className='mt-2 h-4 w-48' />
        </CardHeader>
        <CardContent className='space-y-4 p-3 sm:space-y-6 sm:p-5'>
          <div className='flex gap-3 overflow-hidden'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className='h-[88px] w-[76px] flex-shrink-0 rounded-xl' />
            ))}
          </div>
          <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]'>
            <div className='space-y-3'>
              <Skeleton className='h-3 w-28' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-4 w-full rounded-full' />
              <div className='grid grid-cols-4 gap-2'>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className='h-8 rounded-lg' />
                ))}
              </div>
            </div>
            <Skeleton className='h-[200px] rounded-xl' />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TitledCard
      title={t('Add Funds')}
      description={t('Choose an amount and payment method')}
      icon={<WalletCards className='h-4 w-4' />}
      action={
        onOpenBilling ? (
          <Button
            variant='outline'
            size='sm'
            onClick={onOpenBilling}
            className='w-full gap-2 sm:w-auto'
          >
            <Receipt className='h-4 w-4' />
            {t('Order History')}
          </Button>
        ) : null
      }
      contentClassName='space-y-4 sm:space-y-5'
    >
      {hasAnyTopup ? (
        <>
          {hasConfigurableTopup && (
            <div className='space-y-5'>

              {/* ── 1. СУММА ПОПОЛНЕНИЯ ──────────────────────────────── */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between gap-2'>
                  <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                    {t('Top Up Amount')}
                  </Label>
                  {/* Currency toggle — inline with label */}
                  {showCurrencyToggle && (
                    <div className='inline-flex rounded-lg border bg-muted/30 p-0.5 gap-0.5'>
                      {(['rub', 'usd'] as const).map((c) => (
                        <button
                          key={c}
                          type='button'
                          onClick={() => handleCurrencySwitch(c)}
                          className={cn(
                            'rounded-md px-3 py-1 text-xs font-medium transition-all',
                            localCurrency === c
                              ? 'bg-background shadow-sm text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {c === 'rub' ? '₽' : '$'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Big amount input */}
                <div className='relative'>
                  <Input
                    id='topup-amount'
                    type='number'
                    value={localAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    min={toDisplay(minTopup)}
                    placeholder={`${t('Minimum')} ${toDisplay(minTopup)}`}
                    className='h-14 pr-12 text-2xl font-bold tabular-nums tracking-tight'
                  />
                  <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-lg font-medium'>
                    {displaySymbol}
                  </span>
                </div>

                {/* Slider */}
                <div className='px-1'>
                  <input
                    type='range'
                    min={toDisplay(minTopup)}
                    max={toDisplay(maxTopup)}
                    step={localCurrency === 'rub' ? Math.round(rubRate) : 1}
                    value={Math.min(
                      Math.max(toDisplay(topupAmount), toDisplay(minTopup)),
                      toDisplay(maxTopup)
                    )}
                    onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                    className='w-full cursor-pointer accent-foreground'
                    style={{ height: '4px' }}
                  />
                  <div className='text-muted-foreground mt-1 flex justify-between text-[10px]'>
                    <span>{toDisplay(minTopup).toLocaleString()}</span>
                    <span>{toDisplay(maxTopup).toLocaleString()}</span>
                  </div>
                </div>

                {/* Preset chips */}
                {presetAmounts.length > 0 && (
                  <div className='flex flex-wrap gap-1.5'>
                    {presetAmounts.slice(0, 8).map((preset) => (
                      <button
                        key={preset.value}
                        type='button'
                        onClick={() => onSelectPreset(preset)}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-sm font-medium transition-all',
                          selectedPreset === preset.value
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                        )}
                      >
                        {toDisplay(preset.value).toLocaleString()}
                        {displaySymbol}
                        {preset.discount && preset.discount < 1 && (
                          <span className='ml-1.5 text-green-600 text-xs'>
                            -{Math.round((1 - preset.discount) * 100)}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 2. СПОСОБ ОПЛАТЫ ─────────────────────────────────── */}
              {allMethodCards.length > 0 && (
                <div className='space-y-2'>
                  <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                    {t('Payment Method')}
                  </Label>
                  <div className='space-y-2'>
                    {allMethodCards.map(({ method, waffoIndex }) => {
                      const methodMin =
                        method.min_topup ||
                        (method.type.startsWith('waffo-') ? waffoMinTopup : 0) ||
                        0
                      const disabled = methodMin > topupAmount
                      const isLoading =
                        paymentLoading === method.type ||
                        (waffoIndex !== undefined &&
                          paymentLoading === `waffo-${waffoIndex}`)
                      return (
                        <MethodCard
                          key={method.type}
                          icon={
                            method.type === 'freekassa' ? (
                              <img
                                src='/images/sbp-logo.svg'
                                alt='СБП'
                                className='h-6 w-6 object-contain'
                              />
                            ) : getPaymentIcon(
                              method.type.startsWith('waffo-') ? 'waffo' : method.type,
                              'h-6 w-6',
                              method.icon,
                              method.name
                            )
                          }
                          name={method.name}
                          subtitle={getMethodSubtitle(
                            method.type.startsWith('waffo-') ? 'waffo' : method.type,
                            t
                          )}
                          selected={localSelectedMethod?.type === method.type}
                          disabled={disabled}
                          loading={isLoading}
                          onClick={() => !disabled && handleMethodCardClick(method, waffoIndex)}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── 3. ИТОГОВАЯ ПАНЕЛЬ ───────────────────────────────── */}
              <div className='rounded-xl border bg-muted/20 overflow-hidden'>
                {/* Строки деталей */}
                <div className='divide-y'>
                  {/* Выгода */}
                  <div className='flex items-center justify-between px-4 py-2.5'>
                    <span className='text-sm text-muted-foreground'>{t('Bonus')}</span>
                    <span className={cn(
                      'text-sm font-medium tabular-nums',
                      bonusPct > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                    )}>
                      {bonusPct > 0 ? `+${bonusPct}%` : '—'}
                    </span>
                  </div>

                  {/* Без скидки */}
                  <div className='flex items-center justify-between px-4 py-2.5'>
                    <span className='text-sm text-muted-foreground'>{t('Without discount')}</span>
                    <span className='text-sm font-medium text-muted-foreground tabular-nums'>
                      {equivalentAmount != null && equivalentAmount > 0
                        ? `${formatCurrency(equivalentAmount)} ${displaySymbol}`
                        : '—'}
                    </span>
                  </div>

                  {/* Курс */}
                  {ratePerMillion != null && ratePerMillion > 0 && (
                    <div className='flex items-center justify-between px-4 py-2.5'>
                      <span className='text-sm text-muted-foreground'>{t('Rate')}</span>
                      <span className='text-sm font-medium text-muted-foreground tabular-nums'>
                        {formatCurrency(ratePerMillion)} / 1M
                      </span>
                    </div>
                  )}

                  {/* Всего получите */}
                  {totalCredits > 0 && (
                    <div className='flex items-center justify-between px-4 py-2.5'>
                      <span className='text-sm text-muted-foreground'>{t('You will receive')}</span>
                      <span className='text-sm font-semibold tabular-nums'>
                        {formatQuotaShort(totalCredits)}
                      </span>
                    </div>
                  )}
                </div>

                {/* К оплате — выделенная строка */}
                <div className='border-t bg-muted/30 px-4 py-3 flex items-center justify-between gap-4'>
                  <div>
                    <p className='text-xs text-muted-foreground'>{t('Total')}</p>
                    {calculating ? (
                      <Skeleton className='mt-1 h-7 w-24' />
                    ) : (
                      <p className='text-xl font-bold tabular-nums leading-none'>
                        {paymentAmount > 0 ? (
                          <>
                            {formatCurrency(paymentAmount)}
                            <span className='ml-1 text-sm font-normal text-muted-foreground'>
                              {displaySymbol}
                            </span>
                          </>
                        ) : '—'}
                      </p>
                    )}
                  </div>
                  <Button
                    className='gap-2 shrink-0'
                    disabled={!canProceed}
                    onClick={handleProceedToPayment}
                  >
                    {paymentLoading && localSelectedMethod?.type === paymentLoading ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <ArrowRight className='h-4 w-4' />
                    )}
                    {t('Proceed to Payment')}
                  </Button>
                </div>

                {!localSelectedMethod && (
                  <p className='text-muted-foreground text-center text-[11px] pb-2'>
                    {t('Select a payment method above')}
                  </p>
                )}
              </div>

            </div>
          )}
        </>
      ) : (
        <Alert>
          <AlertDescription>
            {t(
              'Online topup is not enabled. Please use redemption code or contact administrator.'
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Creem Products Section */}
      {enableCreemTopup &&
        Array.isArray(creemProducts) &&
        creemProducts.length > 0 &&
        onCreemProductSelect && (
          <div className='space-y-2.5 border-t pt-4 sm:space-y-3 sm:pt-5'>
            <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              {t('Creem Payment')}
            </Label>
            <CreemProductsSection
              products={creemProducts}
              onProductSelect={onCreemProductSelect}
            />
          </div>
        )}

      {/* Redemption Code Section */}
      {redemptionEnabled ? (
        <div className='space-y-2.5 border-t pt-4 sm:space-y-3 sm:pt-5'>
          <div className='flex items-center gap-2'>
            <Gift className='text-muted-foreground h-4 w-4' />
            <Label
              htmlFor='redemption-code'
              className='text-muted-foreground text-xs font-medium tracking-wider uppercase'
            >
              {t('Have a Code?')}
            </Label>
          </div>
          <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
            <Input
              id='redemption-code'
              value={redemptionCode}
              onChange={(e) => onRedemptionCodeChange(e.target.value)}
              placeholder={t('Enter your redemption code')}
              className='h-9 min-w-0'
            />
            <Button
              onClick={onRedeem}
              disabled={redeeming}
              variant='outline'
              className='h-9 px-4'
            >
              {redeeming && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {t('Redeem')}
            </Button>
          </div>
          {topupLink && (
            <p className='text-muted-foreground text-xs'>
              {t('Need a redemption code?')}{' '}
              <a
                href={topupLink}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 underline-offset-4 hover:underline'
              >
                {t('Get one here')}
                <ExternalLink className='h-3 w-3' />
              </a>
            </p>
          )}
        </div>
      ) : (
        <Alert className='border-t'>
          <AlertDescription>
            {t(
              'Redemption codes are disabled until the administrator confirms compliance terms.'
            )}
          </AlertDescription>
        </Alert>
      )}
    </TitledCard>
  )
}
