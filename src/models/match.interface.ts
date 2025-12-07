import { ITeam } from './team.interface';

export interface IMatch {
  /**
   * Unique identifier.
   */
  id: string;
  /**
   * First team.
   */
  teamA: ITeam;
  /**
   * Second team
   */
  teamB: ITeam;
  /**
   * Final score of the match in the form [scoreA, scoreB],
   * where:
   * - scoreA is the number of goals scored by {@link IMatch.teamA}.
   * - scoreB is the number of goals scored by {@link IMatch.teamB}.
   */
  score: [number, number];
}
