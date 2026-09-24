# Standalone JDG Store

## What exists today
1. **Ecommerce functionality:** a showcase only. Pages for JDG home, Collection, Product, Lookbook, Our Story and Shop, all inside Uprising under `/brand`.
2. **Products, sizes, colours, quantity, cart:** 4 products and 15 colourways are hardcoded in the app. Switching colours works. There are no size choices (sizing shows "to be announced"), no quantity picker and no cart.
3. **Checkout:** none. "Shop now" is disabled until a store link is added.
4. **Payments:** none.
5. **Orders:** none are handled or stored.
6. **Backend:** the database holds only Uprising data (community, profiles, companions and so on). It has no product, inventory or order tables.
7. **Missing for a real store:** a live product catalogue with prices and stock, a cart, secure checkout and payment, order records, an owner dashboard, and its own web address.
8. **Separation:** you can reach the store only through Uprising's shell.

## Recommendation
Use **Shopify** to run the commerce side: products, prices, inventory, checkout, payments and orders. Your existing JDG design stays as the storefront, pixel for pixel. You get a proven checkout, payments, tax and shipping, and an owner admin for managing products and orders, without building and securing all of that yourself.

## Steps
1. **Connect Shopify** (you choose a new or an existing store). Create the 4 JDG products in Shopify with their colourways as variants. Prices, sizes and stock are left for you to fill in. No product details will be made up.
2. **Point the existing JDG pages at Shopify data.** The design, product cards, animations, colours, fonts and emblem stay the same. The only change is where product information comes from. Uploaded images stay the same.
3. **Add the missing shopping pieces in the JDG style:**
   - size and quantity selectors on the product page
   - Add to Cart
   - a cart drawer in the JDG header
   - a checkout button that opens Shopify's secure checkout
   - After payment, Shopify's order confirmation page and email
4. **Standalone storefront:**
   - Create a separate JDG app from this project (a copy containing only the JDG pages, shell, assets and design styles). It gets its own address such as `jdg.lovable.app`, and you can connect a custom domain like `jdg.com` later.
   - The store opens at `/` with no Uprising menu, sign-in or companions.
   - Both the standalone store and Uprising's `/brand` section read the same Shopify catalogue. Updating a product once updates both.
5. **Uprising stays unchanged.** Its JDG section keeps working. Optionally, its "Shop" can hand shoppers off to the standalone store.
6. **Owner management:** you manage products, prices, inventory and orders in the Shopify admin. You can also ask me here to add or update products.
7. **Verify** the full journey in the published store: open the store link → browse → product → choose size, colour and quantity → cart → checkout → test payment → confirmation. Also confirm Uprising and its `/brand` section still work.
8. **QR code later**, once the final store address is decided.

## Cost notes
- **New Shopify store:** free to build on. Claim it within 30 days to keep it and start your free trial. Claiming starts a 120-day trial, and a paid plan is required after the trial to sell.
- **Existing store:** connects directly, and changes affect your live store after you confirm them.

## Technical details
- Shopify Storefront API for products and cart. The cart is kept in local storage with a Shopify cart ID, and checkout goes through Shopify's `checkoutUrl`.
- The `jdgProducts.ts` data shape is kept as an adapter layer, so the components stay the same.
- The standalone app is a separate project that reuses the same JDG components, tokens and assets, with no Uprising code or Supabase dependency.
