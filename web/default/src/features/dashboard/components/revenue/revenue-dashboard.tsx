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
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { VChart } from '@visactor/react-vchart'
import { CalendarDays, CreditCard, Receipt, ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '@/lib/format'
import { VCHART_OPTION } from '@/lib/vchart'
import { useThemeCustomization } from '@/context/theme-customization-provider'
import { useTheme } from '@/context/theme-provider'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getTopUpStats } from '@/features/dashboard/api'
import { StatCard } from '../ui/stat-card'
import {
  formatMoney,
  getProviderCurrency,
  getProviderLabel,
  groupByCurrency,
} from './revenue-lib'

type RevenuePeriod = 'daily' | 'monthly'

let themeManagerPromise: Promise<
  (typeof import('@visactor/vchart'))['ThemeManager']
> | null = null

const REVENUE_STATS_DAYS = 30

function getChartColor(): string {
  if (typeof document === 'undefined') return '#f97316'
  const body = window.getComputedStyle(document.body)
  const root = window.getComputedStyle(document.documentElement)
  const raw = (
    body.getPropertyValue('--chart-1') || root.getPropertyValue('--chart-1')
  ).trim()
  return raw || '#f97316'
}

export function RevenueDashboard() {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const { customization } = useThemeCustomization()
  const [themeReady, setThemeReady] = useState(false)
  const [period, setPeriod] = useState<RevenuePeriod>('daily')
  const themeManagerRef = useRef<
    (typeof import('@visactor/vchart'))['ThemeManager'] | null
  >(null)

  useEffect(() => {
    const updateTheme = async () => {
      setThemeReady(false)
      if (!themeManagerPromise) {
        themeManagerPromise = import('@visactor/vchart').then(
          (m) => m.ThemeManager
        )
      }
      const ThemeManager = await themeManagerPromise
      themeManagerRef.current = ThemeManager
      ThemeManager.setCurrentTheme(resolvedTheme === 'dark' ? 'dark' : 'light')
      setThemeReady(true)
    }
    updateTheme()
  }, [resolvedTheme])

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'revenue', 'topup-stats', REVENUE_STATS_DAYS],
    queryFn: async () => {
      const res = await getTopUpStats(REVENUE_STATS_DAYS)
      return res?.data ?? null
    },
    staleTime: 60 * 1000,
  })

  const stats = statsQuery.data
  const loading = statsQuery.isLoading
  const error = statsQuery.isError

  const currencyGroups = useMemo(
    () => groupByCurrency(stats?.by_provider ?? []),
    [stats]
  )

  const chartColor = getChartColor()

  const dailyChartValues = useMemo(
    () =>
      (stats?.daily ?? []).map((d) => ({ date: d.date, count: d.count })),
    [stats]
  )

  const monthlyChartValues = useMemo(
    () =>
      (stats?.monthly ?? []).map((m) => ({ date: m.month, count: m.count })),
    [stats]
  )

  const activeChartValues =
    period === 'monthly' ? monthlyChartValues : dailyChartValues

  const chartSpec = useMemo(
    () => ({
      type: 'bar',
      data: [{ id: 'periodOrders', values: activeChartValues }],
      xField: 'date',
      yField: 'count',
      bar: {
        style: { fill: chartColor, radius: 4 },
      },
      color: [chartColor],
      padding: { top: 16, right: 16, bottom: 8, left: 8 },
      axes: [
        {
          orient: 'left',
          label: { style: { fontSize: 11 } },
          grid: {
            style: { lineDash: [4, 4], stroke: 'rgba(128,128,128,0.15)' },
          },
          domainLine: { visible: false },
          tick: { visible: false },
        },
        {
          orient: 'bottom',
          label: { style: { fontSize: 11 } },
          domainLine: { visible: false },
          tick: { visible: false },
        },
      ],
      tooltip: {
        mark: {
          content: [
            {
              key: t('Orders'),
              value: (datum: Record<string, unknown>) =>
                String(datum.count ?? 0),
            },
          ],
        },
      },
      background: 'transparent',
    }),
    [activeChartValues, chartColor, t]
  )

  const chartKey = [
    period,
    loading ? 'loading' : 'ready',
    activeChartValues.length,
    resolvedTheme,
    customization.preset,
  ].join('-')

  const byProvider = stats?.by_provider ?? []

  return (
    <div className='flex flex-col gap-4'>
      <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-xs'>
        <span>
          {t('Last {{count}} days', { count: REVENUE_STATS_DAYS })}
        </span>
        <span aria-hidden='true'>·</span>
        <span>{t('Successful top-ups only')}</span>
      </div>

      {/* Summary cards: order count + revenue grouped by settlement currency */}
      <div className='bg-card grid gap-3 rounded-2xl border p-4 shadow-xs sm:p-5 md:grid-cols-3'>
        <div className='bg-background/60 rounded-xl border p-3'>
          <StatCard
            title={t('Order Count')}
            value={loading ? '-' : formatNumber(stats?.total_count ?? 0)}
            description={t('Successful top-ups only')}
            icon={ShoppingCart}
            tone='teal'
            loading={loading}
            error={error}
          />
        </div>
        {(loading
          ? [{ currency: 'RUB', money: 0, count: 0 }]
          : currencyGroups.length > 0
            ? currencyGroups
            : [{ currency: '-', money: 0, count: 0 }]
        ).map((group) => (
          <div
            key={group.currency}
            className='bg-background/60 rounded-xl border p-3'
          >
            <StatCard
              title={t('Revenue')}
              value={loading ? '-' : formatMoney(group.money, group.currency)}
              description={`${group.currency} · ${formatNumber(group.count)} ${t('Orders').toLowerCase()}`}
              icon={CreditCard}
              tone='rose'
              loading={loading}
              error={error}
            />
          </div>
        ))}
      </div>

      {/* Orders chart — order count only per period (day/month); money is not
          summed across periods because providers settle in different
          currencies, see table below) */}
      <div className='overflow-hidden rounded-lg border'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 sm:px-5 sm:py-3'>
          <div className='flex items-center gap-2'>
            <Receipt className='text-muted-foreground/60 size-4' />
            <div className='text-sm font-semibold'>
              {period === 'monthly' ? t('Monthly Revenue') : t('Daily Revenue')}
            </div>
          </div>
          <div className='bg-muted/60 inline-flex h-7 overflow-hidden rounded-lg border p-0.5'>
            <button
              type='button'
              onClick={() => setPeriod('daily')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
                period === 'daily'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Receipt className='size-3.5' />
              {t('Daily')}
            </button>
            <button
              type='button'
              onClick={() => setPeriod('monthly')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
                period === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className='size-3.5' />
              {t('Monthly')}
            </button>
          </div>
        </div>
        <div className='h-64 sm:h-72'>
          {loading ? (
            <div className='p-4 sm:p-5'>
              <Skeleton className='h-full w-full rounded-xl' />
            </div>
          ) : !themeReady || activeChartValues.length === 0 ? (
            <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
              {t('No data available')}
            </div>
          ) : (
            <VChart
              key={chartKey}
              spec={{
                ...chartSpec,
                theme: resolvedTheme === 'dark' ? 'dark' : 'light',
                background: 'transparent',
              }}
              option={VCHART_OPTION}
            />
          )}
        </div>
      </div>

      {/* Breakdown by payment provider — kept per-provider because Money is
          stored in each provider's own settlement currency (RUB vs USD),
          so a single blended total would be misleading. */}
      <div className='overflow-hidden rounded-lg border'>
        <div className='flex items-center gap-2 border-b px-3 py-2 sm:px-5 sm:py-3'>
          <CreditCard className='text-muted-foreground/60 size-4' />
          <div className='text-sm font-semibold'>
            {t('Revenue by Payment Provider')}
          </div>
        </div>
        {loading ? (
          <div className='p-4 sm:p-5'>
            <Skeleton className='h-32 w-full' />
          </div>
        ) : byProvider.length === 0 ? (
          <div className='text-muted-foreground flex h-24 items-center justify-center text-sm'>
            {t('No data available')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Payment Method')}</TableHead>
                <TableHead>{t('Orders')}</TableHead>
                <TableHead>{t('Revenue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byProvider.map((p) => {
                const currency = getProviderCurrency(p.provider) ?? '?'
                return (
                  <TableRow key={p.provider}>
                    <TableCell className='font-medium'>
                      {getProviderLabel(p.provider)}
                    </TableCell>
                    <TableCell>{formatNumber(p.count)}</TableCell>
                    <TableCell>{formatMoney(p.money, currency)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
