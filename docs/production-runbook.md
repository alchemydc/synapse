# Synapse Production Runbook

This runbook defines how to run Synapse in production with **GitHub Actions as runtime** and **Google Cloud Scheduler as the external trigger**.

## 1) Production Architecture (No Hosted App Container)

- Runtime: GitHub Actions workflow [`.github/workflows/daily-digest.yml`](../.github/workflows/daily-digest.yml)
- Trigger: Cloud Scheduler HTTP job calls GitHub `workflow_dispatch` API
- Code path: `npm ci` -> `npm run build` -> `npm start`
- Secrets/config: GitHub repository Secrets + Variables

Why this setup:
- Avoids hosting a persistent service/container for scheduling.
- Prevents production halts caused by GitHub scheduled workflows being auto-disabled after long inactivity.

## 2) Trigger Strategy

Primary trigger:
- Cloud Scheduler invokes `workflow_dispatch` daily, seven days a week.

Fallback trigger:
- The workflow is `workflow_dispatch` only — it has no `schedule` block. Cloud Scheduler is the sole automated trigger.
- Keep `workflow_dispatch` enabled for manual recovery.

## 2a) Weekday-Only Digests

Cloud Scheduler still fires every day, but **the application itself no-ops on Saturday and
Sunday (UTC)** and rolls the weekend into Monday:

- Sat/Sun: the run starts, logs `Weekend (UTC) — skipping digest run`, and exits 0 before
  contacting Discord, Discourse, Gemini, or Slack. **A green run with no Slack post is the
  expected outcome on those days, not an incident.**
- Mon: the lookback window is `DIGEST_WINDOW_HOURS + 48` (72h by default), covering
  Fri 13:00 → Mon 13:00 UTC with no gap. Its Slack header shows a date range rather than a
  single date.
- `SKIP_WEEKEND` (repo Variable, default `true`) controls the whole policy. Setting it
  `false` restores plain daily behaviour — weekend runs happen *and* Monday loses its
  extension. Use it to force a one-off weekend run, then set it back.

## 3) Prerequisites

- GCP project with Cloud Scheduler API enabled.
- GitHub fine-grained PAT with minimum required permissions for Actions workflow dispatch on this repo.
- Workflow file name: `daily-digest.yml`.

## 4) Create the Cloud Scheduler Job

Fast path:
- Use [`scripts/setup_cloud_scheduler_dispatch.sh`](../scripts/setup_cloud_scheduler_dispatch.sh) to create/update the scheduler job with environment-variable placeholders.

Endpoint:
- `POST https://api.github.com/repos/<OWNER>/<REPO>/actions/workflows/daily-digest.yml/dispatches`

Headers:
- `Accept: application/vnd.github+json`
- `Authorization: Bearer <GITHUB_PAT>`
- `X-GitHub-Api-Version: 2022-11-28`
- `Content-Type: application/json`

Body:
```json
{"ref":"main"}
```

Example command:
```bash
gcloud scheduler jobs create http synapse-daily-dispatch \
  --location=us-central1 \
  --schedule="0 13 * * *" \
  --time-zone="Etc/UTC" \
  --uri="https://api.github.com/repos/<OWNER>/<REPO>/actions/workflows/daily-digest.yml/dispatches" \
  --http-method=POST \
  --headers="Accept=application/vnd.github+json,X-GitHub-Api-Version=2022-11-28,Content-Type=application/json,Authorization=Bearer <GITHUB_PAT>" \
  --message-body='{"ref":"main"}'
```

Notes:
- Prefer provisioning through IaC so token rotation and changes are auditable.
- PAT should be rotated on a fixed cadence.

## 5) GitHub Repository Configuration

Required workflow secrets (minimum):
- `DISCORD_TOKEN`
- `DISCORD_CHANNELS`
- `SLACK_BOT_TOKEN`
- `SLACK_CHANNEL_ID`
- `GEMINI_API_KEY`
- `DISCOURSE_API_KEY` (if Discourse enabled)
- `DISCOURSE_API_USERNAME` (if Discourse enabled)

Required workflow variables (minimum):
- `DRY_RUN` (`false` in production)
- `LOG_LEVEL` (`info` default)
- `ENABLE_DISCORD`
- `ENABLE_DISCOURSE`
- `DISCOURSE_BASE_URL` (if Discourse enabled)
- `GEMINI_MODEL`
- `MAX_SUMMARY_TOKENS`
- `DIGEST_WINDOW_HOURS`
- `SKIP_WEEKEND` (default `true`; see §2a)
- `MIN_MESSAGE_LENGTH`
- `EXCLUDE_COMMANDS`
- `EXCLUDE_LINK_ONLY`
- `MAINTAINED_PROJECTS` (optional; comma-separated, e.g. `Zebra,zcashd,Zallet`. Names the projects whose bug reports must rate `high` in the importance rubric.)

## 6) Operations: Daily Checks

Check these once per day:
- Cloud Scheduler job execution status is successful.
- A corresponding successful run exists in the `Daily Digest` workflow.
- Slack digest arrived in the expected channel — **Monday through Friday only.**

On Saturday and Sunday, expect a successful workflow run and **no Slack post** (see §2a).
Verify the run logged the weekend-skip line; a weekend run that posted a digest means
`SKIP_WEEKEND` has been left `false`.

## 7) Alerting Baseline

Set up two alerts:
- **Trigger failure alert**: Cloud Scheduler job failed.
- **Digest missing alert**: no successful `Daily Digest` run or no Slack post within expected window.
  **Suppress the "no Slack post" half on Saturday and Sunday (UTC)** — it would otherwise fire
  every weekend by design. The "no successful run" half still applies all seven days.

A missing **Monday** digest is the most costly failure mode: it drops three days of community
activity, not one. Escalate it accordingly and use the recovery procedure in §9.

Target response objective:
- Detect failure within 30 minutes of scheduled run.

## 8) Incident Playbook

### A) Scheduler fired, workflow did not start

Likely causes:
- Invalid/expired GitHub PAT.
- Repository/workflow path changed.

Actions:
1. Validate Cloud Scheduler HTTP response code and payload.
2. Validate PAT permissions and expiration.
3. Manually run `workflow_dispatch` from GitHub UI.
4. Rotate PAT and update Scheduler headers.

### B) Workflow started but failed

Likely causes:
- Invalid API credentials.
- Upstream API rate limits/outage (Discord/Discourse/Gemini/Slack).
- Config drift in repo variables.

Actions:
1. Inspect failing step in Actions logs.
2. Validate secrets/variables against [`.env.example`](../.env.example).
3. Re-run the workflow once after correction.
4. If still failing, set temporary `DRY_RUN=true` to validate end-to-end flow safely.

### C) Workflow succeeded but no Slack digest observed

Likely causes:
- Slack channel ID/token mismatch.
- Filters/window produced no qualifying messages.

Actions:
1. Inspect final posting logs in workflow.
2. Confirm `SLACK_CHANNEL_ID`, `DIGEST_WINDOW_HOURS`, and filter vars.
3. Run one manual dispatch with temporary broader window for diagnosis.

## 9) Recovery Procedure

If a daily run is missed:
1. Resolve root cause.
2. Manually dispatch the workflow (`workflow_dispatch`).
3. Confirm Slack post delivery.
4. Document incident summary and corrective action.

A manual dispatch uses the same rolling window as a scheduled one, so recovering a *late* run
needs a wider window to reach back to the missed period.

If a **Monday** run is missed, it was carrying three days of content and a plain re-dispatch on
Tuesday would only look back 24h. The job holds no state between runs, so widen the window
manually:
1. Set repo Variable `DIGEST_WINDOW_HOURS` to `96` (Fri 13:00 → Tue 13:00).
2. Manually dispatch `Daily Digest`.
3. Confirm Slack post delivery, then **restore `DIGEST_WINDOW_HOURS` to `24`.**

Do not set `SKIP_WEEKEND=false` for this — that would also strip the Monday extension.

## 10) Security & Maintenance

- Rotate GitHub PAT on a fixed schedule.
- Keep PAT scope minimal.
- Restrict who can edit Cloud Scheduler jobs and repository secrets.
- Quarterly review of workflow variables and external API credentials.

## 11) Change Management

Before changing schedule/time window:
- Validate with one manual `workflow_dispatch` run.
- Apply scheduler update in non-peak hours.
- Confirm next scheduled invocation succeeds.
