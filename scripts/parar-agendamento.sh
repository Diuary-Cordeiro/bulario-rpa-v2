#!/bin/bash

SERVICE="bulario-scheduler.service"

# =========================================================
# VERIFICAR SE JÁ ESTÁ PARADO
# =========================================================

if ! /usr/bin/systemctl is-active --quiet "$SERVICE"; then

    echo "Scheduler já está parado."

    exit 0
fi

# =========================================================
# PARAR SERVIÇO
# =========================================================

sudo -n /usr/bin/systemctl stop "$SERVICE"

# Pequena pausa para o systemd atualizar o estado
sleep 1

# =========================================================
# CONFIRMAR PARADA
# =========================================================

if ! /usr/bin/systemctl is-active --quiet "$SERVICE"; then

    echo "Scheduler parado com sucesso."
    echo "Controle: systemd"

    exit 0
fi

# =========================================================
# ERRO
# =========================================================

echo "Erro ao parar o scheduler."

exit 1