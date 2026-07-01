import { createConnection } from "mysql2/promise";

const sql = `INSERT INTO providers (slug, display_name, price_from_cents, price_note, included, meds_offered, states_available, cash_pay_friendly, ship_days_estimate, affiliate_url_template, bounty_cents, promo_code, active, sort_priority, compliance_note)
VALUES
('direct_med','Direct Meds',19900,'per month',CAST('["Board-certified MD oversight","Prescription management","Monthly follow-ups","Medication shipped free"]' AS JSON),'both',CAST('"ALL"' AS JSON),TRUE,4,'https://track.revoffers.com/aff_c?offer_id=1304&aff_id=12185&subid1={subid}',NULL,'PILOT50',TRUE,3,'Compounded medications are not FDA-approved finished drug products.'),
('sprout','Sprout',19900,'per month',CAST('["Patient care team","Prescription management","No long-term contracts","Free shipping"]' AS JSON),'both',CAST('"ALL"' AS JSON),TRUE,5,'https://track.revoffers.com/aff_c?offer_id=1286&aff_id=12185&subid1={subid}',NULL,NULL,TRUE,4,'Compounded medications are not FDA-approved finished drug products.')
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name);`;

const conn = await createConnection(process.env.DATABASE_URL);
await conn.execute(sql);
console.log("Direct Meds + Sprout inserted (or already existed).");
await conn.end();
