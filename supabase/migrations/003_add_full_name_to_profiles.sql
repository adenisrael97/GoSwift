-- full_name was defined in 001_initial_schema.sql but was not persisted
-- by the migration runner. Adding it explicitly here.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

NOTIFY pgrst, 'reload schema';
