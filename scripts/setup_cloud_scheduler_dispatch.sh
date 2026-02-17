#!/usr/bin/env bash
set -euo pipefail

# Synapse Cloud Scheduler -> GitHub workflow_dispatch bootstrap
#
# Usage:
#   export GITHUB_PAT="<fine-grained-token>"
#   ./scripts/setup_cloud_scheduler_dispatch.sh
#
# Optional overrides:
#   JOB_NAME, GCP_PROJECT_ID, GCP_REGION, SCHEDULE, TIME_ZONE,
#   GITHUB_OWNER, GITHUB_REPO, WORKFLOW_FILE, GIT_REF

JOB_NAME="${JOB_NAME:-synapse-daily-dispatch}"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-REPLACE_WITH_GCP_PROJECT_ID}"
GCP_REGION="${GCP_REGION:-us-central1}"
SCHEDULE="${SCHEDULE:-0 13 * * *}"
TIME_ZONE="${TIME_ZONE:-Etc/UTC}"

GITHUB_OWNER="${GITHUB_OWNER:-REPLACE_WITH_GITHUB_OWNER}"
GITHUB_REPO="${GITHUB_REPO:-REPLACE_WITH_GITHUB_REPO}"
WORKFLOW_FILE="${WORKFLOW_FILE:-daily-digest.yml}"
GIT_REF="${GIT_REF:-main}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI is required but not installed."
  exit 1
fi

if [[ -z "${GITHUB_PAT:-}" ]]; then
  echo "Error: GITHUB_PAT environment variable is required."
  echo "Example: export GITHUB_PAT='github_pat_xxx'"
  exit 1
fi

if [[ "$GCP_PROJECT_ID" == "REPLACE_WITH_GCP_PROJECT_ID" ]] ||
   [[ "$GITHUB_OWNER" == "REPLACE_WITH_GITHUB_OWNER" ]] ||
   [[ "$GITHUB_REPO" == "REPLACE_WITH_GITHUB_REPO" ]]; then
  echo "Error: Replace placeholder values before running."
  exit 1
fi

URI="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches"
MESSAGE_BODY="{\"ref\":\"${GIT_REF}\"}"

echo "Configuring gcloud project: ${GCP_PROJECT_ID}"
gcloud config set project "$GCP_PROJECT_ID" >/dev/null

echo "Ensuring Cloud Scheduler API is enabled"
gcloud services enable cloudscheduler.googleapis.com >/dev/null

echo "Creating or updating scheduler job: ${JOB_NAME}"
if gcloud scheduler jobs describe "$JOB_NAME" --location "$GCP_REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$JOB_NAME" \
    --location "$GCP_REGION" \
    --schedule "$SCHEDULE" \
    --time-zone "$TIME_ZONE" \
    --uri "$URI" \
    --http-method POST \
    --headers "Accept=application/vnd.github+json,X-GitHub-Api-Version=2022-11-28,Content-Type=application/json,Authorization=Bearer ${GITHUB_PAT}" \
    --message-body "$MESSAGE_BODY"
  ACTION="updated"
else
  gcloud scheduler jobs create http "$JOB_NAME" \
    --location "$GCP_REGION" \
    --schedule "$SCHEDULE" \
    --time-zone "$TIME_ZONE" \
    --uri "$URI" \
    --http-method POST \
    --headers "Accept=application/vnd.github+json,X-GitHub-Api-Version=2022-11-28,Content-Type=application/json,Authorization=Bearer ${GITHUB_PAT}" \
    --message-body "$MESSAGE_BODY"
  ACTION="created"
fi

echo "Job ${ACTION}: ${JOB_NAME}"
echo "Next step: run a manual test trigger"
echo "  gcloud scheduler jobs run ${JOB_NAME} --location ${GCP_REGION}"
