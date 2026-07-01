-- Add missing providers that were in the original GLP1_PROVIDERS constant.
-- Direct Meds and Sprout had live affiliate URLs — these must exist in the
-- providers table for the matching engine and /go/ redirect to work.

INSERT INTO providers (slug, display_name, price_from_cents, price_note, included, meds_offered, states_available, cash_pay_friendly, ship_days_estimate, affiliate_url_template, bounty_cents, promo_code, active, sort_priority, compliance_note)
VALUES
(
  'direct_med',
  'Direct Meds',
  19900,
  'per month',
  JSON_ARRAY('Board-certified MD oversight','Prescription management','Monthly follow-ups','Medication shipped free'),
  'both',
  '"ALL"',
  TRUE,
  4,
  'https://track.revoffers.com/aff_c?offer_id=1304&aff_id=12185&subid1={subid}',
  NULL,
  'PILOT50',
  TRUE,
  3,
  'Compounded medications are not FDA-approved finished drug products.'
),
(
  'sprout',
  'Sprout',
  19900,
  'per month',
  JSON_ARRAY('Patient care team','Prescription management','No long-term contracts','Free shipping'),
  'both',
  '"ALL"',
  TRUE,
  5,
  'https://track.revoffers.com/aff_c?offer_id=1286&aff_id=12185&subid1={subid}',
  NULL,
  NULL,
  TRUE,
  4,
  'Compounded medications are not FDA-approved finished drug products.'
);
