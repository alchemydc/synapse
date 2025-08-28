# Deployment Guide: Daily Digest Workflow

This guide describes how to configure and deploy the `.github/workflows/daily-digest.yml` workflow for production, running once every 24 hours.

## 1. Prerequisites

- Ensure the workflow file is on the default branch (usually `main`). GitHub scheduled workflows only run from the default branch.
- Verify `package.json` has a `start` script that runs the digest bot.

## 2. Schedule

- The workflow uses cron: `0 13 * * *` (runs daily at 13:00 UTC).
- Adjust the cron expression if you need a different UTC time.

## 3. GitHub Actions Secrets

Add the following secrets in GitHub (`Settings → Secrets and variables → Actions → Secrets`):

- `DISCORD_TOKEN`: Discord bot token
- `DISCORD_CHANNELS`: Comma-separated Discord channel IDs (e.g., `111,222,333`)
- `SLACK_BOT_TOKEN`: Slack bot token
- `SLACK_CHANNEL_ID`: Slack channel ID (e.g., `C12345678`)
- `GEMINI_API_KEY`: Google AI Studio API key
- `GEMINI_MODEL`: e.g., `gemini-1.5-flash` or `gemini-1.5-pro`

## 4. GitHub Actions Variables

Add the following variables in GitHub (`Settings → Secrets and variables → Actions → Variables`):

- `MAX_SUMMARY_TOKENS`: e.g., `1024`
- `DRY_RUN`: `true` (set to `false` after validation)
- `DIGEST_WINDOW_HOURS`: `24`
- `LOG_LEVEL`: `info`
- `MIN_MESSAGE_LENGTH`: `20`
- `EXCLUDE_COMMANDS`: `true`
- `EXCLUDE_LINK_ONLY`: `true`

## 5. Workflow Hardening

- Minimal permissions (`contents: read`)
- Concurrency group to prevent overlapping runs
- Timeout (`timeout-minutes: 15`)
- Branch guard (`if: github.ref == 'refs/heads/main'`)
- Caching for npm dependencies

## 6. Deploy

- Commit the workflow file to the default branch.
- Ensure GitHub Actions are enabled for the repository.

## 7. Validation

- Manually run the workflow (`workflow_dispatch`) with `DRY_RUN=true` to verify logs and integration.
- Check job logs for Discord fetch, summarization, and Slack post steps.

## 8. Go Live

- Set `DRY_RUN=false` to enable posting.
- Observe the first scheduled run (13:00 UTC) and confirm Slack message formatting and content.

## 9. Operations

- Configure failure notifications in Actions settings.
- Monitor workflow runs for duration and rate-limit behavior.
- Store tokens as environment-scoped secrets if you want approvals/gates for changes.

## 10. Optional Enhancements

- Pin action SHAs for supply-chain hardening.
- Add retry wrappers at the app-level if desired.
- Document runbook steps and secret/variable descriptions in `README.md`.
