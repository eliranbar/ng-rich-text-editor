/**
 * License identity for this package: which product keys must be issued for, and
 * which Ed25519 public keys are trusted to sign them.
 */

/**
 * Product this build accepts licenses for. A key carrying a different `product`
 * is rejected even if its signature is valid, so a license for one E.B Dev &
 * Design package can never unlock another.
 *
 * Defence in depth only — the real guarantee is that every product has its own
 * keypair, which already-shipped verifiers enforce for free.
 */
export const RTE_PRODUCT_ID = '@ebdev/ngx-richtext';

export interface RteLicensePublicKey {
  /** Stable identifier stamped into the payload as `kid`. */
  readonly kid: string;
  /** Ed25519 public key, SPKI DER, base64. */
  readonly spkiB64: string;
}

/**
 * Trusted signing keys, newest last. A key is verified against the entry named
 * by its `kid`, or against every entry when it carries no `kid`.
 *
 * **The successor is published roughly a year before it signs anything.** That is
 * what makes rotation survivable: by the time `rte-2027-08` starts issuing keys,
 * the clients that must accept them have shipped. Rotating without a pre-staged
 * successor would require every customer to upgrade the library *before* they
 * could be issued a working key.
 */
export const RTE_LICENSE_KEYRING: readonly RteLicensePublicKey[] = [
  { kid: 'rte-2026-08', spkiB64: 'MCowBQYDK2VwAyEA8gnxiGPWcisB4DmWFohP/CtcEspqu1cA/a2Vn0OBV8w=' },
  { kid: 'rte-2027-08', spkiB64: 'MCowBQYDK2VwAyEAcuzf/ni7fvKGTvTyw3IFukiE3tyenMmoRfLTxRkik3k=' },
];

/**
 * The currently-issuing key.
 * @deprecated Prefer {@link RTE_LICENSE_KEYRING}; kept so existing imports resolve.
 */
export const RTE_LICENSE_PUBLIC_KEY_B64 = RTE_LICENSE_KEYRING[0].spkiB64;
