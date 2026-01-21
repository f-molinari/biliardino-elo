export function getTheme(): string {
  return localStorage.getItem('theme') ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

export function setTheme(): void {
  document.documentElement.setAttribute('data-theme', getTheme());
}

setTheme();
