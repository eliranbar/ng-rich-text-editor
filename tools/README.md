# License tooling

Generate Ed25519 key pairs and signed license keys for `ngx-richtext` premium features.

```bash
# Create a new key pair (store the private key securely; never commit it)
node tools/generate-license.mjs --keypair

# Issue a license (reads RTE_LICENSE_PRIVATE_KEY or tools/license-private.key)
node tools/generate-license.mjs --licensee "Acme Inc" --domains "acme.com,*.acme.com"

# Custom term and feature list
node tools/generate-license.mjs --licensee "Acme Inc" --domains "*.acme.com" \
  --expiry 2028-06-30 --features "sourceView,fullscreen"
```

| Flag | Default | Notes |
| --- | --- | --- |
| `--domains` | **required** | Comma-separated hostnames. `*.acme.com` covers the apex and all subdomains. `*` deliberately allows any host — avoid. |
| `--expiry` | one year from today | `YYYY-MM-DD`. |
| `--features` | all premium features | Ids from `RTE_FEATURES`. |
| `--licensee` | `unknown` | Recorded in the payload; shows up in support requests. |
| `--plan` | `premium` | |
| `--private-key` | `tools/license-private.key` | Falls back to `$RTE_LICENSE_PRIVATE_KEY`. |

Local development hosts (`localhost`, `127.0.0.1`, `0.0.0.0`, `*.localhost`) bypass
domain binding, so customers do not need a key for `ng serve` or CI.

Embed only the **public** key in `projects/ngx-richtext/src/lib/license/public-key.ts`.

## Rotating the signing key

Rotating invalidates every key ever issued — all customers need reissued keys.
Do it only on private-key compromise.

1. `node tools/generate-license.mjs --keypair`
2. Save `PRIVATE_KEY_B64` to `tools/license-private.key` (gitignored) and to your
   secret store.
3. Paste `PUBLIC_KEY_B64` into `public-key.ts`.
4. Reissue the demo key (`projects/demo/src/app/app.config.ts`) and every
   customer key, then publish a new library version.
