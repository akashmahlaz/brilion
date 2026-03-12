/**
 * WhatsApp channel — thin wrapper around wa-manager.
 * All per-user state lives in wa-manager; this module re-exports
 * the public API with the same signatures the API routes expect.
 */
export {
  startQrLogin,
  getLoginStatus,
  isWhatsAppConnected,
  send as sendWhatsAppMessage,
  disconnect as disconnectWhatsApp,
  logout as logoutWhatsApp,
  onMessage as onWhatsAppMessage,
} from "../lib/wa-manager";
