import fs from 'node:fs';

import {
  CONFIG
} from './config.js';

// =========================================================
// CAMINHO DO STATUS
// =========================================================

const STATUS_PATH =
  new URL(
    '../out/status.json',
    import.meta.url
  );

// =========================================================
// ESTADO PADRÃO
// =========================================================

const STATUS_INICIAL = {

  execution:
    'IDLE',

  startIndex:
    null,

  endIndex:
    null,

  currentIndex:
    null,

  processed:
    0,

  total:
    0,

  medicine:
    '',

  registro:
    '',

  attempt:
    0,

  search:
    '',

  bula:
    '',

  success:
    0,

  alreadyExists:
    0,

  searchNotFound:
    0,

  noBulaAvailable:
    0,

  failed:
    0,

  fallbackRegistro:
    0,

  fallbackPaciente:
    0,

  lastStatus:
    '',

  lastDetail:
    '',

  startedAt:
    null,

  finishedAt:
    null,

  updatedAt:
    new Date().toISOString()
};

// =========================================================
// GRAVAR STATUS
// =========================================================

export function saveStatus(
  dados
) {

  const status = {

    ...STATUS_INICIAL,
    ...dados,

    updatedAt:
      new Date().toISOString()

  };

  fs.writeFileSync(
    STATUS_PATH,
    JSON.stringify(
      status,
      null,
      2
    ),
    'utf8'
  );
}

// =========================================================
// LER STATUS
// =========================================================

export function loadStatus() {

  try {

    if (
      !fs.existsSync(
        STATUS_PATH
      )
    ) {

      return {
        ...STATUS_INICIAL
      };
    }

    return JSON.parse(
      fs.readFileSync(
        STATUS_PATH,
        'utf8'
      )
    );

  } catch {

    return {
      ...STATUS_INICIAL
    };
  }
}

// =========================================================
// ATUALIZAR PARCIALMENTE
// =========================================================

export function updateStatus(
  alteracoes
) {

  const atual =
    loadStatus();

  saveStatus({

    ...atual,
    ...alteracoes

  });
}

// =========================================================
// RESETAR PARA IDLE
// =========================================================

export function resetStatus() {

  saveStatus({

    ...STATUS_INICIAL,

    execution:
      'IDLE',

    finishedAt:
      new Date().toISOString()

  });
}