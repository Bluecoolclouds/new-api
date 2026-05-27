import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useSystemConfig } from '@/hooks/use-system-config'
import { Skeleton } from '@/components/ui/skeleton'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()

  return (
    <div className='relative grid h-svh max-w-none md:grid-cols-2'>
      {/* ── Left column: form ── */}
      <div className='relative flex flex-col'>
        <Link
          to='/'
          className='absolute top-4 left-4 z-10 flex items-center gap-2 transition-opacity hover:opacity-80 sm:top-8 sm:left-8'
        >
          <div className='relative h-8 w-8'>
            {loading ? (
              <Skeleton className='absolute inset-0 rounded-full' />
            ) : (
              <img
                src={logo}
                alt={t('Logo')}
                className='h-8 w-8 rounded-full object-cover'
              />
            )}
          </div>
          {loading ? (
            <Skeleton className='h-6 w-24' />
          ) : (
            <h1 className='text-xl font-medium'>{systemName}</h1>
          )}
        </Link>

        <div className='flex flex-1 items-center justify-center pt-16 sm:pt-0'>
          <div className='flex w-full flex-col justify-center space-y-2 px-6 py-8 sm:w-[480px] sm:px-8'>
            {children}
          </div>
        </div>
      </div>

      {/* ── Right column: decorative photo panel ── */}
      <div className='bg-muted relative hidden overflow-hidden md:block'>
        {/* Replace the div below with an <img> when you have the photo */}
        <div className='absolute inset-0 bg-gradient-to-br from-violet-500/80 via-purple-600/70 to-indigo-700/80' />
        <div className='absolute inset-0 flex flex-col items-center justify-center p-12 text-white'>
          <div className='max-w-md text-center'>
            <h2 className='text-3xl font-bold tracking-tight'>APINET.CLOUD</h2>
            <p className='text-white/70 mt-3 text-lg'>AI Application Infrastructure Foundation</p>
          </div>
        </div>
      </div>
    </div>
  )
}
