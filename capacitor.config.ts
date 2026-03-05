import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.rejectionbounty',
  appName: 'Rejection Bounty',
  webDir: 'dist',
  server: {
    url: 'https://rejection-bounty.lovable.app',
    cleartext: false,
    // Allow OAuth URLs to stay in WebView instead of opening Safari
    allowNavigation: [
      'https://rejection-bounty.lovable.app/*',
      'https://*.lovable.app/*',
      'https://oauth.lovable.app/*',
      'https://accounts.google.com/*',
      'https://*.google.com/*',
      'https://*.googleapis.com/*',
    ],
  },
  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
