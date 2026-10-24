/**
 * Interim per-service configuration applied to every seeded service (T2.6, owner A03).
 * CAT-SVC-001…011 (BP §4.1, §4.2, §53, §64; ARCH §5.5). The owner has not set a price model,
 * selling mode, inspection flag, pricing unit, materials or warranty policy for any BP §63 item.
 * BP §63 says each item "can later be configured as ... quote-only, fixed-price, emergency-
 * eligible, provider-verification-required". Until A23/A24 set them (OQ-085), every service is
 * seeded **quote-only**: the provider quotes (D-028 Quote Pending flow), so no catalog price is
 * ever shown or invented (golden rule 2). Emergency is off (CAT-SVC-004, K-10). Everything else is
 * null + TODO(OWNER). Editable per service without an app release (BP §64; CAT-SVC-012).
 * Pure data (no imports).
 */

export const SERVICE_DEFAULTS = {
  priceModel: 'INSPECTION_QUOTE', // BP §4.1, §63 "quote-only"; OQ-085 TODO(OWNER) per service
  sellingModes: ['REQUEST_QUOTES'], // BP §53, §63 "quote-only"; OQ-085 TODO(OWNER) per service
  inspectionExpected: false, // BP §4.2, §64; visit optional inside Quote Pending (D-028, OQ-066); OQ-085
  quoteRequired: true, // BP §4.2, §64; CAT-SVC-003 → quote flow, never a catalog price
  emergencyAllowed: false, // CAT-SVC-004; K-10 emergency rules not written yet
  requiredVerificationLevel: null, // TODO(OWNER) OQ-015 (CAT-SVC-005: category rule from config)
  pricingUnit: null, // TODO(OWNER) OQ-085 (CAT-SVC-009; units list in config catalog.pricing_units)
  estimatedDurationMinutes: null, // TODO(OWNER) OQ-085 (CAT-SVC-011)
  materialsPolicy: null, // TODO(OWNER) OQ-085 (CAT-SVC-010)
} as const;
