# lexmap relatedness labels
repo: /Users/apple/Documents/APLICATII BIJUTERIE/amodx
identity: HEAD 8eb1aac, 0 uncommitted entries, inputs sha256:f8366942c0f98843a26711d3523afcde23cd1de90b08d72da7f187f005a14c82
seed: 1
median-tokens: 22

How to label: for each candidate, would a reviewer of a change in the query file need to open this file to judge the change — because it defines what the query uses, uses what the query defines, or is the other half of the same feature (schema, contract, consumer, sibling implementation)? Mark [x] yes, [ ] no, [?] cannot tell. Sharing only framework vocabulary, or merely sitting in the same layer, is "no". Open the files; the "shares" list is orientation, not evidence. Add a short reason after "⇒".

## query: admin/src/pages/Comments.tsx
rare: commentsRes, deleteComment, pageMap, setPages, setComments, updateStatus, UPDATE_STATUS, contentRes

- [ ] admin/src/pages/Email.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, toLocaleString, CardHeader ⇒ sibling admin page; shared shadcn Select/Card vocabulary only
- [ ] admin/src/pages/Coupons.tsx — shares: colSpan, onValueChange, SelectContent, SelectTrigger, SelectValue, TableBody ⇒ sibling admin table page; no comment or content coupling
- [ ] admin/src/pages/OrderDetail.tsx — shares: newStatus, colSpan, onValueChange, SelectContent, SelectTrigger, SelectValue ⇒ order status select; different entity, no shared code
- [ ] admin/src/pages/Reviews.tsx — shares: colSpan, onValueChange, SelectContent, SelectTrigger, SelectValue, TableBody ⇒ reviews moderation page; parallel feature, nothing shared
- [ ] admin/src/pages/Migration.tsx — shares: TableBody, TableCell, TableHead, TableHeader, TableRow, toLocaleString ⇒ import UI only mentions comments in copy text
- [ ] admin/src/pages/Orders.tsx — shares: colSpan, onValueChange, SelectContent, SelectTrigger, SelectValue, TableBody ⇒ sibling list page; table vocabulary only
- [ ] admin/src/pages/CustomerDetail.tsx — shares: colSpan, TableBody, TableCell, TableHead, TableHeader, TableRow ⇒ sibling admin page; table components only
- [ ] backend/src/users/list.ts — shares: Map ⇒ users handler; Comments never calls /users
- [ ] admin/src/pages/Leads.tsx — shares: colSpan, TableBody, TableCell, TableHead, TableHeader, TableRow ⇒ sibling list page; table components only
- [ ] admin/src/pages/ContentList.tsx — shares: updateStatus, newStatus, TableBody, TableCell, TableHead, TableHeader ⇒ lists same /content items but defines nothing Comments uses
- [ ] renderer/src/components/RenderBlocks.tsx — shares: forEach ⇒ renderer block tree; unrelated to admin comments
- [ ] admin/src/pages/Settings.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, CardHeader, SelectItem ⇒ tenant settings page; shared Select vocabulary only
- [ ] backend/src/import/wxr-parser.ts — shares: none ⇒ WordPress import comments type; admin page never sees it
- [ ] admin/src/pages/DigitalProductEditor.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, CardHeader, SelectItem ⇒ editor page; shadcn vocabulary only
- [ ] admin/src/pages/PopupEditor.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, CardHeader, SelectItem ⇒ editor page; shadcn vocabulary only
- [ ] admin/src/pages/FormEditor.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, CardHeader, SelectItem ⇒ editor page; shadcn vocabulary only
- [ ] admin/src/pages/Users.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, TableBody, TableCell ⇒ users page; same layer, no interaction
- [ ] admin/src/pages/Categories.tsx — shares: newStatus, colSpan, TableBody, TableCell, TableHead, TableHeader ⇒ categories page; same layer, no interaction
- [ ] admin/src/pages/ProductEditor.tsx — shares: onValueChange, SelectContent, SelectTrigger, SelectValue, CardHeader, SelectItem ⇒ editor page; shadcn vocabulary only
- [ ] admin/src/pages/Products.tsx — shares: colSpan, onValueChange, SelectContent, SelectTrigger, SelectValue, TableBody ⇒ products list; same layer, no interaction
- [ ] admin/src/pages/FormSubmissions.tsx — shares: loadData, colSpan, TableBody, TableCell, TableHead, TableHeader ⇒ own loadData; different endpoint, no coupling
- [ ] admin/src/pages/Popups.tsx — shares: colSpan, TableBody, TableCell, TableHead, TableHeader, TableRow ⇒ popups list; table vocabulary only
- [ ] renderer/src/components/PopupManager.tsx — shares: forEach, useEffect, onClick, useState, prev ⇒ renderer popup client; React hooks vocabulary only
- [ ] admin/src/pages/DigitalProducts.tsx — shares: colSpan, onValueChange, SelectContent, SelectTrigger, SelectValue, TableBody ⇒ sibling list page; table vocabulary only
- [ ] admin/src/pages/Reports.tsx — shares: loadData, colSpan, TableBody, TableCell, TableHead, TableHeader ⇒ own loadData; reporting page, no coupling
- [ ] admin/src/pages/Forms.tsx — shares: colSpan, TableBody, TableCell, TableHead, TableHeader, TableRow ⇒
- [ ] admin/src/pages/Customers.tsx — shares: colSpan, TableBody, TableCell, TableHead, TableHeader, TableRow ⇒
- [ ] admin/src/components/ui/table.tsx — shares: TableBody, TableCell, TableHead, TableHeader, TableRow, Table ⇒

## query: backend/src/context/update.ts
rare: UPDATE_CONTEXT, updatedFields, AmodxHandler, updatedBy, UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler

- [ ] renderer/src/components/AccountPageView.tsx — shares: Update, Object ⇒ renderer account UI; never touches CONTEXT items
- [ ] backend/src/import/glam-pricelist.ts — shares: updatedBy, ExpressionAttributeNames, _handler, updatedAt, toISOString, publishAudit ⇒ pricelist import; same Dynamo/audit vocabulary only
- [ ] backend/src/reviews/update.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, pathParameters, updatedAt ⇒ reviews entity; parallel handler pattern, no interaction
- [ ] backend/src/content/restore.ts — shares: updatedBy, pathParameters, updatedAt, toISOString, publishAudit, sourceIp ⇒ content entity; audit vocabulary only
- [ ] backend/src/orders/create.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, updatedAt, toISOString ⇒ orders entity; UpdateCommand vocabulary only
- [ ] backend/src/orders/update-status.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, pathParameters, updatedAt ⇒ orders entity; parallel handler, no interaction
- [ ] backend/src/content/update.ts — shares: AmodxHandler, updatedBy, UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler ⇒ content entity update; same pattern, different SK and fields
- [ ] backend/src/signals/update.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, pathParameters, updatedAt ⇒ signals entity; parallel handler, no interaction
- [ ] renderer/src/app/api/posts/route.ts — shares: ExpressionAttributeNames, ExpressionAttributeValues ⇒ renderer posts route; Dynamo vocabulary only
- [ ] backend/src/popups/update.ts — shares: updatedFields, _handler, pathParameters, updatedAt, toISOString, publishAudit ⇒ popups entity; parallel handler, no interaction
- [ ] backend/src/import/glam-images.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, updatedAt, toISOString ⇒ image import; Dynamo vocabulary only
- [ ] backend/src/customers/update.ts — shares: UpdateExpression, UpdateCommand, _handler, pathParameters, updatedAt, toISOString ⇒ customers entity; parallel handler, no interaction
- [ ] backend/src/forms/update.ts — shares: updatedFields, _handler, pathParameters, updatedAt, toISOString, publishAudit ⇒ forms entity; parallel handler, no interaction
- [ ] backend/src/tenant/settings.ts — shares: updatedFields, AmodxHandler, updatedBy, ExpressionAttributeNames, updatedAt, toISOString ⇒ tenant settings handler; no CONTEXT coupling
- [ ] backend/src/import/woocommerce.ts — shares: _handler, updatedAt, toISOString, publishAudit, sourceIp, ExpressionAttributeValues ⇒ WooCommerce import; audit vocabulary only
- [ ] renderer/src/components/DynamicForm.tsx — shares: none ⇒ renderer form component; nothing shared
- [ ] admin/src/pages/ContentList.tsx — shares: updatedAt, Updated ⇒ content list UI; context items are StrategyBoard's
- [ ] backend/src/products/bulk-price.ts — shares: _handler, updatedAt, toISOString, publishAudit, sourceIp, ExpressionAttributeValues ⇒ products bulk update; audit vocabulary only
- [ ] backend/src/orders/update.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, pathParameters, updatedAt ⇒ orders entity; parallel handler, no interaction
- [ ] backend/src/customers/public-update.ts — shares: AmodxHandler, UpdateExpression, UpdateCommand, _handler, updatedAt, toISOString ⇒ customers entity; parallel handler, no interaction
- [ ] backend/src/categories/update.ts — shares: updatedFields, _handler, pathParameters, updatedAt, toISOString, publishAudit ⇒ categories entity; parallel handler, no interaction
- [ ] backend/src/coupons/update.ts — shares: updatedFields, _handler, pathParameters, updatedAt, toISOString, publishAudit ⇒ coupons entity; parallel handler, no interaction
- [x] backend/src/context/create.ts — shares: AmodxHandler, _handler, updatedAt, toISOString, publishAudit, sourceIp ⇒ writes the CONTEXT# item update.ts rewrites; fields must match
- [ ] backend/src/products/update.ts — shares: updatedFields, _handler, pathParameters, updatedAt, toISOString, publishAudit ⇒ products entity; parallel handler, no interaction
- [ ] backend/src/categories/delete.ts — shares: _handler, pathParameters, publishAudit, sourceIp, ExpressionAttributeValues, GetCommand ⇒ categories entity; Dynamo vocabulary only
- [ ] backend/src/context/get.ts — shares: AmodxHandler, pathParameters, GetCommand, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext, ENFORCE ⇒
- [ ] backend/src/context/delete.ts — shares: AmodxHandler, _handler, pathParameters, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext, ENFORCE ⇒
- [ ] backend/src/content/get.ts — shares: AmodxHandler, pathParameters, GetCommand, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext, ENFORCE ⇒
- [ ] backend/src/comments/moderate.ts — shares: UpdateExpression, UpdateCommand, ExpressionAttributeNames, _handler, ExpressionAttributeValues, APIGatewayProxyHandlerV2WithLambdaAuthorizer ⇒
- [ ] backend/src/coupons/delete.ts — shares: _handler, pathParameters, publishAudit, sourceIp, GetCommand, APIGatewayProxyHandlerV2WithLambdaAuthorizer ⇒
- [ ] backend/src/popups/delete.ts — shares: _handler, pathParameters, publishAudit, sourceIp, GetCommand, APIGatewayProxyHandlerV2WithLambdaAuthorizer ⇒
- [ ] backend/src/categories/get.ts — shares: pathParameters, GetCommand, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/forms/get.ts — shares: pathParameters, GetCommand, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/orders/get.ts — shares: pathParameters, GetCommand, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/tenant/list.ts — shares: AmodxHandler, ExpressionAttributeValues, GetCommand, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒

## query: backend/src/delivery/update.ts
rare: deliveryDaysOfWeek, deliveryLeadDays, allowedCounties, restrictDeliveryZones, allowedCountries, blockedDates, unblockedDates, yearlyOffDays

- [ ] backend/src/forms/update.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ forms entity; handler type vocabulary only
- [ ] backend/src/import/reviews.ts — shares: _handler, PutCommand, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext, Handler ⇒ reviews import; handler type vocabulary only
- [ ] admin/src/pages/Email.tsx — shares: none ⇒ email settings page; nothing shared
- [ ] backend/src/lib/revalidate-paths.ts — shares: none ⇒ ISR purge helper; delivery handler never revalidates
- [ ] backend/src/categories/create.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ categories entity; PutCommand vocabulary only
- [ ] backend/src/popups/create.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ popups entity; PutCommand vocabulary only
- [ ] backend/src/coupons/update.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ coupons entity; PutCommand vocabulary only
- [x] backend/src/delivery/get.ts — shares: deliveryDaysOfWeek, deliveryLeadDays, allowedCounties, restrictDeliveryZones, allowedCountries, blockedDates ⇒ reads DELIVERYCONFIG#default; its defaults mirror this field list
- [ ] backend/src/context/get.ts — shares: APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ context entity; handler type vocabulary only
- [ ] backend/src/products/bulk-price.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ products bulk update; vocabulary only
- [x] renderer/src/components/CheckoutPageView.tsx — shares: defaultCountry, availableCountries, availableCounties, flatShippingCost, freeDeliveryThreshold ⇒ consumes defaultCountry/availableCounties/thresholds the config stores
- [ ] backend/src/categories/update.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ categories entity; PutCommand vocabulary only
- [x] backend/src/delivery/available-dates.ts — shares: deliveryDaysOfWeek, deliveryLeadDays, blockedDates, unblockedDates, yearlyOffDays, DELIVERYCONFIG ⇒ reads blockedDates/yearlyOffDays/leadDays from the stored item
- [ ] backend/src/products/update.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ products entity; PutCommand vocabulary only
- [x] tools/mcp-server/src/index.ts — shares: blockedDates, unblockedDates, yearlyOffDays, freeDeliveryThreshold, updatedAt ⇒ MCP client PUTs /delivery; its field names drift from handler
- [x] backend/src/orders/create.ts — shares: allowedCounties, restrictDeliveryZones, allowedCountries, minimumOrderAmount, flatShippingCost, freeDeliveryThreshold ⇒ reads the config for zone checks and shipping cost
- [x] renderer/src/components/SitePage.tsx — shares: defaultCountry, availableCountries, minimumOrderAmount, availableCounties, flatShippingCost, freeDeliveryThreshold ⇒ getDeliveryConfig fields feed cart/checkout props
- [ ] backend/src/import/glam-pricelist.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ pricelist import; handler vocabulary only
- [x] packages/shared/src/index.ts — shares: deliveryDaysOfWeek, deliveryLeadDays, allowedCounties, restrictDeliveryZones, allowedCountries, blockedDates ⇒ DeliveryConfigSchema is the contract; handler bypasses it (types drift)
- [ ] backend/src/import/woocommerce.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ WooCommerce import; handler vocabulary only
- [ ] backend/src/products/create.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ products entity; PutCommand vocabulary only
- [ ] backend/src/popups/update.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ popups entity; PutCommand vocabulary only
- [x] admin/src/pages/DeliverySettings.tsx — shares: deliveryDaysOfWeek, deliveryLeadDays, allowedCounties, restrictDeliveryZones, allowedCountries, blockedDates ⇒ admin client that PUTs this handler's body
- [ ] packages/shared/src/country-packs/ro.ts — shares: none ⇒ static RO regions; config stores free-text counties
- [ ] backend/src/signals/create.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒ signals entity; PutCommand vocabulary only
- [ ] backend/src/context/create.ts — shares: _handler, PutCommand, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/customers/update.ts — shares: _handler, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext, Handler ⇒
- [ ] backend/src/orders/update.ts — shares: _handler, updatedAt, toISOString, APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext, Handler ⇒
- [ ] backend/src/categories/get.ts — shares: APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒
- [ ] backend/src/forms/get.ts — shares: APIGatewayProxyHandlerV2WithLambdaAuthorizer, AuthorizerContext ⇒

## query: packages/shared/src/locale-strings.ts
rare: FALLBACK_LOCALE, LDMLPluralRule, englishForms, ownString, packFor, packForms, pluralCategories, resolvedOptions

- [x] packages/plugins/src/video/VideoRender.tsx — shares: LOCALE1C, BlockStrings, blockStrings, IFRAME, NAMES, accessible ⇒ reads strings.videoTitle; depends on BLOCK_FALLBACK_KEYS rule
- [ ] packages/shared/src/facets.ts — shares: isArray, SitePage, Anything, NON, Intl, among ⇒ facet listing logic; Intl vocabulary only
- [x] packages/plugins/src/video-hero/VideoHeroRender.tsx — shares: LOCALE1C, BlockStrings, blockStrings, IFRAME, NAMES, accessible ⇒ reads strings.videoBackgroundTitle; fallback-key consumer
- [x] packages/shared/src/language-packs/index.ts — shares: EN_LANGUAGE_PACK, LanguagePack, LANGUAGE_PACKS, LOCALE1, subtag, packs ⇒ defines LANGUAGE_PACKS that packFor resolves
- [x] renderer/src/lib/dynamo.ts — shares: normalizeLocale, catalogStrings, siteStrings, legalLinks, mapTenant, countryCode ⇒ calls normalizeLocale/resolveLocaleStrings in mapTenant
- [ ] packages/plugins/src/features/FeaturesRender.tsx — shares: none ⇒ block renderer taking no strings prop
- [x] renderer/src/components/SitePage.tsx — shares: ResolvedLocaleStrings, hasOwnProperty, selectPluralText, catalogStrings, blockStrings, LocaleStrings ⇒ main consumer: resolve, blockStrings, fillTemplate, selectPluralText
- [x] renderer/src/components/InterestShortlist.tsx — shares: selectPluralText, DynamicForm, LocaleStrings, fillTemplate, isArray, SitePage ⇒ calls selectPluralText/fillTemplate on count keys
- [x] packages/shared/src/language-packs/en.ts — shares: EN_LANGUAGE_PACK, PluralRules, legalConsumerProtectionLabel, cookieAcceptAll, cookieDescription, cookieNecessaryOnly ⇒ EN_LANGUAGE_PACK is layer 1 the resolver imports
- [x] packages/shared/src/language-packs/ro.ts — shares: LanguagePack, legalConsumerProtectionLabel, cookieAcceptAll, cookieDescription, cookieNecessaryOnly, legalDisputeResolutionLabel ⇒ registered partial pack packFor resolves; partial semantics
- [x] admin/src/pages/Labels.tsx — shares: languageDefault, CookieOrLegalLabelKey, PluralCategory, CountText, COOKIE_AND_LEGAL_LABEL_LOCATIONS, hasOwnProperty ⇒ uses COOKIE_AND_LEGAL_LABEL_LOCATIONS, pluralCategoriesOf, resolve
- [ ] backend/src/forms/delete.ts — shares: none ⇒ forms handler; nothing shared
- [ ] backend/src/import/wordpress.ts — shares: keyed, direct, either, complete, pattern ⇒ WordPress import; prose words only
- [x] renderer/src/app/[siteId]/layout.tsx — shares: hasOwnProperty, localeLanguageSubtag, legalConsumerProtectionLabel, cookieAcceptAll, cookieDescription, cookieNecessaryOnly ⇒ calls resolveLocaleStrings, fillTemplate, localeLanguageSubtag
- [x] admin/src/components/glamPreview.ts — shares: LocaleStringsInput, resolveLocaleStrings, isArray, SitePage, selection, clock ⇒ calls resolveLocaleStrings with LocaleStringsInput
- [ ] tools/mcp-server/src/index.ts — shares: fromEntries, isArray, BLOCK, fits, REVIEWS, satisfies ⇒ MCP tool server; generic vocabulary only
- [ ] admin/src/pages/StrategyEditor.tsx — shares: PUT ⇒ unrelated editor; shares only PUT
- [x] admin/src/pages/Settings.tsx — shares: baseName, LANGUAGE_PACKS, normalizeLocale, legalLinks, countryCode, resolveLocaleStrings ⇒ calls resolveLocaleStrings; mirrors normalizeLocale steps
- [x] renderer/src/components/RenderBlocks.tsx — shares: BlockStrings, blockStrings, fromEntries, isArray, prop, Per ⇒ passes BlockStrings DTO to every block renderer
- [x] packages/shared/src/language-packs/types.ts — shares: CatalogStrings, CompletePart, PluralTexts, SiteStrings, CommerceStrings, LanguagePack ⇒ defines LanguagePack/CompletePart the resolver imports
- [ ] admin/src/context/TenantContext.tsx — shares: countryCode, catalogMode, MODE, CATALOG, settings ⇒ tenant context; settings vocabulary only
- [x] packages/plugins/src/reviews-carousel/ReviewsCarouselRender.tsx — shares: BlockStrings, blockStrings, isArray, dateLocale, arab, DATE ⇒ reads strings.dateLocale that blockStrings sets
- [x] backend/src/tenant/settings.ts — shares: CookieOrLegalLabelKey, PLURAL_CATEGORIES, COOKIE_AND_LEGAL_LABEL_LOCATIONS, catalogStrings, siteStrings, legalLinks ⇒ PUT /settings validates with PLURAL_CATEGORIES and the nine-key map
- [ ] backend/src/import/glam-pricelist.ts — shares: fromEntries, isArray, catalogMode, exceptions, decided, placeholders ⇒ pricelist import; generic vocabulary only
- [x] packages/shared/src/index.ts — shares: CatalogStrings, LocaleStringsInput, PluralTexts, ResolvedLocaleStrings, ResolvedPart, SiteStrings ⇒ defines LocaleStrings types imported; re-exports this module
- [ ] packages/plugins/src/types.ts — shares: LOCALE1C, BlockStrings, blockStrings, registered, readonly, hero ⇒

## query: renderer/middleware.ts
rare: DYN_SEGMENT, PREVIEW_HOST_FORBIDDEN, getAll, originHeader, seg1, seg2, cleanHost, dynamicPath

- [ ] packages/shared/src/sandbox.ts — shares: Keeping, attribution, APIs, keeping, enforced, collapses ⇒ iframe sandbox helper; prose words only
- [ ] backend/src/scheduled/debounce-flush.ts — shares: CloudFront, FALSE, enqueues, enqueue, enter, Once ⇒ CDN invalidation queue; prose words only
- [ ] infra/lib/amodx-stack.ts — shares: NextAuth, CloudFront, isn, PRODUCTION, Requests, widening ⇒ main CDK stack; no origin-verify or routing coupling found
- [ ] .github/workflows/ci.yml — shares: CloudFront, contracts, larger, omission, ORIGIN, worth ⇒ CI workflow; does not exercise middleware
- [ ] scripts/verify-opennext-patch.mjs — shares: fixISRHeaders, CloudFront, clone, Mitigation, sole, hunk ⇒ patch check cited in a comment; not a dependency
- [ ] tools/mcp-server/src/index.ts — shares: CloudFront, Keeping, Handlers, REPLACES, Always, Assets ⇒ MCP tool server; prose words only
- [ ] packages/plugins/src/common/videoSource.ts — shares: indexOf, endsWith, toLowerCase, CloudFront, segs, issued ⇒ video URL parsing; string vocabulary only
- [ ] renderer/src/app/[siteId]/layout.tsx — shares: ReferralCapture, CloudFront, issued, hence, hydration, attribution ⇒ receives siteId param; mentions middleware in a comment only
- [x] renderer/src/app/api/revalidate/route.ts — shares: NextRequest, NextResponse, CloudFront, refreshes, dotted, adapters ⇒ purges ISR keys shaped by the /<host>/<path> rewrite
- [x] renderer/src/components/SitePage.tsx — shares: sessionToken, indexOf, NextAuth, _site, startsWith, fed ⇒ consumes the rewrite outcome: basePath, sessionToken, cacheable
- [x] admin/src/pages/Settings.tsx — shares: _site, Prefixes, Routing, stricter, hence, Self ⇒ builds the /_site/<id> preview URL this file gates
- [ ] packages/shared/vitest.config.ts — shares: onto, truth, even, claim, directly, explicit ⇒ test config; prose words only
- [ ] renderer/src/app/api/ref/route.ts — shares: sameSite, CachingDisabled, httpOnly, nextUrl, maxAge, HttpOnly ⇒ referral cookie moved out; middleware no longer touches it
- [ ] admin/src/components/ui/input.tsx — shares: none ⇒ UI primitive; nothing shared
- [x] renderer/src/app/[siteId]/%5Fdyn/[[...slug]]/page.tsx — shares: __Secure, _dyn, sessionToken, NextAuth, _site, CloudFront ⇒ the dynamic twin dynamicPath rewrites to
- [ ] renderer/src/lib/dynamo.ts — shares: endsWith, toLowerCase, startsWith, CloudFront, circuit, blip ⇒ data access; host gate lives in tenant-directory
- [ ] renderer/src/lib/origin-guard.ts — shares: forwardedHost, CloudFront, attach, PRODUCTION, ORIGIN, downgrade ⇒ Origin check for write proxies; separate from x-origin-verify
- [ ] backend/src/reviews/update.ts — shares: startsWith, CloudFront, Refusing, disjoint, counterpart, flips ⇒ reviews handler; prose words only
- [ ] renderer/src/components/ReferralCapture.tsx — shares: HttpOnly, ReferralCapture, amodx_ref, CloudFront, WRITTEN, poisoning ⇒ client beacon replacing removed middleware logic
- [ ] backend/src/lib/review-media.ts — shares: endsWith, toLowerCase, startsWith, CloudFront, DESTINATION, exceeds ⇒ media URL helper; string vocabulary only
- [ ] backend/src/lib/invalidate-cdn.ts — shares: CloudFront, Don, enqueue, unlike, generation, ANY ⇒ edge invalidation uses public paths, not rewrite shape
- [ ] packages/plugins/src/markdown/MarkdownRender.tsx — shares: Self, even, weight, literal ⇒ markdown block; prose words only
- [ ] admin/src/pages/StrategyEditor.tsx — shares: router ⇒ admin editor; shares only router
- [x] infra/lib/renderer-hosting.ts — shares: defaultCookies, hasSessionCookie, HostRewriteFunction, SESSION_COOKIE_BASES, maxAge, __Secure ⇒ CF function must keep the identical session-cookie predicate
- [ ] packages/shared/src/index.ts — shares: endsWith, toLowerCase, startsWith, CloudFront, Bounding, defeating ⇒ shared schemas; middleware imports nothing from it
- [ ] renderer/src/lib/routing.ts — shares: cleanSlug, amodx_preview_base, _site, startsWith, pathname, rewrite ⇒
- [ ] renderer/src/app/api/auth/[...nextauth]/route.ts — shares: sameSite, httpOnly, NextRequest, sessionToken, NextAuth, lax ⇒
- [ ] renderer/src/app/[siteId]/[[...slug]]/page.tsx — shares: sessionToken, NextAuth, _site, enough, layers, handoff ⇒
- [ ] patches/@opennextjs+aws+4.1.9.patch — shares: fixISRHeaders, CloudFront, Once, SWR, util, adapters ⇒
- [ ] renderer/src/lib/tenant-directory.ts — shares: isWiredTenantHost, sessionToken, blip, soft, happen, junk ⇒

## query: renderer/src/context/CartContext.tsx
rare: CartContextType, CouponState, couponRaw, getCartKey, getItemKey, setCouponState, setLoaded, CartItem

- [ ] admin/src/context/AuthContext.tsx — shares: createContext, useContext, ReactNode, useEffect, useState, Provider ⇒ admin auth context; React context vocabulary only
- [ ] packages/effects/src/render.tsx — shares: useCallback, useEffect, useState, ctx, void ⇒ effects renderer; hooks vocabulary only
- [x] packages/shared/src/index.ts — shares: productImage, selectedVariant, productSlug, unitPrice, productTitle, addedCost ⇒ OrderItemSchema mirrors CartItem fields checkout serializes
- [x] renderer/src/components/AddToCartButton.tsx — shares: personalizationCost, productImage, useCart, selectedVariant, addItem, productSlug ⇒ calls useCart().addItem with CartItem fields
- [x] renderer/src/components/Providers.tsx — shares: CartProvider, CartContext, ReactNode ⇒ mounts CartProvider with tenantId/cartPrefix
- [ ] admin/src/pages/OrderDetail.tsx — shares: unitPrice, useEffect, useState, reduce, sum, quantity ⇒ admin order view; price arithmetic vocabulary only
- [ ] admin/src/components/layout/Sidebar.tsx — shares: useState, void ⇒ admin sidebar; nothing shared
- [ ] backend/src/users/toggle-status.ts — shares: none ⇒ users handler; nothing shared
- [x] backend/src/orders/create.ts — shares: personalizationCost, selectedVariant, unitPrice, productTitle, addedCost, quantity ⇒ parses the items checkout maps from CartItem
- [ ] packages/plugins/src/columns/index.ts — shares: none ⇒ columns block; nothing shared
- [ ] renderer/src/components/CookieConsent.tsx — shares: setItem, getItem, removeItem, localStorage, useEffect, useState ⇒ separate localStorage use; no cart interaction
- [ ] admin/vitest.config.ts — shares: none ⇒ test config; nothing shared
- [x] renderer/src/components/CartPageView.tsx — shares: setCoupon, updateQuantity, personalizationCost, itemCount, productImage, useCart ⇒ useCart consumer: updateQuantity, setCoupon, subtotal
- [ ] renderer/src/components/PopupManager.tsx — shares: useCallback, setItem, getItem, useEffect, useState, prev ⇒ popup state; hooks/localStorage vocabulary only
- [x] renderer/src/components/CheckoutPageView.tsx — shares: clearCart, personalizationCost, productImage, useCart, setItem, selectedVariant ⇒ useCart consumer; clearCart and item serialization
- [ ] packages/plugins/src/reviews-carousel/ReviewsCarouselEditor.tsx — shares: addItem, removeItem, useState, void ⇒ editor list ops named alike; no cart
- [ ] admin/src/lib/api.ts — shares: getItem, removeItem, localStorage ⇒ admin API client; localStorage token only
- [ ] admin/src/pages/ProductEditor.tsx — shares: addedCost, useEffect, useState, prev, quantity, loaded ⇒ admin editor; addedCost is product-side config
- [ ] renderer/src/lib/interest.ts — shares: setItem, addItem, getItem, removeItem, Omit, void ⇒ parallel shortlist store; independent of cart
- [x] renderer/src/components/CartWidget.tsx — shares: itemCount, useCart, CartContext, subtotal ⇒ useCart consumer: itemCount, subtotal, cartPrefix
- [ ] packages/plugins/src/carousel/CarouselEditor.tsx — shares: addItem, removeItem, useState, prev ⇒ editor list ops named alike; no cart
- [ ] admin/src/context/TenantContext.tsx — shares: createContext, useContext, setItem, ReactNode, getItem, localStorage ⇒ admin tenant context; context vocabulary only
- [ ] admin/src/pages/Reviews.tsx — shares: ReactNode, useEffect, useState, Omit, sum, void ⇒ admin reviews page; hooks vocabulary only
- [ ] admin/src/pages/Labels.tsx — shares: createContext, useContext, useEffect, useState, Provider, prev ⇒ own LabelsCtx; context vocabulary only
- [ ] renderer/src/app/api/consent/route.ts — shares: none ⇒ consent API route; nothing shared
- [ ] admin/src/pages/StrategyBoard.tsx — shares: setItems, useEffect, useState ⇒
- [ ] packages/plugins/src/faq/FaqEditor.tsx — shares: addItem, removeItem ⇒
- [ ] packages/plugins/src/testimonials/TestimonialsEditor.tsx — shares: addItem, removeItem ⇒
