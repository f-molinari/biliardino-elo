import { refreshCurrentView } from '@/services/app-refresh.service';
import haptics from '@/utils/haptics.util';
import gsap from 'gsap';
import { appState } from '../state';
import { html, rawHtml } from '../utils/html-template.util';
import kickPlayerSVG from './brodcast-kick.svg?raw';
import { Component } from './component.base';
import template from './pull-to-refresh.component.html?raw';

type PullRefreshState = 'idle' | 'pulling' | 'armed' | 'refreshing' | 'success' | 'error';

const HEADER_GAP_PX = 8;
const ARM_THRESHOLD_PX = 68;
const MAX_PULL_PX = 96;
const HOLD_VISIBLE_PX = 74;
const SUCCESS_VISIBLE_MS = 920;
const SVG_ROTATION_ORIGIN = '62 88';

// Haptic feedback patterns
const HAPTIC_PATTERNS = {
  pulling: { duration: 10 },
  armed: { duration: 20 },
  refreshing: { duration: 30 },
  success: [{ duration: 50 }, { duration: 100, delay: 50 }],
  error: [{ duration: 100 }, { duration: 50, delay: 100 }]
};

// Check if prefers-reduced-motion is enabled
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

class PullToRefreshComponent extends Component {
  private shellEl: HTMLElement | null = null;
  private labelEl: HTMLElement | null = null;
  private hintEl: HTMLElement | null = null;
  private kickerEl: HTMLElement | null = null;
  private kickerBodyEl: HTMLElement | null = null;
  private ballEl: HTMLElement | null = null;
  private kickTimeline: gsap.core.Timeline | null = null;

  private state: PullRefreshState = 'idle';
  private startY = 0;
  private lastMoveY = 0;
  private lastMoveTs = 0;
  private activeTouchId: number | null = null;
  private pullDistance = 0;
  private kickPower = 0.65;
  private tracking = false;
  private isRefreshing = false;
  private resetTimer: number | null = null;

  private onTouchStartBound = (event: TouchEvent): void => this.onTouchStart(event);
  private onTouchMoveBound = (event: TouchEvent): void => this.onTouchMove(event);
  private onTouchEndBound = (): void => this.onTouchEnd();
  private onRouteChangeBound = (): void => this.syncHeaderOffset();
  private onResizeBound = (): void => this.syncHeaderOffset();
  private onRefreshStartBound = (): void => this.showRefreshingState();
  private onRefreshSuccessBound = (): void => this.showResultState('success');
  private onRefreshErrorBound = (): void => this.showResultState('error');

  private triggerHaptic(pattern: any): void {
    if ('vibrate' in navigator) {
      try {
        if (Array.isArray(pattern)) {
          navigator.vibrate(pattern);
        } else {
          navigator.vibrate(pattern.duration);
        }
      } catch (e) {
        // Silently fail if vibration is not available
      }
    }
    // Try WebHaptics as fallback
    try {
      if (Array.isArray(pattern)) {
        pattern.forEach((p: any) =>
          setTimeout(() => haptics.light(), p.delay ?? 0)
        );
      } else {
        haptics.light();
      }
    } catch (e) {
      // Silently fail if haptics unavailable
    }
  }

  override render(): string {
    const pullKickSvg = kickPlayerSVG.replace('id="kick-player-body"', 'id="ptr-kick-player-body"');

    return html(template, {
      label: 'Tira per aggiornare',
      hint: 'Nuovi dati senza ricaricare la pagina',
      kickPlayerSvg: rawHtml(pullKickSvg)
    });
  }

  override mount(): void {
    if (this.el) return;

    const host = document.createElement('div');
    host.id = 'pull-refresh-host';
    host.innerHTML = this.render();
    document.body.appendChild(host);
    this.setElement(host);

    this.shellEl = this.$('#pull-refresh-shell');
    this.labelEl = this.$('#pull-refresh-label');
    this.hintEl = this.$('#pull-refresh-hint');
    this.kickerEl = this.$('#ptr-kick-player');
    this.kickerBodyEl = this.$('#ptr-kick-player-body');
    this.ballEl = this.$('#ptr-ball');

    this.resetKickScene();

    this.syncHeaderOffset();
    this.setState('idle');

    if ('ontouchstart' in window) {
      window.addEventListener('touchstart', this.onTouchStartBound, { passive: true });
      window.addEventListener('touchmove', this.onTouchMoveBound, { passive: false });
      window.addEventListener('touchend', this.onTouchEndBound, { passive: true });
      window.addEventListener('touchcancel', this.onTouchEndBound, { passive: true });
    }

    window.addEventListener('resize', this.onResizeBound);
    appState.on('route-change', this.onRouteChangeBound);
    appState.on('app-refresh:start', this.onRefreshStartBound);
    appState.on('app-refresh:success', this.onRefreshSuccessBound);
    appState.on('app-refresh:error', this.onRefreshErrorBound);
  }

  override destroy(): void {
    window.removeEventListener('touchstart', this.onTouchStartBound);
    window.removeEventListener('touchmove', this.onTouchMoveBound);
    window.removeEventListener('touchend', this.onTouchEndBound);
    window.removeEventListener('touchcancel', this.onTouchEndBound);
    window.removeEventListener('resize', this.onResizeBound);

    appState.off('route-change', this.onRouteChangeBound);
    appState.off('app-refresh:start', this.onRefreshStartBound);
    appState.off('app-refresh:success', this.onRefreshSuccessBound);
    appState.off('app-refresh:error', this.onRefreshErrorBound);

    if (this.resetTimer !== null) {
      window.clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    this.killKickAnimation();

    this.el?.remove();
    this.el = null;
    this.shellEl = null;
    this.labelEl = null;
    this.hintEl = null;
    this.kickerEl = null;
    this.kickerBodyEl = null;
    this.ballEl = null;
  }

  private onTouchStart(event: TouchEvent): void {
    if (this.isRefreshing || this.tracking) return;
    if (event.touches.length !== 1) return;
    if (window.scrollY > 2) return;

    const touch = event.touches[0];
    const target = event.target as HTMLElement | null;
    if (!touch || !target) return;
    if (this.isInteractiveTarget(target) || this.hasScrollableAncestor(target)) return;

    this.clearResetTimer();
    this.tracking = true;
    this.activeTouchId = touch.identifier;
    this.startY = touch.clientY;
    this.lastMoveY = touch.clientY;
    this.lastMoveTs = performance.now();
    this.pullDistance = 0;
    this.kickPower = 0.65;
    this.setState('pulling');
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.tracking || this.activeTouchId === null) return;

    const touch = this.findTouch(event.changedTouches, this.activeTouchId)
      ?? this.findTouch(event.touches, this.activeTouchId);
    if (!touch) return;

    const deltaY = touch.clientY - this.startY;
    const now = performance.now();
    const moveDelta = touch.clientY - this.lastMoveY;
    const moveDt = now - this.lastMoveTs;
    if (moveDt > 0) {
      const velocity = Math.max(0, moveDelta / moveDt);
      const velocityPower = Math.min(1, velocity / 1.1);
      const distancePower = Math.min(1, this.pullDistance / ARM_THRESHOLD_PX);
      this.kickPower = Math.max(this.kickPower * 0.75, velocityPower * 0.55 + distancePower * 0.45);
    }
    this.lastMoveY = touch.clientY;
    this.lastMoveTs = now;

    if (deltaY <= 0) {
      this.pullDistance = 0;
      this.updateVisualState();
      return;
    }

    event.preventDefault();
    this.pullDistance = Math.min(MAX_PULL_PX, deltaY * 0.58);
    this.setState(this.pullDistance >= ARM_THRESHOLD_PX ? 'armed' : 'pulling');
  }

  private onTouchEnd(): void {
    if (!this.tracking) return;

    this.tracking = false;
    this.activeTouchId = null;

    if (this.state === 'armed') {
      const distancePower = Math.min(1, this.pullDistance / MAX_PULL_PX);
      this.kickPower = Math.max(0.4, Math.min(1, this.kickPower * 0.7 + distancePower * 0.6));
      void refreshCurrentView();
      return;
    }

    this.pullDistance = 0;
    this.setState('idle');
  }

  private showRefreshingState(): void {
    this.isRefreshing = true;
    this.pullDistance = HOLD_VISIBLE_PX;
    this.setState('refreshing');
    this.playKickAnimation();
  }

  private showResultState(state: 'success' | 'error'): void {
    this.isRefreshing = false;
    this.pullDistance = HOLD_VISIBLE_PX;
    this.setState(state);
    this.clearResetTimer();
    this.resetTimer = window.setTimeout(() => {
      this.pullDistance = 0;
      this.setState('idle');
    }, SUCCESS_VISIBLE_MS);
  }

  private setState(nextState: PullRefreshState): void {
    if (this.state === nextState) return;

    const prevState = this.state;
    this.state = nextState;

    // Trigger haptic feedback on state transitions (unless user prefers reduced motion)
    if (!prefersReducedMotion) {
      if (nextState === 'armed' && prevState === 'pulling') {
        this.triggerHaptic(HAPTIC_PATTERNS.armed);
      }
      if (nextState === 'success') {
        this.triggerHaptic(HAPTIC_PATTERNS.success);
      }
      if (nextState === 'error') {
        this.triggerHaptic(HAPTIC_PATTERNS.error);
      }
    }

    this.updateVisualState();
  }

  private updateVisualState(): void {
    if (!this.shellEl || !this.labelEl || !this.hintEl) return;

    this.shellEl.dataset.state = this.state;
    const visibleOffset = this.state === 'idle'
      ? 0
      : this.state === 'refreshing' || this.state === 'success' || this.state === 'error'
        ? HOLD_VISIBLE_PX
        : this.pullDistance;
    const progress = this.state === 'refreshing' || this.state === 'success' || this.state === 'error'
      ? 1
      : Math.max(0.08, Math.min(1, this.pullDistance / ARM_THRESHOLD_PX));

    this.shellEl.style.setProperty('--ptr-offset', `${visibleOffset}px`);
    this.shellEl.style.setProperty('--ptr-progress', progress.toString());

    if (this.state === 'pulling' || this.state === 'armed') {
      this.applyPullPose(progress);
    }

    if (this.state === 'idle') {
      this.resetKickScene();
    }

    if (this.state === 'success') {
      this.playResultPulse(false);
    }

    if (this.state === 'error') {
      this.playResultPulse(true);
    }

    switch (this.state) {
      case 'armed':
        this.labelEl.textContent = 'Rilascia per aggiornare';
        this.hintEl.textContent = 'Aggiorniamo solo i dati nuovi';
        break;
      case 'refreshing':
        this.labelEl.textContent = 'Aggiornamento dati...';
        this.hintEl.textContent = 'La pagina resta stabile mentre sincronizziamo';
        break;
      case 'success':
        this.labelEl.textContent = 'Dati aggiornati';
        this.hintEl.textContent = 'La classifica e le sezioni visibili sono ora allineate';
        break;
      case 'error':
        this.labelEl.textContent = 'Aggiornamento non riuscito';
        this.hintEl.textContent = 'Riprova tirando di nuovo verso il basso';
        break;
      case 'pulling':
        this.labelEl.textContent = 'Tira per aggiornare';
        this.hintEl.textContent = 'Nuovi dati senza ricaricare la pagina';
        break;
      default:
        this.labelEl.textContent = 'Tira per aggiornare';
        this.hintEl.textContent = 'Nuovi dati senza ricaricare la pagina';
        break;
    }
  }

  private syncHeaderOffset(): void {
    if (!this.shellEl) return;

    const headerHeight = document.getElementById('app-header')?.getBoundingClientRect().height ?? 56;
    this.shellEl.style.setProperty('--ptr-header-offset', `${headerHeight + HEADER_GAP_PX}px`);
  }

  private isInteractiveTarget(target: HTMLElement): boolean {
    return !!target.closest('a, button, input, textarea, select, [role="button"], [data-nav]');
  }

  private hasScrollableAncestor(target: HTMLElement): boolean {
    let current: HTMLElement | null = target;

    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      const scrollable = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
        && current.scrollHeight > current.clientHeight;

      if (scrollable) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }

  private findTouch(touchList: TouchList, identifier: number): Touch | null {
    for (let index = 0; index < touchList.length; index++) {
      if (touchList[index].identifier === identifier) {
        return touchList[index];
      }
    }

    return null;
  }

  private clearResetTimer(): void {
    if (this.resetTimer !== null) {
      window.clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  private applyPullPose(progress: number): void {
    if (!this.kickerEl || !this.kickerBodyEl || !this.ballEl) return;
    if (this.kickTimeline) return;

    const clamped = Math.max(0, Math.min(1, progress));
    const bob = Math.sin(clamped * Math.PI) * 1.8;

    gsap.set(this.kickerEl, {
      x: 18 - clamped * 16,
      y: -bob,
      opacity: 0.62 + clamped * 0.38
    });

    gsap.set(this.kickerBodyEl, {
      rotation: 8 - clamped * 36,
      svgOrigin: SVG_ROTATION_ORIGIN
    });

    gsap.set(this.ballEl, {
      x: clamped * 1.8,
      y: -Math.sin(clamped * Math.PI * 0.8) * 1.2,
      scale: 0.94 + clamped * 0.12,
      rotate: clamped * 20
    });
  }

  private playKickAnimation(): void {
    if (!this.kickerEl || !this.kickerBodyEl || !this.ballEl) return;

    this.killKickAnimation();

    const power = Math.max(0.4, Math.min(1, this.kickPower));
    const kickRotation = 54 + power * 24;
    const flightX = -12 - power * 14;
    const flightY = -4 - power * 5;
    const settleX = -7 - power * 3;
    const initialKickDuration = 0.19 - power * 0.04;
    const flightDuration = 0.24 - power * 0.05;

    gsap.set(this.kickerEl, { x: 0.6, y: 0, opacity: 1 });
    gsap.set(this.kickerBodyEl, { rotation: -20, svgOrigin: SVG_ROTATION_ORIGIN });
    gsap.set(this.ballEl, { x: 0, y: 0, scale: 1, rotate: 0 });

    this.kickTimeline = gsap.timeline({
      onComplete: () => {
        this.kickTimeline = null;
      }
    });

    this.kickTimeline
      .to(this.kickerBodyEl, {
        rotation: -34,
        duration: 0.12,
        ease: 'power2.out',
        svgOrigin: SVG_ROTATION_ORIGIN
      })
      .to(this.ballEl, {
        scaleX: 0.86,
        scaleY: 1.12,
        duration: 0.06,
        ease: 'power1.out'
      }, '-=0.06')
      .to(this.kickerBodyEl, {
        rotation: kickRotation,
        duration: initialKickDuration,
        ease: 'power2.inOut',
        svgOrigin: SVG_ROTATION_ORIGIN
      })
      .to(this.ballEl, {
        x: flightX,
        y: flightY,
        rotate: 170 + power * 150,
        scaleX: 1,
        scaleY: 1,
        duration: flightDuration,
        ease: 'power2.out'
      }, '-=0.12')
      .to(this.ballEl, {
        x: settleX,
        y: 0,
        rotate: 230 + power * 150,
        duration: 0.22,
        ease: 'sine.inOut'
      })
      .to(this.kickerBodyEl, {
        rotation: 12,
        duration: 0.18,
        ease: 'power2.out',
        svgOrigin: SVG_ROTATION_ORIGIN
      }, '-=0.18');
  }

  private playResultPulse(isError: boolean): void {
    if (!this.ballEl) return;

    gsap.killTweensOf(this.ballEl);

    if (isError) {
      gsap.fromTo(this.ballEl,
        { x: -8 },
        {
          x: -4,
          duration: 0.06,
          repeat: 3,
          yoyo: true,
          ease: 'power1.inOut'
        }
      );
      return;
    }

    gsap.fromTo(this.ballEl,
      { scale: 0.94 },
      {
        scale: 1.06,
        duration: 0.18,
        repeat: 1,
        yoyo: true,
        ease: 'power2.inOut'
      }
    );
  }

  private resetKickScene(): void {
    if (!this.kickerEl || !this.kickerBodyEl || !this.ballEl) return;

    this.killKickAnimation();
    gsap.set(this.kickerEl, { x: 18, y: 0, opacity: 0.62 });
    gsap.set(this.kickerBodyEl, { rotation: 8, svgOrigin: SVG_ROTATION_ORIGIN });
    gsap.set(this.ballEl, { x: 0, y: 0, scale: 0.95, rotate: 0 });
    this.kickPower = 0.65;
  }

  private killKickAnimation(): void {
    this.kickTimeline?.kill();
    this.kickTimeline = null;

    if (this.kickerEl) gsap.killTweensOf(this.kickerEl);
    if (this.kickerBodyEl) gsap.killTweensOf(this.kickerBodyEl);
    if (this.ballEl) gsap.killTweensOf(this.ballEl);
  }
}

export const pullToRefresh = new PullToRefreshComponent();