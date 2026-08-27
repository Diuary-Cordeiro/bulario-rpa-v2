import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import {
  spawn
} from 'node:child_process';

import {
  fileURLToPath
} from 'node:url';

import {
  lerHorario,
  salvarHorario,
  formatarHorario
} from '../src/scheduleConfig.js';

// =========================================================
// CAMINHOS PRINCIPAIS
// =========================================================

const arquivoAtual =
  fileURLToPath(
    import.meta.url
  );

const diretorioPainel =
  path.dirname(
    arquivoAtual
  );

const raizProjeto =
  path.resolve(
    diretorioPainel,
    '..'
  );

const pastaPublic =
  path.join(
    diretorioPainel,
    'public'
  );

// =========================================================
// SCRIPTS
// =========================================================

const scripts = {

  executar:
    path.join(
      raizProjeto,
      'scripts',
      'executar-agora.sh'
    ),

  pararExecucao:
    path.join(
      raizProjeto,
      'scripts',
      'parar-execucao.sh'
    ),

  iniciar:
    path.join(
      raizProjeto,
      'scripts',
      'iniciar-agendamento.sh'
    ),

  parar:
    path.join(
      raizProjeto,
      'scripts',
      'parar-agendamento.sh'
    ),

  status:
    path.join(
      raizProjeto,
      'scripts',
      'status-agendamento.sh'
    )

};

// =========================================================
// ARQUIVOS DE DADOS
// =========================================================

const progressPath =
  path.join(
    raizProjeto,
    'out',
    'progress.json'
  );

const statusPath =
  path.join(
    raizProjeto,
    'out',
    'status.json'
  );

const resultsPath =
  path.join(
    raizProjeto,
    'out',
    'results.csv'
  );

const schedulerLogPath =
  path.join(
    raizProjeto,
    'logs',
    'scheduler.log'
  );

// =========================================================
// CONFIGURAÇÃO
// =========================================================

const HOST =
  '127.0.0.1';

const PORT =
  3000;

const LIMITE_LOGS_PADRAO =
  500;

// =========================================================
// EXECUTAR SCRIPT
// =========================================================

function executarScript(
  script
) {

  return new Promise(
    (resolve, reject) => {

      const processo =
        spawn(
          script,
          [],
          {
            cwd:
              raizProjeto
          }
        );

      let saida = '';
      let erro = '';

      processo.stdout.on(
        'data',
        data => {

          saida +=
            data.toString();
        }
      );

      processo.stderr.on(
        'data',
        data => {

          erro +=
            data.toString();
        }
      );

      processo.on(
        'error',
        reject
      );

      processo.on(
        'close',
        codigo => {

          resolve({

            codigo,

            saida:
              saida.trim(),

            erro:
              erro.trim()

          });
        }
      );

    }
  );
}

// =========================================================
// LER CORPO JSON DA REQUISIÇÃO
// =========================================================

function lerBodyJson(
  req
) {

  return new Promise(
    (resolve, reject) => {

      let corpo = '';

      req.on(
        'data',
        chunk => {

          corpo +=
            chunk.toString();

          if (
            corpo.length >
            10000
          ) {

            reject(
              new Error(
                'Requisição muito grande.'
              )
            );

            req.destroy();
          }
        }
      );

      req.on(
        'end',
        () => {

          try {

            if (
              corpo.trim() === ''
            ) {

              resolve(
                {}
              );

              return;
            }

            resolve(
              JSON.parse(
                corpo
              )
            );

          } catch {

            reject(
              new Error(
                'JSON inválido.'
              )
            );
          }
        }
      );

      req.on(
        'error',
        reject
      );
    }
  );
}

// =========================================================
// LIMPAR LINHAS INTERNAS DOS SCRIPTS
// =========================================================

function limparMensagemScript(
  texto
) {

  return String(
    texto || ''
  )
    .split(/\r?\n/)
    .filter(
      linha =>
        !linha.startsWith(
          'RESULT='
        )
    )
    .join('\n')
    .trim();
}

// =========================================================
// LER RESULTADO INTERNO DO SCRIPT
// =========================================================

function lerResultadoScript(
  texto
) {

  const linhas =
    String(
      texto || ''
    )
      .split(/\r?\n/);

  for (
    const linha of linhas
  ) {

    if (
      linha.startsWith(
        'RESULT='
      )
    ) {

      return linha
        .slice(
          'RESULT='.length
        )
        .trim();
    }
  }

  return '';
}

// =========================================================
// LER JSON
// =========================================================

function lerJson(
  caminho,
  fallback = {}
) {

  try {

    if (
      !fs.existsSync(
        caminho
      )
    ) {

      return fallback;
    }

    const conteudo =
      fs.readFileSync(
        caminho,
        'utf8'
      );

    return JSON.parse(
      conteudo
    );

  } catch {

    return fallback;
  }
}

// =========================================================
// SALVAR JSON
// =========================================================

function salvarJson(
  caminho,
  dados
) {

  fs.writeFileSync(
    caminho,
    JSON.stringify(
      dados,
      null,
      2
    ),
    'utf8'
  );
}

// =========================================================
// LER PROGRESSO
// =========================================================

function lerProgresso() {

  return lerJson(
    progressPath,
    {
      nextIndex: null,
      updatedAt: null
    }
  );
}

// =========================================================
// LER STATUS DA EXECUÇÃO
// =========================================================

function lerStatusExecucao() {

  return lerJson(
    statusPath,
    {

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
        null

    }
  );
}

// =========================================================
// MARCAR EXECUÇÃO COMO INTERROMPIDA
// =========================================================

function marcarExecucaoInterrompida() {

  const agora =
    new Date()
      .toISOString();

  const atual =
    lerStatusExecucao();

  salvarJson(
    statusPath,
    {

      ...atual,

      execution:
        'IDLE',

      lastStatus:
        'EXECUCAO INTERROMPIDA',

      lastDetail:
        'Execução manual interrompida pelo operador.',

      finishedAt:
        agora,

      updatedAt:
        agora

    }
  );
}

// =========================================================
// LER STATUS DO SCHEDULER
// =========================================================

async function lerStatusScheduler() {

  const resultado =
    await executarScript(
      scripts.status
    );

  const linhas =
    resultado.saida
      .split('\n');

  const dados = {};

  for (
    const linha of linhas
  ) {

    const separador =
      linha.indexOf('=');

    if (
      separador === -1
    ) {

      continue;
    }

    const chave =
      linha
        .slice(
          0,
          separador
        )
        .trim();

    const valor =
      linha
        .slice(
          separador + 1
        )
        .trim();

    dados[chave] =
      valor;
  }

  return {

    scheduler:
      dados.STATUS ||
      'DESCONHECIDO',

    pid:
      dados.PID ||
      null

  };
}

// =========================================================
// LIMPAR BOM
// =========================================================

function limparBom(
  texto
) {

  return String(
    texto || ''
  ).replace(
    /^\uFEFF/,
    ''
  );
}

// =========================================================
// CONVERTER RESULTS.CSV
// =========================================================

function lerResultados() {

  if (
    !fs.existsSync(
      resultsPath
    )
  ) {

    return [];
  }

  const conteudo =
    limparBom(
      fs.readFileSync(
        resultsPath,
        'utf8'
      )
    );

  const linhas =
    conteudo
      .split(/\r?\n/)
      .filter(
        linha =>
          linha.trim() !== ''
      );

  if (
    linhas.length <= 1
  ) {

    return [];
  }

  const cabecalho =
    linhas[0]
      .split(';')
      .map(
        coluna =>
          coluna.trim()
      );

  const resultados = [];

  for (
    let indice = 1;
    indice < linhas.length;
    indice++
  ) {

    const valores =
      linhas[indice]
        .split(';');

    const registro = {};

    for (
      let coluna = 0;
      coluna < cabecalho.length;
      coluna++
    ) {

      registro[
        cabecalho[coluna]
      ] =
        (
          valores[coluna] ??
          ''
        ).trim();
    }

    resultados.push(
      registro
    );
  }

  return resultados;
}

// =========================================================
// DEFINIR SE É ERRO / PENDÊNCIA
// =========================================================

function ehRegistroProblema(
  registro
) {

  const status =
    String(
      registro.status ||
      ''
    ).trim();

  const statusSemProblema =
    new Set([
      'SUCCESS',
      'ALREADY_EXISTS'
    ]);

  return (
    status !== '' &&
    !statusSemProblema.has(
      status
    )
  );
}

// =========================================================
// CALCULAR ESTATÍSTICAS
// =========================================================

function calcularEstatisticas(
  resultados
) {

  const estatisticas = {

    total:
      resultados.length,

    success:
      0,

    alreadyExists:
      0,

    searchNotFound:
      0,

    noBulaAvailable:
      0,

    failedAfterRetries:
      0,

    error:
      0,

    outros:
      0

  };

  for (
    const item of resultados
  ) {

    switch (
      item.status
    ) {

      case 'SUCCESS':

        estatisticas.success++;

        break;

      case 'ALREADY_EXISTS':

        estatisticas.alreadyExists++;

        break;

      case 'SEARCH_NOT_FOUND':

        estatisticas.searchNotFound++;

        break;

      case 'NO_BULA_AVAILABLE':

        estatisticas.noBulaAvailable++;

        break;

      case 'FAILED_AFTER_RETRIES':

        estatisticas.failedAfterRetries++;

        break;

      case 'ERROR':

        estatisticas.error++;

        break;

      default:

        estatisticas.outros++;

        break;
    }
  }

  return estatisticas;
}

// =========================================================
// LER LOG DO SISTEMA
// =========================================================

function lerLogSistema(
  limite = 300
) {

  if (
    !fs.existsSync(
      schedulerLogPath
    )
  ) {

    return [];
  }

  const conteudo =
    fs.readFileSync(
      schedulerLogPath,
      'utf8'
    );

  const linhas =
    conteudo
      .split(/\r?\n/)
      .filter(
        linha =>
          linha.trim() !== ''
      );

  return linhas.slice(
    -limite
  );
}

// =========================================================
// NORMALIZAR LIMITE
// =========================================================

function obterLimite(
  valor
) {

  const numero =
    Number(
      valor
    );

  if (
    !Number.isInteger(numero) ||
    numero <= 0
  ) {

    return LIMITE_LOGS_PADRAO;
  }

  return Math.min(
    numero,
    5000
  );
}

// =========================================================
// RESPOSTA JSON
// =========================================================

function json(
  res,
  status,
  dados
) {

  res.writeHead(
    status,
    {

      'Content-Type':
        'application/json; charset=utf-8',

      'Cache-Control':
        'no-store'

    }
  );

  res.end(
    JSON.stringify(
      dados
    )
  );
}

// =========================================================
// SERVIR INDEX.HTML
// =========================================================

function servirPagina(
  res
) {

  const arquivo =
    path.join(
      pastaPublic,
      'index.html'
    );

  fs.readFile(
    arquivo,
    (erro, conteudo) => {

      if (erro) {

        res.writeHead(
          500,
          {
            'Content-Type':
              'text/plain; charset=utf-8'
          }
        );

        res.end(
          'Erro ao carregar painel.'
        );

        return;
      }

      res.writeHead(
        200,
        {
          'Content-Type':
            'text/html; charset=utf-8',

          'Cache-Control':
            'no-store'
        }
      );

      res.end(
        conteudo
      );
    }
  );
}

// =========================================================
// SERVIDOR
// =========================================================

const server =
  http.createServer(
    async (req, res) => {

      try {

        const url =
          new URL(
            req.url,
            `http://${HOST}:${PORT}`
          );

        const rota =
          url.pathname;

        // =================================================
        // PÁGINA PRINCIPAL
        // =================================================

        if (
          req.method === 'GET' &&
          rota === '/'
        ) {

          servirPagina(
            res
          );

          return;
        }

        // =================================================
        // STATUS GERAL
        // =================================================

        if (
          req.method === 'GET' &&
          rota === '/api/status'
        ) {

          const scheduler =
            await lerStatusScheduler();

          const progress =
            lerProgresso();

          const horario =
            lerHorario();

          json(
            res,
            200,
            {

              scheduler:
                scheduler.scheduler,

              pid:
                scheduler.pid,

              nextIndex:
                progress.nextIndex ??
                null,

              updatedAt:
                progress.updatedAt ??
                null,

              schedule:
                {

                  hour:
                    horario.hour,

                  minute:
                    horario.minute,

                  formatted:
                    formatarHorario()

                }

            }
          );

          return;
        }

        // =================================================
        // CONSULTAR HORÁRIO
        // =================================================

        if (
          req.method === 'GET' &&
          rota === '/api/horario'
        ) {

          const horario =
            lerHorario();

          json(
            res,
            200,
            {

              sucesso:
                true,

              hour:
                horario.hour,

              minute:
                horario.minute,

              horario:
                formatarHorario(),

              updatedAt:
                horario.updatedAt ??
                null

            }
          );

          return;
        }

        // =================================================
        // SALVAR HORÁRIO
        // =================================================

        if (
          req.method === 'POST' &&
          rota === '/api/horario'
        ) {

          const body =
            await lerBodyJson(
              req
            );

          const hour =
            Number(
              body.hour
            );

          const minute =
            Number(
              body.minute
            );

          if (
            !Number.isInteger(hour) ||
            !Number.isInteger(minute) ||
            hour < 0 ||
            hour > 23 ||
            minute < 0 ||
            minute > 59
          ) {

            json(
              res,
              400,
              {

                sucesso:
                  false,

                erro:
                  'Horário inválido. Informe uma hora entre 00:00 e 23:59.'

              }
            );

            return;
          }

          const horario =
            salvarHorario(
              hour,
              minute
            );

          json(
            res,
            200,
            {

              sucesso:
                true,

              mensagem:
                `Horário diário alterado para ${formatarHorario()}.`,

              hour:
                horario.hour,

              minute:
                horario.minute,

              horario:
                formatarHorario(),

              updatedAt:
                horario.updatedAt

            }
          );

          return;
        }

        // =================================================
        // ANDAMENTO
        // =================================================

        if (
          req.method === 'GET' &&
          rota === '/api/andamento'
        ) {

          const status =
            lerStatusExecucao();

          const progress =
            lerProgresso();

          let percentual = 0;

          if (
            Number(status.total) > 0
          ) {

            percentual =
              (
                Number(
                  status.processed
                ) /
                Number(
                  status.total
                )
              ) *
              100;
          }

          percentual =
            Math.max(
              0,
              Math.min(
                100,
                percentual
              )
            );

          json(
            res,
            200,
            {

              ...status,

              percentual:
                Number(
                  percentual.toFixed(
                    1
                  )
                ),

              nextIndex:
                progress.nextIndex ??
                null

            }
          );

          return;
        }

        // =================================================
        // LOGS
        // =================================================

        if (
          req.method === 'GET' &&
          rota === '/api/logs'
        ) {

          const limite =
            obterLimite(
              url.searchParams.get(
                'limit'
              )
            );

          const resultados =
            lerResultados();

          const ultimos =
            resultados.slice(
              -limite
            );

          json(
            res,
            200,
            {

              total:
                resultados.length,

              exibindo:
                ultimos.length,

              estatisticas:
                calcularEstatisticas(
                  resultados
                ),

              registros:
                ultimos
                  .slice()
                  .reverse()

            }
          );

          return;
        }

        // =================================================
        // ERROS
        // =================================================

        if (
          req.method === 'GET' &&
          rota === '/api/erros'
        ) {

          const limite =
            obterLimite(
              url.searchParams.get(
                'limit'
              )
            );

          const resultados =
            lerResultados();

          const erros =
            resultados.filter(
              ehRegistroProblema
            );

          const ultimos =
            erros.slice(
              -limite
            );

          json(
            res,
            200,
            {

              total:
                erros.length,

              exibindo:
                ultimos.length,

              registros:
                ultimos
                  .slice()
                  .reverse()

            }
          );

          return;
        }

        // =================================================
        // LOG SISTEMA
        // =================================================

        if (
          req.method === 'GET' &&
          rota === '/api/log-sistema'
        ) {

          const limite =
            obterLimite(
              url.searchParams.get(
                'limit'
              )
            );

          const linhas =
            lerLogSistema(
              limite
            );

          json(
            res,
            200,
            {

              total:
                linhas.length,

              linhas

            }
          );

          return;
        }

        // =================================================
        // INICIAR AGENDAMENTO
        // =================================================

        if (
          req.method === 'POST' &&
          rota === '/api/iniciar'
        ) {

          const resultado =
            await executarScript(
              scripts.iniciar
            );

          json(
            res,
            200,
            {

              sucesso:
                resultado.codigo === 0,

              mensagem:
                resultado.saida ||
                resultado.erro ||
                'Scheduler iniciado.'

            }
          );

          return;
        }

        // =================================================
        // PARAR AGENDAMENTO
        // =================================================

        if (
          req.method === 'POST' &&
          rota === '/api/parar'
        ) {

          const resultado =
            await executarScript(
              scripts.parar
            );

          json(
            res,
            200,
            {

              sucesso:
                resultado.codigo === 0,

              mensagem:
                resultado.saida ||
                resultado.erro ||
                'Scheduler parado.'

            }
          );

          return;
        }

        // =================================================
        // EXECUTAR AGORA
        // =================================================

        if (
          req.method === 'POST' &&
          rota === '/api/executar'
        ) {

          const statusAtual =
            lerStatusExecucao();

          if (
            statusAtual.execution ===
            'RUNNING'
          ) {

            json(
              res,
              409,
              {

                sucesso:
                  false,

                erro:
                  'Já existe uma execução do RPA em andamento.'

              }
            );

            return;
          }

          const processo =
            spawn(
              scripts.executar,
              [],
              {

                cwd:
                  raizProjeto,

                detached:
                  true,

                stdio:
                  'ignore'

              }
            );

          processo.unref();

          json(
            res,
            200,
            {

              sucesso:
                true,

              mensagem:
                'Execução manual iniciada em segundo plano.'

            }
          );

          return;
        }

        // =================================================
        // PARAR EXECUÇÃO MANUAL
        // =================================================

        if (
          req.method === 'POST' &&
          rota === '/api/parar-execucao'
        ) {

          const resultado =
            await executarScript(
              scripts.pararExecucao
            );

          const resultadoInterno =
            lerResultadoScript(
              resultado.saida
            );

          if (
            resultadoInterno ===
            'STOPPED'
          ) {

            marcarExecucaoInterrompida();
          }

          const mensagem =
            limparMensagemScript(
              resultado.saida
            ) ||
            resultado.erro ||
            'Comando de parada executado.';

          json(
            res,
            resultado.codigo === 0
              ? 200
              : 500,
            {

              sucesso:
                resultado.codigo === 0,

              resultado:
                resultadoInterno,

              mensagem

            }
          );

          return;
        }

        // =================================================
        // ROTA NÃO ENCONTRADA
        // =================================================

        json(
          res,
          404,
          {

            erro:
              'Rota não encontrada.'

          }
        );

      } catch (error) {

        json(
          res,
          500,
          {

            sucesso:
              false,

            erro:
              error.message

          }
        );
      }
    }
  );

// =========================================================
// INICIAR SERVIDOR
// =========================================================

server.listen(
  PORT,
  HOST,
  () => {

    console.log('');
    console.log('========================================');
    console.log('PAINEL BULARIO RPA V2');
    console.log('========================================');

    console.log(
      `Painel disponível em http://${HOST}:${PORT}`
    );

    console.log(
      'Acesso permitido somente pela máquina local.'
    );

    console.log('');
    console.log(
      'APIs disponíveis:'
    );

    console.log(
      'GET  /api/status'
    );

    console.log(
      'GET  /api/horario'
    );

    console.log(
      'POST /api/horario'
    );

    console.log(
      'GET  /api/andamento'
    );

    console.log(
      'GET  /api/logs'
    );

    console.log(
      'GET  /api/erros'
    );

    console.log(
      'GET  /api/log-sistema'
    );

    console.log(
      'POST /api/executar'
    );

    console.log(
      'POST /api/parar-execucao'
    );

    console.log(
      'POST /api/iniciar'
    );

    console.log(
      'POST /api/parar'
    );
  }
);