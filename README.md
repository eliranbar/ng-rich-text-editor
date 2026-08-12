# ngx-richtext workspace

Angular workspace for the **`ngx-richtext`** npm package — a professional rich text editor with free and premium feature tiers.

**[Live demo → https://ngx-richtext.ebdev-design.com](https://ngx-richtext.ebdev-design.com)**

## Projects

| Project | Path | Description |
| --- | --- | --- |
| `ngx-richtext` | `projects/ngx-richtext` | Publishable Angular library |
| `demo` | `projects/demo` | Showcase app (forms, image upload, dark mode, HTML preview) — deployed at [ngx-richtext.ebdev-design.com](https://ngx-richtext.ebdev-design.com) |

## Scripts

```bash
npm start            # serve demo at http://localhost:4200
npm run build        # build the library to dist/ngx-richtext
npm run build:demo   # build the demo app
npm test             # unit tests (Vitest)
npm run e2e          # Playwright end-to-end tests
npm run license      # generate a signed premium license key
npm run publish:dry  # npm publish --dry-run of the built package
```

## License key tooling

```bash
# rotate the signing key pair (embed the public half in src/lib/license/public-key.ts)
node tools/generate-license.mjs --keypair

# issue a customer key — bound to their hostnames, one year by default
RTE_LICENSE_PRIVATE_KEY=... node tools/generate-license.mjs \
  --licensee "Acme Inc" --domains "acme.com,*.acme.com"
```

`--domains` is mandatory: the generator refuses to issue an unbound key, because a
key with no host restriction is worth stealing out of a shipped JS bundle. Local
development hosts (`localhost`, `127.0.0.1`, `*.localhost`) always pass, so
customers never need a separate key for `ng serve`.

Keys are stamped with a `kid` naming the signing generation that produced them, and
the client trusts an ordered **keyring** rather than a single key. The successor for
the next rotation ships roughly a year before it signs anything, which is what makes
rotation a server-side change instead of a coordinated customer upgrade. Full
runbook: [tools/README.md](tools/README.md).

Never commit a production private key. `tools/license-private*.key` is gitignored.

## License

**Not MIT.** ngx-richtext is source-available under the [ngx-richtext License
Agreement](LICENSE): the free tier is free forever in any application including
commercial ones, premium features require a purchased key, and redistributing the
library itself — or patching out the feature gate — is not permitted.

## Docs

See [projects/ngx-richtext/README.md](projects/ngx-richtext/README.md) for the package API and usage guide.
