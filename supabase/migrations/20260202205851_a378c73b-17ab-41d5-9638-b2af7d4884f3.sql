-- Add unique constraint to prevent duplicate alerts for the same schedule, type, and date
ALTER TABLE public.schedule_alerts 
ADD CONSTRAINT schedule_alerts_unique_per_schedule 
UNIQUE (schedule_id, alert_type, alert_date);