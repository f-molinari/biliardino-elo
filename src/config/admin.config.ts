/**
 * Lista hardcoded di playerIds admin
 * Solo questi utenti possono vedere il pulsante match making
 */
const ADMIN_PLAYER_IDS = [
  13, // Michele Lillo
  16, // Andrea Difonzo
  18, // Francesco Molinari
  21, // Luigi Denora
  22, // Michele Sette
  25 // Andrea Gargaro
];

export function isPlayerAdmin(playerId: number | null | undefined): boolean {
  if (!playerId) return false;
  return ADMIN_PLAYER_IDS.includes(playerId);
}
