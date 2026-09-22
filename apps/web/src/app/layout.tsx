import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import ThemeProvider from '../components/ThemeProvider';
import NotificationPermission from '../components/notifications/NotificationPermission';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default:  'Smart Productivity',
    template: '%s · Smart Productivity',
  },
  description: 'AI-powered study scheduling, smart task management, and gamified learning — all in one place.',
  keywords:    ['productivity', 'study planner', 'AI', 'task manager', 'schedule'],
  authors:     [{ name: 'Smart Productivity' }],
  icons: {
    icon: '/favicon.ico',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   [
    { media: '(prefers-color-scheme: light)', color: '#6366f1' },
    { media: '(prefers-color-scheme: dark)',  color: '#4f46e5' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <NotificationPermission />
        </ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { borderRadius: '10px', fontSize: '13px', fontWeight: '500' },
          }}
        />
      </body>
    </html>
  );
}
