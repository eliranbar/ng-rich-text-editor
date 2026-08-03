import { describe, it, expect, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LicenseService } from './license.service';
import { FeatureGateService } from './feature-gate.service';
import { RTE_CONFIG } from '../config/tokens';
import { RTE_FEATURES } from '../config/features';
import { RTE_LICENSE_PUBLIC_KEY_B64 } from './public-key';

/** Premium, bound to localhost + the public demo hosts, expires 2027-08-03. */
const DEMO_LICENSE =
  'eyJwIjoiZXlKd2JHRnVJam9pY0hKbGJXbDFiU0lzSW1abFlYUjFjbVZ6SWpwYkltbHRZV2RsVW1WemFYcGxJaXdpYzI5MWNtTmxWbWxsZHlJc0luZHZjbVJEYjNWdWRDSXNJbVoxYkd4elkzSmxaVzRpTENKeVpXRmpkR2wyWlVadmNtMXpJbDBzSW1SdmJXRnBibk1pT2xzaWJHOWpZV3hvYjNOMElpd2lNVEkzTGpBdU1DNHhJaXdpWld4cGNtRnVZbUZ5TG1kcGRHaDFZaTVwYnlJc0lpb3VaV0prWlhZdFpHVnphV2R1TG1OdmJTSmRMQ0psZUhCcGNua2lPaUl5TURJM0xUQTRMVEF6SWl3aWJHbGpaVzV6WldVaU9pSnVaM2d0Y21samFIUmxlSFFnWkdWdGJ5SjkiLCJzIjoic0tlbFJQVU1uR0QxUUZVOEg1NkZIanJRdm1aM2NRdk11L1h6VGVnOVppeVdqMSs3TDAyU3FibDFJMWlVL3VNTkw4TzQyVWIzdS9QRlF4NmxCNkhuQkE9PSJ9';

/** Valid signature, but bound to `acme.test` / `*.acme.test` only. */
const ACME_LICENSE =
  'eyJwIjoiZXlKd2JHRnVJam9pY0hKbGJXbDFiU0lzSW1abFlYUjFjbVZ6SWpwYkltbHRZV2RsVW1WemFYcGxJaXdpYzI5MWNtTmxWbWxsZHlJc0luZHZjbVJEYjNWdWRDSXNJbVoxYkd4elkzSmxaVzRpTENKeVpXRmpkR2wyWlVadmNtMXpJbDBzSW1SdmJXRnBibk1pT2xzaVlXTnRaUzUwWlhOMElpd2lLaTVoWTIxbExuUmxjM1FpWFN3aVpYaHdhWEo1SWpvaU1qQTVPUzB4TWkwek1TSXNJbXhwWTJWdWMyVmxJam9pUVdOdFpTQlVaWE4wSW4wPSIsInMiOiJCRUhPRHNNZktQMXB2c3E1d2FpOVorSEtTOUtZM0sxNDI2bGM5Wmh6d29lOGdSUDZjZTFiRVYrNisrUy9OOFlybGlTanpHdURqTU83U0RRcEYzN3lEZz09In0=';

/** Valid signature, unrestricted domains, expired on 2020-01-01. */
const EXPIRED_LICENSE =
  'eyJwIjoiZXlKd2JHRnVJam9pY0hKbGJXbDFiU0lzSW1abFlYUjFjbVZ6SWpwYkltbHRZV2RsVW1WemFYcGxJaXdpYzI5MWNtTmxWbWxsZHlJc0luZHZjbVJEYjNWdWRDSXNJbVoxYkd4elkzSmxaVzRpTENKeVpXRmpkR2wyWlVadmNtMXpJbDBzSW1SdmJXRnBibk1pT2xzaUtpSmRMQ0psZUhCcGNua2lPaUl5TURJd0xUQXhMVEF4SWl3aWJHbGpaVzV6WldVaU9pSkZlSEJwY21Wa0lGUmxjM1FpZlE9PSIsInMiOiI4Smd3SGNVVkxxbWh1YW5wVERESnd4eUhuK0tYNk5NU1poQ0w2dGtwU0hQa3BKSmJsNWErNUJJWnh4MHMvLzlVdE5PRnNjV1hZKzF1dWRWTDhLakVDQT09In0=';

/** Older jsdom/node builds ship WebCrypto without Ed25519; skip those tests there. */
async function hasEd25519(): Promise<boolean> {
  try {
    await crypto.subtle.importKey(
      'spki',
      Uint8Array.from(atob(RTE_LICENSE_PUBLIC_KEY_B64), (c) => c.charCodeAt(0)),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    return true;
  } catch {
    return false;
  }
}

/** Domain binding reads `location.hostname`; jsdom pins it to localhost. */
function servedFrom(hostname: string): void {
  vi.stubGlobal('location', { hostname });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LicenseService', () => {
  it('falls back to free tier without a key', async () => {
    TestBed.configureTestingModule({
      providers: [LicenseService, { provide: RTE_CONFIG, useValue: {} }],
    });
    const license = TestBed.inject(LicenseService);
    const state = await license.verify();
    expect(state.valid).toBe(false);
    expect(state.reason).toBe('missing-key');
  });

  it('grants tables and colors without a license', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        LicenseService,
        FeatureGateService,
        { provide: RTE_CONFIG, useValue: {} },
      ],
    });
    const gate = TestBed.inject(FeatureGateService);
    await gate.init();
    expect(gate.isEnabled(RTE_FEATURES.tables)).toBe(true);
    expect(gate.isEnabled(RTE_FEATURES.textColor)).toBe(true);
    expect(gate.isEnabled(RTE_FEATURES.backgroundColor)).toBe(true);
    expect(gate.isEnabled(RTE_FEATURES.sourceView)).toBe(false);
    expect(gate.isEnabled(RTE_FEATURES.fullscreen)).toBe(false);
  });

  it('rejects a tampered key', async () => {
    TestBed.configureTestingModule({
      providers: [
        LicenseService,
        { provide: RTE_CONFIG, useValue: { licenseKey: 'not-a-real-key' } },
      ],
    });
    const license = TestBed.inject(LicenseService);
    const state = await license.verify();
    expect(state.valid).toBe(false);
  });

  it('gives concurrent callers the settled state, not the pre-verification one', async () => {
    // Every editor and toolbar on the page verifies during ngAfterViewInit, so
    // verify() must be single-flight — a second caller used to get back the
    // initial `not-verified` state while the first was still awaiting crypto.
    if (!(await hasEd25519())) {
      return;
    }
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        LicenseService,
        { provide: RTE_CONFIG, useValue: { licenseKey: DEMO_LICENSE } },
      ],
    });
    const license = TestBed.inject(LicenseService);
    const [first, second] = await Promise.all([license.verify(), license.verify()]);
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
  });

  it('unlocks premium for every concurrent init(), not just the first', async () => {
    // Regression: a losing racer saw the free-tier set and permanently gated
    // its ControlValueAccessor, so [formControl] silently stopped emitting.
    if (!(await hasEd25519())) {
      return;
    }
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

  it('accepts a valid signed demo license when WebCrypto Ed25519 is available', async () => {
    if (!(await hasEd25519())) {
      return;
    }

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

  describe('domain binding', () => {
    async function verifyOn(hostname: string, licenseKey: string) {
      servedFrom(hostname);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [LicenseService, { provide: RTE_CONFIG, useValue: { licenseKey } }],
      });
      return TestBed.inject(LicenseService).verify();
    }

    it('rejects a valid key lifted onto an unlicensed host', async () => {
      // The whole point of binding: a key copied out of someone else's bundle
      // (or out of this repo's demo) is inert anywhere but its own domains.
      if (!(await hasEd25519())) {
        return;
      }
      const state = await verifyOn('copycat.example', ACME_LICENSE);
      expect(state.valid).toBe(false);
      expect(state.reason).toBe('domain-mismatch');
    });

    it('accepts the licensed apex and its subdomains', async () => {
      if (!(await hasEd25519())) {
        return;
      }
      expect((await verifyOn('acme.test', ACME_LICENSE)).valid).toBe(true);
      expect((await verifyOn('app.acme.test', ACME_LICENSE)).valid).toBe(true);
    });

    it('does not let a suffix collision pass as a subdomain', async () => {
      if (!(await hasEd25519())) {
        return;
      }
      const state = await verifyOn('notacme.test', ACME_LICENSE);
      expect(state.valid).toBe(false);
      expect(state.reason).toBe('domain-mismatch');
    });

    it('always allows local development hosts', async () => {
      if (!(await hasEd25519())) {
        return;
      }
      for (const host of ['localhost', '127.0.0.1', 'app.localhost', '']) {
        expect((await verifyOn(host, ACME_LICENSE)).valid).toBe(true);
      }
    });

    it('rejects an expired key even on a licensed host', async () => {
      if (!(await hasEd25519())) {
        return;
      }
      const state = await verifyOn('anything.example', EXPIRED_LICENSE);
      expect(state.valid).toBe(false);
      expect(state.reason).toBe('expired');
    });
  });
});
