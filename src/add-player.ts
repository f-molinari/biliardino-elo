import './pwa';
import { withAuthentication } from './utils/auth.util';
import { AddPlayerView } from './views/add-player.view';

async function init(): Promise<void> {
  AddPlayerView.init();
}

withAuthentication(init);
