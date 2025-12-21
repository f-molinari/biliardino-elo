import { IMatch } from '@/models/match.interface';
import { IPlayer } from '@/models/player.interface';
import { PlayerService } from './player.service';

export class EloService {
  public static readonly StartK = 100;
  public static readonly FinalK = 75;
  public static readonly MatchesK = 16; // 1 partita a settimana

  public static calculateEloChange(match: IMatch): { deltaA: number; deltaB: number; eloA: number; eloB: number; expA: number; expB: number; kA: number; kB: number } | null {
    const teamAP1 = PlayerService.getPlayerById(match.teamA.defence);
    const teamAP2 = PlayerService.getPlayerById(match.teamA.attack);

    const teamBP1 = PlayerService.getPlayerById(match.teamB.defence);
    const teamBP2 = PlayerService.getPlayerById(match.teamB.attack);

    if (!teamAP1 || !teamAP2 || !teamBP1 || !teamBP2) {
      return null;
    }

    const goalsA = match.score[0];
    const goalsB = match.score[1];

    const eloA = (teamAP1.elo + teamAP2.elo) / 2;
    const eloB = (teamBP1.elo + teamBP2.elo) / 2;

    const expA = EloService.expectedScore(eloA, eloB);
    const expB = 1 - expA;

    const scoreA = goalsA > goalsB ? 1 : goalsA === goalsB ? 0.5 : 0;
    const scoreB = 1 - scoreA;

    const goalMultiplier = EloService.marginMultiplier(goalsA, goalsB);
    const surpriseFactor = -Math.log2((goalsA > goalsB ? expA : expB) * (0.65 - 0.35) + 0.35);

    const kA = EloService.getTeamK(teamAP1, teamAP2);
    const kB = EloService.getTeamK(teamBP1, teamBP2);

    const deltaA = kA * goalMultiplier * (scoreA - expA) * surpriseFactor;
    const deltaB = kB * goalMultiplier * (scoreB - expB) * surpriseFactor;

    return { deltaA, deltaB, eloA, eloB, expA, expB, kA, kB };
  }

  private static getPlayerK(matches: number): number {
    const firstMatchMultiplier = Math.max(0, (1 - (matches / EloService.MatchesK)) * (EloService.StartK - EloService.FinalK));
    return EloService.FinalK + firstMatchMultiplier;
  }

  private static getTeamK(p1: IPlayer, p2: IPlayer): number {
    return (EloService.getPlayerK(p1.matches) + EloService.getPlayerK(p2.matches)) / 2;
  }

  public static expectedScore(eloA: number, eloB: number): number {
    return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  }

  private static marginMultiplier(goalsA: number, goalsB: number): number {
    const maxGoal = Math.max(goalsA, goalsB); // remove in the new app
    if (maxGoal >= 11) {
      goalsA = goalsA * 8 / maxGoal;
      goalsB = goalsB * 8 / maxGoal;
    }

    const diff = Math.abs(goalsA - goalsB);
    return Math.sqrt(diff / 2 + 1) * (1 + diff / 8) / 4.47213595499958; // normalized
  }
}
