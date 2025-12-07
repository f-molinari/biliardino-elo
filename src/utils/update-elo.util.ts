import { IMatch } from '@/models/match.interface';
import { EloService } from '@/services/elo.service';
import { PlayerService } from '@/services/player.service';

export function updateElo(match: IMatch): void {
  const { deltaA, deltaB } = EloService.getDelta(match) ?? {};

  if (deltaA == null || deltaB == null) {
    return;
  }
  console.log(Math.round(deltaA), Math.round(deltaB));

  PlayerService.updateAfterMatch(match.teamA.defence, deltaA);
  PlayerService.updateAfterMatch(match.teamA.attack, deltaA);
  PlayerService.updateAfterMatch(match.teamB.defence, deltaB);
  PlayerService.updateAfterMatch(match.teamB.attack, deltaB);

  const tap1 = PlayerService.getPlayerById(match.teamA.defence);
  const tap2 = PlayerService.getPlayerById(match.teamA.attack);
  const tbp1 = PlayerService.getPlayerById(match.teamB.defence);
  const tbp2 = PlayerService.getPlayerById(match.teamB.attack);

  console.log(tap1?.name, tap1?.elo, tap1?.matches);
  console.log(tap2?.name, tap2?.elo, tap2?.matches);
  console.log(tbp1?.name, tbp1?.elo, tbp1?.matches);
  console.log(tbp2?.name, tbp2?.elo, tbp2?.matches);
}
