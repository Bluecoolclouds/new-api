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
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  FileText,
  KeyRound,
  RadioTower,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { computeTimeRange } from '@/lib/time'
import { ROLE } from '@/lib/roles'
import { cn } from '@/lib/utils'
import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { getApiKeys } from '@/features/keys/api'
import {
  useDashboardContentVisibility,
} from '../../hooks/use-status-data'
import { AnnouncementsPanel } from './announcements-panel'
import { ApiInfoPanel } from './api-info-panel'
import { ApiKeysMiniPanel } from './api-keys-mini-panel'
import { FAQPanel } from './faq-panel'
import { GettingStartedPanel } from './getting-started-panel'
import { GreetingHeader } from './greeting-header'
import { PerformanceHealthPanel } from './performance-health-panel'
import { QuickActionsPanel } from './quick-actions-panel'
import { RecentActivityPanel } from './recent-activity-panel'
import { SummaryCards } from './summary-cards'
import { UptimePanel } from './uptime-panel'
import { UsageOverviewPanel } from './usage-overview-panel'

type DashboardActionPath =
  | '/keys'
  | '/wallet'
  | '/playground'
  | '/channels'
  | '/usage-logs'
  | '/pricing'

interface QuickAction {
  title: string
  description: string
  to: DashboardActionPath
  icon: typeof KeyRound
  adminOnly?: boolean
}

export function OverviewDashboard() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const {
    apiInfo: showApiInfoPanel,
    announcements: showAnnouncementsPanel,
    faq: showFAQPanel,
    uptimeKuma: showUptimePanel,
  } = useDashboardContentVisibility()
  const isAdmin = Boolean(user?.role && user.role >= ROLE.ADMIN)
  const showContentPanels =
    isAdmin || showApiInfoPanel || showFAQPanel || showUptimePanel

  // ── Quota chart data ──
  const quotaQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'quota-data'],
    queryFn: async () => {
      const range = computeTimeRange(7)
      const res = await getUserQuotaDates(
        {
          start_timestamp: range.start_timestamp,
          end_timestamp: range.end_timestamp,
        },
        false
      )
      return res?.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const quotaData = quotaQuery.data ?? []
  const quotaLoading = quotaQuery.isLoading

  // ── API Keys ──
  const apiKeysQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'api-keys'],
    queryFn: async () => {
      const result = await getApiKeys({ p: 1, size: 10 })
      return result.success ? (result.data?.items ?? []) : []
    },
    staleTime: 60 * 1000,
  })

  // ── Getting started step detection ──
  const hasApiKey = (apiKeysQuery.data?.length ?? 0) > 0
  const hasBalance = (user?.quota ?? 0) > 0
  const hasRequests = quotaData.length > 0

  // ── Quick actions ──
  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        title: t('API Keys'),
        description: t('Create a key for your app or service'),
        to: '/keys',
        icon: KeyRound,
      },
      {
        title: t('Channels'),
        description: t('Configure upstream providers and routing.'),
        to: '/channels',
        icon: RadioTower,
        adminOnly: true,
      },
      {
        title: t('Usage Logs'),
        description: t('Inspect requests, errors, and billing details'),
        to: '/usage-logs',
        icon: FileText,
      },
      {
        title: t('Pricing'),
        description: t('Review model rates before scaling traffic'),
        to: '/pricing',
        icon: BookOpen,
      },
    ],
    [t]
  )

  const visibleQuickActions = useMemo(
    () => quickActions.filter((action) => !action.adminOnly || isAdmin),
    [isAdmin, quickActions]
  )

  return (
    <div className='flex flex-col gap-4'>

      {/* ── Full-width top section ── */}
      <CardStaggerContainer>
        <CardStaggerItem>
          <GreetingHeader />
        </CardStaggerItem>
      </CardStaggerContainer>

      <CardStaggerContainer>
        <CardStaggerItem>
          <SummaryCards />
        </CardStaggerItem>
      </CardStaggerContainer>

      {/* ── Two-column layout: main + sidebar ── */}
      <div className='grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]'>

        {/* ── Main content column ── */}
        <div className='flex flex-col gap-4 min-w-0'>

          {/* 1. Getting started guide (hides when all steps done) */}
          <CardStaggerContainer>
            <CardStaggerItem>
              <GettingStartedPanel
                hasApiKey={hasApiKey}
                hasBalance={hasBalance}
                hasRequests={hasRequests}
              />
            </CardStaggerItem>
          </CardStaggerContainer>

          {/* 2. Usage chart */}
          <CardStaggerContainer>
            <CardStaggerItem>
              <UsageOverviewPanel data={quotaData} loading={quotaLoading} />
            </CardStaggerItem>
          </CardStaggerContainer>

          {/* 3. Quick actions (horizontal grid) */}
          <CardStaggerContainer>
            <CardStaggerItem>
              <QuickActionsPanel actions={visibleQuickActions} />
            </CardStaggerItem>
          </CardStaggerContainer>

          {/* 4. API keys mini table */}
          <CardStaggerContainer>
            <CardStaggerItem>
              <ApiKeysMiniPanel
                keys={apiKeysQuery.data ?? []}
                loading={apiKeysQuery.isLoading}
              />
            </CardStaggerItem>
          </CardStaggerContainer>

          {/* 5. Content panels (info / FAQ / uptime) */}
          {showContentPanels && (
            <CardStaggerContainer
              className={cn('grid grid-cols-1 gap-4', 'sm:grid-cols-2 lg:grid-cols-3')}
            >
              {isAdmin && (
                <CardStaggerItem className='sm:col-span-2 lg:col-span-3'>
                  <PerformanceHealthPanel />
                </CardStaggerItem>
              )}
              {showApiInfoPanel && (
                <CardStaggerItem>
                  <ApiInfoPanel />
                </CardStaggerItem>
              )}
              {showFAQPanel && (
                <CardStaggerItem>
                  <FAQPanel />
                </CardStaggerItem>
              )}
              {showUptimePanel && (
                <CardStaggerItem>
                  <UptimePanel />
                </CardStaggerItem>
              )}
            </CardStaggerContainer>
          )}
        </div>

        {/* ── Right sidebar (22rem) ── */}
        <div className='flex flex-col gap-4'>
          <CardStaggerContainer>
            <CardStaggerItem>
              <RecentActivityPanel />
            </CardStaggerItem>
          </CardStaggerContainer>

          {showAnnouncementsPanel && (
            <CardStaggerContainer>
              <CardStaggerItem>
                <AnnouncementsPanel />
              </CardStaggerItem>
            </CardStaggerContainer>
          )}
        </div>
      </div>
    </div>
  )
}
