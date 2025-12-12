import { IMatch } from '@/models/match.interface';
import { EloService } from '@/services/elo.service';
import { PlayerService } from '@/services/player.service';

export function updateElo(match: IMatch): void {
  const { deltaA, deltaB, eloA, eloB, expA, expB, kA, kB } = EloService.calculateEloChange(match) ?? {};

  if (deltaA == null || deltaB == null) return;

  match.kFactor = [kA!, kB!];
  match.deltaELO = [deltaA!, deltaB!];
  match.teamELO = [eloA!, eloB!];
  match.expectedScore = [expA!, expB!];

  const teamA = match.teamA;
  const teamB = match.teamB;

  PlayerService.updateAfterMatch(teamA.defence, teamA.attack, teamB.defence, teamB.attack, deltaA, true, match.score[0], match.score[1]);
  PlayerService.updateAfterMatch(teamA.attack, teamA.defence, teamB.defence, teamB.attack, deltaA, false, match.score[0], match.score[1]);
  PlayerService.updateAfterMatch(teamB.defence, teamB.attack, teamA.defence, teamA.attack, deltaB, true, match.score[1], match.score[0]);
  PlayerService.updateAfterMatch(teamB.attack, teamB.defence, teamA.defence, teamA.attack, deltaB, false, match.score[1], match.score[0]);
}
