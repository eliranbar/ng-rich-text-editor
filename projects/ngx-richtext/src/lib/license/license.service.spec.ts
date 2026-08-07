import { describe, it, expect, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LicenseService, resetLicenseVerifierForTesting } from './license.service';
import { FeatureGateService } from './feature-gate.service';
import { RTE_CONFIG } from '../config/tokens';
import { RTE_FEATURES } from '../config/features';

/**
 * Fixtures are produced by `tools/generate-license.mjs` against the real signing
 * keys. Regenerate them with the commands in each comment if the payload shape
 * or the keyring changes — never hand-edit a base64 blob.
 */

/** Premium, `ngx-richtext.ebdev-design.com` + localhost, expires 2027-08-05. */
const DEMO_LICENSE =
  'eyJwIjoiZXlKd2NtOWtkV04wSWpvaVFHVmlaR1YyTDI1bmVDMXlhV05vZEdWNGRDSXNJbXRwWkNJNkluSjBaUzB5TURJMkxUQTRJaXdpY0d4aGJpSTZJbkJ5WlcxcGRXMGlMQ0ptWldGMGRYSmxjeUk2V3lKcGJXRm5aVkpsYzJsNlpTSXNJbk52ZFhKalpWWnBaWGNpTENKM2IzSmtRMjkxYm5RaUxDSm1kV3hzYzJOeVpXVnVJaXdpY21WaFkzUnBkbVZHYjNKdGN5SmRMQ0prYjIxaGFXNXpJanBiSW01bmVDMXlhV05vZEdWNGRDNWxZbVJsZGkxa1pYTnBaMjR1WTI5dElpd2liRzlqWVd4b2IzTjBJaXdpTVRJM0xqQXVNQzR4SWwwc0ltVjRjR2x5ZVNJNklqSXdNamN0TURndE1EVWlMQ0pzYVdObGJuTmxaU0k2SW01bmVDMXlhV05vZEdWNGRDQmtaVzF2SW4wPSIsInMiOiJEZUN6eUhQS1l0N1I3QWJqRVNzblY3WXoxVmpEVkNPaHhIU0cyK2J5cE95RlBqMmZGOURyZkFndXNhT2daaENWajdDRHR5RmVDc2kyd3BHQzVwSXlEdz09In0=';

/** Valid signature, bound to `acme.test` / `*.acme.test` only. */
const ACME_LICENSE =
  'eyJwIjoiZXlKd2NtOWtkV04wSWpvaVFHVmlaR1YyTDI1bmVDMXlhV05vZEdWNGRDSXNJbXRwWkNJNkluSjBaUzB5TURJMkxUQTRJaXdpY0d4aGJpSTZJbkJ5WlcxcGRXMGlMQ0ptWldGMGRYSmxjeUk2V3lKcGJXRm5aVkpsYzJsNlpTSXNJbk52ZFhKalpWWnBaWGNpTENKM2IzSmtRMjkxYm5RaUxDSm1kV3hzYzJOeVpXVnVJaXdpY21WaFkzUnBkbVZHYjNKdGN5SmRMQ0prYjIxaGFXNXpJanBiSW1GamJXVXVkR1Z6ZENJc0lpb3VZV050WlM1MFpYTjBJbDBzSW1WNGNHbHllU0k2SWpJd09Ua3RNVEl0TXpFaUxDSnNhV05sYm5ObFpTSTZJa0ZqYldVZ1ZHVnpkQ0o5IiwicyI6ImdTWkFIRjU1d1I1T2tyKy9VY3dRT1kyMTlSZFc0cCtTZUl4eElSb3FzZ215Q3h4Mmo2QUdxdlUxSExSUjJYejVxcjk3ZWgyNS9QQzVQTnFHWWdVN0NBPT0ifQ==';

/** Valid signature, unrestricted domains, expired on 2020-01-01. */
const EXPIRED_LICENSE =
  'eyJwIjoiZXlKd2NtOWtkV04wSWpvaVFHVmlaR1YyTDI1bmVDMXlhV05vZEdWNGRDSXNJbXRwWkNJNkluSjBaUzB5TURJMkxUQTRJaXdpY0d4aGJpSTZJbkJ5WlcxcGRXMGlMQ0ptWldGMGRYSmxjeUk2V3lKcGJXRm5aVkpsYzJsNlpTSXNJbk52ZFhKalpWWnBaWGNpTENKM2IzSmtRMjkxYm5RaUxDSm1kV3hzYzJOeVpXVnVJaXdpY21WaFkzUnBkbVZHYjNKdGN5SmRMQ0prYjIxaGFXNXpJanBiSWlvaVhTd2laWGh3YVhKNUlqb2lNakF5TUMwd01TMHdNU0lzSW14cFkyVnVjMlZsSWpvaVJYaHdhWEpsWkNCVVpYTjBJbjA9IiwicyI6ImUzRnFldVpKakVZcGZyUXVZV0R5SDg4NUZ5VTlsRUpyWHhHZEZXUWtkSEJHNHZxNnNab0VWdUd4aHo1dE0vWUJjUGFGR1dMWDh4WnB4QzMyTk9vaUFnPT0ifQ==';

/** Valid signature, unrestricted domains, expiry stamped **2026-08-05**. */
const BOUNDARY_LICENSE =
  'eyJwIjoiZXlKd2NtOWtkV04wSWpvaVFHVmlaR1YyTDI1bmVDMXlhV05vZEdWNGRDSXNJbXRwWkNJNkluSjBaUzB5TURJMkxUQTRJaXdpY0d4aGJpSTZJbkJ5WlcxcGRXMGlMQ0ptWldGMGRYSmxjeUk2V3lKcGJXRm5aVkpsYzJsNlpTSXNJbk52ZFhKalpWWnBaWGNpTENKM2IzSmtRMjkxYm5RaUxDSm1kV3hzYzJOeVpXVnVJaXdpY21WaFkzUnBkbVZHYjNKdGN5SmRMQ0prYjIxaGFXNXpJanBiSWlvaVhTd2laWGh3YVhKNUlqb2lNakF5Tmkwd09DMHdOU0lzSW14cFkyVnVjMlZsSWpvaVFtOTFibVJoY25rZ1ZHVnpkQ0o5IiwicyI6IldrR1NnYUx1VUF2WlpGWFdvZkUyUG5xY3JSSVZIQkNWRC9Kdlk0L1c2dGdGNUpGZXp3anpCeGZJQytFMHlpZHZkSjVxV2hESHpYZ3l6aEx1TFBNdEFBPT0ifQ==';

/** Valid signature from *our* key, but issued for a different package. */
const OTHER_PRODUCT_LICENSE =
  'eyJwIjoiZXlKd2NtOWtkV04wSWpvaVFHVmlaR1YyTDI1bmVDMWtZWFJoWjNKcFpDSXNJbXRwWkNJNkluSjBaUzB5TURJMkxUQTRJaXdpY0d4aGJpSTZJbkJ5WlcxcGRXMGlMQ0ptWldGMGRYSmxjeUk2V3lKcGJXRm5aVkpsYzJsNlpTSXNJbk52ZFhKalpWWnBaWGNpTENKM2IzSmtRMjkxYm5RaUxDSm1kV3hzYzJOeVpXVnVJaXdpY21WaFkzUnBkbVZHYjNKdGN5SmRMQ0prYjIxaGFXNXpJanBiSWlvaVhTd2laWGh3YVhKNUlqb2lNakE1T1MweE1pMHpNU0lzSW14cFkyVnVjMlZsSWpvaVQzUm9aWElnVUhKdlpIVmpkQ0o5IiwicyI6ImNybjVnSWVXWFNHT2VGeERQdy9TY0VRUmlJeHpRQ2N0WWZDWW5pbFRoZlNOTENINTkxV1BmejNyWFE2WEV2aFgvWGNWMlM4dEtqcTlpcEpSSXpyZkNnPT0ifQ==';

/** Signed by the **pre-staged successor** key (`kid: rte-2027-08`). */
const SUCCESSOR_KEY_LICENSE =
  'eyJwIjoiZXlKd2NtOWtkV04wSWpvaVFHVmlaR1YyTDI1bmVDMXlhV05vZEdWNGRDSXNJbXRwWkNJNkluSjBaUzB5TURJM0xUQTRJaXdpY0d4aGJpSTZJbkJ5WlcxcGRXMGlMQ0ptWldGMGRYSmxjeUk2V3lKcGJXRm5aVkpsYzJsNlpTSXNJbk52ZFhKalpWWnBaWGNpTENKM2IzSmtRMjkxYm5RaUxDSm1kV3hzYzJOeVpXVnVJaXdpY21WaFkzUnBkbVZHYjNKdGN5SmRMQ0prYjIxaGFXNXpJanBiSWlvaVhTd2laWGh3YVhKNUlqb2lNakE1T1MweE1pMHpNU0lzSW14cFkyVnVjMlZsSWpvaVUzVmpZMlZ6YzI5eUlFdGxlU0JVWlhOMEluMD0iLCJzIjoiamhlRmROQjJ5dHQ3dlJMQXhJMjkwRWc3OVBVZWZOV0pLQXFsUlhwV3RCNGdtWG9BSkY5TzBLNzU1YXVXell0TlBGTjhsOWtXWnFlZVdmK2FCcm1OQlE9PSJ9';

/** Domain binding reads `location.hostname`; jsdom pins it to localhost. */
function servedFrom(hostname: string): void {
  vi.stubGlobal('location', { hostname });
}

async function verifyWith(licenseKey: string) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [LicenseService, { provide: RTE_CONFIG, useValue: { licenseKey } }],
  });
  return TestBed.inject(LicenseService).verify();
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetLicenseVerifierForTesting();
});

describe('LicenseService', () => {
  it('falls back to free tier without a key', async () => {
    const state = await verifyWith('');
    expect(state.valid).toBe(false);
    expect(state.reason).toBe('missing-key');
  });

  it('grants tables and colors without a license', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [LicenseService, FeatureGateService, { provide: RTE_CONFIG, useValue: {} }],
    });
    const gate = TestBed.inject(FeatureGateService);
    await gate.init();
    expect(gate.isEnabled(RTE_FEATURES.tables)).toBe(true);
    expect(gate.isEnabled(RTE_FEATURES.textColor)).toBe(true);
    expect(gate.isEnabled(RTE_FEATURES.backgroundColor)).toBe(true);
    expect(gate.isEnabled(RTE_FEATURES.sourceView)).toBe(false);
    expect(gate.isEnabled(RTE_FEATURES.fullscreen)).toBe(false);
  });

  it('rejects a key that is not a license at all', async () => {
    const state = await verifyWith('not-a-real-key');
    expect(state.valid).toBe(false);
    expect(state.reason).toBe('parse-error');
  });

  it('accepts a valid signed demo license', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        LicenseService,
        FeatureGateService,
        { provide: RTE_CONFIG, useValue: { licenseKey: DEMO_LICENSE } },
      ],
    });
    const gate = TestBed.inject(FeatureGateService);
    await gate.init();
    expect(gate.isEnabled(RTE_FEATURES.textColor)).toBe(true);
    expect(gate.isEnabled(RTE_FEATURES.tables)).toBe(true);
    expect(gate.isEnabled(RTE_FEATURES.bold)).toBe(true);
    expect(gate.isEnabled(RTE_FEATURES.reactiveForms)).toBe(true);
    expect(gate.isEnabled(RTE_FEATURES.sourceView)).toBe(true);
  });

  it('gives concurrent callers the settled state, not the pre-verification one', async () => {
    // Every editor and toolbar on the page verifies during ngAfterViewInit, so
    // verify() must be single-flight — a second caller used to get back the
    // initial `not-verified` state while the first was still awaiting crypto.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [LicenseService, { provide: RTE_CONFIG, useValue: { licenseKey: DEMO_LICENSE } }],
    });
    const license = TestBed.inject(LicenseService);
    const [first, second] = await Promise.all([license.verify(), license.verify()]);
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
  });

  it('unlocks premium for every concurrent init(), not just the first', async () => {
    // Regression: a losing racer saw the free-tier set and permanently gated
    // its ControlValueAccessor, so [formControl] silently stopped emitting.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        LicenseService,
        FeatureGateService,
        { provide: RTE_CONFIG, useValue: { licenseKey: DEMO_LICENSE } },
      ],
    });
    const gate = TestBed.inject(FeatureGateService);
    const seen = await Promise.all(
      [0, 1, 2, 3].map(() => gate.init().then(() => gate.isEnabled(RTE_FEATURES.reactiveForms))),
    );
    expect(seen).toEqual([true, true, true, true]);
  });

  describe('signature verification', () => {
    it('verifies without native Ed25519, via the bundled fallback', async () => {
      // The bug this guards: ~20% of browsers (pre-Chrome-137) and every plain
      // http:// page lack WebCrypto Ed25519, and a paying customer there used to
      // land in the free tier with a misleading `parse-error`.
      vi.stubGlobal('crypto', { ...globalThis.crypto, subtle: undefined });
      resetLicenseVerifierForTesting();
      const state = await verifyWith(DEMO_LICENSE);
      expect(state.valid).toBe(true);
      expect(state.payload?.licensee).toBe('ngx-richtext demo');
    });

    it('verifies without native Ed25519 when subtle exists but lacks the algorithm', async () => {
      const subtle = {
        importKey: vi.fn().mockRejectedValue(new Error('Unrecognized algorithm name')),
        verify: vi.fn(),
      };
      vi.stubGlobal('crypto', { ...globalThis.crypto, subtle });
      resetLicenseVerifierForTesting();
      const state = await verifyWith(DEMO_LICENSE);
      expect(state.valid).toBe(true);
      expect(subtle.verify).not.toHaveBeenCalled();
    });

    it('rejects a key whose payload has been tampered with', async () => {
      const envelope = JSON.parse(atob(DEMO_LICENSE)) as { p: string; s: string };
      const payload = JSON.parse(atob(envelope.p));
      payload.licensee = 'Someone Else';
      const forged = btoa(
        JSON.stringify({ p: btoa(JSON.stringify(payload)), s: envelope.s }),
      );
      const state = await verifyWith(forged);
      expect(state.valid).toBe(false);
      expect(state.reason).toBe('invalid-signature');
    });

    it('accepts a license signed by the pre-staged successor key', async () => {
      // Rotation only works if clients already trust the next key. If this test
      // fails, a rotation would strand every customer until they upgrade.
      servedFrom('anything.example');
      const state = await verifyWith(SUCCESSOR_KEY_LICENSE);
      expect(state.valid).toBe(true);
      expect(state.payload?.kid).toBe('rte-2027-08');
    });
  });

  describe('product binding', () => {
    it('rejects a validly-signed key issued for a different package', async () => {
      servedFrom('anything.example');
      const state = await verifyWith(OTHER_PRODUCT_LICENSE);
      expect(state.valid).toBe(false);
      expect(state.reason).toBe('product-mismatch');
    });

    it('accepts a key stamped with this product', async () => {
      servedFrom('acme.test');
      const state = await verifyWith(ACME_LICENSE);
      expect(state.valid).toBe(true);
      expect(state.payload?.product).toBe('@ebdev/ngx-richtext');
    });
  });

  describe('expiry', () => {
    it('rejects a long-expired key even on a licensed host', async () => {
      const state = await verifyWith(EXPIRED_LICENSE);
      expect(state.valid).toBe(false);
      expect(state.reason).toBe('expired');
    });

    it('is still valid throughout the stamped expiry day, in any timezone', async () => {
      // `Date.parse('2026-08-05')` is UTC midnight, so without a grace window a
      // customer east of Greenwich loses a day they paid for.
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-05T23:30:00Z'));
      const state = await verifyWith(BOUNDARY_LICENSE);
      expect(state.valid).toBe(true);
    });

    it('expires once the grace window has passed', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-06T12:00:00Z'));
      const state = await verifyWith(BOUNDARY_LICENSE);
      expect(state.valid).toBe(false);
      expect(state.reason).toBe('expired');
    });
  });

  describe('domain binding', () => {
    async function verifyOn(hostname: string, licenseKey: string) {
      servedFrom(hostname);
      return verifyWith(licenseKey);
    }

    it('rejects a valid key lifted onto an unlicensed host', async () => {
      // The whole point of binding: a key copied out of someone else's bundle
      // (or out of this repo's demo) is inert anywhere but its own domains.
      const state = await verifyOn('copycat.example', ACME_LICENSE);
      expect(state.valid).toBe(false);
      expect(state.reason).toBe('domain-mismatch');
    });

    it('accepts the licensed apex and its subdomains', async () => {
      expect((await verifyOn('acme.test', ACME_LICENSE)).valid).toBe(true);
      expect((await verifyOn('app.acme.test', ACME_LICENSE)).valid).toBe(true);
    });

    it('does not let a suffix collision pass as a subdomain', async () => {
      const state = await verifyOn('notacme.test', ACME_LICENSE);
      expect(state.valid).toBe(false);
      expect(state.reason).toBe('domain-mismatch');
    });

    it('always allows local development hosts', async () => {
      for (const host of ['localhost', '127.0.0.1', 'app.localhost', '']) {
        expect((await verifyOn(host, ACME_LICENSE)).valid).toBe(true);
      }
    });

    it('normalizes hostname case', async () => {
      expect((await verifyOn('ACME.TEST', ACME_LICENSE)).valid).toBe(true);
    });
  });
});
