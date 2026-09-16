# RayCut

A local-first Raycast shortcut visualizer. React, TypeScript, and Vite; a static build with no backend.

## Run locally

Requires Node 22.12+.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. `/` shows Teddio’s 18-key demo; `/import` opens the file importer.

## Explore

Click the keyboard’s modifier keys to toggle exact combinations. Search jumps to the matching layer. Click a key for its full name and duplicate assignments. Choose Silver, Space Black, Midnight, or Starlight with the header swatches. Open means unassigned in the imported Raycast export, not necessarily available in macOS or other apps.

The keyboard is US ANSI. Unrecognized modifier formats are reported instead of being silently weakened. Bindings outside this layout appear in import notes. On small screens, the keyboard scrolls horizontally.

## Imports and privacy

Supports classic AES-256-CBC `.rayconfig`, legacy gzip exports, the Raycast X gzip/AES-GCM envelope, and `RAYCFG3` AES-GCM containers. Browser Web Crypto handles encryption; scrypt runs in a Web Worker. Imports and passwords stay in memory for the tab’s lifetime. No network upload, analytics, browser storage, or external fonts.

The demo is `src/data/demo.json`: only shortcut labels, bindings, categories, generic source labels, and export version. The original export and `.local/` are ignored by Git and blocked by the development server. Neither is copied into the production build.

A quicklink title absent from the export appears as “Quicklink”. Names recovered from identifiers are identified in key details. Function, media, and non-US keys may appear in import notes. Import limit: 64 MB compressed / 256 MB expanded; export settings only for large configurations.

### Update the demo

```sh
npm run demo -- 'path/to/export.rayconfig'
```

The local CLI asks for the password (visible in that terminal); `RAYCAST_EXPORT_PASSWORD` is also accepted. The password is not saved. Review `src/data/demo.json` before publishing; labels can themselves be personal. Do not add your `.rayconfig` to the repository.

## Check

```sh
npm test
npm run test:e2e
npm run build
```

For the first browser test run, install Chromium with `npx playwright install chromium` if it is not already present. Tests use synthetic encrypted exports generated independently with Node crypto. The checked-in demo is verified to contain 18 supported bindings. Headless browser tests cover filtering, search, import retry, duplicate assignments, privacy, modal dismissal, mobile sizing, and blocked private files.

## Free static deployment

Connect this repository to Cloudflare Pages: build command `npm run build`, output directory `dist`, Node 22.12+. `public/_redirects` supports direct visits to `/import`. No function or server is required. HTTPS (or localhost) is required for browser cryptography. The app has not been deployed.

## Format references

The importer is independently implemented from these format descriptions:

- [Classic Raycast export format](https://github.com/abue-ammar/tinycast/blob/8915adc3e9fb500192c34b92252cd45e81d5e04a/docs/features/raycast-import.md)
- [Current Raycast container format](https://github.com/abue-ammar/tinycast/blob/main/docs/features/raycast-import.md)

Real classic-format export decoding has been verified. Modern encrypted formats are covered by synthetic compatibility fixtures; additional real exports are useful for verifying future schema changes.
