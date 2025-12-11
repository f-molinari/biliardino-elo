import { IMatch } from '@/models/match.interface';
import { IPlayer } from '@/models/player.interface';
import { db, MATCHES_COLLECTION, PLAYERS_COLLECTION } from '@/utils/firebase.util';
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';

/**
 * Repository layer for loading and saving data.
 */
export class RepositoryService {
  /**
   * Load all players.
   *
   * @returns Promise resolving to a list of {@link IPlayer} objects.
   */
  public static async loadPlayers(): Promise<IPlayer[]> {
    const snap = await getDocs(collection(db, PLAYERS_COLLECTION));

    const players: IPlayer[] = snap.docs.map((d) => {
      const data = d.data() as IPlayer;
      return {
        id: d.id,
        name: data.name,
        elo: 1000,
        matches: data.matches,
        bestElo: undefined,
        goalsAgainst: 0,
        goalsFor: 0,
        matchesAsAttacker: 0,
        matchesAsDefender: 0,
        wins: 0,
        matchesDelta: [],
        teammatesDelta: undefined
      };
    });

    return players;
  }

  /**
   * Persist a single player.
   *
   * Performs a "merge" update, meaning partial data overwrites existing
   * fields without removing unspecified fields.
   *
   * @param player - The player to save.
   * @returns Promise that resolves once the operation completes.
   */
  public static async savePlayer(player: IPlayer): Promise<void> {
    const { id, ...data } = player;
    const ref = doc(collection(db, PLAYERS_COLLECTION), id);

    await setDoc(ref, data, { merge: true });
  }

  /**
   * Persist multiple players using a batch write.
   *
   * Each document is merged with its existing record.
   *
   * @param players - The list of players to save.
   * @returns Promise that resolves once the batch is committed.
   */
  public static async savePlayers(players: IPlayer[]): Promise<void> {
    const batch = writeBatch(db);
    const colRef = collection(db, PLAYERS_COLLECTION);

    for (const player of players) {
      const { id, ...data } = player;
      const ref = doc(colRef, id);
      batch.set(ref, data, { merge: true });
    }

    await batch.commit();
  }

  /**
   * Load all matches.
   *
   * @returns Promise resolving to a list of {@link IMatch} objects.
   */
  public static async loadMatches(): Promise<IMatch[]> {
    const snap = await getDocs(collection(db, MATCHES_COLLECTION));

    const matches: IMatch[] = snap.docs.map((d) => {
      const data = d.data() as IMatch;
      return {
        id: d.id,
        teamA: data.teamA,
        teamB: data.teamB,
        score: data.score,
        createdAt: data.createdAt
      };
    });

    return matches;
  }

  /**
   * Persist a single match.
   *
   * Performs a merge update: existing fields are overwritten
   * but unspecified ones are preserved.
   *
   * @param match - The match to save.
   * @returns Promise that resolves once the operation completes.
   */
  public static async saveMatch(match: IMatch): Promise<void> {
    const { id, ...data } = match;
    const ref = doc(collection(db, MATCHES_COLLECTION), id);

    await setDoc(ref, data, { merge: true });
  }

  /**
   * Persist multiple matches using a batch write.
   *
   * @param matches - The list of matches to save.
   * @returns Promise that resolves once the batch commit finishes.
   */
  public static async saveMatches(matches: IMatch[]): Promise<void> {
    const batch = writeBatch(db);
    const colRef = collection(db, MATCHES_COLLECTION);

    for (const match of matches) {
      const { id, ...data } = match;
      const ref = doc(colRef, id);
      batch.set(ref, data, { merge: true });
    }

    await batch.commit();
  }
}
