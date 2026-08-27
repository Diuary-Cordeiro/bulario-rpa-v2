import { CONFIG } from './config.js';

import {
  loadMedicamentos
} from './medicamentos.js';

import {
  loadProgress,
  saveProgress
} from './progress.js';

import {
  saveResult
} from './results.js';

import {
  processarMedicamento
} from './processarMedicamento.js';

import {
  openBrowser,
  closeBrowser
} from './browser.js';

import {
  pausaEntreMedicamentos,
  pausaErroTemporario
} from './timing.js';

import {
  saveStatus,
  updateStatus
} from './status.js';

// =========================================================
// BULARIO RPA V2
// ORQUESTRADOR DE PRODUÇÃO
// =========================================================

const MAX_TENTATIVAS = 3;

// =========================================================
// STATUS DEFINITIVOS
// =========================================================

const STATUS_DEFINITIVOS = new Set([
  'SUCCESS',
  'ALREADY_EXISTS',
  'NO_BULA_AVAILABLE',
  'SEARCH_NOT_FOUND',
  'INVALID_INPUT'
]);

// =========================================================
// STATUS DE RETRY
// =========================================================

const STATUS_RETRY = new Set([
  'ERROR',
  'RESULT_NOT_FOUND',
  'PRODUCT_DATA_ERROR',
  'EMPTY_DOWNLOAD',
  'INVALID_PDF_RESPONSE',
  'INVALID_SAVED_PDF',
  'UNEXPECTED_RESULT_STRUCTURE'
]);

// =========================================================
// RESUMO DO LOTE
// =========================================================

const resumo = {

  SUCCESS: 0,

  ALREADY_EXISTS: 0,

  SEARCH_NOT_FOUND: 0,

  NO_BULA_AVAILABLE: 0,

  INVALID_INPUT: 0,

  FAILED_AFTER_RETRIES: 0,

  OUTROS: 0,

  fallbackPaciente: 0

};

// =========================================================
// RETRY
// =========================================================

function deveTentarNovamente(
  status,
  tentativaAtual
) {

  if (
    tentativaAtual >=
    MAX_TENTATIVAS
  ) {

    return false;
  }

  return STATUS_RETRY.has(
    status
  );
}

// =========================================================
// CONTABILIZAR RESULTADO
// =========================================================

function contabilizarResultado(
  resultado
) {

  if (
    Object.prototype.hasOwnProperty.call(
      resumo,
      resultado.status
    )
  ) {

    resumo[
      resultado.status
    ]++;

  } else {

    resumo.OUTROS++;
  }

  if (
    resultado.tipoBula ===
    'PACIENTE'
  ) {

    resumo.fallbackPaciente++;
  }
}

// =========================================================
// ATUALIZAR CONTADORES NO STATUS.JSON
// =========================================================

function atualizarResumoStatus() {

  updateStatus({

    success:
      resumo.SUCCESS,

    alreadyExists:
      resumo.ALREADY_EXISTS,

    searchNotFound:
      resumo.SEARCH_NOT_FOUND,

    noBulaAvailable:
      resumo.NO_BULA_AVAILABLE,

    failed:
      resumo.FAILED_AFTER_RETRIES,

    fallbackPaciente:
      resumo.fallbackPaciente

  });
}

// =========================================================
// NAVEGADOR
// =========================================================

let browser = null;
let page = null;

// =========================================================
// VERIFICAR SE A SESSÃO DO NAVEGADOR ESTÁ ATIVA
// =========================================================

function sessaoNavegadorAtiva() {

  try {

    return Boolean(
      browser &&
      browser.isConnected() &&
      page &&
      !page.isClosed()
    );

  } catch {

    return false;
  }
}

// =========================================================
// RECRIAR SESSÃO DO NAVEGADOR
// =========================================================

async function recriarSessaoNavegador() {

  console.log('');
  console.log('========================================');
  console.log('RECRIANDO SESSÃO DO NAVEGADOR');
  console.log('========================================');

  if (browser) {

    try {

      await closeBrowser(
        browser
      );

    } catch (error) {

      console.log(
        'Aviso ao fechar navegador anterior:',
        error?.message || error
      );
    }
  }

  browser = null;
  page = null;

  console.log(
    'Abrindo nova instância do Chromium...'
  );

  browser =
    await openBrowser();

  page =
    await browser.newPage();

  console.log(
    'Nova sessão do Chromium criada com sucesso.'
  );
}

// =========================================================
// GARANTIR SESSÃO VÁLIDA ANTES DA TENTATIVA
// =========================================================

async function garantirSessaoNavegador() {

  if (
    sessaoNavegadorAtiva()
  ) {

    return true;
  }

  console.log(
    'Sessão do navegador indisponível. Tentando recriar...'
  );

  try {

    await recriarSessaoNavegador();

    return true;

  } catch (error) {

    console.error(
      'Não foi possível recriar a sessão do navegador:',
      error
    );

    browser = null;
    page = null;

    return false;
  }
}

// =========================================================
// EXECUÇÃO
// =========================================================

try {

  console.log('');
  console.log('========================================');
  console.log('BULARIO RPA V2');
  console.log('ORQUESTRADOR - PRODUÇÃO');
  console.log('========================================');

  // =======================================================
  // CARREGAR BASE
  // =======================================================

  const medicamentos =
    loadMedicamentos();

  console.log(
    `Medicamentos carregados: ${medicamentos.length}`
  );

  // =======================================================
  // CARREGAR PROGRESSO
  // =======================================================

  const indiceInicial =
    loadProgress();

  console.log(
    `Índice inicial: ${indiceInicial}`
  );

  // =======================================================
  // VERIFICAR FIM DA BASE
  // =======================================================

  if (
    indiceInicial >=
    medicamentos.length
  ) {

    console.log('');
    console.log('========================================');
    console.log('BASE CONCLUÍDA');
    console.log('========================================');

    saveStatus({

      execution:
        'FINISHED',

      startIndex:
        indiceInicial,

      endIndex:
        indiceInicial,

      currentIndex:
        indiceInicial,

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
        'BASE_FINISHED',

      lastDetail:
        'Todos os medicamentos da base já foram percorridos.',

      startedAt:
        null,

      finishedAt:
        new Date().toISOString()

    });

    process.exitCode = 0;

  } else {

    // =====================================================
    // DEFINIR LOTE
    // =====================================================

    const indiceFinal =
      Math.min(
        indiceInicial +
          CONFIG.batchSize -
          1,

        medicamentos.length -
          1
      );

    const quantidade =
      indiceFinal -
      indiceInicial +
      1;

    // =====================================================
    // INICIALIZAR STATUS DO LOTE
    // =====================================================

    saveStatus({

      execution:
        'RUNNING',

      startIndex:
        indiceInicial,

      endIndex:
        indiceFinal,

      currentIndex:
        indiceInicial,

      processed:
        0,

      total:
        quantidade,

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
        'STARTING',

      lastDetail:
        'Lote iniciado.',

      startedAt:
        new Date().toISOString(),

      finishedAt:
        null

    });

    console.log('');
    console.log('========================================');
    console.log('LOTE SELECIONADO');
    console.log('========================================');

    console.log(
      `Início: ${indiceInicial}`
    );

    console.log(
      `Fim: ${indiceFinal}`
    );

    console.log(
      `Quantidade: ${quantidade}`
    );

    // =====================================================
    // ABRIR CHROMIUM
    // =====================================================

    console.log('');
    console.log(
      'Abrindo Chromium para o lote...'
    );

    await recriarSessaoNavegador();

    console.log(
      'Chromium aberto.'
    );

    // =====================================================
    // LOOP PRINCIPAL
    // =====================================================

    for (
      let indice = indiceInicial;
      indice <= indiceFinal;
      indice++
    ) {

      const medicamento =
        medicamentos[indice];

      const processadosAntes =
        indice -
        indiceInicial;

      // ===================================================
      // ATUALIZAR ITEM ATUAL
      // ===================================================

      updateStatus({

        execution:
          'RUNNING',

        currentIndex:
          indice,

        processed:
          processadosAntes,

        total:
          quantidade,

        medicine:
          medicamento.NOME_PRODUTO,

        registro:
          medicamento.NUMERO_REGISTRO_PRODUTO,

        attempt:
          0,

        search:
          '',

        bula:
          '',

        lastStatus:
          'PROCESSING',

        lastDetail:
          'Processando medicamento.'

      });

      console.log('');
      console.log('========================================');

      console.log(
        `ITEM ${indice} DO LOTE`
      );

      console.log('========================================');

      console.log(
        `[${indice}] ` +
        `${medicamento.NOME_PRODUTO} | ` +
        `registro=${medicamento.NUMERO_REGISTRO_PRODUTO}`
      );

      let resultadoFinal = null;

      let tentativa = 1;

      // ===================================================
      // LOOP DE TENTATIVAS
      // ===================================================

      while (
        tentativa <=
        MAX_TENTATIVAS
      ) {

        // =================================================
        // ATUALIZAR TENTATIVA NO STATUS
        // =================================================

        updateStatus({

          attempt:
            tentativa,

          lastStatus:
            'ATTEMPT',

          lastDetail:
            `Tentativa ${tentativa} de ${MAX_TENTATIVAS}.`

        });

        console.log('');
        console.log('----------------------------------------');

        console.log(
          `TENTATIVA ${tentativa}/${MAX_TENTATIVAS}`
        );

        console.log('----------------------------------------');

        let resultado;

        // =================================================
        // GARANTIR QUE O NAVEGADOR ESTÁ VIVO
        // =================================================

        const navegadorDisponivel =
          await garantirSessaoNavegador();

        if (
          !navegadorDisponivel
        ) {

          resultado = {

            status:
              'ERROR',

            buscaUtilizada:
              'REGISTRO',

            detalhe:
              'Não foi possível iniciar ou recuperar o navegador para realizar a consulta à ANVISA.'
          };

        } else {

          // ===============================================
          // PROCESSAR MEDICAMENTO
          // ===============================================

          try {

            resultado =
              await processarMedicamento(
                page,
                medicamento
              );

          } catch (error) {

            resultado = {

              status:
                'ERROR',

              buscaUtilizada:
                'REGISTRO',

              detalhe:
                error?.message ||
                'Falha inesperada durante o processamento do medicamento.'
            };
          }
        }

        // =================================================
        // GARANTIR RESULTADO VÁLIDO
        // =================================================

        if (
          !resultado ||
          !resultado.status
        ) {

          resultado = {

            status:
              'ERROR',

            buscaUtilizada:
              'REGISTRO',

            detalhe:
              'O processamento do medicamento retornou um resultado inválido.'
          };
        }

        // =================================================
        // STATUS DA TENTATIVA
        // =================================================

        updateStatus({

          search:
            resultado.buscaUtilizada ||
            '',

          bula:
            resultado.tipoBula ||
            '',

          lastStatus:
            resultado.status,

          lastDetail:
            resultado.detalhe ||
            ''

        });

        // =================================================
        // SALVAR RESULTS.CSV
        // =================================================

        saveResult({

          index:
            indice,

          registro:
            medicamento
              .NUMERO_REGISTRO_PRODUTO,

          nome:
            medicamento
              .NOME_PRODUTO,

          status:
            resultado.status,

          tentativa,

          buscaUtilizada:
            resultado.buscaUtilizada ||
            '',

          tipoBula:
            resultado.tipoBula ||
            '',

          arquivo:
            resultado.arquivo ||
            '',

          detalhe:
            resultado.detalhe ||
            ''
        });

        console.log(
          `[${indice}] Tentativa ${tentativa}: ${resultado.status}`
        );

        // =================================================
        // RESULTADO DEFINITIVO
        // =================================================

        if (
          STATUS_DEFINITIVOS.has(
            resultado.status
          )
        ) {

          resultadoFinal =
            resultado;

          break;
        }

        // =================================================
        // STATUS NÃO MAPEADO PARA RETRY
        // =================================================

        if (
          !STATUS_RETRY.has(
            resultado.status
          )
        ) {

          resultadoFinal =
            resultado;

          break;
        }

        // =================================================
        // RETRY
        // =================================================

        if (
          deveTentarNovamente(
            resultado.status,
            tentativa
          )
        ) {

          updateStatus({

            lastStatus:
              'WAITING_RETRY',

            lastDetail:
              `Falha temporária. Aguardando nova tentativa ${tentativa + 1}.`

          });

          console.log('');
          console.log(
            `Falha temporária na tentativa ${tentativa}.`
          );

          console.log(
            `Será realizada a tentativa ${tentativa + 1}.`
          );

          // ===============================================
          // PAUSA ANTES DO RETRY
          // ===============================================

          await pausaErroTemporario();

          // ===============================================
          // RECRIAR NAVEGADOR ANTES DA NOVA TENTATIVA
          // ===============================================

          console.log('');
          console.log(
            'Preparando uma sessão limpa do navegador para a próxima tentativa...'
          );

          try {

            await recriarSessaoNavegador();

          } catch (error) {

            console.error(
              'Falha ao recriar o navegador antes da nova tentativa:',
              error
            );

            browser = null;
            page = null;
          }

          tentativa++;

          continue;
        }

        // =================================================
        // ESGOTOU RETRIES
        // =================================================

        resultadoFinal = {

          ...resultado,

          status:
            'FAILED_AFTER_RETRIES',

          statusOriginal:
            resultado.status,

          detalhe:
            resultado.detalhe
              ? (
                  `Falhou após ${MAX_TENTATIVAS} tentativas. ` +
                  `Último status: ${resultado.status}. ` +
                  `Motivo: ${resultado.detalhe}`
                )
              : (
                  `Falhou após ${MAX_TENTATIVAS} tentativas. ` +
                  `Último status: ${resultado.status}.`
                )

        };

        saveResult({

          index:
            indice,

          registro:
            medicamento
              .NUMERO_REGISTRO_PRODUTO,

          nome:
            medicamento
              .NOME_PRODUTO,

          status:
            resultadoFinal.status,

          tentativa,

          buscaUtilizada:
            resultado.buscaUtilizada ||
            '',

          tipoBula:
            resultado.tipoBula ||
            '',

          arquivo:
            resultado.arquivo ||
            '',

          detalhe:
            resultadoFinal.detalhe

        });

        break;
      }

      // ===================================================
      // GARANTIA DE RESULTADO FINAL
      // ===================================================

      if (!resultadoFinal) {

        resultadoFinal = {

          status:
            'FAILED_AFTER_RETRIES',

          buscaUtilizada:
            'REGISTRO',

          detalhe:
            'O processamento terminou sem um resultado final definido.'

        };
      }

      // ===================================================
      // CONTABILIZAR RESULTADO
      // ===================================================

      contabilizarResultado(
        resultadoFinal
      );

      atualizarResumoStatus();

      // ===================================================
      // STATUS FINAL DO ITEM
      // ===================================================

      updateStatus({

        search:
          resultadoFinal.buscaUtilizada ||
          '',

        bula:
          resultadoFinal.tipoBula ||
          '',

        lastStatus:
          resultadoFinal.status,

        lastDetail:
          resultadoFinal.detalhe ||
          ''

      });

      // ===================================================
      // SALVAR PRÓXIMO ÍNDICE
      // ===================================================

      const proximoIndice =
        indice + 1;

      saveProgress(
        proximoIndice
      );

      const processadosAgora =
        indice -
        indiceInicial +
        1;

      updateStatus({

        processed:
          processadosAgora

      });

      console.log(
        `[${indice}] Item encerrado. Próximo índice: ${proximoIndice}`
      );

      // ===================================================
      // PAUSA ENTRE MEDICAMENTOS
      // ===================================================

      const existeProximo =
        indice < indiceFinal;

      if (
        existeProximo
      ) {

        updateStatus({

          lastStatus:
            'WAITING_NEXT',

          lastDetail:
            'Aguardando próximo medicamento.'

        });

        await pausaEntreMedicamentos();
      }
    }

    // =====================================================
    // FINALIZAR STATUS DO LOTE
    // =====================================================

    updateStatus({

      execution:
        'FINISHED',

      currentIndex:
        indiceFinal,

      processed:
        quantidade,

      attempt:
        0,

      lastStatus:
        'LOT_FINISHED',

      lastDetail:
        `Lote ${indiceInicial}-${indiceFinal} concluído.`,

      finishedAt:
        new Date().toISOString()

    });

    console.log('');
    console.log('========================================');
    console.log('LOTE CONCLUÍDO');
    console.log('========================================');

    console.log(
      `SUCCESS: ${resumo.SUCCESS}`
    );

    console.log(
      `ALREADY_EXISTS: ${resumo.ALREADY_EXISTS}`
    );

    console.log(
      `SEARCH_NOT_FOUND: ${resumo.SEARCH_NOT_FOUND}`
    );

    console.log(
      `NO_BULA_AVAILABLE: ${resumo.NO_BULA_AVAILABLE}`
    );

    console.log(
      `INVALID_INPUT: ${resumo.INVALID_INPUT}`
    );

    console.log(
      `FAILED_AFTER_RETRIES: ${resumo.FAILED_AFTER_RETRIES}`
    );

    console.log(
      `OUTROS: ${resumo.OUTROS}`
    );

    console.log(
      `Fallback PACIENTE: ${resumo.fallbackPaciente}`
    );

    console.log(
      `Próximo índice: ${indiceFinal + 1}`
    );
  }

} catch (error) {

  console.error('');
  console.error('========================================');
  console.error('ERRO GERAL DO ORQUESTRADOR');
  console.error('========================================');

  console.error(
    error
  );

  // =======================================================
  // REGISTRAR ERRO GERAL NO STATUS.JSON
  // =======================================================

  try {

    updateStatus({

      execution:
        'ERROR',

      lastStatus:
        'ORCHESTRATOR_ERROR',

      lastDetail:
        error?.message ||
        'Ocorreu um erro geral durante a execução do RPA.',

      finishedAt:
        new Date().toISOString()

    });

  } catch {
    // Evita mascarar o erro principal.
  }

  process.exitCode = 1;

} finally {

  // =======================================================
  // FECHAR NAVEGADOR
  // =======================================================

  if (browser) {

    console.log('');
    console.log(
      'Fechando Chromium...'
    );

    try {

      await closeBrowser(
        browser
      );

    } catch (error) {

      console.log(
        'Aviso ao fechar Chromium:',
        error?.message || error
      );
    }

    browser = null;
    page = null;

    console.log(
      'Chromium fechado.'
    );
  }
}