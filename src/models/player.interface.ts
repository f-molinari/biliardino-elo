export interface IPlayer {
  id: string;
  name: string;
  elo: number;
  matches: number;
  defence: number;

  // CALCULATED AFTER

  matchesAsDefender: number;
  matchesAsAttacker: number;
  wins: number;
  matchesDelta: number[];
  goalsFor: number;
  goalsAgainst: number;
  teammatesDelta?: Map<string, number>;
  bestElo?: number;
  teammatesMatchCount?: Map<string, number>;
  opponentsMatchCount?: Map<string, number>;
}
