# Fonts

FZ Poppins — a Vietnamese-localised cut of Poppins. Accented characters come
from the family itself, so nothing drops to the system face glyph-by-glyph the
way Google's Poppins does (it ships no Vietnamese subset).

Seven of the family's eighteen styles are bundled — the ones the UI asks for.
They are registered in `src/theme/fonts.ts` and referenced only through the
aliases in `src/theme/index.ts`:

| File                   | `theme.font` | Used for                          |
| ---------------------- | ------------ | --------------------------------- |
| Poppins-Regular.ttf    | `regular`    | body copy, descriptions           |
| Poppins-Italic.ttf     | `italic`     | quoted speech, notes              |
| Poppins-Medium.ttf     | `medium`     | field values, meta, tab labels    |
| Poppins-SemiBold.ttf   | `semibold`   | card titles, buttons              |
| Poppins-Bold.ttf       | `bold`       | prices, eyebrows, status chips    |
| Poppins-ExtraBold.ttf  | `extrabold`  | display headlines, the wordmark   |
| Poppins-Black.ttf      | `black`      | oversized numerals (404)          |

To add another weight: drop the `.ttf` here, register it in
`src/theme/fonts.ts`, and give it an alias in `src/theme/index.ts`. The source
files for all eighteen live in `../../../Font/18 font Fz Poppins`.
