import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// =========================================================
// CAMINHOS
// =========================================================

const arquivoAtual =
  fileURLToPath(
    import.meta.url
  );

const diretorioAtual =
  path.dirname(
    arquivoAtual
  );

const raizProjeto =
  path.resolve(
    diretorioAtual,
    '..'
  );

const pastaOut =
  path.join(
    raizProjeto,
    'out'
  );

const schedulePath =
  path.join(
    pastaOut,
    'schedule.json'
  );

// =========================================================
// CONFIGURAÇÃO PADRÃO
// =========================================================

const HORARIO_PADRAO = {
  hour: 2,
  minute: 0
};

// =========================================================
// VALIDAR HORÁRIO
// =========================================================

function horarioValido(
  hour,
  minute
) {

  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

// =========================================================
// GARANTIR PASTA OUT
// =========================================================

function garantirPasta() {

  if (
    !fs.existsSync(
      pastaOut
    )
  ) {

    fs.mkdirSync(
      pastaOut,
      {
        recursive: true
      }
    );
  }
}

// =========================================================
// SALVAR HORÁRIO
// =========================================================

export function salvarHorario(
  hour,
  minute
) {

  if (
    !horarioValido(
      hour,
      minute
    )
  ) {

    throw new Error(
      'Horário inválido.'
    );
  }

  garantirPasta();

  const dados = {
    hour,
    minute,
    updatedAt:
      new Date().toISOString()
  };

  fs.writeFileSync(
    schedulePath,
    JSON.stringify(
      dados,
      null,
      2
    ),
    'utf8'
  );

  return dados;
}

// =========================================================
// LER HORÁRIO
// =========================================================

export function lerHorario() {

  try {

    garantirPasta();

    if (
      !fs.existsSync(
        schedulePath
      )
    ) {

      return salvarHorario(
        HORARIO_PADRAO.hour,
        HORARIO_PADRAO.minute
      );
    }

    const dados =
      JSON.parse(
        fs.readFileSync(
          schedulePath,
          'utf8'
        )
      );

    const hour =
      Number(
        dados.hour
      );

    const minute =
      Number(
        dados.minute
      );

    if (
      !horarioValido(
        hour,
        minute
      )
    ) {

      return salvarHorario(
        HORARIO_PADRAO.hour,
        HORARIO_PADRAO.minute
      );
    }

    return {
      hour,
      minute,
      updatedAt:
        dados.updatedAt ??
        null
    };

  } catch {

    return {
      ...HORARIO_PADRAO,
      updatedAt: null
    };
  }
}

// =========================================================
// FORMATAR PARA O PAINEL
// =========================================================

export function formatarHorario() {

  const horario =
    lerHorario();

  return `${String(
    horario.hour
  ).padStart(
    2,
    '0'
  )}:${String(
    horario.minute
  ).padStart(
    2,
    '0'
  )}`;
}