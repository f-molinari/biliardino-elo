import { IMatch } from '@/models/match.interface';
import { IPlayer } from '@/models/player.interface';
import { MatchService } from '@/services/match.service';
import { StatsService } from '@/services/stats.service';
import { PlayerService } from '../services/player.service';

/**
 * Handles UI display for player details.
 */
export class PlayersView {
  /**
   * Initialize the view by reading player from query string and rendering stats.
   */
  public static init(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('id');

    if (!playerId) {
      PlayersView.renderError('Nessun giocatore specificato. Aggiungi ?id=PLAYER_ID all\'URL.');
      return;
    }

    const player = PlayerService.getPlayerById(playerId);
    if (!player) {
      PlayersView.renderError('Giocatore non trovato.');
      return;
    }

    PlayersView.renderPlayerStats(player);
  }

  /**
   * Render error message.
   */
  private static renderError(message: string): void {
    const container = document.getElementById('player-stats');
    if (container) {
      container.innerHTML = `<div class="empty-state">${message}</div>`;
    }
  }

  /**
   * Render player details into the container element.
   *
   * @param player - Player to display.
   */
  private static renderPlayerStats(player: IPlayer): void {
    const container = document.getElementById('player-stats');
    if (!container) {
      throw new Error('Player stats container not found');
    }

    // Update page title with player name
    const titleElement = document.getElementById('player-name');
    if (titleElement) {
      titleElement.textContent = `Statistiche di ${player.name}`;
    }

    const stats = StatsService.getPlayerStats(player.id, MatchService.getAllMatches());

    if (!stats) {
      container.innerHTML = '<div class="empty-state">Nessuna statistica disponibile</div>';
      return;
    }

    const winPercentage = stats.matches > 0 ? ((stats.wins / stats.matches) * 100).toFixed(1) : '0.0';
    const winPercentageAttack = stats.matchesAsAttack > 0 ? ((stats.winsAsAttack / stats.matchesAsAttack) * 100).toFixed(1) : '0.0';
    const winPercentageDefence = stats.matchesAsDefence > 0 ? ((stats.winsAsDefence / stats.matchesAsDefence) * 100).toFixed(1) : '0.0';

    const formatElo = (value: number) => {
      if (!isFinite(value)) return 'N/A';
      return Math.round(value);
    };

    const formatPlayerResult = (result: { player: { name: string }; score: number } | null) => {
      if (!result) return 'N/A';
      return `${result.player.name} (${result.score > 0 ? '+' : ''}${result.score.toFixed(0)})`;
    };

    const formatMatchResult = (result: { match: IMatch; delta: number } | null, playerId: string) => {
      if (!result) return 'N/A';
      const m = result.match;
      const isTeamA = m.teamA.attack === playerId || m.teamA.defence === playerId;
      const score = isTeamA ? `${m.score[0]}-${m.score[1]}` : `${m.score[1]}-${m.score[0]}`;

      const myTeam = isTeamA ? m.teamA : m.teamB;
      const opponentTeam = isTeamA ? m.teamB : m.teamA;

      const teammate = PlayerService.getPlayerById(myTeam.attack === playerId ? myTeam.defence : myTeam.attack);
      const opp1 = PlayerService.getPlayerById(opponentTeam.attack);
      const opp2 = PlayerService.getPlayerById(opponentTeam.defence);

      const teammateName = teammate?.name || '?';
      const opponentsNames = `${opp1?.name || '?'} & ${opp2?.name || '?'}`;

      return `<strong>${score}</strong><br><small>vs ${opponentsNames}</small><br><small>con ${teammateName} (${result.delta > 0 ? '+' : ''}${result.delta.toFixed(0)} ELO)</small>`;
    };

    const formatMatchByScore = (match: IMatch | null, playerId: string) => {
      if (!match) return 'N/A';
      const isTeamA = match.teamA.attack === playerId || match.teamA.defence === playerId;
      const scoreFor = isTeamA ? match.score[0] : match.score[1];
      const scoreAgainst = isTeamA ? match.score[1] : match.score[0];
      const diff = scoreFor - scoreAgainst;

      const myTeam = isTeamA ? match.teamA : match.teamB;
      const opponentTeam = isTeamA ? match.teamB : match.teamA;

      const teammate = PlayerService.getPlayerById(myTeam.attack === playerId ? myTeam.defence : myTeam.attack);
      const opp1 = PlayerService.getPlayerById(opponentTeam.attack);
      const opp2 = PlayerService.getPlayerById(opponentTeam.defence);

      const teammateName = teammate?.name || '?';
      const opponentsNames = `${opp1?.name || '?'} & ${opp2?.name || '?'}`;

      return `<strong>${scoreFor}-${scoreAgainst}</strong><br><small>vs ${opponentsNames}</small><br><small>con ${teammateName} (${diff > 0 ? '+' : ''}${diff})</small>`;
    };

    container.innerHTML = `
      <div class="stats-section">
        <h3>📊 Generale</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">ELO Attuale</span>
            <span class="stat-value highlight">${formatElo(stats.elo)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Miglior ELO</span>
            <span class="stat-value positive">${formatElo(stats.bestElo)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Peggior ELO</span>
            <span class="stat-value negative">${formatElo(stats.worstElo)}</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3>🎮 Partite</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Partite Totali</span>
            <span class="stat-value">${stats.matches}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Come Attaccante</span>
            <span class="stat-value">${stats.matchesAsAttack}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Come Difensore</span>
            <span class="stat-value">${stats.matchesAsDefence}</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3>🏆 Vittorie e Sconfitte</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Record</span>
            <span class="stat-value">${stats.wins}V - ${stats.losses}S <span class="percentage">(${winPercentage}%)</span></span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Record Attacco</span>
            <span class="stat-value">${stats.winsAsAttack}V - ${stats.lossesAsAttack}S <span class="percentage">(${winPercentageAttack}%)</span></span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Record Difesa</span>
            <span class="stat-value">${stats.winsAsDefence}V - ${stats.lossesAsDefence}S <span class="percentage">(${winPercentageDefence}%)</span></span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3>🔥 Streak</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Migliore Striscia Vittorie</span>
            <span class="stat-value positive">${stats.bestWinStreak}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Peggiore Striscia Sconfitte</span>
            <span class="stat-value negative">${stats.worstLossStreak}</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3>⚽ Goal</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Goal Totali Fatti</span>
            <span class="stat-value positive">${stats.totalGoalsFor}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Goal Totali Subiti</span>
            <span class="stat-value negative">${stats.totalGoalsAgainst}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Media Goal Fatti</span>
            <span class="stat-value">${(stats.totalGoalsFor / stats.matches).toFixed(2)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Media Goal Subiti</span>
            <span class="stat-value">${(stats.totalGoalsAgainst / stats.matches).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3>👥 Compagni e Avversari</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Miglior Compagno</span>
            <span class="stat-value positive">${formatPlayerResult(stats.bestTeammate)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Peggior Compagno</span>
            <span class="stat-value negative">${formatPlayerResult(stats.worstTeammate)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Miglior Avversario</span>
            <span class="stat-value positive">${formatPlayerResult(stats.bestOpponent)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Peggior Avversario</span>
            <span class="stat-value negative">${formatPlayerResult(stats.worstOpponent)}</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3>🏅 Migliori e Peggiori Partite</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Migliore Vittoria (ELO)</span>
            <span class="stat-value positive">${formatMatchResult(stats.bestVictoryByElo, player.id)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Peggiore Sconfitta (ELO)</span>
            <span class="stat-value negative">${formatMatchResult(stats.worstDefeatByElo, player.id)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Migliore Vittoria (Punteggio)</span>
            <span class="stat-value positive">${formatMatchByScore(stats.bestVictoryByScore, player.id)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Peggiore Sconfitta (Punteggio)</span>
            <span class="stat-value negative">${formatMatchByScore(stats.worstDefeatByScore, player.id)}</span>
          </div>
        </div>
      </div>
    `;
  }
}
