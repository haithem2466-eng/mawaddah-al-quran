# fonts/

`css/fonts.css` already declares `@font-face` rules pointing at this folder. The actual
`.woff2` binaries are not bundled here (open-license font files are large, and redistributing
the exact binaries is outside the scope of this fix), so drop the following files in and they'll
be picked up automatically — no CSS or JS changes needed:

- `AmiriQuran-Regular.woff2` — https://github.com/aliftype/amiri
- `Amiri-Regular.woff2`, `Amiri-Bold.woff2` — https://github.com/aliftype/amiri
- `ScheherazadeNew-Regular.woff2` — https://software.sil.org/scheherazade/
- `CormorantGaramond-Regular.woff2`, `CormorantGaramond-SemiBold.woff2`, `CormorantGaramond-Bold.woff2` — https://github.com/CatharsisFonts/Cormorant
- `Inter-Variable.woff2` — https://github.com/rsms/inter

Until these are added, the type stacks in `css/variables.css` fall back to system serif/sans
fonts, so the app still looks intentional with zero extra setup.
