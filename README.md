# Character Studio

Simple Next.js app for creating AI character profiles and generating character images through provider adapters.

## Current MVP

- Character profiles stored in browser localStorage
- Reference image upload
- Provider/model selector
- Hugging Face generation adapter
- Text-to-image with FLUX.1 schnell
- Reference/image editing with FLUX.1 Kontext dev
- Generation Vault stored locally in the browser
- Health endpoint at `/api/health`

## Setup

Create a local `.env.local`:

```env
HF_TOKEN=your_huggingface_token
HF_IMAGE_MODEL=black-forest-labs/FLUX.1-schnell
HF_EDIT_MODEL=black-forest-labs/FLUX.1-Kontext-dev
```

Then:

```bash
npm install
npm run dev
```

For a production check:

```bash
npm run typecheck
npm run build
```

## Architecture

The app keeps the image provider behind a small adapter in `lib/providers/`. Additional providers such as Replicate, fal, or ComfyUI can be added without replacing the character UI.

Persistent cloud storage is intentionally not enabled yet. The next persistence layer should move characters and generated assets out of browser localStorage into a database plus object storage, while keeping local fallback behavior for development.
