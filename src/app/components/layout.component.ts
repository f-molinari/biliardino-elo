/**
 * Layout — Root shell wrapping the entire SPA.
 * Contains: FieldBackground, Header, main content area, footer.
 * The login dialog has been replaced by the UserDropdown singleton.
 */

import { bindHtml, rawHtml } from '../utils/html-template.util';
import { renderFieldBackground } from './field-background.component';
import { HeaderComponent } from './header.component';
import template from './layout.component.html?raw';
import { PullToRefreshComponent } from './pull-to-refresh.component';

export class LayoutComponent {
  private header = new HeaderComponent();
  private pullToRefresh = new PullToRefreshComponent();

  render(): string {
    return bindHtml(template)`${{
      fieldBackground: rawHtml(renderFieldBackground()),
      headerHtml: rawHtml(this.header.render())
    }}`;
  }

  mount(): void {
    this.header.mount();
    const appContent = document.getElementById('app-content');
    if (appContent) {
      this.pullToRefresh.init(appContent);
    }
  }

  destroy(): void {
    this.header.destroy();
    this.pullToRefresh.destroy();
  }
}
