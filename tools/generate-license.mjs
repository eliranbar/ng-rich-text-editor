#!/usr/bin/env node
/**
 * Generate Ed25519 license keys for ngx-richtext.
 *
 * Usage:
 *   node tools/generate-license.mjs --licensee "Acme Inc" --domains "*.acme.com"
 *   node tools/generate-license.mjs --keypair   # print new key pair
 *
 * Licenses default to one year from today and are bound to the hostnames given
 * in --domains. Keep the private key secret; embed only the public key.
 */
import {
  generateKeyPairSync,
  sign,
  createPrivateKey,
  createPublicKey,
} from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--keypair') out.keypair = true;
    else if (a.startsWith('--')) {
      out[a.slice(2)] = argv[++i];
    }
  }
  return out;
}

function b64(buf) {
  return Buffer.from(buf).toString('base64');
}

/** ISO date one year from today — the default license term. */
function oneYearFromNow() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

const args = parseArgs(process.argv);

if (args.keypair) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  console.log('PUBLIC_KEY_B64=' + b64(publicKey.export({ type: 'spki', format: 'der' })));
  console.log('PRIVATE_KEY_B64=' + b64(privateKey.export({ type: 'pkcs8', format: 'der' })));
  process.exit(0);
}

const privPath = args['private-key'] ?? resolve('tools/license-private.key');
let privateKey;
if (existsSync(privPath)) {
  const raw = readFileSync(privPath, 'utf8').trim();
  privateKey = createPrivateKey({
    key: Buffer.from(raw, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
} else if (process.env.RTE_LICENSE_PRIVATE_KEY) {
  privateKey = createPrivateKey({
    key: Buffer.from(process.env.RTE_LICENSE_PRIVATE_KEY, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
} else {
  console.error(
    'Missing private key. Set RTE_LICENSE_PRIVATE_KEY or create tools/license-private.key',
  );
  process.exit(1);
}

const features = (
  args.features ?? 'imageResize,sourceView,wordCount,fullscreen,reactiveForms'
)
  .split(',')
  .map((f) => f.trim())
  .filter(Boolean);

const domains = (args.domains ?? '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

if (domains.length === 0) {
  console.error(
    'Refusing to issue an unbound license. Pass --domains "acme.com,*.acme.com"\n' +
      '(or --domains "*" to deliberately allow any host).',
  );
  process.exit(1);
}

const payloadObj = {
  plan: args.plan ?? 'premium',
  features,
  domains,
  expiry: args.expiry ?? oneYearFromNow(),
  licensee: args.licensee ?? 'unknown',
};

const payload = Buffer.from(JSON.stringify(payloadObj), 'utf8');
const signature = sign(null, payload, privateKey);
const license = b64(
  Buffer.from(JSON.stringify({ p: b64(payload), s: b64(signature) }), 'utf8'),
);

console.log(JSON.stringify({ payload: payloadObj, licenseKey: license }, null, 2));

// Also print public key for convenience
const pub = createPublicKey(privateKey);
console.log(
  '\nPUBLIC_KEY_B64=' + b64(pub.export({ type: 'spki', format: 'der' })),
);
