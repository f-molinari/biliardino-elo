/**
 * Header — Responsive navigation header with mobile menu.
 * Ported from Figma: Header.tsx
 *
 * La user pill (desktop) e l'avatar (mobile) aprono la UserDropdown
 * che gestisce identità, notifiche e login admin.
 */

import gsap from 'gsap';
import { refreshIcons } from '../icons';
import { userDropdown } from './user-dropdown.component';
import { router } from '../router';
import { appState } from '../state';
import { renderFoosballLogo } from './foosball-logo.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Classifica', icon: 'trophy' },
  { path: '/matchmaking', label: 'Matchmaking', icon: 'swords', adminOnly: true },
  { path: '/lobby', label: 'Lobby', icon: 'users' },
  { path: '/add-match', label: 'Partita', icon: 'plus-circle', adminOnly: true },
  { path: '/add-player', label: 'Giocatore', icon: 'user-plus', adminOnly: true },
];

export class HeaderComponent {
  private menuOpen = false;
  private handleHashChange: (() => void) | null = null;

  render(): string {
    const currentPath = router.getCurrentPath();
    const playerName = appState.currentPlayerName ?? 'Guest';
    const playerInitials = playerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'G';

    return `
      <header
        id="app-header-inner"
        class="relative z-50 w-full"
        style="
          background: linear-gradient(180deg, var(--color-bg-header-from) 0%, var(--color-bg-header-to) 100%);
          border-bottom: 1px solid var(--glass-border-gold);
          backdrop-filter: blur(12px);
        "
      >
        <div class="max-w-[var(--max-width)] mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <!-- Logo -->
          <a href="#/" class="flex items-center gap-2 md:gap-3 group" data-nav>
            <div class="flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
              ${renderFoosballLogo(44, '#FFD700')}
            </div>
            <div class="hidden sm:block">
              <div class="text-[var(--color-gold)] tracking-[0.15em] font-ui" style="font-size: 11px; font-weight: 500">
                BILIARDINO ELO
              </div>
              <div class="text-white tracking-[0.2em] font-display" style="font-size: 20px; line-height: 1">
                SHARK SEASON
              </div>
            </div>
            <div class="sm:hidden">
              <div class="text-white tracking-[0.15em] font-display" style="font-size: 17px; line-height: 1">
                BILIARDINO ELO
              </div>
            </div>
          </a>

          <!-- Desktop Navigation -->
          <nav class="hidden md:flex items-center gap-1" id="desktop-nav">
            ${navItems.map(item => {
      const isActive = this.isActive(item.path, currentPath);
      const hiddenClass = item.adminOnly ? 'data-admin-only' : '';
      return `
                <a
                  href="#${item.path}"
                  ${hiddenClass}
                  class="nav-link flex items-center gap-1.5 px-3 py-2 rounded-md transition-all duration-200 ${isActive
          ? 'text-[var(--color-gold)] bg-[rgba(255,215,0,0.12)]'
          : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
        }"
                  style="font-family: var(--font-ui); font-size: 13px; letter-spacing: 0.08em"
                >
                  <i data-lucide="${item.icon}" style="width:15px;height:15px"></i>
                  ${item.label}
                </a>
              `;
    }).join('')}
          </nav>

          <!-- Right area -->
          <div class="flex items-center gap-2">
            <!-- Desktop user pill — opens UserDropdown -->
            <button
              id="user-pill"
              class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 hover:bg-white/10"
              style="border: 1px solid var(--glass-border-gold)"
              aria-label="Apri profilo utente"
            >
              <!-- Avatar with notification dot -->
              <div class="relative flex-shrink-0">
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-[#FFD700]/40"
                  style="background: linear-gradient(135deg, #E8A020dd, #E8A02088)"
                >
                  <span class="font-ui text-white" data-user-initials style="font-size: 11px">${playerInitials}</span>
                </div>
                <div
                  id="notif-state-dot"
                  class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                  style="background:transparent;ring:2px solid var(--color-bg-deep);display:none;box-shadow:0 0 0 2px var(--color-bg-deep)"
                ></div>
              </div>
              <span class="text-white/90 font-ui" data-user-name style="font-size: 13px">${playerName}</span>
              <svg
                id="user-pill-chevron"
                width="13" height="13" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"
                class="text-white/50 transition-transform"
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            <!-- Mobile avatar button — opens UserDropdown -->
            <button
              id="user-pill-mobile"
              class="md:hidden relative flex items-center justify-center w-8 h-8 rounded-full ring-2 ring-[#FFD700]/40 transition-all duration-200 hover:ring-[#FFD700]/70"
              style="background: linear-gradient(135deg, #E8A020dd, #E8A02088)"
              aria-label="Apri profilo utente"
            >
              <span class="font-ui text-white" data-user-initials style="font-size: 12px">${playerInitials}</span>
              <div
                id="notif-state-dot-mobile"
                class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                style="background:transparent;display:none;box-shadow:0 0 0 2px var(--color-bg-deep)"
              ></div>
            </button>

            <!-- Hamburger -->
            <button
              id="mobile-menu-toggle"
              class="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:bg-white/10"
              style="border: 1px solid rgba(255,255,255,0.1)"
              aria-label="Toggle menu"
            >
              <i data-lucide="menu" style="width:18px;height:18px" class="text-white" id="menu-icon-open"></i>
              <i data-lucide="x" style="width:18px;height:18px;display:none" class="text-white" id="menu-icon-close"></i>
            </button>
          </div>
        </div>

        <!-- Gold accent line -->
        <div class="absolute bottom-0 left-0 right-0 h-px gold-line"></div>
      </header>

      <!-- Mobile slide-down menu -->
      <div
        id="mobile-menu"
        class="md:hidden fixed left-0 right-0 z-40"
        style="
          top: 3.5rem;
          background: rgba(10,22,16,0.97);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--glass-border-gold);
          display: none;
        "
      >
        <nav class="flex flex-col p-3 gap-1">
          ${navItems.map(item => {
      const isActive = this.isActive(item.path, currentPath);
      const hiddenAttr = item.adminOnly ? 'data-admin-only' : '';
      return `
              <a
                href="#${item.path}"
                ${hiddenAttr}
                class="mobile-nav-link flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-200 ${isActive
          ? 'text-[var(--color-gold)] bg-[rgba(255,215,0,0.12)]'
          : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
        }"
                style="font-family: var(--font-ui); font-size: 15px; letter-spacing: 0.08em"
              >
                <i data-lucide="${item.icon}" style="width:18px;height:18px"></i>
                ${item.label}
                ${isActive ? '<div class="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]"></div>' : ''}
              </a>
            `;
    }).join('')}
        </nav>

        <!-- User info + quick access to dropdown -->
        <button
          id="mobile-menu-user"
          class="mx-3 mb-3 px-4 py-3 rounded-lg flex items-center gap-3 w-[calc(100%-24px)] transition-all hover:bg-white/[0.06]"
          style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08)"
        >
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center ring-2 ring-[#FFD700]/40 flex-shrink-0"
            style="background: linear-gradient(135deg, #E8A020dd, #E8A02088)"
          >
            <span class="font-ui text-white" data-user-initials style="font-size: 13px">${playerInitials}</span>
          </div>
          <div class="flex-1 text-left">
            <div class="font-ui text-white" data-user-name style="font-size: 14px">${playerName}</div>
            <div class="font-body" style="font-size: 11px; color: rgba(255,215,0,0.6)">
              Tocca per profilo e notifiche
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-white/30"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    `;
  }

  mount(): void {
    refreshIcons();

    /* ── User pill / avatar → open dropdown ─── */
    document.getElementById('user-pill')?.addEventListener('click', () => userDropdown.toggle());
    document.getElementById('user-pill-mobile')?.addEventListener('click', () => {
      userDropdown.toggle();
    });
    document.getElementById('mobile-menu-user')?.addEventListener('click', () => {
      /* Close mobile nav first, then open dropdown */
      const mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu) {
        this.menuOpen = false;
        mobileMenu.style.display = 'none';
        const iconOpen = document.getElementById('menu-icon-open');
        const iconClose = document.getElementById('menu-icon-close');
        if (iconOpen) iconOpen.style.display = 'block';
        if (iconClose) iconClose.style.display = 'none';
      }
      setTimeout(() => userDropdown.open(), 50);
    });

    /* ── Mobile hamburger ─── */
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const iconOpen = document.getElementById('menu-icon-open');
    const iconClose = document.getElementById('menu-icon-close');

    toggleBtn?.addEventListener('click', () => {
      this.menuOpen = !this.menuOpen;
      if (this.menuOpen && mobileMenu) {
        mobileMenu.style.display = 'block';
        gsap.fromTo(mobileMenu, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.18 });
        if (iconOpen) iconOpen.style.display = 'none';
        if (iconClose) iconClose.style.display = 'block';
      } else if (mobileMenu) {
        gsap.to(mobileMenu, {
          opacity: 0, y: -10, duration: 0.15,
          onComplete: () => { mobileMenu.style.display = 'none'; },
        });
        if (iconOpen) iconOpen.style.display = 'block';
        if (iconClose) iconClose.style.display = 'none';
      }
    });

    mobileMenu?.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        this.menuOpen = false;
        if (mobileMenu) mobileMenu.style.display = 'none';
        if (iconOpen) iconOpen.style.display = 'block';
        if (iconClose) iconClose.style.display = 'none';
      });
    });

    /* ── Active state on route change ─── */
    this.handleHashChange = () => this.updateActiveStates();
    window.addEventListener('hashchange', this.handleHashChange);
  }

  destroy(): void {
    if (this.handleHashChange) {
      window.removeEventListener('hashchange', this.handleHashChange);
    }
  }

  private updateActiveStates(): void {
    const currentPath = router.getCurrentPath();
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const path = href.replace('#', '');
      const isActive = this.isActive(path, currentPath);
      link.classList.toggle('text-[var(--color-gold)]', isActive);
      link.classList.toggle('bg-[rgba(255,215,0,0.12)]', isActive);
      link.classList.toggle('text-white/70', !isActive);
    });
  }

  private isActive(itemPath: string, currentPath: string): boolean {
    if (itemPath === '/') return currentPath === '/';
    return currentPath.startsWith(itemPath);
  }
}
