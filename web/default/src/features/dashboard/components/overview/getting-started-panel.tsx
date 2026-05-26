import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  KeyRound,
  Send,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PanelWrapper } from '../ui/panel-wrapper'

interface Step {
  key: string
  icon: typeof KeyRound
  title: string
  description: string
  to: string
  linkLabel: string
  done?: boolean
}

interface GettingStartedPanelProps {
  hasApiKey?: boolean
  hasBalance?: boolean
  hasRequests?: boolean
}

export function GettingStartedPanel({
  hasApiKey = false,
  hasBalance = false,
  hasRequests = false,
}: GettingStartedPanelProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  const allDone = hasApiKey && hasBalance && hasRequests
  if (allDone) return null

  const steps: Step[] = [
    {
      key: 'api-key',
      icon: KeyRound,
      title: t('Create an API key'),
      description: t('Generate a key to authenticate your requests.'),
      to: '/keys',
      linkLabel: t('Create key'),
      done: hasApiKey,
    },
    {
      key: 'balance',
      icon: CreditCard,
      title: t('Top up balance'),
      description: t('Add credits so your requests are processed.'),
      to: '/wallet',
      linkLabel: t('Add credits'),
      done: hasBalance,
    },
    {
      key: 'request',
      icon: Send,
      title: t('Send your first request'),
      description: t('Try the API with your key using the playground or curl.'),
      to: '/playground',
      linkLabel: t('Open playground'),
      done: hasRequests,
    },
  ]

  const doneCount = steps.filter((s) => s.done).length
  const progress = Math.round((doneCount / steps.length) * 100)

  return (
    <PanelWrapper
      title={t('Getting started')}
      headerActions={
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground text-xs'>
            {doneCount}/{steps.length}
          </span>
          <Button
            variant='ghost'
            size='icon'
            className='size-6'
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? (
              <ChevronDown className='size-3.5' />
            ) : (
              <ChevronUp className='size-3.5' />
            )}
          </Button>
        </div>
      }
    >
      {/* Progress bar */}
      <div className='bg-muted mb-4 h-1 w-full overflow-hidden rounded-full'>
        <div
          className='bg-primary h-1 rounded-full transition-all duration-500'
          style={{ width: `${progress}%` }}
        />
      </div>

      {!collapsed && (
        <div className='flex flex-col gap-3'>
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div
                key={step.key}
                className={cn(
                  'flex items-start gap-3',
                  step.done && 'opacity-50'
                )}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                    step.done
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {step.done ? (
                    <Check className='size-3.5' />
                  ) : (
                    <Icon className='size-3.5' />
                  )}
                </div>

                <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <span
                    className={cn(
                      'text-sm font-medium leading-snug',
                      step.done && 'line-through'
                    )}
                  >
                    {step.title}
                  </span>
                  <span className='text-muted-foreground text-xs leading-snug'>
                    {step.description}
                  </span>
                </div>

                {!step.done && (
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 shrink-0 text-xs'
                    render={<Link to={step.to} />}
                  >
                    {step.linkLabel}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </PanelWrapper>
  )
}
