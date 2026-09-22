-- Add type column to notifications for multi-tier alarm/warning/reminder support
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'reminder';

-- Add compound index for dedup queries in the scheduler
CREATE INDEX IF NOT EXISTS "notifications_user_task_type_idx" ON "notifications"("user_id", "task_id", "type");
