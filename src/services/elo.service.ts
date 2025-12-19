import { IMatch } from '@/models/match.interface';
import { IPlayer } from '@/models/player.interface';
import { getPlayerById } from './player.service';

export const StartK = 60;
export const FinalK = 30;
export const MatchesK = 16; // 1 partita media a settimana

export function updateMatch(match: IMatch): void {
  const teamAP1 = getPlayerById(match.teamA.defence);
  const teamAP2 = getPlayerById(match.teamA.attack);

  const teamBP1 = getPlayerById(match.teamB.defence);
  const teamBP2 = getPlayerById(match.teamB.attack);

  if (!teamAP1 || !teamAP2 || !teamBP1 || !teamBP2) {
    throw new Error('One or more players not found for match Elo calculation.');
  }

  const goalsA = match.score[0];
  const goalsB = match.score[1];

  const margin = marginMultiplier(Math.max(goalsA, goalsB), Math.min(goalsA, goalsB));

  const eloA = (teamAP1.elo + teamAP2.elo) / 2;
  const eloB = (teamBP1.elo + teamBP2.elo) / 2;

  const expA = expectedScore(eloA, eloB);
  const expB = 1 - expA;

  const scoreA = goalsA > goalsB ? 1 : goalsA === goalsB ? 0.5 : 0;
  const scoreB = 1 - scoreA;

  const kA = getTeamK(teamAP1, teamAP2);
  const kB = getTeamK(teamBP1, teamBP2);

  const deltaA = kA * margin * (scoreA - expA);
  const deltaB = kB * margin * (scoreB - expB);

  match.expectedScore[0] = expA;
  match.expectedScore[1] = expB;

  match.deltaELO[0] = deltaA;
  match.deltaELO[1] = deltaB;

  match.teamELO[0] = eloA;
  match.teamELO[1] = eloB;

  match.teamAELO[0] = teamAP1.elo;
  match.teamAELO[1] = teamAP2.elo;

  match.teamBELO[0] = teamBP1.elo;
  match.teamBELO[1] = teamBP2.elo;
}

function getPlayerK(matches: number): number {
  const firstMatchMultiplier = Math.max(0, (1 - (matches / MatchesK)) * (StartK - FinalK));
  return FinalK + firstMatchMultiplier;
}

function getTeamK(p1: IPlayer, p2: IPlayer): number {
  return (getPlayerK(p1.matches) + getPlayerK(p2.matches)) / 2;
}

export function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

function marginMultiplier(goalsFor: number, goalsAgainst: number): number {
  const diff = goalsFor - goalsAgainst;
  return Math.sqrt(diff / 2 + 1) * (1 + diff / 8) / 1.3778379803155376; // precomputed (1 + 1 / 8)
}
