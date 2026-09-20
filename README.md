# Character Studio

Simple Next.js app for creating AI character profiles and generating character images through provider adapters.

## Current MVP

- Character profiles with local fallback storage
- Optional Supabase account authentication
- Cloud-synced characters and generation history for signed-in users
- Private Supabase Storage bucket for reference and generated images
- Reference image upload
- Provider/model selector
- Hugging Face generation adapter
- Replicate and fal provider adapters
- Text-to-image with FLUX.1 schnell
- Reference/image editing with FLUX.1 Kontext dev
- Generation Vault
- Health endpoint at `/api/health` with provider/cloud configuration status
- ComfyUI HTTP adapter for local/self-hosted workflows
- Server-side validation for image uploads and generation prompts

## Setup

Create a local `.env.local`:

```env
HF_TOKEN=your_huggingface_token
HF_IMAGE_MODEL=black-forest-labs/FLUX.1-schnell
HF_EDIT_MODEL=black-forest-labs/FLUX.1-Kontext-dev

# Optional providers
REPLICATE_API_TOKEN=your_replicate_token
FAL_KEY=your_fal_key

# Optional local/self-hosted ComfyUI
COMFYUI_URL=http://127.0.0.1:8188
COMFYUI_CHECKPOINT=your_checkpoint_filename

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Then run:

```bash
npm install
npm run dev
```

For production checks:

```bash
npm run typecheck
npm run build
```

## Supabase

1. Create a Supabase project.
2. Enable email/password authentication.
3. Run `supabase/schema.sql` in the Supabase SQL Editor. Re-run it after schema/RLS updates so the owner policies stay current.
4. Add the Supabase URL and publishable key to `.env.local`.
5. Open `/auth` to create an account or sign in.

The schema creates the `character-assets` private bucket and owner-scoped Storage RLS policies. Images are stored in Storage; database rows only keep object paths.

If Supabase variables are missing, the app continues in browser-local mode.

## Architecture

The image provider is isolated behind adapters in `lib/providers/`, so providers can be configured or extended without replacing the character UI.

Cloud persistence is split into:
- Postgres tables for characters and generation metadata
- Supabase Storage for image files
- Server API routes for authenticated reads/writes
- Row Level Security so users only access their own records and assets
