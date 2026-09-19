# Supabase setup

1. Create a Supabase project.
2. Enable email/password authentication.
3. Run `schema.sql` in the Supabase SQL Editor.
4. Copy the project URL and publishable key into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Start the app and open `/auth` to create an account.

The schema creates:

- `characters` for character profiles
- `generations` for generation metadata
- private `character-assets` Storage bucket for reference/generated images
- Row Level Security policies for database records
- Storage policies scoped to the authenticated user's folder/ownership

Image files are kept in Storage rather than inside Postgres. The app stores Storage object paths in the database and creates short-lived signed URLs when loading them.

The application continues using browser-local storage when Supabase environment variables are missing or the visitor is not signed in.

Do not put a Supabase service-role/secret key into browser environment variables. The app uses the publishable key with RLS for client-side Supabase access and server-side session handling.
