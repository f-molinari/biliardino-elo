/**
 * Lista hardcoded di playerIds admin
 * Solo questi utenti possono vedere il pulsante match making
 */
const ADMIN_PLAYER_IDS = [
  25, // Andrea Gargaro
  18, // Francesco Molinari
  22, // Michele Sette
  13 // Michele Lillo
];

export function isPlayerAdmin(playerId: number | null | undefined): boolean {
  if (__DEV_MODE__) return true; // In dev mode, everyone is admin
  if (!playerId) return false;
  return ADMIN_PLAYER_IDS.includes(playerId);
}
