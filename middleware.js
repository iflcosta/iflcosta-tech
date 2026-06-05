// /middleware.js
// Vercel Edge Middleware to route hardware.iflcosta.tech to portfolio/hardware-tech folder

export const config = {
  matcher: [
    '/',
    '/index.html',
    '/orcamento',
    '/obrigado',
    '/privacidade',
    '/termos',
    '/assets/:path*'
  ],
};

export default async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const host = req.headers.get('host') || '';

  if (host === 'hardware.iflcosta.tech') {
    let targetPath = path;
    if (path === '/' || path === '/index.html') {
      targetPath = '/portfolio/hardware-tech/index.html';
    } else if (path === '/orcamento') {
      targetPath = '/portfolio/hardware-tech/orcamento.html';
    } else if (path === '/obrigado') {
      targetPath = '/portfolio/hardware-tech/obrigado.html';
    } else if (path === '/privacidade') {
      targetPath = '/portfolio/hardware-tech/privacidade.html';
    } else if (path === '/termos') {
      targetPath = '/portfolio/hardware-tech/termos.html';
    } else if (path.startsWith('/assets/')) {
      targetPath = `/portfolio/hardware-tech${path}`;
    }
    
    return fetch(new URL(targetPath, req.url).toString());
  }
}
