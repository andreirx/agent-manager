# lexmap relatedness labels
repo: /Users/apple/Documents/APLICATII BIJUTERIE/glamCRM
identity: HEAD 32e83ed, 0 uncommitted entries, inputs sha256:639f5ccc2b123939b1a5315560168bf0c6c97387f3228e6ea25e41e5e9f15130
seed: 1
median-tokens: 93

How to label: for each candidate, would a reviewer of a change in the query file need to open this file to judge the change — because it defines what the query uses, uses what the query defines, or is the other half of the same feature (schema, contract, consumer, sibling implementation)? Mark [x] yes, [ ] no, [?] cannot tell. Sharing only framework vocabulary, or merely sitting in the same layer, is "no". Open the files; the "shares" list is orientation, not evidence. Add a short reason after "⇒".

## query: frontend/workspace/e2e/helpers/allowance-fixture.ts
rare: DevRef, ThrowawayOffer, DevOfferItem, salesToken, teardownThrowawayOffer, seedThrowawayOffer, DevProduct, devApi

- [ ] serverless/packages/backend/src/services/estimate-service.ts — shares: parallel, residue, fills, READS, discipline, deletes ⇒ unrelated service; no route the fixture drives
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/dtos/OfferGetDTO.java — shares: accountantId, technicalId, managerId ⇒ Mode A DTO; fixture drives serverless v2
- [x] frontend/workspace/e2e/helpers/dev-seed.ts — shares: devApi, drifts, TEARDOWN, demo, reception, teardown ⇒ defines devApi the fixture imports
- [ ] frontend/workspace/src/pages/OfferDetailPage.tsx — shares: itemId, disambiguates, compliant, demo, reception, residue ⇒ app page; fixture bypasses the UI
- [ ] frontend/workspace/src/api/users.ts — shares: accountantId, technicalId, managerId ⇒ app client; fixture calls /users/me raw
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/tools/dbseed/DBSeed.java — shares: none ⇒ Mode A seeder; nothing shared
- [ ] frontend/web/src/components/CreateOfferDialog.tsx — shares: accountantId, technicalId, managerId, vats ⇒ admin UI; same field names only
- [ ] serverless/packages/backend/src/scripts/transform-codification-storage.ts — shares: itemId, fills, inert, hardcoded, simpler ⇒ migration script; unrelated
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/external/postgres/user/PostgresUserRepository.java — shares: none ⇒ Mode A repository; unrelated
- [x] serverless/packages/shared/src/schemas/offer.ts — shares: accountantId, technicalId, managerId, lifecycle ⇒ validates the POST /offers body the fixture sends
- [x] serverless/packages/backend/src/services/offer-service.ts — shares: accountantId, technicalId, managerId, orphaned, hardcoded, applicable ⇒ validates references / locked-delete behind the routes
- [ ] frontend/workspace/src/pages/NewOfferPage.tsx — shares: accountantId, technicalId, managerId, vats ⇒ app page; same field names only
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/dtos/OfferPostDTO.java — shares: accountantId, technicalId, managerId ⇒ Mode A DTO; fixture drives serverless v2
- [ ] backend/api/v1/offers.http — shares: accountantId, technicalId, managerId ⇒ Mode A request samples; not v2
- [ ] serverless/packages/shared/src/types/offer.ts — shares: accountantId, technicalId, managerId, lifecycle ⇒ fixture reads only id; own local types
- [ ] serverless/packages/backend/src/repositories/category-repository.ts — shares: none ⇒ unrelated repository
- [ ] serverless/packages/backend/src/repositories/offer-repository.ts — shares: accountantId, technicalId, managerId, exposes, ASSERTED, deviation ⇒ two layers below the route
- [ ] serverless/packages/backend/src/utils/batch-hydrator.ts — shares: accountantId, technicalId, managerId, vats, parallel, applicable ⇒ totals hydration; fixture ignores totals
- [ ] frontend/workspace/src/api/offers.ts — shares: accountantId, technicalId, managerId, reception, READS ⇒ app client of same routes; fixture bypasses it
- [ ] frontend/web/src/pages/EditOfferPage.tsx — shares: accountantId, technicalId, managerId, throwaway, deviation, inert ⇒ admin UI; same field names only
- [ ] frontend/web/src/pages/OfferPage.tsx — shares: accountantId, technicalId, managerId, inert, orphaned, Delete ⇒ admin UI; same field names only
- [ ] serverless/packages/shared/src/types/tenant-config.ts — shares: Seed, simpler ⇒ unrelated types
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/tenantconfig/TenantConfigRepository.java — shares: none ⇒ Mode A repository; unrelated
- [x] serverless/packages/backend/src/handlers/offers.ts — shares: accountantId, technicalId, managerId, exposes, priced, applicable ⇒ handler behind POST/GET/DELETE /offers the fixture calls
- [ ] serverless/packages/backend/scripts/seeders/seed-offers.ts — shares: itemId, accountantId, technicalId, managerId, Seed ⇒ bulk seeder; fixture self-seeds via routes
- [ ] serverless/packages/backend/src/scripts/transform-offer-item-canonical.ts — shares: itemId ⇒ migration script; unrelated

## query: frontend/workspace/src/api/file-hosting.ts
rare: CONFIRM_LEASE, maxAttempts, resolveFile, ResolveResponse, confirmUpload, uploadFileToS3, FormData, UploadIntentResponse

- [ ] serverless/packages/backend/src/handlers/scheduled/fetch-exchange-rate.ts — shares: setTimeout, RETRY, transient, uat, minute, BASE ⇒ shares only retry vocabulary
- [ ] frontend/workspace/src/lib/brand.ts — shares: F34, SUBPATH, subpath, referencing, erased, white ⇒ shares only the subpath-import comment rule
- [x] frontend/workspace/src/components/product/OverlayImageControl.tsx — shares: confirmUpload, uploadFileToS3, HostedImageMime, createUploadIntent, fileId, magic ⇒ consumer: calls intent/upload/confirm
- [ ] frontend/workspace/src/pages/OfferDetailPage.tsx — shares: ApiError, F34, fileId, reu, couple, SUBPATH ⇒ no import; shares ApiError vocabulary
- [x] serverless/packages/backend/src/handlers/files-v2.ts — shares: createUploadIntent, declaredMime, fileId, lived, presigned, hosting ⇒ handler behind the three file-hosting routes
- [x] serverless/packages/infra/lib/constructs/api.ts — shares: CF1, fileId, minute, magic, hosted, uploaded ⇒ registers the three routes this client calls
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/files/FileStorageService.java — shares: multipart ⇒ Mode A multipart storage; unrelated
- [ ] serverless/packages/backend/src/repositories/file-registry-repository.ts — shares: CONFIRM_LEASE, FilePurpose, HostedImageMime, declaredMime, CF1, fileId ⇒ lease storage; two layers below
- [ ] serverless/packages/infra/lib/glamcrm-stack.ts — shares: bucket, hosting ⇒ frontend hosting only
- [ ] serverless/packages/backend/src/services/file-hosting-storage.ts — shares: ConfirmResponse, HostedImageMime, CF1, loadable, multipart, AUTHORITATIVE ⇒ storage port; below the service
- [ ] serverless/packages/backend/src/services/s3-file-hosting-storage.ts — shares: HostedImageMime, CF1, BYTES, presign, presigned, bucket ⇒ presign impl; contract is the shared type
- [x] serverless/packages/backend/src/services/file-hosting-service.ts — shares: ResolveResponse, UploadIntentResponse, ConfirmResponse, FilePurpose, HostedImageMime, createUploadIntent ⇒ service producing responses and the 409 lease
- [ ] frontend/workspace/src/pages/LoginPage.tsx — shares: uat, Confirm, presigned, nou, err, logo ⇒ unrelated page
- [ ] serverless/packages/backend/src/repositories/salesperson-overlay-repository.ts — shares: setTimeout, CF1, fileId, Unreachable, retries, signature ⇒ stores fileId refs; no interaction
- [x] frontend/web/src/api/fileHosting.ts — shares: maxAttempts, confirmUpload, uploadFileToS3, FormData, UploadIntentResponse, ConfirmResponse ⇒ sibling client in the admin app
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/util/Retry.java — shares: maxAttempts, attempt ⇒ Mode A retry util; vocabulary only
- [ ] frontend/web/src/pages/TenantConfigPage.tsx — shares: confirmUpload, uploadFileToS3, createUploadIntent, F34, fileId, rcarea ⇒ consumer of the admin sibling, not this
- [ ] serverless/packages/shared/src/types/salesperson-product-overlay.ts — shares: CF1, fileId, OBLIGATION, SEAM, lived, hosted ⇒ overlay type; references fileId only
- [ ] serverless/packages/backend/src/services/my-catalog-service.ts — shares: CF1, fileId, races, transient, retries, became ⇒ stores fileId; no hosting call
- [ ] serverless/packages/shared/src/types/tenant-config.ts — shares: CF1, fileId, loadable, subpath, RENDER, hosted ⇒ logo fileId field; no interaction
- [x] frontend/workspace/src/lib/overlay-image.ts — shares: resolveFile, CF1, fileId, expiry, minute, Resolve ⇒ consumer: wraps resolveFile with caching
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/tools/dbseed/DBReset.java — shares: none ⇒ Mode A tool; unrelated
- [ ] frontend/web/src/api/product.ts — shares: FormData, getApiClient, multipart, DIRECT, barrel ⇒ shares FormData/getApiClient only
- [x] serverless/packages/shared/src/schemas/file-hosting.ts — shares: FilePurpose, HostedImageMime, declaredMime, fileId, MIME, AUTHORITATIVE ⇒ strict upload-intent schema the client must satisfy
- [x] serverless/packages/shared/src/types/file-hosting.ts — shares: ResolveResponse, UploadIntentResponse, ConfirmResponse, FilePurpose, HostedImageMime, declaredMime ⇒ defines the response types imported
- [ ] frontend/web/src/api/priceAllowance.ts — shares: F34, getApiClient, Types, barrel ⇒ admin api; shares client/import rule only
- [ ] frontend/workspace/src/api/priceAllowances.ts — shares: F34, getApiClient, SUBPATH, BASE, white, barrel ⇒ sibling api; shares client/subpath rule only

## query: frontend/workspace/src/api/payments.ts
rare: cashInstallment, invoiceInstallment, ScadentarRow, canCash, canInvoice, InvoiceInstallmentInputSchema, installmentId, ProjectsPage

- [ ] serverless/packages/backend/src/scripts/transform-etape.ts — shares: installmentId, THESE, disagreement, RECORDED, everywhere, WRONG ⇒ migration script; unrelated
- [ ] frontend/workspace/src/pages/OfferDetailPage.tsx — shares: TRANS, PATHS, displays, RECORDED, apps, PURPOSE ⇒ unrelated page; comment words only
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/tools/dbseed/DBSeedApp.java — shares: none ⇒ Mode A tool; unrelated
- [ ] serverless/packages/backend/src/services/pdf-estimate-service.ts — shares: invoiceNumber, REQUIRES, Installment, fiscal, trans, INVOICED ⇒ renders invoiceNumber; no transition
- [ ] serverless/packages/backend/src/services/estimate-service.ts — shares: invoiceNumber, assigning, THESE, transitions, transe, factur ⇒ schedule writer; not behind these routes
- [ ] frontend/workspace/src/api/estimates.ts — shares: getApiClient, issuing, transe, reaching, consumes, trans ⇒ sibling api; no interaction
- [ ] frontend/web/src/pages/ProjectsPage.tsx — shares: canCash, canInvoice, InvoiceInstallmentInputSchema, ProjectsPage, invoiceNumber, marks ⇒ consumer of the admin copy, not this
- [ ] serverless/packages/backend/src/handlers/my-catalog.ts — shares: none ⇒ unrelated handler
- [ ] frontend/workspace/src/features/incasari/scadentar.ts — shares: ScadentarRow, canCash, canInvoice, installmentId, ProjectsPage, invoiceNumber ⇒ picks action per row; never calls these
- [ ] serverless/packages/shared/src/utils/calculations.ts — shares: none ⇒ unrelated
- [ ] frontend/workspace/src/components/ui/Pager.tsx — shares: none ⇒ unrelated
- [x] frontend/workspace/e2e/helpers/hermetic-backend.ts — shares: invoiceNumber, ceremony, scadentar, recording, PURPOSE, issuing ⇒ stubs both /payments routes for E2E
- [ ] frontend/web/src/api/project.ts — shares: ProjectsPage, getApiClient, Invoice, WIRE, trans, INVOICED ⇒ admin project client; no interaction
- [x] serverless/packages/shared/src/schemas/installment.ts — shares: InvoiceInstallmentInputSchema, invoiceNumber, WORD, PATHS, ceremony, benefit ⇒ defines InvoiceInstallmentInputSchema for the body
- [ ] frontend/workspace/src/features/incasari/index.ts — shares: none ⇒ barrel of pages only
- [ ] frontend/workspace/src/features/incasari/ProjectMoneyPage.tsx — shares: invoiceNumber, scadentar, scaden, transitions, transe, trans ⇒ reads scadentar; no transition call
- [ ] frontend/workspace/src/features/incasari/deviz-history.ts — shares: invoiceNumber, scadentar, scaden, transe, Installment, trans ⇒ history shaping; no transition call
- [x] frontend/workspace/src/features/incasari/ScadentarPage.tsx — shares: cashInstallment, invoiceInstallment, ScadentarRow, installmentId, invoiceNumber, KEEPS ⇒ the only consumer of both functions
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/tools/migration/MigrationChecks.java — shares: installmentId, recording, consumes, fiscal, trans, invoice ⇒ Mode A migration tool
- [ ] serverless/packages/backend/src/services/etapa-service.ts — shares: Installments, RECORDED, RETURNS, COLLECTION, STATE, Installment ⇒ the rejected invoice-next route; no interaction
- [ ] serverless/packages/backend/src/repositories/installment-repository.ts — shares: installmentId, invoiceNumber, renaming, WRONG, reaching, COLLECTION ⇒ two layers below the route
- [x] serverless/packages/backend/src/handlers/payments.ts — shares: InvoiceInstallmentInputSchema, invoiceNumber, ceremony, identified, cash, Installment ⇒ handler behind both routes
- [ ] serverless/packages/shared/src/types/installment.ts — shares: invoiceNumber, cash, factur, COLLECTION, STATE, Installment ⇒ returns void; no type used
- [ ] serverless/packages/shared/src/enums/installment-status.ts — shares: Invoice, WORD, PATHS, benefit, disagreement, RECORDED ⇒ status enum; not referenced here
- [x] frontend/web/src/api/payments.ts — shares: ProjectsPage, getApiClient, invoiceNumber, Invoice, WORD, PATHS ⇒ the admin copy this was ported from
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/dtos/PaymentPostDTO.java — shares: invoiceNumber ⇒ Mode A DTO; client drives serverless v2
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/payment/Payment.java — shares: invoiceNumber, Payment, INVOICED ⇒ Mode A entity; not on this path
- [ ] frontend/web/src/api/tenantConfig.ts — shares: getApiClient ⇒ shares getApiClient only
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/dtos/PaymentGetDTO.java — shares: invoiceNumber, Payment, INVOICED ⇒ Mode A DTO; client drives serverless v2
- [ ] frontend/workspace/src/config/api-client.ts — shares: getApiClient, PORTED, apps, STATE ⇒ shared HTTP client utility, not the feature
- [ ] frontend/web/src/api/priceAllowance.ts — shares: getApiClient ⇒ shares getApiClient only
- [ ] frontend/workspace/src/api/exchangeRate.ts — shares: getApiClient, issuing ⇒ sibling api; shares getApiClient only
- [ ] frontend/workspace/src/api/order-needs.ts — shares: getApiClient, scadentar ⇒ sibling api; shares getApiClient only

## query: serverless/packages/backend/src/handlers/payments.ts
rare: paymentsHandler, formatPayment, PaymentController, InvoiceInstallmentInputSchema, W12, parseInt, installmentRepository, pathParams

- [ ] serverless/packages/backend/src/handlers/files.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, logAction ⇒ sibling handler; framework vocabulary
- [ ] serverless/packages/backend/src/handlers/offers.ts — shares: pathParams, buildUpdateSpec, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling ⇒ sibling handler; framework vocabulary
- [x] serverless/packages/backend/src/services/estimate-service.ts — shares: installmentRepository, InstallmentRepository, activityLogRepository, amountPaid, invoiceDate, InstallmentStatus ⇒ recalc keeps PAID rows this handler writes
- [ ] serverless/packages/backend/src/handlers/company-targets.ts — shares: activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, logAction, requestContext ⇒ sibling handler; framework vocabulary
- [ ] serverless/packages/backend/src/handlers/projects.ts — shares: parseInt, installmentRepository, pathParams, InstallmentRepository, activityLogRepository, withWarmup ⇒ constructs repo; no installment calls
- [ ] serverless/packages/backend/src/handlers/exchange-rates.ts — shares: activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, logAction, requestContext ⇒ sibling handler; framework vocabulary
- [ ] serverless/packages/backend/src/handlers/documents.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒ sibling handler; framework vocabulary
- [ ] serverless/packages/shared/src/types/sales-target.ts — shares: parseInt, parseFloat ⇒ shares parseInt only
- [ ] serverless/packages/backend/src/handlers/order-needs.ts — shares: installmentRepository, InstallmentRepository, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling ⇒ sibling handler; framework vocabulary
- [ ] serverless/packages/backend/src/handlers/etape.ts — shares: installmentRepository, InstallmentRepository, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling ⇒ sibling handler; invoice-next lives in service
- [ ] serverless/packages/backend/src/handlers/users.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒ sibling handler; framework vocabulary
- [ ] serverless/packages/backend/src/handlers/offer-items.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒ sibling handler; framework vocabulary
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/config/tools/dbseed/DbSeedConfigProps.java — shares: none ⇒ Mode A config; unrelated
- [ ] serverless/packages/backend/src/handlers/price-lists.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒ sibling handler; framework vocabulary
- [ ] serverless/packages/backend/src/handlers/categories.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒ sibling handler; framework vocabulary
- [ ] serverless/packages/backend/src/handlers/clients.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒ sibling handler; framework vocabulary
- [ ] serverless/packages/backend/src/handlers/sales-targets.ts — shares: installmentRepository, InstallmentRepository, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling ⇒ sibling handler; framework vocabulary
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/external/files/pdf/PdfOfferDocumentManager.java — shares: none ⇒ Mode A PDF; unrelated
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/dtos/TenantConfigPutDTO.java — shares: EXPLICIT ⇒ unrelated DTO
- [ ] serverless/packages/backend/src/handlers/estimates.ts — shares: installmentRepository, pathParams, InstallmentRepository, activityLogRepository, withWarmup, APIGatewayProxyResultV2 ⇒ sibling handler; framework vocabulary
- [ ] serverless/packages/backend/src/handlers/vat.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒ sibling handler; framework vocabulary
- [ ] serverless/packages/backend/src/handlers/products.ts — shares: buildUpdateSpec, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒ sibling handler; framework vocabulary
- [x] serverless/packages/shared/src/types/installment.ts — shares: W12, amountPaid, invoiceDate, InstallmentStatus, paymentDate, invoiceNumber ⇒ the Installment shape and fields it updates
- [ ] serverless/packages/backend/src/handlers/health.ts — shares: withWarmup, APIGatewayProxyResultV2, withErrorHandling, APIGatewayProxyEventV2, warmup ⇒ sibling handler; framework vocabulary
- [ ] serverless/packages/backend/src/handlers/activity-log.ts — shares: parseInt, pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling ⇒ sibling handler; framework vocabulary
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/payment/Payment.java — shares: amountPaid, invoiceDate, paymentDate, invoiceNumber, installmentNumber, INVOICED ⇒ Mode A entity; TS Installment type is the contract
- [ ] serverless/packages/backend/src/utils/crud-handler.ts — shares: pathParams, APIGatewayProxyResultV2, handleCrudRequest, logAction, requestContext, extractUser ⇒ deliberately no longer imported here
- [ ] serverless/packages/backend/src/handlers/files-v2.ts — shares: withWarmup, APIGatewayProxyResultV2, withErrorHandling, requestContext, endsWith, extractUser ⇒ sibling handler; framework vocabulary

## query: serverless/packages/backend/src/services/document-service.ts
rare: S3_BUCKET_NAME, deleteFileFromS3, existingDocument, getDocument, getDocumentsByOwnerId, searchDocumentsByFileName, getAllNonGenerated, CreateDocumentInput

- [ ] serverless/packages/backend/src/services/client-service.ts — shares: getAll, getById, deleteById, managing, Log, Business ⇒ sibling service; same CRUD pattern
- [x] serverless/packages/backend/src/handlers/offers.ts — shares: documentRepository, DocumentRepository, DocumentService, Documents ⇒ instantiates DocumentService for OfferService
- [x] serverless/packages/backend/src/handlers/documents.ts — shares: documentRepository, DocumentRepository, ownerId, Delete ⇒ /documents handler re-implements these on the repo
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/external/postgres/category/CategoryDB.java — shares: none ⇒ Mode A; unrelated
- [x] serverless/packages/backend/src/services/estimate-service.ts — shares: createDocument, isGenerated, DocumentService, ownerId, getAll, getById ⇒ consumer: calls createDocument
- [ ] serverless/packages/backend/src/services/applicable-vat-service.ts — shares: getAll, getById, deleteById, managing, Business, Ported ⇒ sibling service; same CRUD pattern
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/offer/OfferDocumentService.java — shares: DocumentService, getById, deleteById, Delete ⇒ Mode A offer docs; not the port source
- [ ] serverless/packages/backend/src/services/s3-file-hosting-storage.ts — shares: DeleteObjectCommand, S3Client, AWS_REGION, Bucket, SDK, bucket ⇒ shares S3 SDK vocabulary only
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/controllers/DocumentController.java — shares: getAllNonGenerated, getGeneratedBetweenDates, getAllDocuments, createDocument, DocumentService, getAll ⇒ Mode A controller; port source is the service
- [x] serverless/packages/backend/src/handlers/files.ts — shares: createDocument, documentRepository, isGenerated, DocumentRepository, DocumentService, ownerId ⇒ consumer: createDocument on upload
- [ ] serverless/packages/backend/src/services/exchange-rate-service.ts — shares: getAll, getById, managing, Business, Phase, Ported ⇒ sibling service; same pattern
- [x] serverless/packages/backend/src/services/s3-service.ts — shares: DeleteObjectCommand, s3Client, S3Client, Bucket, Example, SDK ⇒ the real S3 delete the placeholder should call
- [ ] serverless/packages/backend/src/services/product-service.ts — shares: searchTerm, getAll, deleteById, managing, Search, Business ⇒ sibling service; same pattern
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/estimate/Estimate.java — shares: none ⇒ Mode A entity; unrelated
- [ ] frontend/web/src/api/document.ts — shares: CreateDocumentInput, deleteDocument, getAllDocuments, getUploadedDocuments, ownerId, uploaded ⇒ calls /documents handler, which bypasses this
- [x] serverless/packages/backend/src/services/offer-service.ts — shares: createDocument, isGenerated, DocumentService, ownerId, getAll, getById ⇒ consumer: calls createDocument
- [ ] frontend/web/src/pages/FilesPage.tsx — shares: deleteDocument, getAllDocuments, ownerId, deletion, Delete ⇒ UI two hops away
- [ ] serverless/packages/backend/src/scripts/transform-etape.ts — shares: AWS_REGION, warning, Delete ⇒ migration script; unrelated
- [ ] serverless/packages/shared/src/enums/offer-status.ts — shares: Ported ⇒ shares the word Ported only
- [ ] frontend/web/src/api/priceAllowance.ts — shares: none ⇒ unrelated
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/estimate/EstimateDocumentService.java — shares: DocumentService, getById, deleteById, warn, Delete ⇒ Mode A estimate docs; not the port source
- [x] serverless/packages/shared/src/types/document.ts — shares: CreateDocumentInput, isGenerated, ownerId, Documents, Excel, Ported ⇒ defines Document and CreateDocumentInput
- [x] serverless/packages/backend/src/handlers/estimates.ts — shares: documentRepository, DocumentRepository, DocumentService, Delete ⇒ instantiates DocumentService for the services
- [x] serverless/packages/backend/src/repositories/document-repository.ts — shares: getByOwnerId, getGeneratedDocuments, searchByFileName, getUploadedDocuments, searchTerm, isGenerated ⇒ the repository every method delegates to
- [x] backend/src/main/java/soft/bijuterie/glam/backend/core/document/DocumentService.java — shares: existingDocument, getAllNonGenerated, getGeneratedBetweenDates, documentRepository, DocumentRepository, DocumentService ⇒ the Mode A original this port mirrors
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/document/Document.java — shares: isGenerated ⇒ Mode A entity; TS Document type is the contract
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/config/core/DocumentConfig.java — shares: documentRepository, DocumentService ⇒ Mode A bean wiring
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/document/DocumentRepository.java — shares: DocumentRepository, deleteById ⇒ Mode A repository interface
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/category/CategoryService.java — shares: getAll, getById, deleteById ⇒ Mode A; CRUD vocabulary only

## query: serverless/packages/backend/src/services/product-import-service.ts
rare: ExactDecimal, ImportService, NO_MODIFIERS, PriceModifiers, ProductWithKey, ROUND_HALF_UP, activeInChain, byCoordinate

- [ ] frontend/workspace/src/features/incasari/deviz-history.ts — shares: PURE, rounds, others, OLD, ordered ⇒ unrelated; comment words
- [x] backend/src/main/java/soft/bijuterie/glam/backend/external/files/xls/XlsProductLoader.java — shares: cleanProductName, currentCollectionName, getCellValue, listPriceWithoutVat, vatMultiplier, applyPercentModifier ⇒ Mode A loader parseExcelFile ports
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/salestarget/SalesTargetRepository.java — shares: none ⇒ unrelated
- [ ] serverless/packages/backend/src/services/my-catalog-service.ts — shares: getByPublicId, getByPriceListId, priceListRepository, productRepository, PriceListService, introducedAt ⇒ shares repositories only
- [ ] serverless/packages/backend/src/services/offer-item-service.ts — shares: NaN, isFinite, priceListRepository, ProductService, productRepository, PriceListService ⇒ shares repositories only
- [x] serverless/packages/shared/src/types/product.ts — shares: ProductImportOutcome, PRODUCT_REMARK_MAX_LENGTH, productKeyToString, F26, F28, ProductImportResultItem ⇒ defines mint rule, keys, result types
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/product/Product.java — shares: PRODUCT_REMARK_MAX_LENGTH, ProductKey, normalizeFormat, ProductService, introducedAt, ProductImportService ⇒ Mode A entity; parity constant only
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/client/Client.java — shares: none ⇒ unrelated
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/product/ProductService.java — shares: usedCollectionIndices, newProduct, existingProduct, putIfAbsent, CategoryService, K4a ⇒ Mode A service; importer bypasses ProductService
- [x] serverless/packages/backend/src/services/product-service.ts — shares: byDate, coordinateClash, currentMax, usedIndices, currentMaxIdx, maxIdxInCollectionMap ⇒ admin-create door enforcing the same rules
- [x] pl-tools/engines/assemble.mjs — shares: firstCellEmpty, formatCell, hasName, secondCell, firstCell, matchingCode ⇒ produces the workbook layout; transcribes importer predicates
- [ ] frontend/web/src/auth/index.ts — shares: instance, Check, during ⇒ unrelated
- [ ] serverless/packages/backend/src/scripts/transform-codification-storage.ts — shares: byCodification, chainPublicId, categoryPublicId, mintInternalCodification, priceList, Give ⇒ one-off backfill of the same mint rule
- [x] serverless/packages/backend/src/services/errors.ts — shares: assertCodificationFreeAmongActive, ProductUniquenessError, getByPriceListId, K4a, PriceListService, formatKey ⇒ defines ProductUniquenessError/ValidationError thrown
- [ ] serverless/packages/backend/src/services/estimate-service.ts — shares: categoryRepository, CategoryRepository, priceListRepository, productRepository, PriceListRepository, parseFloat ⇒ shares repositories only
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/tools/migration/MigrationChecks.java — shares: vatPercentage, putIfAbsent, HALF_UP, valueOf, OPERATOR_NOTE, unescaped ⇒ Mode A migration tool
- [x] serverless/packages/backend/src/services/price-list-service.ts — shares: ProductImportResult, getByPublicId, createPriceList, listModifierPercent, purchaseModifierPercent, importProducts ⇒ caller: importProducts on create/reimport
- [x] serverless/packages/backend/src/handlers/products.ts — shares: mintInternalCodification, CategoryService, K4a, categoryRepository, CategoryRepository, priceListRepository ⇒ instantiates the importer for ProductService
- [ ] serverless/packages/backend/src/services/offer-service.ts — shares: productMap, categoryRepository, CategoryRepository, priceListRepository, productRepository, PriceListRepository ⇒ shares repositories only
- [x] backend/src/main/java/soft/bijuterie/glam/backend/external/files/xls/XlsUtils.java — shares: getCellValue, firstCell, isProductRow, oldCode, newCode, productName ⇒ Mode A getCellValue/isProductRow the port mirrors
- [x] serverless/packages/backend/src/handlers/price-lists.ts — shares: createPriceList, listModifierPercent, purchaseModifierPercent, categoryRepository, CategoryRepository, priceListRepository ⇒ wires the importer into the create-with-import route
- [ ] frontend/workspace/src/pages/OfferDetailPage.tsx — shares: NaN, isFinite, OPERATOR_NOTE, OF2, technicalSpecification, browsing ⇒ unrelated page
- [ ] serverless/packages/backend/src/scripts/transform-etape.ts — shares: OPERATOR_NOTE, GSI1, Treating, ARGUMENT, Otherwise, WILL ⇒ unrelated script
- [ ] frontend/web/src/App.tsx — shares: Reading, SEPARATE, Import, acquisitions, door, agree ⇒ unrelated
- [x] backend/src/main/java/soft/bijuterie/glam/backend/core/product/ProductImportService.java — shares: addedItems, existingByNameCollection, fallbackKey, getProductSummary, matchedExisting, matchedProduct ⇒ the Mode A original this port mirrors
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/config/core/ProductConfig.java — shares: XlsProductLoader, CategoryService, ProductService, productRepository, PriceListService, ProductImportService ⇒ Mode A bean wiring
- [x] serverless/packages/backend/src/repositories/price-list-repository.ts — shares: getByPublicId, listModifierPercent, purchaseModifierPercent, PriceListService, introducedAt, priceList ⇒ repository the importer reads chain versions from
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/pricelist/PriceList.java — shares: applyPercentModifier, HALF_UP, XlsProductLoader, listModifierPercent, purchaseModifierPercent, introducedAt ⇒ Mode A entity; modifier rule lives in the loader
- [ ] serverless/packages/shared/src/schemas/product.ts — shares: PRODUCT_REMARK_MAX_LENGTH, ProductKey, normalizeFormat, K4a, productName, ProductService ⇒ API request schemas; importer never validates with them
