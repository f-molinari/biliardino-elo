import { IPlayer } from '@/models/player.interface';
import { getDisplayElo } from '@/utils/get-display-elo.util';
import { fetchPlayers } from './repository.service';

const playersMap = new Map<number, IPlayer>();
let playersArray: IPlayer[] = [];
let rankOutdated = true;

await loadPlayers();

export function getPlayerById(id: number): IPlayer | undefined {
  return playersMap.get(id);
}

export function getPlayerByName(name: string): IPlayer | undefined {
  for (const [, player] of playersMap) {
    if (player.name.includes(name)) return player;
  }
  return undefined;
}

export function getAllPlayers(): IPlayer[] {
  return playersArray;
}

export function getRank(id: string): number {
  if (rankOutdated) computeRanks();
  return getPlayerById(id)?.rank ?? -1;
}

export function updatePlayer(id: string, idMate: string, idOppoA: string, idOppoB: string, delta: number, isDefender: boolean, goalsFor: number, goalsAgainst: number): void {
  const player = getPlayerById(id);
  if (!player) return;

  player.elo += delta;
  player.bestElo = Math.max(player.bestElo ?? player.elo, player.elo);
  player.matches++;
  player.wins += delta > 0 ? 1 : 0;
  player.goalsFor += goalsFor;
  player.goalsAgainst += goalsAgainst;
  player.matchesAsDefender += isDefender ? 1 : 0;
  player.matchesAsAttacker += isDefender ? 0 : 1;

  if (id > idMate) { // to avoid to calculate twice the same teammate delta
    if (!player.teammatesMatchCount) {
      player.teammatesDelta = new Map<string, number>();
      player.teammatesMatchCount = new Map<string, number>();
    }

    player.teammatesDelta!.set(idMate, (player.teammatesDelta!.get(idMate) ?? 0) + delta);
    player.teammatesMatchCount.set(idMate, (player.teammatesMatchCount.get(idMate) ?? 0) + 1);
  }

  if (id > idOppoA) { // to avoid to calculate twice the same teammate delta
    player.opponentsMatchCount ??= new Map<string, number>();
    player.opponentsMatchCount.set(idOppoA, (player.opponentsMatchCount.get(idOppoA) ?? 0) + 1);
  }

  if (id > idOppoB) { // to avoid to calculate twice the same teammate delta
    player.opponentsMatchCount ??= new Map<string, number>();
    player.opponentsMatchCount.set(idOppoB, (player.opponentsMatchCount.get(idOppoB) ?? 0) + 1);
  }

  player.matchesDelta.push(delta);

  rankOutdated = true;
}

export async function loadPlayers(): Promise<void> {
  playersArray = await fetchPlayers();

  for (const player of playersArray) {
    playersMap.set(player.id, player);
  }
}

function computeRanks(): void {
  const players = playersArray.toSorted((a, b) => b.elo - a.elo);

  let rank = 0;
  let previousElo = -1;

  for (const player of players) {
    const elo = getDisplayElo(player);

    if (elo !== previousElo) {
      rank++;
      previousElo = elo;
    }

    player.rank = rank;
  }

  rankOutdated = false;
}
