# RayCut

A local-first Raycast shortcut visualizer. React, TypeScript, and Vite; a static build with no backend.

Open the live app: [raycut.teddio496.workers.dev](https://raycut.teddio496.workers.dev/)

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

## Format references

The importer is independently implemented from these format descriptions:

- [Classic Raycast export format](https://github.com/abue-ammar/tinycast/blob/8915adc3e9fb500192c34b92252cd45e81d5e04a/docs/features/raycast-import.md)
- [Current Raycast container format](https://github.com/abue-ammar/tinycast/blob/main/docs/features/raycast-import.md)

The importer follows the documented classic and current Raycast export formats.
