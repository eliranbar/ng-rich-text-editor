import { Injectable, inject, signal } from '@angular/core';
import { RTE_CONFIG } from '../config/tokens';
import { FREE_FEATURES, RteFeatureId } from '../config/features';
import { LicenseService } from './license.service';

@Injectable()
export class FeatureGateService {
  private readonly config = inject(RTE_CONFIG);
  private readonly license = inject(LicenseService);
  private readonly enabled = signal<ReadonlySet<RteFeatureId>>(new Set(FREE_FEATURES));
  private ready = false;

  async init(): Promise<void> {
    if (this.ready) {
      return;
    }
    await this.license.verify();
    const set = new Set<RteFeatureId>(FREE_FEATURES);
    for (const f of this.config.extraFeatures ?? []) {
      set.add(f);
    }
    for (const f of this.license.getLicensedFeatures()) {
      set.add(f);
    }
    this.enabled.set(set);
    this.ready = true;
  }

  isEnabled(feature: RteFeatureId): boolean {
    return this.enabled().has(feature);
  }

  features(): ReadonlySet<RteFeatureId> {
    return this.enabled();
  }
}
