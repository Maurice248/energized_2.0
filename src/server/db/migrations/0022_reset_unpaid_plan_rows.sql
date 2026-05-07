-- Cleanup for the bug where the onboarding wizard wrote the user's
-- *selected* plan into employer_orgs.plan even though no Stripe
-- subscription existed yet. The plan column should only reflect an
-- active Stripe subscription. Reset any orgs that have a paid plan
-- recorded but no Stripe subscription on file — they were left in this
-- state by the bug; the webhook will set plan again the next time
-- they actually subscribe.
UPDATE "employer_orgs"
SET
  "plan" = 'none',
  "subscription_status" = 'none',
  "cancel_at_period_end" = false,
  "cancellation_disposition" = NULL
WHERE
  "stripe_subscription_id" IS NULL
  AND "plan" <> 'none';
