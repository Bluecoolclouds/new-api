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
import { PerformanceHealthPanel } from './performance-health-panel'
import { PopularModelsPanel } from './popular-models-panel'
import { QuickActionsSidebar } from './quick-actions-sidebar'
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
  const showLeftContentPanels =
    isAdmin || showApiInfoPanel || showAnnouncementsPanel || showFAQPanel
  const showContentPanels = showLeftContentPanels || showUptimePanel

  // ── Quota chart data (shared by UsageOverview + PopularModels) ──
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
      {/* ── 1. Summary stat cards (full width) ── */}
      <SummaryCards />

      {/* ── 2. Two-column layout: main content + right sidebar ── */}
      <div className='grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]'>

        {/* ── Main content column ── */}
        <div className='flex flex-col gap-4 min-w-0'>

          {/* 2a. Usage chart */}
          <CardStaggerContainer>
            <CardStaggerItem>
              <UsageOverviewPanel data={quotaData} loading={quotaLoading} />
            </CardStaggerItem>
          </CardStaggerContainer>

          {/* 2b. Popular models (top by spend) */}
          <CardStaggerContainer>
            <CardStaggerItem>
              <PopularModelsPanel data={quotaData} loading={quotaLoading} />
            </CardStaggerItem>
          </CardStaggerContainer>

          {/* 2c. API keys mini table */}
          <CardStaggerContainer>
            <CardStaggerItem>
              <ApiKeysMiniPanel
                keys={apiKeysQuery.data ?? []}
                loading={apiKeysQuery.isLoading}
              />
            </CardStaggerItem>
          </CardStaggerContainer>

          {/* 2d. Content panels (info / announcements / FAQ / uptime) */}
          {showContentPanels && (
            <CardStaggerContainer
              className={cn(
                'grid grid-cols-1 gap-4',
                showLeftContentPanels &&
                  showUptimePanel &&
                  'xl:grid-cols-[minmax(0,1fr)_22rem]'
              )}
            >
              {showLeftContentPanels && (
                <div
                  className={cn(
                    'grid min-w-0 grid-cols-1 gap-4',
                    (showApiInfoPanel ||
                      showAnnouncementsPanel ||
                      showFAQPanel) &&
                      'sm:grid-cols-2'
                  )}
                >
                  {isAdmin && (
                    <CardStaggerItem className='sm:col-span-2'>
                      <PerformanceHealthPanel />
                    </CardStaggerItem>
                  )}
                  {showApiInfoPanel && (
                    <CardStaggerItem>
                      <ApiInfoPanel />
                    </CardStaggerItem>
                  )}
                  {showAnnouncementsPanel && (
                    <CardStaggerItem>
                      <AnnouncementsPanel />
                    </CardStaggerItem>
                  )}
                  {showFAQPanel && (
                    <CardStaggerItem>
                      <FAQPanel />
                    </CardStaggerItem>
                  )}
                </div>
              )}
              {showUptimePanel && (
                <CardStaggerItem>
                  <UptimePanel />
                </CardStaggerItem>
              )}
            </CardStaggerContainer>
          )}
        </div>

        {/* ── Right sidebar column ── */}
        <div className='flex flex-col gap-4'>
          <CardStaggerContainer>
            <CardStaggerItem>
              <QuickActionsSidebar actions={visibleQuickActions} />
            </CardStaggerItem>
          </CardStaggerContainer>
          <CardStaggerContainer>
            <CardStaggerItem>
              <RecentActivityPanel />
            </CardStaggerItem>
          </CardStaggerContainer>
        </div>
      </div>
    </div>
  )
}
