import { IMatch, IMatchDTO } from '@/models/match.interface';
import { IPlayer } from '@/models/player.interface';
import { db, MATCHES_COLLECTION, PLAYERS_COLLECTION } from '@/utils/firebase.util';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';

export async function fetchPlayers(): Promise<IPlayer[]> {
  const snap = await getDocs(collection(db, PLAYERS_COLLECTION));

  const players = snap.docs.map((d) => {
    const data = d.data() as IPlayer;

    return {
      id: Number.parseInt(d.id),
      name: data.name,
      elo: data.elo,
      defence: data.defence,
      matches: 0,
      bestElo: -1,
      goalsAgainst: 0,
      goalsFor: 0,
      matchesAsAttacker: 0,
      matchesAsDefender: 0,
      matchesDelta: [],
      wins: 0,
      rank: -1
    } satisfies IPlayer;
  });

  return players;
}

export async function fetchMatches(): Promise<IMatch[]> {
  const snap = await getDocs(collection(db, MATCHES_COLLECTION));
  const matches: IMatch[] = [];

  snap.docs.map((d) => {
    const data = d.data() as IMatch;
    const id = Number.parseInt(d.id);

    if (isNaN(id)) return;

    matches.push({
      id,
      teamA: data.teamA,
      teamB: data.teamB,
      score: data.score,
      createdAt: data.createdAt,
      deltaELO: [-1, -1],
      expectedScore: [-1, -1],
      teamELO: [-1, -1],
      teamAELO: [-1, -1],
      teamBELO: [-1, -1]
    });
  });

  return matches;
}

export async function saveMatch(match: IMatchDTO): Promise<void> {
  const ref = doc(collection(db, MATCHES_COLLECTION), match.id.toString());
  await setDoc(ref, match, { merge: true });
}
