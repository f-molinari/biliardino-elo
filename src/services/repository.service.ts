import { MatchService } from './match.service';
import { PlayerService } from './player.service';

/**
 * Repository layer for loading and saving data.
 */
export class RepositoryService {
  /**
   * Load all players from the players JSON file
   * and pass them to the PlayerService.
   *
   * @returns A promise that resolves once players are loaded.
   */
  public static async loadPlayers(): Promise<void> {
    const res = await fetch('./data/players.json');
    PlayerService.loadPlayers(await res.json());
  }

  /**
   * Load all matches from the matches JSON file
   * and pass them to the MatchService.
   *
   * @returns A promise that resolves once matches are loaded.
   */
  public static async loadMatches(): Promise<void> {
    const res = await fetch('./data/matches.json');
    MatchService.loadMatches(await res.json());
  }

  public static async saveMatches(): Promise<void> {
    // todo
  }
}
