#!/bin/bash

SERVICE="bulario-scheduler.service"

STATUS=$(sudo -n /usr/bin/systemctl is-active "$SERVICE" 2>/dev/null)

if [ "$STATUS" = "active" ]; then

    PID=$(/usr/bin/systemctl show "$SERVICE" --property=MainPID --value)

    echo "STATUS=ATIVO"
    echo "PID=$PID"

else

    echo "STATUS=PARADO"
    echo "PID="

fi