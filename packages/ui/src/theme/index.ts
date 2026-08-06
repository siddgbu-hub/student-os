import type { ThemeMode } from '@student-os/config';

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'system') {
    root.setAttribute('data-theme', 'system');
  } else {
    root.setAttribute('data-theme', mode);
  }
}
