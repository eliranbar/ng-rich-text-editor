# License tooling

Generate Ed25519 key pairs and signed license keys for `ngx-richtext` premium features.

```bash
# Create a new key pair (store the private key securely; never commit it)
node tools/generate-license.mjs --keypair

# Issue a license (reads tools/license-private-<kid>.key, or $RTE_LICENSE_PRIVATE_KEY)
node tools/generate-license.mjs --licensee "Acme Inc" --domains "acme.com,*.acme.com"

# Custom term and feature list
node tools/generate-license.mjs --licensee "Acme Inc" --domains "*.acme.com" \
  --expiry 2028-06-30 --features "sourceView,fullscreen"
```

| Flag | Default | Notes |
| --- | --- | --- |
| `--domains` | **required** | Comma-separated hostnames. `*.acme.com` covers the apex and all subdomains. `*` deliberately allows any host — avoid. |
| `--expiry` | one year from today | `YYYY-MM-DD`. Honoured through the whole of that day in every timezone. |
| `--features` | all premium features | Ids from `RTE_FEATURES`. |
| `--licensee` | `unknown` | Recorded in the payload; shows up in support requests. |
| `--plan` | `premium` | |
| `--product` | `@ebdev/ngx-richtext` | Rejected by any other package, even with a valid signature. |
| `--kid` | `rte-2026-08` | Signing generation. **Must exist in the client keyring** or the key verifies nowhere. |
| `--private-key` | `tools/license-private-<kid>.key`, else `tools/license-private.key` | Falls back to `$RTE_LICENSE_PRIVATE_KEY`. |

Local development hosts (`localhost`, `127.0.0.1`, `0.0.0.0`, `*.localhost`) bypass
domain binding, so customers do not need a key for `ng serve` or CI.

Embed only **public** keys, in `projects/ngx-richtext/src/lib/license/public-key.ts`.

## Two rules that keep this system recoverable

**1. One keypair per product, forever.** Never sign a license for another package
with this key. The `product` field is a convenience for support and for newer
clients; the real guarantee is that a key for `@ebdev/ngx-datagrid` is
mathematically unable to verify against `ngx-richtext`'s public key — and that
holds even in versions shipped before `product` existed.

**2. Publish the successor key about a year before it signs anything.** The client
trusts every key in `RTE_LICENSE_KEYRING`, so rotation only works if the *next*
key is already in customers' hands. `rte-2027-08` shipped in v0.4.0 and signs
nothing yet. Skip this and a rotation becomes: publish a release, wait for every
customer to upgrade, and only then issue a working key.

## Planned rotation

Because the successor is pre-staged, this is routine and customer-invisible.

1. Start issuing with `--kid rte-2027-08` (its private key is already in your
   secret store from when it was generated).
2. Generate the *next* successor, add its public key to the keyring, and publish a
   release. You are now a year ahead again.
3. Existing keys signed by `rte-2026-08` keep verifying until they expire. Nothing
   needs reissuing.

## Emergency rotation (private key compromised)

Keys signed by the compromised generation cannot be un-issued — offline
verification has no revocation. Damage is bounded by their remaining term.

1. Stop issuing with the compromised `kid` immediately.
2. Switch issuance to the pre-staged successor.
3. **Remove the compromised entry from `RTE_LICENSE_KEYRING`** and publish. This
   invalidates every key that generation signed, so reissue all affected customers
   from the successor *before* the release goes out.
4. Generate and pre-stage a fresh successor.

## Key files

`tools/license-private*.key` and `tools/*.pkcs8.b64` are gitignored. Each holds a
base64 PKCS#8 DER private key, mode `0600`.

| File | Generation | Status |
| --- | --- | --- |
| `tools/license-private.key` | `rte-2026-08` | **Active** — signs today's licenses |
| `tools/license-private-rte-2027-08.key` | `rte-2027-08` | Pre-staged successor — trusted by clients, signs nothing yet |

Back both up outside this machine. Losing the active key means no new licenses;
losing the successor means an emergency rotation has no landing ground.
