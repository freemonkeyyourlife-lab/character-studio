# Supabase setup

1. Create a Supabase project.
2. Run schema.sql in the Supabase SQL Editor.
3. Copy the project URL and publishable key into .env.local:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
4. Authentication must be enabled before cloud persistence is activated because the tables are protected by Row Level Security and require auth.uid().

The application can continue using browser-local storage while these variables are empty.

The schema deliberately does not use a service-role/secret key in the browser. Supabase recommends publishable keys for client code and Row Level Security for protecting exposed tables.
