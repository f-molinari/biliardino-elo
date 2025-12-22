import { browserSessionPersistence, onAuthStateChanged, setPersistence } from 'firebase/auth';
import './pwa';
import { AUTH, login } from './utils/firebase.util';
import { AddMatchView } from './views/add-match.view';

async function init(user: any): Promise<void> {
  if (!user) throw new Error('Not authenticated');
  AddMatchView.init();
}

async function showLoginDialog(): Promise<void> {
  const dialog = document.getElementById('loginDialog') as HTMLDialogElement;
  const form = document.getElementById('loginForm') as HTMLFormElement;

  dialog.showModal();

  return new Promise((resolve, reject) => {
    const onCancel = (): void => reject(new Error('Login cancelled'));

    form.onsubmit = async (e) => {
      e.preventDefault();

      const email = (document.getElementById('loginEmail') as HTMLInputElement).value;
      const password = (document.getElementById('loginPassword') as HTMLInputElement).value;

      try {
        await setPersistence(AUTH, browserSessionPersistence);
        await login(email, password);
        dialog.close();
        resolve();
      } catch {
        alert('Invalid username or password');
      }
    };

    dialog.addEventListener('cancel', onCancel, { once: true });
  });
}

let started = false;

onAuthStateChanged(AUTH, async (user) => {
  if (started) return;

  if (!user || started) {
    await showLoginDialog();
    return;
  }

  started = true;
  await init(user);
});
