const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '3100';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';

require('../server');

async function waitForServer(url) {
  for (let i = 0; i < 20; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch (error) {
      // server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not become ready at ${url}`);
}

test('CSP headers do not allow inline scripts or styles', async () => {
  const res = await waitForServer('http://127.0.0.1:3100/');
  const csp = res.headers.get('content-security-policy');

  assert.ok(csp, 'Expected a Content-Security-Policy header');
  assert.ok(!csp.includes("'unsafe-inline'"), `Expected CSP to avoid unsafe-inline, got: ${csp}`);
  assert.ok(csp.includes("script-src 'self'"), `Expected script-src to be present, got: ${csp}`);
  assert.ok(csp.includes("style-src 'self'"), `Expected style-src to be present, got: ${csp}`);
});
