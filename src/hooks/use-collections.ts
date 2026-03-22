import { useLiveQuery } from '@tanstack/react-db'
import {
  notificationsCollection,
  logsCollection,
  conversationsCollection,
} from '#/db-collections'

export function useNotifications() {
  const { data } = useLiveQuery((q) =>
    q
      .from({ notification: notificationsCollection })
      .select(({ notification }) => ({ ...notification }))
      .orderBy(({ notification }) => notification.timestamp, 'desc'),
  )
  return data ?? []
}

export function useUnreadCount() {
  const notifications = useNotifications()
  return notifications.filter((n) => !n.read).length
}

export function useLiveLogs() {
  const { data } = useLiveQuery((q) =>
    q
      .from({ log: logsCollection })
      .select(({ log }) => ({ ...log }))
      .orderBy(({ log }) => log.createdAt, 'desc'),
  )
  return data ?? []
}

export function useConversations() {
  const { data } = useLiveQuery((q) =>
    q
      .from({ conversation: conversationsCollection })
      .select(({ conversation }) => ({ ...conversation }))
      .orderBy(({ conversation }) => conversation.updatedAt, 'desc'),
  )
  return data ?? []
}
