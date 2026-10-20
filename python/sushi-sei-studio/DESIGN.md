# Design direction
Audience: nearby market shoppers browsing on a phone and people planning a small gathering.

Primary task: find a roll, make a pickup list, then call the restaurant. Secondary tasks: discover party trays, check market hours, and get directions.

The original website's narrow fixed layout, dense navigation, and dated presentation become an editorial market storefront: warm ivory, forest green, a restrained rust accent, large Bodoni Moda headings, and Manrope interface text. A close-up sushi photograph establishes the food immediately; a two-column menu ledger keeps item descriptions and prices easy to scan.

The chef story and Ardmore Farmers Market location distinguish this specific business. The design avoids invented awards, ratings, or online ordering claims. Menu prices remain labelled as posted estimates. Illustrative photography is credited.

Responsive behavior: the menu becomes one column, the navigation collapses, and dialog controls remain usable on small screens. Semantic headings, labelled forms, focus rings, native dialog behavior, reduced motion, and explicit empty/error states support access.

Implementation boundaries: one canonical JSON catalogue feeds both interfaces. Browser preview mode has local demo persistence. Full-stack mode uses authoritative Python quotes and SQLite. No restaurant communication is performed.

Validation evidence lives in GitHub Actions artifacts and the hosted preview's qa directory. Review desktop and mobile together; batch material fixes and confirm the affected paths once.
