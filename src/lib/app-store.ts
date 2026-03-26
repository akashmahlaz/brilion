import { Store } from '@tanstack/store'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  timestamp: number
  read: boolean
}

export interface AppState {
  sidebarExpanded: boolean
  chatPanelExpanded: boolean
  notifications: Notification[]
  connectionStatus: Record<string, 'online' | 'offline' | 'connecting'>
  commandPaletteOpen: boolean
}

export const appStore = new Store<AppState>({
  sidebarExpanded: false,
  chatPanelExpanded: true,
  notifications: [],
  connectionStatus: {},
  commandPaletteOpen: false,
})

// ─── Actions ─────────────────────────────────────────

export function toggleSidebar() {
  appStore.setState((s) => ({ ...s, sidebarExpanded: !s.sidebarExpanded }))
}

export function setSidebarExpanded(expanded: boolean) {
  appStore.setState((s) => ({ ...s, sidebarExpanded: expanded }))
}

export function addNotification(n: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  const notification: Notification = {
    ...n,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    read: false,
  }
  appStore.setState((s) => ({
    ...s,
    notifications: [notification, ...s.notifications].slice(0, 50),
  }))
}

export function markNotificationRead(id: string) {
  appStore.setState((s) => ({
    ...s,
    notifications: s.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    ),
  }))
}

export function clearNotifications() {
  appStore.setState((s) => ({ ...s, notifications: [] }))
}

export function setConnectionStatus(channel: string, status: 'online' | 'offline' | 'connecting') {
  appStore.setState((s) => ({
    ...s,
    connectionStatus: { ...s.connectionStatus, [channel]: status },
  }))
}

export function toggleCommandPalette() {
  appStore.setState((s) => ({ ...s, commandPaletteOpen: !s.commandPaletteOpen }))
}

export function toggleChatPanel() {
  appStore.setState((s) => ({ ...s, chatPanelExpanded: !s.chatPanelExpanded }))
}

export function setChatPanelExpanded(expanded: boolean) {
  appStore.setState((s) => ({ ...s, chatPanelExpanded: expanded }))
}
