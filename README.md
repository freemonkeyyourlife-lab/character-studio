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
- Responsive Video Studio for mobile and desktop
- Voice Studio with ElevenLabs Instant Voice Cloning and text-to-speech
- Video adapters for Replicate, fal and configurable ComfyUI workflows
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
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2
REPLICATE_VIDEO_MODEL=your_replicate_video_model
FAL_VIDEO_MODEL=your_fal_video_endpoint

# Optional local/self-hosted ComfyUI
COMFYUI_URL=http://127.0.0.1:8188
COMFYUI_CHECKPOINT=your_checkpoint_filename
# Optional JSON workflow for video generation. Supports {{PROMPT}}, {{DURATION}}, {{WIDTH}}, {{HEIGHT}}, {{FPS}}.
COMFYUI_VIDEO_WORKFLOW=

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Then run:

```bash
npm install
npm run dev
```

For mobile testing on the same local network, use:
```bash
npm run dev:lan
```
Then open the computer's local network address (for example `http://192.168.x.x:3000`) on the phone. Keep the computer and phone on the same trusted network.

The app is also designed to run as a normal hosted Next.js application (for example on Vercel). Local browser storage remains the fallback when Supabase is not configured; hosted deployments can use Supabase for cross-device data.

For production checks:

```bash
npm run typecheck
npm run build
```

## Voice profiles

The SQL schema now includes a private `voice_profiles` table. Apply the current `supabase/schema.sql` in the Supabase SQL editor when enabling cloud voice profiles. The table stores the provider voice ID and consent metadata, not the original audio samples. Voice profiles are protected by owner-only RLS policies.

The Agent Lab multi-message chat requires an authenticated Supabase session, the latest `supabase/schema.sql` (including `conversations` and `conversation_messages`), and server-only `VENICE_API_KEY` plus `VENICE_CHAT_MODEL` environment variables. Set the model to a text chat model available in your Venice account. Messages are stored under owner-only RLS; the server loads the last 40 messages for the next turn. Long-term memory, story state, autonomous tools, and provider fallback are separate future steps. Without those settings, the chat endpoint reports its missing configuration instead of simulating an answer.

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


## Video Studio

Open `/video` from the main app. The video UI is responsive and designed for phones as well as desktop.

Supported modes:
- **Replicate:** set `REPLICATE_API_TOKEN` and `REPLICATE_VIDEO_MODEL` to a compatible video model.
- **fal:** set `FAL_KEY` and `FAL_VIDEO_MODEL` to a compatible video endpoint.
- **ComfyUI:** set `COMFYUI_URL` and `COMFYUI_VIDEO_WORKFLOW`. The workflow is sent to ComfyUI with placeholder substitution for `{{PROMPT}}`, `{{DURATION}}`, `{{WIDTH}}`, `{{HEIGHT}}` and `{{FPS}}`.

The application does not promise unlimited hosted generation: hosted providers can impose their own pricing, quotas, model limits and content policies. Local ComfyUI can avoid per-generation provider fees, but it is still constrained by the local machine, storage, model and workflow.

For a hosted deployment such as Vercel, `COMFYUI_URL` must point to a reachable ComfyUI server; `127.0.0.1` on Vercel refers to the deployment itself, not your home computer.


## Artanis / Triania integration

Character Studio exposes a protected server-to-server integration layer for a separate Base44 app such as the Artanis/Triania project. Base44 can send live chat context, a character definition and explicitly consented reference assets to Character Studio. The bridge turns that context into a structured generation prompt and can hand the prompt to the existing image or video provider adapters.

Configure only on the server:

```env
ARTANIS_INTEGRATION_SECRET=use-a-long-random-secret
```

Endpoints:
- `POST /api/integrations/artanis/context` — normalize chat context and return a generated visual prompt/context.
- `POST /api/integrations/artanis/image` — use chat context to generate an image.
- `POST /api/integrations/artanis/video` — use chat context to generate a video.
- `GET /api/integrations/artanis/health` — inspect integration capability/configuration.
- `POST /api/integrations/artanis/voice` — turn Artanis scene/chat text into speech with a configured ElevenLabs voice.

Base44 should call these endpoints from a backend function and send `x-artanis-integration-secret`. Do not put the secret in browser code.

Reference assets are accepted by the context layer only when the incoming asset is explicitly marked `consentGranted: true`. This is an integration-level permission signal, not a legal determination; applications should retain their own consent records and allow revocation.

## Voice Studio

Open `/voice` to create an ElevenLabs Instant Voice Clone from uploaded samples and synthesize speech from text. Set `ELEVENLABS_API_KEY` and optionally `ELEVENLABS_TTS_MODEL`.

The clone flow requires an explicit consent confirmation and records the declared consent subject in the application response. This is an application-level safeguard, not a legal determination. ElevenLabs documents additional verification and account restrictions for Professional Voice Cloning; PVC is not treated as an unrestricted third-party cloning API here. Voice clones also remain managed by the provider rather than becoming portable model files. urlElevenLabs voice-cloning documentationhttps://elevenlabs.io/docs/eleven-api/concepts/voice-cloning
