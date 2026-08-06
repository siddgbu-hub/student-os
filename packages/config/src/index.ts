export const DEFAULT_CONFIG = {
  apiPrefix: '/api/v1',
  defaultTheme: 'system' as const,
  backendPort: 8789,
  frontendPort: 5175,
  adminPort: 5176,
};

export type ThemeMode = 'light' | 'dark' | 'system';
