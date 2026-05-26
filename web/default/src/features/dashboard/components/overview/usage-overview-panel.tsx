import { lazy, Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { PanelWrapper } from '../ui/panel-wrapper'

const LazyModelCharts = lazy(() =>
  import('../models/model-charts').then((m) => ({ default: m.ModelCharts }))
)

interface UsageOverviewPanelProps {
  data: QuotaDataItem[]
  loading?: boolean
}

export function UsageOverviewPanel({ data, loading }: UsageOverviewPanelProps) {
  const { t } = useTranslation()

  const { totalSpend, totalRequests } = useMemo(() => {
    let spend = 0
    let requests = 0
    for (const item of data) {
      spend += item.quota ?? 0
      requests += item.count ?? 0
    }
    return { totalSpend: spend, totalRequests: requests }
  }, [data])

  return (
    <PanelWrapper
      title={t('Usage Overview')}
      description={t('Spend & requests — last 7 days')}
      contentClassName='p-0'
    >
      <div className='grid grid-cols-2 divide-x border-b'>
        <div className='px-4 py-3 sm:px-5'>
          <div className='text-xl font-semibold tabular-nums'>
            {loading ? <Skeleton className='h-7 w-24' /> : formatQuota(totalSpend)}
          </div>
          <div className='text-muted-foreground mt-0.5 text-xs'>{t('Total spend')}</div>
        </div>
        <div className='px-4 py-3 sm:px-5'>
          <div className='text-xl font-semibold tabular-nums'>
            {loading ? <Skeleton className='h-7 w-16' /> : totalRequests.toLocaleString()}
          </div>
          <div className='text-muted-foreground mt-0.5 text-xs'>{t('Total requests')}</div>
        </div>
      </div>

      {loading ? (
        <div className='p-4 sm:p-5'>
          <Skeleton className='h-56 w-full rounded-xl' />
        </div>
      ) : (
        <Suspense fallback={<div className='p-4 sm:p-5'><Skeleton className='h-56 w-full rounded-xl' /></div>}>
          <LazyModelCharts
            data={data}
            defaultChartTab='trend'
            className='overflow-hidden'
          />
        </Suspense>
      )}
    </PanelWrapper>
  )
}
