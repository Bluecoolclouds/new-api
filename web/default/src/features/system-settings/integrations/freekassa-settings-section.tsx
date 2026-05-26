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
import * as React from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SettingsForm } from '../components/settings-form-layout'
import { SettingsPageActionsPortal } from '../components/settings-page-context'
import { useUpdateOption } from '../hooks/use-update-option'

const freeKassaSchema = z.object({
  FreeKassaMerchantId: z.string().min(1, 'Merchant ID is required'),
  FreeKassaSecretWord1: z.string(),
  FreeKassaSecretWord2: z.string(),
  FreeKassaCurrency: z.string().min(1, 'Currency is required'),
  FreeKassaUnitPrice: z.coerce.number().min(0),
  FreeKassaMinTopUp: z.coerce.number().min(0),
  FreeKassaReturnURL: z.string(),
  FreeKassaPaymentSystemId: z.string(),
})

export type FreeKassaSettingsValues = z.infer<typeof freeKassaSchema>

interface Props {
  defaultValues: FreeKassaSettingsValues
}

export function FreeKassaSettingsSection({ defaultValues }: Props) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const initialRef = React.useRef(defaultValues)
  const defaultsSignature = React.useMemo(
    () => JSON.stringify(defaultValues),
    [defaultValues]
  )

  const form = useForm({
    resolver: zodResolver(freeKassaSchema),
    mode: 'onChange',
    defaultValues,
  })

  const didMountRef = React.useRef(false)
  React.useEffect(() => {
    const parsed = JSON.parse(defaultsSignature) as FreeKassaSettingsValues
    initialRef.current = parsed
    if (didMountRef.current) return
    didMountRef.current = true
    form.reset(parsed)
  }, [defaultsSignature, form])

  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    const valid = await form.trigger()
    if (!valid) return

    const values = form.getValues()
    const initial = initialRef.current
    const updates: { key: string; value: string | number }[] = []

    if (values.FreeKassaMerchantId !== initial.FreeKassaMerchantId) {
      updates.push({ key: 'FreeKassaMerchantId', value: values.FreeKassaMerchantId })
    }
    if (values.FreeKassaSecretWord1 && values.FreeKassaSecretWord1 !== initial.FreeKassaSecretWord1) {
      updates.push({ key: 'FreeKassaSecretWord1', value: values.FreeKassaSecretWord1 })
    }
    if (values.FreeKassaSecretWord2 && values.FreeKassaSecretWord2 !== initial.FreeKassaSecretWord2) {
      updates.push({ key: 'FreeKassaSecretWord2', value: values.FreeKassaSecretWord2 })
    }
    if (values.FreeKassaCurrency !== initial.FreeKassaCurrency) {
      updates.push({ key: 'FreeKassaCurrency', value: values.FreeKassaCurrency })
    }
    if (values.FreeKassaUnitPrice !== initial.FreeKassaUnitPrice) {
      updates.push({ key: 'FreeKassaUnitPrice', value: values.FreeKassaUnitPrice })
    }
    if (values.FreeKassaMinTopUp !== initial.FreeKassaMinTopUp) {
      updates.push({ key: 'FreeKassaMinTopUp', value: values.FreeKassaMinTopUp })
    }
    if (values.FreeKassaReturnURL !== initial.FreeKassaReturnURL) {
      updates.push({ key: 'FreeKassaReturnURL', value: values.FreeKassaReturnURL })
    }
    if (values.FreeKassaPaymentSystemId !== initial.FreeKassaPaymentSystemId) {
      updates.push({ key: 'FreeKassaPaymentSystemId', value: values.FreeKassaPaymentSystemId })
    }

    if (updates.length === 0) {
      toast.info(t('No changes to save'))
      return
    }

    setSaving(true)
    try {
      await Promise.all(
        updates.map(({ key, value }) =>
          updateOption.mutateAsync({ key, value: String(value) })
        )
      )
      initialRef.current = { ...values }
      toast.success(t('FreeKassa settings saved'))
    } catch (_err) {
      toast.error(t('Failed to save FreeKassa settings'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-4 pt-4'>
      <SettingsPageActionsPortal>
        <Button
          type='button'
          size='sm'
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t('Saving...') : t('Save FreeKassa settings')}
        </Button>
      </SettingsPageActionsPortal>

      <div>
        <h3 className='text-lg font-medium'>{t('FreeKassa')}</h3>
        <p className='text-muted-foreground text-sm'>
          {t(
            'Accept payments via FreeKassa — a popular Russian payment aggregator. Configure your merchant credentials to enable RUB top-ups.'
          )}
        </p>
      </div>

      <div className='rounded-md bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100'>
        <p className='mb-2 font-medium'>{t('Webhook Configuration:')}</p>
        <ul className='list-inside list-disc space-y-1'>
          <li>
            {t('Notification URL:')}{' '}
            <code className='rounded bg-blue-100 px-1 py-0.5 text-xs dark:bg-blue-900'>
              {'<ServerAddress>/api/freekassa/notify'}
            </code>
          </li>
          <li>
            {t('Set this URL in your FreeKassa merchant dashboard under «Технические настройки».')}
          </li>
          <li>
            {t('Configure at:')}{' '}
            <a
              href='https://www.freekassa.net/merchantca/settings'
              target='_blank'
              rel='noreferrer'
              className='underline hover:no-underline'
            >
              {t('FreeKassa Dashboard')}
            </a>
          </li>
        </ul>
      </div>

      <Form {...form}>
        <SettingsForm
          onSubmit={(e) => e.preventDefault()}
          className='gap-y-4'
          data-no-autosubmit='true'
        >
          <FormField
            control={form.control}
            name='FreeKassaMerchantId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Merchant ID')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder='12345'
                    autoComplete='off'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='FreeKassaSecretWord1'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Secret Word 1 (for payment URL signing)')}</FormLabel>
                <FormControl>
                  <Input
                    type='password'
                    placeholder={t('Leave blank to keep existing')}
                    autoComplete='new-password'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='FreeKassaSecretWord2'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Secret Word 2 (for notification verification)')}</FormLabel>
                <FormControl>
                  <Input
                    type='password'
                    placeholder={t('Leave blank to keep existing')}
                    autoComplete='new-password'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='FreeKassaCurrency'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Currency')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder='RUB'
                    autoComplete='off'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='FreeKassaUnitPrice'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Unit Price (currency per $1 quota)')}</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    min={0}
                    step='0.01'
                    placeholder='90'
                    {...field}
                  />
                </FormControl>
                <p className='text-muted-foreground text-xs'>
                  {t('How much currency the user pays per $1 of quota. E.g. 90 means ₽90 = $1 quota.')}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='FreeKassaMinTopUp'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Minimum Top-up Amount (in quota dollars)')}</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    min={0}
                    step='1'
                    placeholder='1'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='FreeKassaReturnURL'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Return URL (result page after payment)')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder='https://your-site.com/wallet/freekassa/result'
                    autoComplete='off'
                    {...field}
                  />
                </FormControl>
                <p className='text-muted-foreground text-xs'>
                  {t(
                    'Users will be redirected here after payment. Set to your site\'s /wallet/freekassa/result page. FreeKassa will append ?status=success or ?status=failed.'
                  )}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='FreeKassaPaymentSystemId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Payment System ID (parameter «i»)')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder='44'
                    autoComplete='off'
                    {...field}
                  />
                </FormControl>
                <p className='text-muted-foreground text-xs'>
                  {t('FreeKassa payment method ID passed as the «i» parameter. Default: 44.')}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsForm>
      </Form>
    </div>
  )
}
