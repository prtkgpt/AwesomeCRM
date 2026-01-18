#!/bin/bash
# Mark all existing migrations as applied (they're already in the database)

migrations=(
  "20260104_init"
  "20260105000000_multi_tenant"
  "20260105105804_add_team_member_details_and_pay_logs"
  "20260105112301_add_insurance_documentation_fields"
  "20260105115347_add_cleaner_workflow_tracking"
  "20260105120953_add_customer_feedback_and_payment_links"
  "20260105121800_add_copay_payment_tracking"
  "20260105_add_cleaning_reviews"
  "20260105_add_company_api_integrations"
  "20260105_add_estimate_fields"
  "20260105_add_insurance_and_property_details"
  "20260105_add_password_reset_fields"
  "20260105_add_reminder_settings_and_tracking"
  "20260106214500_add_pricing_configuration"
  "20260106232247_add_feedback_link_sent_at"
  "20260107010357_add_auto_charge_fields"
  "20260107022040_add_stripe_credentials"
  "20260109_add_business_type_and_feature_flags"
)

for migration in "${migrations[@]}"; do
  echo "Marking $migration as applied..."
  npx prisma migrate resolve --applied "$migration" 2>/dev/null || true
done

echo "Done marking migrations as applied."
