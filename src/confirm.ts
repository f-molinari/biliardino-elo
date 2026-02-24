import './pwa';
import ConfirmView from './views/confirm.view';

async function init(): Promise<void> {
  await ConfirmView.init();

  // Dev toolbar: import dinamico se abilitato
  if (__DEV_MODE__) {
    try {
      const mod = await import('./dev-toolbar');
      if (mod && typeof mod.initDevToolbar === 'function') mod.initDevToolbar();
    } catch (err) {
      // ignore
    }
  }
}

init();
