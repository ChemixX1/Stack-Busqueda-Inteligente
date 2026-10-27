import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicIp, normalizeUrl, safeFetch } from '../lib/server/safe-fetch';

test('rejects loopback, private, link-local, mapped IPv6 and reserved ranges', () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.2.3', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '224.0.0.1', '::1', '::', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1']) assert.equal(isPublicIp(ip), false, ip);
  assert.equal(isPublicIp('8.8.8.8'), true);
  assert.equal(isPublicIp('2606:4700:4700::1111'), true);
});

test('normalizes web addresses while blocking credentials, custom ports and alternate local notation', () => {
  assert.equal(normalizeUrl('example.org/about#contact').href, 'https://example.org/about');
  for (const input of ['http://127.1', 'http://2130706433', 'http://0x7f000001', 'http://[::1]', 'http://[::ffff:127.0.0.1]', 'https://localhost', 'https://foo.local', 'https://intranet', 'https://user:pass@example.org', 'https://example.org:8443', 'file:///etc/passwd', 'javascript:alert(1)']) {
    assert.throws(() => normalizeUrl(input), { code: 'UNSAFE_URL' }, input);
  }
});

test('private network requests fail before any connection is made', async () => {
  await assert.rejects(safeFetch('http://169.254.169.254/latest/meta-data/'), { code: 'UNSAFE_URL' });
});
