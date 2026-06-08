// /middleware.js
// Vercel Edge Middleware to route hardware.iflcosta.tech to portfolio/hardware-tech folder

export const config = {
  matcher: [
    '/',
    '/index.html',
    '/orcamento',
    '/orcamento/',
    '/obrigado',
    '/obrigado/',
    '/privacidade',
    '/privacidade/',
    '/termos',
    '/termos/',
    '/assets/:path*'
  ],
};

export default async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const host = req.headers.get('host') || '';

  if (host === 'hardware.iflcosta.tech') {
    const cleanPath = path.replace(/\/+$/, '') || '/';
    let targetPath = cleanPath;
    if (cleanPath === '/' || cleanPath === '/index.html') {
      targetPath = '/portfolio/hardware-tech/index.html';
    } else if (cleanPath === '/orcamento') {
      targetPath = '/portfolio/hardware-tech/orcamento.html';
    } else if (cleanPath === '/obrigado') {
      targetPath = '/portfolio/hardware-tech/obrigado.html';
    } else if (cleanPath === '/privacidade') {
      targetPath = '/portfolio/hardware-tech/privacidade.html';
    } else if (cleanPath === '/termos') {
      targetPath = '/portfolio/hardware-tech/termos.html';
    } else if (cleanPath.startsWith('/assets/')) {
      targetPath = `/portfolio/hardware-tech${cleanPath}`;
    }
    
    return fetch(new URL(targetPath, req.url).toString());
  }
}
