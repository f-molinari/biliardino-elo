/**
 * Layout — Root shell wrapping the entire SPA.
 * Contains: FieldBackground, Header, main content area, footer.
 * The login dialog has been replaced by the UserDropdown singleton.
 */

import { renderFieldBackground } from './field-background.component';
import { HeaderComponent } from './header.component';

export class LayoutComponent {
  private header = new HeaderComponent();

  render(): string {
    return `
      <div class="min-h-screen">
        ${renderFieldBackground()}

        <div class="relative z-10 flex flex-col min-h-screen">
          <!-- Header -->
          <div id="app-header">
            ${this.header.render()}
          </div>

          <!-- Main content (router injects pages here) -->
          <main
            id="app-content"
            class="flex-1 max-w-[var(--max-width)] mx-auto w-full px-4 py-5 md:px-6 md:py-8"
          ></main>

          <!-- Footer -->
          <footer
            class="text-center py-4 px-4"
            style="border-top: 1px solid var(--color-gold-subtle)"
          >
            <span class="font-ui" style="font-size: 10px; letter-spacing: 0.12em; color: var(--color-text-dim)">
              BILIARDINO ELO RATING SYSTEM · SHARK SEASON · v<span id="pwa-version">—</span>
            </span>
          </footer>
        </div>
      </div>
    `;
  }

  mount(): void {
    this.header.mount();
  }

  destroy(): void {
    this.header.destroy();
  }
}
