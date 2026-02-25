/**
 * SPA Entry Point — Bootstraps the application.
 *
 * Imports styles, initializes PWA, renders the Layout shell,
 * and starts the hash router.
 */

// ── Styles ─────────────────────────────────────────────────
import '../style.css'; // Tailwind base
import './styles/design-system.css';
import './styles/fonts.css';
import './styles/utilities.css';

// ── PWA ────────────────────────────────────────────────────
import '../pwa';

// ── App ────────────────────────────────────────────────────
import { LayoutComponent } from './components/layout.component';
import { userDropdown } from './components/user-dropdown.component';
import { router } from './router';
import { appState } from './state';

async function bootstrap(): Promise<void> {
  // 1. Hydrate auth state from localStorage
  appState.hydrateFromLocalStorage();

  // 2. Render the Layout shell
  const layout = new LayoutComponent();
  const appEl = document.getElementById('app');
  if (!appEl) throw new Error('Bootstrap: #app element not found');

  appEl.innerHTML = layout.render();
  layout.mount();

  // 3. Mount the unified user dropdown (panel + backdrop appended to body)
  userDropdown.mount();

  // 4. Start the router (reads current hash, renders first page)
  router.init();

  // 5. Dev toolbar (conditionally loaded)
  if (__DEV_MODE__) {
    try {
      const { initDevToolbar } = await import('../dev-toolbar');
      initDevToolbar();
    } catch {
      // dev-toolbar might not exist, that's ok
    }
  }
}

bootstrap();
