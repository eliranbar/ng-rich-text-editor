# ngx-richtext workspace

Angular workspace for the **`ngx-richtext`** npm package — a professional rich text editor with free and premium feature tiers.

**[Live demo → https://www.ebdev-design.com](https://www.ebdev-design.com)**

## Projects

| Project | Path | Description |
| --- | --- | --- |
| `ngx-richtext` | `projects/ngx-richtext` | Publishable Angular library |
| `demo` | `projects/demo` | Showcase app (forms, image upload, dark mode, HTML preview) — deployed at [ebdev-design.com](https://www.ebdev-design.com) |

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
node tools/generate-license.mjs --keypair
RTE_LICENSE_PRIVATE_KEY=... node tools/generate-license.mjs --licensee "You" --expiry 2027-12-31
```

Never commit a production private key. `tools/license-private.key` is gitignored (a local demo key may exist for development only).

## Docs

See [projects/ngx-richtext/README.md](projects/ngx-richtext/README.md) for the package API and usage guide.
