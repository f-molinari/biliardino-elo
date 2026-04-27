/**
 * BottomNavComponent — Sticky bottom tab bar for mobile navigation.
 *
 * Primary tabs (Classifica, Lobby, Stats) are always visible.
 * "Admin" tab appears only when the user is admin — it opens the
 * MobileDrawerComponent to access admin-only pages.
 * Hidden entirely on md+ breakpoint via Tailwind's md:hidden class.
 *
 * A single sliding gold indicator bar animates between active tabs.
 */

import gsap from 'gsap';
import haptics from '../../utils/haptics.util';
import { refreshIcons } from '../icons';
import { router } from '../router';
import { appState } from '../state';
import { html, rawHtml } from '../utils/html-template.util';
import template from './bottom-nav.component.html?raw';
import { mobileDrawer } from './mobile-drawer.component';

interface TabItem {
  icon: string;
  label: string;
  path: string | null;
  id: string;
  adminOnly?: boolean;
}

const TABS: TabItem[] = [
  { icon: 'trophy', label: 'Classifica', path: '/', id: 'tab-classifica' },
  { icon: 'users', label: 'Lobby', path: '/lobby', id: 'tab-lobby' },
  { icon: 'bar-chart-3', label: 'Stats', path: '/stats', id: 'tab-stats' },
  { icon: 'shield', label: 'Admin', path: null, id: 'tab-menu', adminOnly: true }
];

/** Routes owned by the admin drawer — activates the Admin tab. */
const ADMIN_PATHS = ['/matchmaking', '/add-match', '/add-player'];

class BottomNavComponent {
  private navEl: HTMLElement | null = null;
  private sliderEl: HTMLElement | null = null;
  private handleRouteChange: (() => void) | null = null;
  private onAdminChange: (() => void) | null = null;

  /* ── Mount / Destroy ─────────────────────────────────────── */

  mount(): void {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html(template, {
      tabs: rawHtml(this.renderTabs(router.getCurrentPath()))
    });
    document.body.appendChild(wrapper.firstElementChild!);
    this.navEl = document.getElementById('bottom-nav');
    this.sliderEl = document.getElementById('bottom-nav-slider');

    refreshIcons();
    this.bindClicks();
    this.updateMenuVisibility();

    // Position slider on the current active tab without animation
    // (must run after updateMenuVisibility so admin tab visibility is set)
    const activeTab = this.getActiveTabId(router.getCurrentPath());
    const activeBtn = document.getElementById(activeTab);
    if (activeBtn && activeBtn.style.display !== 'none') {
      this.animateSlider(activeTab, true);
    }

    this.handleRouteChange = () => this.updateActiveStates();
    appState.on('route-change', this.handleRouteChange);
    globalThis.addEventListener('popstate', this.handleRouteChange);

    this.onAdminChange = () => {
      this.updateMenuVisibility();
      this.updateActiveStates();
    };
    globalThis.addEventListener('user-dropdown:login-success', this.onAdminChange);
    globalThis.addEventListener('user-dropdown:logout', this.onAdminChange);
  }

  destroy(): void {
    if (this.handleRouteChange) {
      appState.off('route-change', this.handleRouteChange);
      globalThis.removeEventListener('popstate', this.handleRouteChange);
    }
    if (this.onAdminChange) {
      globalThis.removeEventListener('user-dropdown:login-success', this.onAdminChange);
      globalThis.removeEventListener('user-dropdown:logout', this.onAdminChange);
    }
    this.navEl?.remove();
  }

  /* ── Private ─────────────────────────────────────────────── */

  private renderTabs(currentPath: string): string {
    return TABS.map((tab) => {
      const isActive = tab.path !== null && (
        tab.path === '/' ? currentPath === '/' : currentPath.startsWith(tab.path)
      );
      return `
        <button id="${tab.id}"
          class="group relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${isActive ? 'text-(--color-gold)' : 'text-[#6b716e] hover:text-[#9ca19f]'}"
          style="font-family:var(--font-ui);font-size:9px;letter-spacing:0.08em${tab.adminOnly ? ';display:none' : ''}">
          <i data-lucide="${tab.icon}" style="width:20px;height:20px;transition:transform 0.2s ease"></i>
          <span>${tab.label.toUpperCase()}</span>
        </button>
      `;
    }).join('');
  }

  private bindClicks(): void {
    TABS.forEach((tab) => {
      document.getElementById(tab.id)?.addEventListener('click', () => {
        haptics.trigger('selection');
        if (tab.path === null) {
          mobileDrawer.toggle();
        } else {
          router.navigate(tab.path);
        }
      });
    });
  }

  private getActiveTabId(currentPath: string): string {
    if (ADMIN_PATHS.some(p => currentPath.startsWith(p))) return 'tab-menu';
    for (const tab of TABS) {
      if (tab.path === null) continue;
      if (tab.path === '/' ? currentPath === '/' : currentPath.startsWith(tab.path)) {
        return tab.id;
      }
    }
    return TABS[0].id;
  }

  private updateActiveStates(): void {
    const currentPath = router.getCurrentPath();
    const activeTabId = this.getActiveTabId(currentPath);

    TABS.forEach((tab) => {
      const btn = document.getElementById(tab.id);
      if (!btn) return;
      const isActive = tab.id === activeTabId;
      btn.classList.toggle('text-(--color-gold)', isActive);
      btn.classList.toggle('text-[#6b716e]', !isActive);

      const icon = btn.querySelector<HTMLElement>('i[data-lucide]');
      if (icon) {
        icon.style.transform = isActive ? 'scale(1.15) translateY(-1px)' : 'scale(1) translateY(0)';
      }
    });

    // Only animate slider to visible tabs
    const activeBtn = document.getElementById(activeTabId);
    if (activeBtn && activeBtn.style.display !== 'none') {
      this.animateSlider(activeTabId);
    }
  }

  private animateSlider(tabId: string, instant = false): void {
    const btn = document.getElementById(tabId);
    if (!btn || !this.sliderEl) return;
    const targetX = btn.offsetLeft + btn.offsetWidth / 2 - 12;
    if (instant) {
      gsap.set(this.sliderEl, { x: targetX });
    } else {
      gsap.to(this.sliderEl, { x: targetX, duration: 0.3, ease: 'power2.inOut' });
    }
  }

  private updateMenuVisibility(): void {
    const menuBtn = document.getElementById('tab-menu');
    if (!menuBtn) return;
    menuBtn.style.display = appState.isAdmin ? '' : 'none';
  }
}

export const bottomNav = new BottomNavComponent();
