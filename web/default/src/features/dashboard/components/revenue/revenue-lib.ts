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
import type { TopUpProviderStat } from '@/features/dashboard/types'

/**
 * Payment providers settle in different currencies. `TopUp.Money` is stored
 * as-is per provider without normalization, so summing across providers with
 * different currencies would produce a meaningless blended number. This map
 * lets the UI group and label amounts by their real settlement currency
 * instead of pretending there is a single "total revenue".
 */
const PROVIDER_CURRENCY: Record<string, 'RUB' | 'USD'> = {
  pally: 'RUB',
  freekassa: 'RUB',
  plategal: 'RUB',
  plategal_card: 'RUB',
  plategal_intl: 'RUB',
  plategal_sbp: 'RUB',
  heleket: 'USD',
  stripe: 'USD',
  creem: 'USD',
  waffo: 'USD',
  waffo_pancake: 'USD',
  epay: 'USD',
  balance: 'USD',
}

const PROVIDER_LABEL: Record<string, string> = {
  pally: 'Pally',
  freekassa: 'FreeKassa',
  plategal: 'Platega',
  plategal_card: 'Platega (Card)',
  plategal_intl: 'Platega (Intl)',
  plategal_sbp: 'Platega (SBP)',
  heleket: 'Heleket',
  stripe: 'Stripe',
  creem: 'Creem',
  waffo: 'Waffo',
  waffo_pancake: 'Waffo Pancake',
  epay: 'Epay',
  balance: 'Balance',
  unknown: 'Unknown',
}

export function getProviderCurrency(provider: string): 'RUB' | 'USD' | null {
  return PROVIDER_CURRENCY[provider] ?? null
}

export function getProviderLabel(provider: string): string {
  return PROVIDER_LABEL[provider] ?? provider
}

export interface CurrencyRevenueGroup {
  currency: string
  money: number
  count: number
}

/**
 * Groups the by-provider breakdown into currency buckets so the UI can show
 * "Revenue (RUB)" / "Revenue (USD)" instead of one incorrect blended total.
 * Providers with an unrecognized/unmapped currency are grouped under "?"
 * so nothing silently disappears.
 */
export function groupByCurrency(
  byProvider: TopUpProviderStat[]
): CurrencyRevenueGroup[] {
  const groups = new Map<string, CurrencyRevenueGroup>()

  for (const p of byProvider) {
    const currency = getProviderCurrency(p.provider) ?? '?'
    const existing = groups.get(currency)
    if (existing) {
      existing.money += p.money
      existing.count += p.count
    } else {
      groups.set(currency, { currency, money: p.money, count: p.count })
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.money - a.money)
}

export function formatMoney(money: number, currency: string): string {
  if (currency === '?') {
    return money.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    }).format(money)
  } catch {
    return `${money.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`
  }
}
