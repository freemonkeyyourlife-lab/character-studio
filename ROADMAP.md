# Character Studio / AI Creation Engine

This is the implementation tracker for the standalone engine. Artanis × Triania is a later, separate product integration. Slack is out of scope for now.

The earlier **34%** overall figure was a planning estimate, not a measured delivery metric. Update it only after working functionality and production checks justify a change.

| Phase | Next deliverables | Current state |
| --- | --- | --- |
| 0. Stabilization | Reproducible CI, production build, deployment verification | Build and chat foundation merged in PR #1; both Vercel checks passed on its PR and merge commit. |
| 1. Creation | Character Creator, universal drag and drop, provider registry/router and comparison center, image/video/voice editing | Existing character and media foundations; availability endpoint and automatic image routing with at most one fallback. Comparison and broader routing remain open. |
| 2. Intelligence | Persistent multi-turn chat, layered context, memory, personal AI | Supabase-backed Venice chat merged in PR #1; live database/provider verification and long-term memory remain open. |
| 3. Story | Topic, story, scenario and scene state, creator hub | Planned. |
| 4. Agents | Tool calls for chat/media, orchestration, resumable jobs and recovery | Planning endpoint and orchestrator scaffold only. |
| 5. Production | Consent, access control, data/media backup and restore, monitoring, cost controls, browser and end-to-end tests | Partial foundations; production review pending. |

## Current integration gate

1. Apply the updated `supabase/schema.sql` to the intended Supabase project (including the atomic chat-turn function).
2. Configure server-only `VENICE_API_KEY` and an available `VENICE_CHAT_MODEL` in the intended deployment.
3. Test a signed-in two-turn conversation, reload it, verify character context and owner isolation, then inspect provider errors and usage.
4. Continue with memory and story state only after the actual chat round trip works.

## Provider references

Venice, SeaArt, NovelAI, FlowGPT, Civitai, Hugging Face, Replicate, fal, ComfyUI and ElevenLabs were discussed as providers or product/architecture references. Inclusion in a discussion does not imply that an external API is available or integrated. Verify official API access, terms, capabilities and actual account configuration before listing any adapter as live. User-provided platform exports and screenshots will refine the product behavior later.
