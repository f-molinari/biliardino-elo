import { IMatch } from '@/models/match.interface';
import { EloService } from '@/services/elo.service';
import { PlayerService } from '@/services/player.service';

export function updateElo(match: IMatch): void {
  const { deltaA, deltaB, eloA, eloB, expA, expB, kA, kB } = EloService.calculateEloChange(match) ?? {};

  if (deltaA == null || deltaB == null) {
    return;
  }

  match.kFactor = [kA!, kB!];
  match.deltaELO = [deltaA!, deltaB!];
  match.teamELO = [eloA!, eloB!];
  match.expectedScore = [expA!, expB!];

  PlayerService.updateAfterMatch(match.teamA.defence, match.teamA.attack, deltaA, true, match.score[0], match.score[1]);
  PlayerService.updateAfterMatch(match.teamA.attack, match.teamA.defence, deltaA, false, match.score[0], match.score[1]);
  PlayerService.updateAfterMatch(match.teamB.defence, match.teamB.attack, deltaB, true, match.score[1], match.score[0]);
  PlayerService.updateAfterMatch(match.teamB.attack, match.teamB.defence, deltaB, false, match.score[1], match.score[0]);
}
