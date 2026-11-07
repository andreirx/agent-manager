# lexmap relatedness labels
repo: /Users/apple/Documents/APLICATII BIJUTERIE/glamCRM
identity: HEAD 32e83ed, 0 uncommitted entries, inputs sha256:639f5ccc2b123939b1a5315560168bf0c6c97387f3228e6ea25e41e5e9f15130
seed: 1
median-tokens: 93

How to label: for each candidate, would a reviewer of a change in the query file need to open this file to judge the change — because it defines what the query uses, uses what the query defines, or is the other half of the same feature (schema, contract, consumer, sibling implementation)? Mark [x] yes, [ ] no, [?] cannot tell. Sharing only framework vocabulary, or merely sitting in the same layer, is "no". Open the files; the "shares" list is orientation, not evidence. Add a short reason after "⇒".

## query: frontend/workspace/e2e/helpers/allowance-fixture.ts
rare: DevRef, ThrowawayOffer, DevOfferItem, salesToken, teardownThrowawayOffer, seedThrowawayOffer, DevProduct, devApi

- [ ] serverless/packages/backend/src/services/estimate-service.ts — shares: parallel, residue, fills, READS, discipline, deletes ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/dtos/OfferGetDTO.java — shares: accountantId, technicalId, managerId ⇒
- [ ] frontend/workspace/e2e/helpers/dev-seed.ts — shares: devApi, drifts, TEARDOWN, demo, reception, teardown ⇒
- [ ] frontend/workspace/src/pages/OfferDetailPage.tsx — shares: itemId, disambiguates, compliant, demo, reception, residue ⇒
- [ ] frontend/workspace/src/api/users.ts — shares: accountantId, technicalId, managerId ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/tools/dbseed/DBSeed.java — shares: none ⇒
- [ ] frontend/web/src/components/CreateOfferDialog.tsx — shares: accountantId, technicalId, managerId, vats ⇒
- [ ] serverless/packages/backend/src/scripts/transform-codification-storage.ts — shares: itemId, fills, inert, hardcoded, simpler ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/external/postgres/user/PostgresUserRepository.java — shares: none ⇒
- [ ] serverless/packages/shared/src/schemas/offer.ts — shares: accountantId, technicalId, managerId, lifecycle ⇒
- [ ] serverless/packages/backend/src/services/offer-service.ts — shares: accountantId, technicalId, managerId, orphaned, hardcoded, applicable ⇒
- [ ] frontend/workspace/src/pages/NewOfferPage.tsx — shares: accountantId, technicalId, managerId, vats ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/dtos/OfferPostDTO.java — shares: accountantId, technicalId, managerId ⇒
- [ ] backend/api/v1/offers.http — shares: accountantId, technicalId, managerId ⇒
- [ ] serverless/packages/shared/src/types/offer.ts — shares: accountantId, technicalId, managerId, lifecycle ⇒
- [ ] serverless/packages/backend/src/repositories/category-repository.ts — shares: none ⇒
- [ ] serverless/packages/backend/src/repositories/offer-repository.ts — shares: accountantId, technicalId, managerId, exposes, ASSERTED, deviation ⇒
- [ ] serverless/packages/backend/src/utils/batch-hydrator.ts — shares: accountantId, technicalId, managerId, vats, parallel, applicable ⇒
- [ ] frontend/workspace/src/api/offers.ts — shares: accountantId, technicalId, managerId, reception, READS ⇒
- [ ] frontend/web/src/pages/EditOfferPage.tsx — shares: accountantId, technicalId, managerId, throwaway, deviation, inert ⇒
- [ ] frontend/web/src/pages/OfferPage.tsx — shares: accountantId, technicalId, managerId, inert, orphaned, Delete ⇒
- [ ] serverless/packages/shared/src/types/tenant-config.ts — shares: Seed, simpler ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/tenantconfig/TenantConfigRepository.java — shares: none ⇒
- [ ] serverless/packages/backend/src/handlers/offers.ts — shares: accountantId, technicalId, managerId, exposes, priced, applicable ⇒
- [ ] serverless/packages/backend/scripts/seeders/seed-offers.ts — shares: itemId, accountantId, technicalId, managerId, Seed ⇒

## query: frontend/workspace/src/api/file-hosting.ts
rare: CONFIRM_LEASE, maxAttempts, resolveFile, ResolveResponse, confirmUpload, uploadFileToS3, FormData, UploadIntentResponse

- [ ] serverless/packages/backend/src/handlers/scheduled/fetch-exchange-rate.ts — shares: setTimeout, RETRY, transient, uat, minute, BASE ⇒
- [ ] frontend/workspace/src/lib/brand.ts — shares: F34, SUBPATH, subpath, referencing, erased, white ⇒
- [ ] frontend/workspace/src/components/product/OverlayImageControl.tsx — shares: confirmUpload, uploadFileToS3, HostedImageMime, createUploadIntent, fileId, magic ⇒
- [ ] frontend/workspace/src/pages/OfferDetailPage.tsx — shares: ApiError, F34, fileId, reu, couple, SUBPATH ⇒
- [ ] serverless/packages/backend/src/handlers/files-v2.ts — shares: createUploadIntent, declaredMime, fileId, lived, presigned, hosting ⇒
- [ ] serverless/packages/infra/lib/constructs/api.ts — shares: CF1, fileId, minute, magic, hosted, uploaded ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/files/FileStorageService.java — shares: multipart ⇒
- [ ] serverless/packages/backend/src/repositories/file-registry-repository.ts — shares: CONFIRM_LEASE, FilePurpose, HostedImageMime, declaredMime, CF1, fileId ⇒
- [ ] serverless/packages/infra/lib/glamcrm-stack.ts — shares: bucket, hosting ⇒
- [ ] serverless/packages/backend/src/services/file-hosting-storage.ts — shares: ConfirmResponse, HostedImageMime, CF1, loadable, multipart, AUTHORITATIVE ⇒
- [ ] serverless/packages/backend/src/services/s3-file-hosting-storage.ts — shares: HostedImageMime, CF1, BYTES, presign, presigned, bucket ⇒
- [ ] serverless/packages/backend/src/services/file-hosting-service.ts — shares: ResolveResponse, UploadIntentResponse, ConfirmResponse, FilePurpose, HostedImageMime, createUploadIntent ⇒
- [ ] frontend/workspace/src/pages/LoginPage.tsx — shares: uat, Confirm, presigned, nou, err, logo ⇒
- [ ] serverless/packages/backend/src/repositories/salesperson-overlay-repository.ts — shares: setTimeout, CF1, fileId, Unreachable, retries, signature ⇒
- [ ] frontend/web/src/api/fileHosting.ts — shares: maxAttempts, confirmUpload, uploadFileToS3, FormData, UploadIntentResponse, ConfirmResponse ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/util/Retry.java — shares: maxAttempts, attempt ⇒
- [ ] frontend/web/src/pages/TenantConfigPage.tsx — shares: confirmUpload, uploadFileToS3, createUploadIntent, F34, fileId, rcarea ⇒
- [ ] serverless/packages/shared/src/types/salesperson-product-overlay.ts — shares: CF1, fileId, OBLIGATION, SEAM, lived, hosted ⇒
- [ ] serverless/packages/backend/src/services/my-catalog-service.ts — shares: CF1, fileId, races, transient, retries, became ⇒
- [ ] serverless/packages/shared/src/types/tenant-config.ts — shares: CF1, fileId, loadable, subpath, RENDER, hosted ⇒
- [ ] frontend/workspace/src/lib/overlay-image.ts — shares: resolveFile, CF1, fileId, expiry, minute, Resolve ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/tools/dbseed/DBReset.java — shares: none ⇒
- [ ] frontend/web/src/api/product.ts — shares: FormData, getApiClient, multipart, DIRECT, barrel ⇒
- [ ] serverless/packages/shared/src/schemas/file-hosting.ts — shares: FilePurpose, HostedImageMime, declaredMime, fileId, MIME, AUTHORITATIVE ⇒
- [ ] serverless/packages/shared/src/types/file-hosting.ts — shares: ResolveResponse, UploadIntentResponse, ConfirmResponse, FilePurpose, HostedImageMime, declaredMime ⇒

## query: frontend/workspace/src/api/payments.ts
rare: cashInstallment, invoiceInstallment, ScadentarRow, canCash, canInvoice, InvoiceInstallmentInputSchema, installmentId, ProjectsPage

- [ ] serverless/packages/backend/src/scripts/transform-etape.ts — shares: installmentId, THESE, disagreement, RECORDED, everywhere, WRONG ⇒
- [ ] frontend/workspace/src/pages/OfferDetailPage.tsx — shares: TRANS, PATHS, displays, RECORDED, apps, PURPOSE ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/tools/dbseed/DBSeedApp.java — shares: none ⇒
- [ ] serverless/packages/backend/src/services/pdf-estimate-service.ts — shares: invoiceNumber, REQUIRES, Installment, fiscal, trans, INVOICED ⇒
- [ ] serverless/packages/backend/src/services/estimate-service.ts — shares: invoiceNumber, assigning, THESE, transitions, transe, factur ⇒
- [ ] frontend/workspace/src/api/estimates.ts — shares: getApiClient, issuing, transe, reaching, consumes, trans ⇒
- [ ] frontend/web/src/pages/ProjectsPage.tsx — shares: canCash, canInvoice, InvoiceInstallmentInputSchema, ProjectsPage, invoiceNumber, marks ⇒
- [ ] serverless/packages/backend/src/handlers/my-catalog.ts — shares: none ⇒
- [ ] frontend/workspace/src/features/incasari/scadentar.ts — shares: ScadentarRow, canCash, canInvoice, installmentId, ProjectsPage, invoiceNumber ⇒
- [ ] serverless/packages/shared/src/utils/calculations.ts — shares: none ⇒
- [ ] frontend/workspace/src/components/ui/Pager.tsx — shares: none ⇒
- [ ] frontend/workspace/e2e/helpers/hermetic-backend.ts — shares: invoiceNumber, ceremony, scadentar, recording, PURPOSE, issuing ⇒
- [ ] frontend/web/src/api/project.ts — shares: ProjectsPage, getApiClient, Invoice, WIRE, trans, INVOICED ⇒
- [ ] serverless/packages/shared/src/schemas/installment.ts — shares: InvoiceInstallmentInputSchema, invoiceNumber, WORD, PATHS, ceremony, benefit ⇒
- [ ] frontend/workspace/src/features/incasari/index.ts — shares: none ⇒
- [ ] frontend/workspace/src/features/incasari/ProjectMoneyPage.tsx — shares: invoiceNumber, scadentar, scaden, transitions, transe, trans ⇒
- [ ] frontend/workspace/src/features/incasari/deviz-history.ts — shares: invoiceNumber, scadentar, scaden, transe, Installment, trans ⇒
- [ ] frontend/workspace/src/features/incasari/ScadentarPage.tsx — shares: cashInstallment, invoiceInstallment, ScadentarRow, installmentId, invoiceNumber, KEEPS ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/tools/migration/MigrationChecks.java — shares: installmentId, recording, consumes, fiscal, trans, invoice ⇒
- [ ] serverless/packages/backend/src/services/etapa-service.ts — shares: Installments, RECORDED, RETURNS, COLLECTION, STATE, Installment ⇒
- [ ] serverless/packages/backend/src/repositories/installment-repository.ts — shares: installmentId, invoiceNumber, renaming, WRONG, reaching, COLLECTION ⇒
- [ ] serverless/packages/backend/src/handlers/payments.ts — shares: InvoiceInstallmentInputSchema, invoiceNumber, ceremony, identified, cash, Installment ⇒
- [ ] serverless/packages/shared/src/types/installment.ts — shares: invoiceNumber, cash, factur, COLLECTION, STATE, Installment ⇒
- [ ] serverless/packages/shared/src/enums/installment-status.ts — shares: Invoice, WORD, PATHS, benefit, disagreement, RECORDED ⇒
- [ ] frontend/web/src/api/payments.ts — shares: ProjectsPage, getApiClient, invoiceNumber, Invoice, WORD, PATHS ⇒

## query: serverless/packages/backend/src/handlers/payments.ts
rare: paymentsHandler, formatPayment, PaymentController, InvoiceInstallmentInputSchema, W12, parseInt, installmentRepository, pathParams

- [ ] serverless/packages/backend/src/handlers/files.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, logAction ⇒
- [ ] serverless/packages/backend/src/handlers/offers.ts — shares: pathParams, buildUpdateSpec, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling ⇒
- [ ] serverless/packages/backend/src/services/estimate-service.ts — shares: installmentRepository, InstallmentRepository, activityLogRepository, amountPaid, invoiceDate, InstallmentStatus ⇒
- [ ] serverless/packages/backend/src/handlers/company-targets.ts — shares: activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, logAction, requestContext ⇒
- [ ] serverless/packages/backend/src/handlers/projects.ts — shares: parseInt, installmentRepository, pathParams, InstallmentRepository, activityLogRepository, withWarmup ⇒
- [ ] serverless/packages/backend/src/handlers/exchange-rates.ts — shares: activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, logAction, requestContext ⇒
- [ ] serverless/packages/backend/src/handlers/documents.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒
- [ ] serverless/packages/shared/src/types/sales-target.ts — shares: parseInt, parseFloat ⇒
- [ ] serverless/packages/backend/src/handlers/order-needs.ts — shares: installmentRepository, InstallmentRepository, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling ⇒
- [ ] serverless/packages/backend/src/handlers/etape.ts — shares: installmentRepository, InstallmentRepository, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling ⇒
- [ ] serverless/packages/backend/src/handlers/users.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒
- [ ] serverless/packages/backend/src/handlers/offer-items.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/config/tools/dbseed/DbSeedConfigProps.java — shares: none ⇒
- [ ] serverless/packages/backend/src/handlers/price-lists.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒
- [ ] serverless/packages/backend/src/handlers/categories.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒
- [ ] serverless/packages/backend/src/handlers/clients.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒
- [ ] serverless/packages/backend/src/handlers/sales-targets.ts — shares: installmentRepository, InstallmentRepository, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/external/files/pdf/PdfOfferDocumentManager.java — shares: none ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/dtos/TenantConfigPutDTO.java — shares: EXPLICIT ⇒
- [ ] serverless/packages/backend/src/handlers/estimates.ts — shares: installmentRepository, pathParams, InstallmentRepository, activityLogRepository, withWarmup, APIGatewayProxyResultV2 ⇒
- [ ] serverless/packages/backend/src/handlers/vat.ts — shares: pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒
- [ ] serverless/packages/backend/src/handlers/products.ts — shares: buildUpdateSpec, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling, handleCrudRequest ⇒
- [ ] serverless/packages/shared/src/types/installment.ts — shares: W12, amountPaid, invoiceDate, InstallmentStatus, paymentDate, invoiceNumber ⇒
- [ ] serverless/packages/backend/src/handlers/health.ts — shares: withWarmup, APIGatewayProxyResultV2, withErrorHandling, APIGatewayProxyEventV2, warmup ⇒
- [ ] serverless/packages/backend/src/handlers/activity-log.ts — shares: parseInt, pathParams, activityLogRepository, withWarmup, APIGatewayProxyResultV2, withErrorHandling ⇒

## query: serverless/packages/backend/src/services/document-service.ts
rare: S3_BUCKET_NAME, deleteFileFromS3, existingDocument, getDocument, getDocumentsByOwnerId, searchDocumentsByFileName, getAllNonGenerated, CreateDocumentInput

- [ ] serverless/packages/backend/src/services/client-service.ts — shares: getAll, getById, deleteById, managing, Log, Business ⇒
- [ ] serverless/packages/backend/src/handlers/offers.ts — shares: documentRepository, DocumentRepository, DocumentService, Documents ⇒
- [ ] serverless/packages/backend/src/handlers/documents.ts — shares: documentRepository, DocumentRepository, ownerId, Delete ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/external/postgres/category/CategoryDB.java — shares: none ⇒
- [ ] serverless/packages/backend/src/services/estimate-service.ts — shares: createDocument, isGenerated, DocumentService, ownerId, getAll, getById ⇒
- [ ] serverless/packages/backend/src/services/applicable-vat-service.ts — shares: getAll, getById, deleteById, managing, Business, Ported ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/offer/OfferDocumentService.java — shares: DocumentService, getById, deleteById, Delete ⇒
- [ ] serverless/packages/backend/src/services/s3-file-hosting-storage.ts — shares: DeleteObjectCommand, S3Client, AWS_REGION, Bucket, SDK, bucket ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/controllers/DocumentController.java — shares: getAllNonGenerated, getGeneratedBetweenDates, getAllDocuments, createDocument, DocumentService, getAll ⇒
- [ ] serverless/packages/backend/src/handlers/files.ts — shares: createDocument, documentRepository, isGenerated, DocumentRepository, DocumentService, ownerId ⇒
- [ ] serverless/packages/backend/src/services/exchange-rate-service.ts — shares: getAll, getById, managing, Business, Phase, Ported ⇒
- [ ] serverless/packages/backend/src/services/s3-service.ts — shares: DeleteObjectCommand, s3Client, S3Client, Bucket, Example, SDK ⇒
- [ ] serverless/packages/backend/src/services/product-service.ts — shares: searchTerm, getAll, deleteById, managing, Search, Business ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/estimate/Estimate.java — shares: none ⇒
- [ ] frontend/web/src/api/document.ts — shares: CreateDocumentInput, deleteDocument, getAllDocuments, getUploadedDocuments, ownerId, uploaded ⇒
- [ ] serverless/packages/backend/src/services/offer-service.ts — shares: createDocument, isGenerated, DocumentService, ownerId, getAll, getById ⇒
- [ ] frontend/web/src/pages/FilesPage.tsx — shares: deleteDocument, getAllDocuments, ownerId, deletion, Delete ⇒
- [ ] serverless/packages/backend/src/scripts/transform-etape.ts — shares: AWS_REGION, warning, Delete ⇒
- [ ] serverless/packages/shared/src/enums/offer-status.ts — shares: Ported ⇒
- [ ] frontend/web/src/api/priceAllowance.ts — shares: none ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/estimate/EstimateDocumentService.java — shares: DocumentService, getById, deleteById, warn, Delete ⇒
- [ ] serverless/packages/shared/src/types/document.ts — shares: CreateDocumentInput, isGenerated, ownerId, Documents, Excel, Ported ⇒
- [ ] serverless/packages/backend/src/handlers/estimates.ts — shares: documentRepository, DocumentRepository, DocumentService, Delete ⇒
- [ ] serverless/packages/backend/src/repositories/document-repository.ts — shares: getByOwnerId, getGeneratedDocuments, searchByFileName, getUploadedDocuments, searchTerm, isGenerated ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/document/DocumentService.java — shares: existingDocument, getAllNonGenerated, getGeneratedBetweenDates, documentRepository, DocumentRepository, DocumentService ⇒

## query: serverless/packages/backend/src/services/product-import-service.ts
rare: ExactDecimal, ImportService, NO_MODIFIERS, PriceModifiers, ProductWithKey, ROUND_HALF_UP, activeInChain, byCoordinate

- [ ] frontend/workspace/src/features/incasari/deviz-history.ts — shares: PURE, rounds, others, OLD, ordered ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/external/files/xls/XlsProductLoader.java — shares: cleanProductName, currentCollectionName, getCellValue, listPriceWithoutVat, vatMultiplier, applyPercentModifier ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/salestarget/SalesTargetRepository.java — shares: none ⇒
- [ ] serverless/packages/backend/src/services/my-catalog-service.ts — shares: getByPublicId, getByPriceListId, priceListRepository, productRepository, PriceListService, introducedAt ⇒
- [ ] serverless/packages/backend/src/services/offer-item-service.ts — shares: NaN, isFinite, priceListRepository, ProductService, productRepository, PriceListService ⇒
- [ ] serverless/packages/shared/src/types/product.ts — shares: ProductImportOutcome, PRODUCT_REMARK_MAX_LENGTH, productKeyToString, F26, F28, ProductImportResultItem ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/product/Product.java — shares: PRODUCT_REMARK_MAX_LENGTH, ProductKey, normalizeFormat, ProductService, introducedAt, ProductImportService ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/client/Client.java — shares: none ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/product/ProductService.java — shares: usedCollectionIndices, newProduct, existingProduct, putIfAbsent, CategoryService, K4a ⇒
- [ ] serverless/packages/backend/src/services/product-service.ts — shares: byDate, coordinateClash, currentMax, usedIndices, currentMaxIdx, maxIdxInCollectionMap ⇒
- [ ] pl-tools/engines/assemble.mjs — shares: firstCellEmpty, formatCell, hasName, secondCell, firstCell, matchingCode ⇒
- [ ] frontend/web/src/auth/index.ts — shares: instance, Check, during ⇒
- [ ] serverless/packages/backend/src/scripts/transform-codification-storage.ts — shares: byCodification, chainPublicId, categoryPublicId, mintInternalCodification, priceList, Give ⇒
- [ ] serverless/packages/backend/src/services/errors.ts — shares: assertCodificationFreeAmongActive, ProductUniquenessError, getByPriceListId, K4a, PriceListService, formatKey ⇒
- [ ] serverless/packages/backend/src/services/estimate-service.ts — shares: categoryRepository, CategoryRepository, priceListRepository, productRepository, PriceListRepository, parseFloat ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/app/tools/migration/MigrationChecks.java — shares: vatPercentage, putIfAbsent, HALF_UP, valueOf, OPERATOR_NOTE, unescaped ⇒
- [ ] serverless/packages/backend/src/services/price-list-service.ts — shares: ProductImportResult, getByPublicId, createPriceList, listModifierPercent, purchaseModifierPercent, importProducts ⇒
- [ ] serverless/packages/backend/src/handlers/products.ts — shares: mintInternalCodification, CategoryService, K4a, categoryRepository, CategoryRepository, priceListRepository ⇒
- [ ] serverless/packages/backend/src/services/offer-service.ts — shares: productMap, categoryRepository, CategoryRepository, priceListRepository, productRepository, PriceListRepository ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/external/files/xls/XlsUtils.java — shares: getCellValue, firstCell, isProductRow, oldCode, newCode, productName ⇒
- [ ] serverless/packages/backend/src/handlers/price-lists.ts — shares: createPriceList, listModifierPercent, purchaseModifierPercent, categoryRepository, CategoryRepository, priceListRepository ⇒
- [ ] frontend/workspace/src/pages/OfferDetailPage.tsx — shares: NaN, isFinite, OPERATOR_NOTE, OF2, technicalSpecification, browsing ⇒
- [ ] serverless/packages/backend/src/scripts/transform-etape.ts — shares: OPERATOR_NOTE, GSI1, Treating, ARGUMENT, Otherwise, WILL ⇒
- [ ] frontend/web/src/App.tsx — shares: Reading, SEPARATE, Import, acquisitions, door, agree ⇒
- [ ] backend/src/main/java/soft/bijuterie/glam/backend/core/product/ProductImportService.java — shares: addedItems, existingByNameCollection, fallbackKey, getProductSummary, matchedExisting, matchedProduct ⇒
