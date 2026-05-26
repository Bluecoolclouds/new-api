import { Link } from '@tanstack/react-router'
import { Copy, ExternalLink, KeyRound, MoreHorizontal, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ApiKey } from '@/features/keys/types'
import { PanelWrapper } from '../ui/panel-wrapper'

function formatKeyExcerpt(key?: string): string {
  if (!key) return 'sk-...'
  if (key.length <= 14) return key
  return `${key.slice(0, 7)}...${key.slice(-4)}`
}

function formatBudget(key: ApiKey): { remaining: string; total: string } {
  if (key.unlimited_quota) return { remaining: '∞', total: '∞' }
  const total = (key.remain_quota ?? 0) + (key.used_quota ?? 0)
  return {
    remaining: formatQuota(key.remain_quota ?? 0),
    total: formatQuota(total),
  }
}

function StatusDot({ status }: { status: number }) {
  if (status === 1) {
    return <span className='bg-success size-1.5 rounded-full shrink-0' />
  }
  return <span className='bg-destructive size-1.5 rounded-full shrink-0' />
}

function KeyRowMenu({ apiKey }: { apiKey: ApiKey }) {
  const { t } = useTranslation()

  const handleCopyKey = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (apiKey.key) await copyToClipboard(apiKey.key)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='size-7 shrink-0 rounded-lg'
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <MoreHorizontal className='size-3.5' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-40'>
        <DropdownMenuItem onClick={handleCopyKey}>
          <Copy className='size-3.5' />
          {t('Copy key')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to='/keys'>
            <ExternalLink className='size-3.5' />
            {t('All keys')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ApiKeysMiniPanelProps {
  keys: ApiKey[]
  loading?: boolean
}

export function ApiKeysMiniPanel({ keys, loading }: ApiKeysMiniPanelProps) {
  const { t } = useTranslation()
  const displayKeys = keys.slice(0, 5)

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
            {t('View all')}
          </Button>
          <Button
            size='sm'
            variant='outline'
            className='h-7 gap-1 px-2 text-xs'
            render={<Link to='/keys' />}
          >
            <Plus className='size-3' />
            {t('New')}
          </Button>
        </div>
      }
    >
      {/* Table header */}
      <div className='text-muted-foreground border-b px-4 py-1.5 sm:px-5'>
        <div className='grid items-center gap-3 text-[10px] font-medium uppercase tracking-wider'
          style={{ gridTemplateColumns: 'minmax(0,1fr) 10rem 6rem 7rem 2rem' }}
        >
          <span>{t('Name')}</span>
          <span>{t('Budget')}</span>
          <span>{t('Group')}</span>
          <span>{t('Key')}</span>
          <span />
        </div>
      </div>

      <div className='divide-y'>
        {displayKeys.map((key) => {
          const budget = formatBudget(key)
          return (
            <Link
              key={key.id}
              to='/keys'
              className='hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5 transition-colors sm:px-5'
            >
              <div
                className='grid w-full items-center gap-3'
                style={{ gridTemplateColumns: 'minmax(0,1fr) 10rem 6rem 7rem 2rem' }}
              >
                {/* Name + status dot */}
                <span className='flex min-w-0 items-center gap-2'>
                  <span className='bg-muted flex size-6 shrink-0 items-center justify-center rounded-md'>
                    <KeyRound className='size-3' />
                  </span>
                  <span className='flex min-w-0 items-center gap-1.5'>
                    <StatusDot status={key.status ?? 0} />
                    <span className='truncate text-xs font-medium'>
                      {key.name || t('Unnamed key')}
                    </span>
                  </span>
                </span>

                {/* Budget remaining / total */}
                <span className='flex min-w-0 flex-col gap-0'>
                  <span className='text-xs font-medium tabular-nums'>
                    {budget.remaining}
                  </span>
                  {!key.unlimited_quota && (
                    <span className='text-muted-foreground text-[10px] tabular-nums'>
                      / {budget.total}
                    </span>
                  )}
                </span>

                {/* Group */}
                <span className='min-w-0'>
                  {key.group ? (
                    <Badge
                      variant='secondary'
                      className='max-w-full truncate px-1.5 py-0 text-[10px]'
                    >
                      {key.group}
                    </Badge>
                  ) : (
                    <span className='text-muted-foreground text-[10px]'>—</span>
                  )}
                </span>

                {/* Key excerpt */}
                <span className='text-muted-foreground min-w-0 truncate font-mono text-[10px]'>
                  {formatKeyExcerpt(key.key)}
                </span>

                {/* 3-dots menu */}
                <span onClick={(e) => e.preventDefault()}>
                  <KeyRowMenu apiKey={key} />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </PanelWrapper>
  )
}
