import type { Metadata } from 'next';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import '@/styles/tokens.css';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export const metadata: Metadata = {
  title: 'SkyGlobal CRM',
  description: 'CRM for SkyGlobal Renovations painting contractor business',
};

// Injected before React hydrates to prevent flash of wrong theme on load.
const themeScript = `(function(){try{var s=localStorage.getItem('sg-theme');if(s==='light'||s==='dark'){document.documentElement.classList.add(s);}else{document.documentElement.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Must be first in head — prevents theme flash before hydration */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <div aria-hidden="true" className="paper-texture" />
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--sg-surface)',
                border: '1px solid var(--sg-border)',
                borderRadius: '12px',
                color: 'var(--sg-text)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '13px',
                boxShadow: 'var(--sg-card-shadow)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
