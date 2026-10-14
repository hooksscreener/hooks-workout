# Environment variables (Vercel, Project Settings, Environment Variables)

Already set (keep): UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, APP_PASSCODE (your own passcode, your data)

New:
- TESTER_CODES   comma-separated "Name:code" pairs, one per tester. Example: Sam:river-47,Maya:oak-82
                 Each tester signs in with their code and gets their own empty data. Remove a pair to revoke access.
- ANTHROPIC_API_KEY   from console.anthropic.com. Without it the Digest still shows plain-text cards (no AI).
- DIGEST_MODEL   optional, defaults to claude-haiku-5-5.

Redeploy after changing variables. Tester feedback appears in Settings > "View feedback from testers" when signed in with APP_PASSCODE.
