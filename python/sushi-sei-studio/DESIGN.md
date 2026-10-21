# Design direction
Audience: nearby market shoppers browsing on a phone and people planning a small gathering.

Primary task: find a roll, make a pickup list, then call the restaurant. Secondary tasks: discover party trays, check market hours, and get directions.

The original website's narrow fixed layout, dense navigation, and dated presentation become an editorial market storefront: warm ivory, forest green, a restrained rust accent, large Bodoni Moda headings, and Manrope interface text. A close-up sushi photograph establishes the food immediately; a two-column menu ledger keeps item descriptions and prices easy to scan.

The chef story and Ardmore Farmers Market location distinguish this specific business. The design avoids invented awards, ratings, or online ordering claims. Menu prices remain labelled as posted estimates. Illustrative photography is credited.

Responsive behavior: the menu becomes one column, the navigation collapses, and dialog controls remain usable on small screens. Semantic headings, labelled forms, focus rings, native dialog behavior, reduced motion, and explicit empty/error states support access.

Implementation boundaries: one canonical JSON catalogue feeds both interfaces. Browser preview mode has local demo persistence. Full-stack mode uses authoritative Python quotes and SQLite. No restaurant communication is performed.

Validation evidence lives in GitHub Actions artifacts and the hosted preview's qa directory. Review desktop and mobile together; batch material fixes and confirm the affected paths once.

## Full-menu expansion
The existing editorial world is preserved: the hero, typefaces, palette, straight ledger rules, green story section, and generous section spacing remain authoritative. The full original restaurant site is integrated into one page. Its menu now exposes every canonical group through 12 categories, with a sticky desktop category index and a native mobile selector. Search spans names, ingredients, and tray contents; quick filters use dietary metadata. Categories and prices come from the same catalogue as the Python API.

White and brown rice are choices within a menu entry, but remain distinct purchasable IDs with independent saved quantities. Minus, quantity, and plus are visible directly beside each priced entry; decrementing to zero removes that choice. Unpriced original entries show a phone action, never a zero-dollar estimate. Party trays include source photographs, guest counts, expandable ingredient lists, both rice prices, and source uncertainty where applicable.

The single-page content also contains the chef's complete career origin, restaurant mission and environmental values, catering and on-site event guidance, a sushi glossary, original restaurant food photography, house sauces and pantry notes, careers guidance, address, hours, phone, and email. Hiring and environmental statements retain their original-site context. Contradictory historical dates and unsupported nutritional claims are omitted. The gallery uses original restaurant photographs; the existing hero remains clearly credited illustrative photography.

Validation covers grouping and every category, separate white/brown price arithmetic and removal, nullable prices, mobile category selection, all six trays, expandable contents, keyboard dialog behavior, static persistence, backend integration, and accessibility. Browser screenshots eagerly load the gallery and tray images before capture. Browser verification is run by the repository's CI where Chromium is available.
