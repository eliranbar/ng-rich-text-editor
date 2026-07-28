# License tooling

Generate Ed25519 key pairs and signed license keys for `ngx-richtext` premium features.

```bash
# Create a new key pair (store the private key securely; never commit it)
node tools/generate-license.mjs --keypair

# Issue a license (reads RTE_LICENSE_PRIVATE_KEY or tools/license-private.key)
node tools/generate-license.mjs --licensee "Acme Inc" --expiry 2027-12-31

# Custom feature list
node tools/generate-license.mjs --features "textColor,tables,fullscreen"
```

Embed only the **public** key in `projects/ngx-richtext/src/lib/license/public-key.ts`.
