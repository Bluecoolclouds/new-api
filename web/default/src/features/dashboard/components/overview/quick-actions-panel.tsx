import { Link } from '@tanstack/react-router'
import { type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PanelWrapper } from '../ui/panel-wrapper'

interface QuickAction {
  title: string
  description: string
  to: string
  icon: LucideIcon
}

interface QuickActionsPanelProps {
  actions: QuickAction[]
}

function ActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon
  return (
    <Link
      to={action.to}
      className='hover:bg-muted/60 border-border flex flex-col gap-2 rounded-lg border p-3.5 transition-colors'
    >
      <span className='bg-primary/10 flex size-9 items-center justify-center rounded-lg'>
        <Icon className='text-primary size-4' />
      </span>
      <span className='flex flex-col gap-0.5'>
        <span className='text-sm font-medium leading-snug'>{action.title}</span>
        <span className='text-muted-foreground text-xs leading-snug'>
          {action.description}
        </span>
      </span>
    </Link>
  )
}

export function QuickActionsPanel({ actions }: QuickActionsPanelProps) {
  const { t } = useTranslation()
  return (
    <PanelWrapper title={t('Quick Actions')}>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {actions.map((action) => (
          <ActionCard key={action.to} action={action} />
        ))}
      </div>
    </PanelWrapper>
  )
}
