import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LicenseService } from './license.service';
import { FeatureGateService } from './feature-gate.service';
import { RTE_CONFIG } from '../config/tokens';
import { RTE_FEATURES } from '../config/features';

const DEMO_LICENSE =
  'eyJwIjoiZXlKd2JHRnVJam9pY0hKbGJXbDFiU0lzSW1abFlYUjFjbVZ6SWpwYkluUmxlSFJEYjJ4dmNpSXNJbUpoWTJ0bmNtOTFibVJEYjJ4dmNpSXNJbWx0WVdkbFVtVnphWHBsSWl3aWRHRmliR1Z6SWl3aWMyOTFjbU5sVm1sbGR5SXNJbmR2Y21SRGIzVnVkQ0lzSW1aMWJHeHpZM0psWlc0aVhTd2laWGh3YVhKNUlqb2lNakE1T1MweE1pMHpNU0lzSW14cFkyVnVjMlZsSWpvaVpHVnRiMEJsZUdGdGNHeGxMbU52YlNKOSIsInMiOiJsVDVDamRLdkpHWU5jenBCOWVYc1R1bkErSGxZR09RRi95S3Fuc1hJbFhyWnFoSit0dDhkRnhOYUNNcGZtRkJVUUdUajRVM2RuQkd1NTk2N2U2bWpEdz09In0=';

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

  it('accepts a valid signed demo license when WebCrypto Ed25519 is available', async () => {
    // Skip when the runtime lacks Ed25519 (older jsdom/node builds)
    const subtle = globalThis.crypto?.subtle as SubtleCrypto | undefined;
    if (!subtle || typeof (subtle as unknown as { importKey: unknown }).importKey !== 'function') {
      return;
    }

    try {
      await subtle.importKey(
        'spki',
        Uint8Array.from(
          atob('MCowBQYDK2VwAyEAfVgGVILp81UrINSQMMH27fcixWvDbo8Vsbkhqq5poR8='),
          (c) => c.charCodeAt(0),
        ),
        { name: 'Ed25519' },
        false,
        ['verify'],
      );
    } catch {
      // Ed25519 unsupported in this environment
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
  });
});
