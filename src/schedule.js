import {
  spawn
} from 'node:child_process';

import {
  fileURLToPath
} from 'node:url';

import path from 'node:path';

import {
  lerHorario,
  formatarHorario
} from './scheduleConfig.js';

import {
  resetStatus
} from './status.js';

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

const caminhoIndex =
  path.join(
    diretorioAtual,
    'index.js'
  );

const XVFB_RUN =
  '/usr/bin/xvfb-run';

// =========================================================
// ESTADO DO SCHEDULER
// =========================================================

let execucaoEmAndamento =
  false;

let processoRpa =
  null;

let ultimaDataExecutada =
  null;

let encerrandoScheduler =
  false;

// =========================================================
// FORMATAR DATA ATUAL
// =========================================================

function formatarDataHoje() {

  const agora =
    new Date();

  const ano =
    agora.getFullYear();

  const mes =
    String(
      agora.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const dia =
    String(
      agora.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${ano}-${mes}-${dia}`;
}

// =========================================================
// LIMPAR STATUS DO PAINEL
// =========================================================

function limparStatusPainel() {

  try {

    resetStatus();

    console.log(
      'Status do painel redefinido para AGUARDANDO.'
    );

  } catch (error) {

    console.error(
      'Erro ao redefinir status do painel:',
      error
    );
  }
}

// =========================================================
// EXECUTAR RPA
// =========================================================

function executarRpa() {

  if (
    execucaoEmAndamento
  ) {

    console.log(
      'Execução ignorada: RPA já está em andamento.'
    );

    return;
  }

  execucaoEmAndamento =
    true;

  const dataExecucao =
    formatarDataHoje();

  console.log('');
  console.log('========================================');
  console.log('INICIANDO EXECUÇÃO AGENDADA');
  console.log('========================================');

  console.log(
    'Data:',
    dataExecucao
  );

  console.log(
    'Arquivo:',
    caminhoIndex
  );

  console.log(
    'Xvfb:',
    XVFB_RUN
  );

  // =======================================================
  // EXECUTAR COM XVFB
  // =======================================================

  processoRpa =
    spawn(
      XVFB_RUN,
      [
        '-a',
        '-s',
        '-screen 0 1920x1080x24',
        process.execPath,
        caminhoIndex
      ],
      {
        stdio:
          'inherit',

        cwd:
          raizProjeto
      }
    );

  // =======================================================
  // ERRO AO INICIAR
  // =======================================================

  processoRpa.on(
    'error',
    error => {

      console.error(
        'Erro ao iniciar o RPA:',
        error
      );

      execucaoEmAndamento =
        false;

      processoRpa =
        null;

      limparStatusPainel();
    }
  );

  // =======================================================
  // FINALIZAÇÃO
  // =======================================================

  processoRpa.on(
    'close',
    (
      codigo,
      sinal
    ) => {

      console.log('');
      console.log('========================================');
      console.log('EXECUÇÃO AGENDADA FINALIZADA');
      console.log('========================================');

      console.log(
        'Código de saída:',
        codigo
      );

      console.log(
        'Sinal:',
        sinal ||
        '-'
      );

      execucaoEmAndamento =
        false;

      processoRpa =
        null;

      ultimaDataExecutada =
        dataExecucao;

      // ===================================================
      // SE FOI INTERROMPIDA OU TERMINOU COM ERRO
      // ===================================================

      if (
        encerrandoScheduler ||
        sinal ||
        codigo !== 0
      ) {

        limparStatusPainel();
      }
    }
  );
}

// =========================================================
// VERIFICAR HORÁRIO
// =========================================================

function verificarHorario() {

  const agora =
    new Date();

  const horaAtual =
    agora.getHours();

  const minutoAtual =
    agora.getMinutes();

  const dataHoje =
    formatarDataHoje();

  // =======================================================
  // HORÁRIO É LIDO DO schedule.json
  // =======================================================

  const horario =
    lerHorario();

  const horarioCorreto =
    horaAtual ===
      horario.hour &&
    minutoAtual ===
      horario.minute;

  const aindaNaoExecutouHoje =
    ultimaDataExecutada !==
      dataHoje;

  if (
    horarioCorreto &&
    aindaNaoExecutouHoje &&
    !execucaoEmAndamento
  ) {

    executarRpa();
  }
}

// =========================================================
// ENCERRAR SCHEDULER COM SEGURANÇA
// =========================================================

function encerrarScheduler(
  sinal
) {

  if (
    encerrandoScheduler
  ) {

    return;
  }

  encerrandoScheduler =
    true;

  console.log('');
  console.log('========================================');
  console.log('ENCERRANDO SCHEDULER');
  console.log('========================================');

  console.log(
    'Sinal recebido:',
    sinal
  );

  // =======================================================
  // SE EXISTE RPA AGENDADO ATIVO
  // =======================================================

  if (
    processoRpa &&
    !processoRpa.killed
  ) {

    console.log(
      'Encerrando execução agendada em andamento...'
    );

    try {

      processoRpa.kill(
        'SIGTERM'
      );

    } catch (error) {

      console.error(
        'Erro ao encerrar processo do RPA:',
        error
      );
    }
  }

  limparStatusPainel();

  setTimeout(
    () => {

      process.exit(
        0
      );

    },
    500
  );
}

// =========================================================
// SINAIS DO SYSTEMD / TERMINAL
// =========================================================

process.on(
  'SIGTERM',
  () => {

    encerrarScheduler(
      'SIGTERM'
    );
  }
);

process.on(
  'SIGINT',
  () => {

    encerrarScheduler(
      'SIGINT'
    );
  }
);

// =========================================================
// INÍCIO
// =========================================================

console.log('');
console.log('========================================');
console.log('BULARIO RPA V2');
console.log('SCHEDULER');
console.log('========================================');

console.log(
  'Horário configurado:',
  formatarHorario()
);

console.log(
  'Scheduler iniciado.'
);

console.log(
  'Execução agendada utilizará Xvfb.'
);

console.log(
  'Horário lido de out/schedule.json.'
);

console.log(
  'Aguardando horário programado...'
);

// =========================================================
// PRIMEIRA VERIFICAÇÃO
// =========================================================

verificarHorario();

// =========================================================
// VERIFICAR A CADA 30 SEGUNDOS
// =========================================================

setInterval(
  verificarHorario,
  30000
);