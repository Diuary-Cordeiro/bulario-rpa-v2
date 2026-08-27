#!/bin/bash

SERVICE="bulario-scheduler.service"

# =========================================================
# VERIFICAR SE JÁ ESTÁ ATIVO
# =========================================================

if /usr/bin/systemctl is-active --quiet "$SERVICE"; then

    PID=$(
        /usr/bin/systemctl show \
        "$SERVICE" \
        --property=MainPID \
        --value
    )

    echo "Scheduler já está ativo."
    echo "PID: $PID"
    echo "Controle: systemd"

    exit 0
fi

# =========================================================
# INICIAR SERVIÇO
# =========================================================

sudo -n /usr/bin/systemctl start "$SERVICE"

# Pequena pausa para o systemd atualizar o estado
sleep 1

# =========================================================
# CONFIRMAR INICIALIZAÇÃO
# =========================================================

if /usr/bin/systemctl is-active --quiet "$SERVICE"; then

    PID=$(
        /usr/bin/systemctl show \
        "$SERVICE" \
        --property=MainPID \
        --value
    )

    echo "Scheduler iniciado com sucesso."
    echo "PID: $PID"
    echo "Controle: systemd"

    exit 0
fi

# =========================================================
# ERRO
# =========================================================

echo "Erro ao iniciar o scheduler."

exit 1