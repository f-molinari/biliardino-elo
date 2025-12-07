import { Guid } from 'guid-typescript';
import { IMatch } from '../models/match.interface';
import { ITeam } from '../models/team.interface';

/**
 * Service handling storage and management of match records.
 */
export class MatchService {
  /**
   * Internal store of matches, mapping match id -> match.
   */
  private static readonly _matches = new Map<string, IMatch>();

  /**
   * Get all stored matches.
   *
   * @returns All registered matches as an array.
   */
  public static getAllMatches(): IMatch[] {
    return Array.from(MatchService._matches.values());
  }

  /**
   * Create and store a new match between two teams.
   *
   * @param teamA - First team participating in the match.
   * @param teamB - Second team participating in the match.
   * @param score - Final score represented as [scoreA, scoreB].
   */
  public static addMatch(teamA: ITeam, teamB: ITeam, score: [number, number]): void {
    const id = Guid.create().toString();
    MatchService._matches.set(id, { id, teamA, teamB, score });
  }

  /**
   * Load an array of already existing matches into the service.
   *
   * If an id already exists, the existing entry will be overwritten.
   *
   * @param matches - Array of matches to import.
   */
  public static loadMatches(matches: IMatch[]): void {
    for (const match of matches) {
      MatchService._matches.set(match.id, match);
    }
  }

  /**
   * Remove all stored matches from memory.
   */
  public static clearMatches(): void {
    MatchService._matches.clear();
  }
}
