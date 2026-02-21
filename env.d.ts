/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_SECRET: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_API_URL: string;
  readonly VITE_TURNSTILE_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface TurnstileInstance {
  render(
    container: string | HTMLElement,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
      size?: 'normal' | 'compact';
    },
  ): string;
  remove(widgetId: string): void;
  reset(widgetId: string): void;
}

interface Window {
  turnstile?: TurnstileInstance;
}
