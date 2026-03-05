/**
 * PullToRefresh — Native-like pull-to-refresh gesture for PWA.
 *
 * Behavior:
 * - When user scrolls down from top (scrollY ≈ 0), shows refresh indicator
 * - Pulling past threshold (80px) triggers page reload
 * - Smooth animations with GSAP
 */

import gsap from 'gsap';

export class PullToRefreshComponent {
  private touchStartY = 0;
  private currentPullDistance = 0;
  private isPulling = false;
  private isRefreshing = false;
  private container: HTMLElement | null = null;
  private indicator: HTMLElement | null = null;

  private readonly THRESHOLD = 80; // pixels to pull for refresh
  private readonly RESISTANCE = 0.5; // resistance factor while pulling

  init(contentContainer: HTMLElement): void {
    this.container = contentContainer;
    this.createIndicator();
    this.attachListeners();
  }

  private createIndicator(): void {
    this.indicator = document.createElement('div');
    this.indicator.id = 'pull-to-refresh-indicator';
    this.indicator.className = 'pull-to-refresh-indicator';
    document.documentElement.insertBefore(this.indicator, document.body);

    // Render initial HTML
    this.indicator.innerHTML = `
      <div class="pull-progress-bar"></div>
      <div class="pull-indicator-content">
        <div class="pull-spinner">
          <svg class="refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2-8.83"></path>
          </svg>
        </div>
        <span class="pull-text">Rilascia per ricaricare</span>
      </div>
    `;
  }

  private attachListeners(): void {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    appContent.addEventListener('touchstart', e => this.onTouchStart(e), { passive: true });
    appContent.addEventListener('touchmove', e => this.onTouchMove(e), { passive: true });
    appContent.addEventListener('touchend', e => this.onTouchEnd(e), { passive: true });
  }

  private onTouchStart(e: TouchEvent): void {
    // Only start pull if at the top of the scroll
    const appContent = document.getElementById('app-content');
    if (!appContent || appContent.scrollTop > 0) {
      this.isPulling = false;
      return;
    }

    this.touchStartY = e.touches[0].clientY;
    this.isPulling = true;
    this.currentPullDistance = 0;
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isPulling || this.isRefreshing) return;

    const appContent = document.getElementById('app-content');
    if (!appContent || appContent.scrollTop > 0) {
      this.isPulling = false;
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = currentY - this.touchStartY;

    if (distance <= 0) {
      this.isPulling = false;
      this.currentPullDistance = 0;
      this.updateIndicator(0);
      return;
    }

    // Apply resistance: full distance with decreasing pull
    this.currentPullDistance = distance * this.RESISTANCE;

    this.updateIndicator(this.currentPullDistance);
  }

  private updateIndicator(distance: number): void {
    if (!this.indicator) return;

    const progress = Math.min(distance / this.THRESHOLD, 1);
    const percentage = Math.round(progress * 100);

    // Update progress bar height
    const bar = this.indicator.querySelector('.pull-progress-bar') as HTMLElement;
    if (bar) {
      bar.style.height = `${Math.min(distance, this.THRESHOLD)}px`;
    }

    // Update spinner rotation
    const spinner = this.indicator.querySelector('.pull-spinner') as HTMLElement;
    if (spinner) {
      gsap.to(spinner, {
        rotation: progress * 360,
        duration: 0.1,
        overwrite: 'auto'
      });
    }

    // Update text
    const text = this.indicator.querySelector('.pull-text') as HTMLElement;
    if (text) {
      text.textContent = distance >= this.THRESHOLD ? 'Rilascia per ricaricare' : `${percentage}% ricaricare`;
    }

    // Show/hide indicator
    if (distance > 0 && !this.indicator.classList.contains('visible')) {
      this.indicator.classList.add('visible');
      gsap.to(this.indicator, { opacity: 1, duration: 0.2 });
    } else if (distance === 0 && this.indicator.classList.contains('visible')) {
      gsap.to(this.indicator, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => this.indicator?.classList.remove('visible')
      });
    }
  }

  private onTouchEnd(): void {
    if (!this.isPulling) return;

    this.isPulling = false;

    // Check if threshold reached
    if (this.currentPullDistance >= this.THRESHOLD) {
      this.triggerRefresh();
    } else {
      // Reset animation
      gsap.to(this.indicator, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          if (this.indicator) {
            this.indicator.classList.remove('visible');
            const bar = this.indicator.querySelector('.pull-progress-bar') as HTMLElement;
            if (bar) bar.style.height = '0';
          }
          this.currentPullDistance = 0;
        }
      });
    }
  }

  private triggerRefresh(): void {
    if (this.isRefreshing) return;

    this.isRefreshing = true;

    // Show loading state
    if (this.indicator) {
      const text = this.indicator.querySelector('.pull-text') as HTMLElement;
      if (text) text.textContent = 'Ricaricamento...';

      const spinner = this.indicator.querySelector('.pull-spinner') as HTMLElement;
      if (spinner) {
        // Continuous spinning animation
        gsap.to(spinner, {
          rotation: '+=360',
          duration: 1,
          repeat: -1,
          ease: 'none'
        });
      }
    }

    // Reload after short delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  destroy(): void {
    if (this.indicator) {
      this.indicator.remove();
    }
  }
}
