# Browser Support

> [!NOTE]
> This document has been consolidated into **[BROWSER_COMPATIBILITY.md](./BROWSER_COMPATIBILITY.md)**, which serves as the canonical browser and bundler compatibility reference for `@trustflow/sdk`.

For complete details on supported browser versions, WebCrypto runtime requirements, feature detection, polyfill guidance, and bundler compatibility, please refer to **[docs/BROWSER_COMPATIBILITY.md](./BROWSER_COMPATIBILITY.md)**.

## Minimum Supported Versions Summary

| Browser | Minimum version | Notes |
| ------- | --------------- | ----- |
| Chrome / Edge | 49+ | Requires secure context (HTTPS / `localhost`) for `crypto.subtle` |
| Firefox | 52+ | Requires secure context (HTTPS / `localhost`) for `crypto.subtle` |
| Safari (macOS / iOS) | 15.4+ | Requires WebCrypto (`crypto.subtle`) available in Safari 15.4+ |
| Node.js | 20+ | See `engines` in `package.json` |

*Last verified against `@trustflow/sdk` runtime requirements in October 2026. See [BROWSER_COMPATIBILITY.md](./BROWSER_COMPATIBILITY.md) for full matrix and verification suite.*

## Web APIs used

- `crypto.subtle` + `crypto.getRandomValues` — WebCrypto for Ed25519 signing and verification (required)
- `fetch` (via `axios` XHR fallback) — HTTP transport for backend/IPFS calls
- `BigInt` — stroop amounts, event payloads (required)
- `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` — `formatDateTime` / `formatRelativeTime`
- `localStorage` — session persistence (browser); Node falls back to an
  in-memory adapter (see `configureSessionStorage()` for custom backends)
- `Buffer` (Node) — event XDR decoding uses `Buffer.from(xdr, 'base64')`;
  bundlers targeting browsers should polyfill `Buffer` (e.g. `buffer` package)

## Feature detection

Check for the APIs you use before calling them:

```typescript
import { detectFeatures, assertWebCryptoSupport } from '@trustflow/sdk';

const report = detectFeatures();
if (!report.supported) {
  for (const feature of report.missing) {
    console.error(`${feature.label}: ${feature.reason}`);
  }
}

assertWebCryptoSupport('signing an auth challenge');
```

## Polyfill requirements

- **WebCrypto**: Safari < 15.4 or insecure contexts (`http://`) hide `crypto.subtle`. Load a polyfill before initialising the SDK if legacy browser support is needed.
- **BigInt**: no polyfill exists — upgrade the browser instead.
- **fetch**: all supported browsers ship it; very old WebViews may need `whatwg-fetch`.
- **Buffer**: only needed for `parseEvent`/`parseEvents` in the browser. With Vite/webpack 5 add the `buffer` package and alias `Buffer` globally; Rsbuild/Next.js do this automatically in most setups.

## Known issues

- React Native / Hermes: `BigInt` is supported on Hermes 0.70+; older versions must upgrade. `localStorage` does not exist — call `configureSessionStorage()` with an AsyncStorage-backed adapter.
- Server-side rendering: `localStorage` is absent during SSR — session helpers automatically use the in-memory adapter; no action needed unless you need cross-request persistence.

## Browser testing in CI

The `browser` CI job (`/.github/workflows/ci.yml`) runs the pure-utility suites under a `jsdom` environment to catch usages of Node-only globals:

```bash
npx jest tests/utils-extended.test.ts --env=jsdom
```
