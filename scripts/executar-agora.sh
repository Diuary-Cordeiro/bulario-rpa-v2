#!/bin/bash

# =========================================================
# BULARIO RPA V2
# EXECUTAR LOTE IMEDIATAMENTE
# =========================================================

set -u

# =========================================================
# CAMINHOS
# =========================================================

BASE_DIR="/home/server-fhir/Documentos/bulario-rpa-v2"

NODE_BIN="/home/server-fhir/.nvm/versions/node/v22.23.2/bin/node"

XVFB_RUN="/usr/bin/xvfb-run"

INDEX_JS="$BASE_DIR/src/index.js"

LOG_DIR="$BASE_DIR/logs"

LOG_FILE="$LOG_DIR/execucao-manual.log"

PID_FILE="$BASE_DIR/out/execucao-manual.pid"

# =========================================================
# PREPARAR AMBIENTE
# =========================================================

mkdir -p "$LOG_DIR"

mkdir -p "$BASE_DIR/out"

cd "$BASE_DIR" || {
    echo "Erro: não foi possível acessar $BASE_DIR"
    exit 1
}

# =========================================================
# VERIFICAR EXECUÇÃO MANUAL EXISTENTE
# =========================================================

if [ -f "$PID_FILE" ]; then

    PID_ANTIGO=$(cat "$PID_FILE" 2>/dev/null || true)

    if [[ "$PID_ANTIGO" =~ ^[0-9]+$ ]]; then

        if kill -0 -- "-$PID_ANTIGO" 2>/dev/null; then

            echo "Já existe uma execução manual em andamento."
            echo "PID: $PID_ANTIGO"

            exit 1
        fi
    fi

    rm -f "$PID_FILE"
fi

# =========================================================
# VALIDAR NODE
# =========================================================

if [ ! -x "$NODE_BIN" ]; then

    echo "Erro: Node.js não encontrado em:"
    echo "$NODE_BIN"

    exit 1
fi

# =========================================================
# VALIDAR XVFB
# =========================================================

if [ ! -x "$XVFB_RUN" ]; then

    echo "Erro: xvfb-run não encontrado em:"
    echo "$XVFB_RUN"

    exit 1
fi

# =========================================================
# VALIDAR INDEX.JS
# =========================================================

if [ ! -f "$INDEX_JS" ]; then

    echo "Erro: index.js não encontrado em:"
    echo "$INDEX_JS"

    exit 1
fi

# =========================================================
# REGISTRAR PID DA EXECUÇÃO MANUAL
# =========================================================

echo "$$" > "$PID_FILE"

# =========================================================
# LIMPEZA DO PID
# =========================================================

cleanup() {

    if [ -f "$PID_FILE" ]; then

        PID_ARQUIVO=$(cat "$PID_FILE" 2>/dev/null || true)

        if [ "$PID_ARQUIVO" = "$$" ]; then

            rm -f "$PID_FILE"
        fi
    fi
}

trap cleanup EXIT

# =========================================================
# REGISTRAR INÍCIO
# =========================================================

{
    echo ""
    echo "========================================"
    echo "BULARIO RPA V2"
    echo "EXECUCAO MANUAL"
    echo "========================================"
    echo "Inicio: $(date '+%d/%m/%Y %H:%M:%S')"
    echo "PID principal: $$"
    echo "Node: $NODE_BIN"
    echo "Xvfb: $XVFB_RUN"
    echo "Index: $INDEX_JS"
    echo "========================================"
} >> "$LOG_FILE"

# =========================================================
# EXECUTAR RPA COM TELA VIRTUAL
# =========================================================

"$XVFB_RUN" \
    -a \
    -s "-screen 0 1920x1080x24" \
    "$NODE_BIN" \
    "$INDEX_JS" \
    >> "$LOG_FILE" 2>&1

CODIGO=$?

# =========================================================
# REGISTRAR FINALIZAÇÃO
# =========================================================

{
    echo ""
    echo "========================================"
    echo "EXECUCAO MANUAL FINALIZADA"
    echo "========================================"
    echo "Fim: $(date '+%d/%m/%Y %H:%M:%S')"
    echo "Codigo de saida: $CODIGO"
    echo "========================================"
} >> "$LOG_FILE"

exit "$CODIGO"