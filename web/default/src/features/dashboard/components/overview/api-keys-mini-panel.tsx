import { Link } from '@tanstack/react-router'
import { KeyRound, MoreHorizontal, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ApiKey } from '@/features/keys/types'
import { PanelWrapper } from '../ui/panel-wrapper'

function formatKeyExcerpt(key?: string): string {
  if (!key) return 'sk-...'
  if (key.length <= 14) return key
  return `${key.slice(0, 7)}...${key.slice(-4)}`
}

interface ApiKeysMiniPanelProps {
  keys: ApiKey[]
  loading?: boolean
}

function StatusBadge({ status }: { status: number }) {
  if (status === 1) {
    return (
      <Badge className='border-success/30 bg-success/10 text-success px-2 py-0 text-[10px]'>
        Active
      </Badge>
    )
  }
  return (
    <Badge variant='destructive' className='px-2 py-0 text-[10px]'>
      Disabled
    </Badge>
  )
}

export function ApiKeysMiniPanel({ keys, loading }: ApiKeysMiniPanelProps) {
  const { t } = useTranslation()
  const displayKeys = keys.slice(0, 4)

  return (
    <PanelWrapper
      title={t('Your API Keys')}
      loading={loading}
      empty={!loading && keys.length === 0}
      emptyMessage={t('No API keys yet')}
      height='h-28'
      contentClassName='p-0'
      headerActions={
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 px-2 text-xs'
            render={<Link to='/keys' />}
          >
            View all keys
          </Button>
          <Button
            size='sm'
            variant='outline'
            className='h-7 gap-1 px-2 text-xs'
            render={<Link to='/keys' />}
          >
            <Plus className='size-3' />
            New
          </Button>
        </div>
      }
    >
      <div className='divide-y'>
        {displayKeys.map((key) => (
          <div
            key={key.id}
            className='hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5 sm:px-5'
          >
            <span className='bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg'>
              <KeyRound className='size-3.5' />
            </span>
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-xs font-medium'>
                {key.name}
              </span>
              <span className='text-muted-foreground font-mono text-[10px]'>
                {formatKeyExcerpt(key.key)}
              </span>
            </span>
            <StatusBadge status={key.status ?? 0} />
            <Button
              variant='ghost'
              size='icon'
              className='size-7 shrink-0 rounded-lg'
            >
              <MoreHorizontal className='size-3.5' />
            </Button>
          </div>
        ))}
      </div>
    </PanelWrapper>
  )
}
