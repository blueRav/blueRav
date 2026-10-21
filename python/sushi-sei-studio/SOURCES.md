# Original website content inventory

Source: Sushi Sei Express, http://www.sushiseiexpress.com/, checked October 20, 2026. This portfolio redesign consolidates the original navigation into one page and preserves a link to the original site. Restaurant information and posted prices require confirmation with the business.

| Original page | Included in the redesign |
| --- | --- |
| home.html | Market location, daily sushi, cooked/raw choices, customization guidance, original food photographs |
| menu-1.html | Complete posted menu: 109 item groups including trays, with 186 purchasable variants overall |
| about-sushi-.html | Explanation of sushi and a glossary of the listed sushi styles |
| catering.html | Catering section; original page has no additional service details |
| party-tray.html | All six numbered platters, sizes, piece counts, servings, white/brown prices, listed contents, inclusions, 24-hour notice |
| on-site-event.html | On-site event inquiry guidance; original page publishes no packages, prices, or availability |
| about-us.html | Chef Tu Truong’s career story, market identity, house sauces, pantry tips |
| our-mission.html | Original mission and stated service, people, ingredient, recycling, and composting values |
| career.html | Original sushi chef/helper role, training and skill expectations, call-to-confirm guidance |
| gallery.html | Original standalone page has no gallery content; food photos from the home and party-tray pages supply the integrated gallery |
| contact-us.html | Address, phone, email, hours, directions, and contact actions |

## Menu transcription

The original menu uses absolutely positioned text rather than an HTML table. Item blocks were aligned with their adjacent white- and brown-rice price columns by their page coordinates, rather than pairing prices by DOM order. Menu sections and ingredient alternatives are retained. The canonical catalogue contains one row per purchasable rice option, grouped by group_id for the interface. A la carte pieces, condiments, appetizers, and cucumber wraps retain their own serving descriptions.

The original page contains unusual entries: some cooked small-roll brown-rice prices are lower than their white-rice equivalents, and Sei’s nigiri combo has a different rice-price difference. These posted values are preserved without inventing a uniform surcharge. The salmon bowl’s ingredient copy contains an apparent tuna typo; the redesign identifies it as a salmon bowl and keeps the shared accompaniments without repeating that conflict.

Party tray #3 includes an unnamed eight-piece line in the source. The page explicitly asks customers to confirm that platter’s contents with the chef. Piece counts and stated servings otherwise follow the original listings, rather than recalculating or inventing components.

Historical dates and dietary claims from the original sushi explainer are not reproduced as verified facts. Gluten-free or allergy-safe guarantees are not inferred from ingredient descriptions. Career information is presented as an original-site listing, with current openings to be confirmed. The redesign does not promise on-site services, dates, prices, or delivery not published in the source.

## Images and design resources

Nine original restaurant photographs are listed with their exact public source URLs in data/image-sources.json. The build verifies image response type, JPEG bytes, and size, then writes generated SHA-256 provenance. The hero remains credited as illustrative Unsplash photography. Original restaurant images are used in the gallery and party-tray presentation, not described as newly photographed food.

The existing free Agensi Frontend Design skill informed the editorial styling. The expansion preserves that identity and uses free Impeccable design guidance. No paid skill, image service, API call, or subscription is required.

## Behavior boundaries

Pickup plans are estimates and do not place orders. The hosted GitHub Pages preview keeps plan and inquiry demo state in the browser. The full FastAPI application prices the same item variants from the canonical catalogue and stores demo inquiries in SQLite. Neither mode sends requests to the restaurant. Public phone, email, and directions links allow visitors to contact the business themselves.
