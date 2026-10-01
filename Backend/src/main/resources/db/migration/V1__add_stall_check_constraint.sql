-- 1. Correct any drifted available_stalls counts before applying constraint
UPDATE events e
SET available_stalls = GREATEST(0, e.total_stalls - COALESCE((
    SELECT COUNT(*) FROM applications a WHERE a.event_id = e.id AND a.status = 'APPROVED'
), 0));

-- 2. Add table check constraint ensuring available_stalls stays between 0 and total_stalls
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_events_stalls'
    ) THEN
        ALTER TABLE events ADD CONSTRAINT chk_events_stalls
            CHECK (total_stalls >= 1 AND available_stalls >= 0 AND available_stalls <= total_stalls);
    END IF;
END $$;
