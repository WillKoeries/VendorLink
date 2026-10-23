ALTER TABLE applications
    ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUIRED',
    ADD COLUMN payment_amount NUMERIC(10, 2),
    ADD COLUMN merchant_payment_id VARCHAR(64),
    ADD COLUMN pf_payment_id VARCHAR(64),
    ADD COLUMN payment_completed_at TIMESTAMP;

CREATE UNIQUE INDEX uq_applications_merchant_payment_id
    ON applications (merchant_payment_id)
    WHERE merchant_payment_id IS NOT NULL;

CREATE UNIQUE INDEX uq_applications_pf_payment_id
    ON applications (pf_payment_id)
    WHERE pf_payment_id IS NOT NULL;
