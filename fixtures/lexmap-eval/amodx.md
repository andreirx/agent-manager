# lexmap relatedness labels
repo: /Users/apple/Documents/APLICATII BIJUTERIE/amodx
identity: HEAD 8eb1aac, 0 uncommitted entries, inputs sha256:f8366942c0f98843a26711d3523afcde23cd1de90b08d72da7f187f005a14c82
seed: 1
median-tokens: 22

How to label: for each candidate, would a reviewer of a change in the query file need to open this file to judge the change — because it defines what the query uses, uses what the query defines, or is the other half of the same feature (schema, contract, consumer, sibling implementation)? Mark [x] yes, [ ] no, [?] cannot tell. Sharing only framework vocabulary, or merely sitting in the same layer, is "no". Open the files; the "shares" list is orientation, not evidence. Add a short reason after "⇒".

## query: admin/src/pages/Comments.tsx
rare: commentsRes, deleteComment, pageMap, setPages, setComments, updateStatus, UPDATE_STATUS, contentRes

- [ ] admin/src/pages/Email.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, toLocaleString, CardHeader ⇒
- [ ] admin/src/pages/Coupons.tsx — shares: colSpan, onValueChange, SelectContent, SelectTrigger, SelectValue, TableBody ⇒
- [ ] admin/src/pages/OrderDetail.tsx — shares: newStatus, colSpan, onValueChange, SelectContent, SelectTrigger, SelectValue ⇒
- [ ] admin/src/pages/Reviews.tsx — shares: colSpan, onValueChange, SelectContent, SelectTrigger, SelectValue, TableBody ⇒
- [ ] admin/src/pages/Migration.tsx — shares: TableBody, TableCell, TableHead, TableHeader, TableRow, toLocaleString ⇒
- [ ] admin/src/pages/Orders.tsx — shares: colSpan, onValueChange, SelectContent, SelectTrigger, SelectValue, TableBody ⇒
- [ ] admin/src/pages/CustomerDetail.tsx — shares: colSpan, TableBody, TableCell, TableHead, TableHeader, TableRow ⇒
- [ ] backend/src/users/list.ts — shares: Map ⇒
- [ ] admin/src/pages/Leads.tsx — shares: colSpan, TableBody, TableCell, TableHead, TableHeader, TableRow ⇒
- [ ] admin/src/pages/ContentList.tsx — shares: updateStatus, newStatus, TableBody, TableCell, TableHead, TableHeader ⇒
- [ ] renderer/src/components/RenderBlocks.tsx — shares: forEach ⇒
- [ ] admin/src/pages/Settings.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, CardHeader, SelectItem ⇒
- [ ] backend/src/import/wxr-parser.ts — shares: none ⇒
- [ ] admin/src/pages/DigitalProductEditor.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, CardHeader, SelectItem ⇒
- [ ] admin/src/pages/PopupEditor.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, CardHeader, SelectItem ⇒
- [ ] admin/src/pages/FormEditor.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, CardHeader, SelectItem ⇒
- [ ] admin/src/pages/Users.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, TableBody, TableCell ⇒
- [ ] admin/src/pages/Categories.tsx — shares: newStatus, colSpan, TableBody, TableCell, TableHead, TableHeader ⇒
- [ ] admin/src/pages/ProductEditor.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, CardHeader, SelectItem ⇒
- [ ] admin/src/pages/Products.tsx — shares: colSpan, onValueChange, SelectContent, SelectTrigger, SelectValue, TableBody ⇒
- [ ] admin/src/pages/FormSubmissions.tsx — shares: loadData, colSpan, TableBody, TableCell, TableHead, TableHeader ⇒
- [ ] admin/src/pages/Popups.tsx — shares: colSpan, TableBody, TableCell, TableHead, TableHeader, TableRow ⇒
- [ ] renderer/src/components/PopupManager.tsx — shares: forEach, useEffect, onClick, useState, prev ⇒
- [ ] admin/src/pages/DigitalProducts.tsx — shares: colSpan, onValueChange, SelectContent, SelectTrigger, SelectValue, TableBody ⇒
- [ ] admin/src/pages/Reports.tsx — shares: loadData, colSpan, TableBody, TableCell, TableHead, TableHeader ⇒

## query: backend/src/context/update.ts
rare: UPDATE_CONTEXT, updatedFields, AmodxHandler, updatedBy, UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler

- [ ] renderer/src/components/AccountPageView.tsx — shares: Update, Object ⇒
- [ ] backend/src/import/glam-pricelist.ts — shares: updatedBy, ExpressionAttributeNames, _handler, updatedAt, toISOString, publishAudit ⇒
- [ ] backend/src/reviews/update.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, pathParameters, updatedAt ⇒
- [ ] backend/src/content/restore.ts — shares: updatedBy, pathParameters, updatedAt, toISOString, publishAudit, sourceIp ⇒
- [ ] backend/src/orders/create.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, updatedAt, toISOString ⇒
- [ ] backend/src/orders/update-status.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, pathParameters, updatedAt ⇒
- [ ] backend/src/content/update.ts — shares: AmodxHandler, updatedBy, UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler ⇒
- [ ] backend/src/signals/update.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, pathParameters, updatedAt ⇒
- [ ] renderer/src/app/api/posts/route.ts — shares: ExpressionAttributeNames, ExpressionAttributeValues ⇒
- [ ] backend/src/popups/update.ts — shares: updatedFields, _handler, pathParameters, updatedAt, toISOString, publishAudit ⇒
- [ ] backend/src/import/glam-images.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, updatedAt, toISOString ⇒
- [ ] backend/src/customers/update.ts — shares: UpdateExpression, UpdateCommand, _handler, pathParameters, updatedAt, toISOString ⇒
- [ ] backend/src/forms/update.ts — shares: updatedFields, _handler, pathParameters, updatedAt, toISOString, publishAudit ⇒
- [ ] backend/src/tenant/settings.ts — shares: updatedFields, AmodxHandler, updatedBy, ExpressionAttributeNames, updatedAt, toISOString ⇒
- [ ] backend/src/import/woocommerce.ts — shares: _handler, updatedAt, toISOString, publishAudit, sourceIp, ExpressionAttributeValues ⇒
- [ ] renderer/src/components/DynamicForm.tsx — shares: none ⇒
- [ ] admin/src/pages/ContentList.tsx — shares: updatedAt, Updated ⇒
- [ ] backend/src/products/bulk-price.ts — shares: _handler, updatedAt, toISOString, publishAudit, sourceIp, ExpressionAttributeValues ⇒
- [ ] backend/src/orders/update.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, pathParameters, updatedAt ⇒
- [ ] backend/src/customers/public-update.ts — shares: AmodxHandler, UpdateExpression, UpdateCommand, _handler, updatedAt, toISOString ⇒
- [ ] backend/src/categories/update.ts — shares: updatedFields, _handler, pathParameters, updatedAt, toISOString, publishAudit ⇒
- [ ] backend/src/coupons/update.ts — shares: updatedFields, _handler, pathParameters, updatedAt, toISOString, publishAudit ⇒
- [ ] backend/src/context/create.ts — shares: AmodxHandler, _handler, updatedAt, toISOString, publishAudit, sourceIp ⇒
- [ ] backend/src/products/update.ts — shares: updatedFields, _handler, pathParameters, updatedAt, toISOString, publishAudit ⇒
- [ ] backend/src/categories/delete.ts — shares: _handler, pathParameters, publishAudit, sourceIp, ExpressionAttributeValues, GetCommand ⇒

## query: backend/src/delivery/update.ts
rare: deliveryDaysOfWeek, deliveryLeadDays, allowedCounties, restrictDeliveryZones, allowedCountries, blockedDates, unblockedDates, yearlyOffDays

- [ ] backend/src/forms/update.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/import/reviews.ts — shares: _handler, PutCommand, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext, Handler ⇒
- [ ] admin/src/pages/Email.tsx — shares: none ⇒
- [ ] backend/src/lib/revalidate-paths.ts — shares: none ⇒
- [ ] backend/src/categories/create.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/popups/create.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/coupons/update.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/delivery/get.ts — shares: deliveryDaysOfWeek, deliveryLeadDays, allowedCounties, restrictDeliveryZones, allowedCountries, blockedDates ⇒
- [ ] backend/src/context/get.ts — shares: APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/products/bulk-price.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] renderer/src/components/CheckoutPageView.tsx — shares: defaultCountry, availableCountries, availableCounties, flatShippingCost, freeDeliveryThreshold ⇒
- [ ] backend/src/categories/update.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/delivery/available-dates.ts — shares: deliveryDaysOfWeek, deliveryLeadDays, blockedDates, unblockedDates, yearlyOffDays, DELIVERYCONFIG ⇒
- [ ] backend/src/products/update.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] tools/mcp-server/src/index.ts — shares: blockedDates, unblockedDates, yearlyOffDays, freeDeliveryThreshold, updatedAt ⇒
- [ ] backend/src/orders/create.ts — shares: allowedCounties, restrictDeliveryZones, allowedCountries, minimumOrderAmount, flatShippingCost, freeDeliveryThreshold ⇒
- [ ] renderer/src/components/SitePage.tsx — shares: defaultCountry, availableCountries, minimumOrderAmount, availableCounties, flatShippingCost, freeDeliveryThreshold ⇒
- [ ] backend/src/import/glam-pricelist.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] packages/shared/src/index.ts — shares: deliveryDaysOfWeek, deliveryLeadDays, allowedCounties, restrictDeliveryZones, allowedCountries, blockedDates ⇒
- [ ] backend/src/import/woocommerce.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/products/create.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/popups/update.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] admin/src/pages/DeliverySettings.tsx — shares: deliveryDaysOfWeek, deliveryLeadDays, allowedCounties, restrictDeliveryZones, allowedCountries, blockedDates ⇒
- [ ] packages/shared/src/country-packs/ro.ts — shares: none ⇒
- [ ] backend/src/signals/create.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒

## query: packages/shared/src/locale-strings.ts
rare: FALLBACK_LOCALE, LDMLPluralRule, englishForms, ownString, packFor, packForms, pluralCategories, resolvedOptions

- [ ] packages/plugins/src/video/VideoRender.tsx — shares: LOCALE1C, BlockStrings, blockStrings, IFRAME, NAMES, accessible ⇒
- [ ] packages/shared/src/facets.ts — shares: isArray, SitePage, Anything, NON, Intl, among ⇒
- [ ] packages/plugins/src/video-hero/VideoHeroRender.tsx — shares: LOCALE1C, BlockStrings, blockStrings, IFRAME, NAMES, accessible ⇒
- [ ] packages/shared/src/language-packs/index.ts — shares: EN_LANGUAGE_PACK, LanguagePack, LANGUAGE_PACKS, LOCALE1, subtag, packs ⇒
- [ ] renderer/src/lib/dynamo.ts — shares: normalizeLocale, catalogStrings, siteStrings, legalLinks, mapTenant, countryCode ⇒
- [ ] packages/plugins/src/features/FeaturesRender.tsx — shares: none ⇒
- [ ] renderer/src/components/SitePage.tsx — shares: ResolvedLocaleStrings, hasOwnProperty, selectPluralText, catalogStrings, blockStrings, LocaleStrings ⇒
- [ ] renderer/src/components/InterestShortlist.tsx — shares: selectPluralText, DynamicForm, LocaleStrings, fillTemplate, isArray, SitePage ⇒
- [ ] packages/shared/src/language-packs/en.ts — shares: EN_LANGUAGE_PACK, PluralRules, legalConsumerProtectionLabel, cookieAcceptAll, cookieDescription, cookieNecessaryOnly ⇒
- [ ] packages/shared/src/language-packs/ro.ts — shares: LanguagePack, legalConsumerProtectionLabel, cookieAcceptAll, cookieDescription, cookieNecessaryOnly, legalDisputeResolutionLabel ⇒
- [ ] admin/src/pages/Labels.tsx — shares: languageDefault, CookieOrLegalLabelKey, PluralCategory, CountText, COOKIE_AND_LEGAL_LABEL_LOCATIONS, hasOwnProperty ⇒
- [ ] backend/src/forms/delete.ts — shares: none ⇒
- [ ] backend/src/import/wordpress.ts — shares: keyed, direct, either, complete, pattern ⇒
- [ ] renderer/src/app/[siteId]/layout.tsx — shares: hasOwnProperty, localeLanguageSubtag, legalConsumerProtectionLabel, cookieAcceptAll, cookieDescription, cookieNecessaryOnly ⇒
- [ ] admin/src/components/glamPreview.ts — shares: LocaleStringsInput, resolveLocaleStrings, isArray, SitePage, selection, clock ⇒
- [ ] tools/mcp-server/src/index.ts — shares: fromEntries, isArray, BLOCK, fits, REVIEWS, satisfies ⇒
- [ ] admin/src/pages/StrategyEditor.tsx — shares: PUT ⇒
- [ ] admin/src/pages/Settings.tsx — shares: baseName, LANGUAGE_PACKS, normalizeLocale, legalLinks, countryCode, resolveLocaleStrings ⇒
- [ ] renderer/src/components/RenderBlocks.tsx — shares: BlockStrings, blockStrings, fromEntries, isArray, prop, Per ⇒
- [ ] packages/shared/src/language-packs/types.ts — shares: CatalogStrings, CompletePart, PluralTexts, SiteStrings, CommerceStrings, LanguagePack ⇒
- [ ] admin/src/context/TenantContext.tsx — shares: countryCode, catalogMode, MODE, CATALOG, settings ⇒
- [ ] packages/plugins/src/reviews-carousel/ReviewsCarouselRender.tsx — shares: BlockStrings, blockStrings, isArray, dateLocale, arab, DATE ⇒
- [ ] backend/src/tenant/settings.ts — shares: CookieOrLegalLabelKey, PLURAL_CATEGORIES, COOKIE_AND_LEGAL_LABEL_LOCATIONS, catalogStrings, siteStrings, legalLinks ⇒
- [ ] backend/src/import/glam-pricelist.ts — shares: fromEntries, isArray, catalogMode, exceptions, decided, placeholders ⇒
- [ ] packages/shared/src/index.ts — shares: CatalogStrings, LocaleStringsInput, PluralTexts, ResolvedLocaleStrings, ResolvedPart, SiteStrings ⇒

## query: renderer/middleware.ts
rare: DYN_SEGMENT, PREVIEW_HOST_FORBIDDEN, getAll, originHeader, seg1, seg2, cleanHost, dynamicPath

- [ ] packages/shared/src/sandbox.ts — shares: Keeping, attribution, APIs, keeping, enforced, collapses ⇒
- [ ] backend/src/scheduled/debounce-flush.ts — shares: CloudFront, FALSE, enqueues, enqueue, enter, Once ⇒
- [ ] infra/lib/amodx-stack.ts — shares: NextAuth, CloudFront, isn, PRODUCTION, Requests, widening ⇒
- [ ] .github/workflows/ci.yml — shares: CloudFront, contracts, larger, omission, ORIGIN, worth ⇒
- [ ] scripts/verify-opennext-patch.mjs — shares: fixISRHeaders, CloudFront, clone, Mitigation, sole, hunk ⇒
- [ ] tools/mcp-server/src/index.ts — shares: CloudFront, Keeping, Handlers, REPLACES, Always, Assets ⇒
- [ ] packages/plugins/src/common/videoSource.ts — shares: indexOf, endsWith, toLowerCase, CloudFront, segs, issued ⇒
- [ ] renderer/src/app/[siteId]/layout.tsx — shares: ReferralCapture, CloudFront, issued, hence, hydration, attribution ⇒
- [ ] renderer/src/app/api/revalidate/route.ts — shares: NextRequest, NextResponse, CloudFront, refreshes, dotted, adapters ⇒
- [ ] renderer/src/components/SitePage.tsx — shares: sessionToken, indexOf, NextAuth, _site, startsWith, fed ⇒
- [ ] admin/src/pages/Settings.tsx — shares: _site, Prefixes, Routing, stricter, hence, Self ⇒
- [ ] packages/shared/vitest.config.ts — shares: onto, truth, even, claim, directly, explicit ⇒
- [ ] renderer/src/app/api/ref/route.ts — shares: sameSite, CachingDisabled, httpOnly, nextUrl, maxAge, HttpOnly ⇒
- [ ] admin/src/components/ui/input.tsx — shares: none ⇒
- [ ] renderer/src/app/[siteId]/%5Fdyn/[[...slug]]/page.tsx — shares: __Secure, _dyn, sessionToken, NextAuth, _site, CloudFront ⇒
- [ ] renderer/src/lib/dynamo.ts — shares: endsWith, toLowerCase, startsWith, CloudFront, circuit, blip ⇒
- [ ] renderer/src/lib/origin-guard.ts — shares: forwardedHost, CloudFront, attach, PRODUCTION, ORIGIN, downgrade ⇒
- [ ] backend/src/reviews/update.ts — shares: startsWith, CloudFront, Refusing, disjoint, counterpart, flips ⇒
- [ ] renderer/src/components/ReferralCapture.tsx — shares: HttpOnly, ReferralCapture, amodx_ref, CloudFront, WRITTEN, poisoning ⇒
- [ ] backend/src/lib/review-media.ts — shares: endsWith, toLowerCase, startsWith, CloudFront, DESTINATION, exceeds ⇒
- [ ] backend/src/lib/invalidate-cdn.ts — shares: CloudFront, Don, enqueue, unlike, generation, ANY ⇒
- [ ] packages/plugins/src/markdown/MarkdownRender.tsx — shares: Self, even, weight, literal ⇒
- [ ] admin/src/pages/StrategyEditor.tsx — shares: router ⇒
- [ ] infra/lib/renderer-hosting.ts — shares: defaultCookies, hasSessionCookie, HostRewriteFunction, SESSION_COOKIE_BASES, maxAge, __Secure ⇒
- [ ] packages/shared/src/index.ts — shares: endsWith, toLowerCase, startsWith, CloudFront, Bounding, defeating ⇒

## query: renderer/src/context/CartContext.tsx
rare: CartContextType, CouponState, couponRaw, getCartKey, getItemKey, setCouponState, setLoaded, CartItem

- [ ] admin/src/context/AuthContext.tsx — shares: createContext, useContext, ReactNode, useEffect, useState, Provider ⇒
- [ ] packages/effects/src/render.tsx — shares: useCallback, useEffect, useState, ctx, void ⇒
- [ ] packages/shared/src/index.ts — shares: productImage, selectedVariant, productSlug, unitPrice, productTitle, addedCost ⇒
- [ ] renderer/src/components/AddToCartButton.tsx — shares: personalizationCost, productImage, useCart, selectedVariant, addItem, productSlug ⇒
- [ ] renderer/src/components/Providers.tsx — shares: CartProvider, CartContext, ReactNode ⇒
- [ ] admin/src/pages/OrderDetail.tsx — shares: unitPrice, useEffect, useState, reduce, sum, quantity ⇒
- [ ] admin/src/components/layout/Sidebar.tsx — shares: useState, void ⇒
- [ ] backend/src/users/toggle-status.ts — shares: none ⇒
- [ ] backend/src/orders/create.ts — shares: personalizationCost, selectedVariant, unitPrice, productTitle, addedCost, quantity ⇒
- [ ] packages/plugins/src/columns/index.ts — shares: none ⇒
- [ ] renderer/src/components/CookieConsent.tsx — shares: setItem, getItem, removeItem, localStorage, useEffect, useState ⇒
- [ ] admin/vitest.config.ts — shares: none ⇒
- [ ] renderer/src/components/CartPageView.tsx — shares: setCoupon, updateQuantity, personalizationCost, itemCount, productImage, useCart ⇒
- [ ] renderer/src/components/PopupManager.tsx — shares: useCallback, setItem, getItem, useEffect, useState, prev ⇒
- [ ] renderer/src/components/CheckoutPageView.tsx — shares: clearCart, personalizationCost, productImage, useCart, setItem, selectedVariant ⇒
- [ ] packages/plugins/src/reviews-carousel/ReviewsCarouselEditor.tsx — shares: addItem, removeItem, useState, void ⇒
- [ ] admin/src/lib/api.ts — shares: getItem, removeItem, localStorage ⇒
- [ ] admin/src/pages/ProductEditor.tsx — shares: addedCost, useEffect, useState, prev, quantity, loaded ⇒
- [ ] renderer/src/lib/interest.ts — shares: setItem, addItem, getItem, removeItem, Omit, void ⇒
- [ ] renderer/src/components/CartWidget.tsx — shares: itemCount, useCart, CartContext, subtotal ⇒
- [ ] packages/plugins/src/carousel/CarouselEditor.tsx — shares: addItem, removeItem, useState, prev ⇒
- [ ] admin/src/context/TenantContext.tsx — shares: createContext, useContext, setItem, ReactNode, getItem, localStorage ⇒
- [ ] admin/src/pages/Reviews.tsx — shares: ReactNode, useEffect, useState, Omit, sum, void ⇒
- [ ] admin/src/pages/Labels.tsx — shares: createContext, useContext, useEffect, useState, Provider, prev ⇒
- [ ] renderer/src/app/api/consent/route.ts — shares: none ⇒
