import fs from 'node:fs';

import {
  CONFIG
} from './config.js';

// =========================================================
// CABEÇALHO
// =========================================================

const HEADER = [
  'dataHora',
  'index',
  'registro',
  'nome',
  'status',
  'tentativa',
  'buscaUtilizada',
  'tipoBula',
  'arquivo',
  'detalhe'
].join(';') + '\n';

// =========================================================
// LIMPAR TEXTO PARA CSV
// =========================================================

function clean(
  value
) {

  return String(
    value ?? ''
  )
    .replaceAll(
      ';',
      ','
    )
    .replaceAll(
      '\n',
      ' '
    )
    .replaceAll(
      '\r',
      ' '
    )
    .trim();
}

// =========================================================
// GARANTIR ARQUIVO
// =========================================================

function garantirArquivoResultados() {

  if (
    fs.existsSync(
      CONFIG.paths.results
    )
  ) {

    return;
  }

  fs.writeFileSync(
    CONFIG.paths.results,
    HEADER,
    'utf8'
  );
}

// =========================================================
// SALVAR RESULTADO
// =========================================================

export function saveResult(
  result
) {

  garantirArquivoResultados();

  const linha = [

    new Date().toISOString(),

    result.index ?? '',

    clean(
      result.registro
    ),

    clean(
      result.nome
    ),

    clean(
      result.status
    ),

    result.tentativa ?? '',

    clean(
      result.buscaUtilizada
    ),

    clean(
      result.tipoBula
    ),

    clean(
      result.arquivo
    ),

    clean(
      result.detalhe
    )

  ].join(';');

  fs.appendFileSync(
    CONFIG.paths.results,
    `${linha}\n`,
    'utf8'
  );
}