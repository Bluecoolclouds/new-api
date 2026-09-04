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
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { createApiKey, fetchTokenKey, getApiKeys } from '@/features/keys/api'
import { API_KEY_STATUS } from '@/features/keys/constants'

/** Name used for the key auto-provisioned for embedded web chat (e.g. LibreChat
 * iframe). Kept distinct so it's recognizable in the key list and reused on
 * subsequent calls instead of creating duplicates. */
const IFRAME_CHAT_KEY_NAME = 'LibreChat (auto)'

async function createIframeChatKey() {
  const created = await createApiKey({
    name: IFRAME_CHAT_KEY_NAME,
    remain_quota: 0,
    expired_time: -1,
    unlimited_quota: true,
    model_limits_enabled: false,
    model_limits: '',
    allow_ips: '',
    group: '',
    cross_group_retry: false,
  })
  if (!created.success) {
    throw new Error(created.message || 'Failed to create API key')
  }
}

export async function fetchActiveChatKey() {
  const result = await getApiKeys({ p: 1, size: 50 })
  if (!result.success) {
    throw new Error(result.message || 'Failed to load API keys')
  }

  let items = result.data?.items ?? []
  let active = items.find((item) => item.status === API_KEY_STATUS.ENABLED)

  if (!active) {
    // No usable key yet (e.g. first time opening the embedded chat) — provision
    // an unlimited-quota key automatically so the iframe works out of the box.
    await createIframeChatKey()
    const retry = await getApiKeys({ p: 1, size: 50 })
    if (!retry.success) {
      throw new Error(retry.message || 'Failed to load API keys')
    }
    items = retry.data?.items ?? []
    active = items.find((item) => item.status === API_KEY_STATUS.ENABLED)
    if (!active) {
      throw new Error('No enabled API keys found. Create or enable one first.')
    }
  }

  const keyResult = await fetchTokenKey(active.id)
  if (!keyResult.success || !keyResult.data?.key) {
    throw new Error(keyResult.message || 'Failed to load API key')
  }

  return `sk-${keyResult.data.key}`
}

/**
 * Get the currently active API key for chat links
 */
export function useActiveChatKey(enabled: boolean) {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: ['chat-active-key', userId],
    queryFn: fetchActiveChatKey,
    enabled: enabled && Boolean(userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
