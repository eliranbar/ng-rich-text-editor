import { Injectable, inject } from '@angular/core';
import { RTE_CONFIG } from '../config/tokens';
import { RteFeatureId, PREMIUM_FEATURES } from '../config/features';
import { RTE_LICENSE_PUBLIC_KEY_B64 } from './public-key';

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
}

export interface LicenseState {
  valid: boolean;
  payload: LicensePayload | null;
  reason?: string;
}

/** Hosts that bypass domain binding so `ng serve` and CI never need their own key. */
const DEVELOPMENT_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '']);

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
      this.state = { valid: false, payload: null, reason: 'missing-key' };
      return this.state;
    }

    try {
      const envelope = JSON.parse(atob(key)) as { p: string; s: string };
      const payloadBytes = Uint8Array.from(atob(envelope.p), (c) => c.charCodeAt(0));
      const signatureBytes = Uint8Array.from(atob(envelope.s), (c) => c.charCodeAt(0));
      const cryptoKey = await this.importPublicKey();
      const ok = await crypto.subtle.verify(
        'Ed25519',
        cryptoKey,
        signatureBytes,
        payloadBytes,
      );

      if (!ok) {
        this.state = { valid: false, payload: null, reason: 'invalid-signature' };
        console.warn('[ngx-richtext] Invalid license signature — running in free tier.');
        return this.state;
      }

      const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as LicensePayload;
      if (payload.expiry && new Date(payload.expiry).getTime() < Date.now()) {
        this.state = { valid: false, payload, reason: 'expired' };
        console.warn(
          `[ngx-richtext] License expired on ${payload.expiry} — running in free tier.`,
        );
        return this.state;
      }

      const hostname = this.currentHostname();
      if (!isDevelopmentHost(hostname) && !matchesDomain(payload.domains, hostname)) {
        this.state = { valid: false, payload, reason: 'domain-mismatch' };
        console.warn(
          `[ngx-richtext] License is not valid for "${hostname}" ` +
            `(licensed: ${payload.domains?.join(', ')}) — running in free tier.`,
        );
        return this.state;
      }

      this.state = { valid: true, payload };
      return this.state;
    } catch (err) {
      this.state = { valid: false, payload: null, reason: 'parse-error' };
      console.warn('[ngx-richtext] Could not verify license — running in free tier.', err);
      return this.state;
    }
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

  private async importPublicKey(): Promise<CryptoKey> {
    const der = Uint8Array.from(atob(RTE_LICENSE_PUBLIC_KEY_B64), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey('spki', der, { name: 'Ed25519' }, false, ['verify']);
  }
}
