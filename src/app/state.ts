/**
 * Lightweight AppState singleton with event emitter.
 *
 * Holds cross-route reactive state (auth, data loading status).
 * Services remain the actual source of truth for data.
 */

type Listener = (...args: unknown[]) => void;

class AppState {
  private listeners = new Map<string, Set<Listener>>();

  // ── Auth ─────────────────────────────────────────────────
  currentPlayerId: number | null = null;
  currentPlayerName: string | null = null;
  isAdmin = false;
  isAuthenticated = false;

  // ── Data status ──────────────────────────────────────────
  playersLoaded = false;
  matchesLoaded = false;

  // ── Lobby ───────────────────────────────────────────────
  lobbyActive = false;

  // ── Event emitter ────────────────────────────────────────

  on(event: string, cb: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
  }

  off(event: string, cb: Listener): void {
    this.listeners.get(event)?.delete(cb);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach(cb => cb(...args));
  }

  /**
   * Hydrate auth state from localStorage (set by the notification system).
   */
  hydrateFromLocalStorage(): void {
    const playerId = localStorage.getItem('biliardino_player_id');
    const playerName = localStorage.getItem('biliardino_player_name');
    if (playerId) {
      this.currentPlayerId = Number(playerId);
      this.currentPlayerName = playerName;
    }
  }
}

export const appState = new AppState();
