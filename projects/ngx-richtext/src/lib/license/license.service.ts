import { Injectable, inject } from '@angular/core';
import { RTE_CONFIG } from '../config/tokens';
import { RteFeatureId, PREMIUM_FEATURES } from '../config/features';
import { RTE_LICENSE_KEYRING, RTE_PRODUCT_ID } from './public-key';

export interface LicensePayload {
  plan: string;
  features: RteFeatureId[];
  expiry: string;
  licensee: string;
  /**
   * Hostnames this key is valid on. `['*.acme.com']` matches the apex and every
   * subdomain; `['*']` or an empty/absent list means unrestricted. Local
   * development hosts always pass — see {@link isDevelopmentHost}.
   */
  domains?: string[];
  /** Package the key was issued for, e.g. `'@ebdev/ngx-richtext'`. */
  product?: string;
  /** Which signing key produced this license. Absent on pre-0.4 keys. */
  kid?: string;
}

export type LicenseFailureReason =
  | 'not-verified'
  | 'missing-key'
  | 'parse-error'
  | 'no-crypto'
  | 'invalid-signature'
  | 'product-mismatch'
  | 'expired'
  | 'domain-mismatch';

export interface LicenseState {
  valid: boolean;
  payload: LicensePayload | null;
  reason?: LicenseFailureReason;
}

/** Hosts that bypass domain binding so `ng serve` and CI never need their own key. */
const DEVELOPMENT_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '']);

/**
 * Keys are stamped with a date, not a time, and `Date.parse` reads that as UTC
 * midnight — so a key dated the purchase anniversary would die at 00:00 UTC on
 * that day, a day early for anyone east of Greenwich. One day of grace means a
 * customer always gets the full term they paid for.
 */
const EXPIRY_GRACE_MS = 24 * 60 * 60 * 1000;

function isDevelopmentHost(hostname: string): boolean {
  return DEVELOPMENT_HOSTS.has(hostname) || hostname.endsWith('.localhost');
}

function matchesDomain(domains: readonly string[] | undefined, hostname: string): boolean {
  if (!domains || domains.length === 0) {
    return true;
  }
  return domains.some((raw) => {
    const pattern = raw.trim().toLowerCase();
    if (!pattern) {
      return false;
    }
    if (pattern === '*') {
      return true;
    }
    if (pattern.startsWith('*.')) {
      const apex = pattern.slice(2);
      return hostname === apex || hostname.endsWith('.' + apex);
    }
    return hostname === pattern;
  });
}

/** `Uint8Array<ArrayBuffer>`, not the default `ArrayBufferLike`, so it satisfies `BufferSource`. */
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Verifies one Ed25519 signature against one SPKI-DER public key. */
type SignatureVerifier = (
  payload: Uint8Array<ArrayBuffer>,
  signature: Uint8Array<ArrayBuffer>,
  spki: Uint8Array<ArrayBuffer>,
) => Promise<boolean>;

/**
 * WebCrypto gained Ed25519 late (Chrome 137), and `crypto.subtle` does not exist
 * at all outside a secure context. Probe once for real support rather than
 * assuming it — a `subtle` that lacks the algorithm throws only on use.
 */
async function webCryptoVerifier(): Promise<SignatureVerifier | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return null;
  }
  try {
    await subtle.importKey(
      'spki',
      base64ToBytes(RTE_LICENSE_KEYRING[0].spkiB64),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
  } catch {
    return null;
  }
  return async (payload, signature, spki) => {
    const key = await subtle.importKey('spki', spki, { name: 'Ed25519' }, false, ['verify']);
    return subtle.verify('Ed25519', key, signature, payload);
  };
}

/**
 * Pure-JS fallback, loaded on demand so the ~80% of users whose browser has
 * native Ed25519 never download it. Deliberately wired to a JS SHA-512 rather
 * than `subtle.digest`, so it also works on plain `http://` intranets where
 * `crypto.subtle` is undefined.
 */
async function nobleVerifier(): Promise<SignatureVerifier> {
  const [ed, sha2] = await Promise.all([
    import('@noble/ed25519'),
    import('@noble/hashes/sha2.js'),
  ]);
  ed.hashes.sha512 = (message) => sha2.sha512(message as Uint8Array);
  ed.hashes.sha512Async = async (message) => sha2.sha512(message as Uint8Array);
  return async (payload, signature, spki) => {
    // SPKI DER for Ed25519 is a 12-byte header followed by the 32-byte key.
    const raw = spki.subarray(spki.length - 32);
    try {
      return await ed.verifyAsync(signature, payload, raw);
    } catch {
      return false;
    }
  };
}

let verifierPromise: Promise<SignatureVerifier> | null = null;

function resolveVerifier(): Promise<SignatureVerifier> {
  verifierPromise ??= webCryptoVerifier().then((native) => native ?? nobleVerifier());
  return verifierPromise;
}

/** Test seam: forget the cached verifier so a spec can exercise both paths. */
export function resetLicenseVerifierForTesting(): void {
  verifierPromise = null;
}

@Injectable()
export class LicenseService {
  private readonly config = inject(RTE_CONFIG);
  private state: LicenseState = { valid: false, payload: null, reason: 'not-verified' };
  /** Single-flight: concurrent callers share one verification instead of racing. */
  private pending: Promise<LicenseState> | null = null;

  verify(): Promise<LicenseState> {
    this.pending ??= this.runVerify();
    return this.pending;
  }

  private async runVerify(): Promise<LicenseState> {
    const key = this.config.licenseKey?.trim();
    if (!key) {
      return this.settle(false, null, 'missing-key');
    }

    let payloadBytes: Uint8Array<ArrayBuffer>;
    let signatureBytes: Uint8Array<ArrayBuffer>;
    let payload: LicensePayload;
    try {
      const envelope = JSON.parse(atob(key)) as { p: string; s: string };
      payloadBytes = base64ToBytes(envelope.p);
      signatureBytes = base64ToBytes(envelope.s);
      // Parsed before the signature is checked, only to pick a key by `kid`.
      // Nothing here is trusted until a signature verifies against those bytes.
      payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as LicensePayload;
    } catch (err) {
      console.warn('[ngx-richtext] Could not read license key — running in free tier.', err);
      return this.settle(false, null, 'parse-error');
    }

    let verify: SignatureVerifier;
    try {
      verify = await resolveVerifier();
    } catch (err) {
      console.warn(
        '[ngx-richtext] No Ed25519 implementation available — running in free tier. ' +
          'This is an environment problem, not a bad key.',
        err,
      );
      return this.settle(false, payload, 'no-crypto');
    }

    const named = RTE_LICENSE_KEYRING.filter((k) => k.kid === payload.kid);
    const candidates = named.length > 0 ? named : RTE_LICENSE_KEYRING;
    let verified = false;
    for (const candidate of candidates) {
      if (await verify(payloadBytes, signatureBytes, base64ToBytes(candidate.spkiB64))) {
        verified = true;
        break;
      }
    }
    if (!verified) {
      console.warn('[ngx-richtext] Invalid license signature — running in free tier.');
      return this.settle(false, null, 'invalid-signature');
    }

    if (payload.product && payload.product !== RTE_PRODUCT_ID) {
      console.warn(
        `[ngx-richtext] License was issued for "${payload.product}", not ${RTE_PRODUCT_ID} — ` +
          'running in free tier.',
      );
      return this.settle(false, payload, 'product-mismatch');
    }

    const expiresAt = payload.expiry ? Date.parse(payload.expiry) : NaN;
    if (Number.isFinite(expiresAt) && expiresAt + EXPIRY_GRACE_MS < Date.now()) {
      console.warn(`[ngx-richtext] License expired on ${payload.expiry} — running in free tier.`);
      return this.settle(false, payload, 'expired');
    }

    const hostname = this.currentHostname();
    if (!isDevelopmentHost(hostname) && !matchesDomain(payload.domains, hostname)) {
      console.warn(
        `[ngx-richtext] License is not valid for "${hostname}" ` +
          `(licensed: ${payload.domains?.join(', ')}) — running in free tier.`,
      );
      return this.settle(false, payload, 'domain-mismatch');
    }

    return this.settle(true, payload);
  }

  private settle(
    valid: boolean,
    payload: LicensePayload | null,
    reason?: LicenseFailureReason,
  ): LicenseState {
    this.state = reason ? { valid, payload, reason } : { valid, payload };
    return this.state;
  }

  getState(): LicenseState {
    return this.state;
  }

  isPremiumUnlocked(): boolean {
    return this.state.valid;
  }

  getLicensedFeatures(): readonly RteFeatureId[] {
    if (!this.state.valid || !this.state.payload) {
      return [];
    }
    const listed = this.state.payload.features ?? [];
    if (listed.length === 0 && this.state.payload.plan === 'premium') {
      return PREMIUM_FEATURES;
    }
    return listed;
  }

  /** Empty when there is no DOM (SSR / unit tests), which counts as a dev host. */
  private currentHostname(): string {
    const host = globalThis.location?.hostname ?? '';
    return host.toLowerCase().replace(/^\[|\]$/g, '');
  }
}
