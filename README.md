# AI CyberSOC Copilot

The supported backend boundary is `/api/workflow`: tenant-scoped alert cases, evidence digests/redacted summaries, response proposals, separate administrator approval, externally executed result recording, closure/failure, and append-only audit history. It does not execute response actions.

Copy `.env.example` to `.env` and provide a strong JWT secret and PostgreSQL URL. Run migrations only with `ALLOW_DATABASE_MIGRATION=1 npm --prefix backend run migrate`; create the first tenant administrator only with `ALLOW_BOOTSTRAP_ADMIN=1 npm --prefix backend run bootstrap-admin`. `./start.sh` neither installs, migrates, seeds, starts PostgreSQL, nor kills unrelated processes. Legacy demo routes are disabled by default.

SIEM/EDR/cloud/email/IAM/ticketing/SOAR providers, replay evaluation, production secret management, and security validation remain owner/provider work.
