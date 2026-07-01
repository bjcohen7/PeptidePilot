CREATE TABLE providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(128) NOT NULL,
  price_from_cents INT NOT NULL,
  price_note VARCHAR(255),
  included JSON NOT NULL,
  meds_offered ENUM('oral','injectable','both') NOT NULL,
  states_available JSON NOT NULL,
  cash_pay_friendly BOOLEAN NOT NULL DEFAULT TRUE,
  ship_days_estimate INT,
  affiliate_url_template VARCHAR(1024) NOT NULL,
  bounty_cents INT,
  promo_code VARCHAR(64),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_priority INT NOT NULL DEFAULT 50,
  compliance_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed rows
INSERT INTO providers (slug, display_name, price_from_cents, price_note, included, meds_offered, states_available, cash_pay_friendly, ship_days_estimate, affiliate_url_template, bounty_cents, promo_code, active, sort_priority, compliance_note)
VALUES
(
  'gala',
  'Gala Health',
  17900,
  'per month with yearly plan',
  JSON_ARRAY('Personalized provider match','Unlimited follow-up visits','Medication shipped to your door','Ongoing care coordination'),
  'both',
  '"ALL"',
  TRUE,
  4,
  'https://galaglp1.com/lp/glp1?a=price&_ef_transaction_id=&oid=1&affid=13&sub1={subid}',
  NULL,
  NULL,
  TRUE,
  1,
  'Compounded medications are not FDA-approved finished drug products.'
),
(
  'medvi',
  'Medvi',
  19900,
  'per month',
  JSON_ARRAY('Board-certified provider','Prescription management','Monthly follow-ups','Medication shipped free'),
  'both',
  '"ALL"',
  TRUE,
  4,
  'https://track.revoffers.com/aff_c?offer_id=1304&aff_id=12185&subid1={subid}',
  NULL,
  NULL,
  TRUE,
  2,
  NULL
);
