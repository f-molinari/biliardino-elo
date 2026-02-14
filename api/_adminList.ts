/**
 * Lista hardcoded di playerIds admin
 * Solo questi utenti hanno accesso alla pagina matchmaking.html
 */
export const ADMIN_PLAYER_IDS = [
  25, // Andrea Gargaro
  1, // Admin 1
  5 // Admin 2
  // Aggiungere altri ID admin qui
];

/**
 * Verifica se un giocatore è admin
 */
export function isPlayerAdmin(playerId: number | null | undefined): boolean {
  if (!playerId) return false;
  return ADMIN_PLAYER_IDS.includes(playerId);
}
