// Web App Manifest — Next 16 native file convention.
// Next automatically serves this at /manifest.webmanifest and injects
// <link rel="manifest"> into every page's <head>. This is the single
// document that makes GoSwift installable to a phone home screen.
export default function manifest() {
  return {
    name:             'GoSwift — Fast Logistics Nigeria',
    short_name:       'GoSwift',
    description:
      'On-demand logistics across Nigeria. Book deliveries, track drivers, and earn — all from your phone.',
    id:               '/',
    start_url:        '/',
    scope:            '/',
    display:          'standalone',
    orientation:      'portrait',
    background_color: '#0F1923',
    theme_color:      '#0F1923',
    categories:       ['business', 'productivity', 'travel'],
    icons: [
      { src: '/icons/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
