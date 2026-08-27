#!/bin/bash

# =========================================================
# BULARIO RPA V2
# PARAR EXECUCAO MANUAL
# =========================================================

BASE_DIR="/home/server-fhir/Documentos/bulario-rpa-v2"

PID_FILE="$BASE_DIR/out/execucao-manual.pid"

# =========================================================
# VERIFICAR PID
# =========================================================

if [ ! -f "$PID_FILE" ]; then

    echo "RESULT=NOT_RUNNING"
    echo "Nenhuma execução manual ativa."

    exit 0
fi

PID=$(cat "$PID_FILE" 2>/dev/null || true)

# =========================================================
# VALIDAR PID
# =========================================================

if ! [[ "$PID" =~ ^[0-9]+$ ]]; then

    rm -f "$PID_FILE"

    echo "RESULT=NOT_RUNNING"
    echo "Nenhuma execução manual ativa."

    exit 0
fi

# =========================================================
# VERIFICAR GRUPO DE PROCESSOS
# =========================================================

if ! kill -0 -- "-$PID" 2>/dev/null; then

    rm -f "$PID_FILE"

    echo "RESULT=NOT_RUNNING"
    echo "Nenhuma execução manual ativa."

    exit 0
fi

# =========================================================
# SOLICITAR ENCERRAMENTO NORMAL
# =========================================================

kill -TERM -- "-$PID" 2>/dev/null || true

# =========================================================
# AGUARDAR ENCERRAMENTO
# =========================================================

for tentativa in 1 2 3 4 5
do

    sleep 1

    if ! kill -0 -- "-$PID" 2>/dev/null; then

        rm -f "$PID_FILE"

        echo "RESULT=STOPPED"
        echo "Execução manual parada com sucesso."
        echo "O progresso salvo foi preservado."

        exit 0
    fi

done

# =========================================================
# FORÇAR PROCESSOS REMANESCENTES
# =========================================================

kill -KILL -- "-$PID" 2>/dev/null || true

sleep 1

rm -f "$PID_FILE"

# =========================================================
# CONFIRMAR PARADA
# =========================================================

if kill -0 -- "-$PID" 2>/dev/null; then

    echo "RESULT=ERROR"
    echo "Não foi possível encerrar completamente a execução manual."

    exit 1
fi

echo "RESULT=STOPPED"
echo "Execução manual parada com sucesso."
echo "O progresso salvo foi preservado."

exit 0