# Add JDG to Uprising

## Goal
Add a self-contained JDG fashion experience as a secondary part of Uprising, using only the supplied emblem and garment mockups. Existing Uprising pages, data, companions, and behavior remain unchanged.

## Product interpretation
- Group the five colour mockups into one **JDG Rebirth Emblem T-Shirt** product with white, black, royal blue, burgundy, and forest green colourways.
- Group the four sleeveless mockups into one **JDG Paneled Sleeveless Top** product with white/gold, black/gold, royal blue/cream, and forest green/cream colourways.
- Treat names, prices, sizes, availability, descriptions, stories, and purchase links as editable content fields. Unknown facts remain clearly marked as unavailable or coming soon; no fictional sales information or checkout will be created.
- Use the supplied gold emblem unchanged as the primary JDG mark. The unrelated Uprising/tree uploads will not be presented as JDG product photography.

## Build
1. **Create a scalable JDG catalogue**
   - Add one typed product data file containing slugs, categories, image groups, colourways, optional sizes, optional price, description, story, availability, and optional external purchase URL.
   - Keep product rendering driven entirely by this data so future launches are content updates rather than page redesigns.
   - Store the supplied binary images through the project asset system and import their immutable URLs.

2. **Add a contained brand route family**
   - Add lazy-loaded routes for `/brand`, `/brand/collection`, `/brand/lookbook`, `/brand/story`, `/brand/shop`, and `/brand/product/:slug`.
   - Give these routes a dedicated JDG shell with its own restrained sub-navigation: JDG, Collection, Lookbook, Our Story, Shop.
   - Add one `THE BRAND` entry to the existing Uprising menu without changing existing items or their behavior.

3. **Build the JDG home**
   - Create a full-bleed, dark fashion-house presentation led by the untouched gold emblem, `JDG`, `THE REBIRTH OF SELF.`, the supplied supporting copy, and `EXPLORE THE COLLECTION`.
   - Use restrained gold, ink, bone, and deep Uprising green semantic tokens, editorial spacing, subtle motion, and no generic storefront chrome.

4. **Build Collection and product pages**
   - Show only categories represented by current products.
   - Use responsive, lazy-loaded product imagery and colour-aware image switching.
   - Product pages include large imagery, gallery/front-back views where supplied, colour selection, optional size display, description, design story, price, availability, and `SHOP NOW`.
   - `SHOP NOW` opens a real external URL in a safe new tab when supplied; otherwise it is visibly unavailable without simulating checkout.

5. **Build Lookbook and Our Story**
   - Create an editorial lookbook from the supplied garment imagery, with sparse statements around REBIRTH, IDENTITY, TRANSFORMATION, and BECOMING, linking looks to real products.
   - Do not fabricate model or campaign photography; the layout will be ready for those images later.
   - Add the requested minimal story connecting Uprising as the movement and JDG as its physical expression.

6. **Mobile and performance**
   - Prioritize single-column mobile compositions, touch-friendly galleries and selectors, stable image aspect ratios, and no layout shifts.
   - Lazy-load below-the-fold media, preload only the lead visual, and keep all JDG pages code-split from the existing app.
   - Respect reduced-motion preferences.

## Verification
- Check all brand links and sub-navigation on desktop and mobile.
- Confirm the two products are grouped correctly across their supplied views/colourways.
- Test product detail selection, missing-data states, external-link behavior, and unknown-product handling.
- Verify the lookbook and story pages use only supplied assets.
- Confirm existing Uprising routes and primary navigation still open normally.
- Run focused tests and inspect rendered pages at desktop and mobile sizes in the preview. Publishing is excluded unless explicitly requested.

## Technical details
- Reuse React Router, existing Button/link patterns, Framer Motion, Tailwind, and current lazy-loading conventions; add no dependencies.
- Add JDG semantic colour tokens to the existing theme rather than hardcoding page colours.
- Keep JDG code under dedicated brand components/pages/data so it does not touch Community, Talk, Healing Space, profiles, companions, or backend data.
