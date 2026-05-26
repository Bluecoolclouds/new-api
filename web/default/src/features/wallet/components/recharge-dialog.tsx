import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  useTopupInfo,
  usePayment,
  useRedemption,
  useCreemPayment,
  useWaffoPayment,
  useWaffoPancakePayment,
} from '../hooks'
import { getDefaultPaymentType, getMinTopupAmount, isWaffoPancakePayment } from '../lib'
import { DEFAULT_DISCOUNT_RATE } from '../constants'
import type { PaymentMethod, PresetAmount, CreemProduct } from '../types'
import { RechargeFormCard } from './recharge-form-card'
import { PaymentConfirmDialog } from './dialogs/payment-confirm-dialog'
import { BillingHistoryDialog } from './dialogs/billing-history-dialog'
import { CreemConfirmDialog } from './dialogs/creem-confirm-dialog'

function RechargeContent() {
  const { status } = useStatus()
  const { currency } = useSystemConfig()
  const { topupInfo, presetAmounts, loading: topupLoading } = useTopupInfo()

  const effectiveUsdExchangeRate =
    currency?.quotaDisplayType === 'USD' ? 1 : currency?.usdExchangeRate || 1

  const {
    amount: paymentAmount,
    calculating,
    processing,
    calculatePaymentAmount,
    processPayment,
  } = usePayment()
  const { redeeming, redeemCode } = useRedemption()
  const { processing: creemProcessing, processCreemPayment } = useCreemPayment()
  const { processWaffoPayment } = useWaffoPayment()
  const { processing: pancakeProcessing, processWaffoPancakePayment } = useWaffoPancakePayment()

  const [topupAmount, setTopupAmount] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>()
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [redemptionCode, setRedemptionCode] = useState('')
  const [creemDialogOpen, setCreemDialogOpen] = useState(false)
  const [selectedCreemProduct, setSelectedCreemProduct] = useState<CreemProduct | null>(null)

  useEffect(() => {
    if (topupInfo && topupAmount === 0) {
      const minTopup = getMinTopupAmount(topupInfo)
      setTopupAmount(minTopup)
      const defaultPaymentType = getDefaultPaymentType(topupInfo)
      calculatePaymentAmount(minTopup, defaultPaymentType)
    }
  }, [topupInfo, topupAmount, calculatePaymentAmount])

  const getCurrentPaymentType = useCallback(
    () => selectedPaymentMethod?.type || getDefaultPaymentType(topupInfo),
    [selectedPaymentMethod, topupInfo]
  )

  const handleSelectPreset = (preset: PresetAmount) => {
    setTopupAmount(preset.value)
    setSelectedPreset(preset.value)
    calculatePaymentAmount(preset.value, getCurrentPaymentType())
  }

  const amountDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTopupAmountChange = useCallback(
    (amount: number) => {
      setTopupAmount(amount)
      setSelectedPreset(null)
      if (amountDebounceRef.current) clearTimeout(amountDebounceRef.current)
      amountDebounceRef.current = setTimeout(() => {
        calculatePaymentAmount(amount, getCurrentPaymentType())
      }, 400)
    },
    [calculatePaymentAmount, getCurrentPaymentType]
  )

  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    setSelectedPaymentMethod(method)
    setPaymentLoading(method.type)
    try {
      const minTopup = getMinTopupAmount(topupInfo)
      if (topupAmount < minTopup) return
      await calculatePaymentAmount(topupAmount, method.type)
      setConfirmDialogOpen(true)
    } finally {
      setPaymentLoading(null)
    }
  }

  const handlePaymentConfirm = async () => {
    if (!selectedPaymentMethod) return
    const isPancake = isWaffoPancakePayment(selectedPaymentMethod.type)
    const success = isPancake
      ? await processWaffoPancakePayment(topupAmount)
      : await processPayment(topupAmount, selectedPaymentMethod.type)
    if (success) setConfirmDialogOpen(false)
  }

  const handleRedeem = async () => {
    if (!redemptionCode) return
    const success = await redeemCode(redemptionCode)
    if (success) setRedemptionCode('')
  }

  const handleCreemProductSelect = (product: CreemProduct) => {
    setSelectedCreemProduct(product)
    setCreemDialogOpen(true)
  }

  const handleCreemConfirm = async () => {
    if (!selectedCreemProduct) return
    const success = await processCreemPayment(selectedCreemProduct.productId)
    if (success) {
      setCreemDialogOpen(false)
      setSelectedCreemProduct(null)
    }
  }

  const handleWaffoMethodSelect = async (_method: unknown, index: number) => {
    const loadingKey = `waffo-${index}`
    setPaymentLoading(loadingKey)
    try {
      await processWaffoPayment(topupAmount, index)
    } finally {
      setPaymentLoading(null)
    }
  }

  const getDiscountRate = useCallback(
    () => topupInfo?.discount?.[topupAmount] || DEFAULT_DISCOUNT_RATE,
    [topupInfo, topupAmount]
  )

  const handleMethodChange = useCallback(
    async (method: PaymentMethod) => {
      setSelectedPaymentMethod(method)
      await calculatePaymentAmount(topupAmount, method.type)
    },
    [topupAmount, calculatePaymentAmount]
  )

  return (
    <>
      <RechargeFormCard
        topupInfo={topupInfo}
        presetAmounts={presetAmounts}
        selectedPreset={selectedPreset}
        onSelectPreset={handleSelectPreset}
        topupAmount={topupAmount}
        onTopupAmountChange={handleTopupAmountChange}
        paymentAmount={paymentAmount}
        calculating={calculating}
        onPaymentMethodSelect={handlePaymentMethodSelect}
        paymentLoading={paymentLoading}
        redemptionCode={redemptionCode}
        onRedemptionCodeChange={setRedemptionCode}
        onRedeem={handleRedeem}
        redeeming={redeeming}
        topupLink={topupInfo?.topup_link}
        loading={topupLoading}
        priceRatio={(status?.price as number) || 1}
        usdExchangeRate={effectiveUsdExchangeRate}
        rawUsdExchangeRate={
          (currency?.customCurrencyExchangeRate ?? 0) > 1
            ? currency!.customCurrencyExchangeRate!
            : currency?.usdExchangeRate || 1
        }
        onOpenBilling={() => setBillingDialogOpen(true)}
        creemProducts={topupInfo?.creem_products}
        enableCreemTopup={topupInfo?.enable_creem_topup}
        onCreemProductSelect={handleCreemProductSelect}
        enableWaffoTopup={topupInfo?.enable_waffo_topup}
        waffoPayMethods={topupInfo?.waffo_pay_methods}
        waffoMinTopup={topupInfo?.waffo_min_topup}
        onWaffoMethodSelect={handleWaffoMethodSelect}
        enableWaffoPancakeTopup={topupInfo?.enable_waffo_pancake_topup}
        enableFreeKassaTopup={topupInfo?.enable_freekassa_topup}
        freekassaCardEnabled={topupInfo?.freekassa_card_enabled}
        freekassaCryptoEnabled={topupInfo?.freekassa_crypto_enabled}
        freekassaUnitPrice={topupInfo?.freekassa_unit_price}
        freekassaCbrRate={topupInfo?.freekassa_cbr_rate}
        onMethodChange={handleMethodChange}
        discountRate={getDiscountRate()}
      />

      <PaymentConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handlePaymentConfirm}
        topupAmount={topupAmount}
        paymentAmount={paymentAmount}
        paymentMethod={selectedPaymentMethod}
        calculating={calculating}
        processing={processing || pancakeProcessing}
        discountRate={getDiscountRate()}
        usdExchangeRate={effectiveUsdExchangeRate}
      />

      <BillingHistoryDialog
        open={billingDialogOpen}
        onOpenChange={setBillingDialogOpen}
      />

      <CreemConfirmDialog
        open={creemDialogOpen}
        onOpenChange={setCreemDialogOpen}
        onConfirm={handleCreemConfirm}
        product={selectedCreemProduct}
        processing={creemProcessing}
      />
    </>
  )
}

export function RechargeDialog(props: { triggerClassName?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size='sm' className={props.triggerClassName}>
            <Plus className='size-3.5' aria-hidden='true' />
            {t('Top Up')}
          </Button>
        }
      />
      <SheetContent className='flex flex-col overflow-y-auto sm:max-w-lg'>
        <SheetHeader className='shrink-0'>
          <SheetTitle>{t('Add Funds')}</SheetTitle>
        </SheetHeader>
        <div className='flex-1 overflow-y-auto py-2'>
          {open && <RechargeContent />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
