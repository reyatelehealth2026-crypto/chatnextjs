#!/bin/bash

# =============================================================================
# Monitoring & Alerting Script
# =============================================================================

# Configuration
APP_URL="http://localhost:3000/api/health"
ALERT_LOG="./logs/alerts.log"
RETRY_COUNT=3
RETRY_DELAY=5

# Ensure log directory exists
mkdir -p ./logs

echo "Checking system health at $(date)..."

# Function to send alert (Template - can be integrated with LINE/Email)
send_alert() {
    local message="$1"
    echo "[ALERT] $(date): $message" | tee -a "$ALERT_LOG"
    
    # Example: Send to LINE Notify (uncomment and add token to use)
    # LINE_TOKEN="your_line_notify_token"
    # curl -X POST -H "Authorization: Bearer $LINE_TOKEN" -F "message=$message" https://notify-api.line.me/api/notify
}

# Check application health
success=false
for i in $(seq 1 $RETRY_COUNT); do
    response=$(curl -s -w "%{http_code}" "$APP_URL")
    http_code="${response: -3}"
    body="${response::-3}"

    if [ "$http_code" == "200" ]; then
        echo "System is healthy (200 OK)"
        success=true
        break
    else
        echo "Attempt $i failed with code $http_code. Retrying in $RETRY_DELAY seconds..."
        sleep $RETRY_DELAY
    fi
done

if [ "$success" = false ]; then
    send_alert "CRITICAL: Inbox Next.js system is down or unhealthy. Code: $http_code. Body: $body"
    exit 1
fi

# Check PM2 status
if command -v pm2 &> /dev/null; then
    pm2_status=$(pm2 jlist | grep -o '"status":"online"' | wc -l)
    if [ "$pm2_status" -eq 0 ]; then
        send_alert "WARNING: PM2 shows no online instances of inbox-nextjs"
    fi
fi

# Check disk space
df_h=$(df -h / | tail -1)
usage=$(echo $df_h | awk '{print $5}' | sed 's/%//')
if [ "$usage" -gt 90 ]; then
    send_alert "WARNING: Low disk space on server ($usage%)"
fi

echo "Health check completed successfully."
exit 0
