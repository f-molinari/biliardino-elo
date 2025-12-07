import { IMatch } from './models/match.interface';
import { MatchService } from './services/match.service';
import { RepositoryService } from './services/repository.service';
import { updateElo } from './utils/update-elo.util';
import { PlayersView } from './views/players.view';

await RepositoryService.loadMatches();
await RepositoryService.loadPlayers();

const matches: IMatch[] = MatchService.getAllMatches();

matches.forEach(m => updateElo(m));

PlayersView.init();
