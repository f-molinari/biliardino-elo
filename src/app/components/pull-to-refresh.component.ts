import { refreshCurrentView } from '@/services/app-refresh.service';
import haptics from '@/utils/haptics.util';
import { appState } from '../state';
import { html } from '../utils/html-template.util';
import { Component } from './component.base';
import template from './pull-to-refresh.component.html?raw';

const PREFLIGHT_HAPTIC = { duration: 20 };
const SUCCESS_HAPTIC = [{ duration: 50 }, { duration: 100, delay: 50 }];
const ERROR_HAPTIC = [{ duration: 100 }, { duration: 50, delay: 100 }];
const PULL_HAPTIC_STEPS = [8, 12, 16];
const ARM_THRESHOLD_PX = 72;
const MAX_PULL_PX = 120;
const IDLE_BAR = 'linear-gradient(90deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.95))';
const SUCCESS_BAR = 'linear-gradient(90deg, rgba(74, 222, 128, 0.3), rgba(74, 222, 128, 0.95))';
const ERROR_BAR = 'linear-gradient(90deg, rgba(248, 113, 113, 0.3), rgba(248, 113, 113, 0.95))';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

class LoadingBarComponent extends Component {
  private barEl: HTMLElement | null = null;
  private isRefreshing = false;
  private isTrackingPull = false;
  private activeTouchId: number | null = null;
  private startY = 0;
  private pullDistance = 0;
  private lastPullHapticStep = 0;
  private hasArmedHaptic = false;

  private onRefreshStartBound = (): void => this.showLoading();
  private onRefreshSuccessBound = (): void => this.showSuccess();
  private onRefreshErrorBound = (): void => this.showError();
  private onTouchStartBound = (event: TouchEvent): void => this.onTouchStart(event);
  private onTouchMoveBound = (event: TouchEvent): void => this.onTouchMove(event);
  private onTouchEndBound = (): void => this.onTouchEnd();
  private hideTimer: number | null = null;

  override render(): string {
    return html(template, {});
  }

  override mount(): void {
    const host = document.createElement('div');
    host.innerHTML = this.render();
    document.body.appendChild(host);
    this.el = host;

    this.barEl = this.$id('loading-bar');
    const containerEl = this.$id('loading-bar-container');
    const headerEl = this.$id('app-header-inner');

    if (!this.barEl || !containerEl) return;

    containerEl.style.cssText = `
      position: fixed;
      top: ${headerEl?.offsetHeight ?? 56}px;
      left: 0;
      right: 0;
      height: 2px;
      z-index: 48;
      background: transparent;
      overflow: hidden;
    `;

    this.barEl.style.cssText = `
      width: 0%;
      height: 100%;
      opacity: 0;
      background: ${IDLE_BAR};
      transition: width 0.3s ease;
      box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
    `;

    appState.on('app-refresh:start', this.onRefreshStartBound);
    appState.on('app-refresh:success', this.onRefreshSuccessBound);
    appState.on('app-refresh:error', this.onRefreshErrorBound);

    if (this.shouldHandlePullGesture()) {
      window.addEventListener('touchstart', this.onTouchStartBound, { passive: true });
      window.addEventListener('touchmove', this.onTouchMoveBound, { passive: false });
      window.addEventListener('touchend', this.onTouchEndBound, { passive: true });
      window.addEventListener('touchcancel', this.onTouchEndBound, { passive: true });
    }
  }

  override destroy(): void {
    appState.off('app-refresh:start', this.onRefreshStartBound);
    appState.off('app-refresh:success', this.onRefreshSuccessBound);
    appState.off('app-refresh:error', this.onRefreshErrorBound);

    window.removeEventListener('touchstart', this.onTouchStartBound);
    window.removeEventListener('touchmove', this.onTouchMoveBound);
    window.removeEventListener('touchend', this.onTouchEndBound);
    window.removeEventListener('touchcancel', this.onTouchEndBound);

    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.el?.remove();
    this.el = null;
    this.barEl = null;
  }

  private triggerHaptic(pattern: any): void {
    if (prefersReducedMotion) return;

    if ('vibrate' in navigator) {
      try {
        if (Array.isArray(pattern)) {
          navigator.vibrate(pattern.flatMap((pulse: { duration: number; delay?: number }) => {
            const sequence = [pulse.duration];
            if (typeof pulse.delay === 'number' && pulse.delay > 0) {
              sequence.push(pulse.delay);
            }
            return sequence;
          }));
        } else {
          navigator.vibrate(pattern.duration);
        }
      } catch (e) {
        // Silently fail
      }
    }

    try {
      if (Array.isArray(pattern)) {
        haptics.trigger(pattern, { intensity: 1 });
      } else {
        haptics.trigger([{ duration: pattern.duration }], { intensity: 1 });
      }
    } catch (e) {
      // Silently fail
    }
  }

  private shouldHandlePullGesture(): boolean {
    return document.body.classList.contains('pwa') && 'ontouchstart' in window;
  }

  private onTouchStart(event: TouchEvent): void {
    if (this.isRefreshing || this.isTrackingPull) return;
    if (event.touches.length !== 1) return;
    if (this.getScrollTop() > 2) return;

    const touch = event.touches[0];
    if (!touch) return;

    this.isTrackingPull = true;
    this.activeTouchId = touch.identifier;
    this.startY = touch.clientY;
    this.pullDistance = 0;
    this.lastPullHapticStep = 0;
    this.hasArmedHaptic = false;

    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.resetBarVisuals();
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.isTrackingPull || this.activeTouchId === null || !this.barEl) return;

    const touch = this.findTouch(event.touches, this.activeTouchId)
      ?? this.findTouch(event.changedTouches, this.activeTouchId);
    if (!touch) return;

    const deltaY = touch.clientY - this.startY;
    if (deltaY <= 0) {
      this.pullDistance = 0;
      this.updatePullPreview();
      return;
    }

    event.preventDefault();
    this.pullDistance = Math.min(MAX_PULL_PX, deltaY * 0.6);

    const pullStep = Math.min(
      PULL_HAPTIC_STEPS.length,
      Math.floor((this.pullDistance / ARM_THRESHOLD_PX) * PULL_HAPTIC_STEPS.length)
    );

    if (pullStep > this.lastPullHapticStep && pullStep <= PULL_HAPTIC_STEPS.length) {
      this.lastPullHapticStep = pullStep;
      const duration = PULL_HAPTIC_STEPS[pullStep - 1];
      if (duration) {
        this.triggerHaptic({ duration });
      }
    }

    if (this.pullDistance >= ARM_THRESHOLD_PX && !this.hasArmedHaptic) {
      this.hasArmedHaptic = true;
      this.triggerHaptic(PREFLIGHT_HAPTIC);
    }

    this.updatePullPreview();
  }

  private onTouchEnd(): void {
    if (!this.isTrackingPull) return;

    const shouldRefresh = this.pullDistance >= ARM_THRESHOLD_PX;

    this.isTrackingPull = false;
    this.activeTouchId = null;
    this.lastPullHapticStep = 0;
    this.hasArmedHaptic = false;

    if (shouldRefresh) {
      void refreshCurrentView();
      return;
    }

    this.pullDistance = 0;
    this.resetBar();
  }

  private updatePullPreview(): void {
    if (!this.barEl || this.isRefreshing) return;

    const progress = Math.max(0, Math.min(1, this.pullDistance / ARM_THRESHOLD_PX));
    const width = 16 + (progress * 52);

    this.barEl.style.transition = 'width 0.08s linear, opacity 0.12s ease';
    this.barEl.style.opacity = progress > 0 ? '1' : '0';
    this.barEl.style.width = `${width}%`;
  }

  private resetBarVisuals(): void {
    if (!this.barEl) return;

    this.barEl.style.width = '0%';
    this.barEl.style.opacity = '0';
    this.barEl.style.transition = 'none';
    this.barEl.style.background = IDLE_BAR;
  }

  private findTouch(touchList: TouchList, touchId: number): Touch | null {
    for (let index = 0; index < touchList.length; index += 1) {
      const touch = touchList.item(index);
      if (touch?.identifier === touchId) {
        return touch;
      }
    }

    return null;
  }

  private getScrollTop(): number {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  private showLoading(): void {
    if (!this.barEl) return;

    this.isRefreshing = true;
    this.isTrackingPull = false;
    this.activeTouchId = null;
    this.pullDistance = 0;
    this.lastPullHapticStep = 0;
    this.hasArmedHaptic = false;
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.barEl.style.background = IDLE_BAR;
    this.barEl.style.opacity = '1';
    this.barEl.style.width = '30%';
    this.barEl.style.transition = 'width 0.5s ease';

    this.hideTimer = window.setTimeout(() => {
      if (this.barEl) {
        this.barEl.style.width = '60%';
      }
    }, 500);
  }

  private showSuccess(): void {
    if (!this.barEl) return;

    this.isRefreshing = false;
    this.triggerHaptic(SUCCESS_HAPTIC);

    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.barEl.style.background = SUCCESS_BAR;
    this.barEl.style.transition = 'width 0.2s ease';
    this.barEl.style.width = '100%';

    this.hideTimer = window.setTimeout(() => {
      if (this.barEl) {
        this.barEl.style.transition = 'opacity 0.3s ease';
        this.barEl.style.opacity = '0';
        this.resetBar();
      }
    }, 800);
  }

  private showError(): void {
    if (!this.barEl) return;

    this.isRefreshing = false;
    this.triggerHaptic(ERROR_HAPTIC);

    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.barEl.style.background = ERROR_BAR;
    this.barEl.style.transition = 'width 0.2s ease';
    this.barEl.style.width = '100%';

    this.hideTimer = window.setTimeout(() => {
      if (this.barEl) {
        this.barEl.style.transition = 'opacity 0.3s ease';
        this.barEl.style.opacity = '0';
        this.resetBar();
      }
    }, 1200);
  }

  private resetBar(): void {
    if (!this.barEl) return;

    this.hideTimer = window.setTimeout(() => {
      if (this.barEl) {
        this.barEl.style.width = '0%';
        this.barEl.style.opacity = '0';
        this.barEl.style.transition = 'width 0.3s ease';
        this.barEl.style.background = IDLE_BAR;
      }
      this.hideTimer = null;
    }, 100);
  }
}

export const pullToRefresh = new LoadingBarComponent();
