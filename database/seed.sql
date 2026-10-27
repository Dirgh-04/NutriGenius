-- ============================================================================
-- NutriGenius AI — Safe Sample Seed Data
-- Clearly identified sample records for local demonstration and evaluation.
-- NOTE: Do not run this on production databases with live users.
-- ============================================================================

-- Note: In Supabase, auth.users entries must be created via Supabase Auth.
-- The following are illustrative mock records demonstrating the schema format.

/*
-- Example user profile insertion (replace 'USER_UUID_HERE' with real auth.uid())
INSERT INTO public.profiles (id, email, full_name, daily_calorie_goal, daily_protein_goal_g)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'sample.student@nutrigenius.local', 'Demo Student', 2200, 75.0)
ON CONFLICT (id) DO NOTHING;

-- Example food log entries
INSERT INTO public.food_logs (user_id, food_name, serving_quantity, serving_unit, meal_type, calories, protein_g, carbs_g, fat_g, sugar_g, fiber_g)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Rolled Oats with Almond Milk', 60, 'g', 'breakfast', 310.0, 11.2, 52.0, 6.5, 2.1, 8.0),
    ('00000000-0000-0000-0000-000000000001', 'Grilled Chicken Breast', 150, 'g', 'lunch', 247.5, 46.5, 0.0, 5.4, 0.0, 0.0),
    ('00000000-0000-0000-0000-000000000001', 'Steamed Broccoli', 100, 'g', 'lunch', 34.0, 2.8, 6.6, 0.4, 1.7, 2.6);
*/
