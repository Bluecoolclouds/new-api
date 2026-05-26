import { lazy, Suspense } from 'react'
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
  return (
    <PanelWrapper
      title='Usage Overview'
      description='Spend & requests — last 7 days'
      contentClassName='p-0'
    >
      <div className='p-4 sm:p-5'>
        {loading ? (
          <Skeleton className='h-56 w-full rounded-xl' />
        ) : (
          <Suspense fallback={<Skeleton className='h-56 w-full rounded-xl' />}>
            <LazyModelCharts data={data} defaultChartTab='trend' />
          </Suspense>
        )}
      </div>
    </PanelWrapper>
  )
}
