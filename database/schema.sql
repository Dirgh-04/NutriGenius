-- ============================================================================
-- NutriGenius AI — PostgreSQL Schema (Supabase)
-- Full schema with UUID primary keys, foreign keys, indexes, and Row Level Security (RLS)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    daily_calorie_goal INTEGER DEFAULT 2000 CHECK (daily_calorie_goal > 0),
    daily_protein_goal_g NUMERIC(6, 2) DEFAULT 60.0 CHECK (daily_protein_goal_g >= 0),
    daily_carbs_goal_g NUMERIC(6, 2) DEFAULT 250.0 CHECK (daily_carbs_goal_g >= 0),
    daily_fat_goal_g NUMERIC(6, 2) DEFAULT 70.0 CHECK (daily_fat_goal_g >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dietary_preference TEXT DEFAULT 'balanced', -- e.g. vegetarian, vegan, low-carb, balanced
    preferred_ingredients TEXT[] DEFAULT '{}',
    avoided_ingredients TEXT[] DEFAULT '{}',
    comparison_priority TEXT DEFAULT 'balanced', -- e.g. low_sugar, high_protein, low_calories
    meals_per_day INTEGER DEFAULT 3 CHECK (meals_per_day BETWEEN 1 AND 6),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_preference UNIQUE (user_id)
);

-- 3. SAVED PRODUCTS (Favorites & Bookmarked foods from Open Food Facts)
CREATE TABLE IF NOT EXISTS public.saved_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL,
    product_name TEXT NOT NULL,
    brand TEXT,
    image_url TEXT,
    nutriscore_grade TEXT,
    calories_100g NUMERIC(8, 2),
    protein_100g NUMERIC(6, 2),
    carbs_100g NUMERIC(6, 2),
    fat_100g NUMERIC(6, 2),
    sugar_100g NUMERIC(6, 2),
    fiber_100g NUMERIC(6, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_product UNIQUE (user_id, barcode)
);

-- 4. FOOD LOGS TABLE (Daily intake tracker)
CREATE TABLE IF NOT EXISTS public.food_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    serving_quantity NUMERIC(8, 2) NOT NULL CHECK (serving_quantity > 0),
    serving_unit TEXT DEFAULT 'g', -- e.g. 'g', 'ml', 'serving'
    meal_type TEXT DEFAULT 'snack', -- breakfast, lunch, dinner, snack
    calories NUMERIC(8, 2) NOT NULL CHECK (calories >= 0),
    protein_g NUMERIC(6, 2) DEFAULT 0 CHECK (protein_g >= 0),
    carbs_g NUMERIC(6, 2) DEFAULT 0 CHECK (carbs_g >= 0),
    fat_g NUMERIC(6, 2) DEFAULT 0 CHECK (fat_g >= 0),
    sugar_g NUMERIC(6, 2) DEFAULT 0,
    fiber_g NUMERIC(6, 2) DEFAULT 0,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    barcode TEXT, -- optional reference to barcode
    notes TEXT
);

-- 5. MEAL PLANS TABLE
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    target_calories INTEGER,
    dietary_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MEAL PLAN ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.meal_plan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7),
    meal_type TEXT NOT NULL, -- breakfast, lunch, dinner, snack
    recipe_id TEXT,          -- TheMealDB recipe ID
    recipe_name TEXT NOT NULL,
    recipe_image_url TEXT,
    estimated_calories NUMERIC(8, 2),
    match_score NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR FREQUENTLY QUERIED FIELDS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON public.food_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_saved_products_user ON public.saved_products(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON public.meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan ON public.meal_plan_items(meal_plan_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each authenticated user can read and modify ONLY their own records.
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- User Preferences Policies
CREATE POLICY "Users can manage own preferences"
    ON public.user_preferences FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Saved Products Policies
CREATE POLICY "Users can manage own saved products"
    ON public.saved_products FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Food Logs Policies
CREATE POLICY "Users can manage own food logs"
    ON public.food_logs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Meal Plans Policies
CREATE POLICY "Users can manage own meal plans"
    ON public.meal_plans FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Meal Plan Items Policies (joined via meal_plans user_id)
CREATE POLICY "Users can manage own meal plan items"
    ON public.meal_plan_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.meal_plans
            WHERE public.meal_plans.id = public.meal_plan_items.meal_plan_id
            AND public.meal_plans.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meal_plans
            WHERE public.meal_plans.id = public.meal_plan_items.meal_plan_id
            AND public.meal_plans.user_id = auth.uid()
        )
    );
