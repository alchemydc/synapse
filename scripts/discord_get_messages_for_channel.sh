#!/bin/bash
#set -ex

source ../.env

CHANNEL_IDS="1112877040534823023,1112881933580505179,1153545533114290256,1259933661026062426,979771529640443995,1019068568295440394"

for CHANNEL_ID in $(echo $CHANNEL_IDS | tr ',' '\n'); do
  echo "Fetching messages for channel: $CHANNEL_ID"
  RESPONSE=$(curl -s -w "%{http_code}" -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
    -H "Content-Type: application/json" \
    -X GET \
    "https://discord.com/api/v10/channels/$CHANNEL_ID/messages")

  if [ ${#RESPONSE} -lt 3 ]; then
    echo "Error: No response or too short for channel $CHANNEL_ID"
    continue
  fi

  HTTP_CODE="${RESPONSE: -3}"

  echo "Channel $CHANNEL_ID response code: $HTTP_CODE"
done
