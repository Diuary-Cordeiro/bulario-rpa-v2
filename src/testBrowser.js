// =========================================================
// BULARIO RPA V2
// TESTE CONTROLADO DO ORQUESTRADOR
// =========================================================
//
// OBJETIVO:
//
// Validar que:
//
// ITEM 1
// → falha 3 vezes
// → FAILED_AFTER_RETRIES
//
// ITEM 2
// → é processado normalmente
// → SUCCESS
//
// IMPORTANTE:
//
// - NÃO acessa a ANVISA
// - NÃO abre Chromium
// - NÃO altera progress.json
// - NÃO altera results.csv
// - NÃO baixa PDFs
//
// =========================================================

// =========================================================
// CONFIGURAÇÃO
// =========================================================

const MAX_TENTATIVAS = 3;

const PAUSA_TESTE_MS = 1500;

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
// MEDICAMENTOS SIMULADOS
// =========================================================

const MEDICAMENTOS_TESTE = [

  {
    index: 999001,

    NOME_PRODUTO:
      'MEDICAMENTO_TESTE_FALHA',

    NUMERO_REGISTRO_PRODUTO:
      'TESTE001',

    comportamento:
      'FALHAR'
  },

  {
    index: 999002,

    NOME_PRODUTO:
      'MEDICAMENTO_TESTE_SUCESSO',

    NUMERO_REGISTRO_PRODUTO:
      'TESTE002',

    comportamento:
      'SUCESSO'
  }
];

// =========================================================
// PAUSA
// =========================================================

function esperar(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}

// =========================================================
// DECIDIR RETRY
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
// PROCESSAMENTO SIMULADO
// =========================================================

async function processarMedicamentoSimulado(
  medicamento,
  tentativa
) {

  await esperar(
    400
  );

  // =======================================================
  // MEDICAMENTO QUE SEMPRE FALHA
  // =======================================================

  if (
    medicamento.comportamento ===
    'FALHAR'
  ) {

    return {

      status:
        'ERROR',

      detalhe:
        (
          'Falha proposital para testar ' +
          `continuidade do lote. Tentativa ${tentativa}.`
        )
    };
  }

  // =======================================================
  // MEDICAMENTO QUE TEM SUCESSO
  // =======================================================

  if (
    medicamento.comportamento ===
    'SUCESSO'
  ) {

    return {

      status:
        'SUCCESS',

      buscaUtilizada:
        'SIMULADA',

      tipoBula:
        'PROFISSIONAL',

      arquivo:
        'ARQUIVO_TESTE_SIMULADO.pdf',

      detalhe:
        ''
    };
  }

  return {

    status:
      'ERROR',

    detalhe:
      'Comportamento de teste desconhecido.'
  };
}

// =========================================================
// EXECUÇÃO
// =========================================================

try {

  console.log('');
  console.log('========================================');
  console.log('BULARIO RPA V2');
  console.log('TESTE DE CONTINUIDADE DO LOTE');
  console.log('========================================');

  console.log('');
  console.log(
    'Este teste NÃO acessa a ANVISA.'
  );

  console.log(
    'Este teste NÃO altera progress.json.'
  );

  console.log(
    'Este teste NÃO altera results.csv.'
  );

  console.log('');

  const resultadosFinais = [];

  let progressoSimulado = 999001;

  // =======================================================
  // LOOP DO LOTE SIMULADO
  // =======================================================

  for (
    const medicamento of
    MEDICAMENTOS_TESTE
  ) {

    const indice =
      medicamento.index;

    console.log('');
    console.log('========================================');

    console.log(
      `ITEM SIMULADO ${indice}`
    );

    console.log('========================================');

    console.log(
      'Medicamento:',
      medicamento.NOME_PRODUTO
    );

    console.log(
      'Registro:',
      medicamento.NUMERO_REGISTRO_PRODUTO
    );

    let tentativa = 1;

    let resultadoFinal = null;

    // =====================================================
    // LOOP DE TENTATIVAS
    // =====================================================

    while (
      tentativa <=
      MAX_TENTATIVAS
    ) {

      console.log('');
      console.log('----------------------------------------');

      console.log(
        `TENTATIVA ${tentativa}/${MAX_TENTATIVAS}`
      );

      console.log('----------------------------------------');

      let resultado;

      try {

        resultado =
          await processarMedicamentoSimulado(
            medicamento,
            tentativa
          );

      } catch (error) {

        resultado = {

          status:
            'ERROR',

          detalhe:
            error.message
        };
      }

      // ===================================================
      // GARANTIA DE RESULTADO
      // ===================================================

      if (
        !resultado ||
        !resultado.status
      ) {

        resultado = {

          status:
            'ERROR',

          detalhe:
            'Processamento simulado retornou resultado inválido.'
        };
      }

      console.log(
        'Status:',
        resultado.status
      );

      if (
        resultado.detalhe
      ) {

        console.log(
          'Detalhe:',
          resultado.detalhe
        );
      }

      // ===================================================
      // STATUS DEFINITIVO
      // ===================================================

      if (
        STATUS_DEFINITIVOS.has(
          resultado.status
        )
      ) {

        resultadoFinal =
          resultado;

        break;
      }

      // ===================================================
      // STATUS NÃO CLASSIFICADO
      // ===================================================

      if (
        !STATUS_RETRY.has(
          resultado.status
        )
      ) {

        resultadoFinal =
          resultado;

        break;
      }

      // ===================================================
      // RETRY
      // ===================================================

      if (
        deveTentarNovamente(
          resultado.status,
          tentativa
        )
      ) {

        console.log('');
        console.log(
          'Falha temporária.'
        );

        console.log(
          'Próxima tentativa será realizada.'
        );

        console.log(
          `Pausa curta de teste: ${PAUSA_TESTE_MS / 1000}s`
        );

        await esperar(
          PAUSA_TESTE_MS
        );

        tentativa++;

        continue;
      }

      // ===================================================
      // ESGOTOU RETRIES
      // ===================================================

      resultadoFinal = {

        ...resultado,

        status:
          'FAILED_AFTER_RETRIES',

        statusOriginal:
          resultado.status,

        tentativas:
          tentativa,

        detalhe:
          (
            `Falhou após ${MAX_TENTATIVAS} tentativas. ` +
            `Último status: ${resultado.status}. ` +
            `Motivo: ${resultado.detalhe || 'não informado'}`
          )
      };

      break;
    }

    // =====================================================
    // GARANTIA
    // =====================================================

    if (!resultadoFinal) {

      resultadoFinal = {

        status:
          'FAILED_AFTER_RETRIES',

        detalhe:
          'Teste terminou sem resultado final.'
      };
    }

    // =====================================================
    // RESULTADO FINAL DO ITEM
    // =====================================================

    console.log('');
    console.log('========================================');

    console.log(
      `RESULTADO FINAL DO ITEM ${indice}`
    );

    console.log('========================================');

    console.log(
      'Status:',
      resultadoFinal.status
    );

    if (
      resultadoFinal.statusOriginal
    ) {

      console.log(
        'Status original:',
        resultadoFinal.statusOriginal
      );
    }

    if (
      resultadoFinal.detalhe
    ) {

      console.log(
        'Detalhe:',
        resultadoFinal.detalhe
      );
    }

    // =====================================================
    // GUARDAR RESULTADO SOMENTE EM MEMÓRIA
    // =====================================================

    resultadosFinais.push({

      index:
        indice,

      medicamento:
        medicamento.NOME_PRODUTO,

      status:
        resultadoFinal.status
    });

    // =====================================================
    // SIMULAR AVANÇO DO PROGRESSO
    // =====================================================
    //
    // NÃO CHAMA saveProgress().
    //
    // É apenas uma variável em memória.
    //
    // =====================================================

    progressoSimulado =
      indice + 1;

    console.log(
      `Progresso SIMULADO avançou para: ${progressoSimulado}`
    );

    // =====================================================
    // COMPROVAR CONTINUIDADE
    // =====================================================

    const existeProximo =
      medicamento !==
      MEDICAMENTOS_TESTE[
        MEDICAMENTOS_TESTE.length - 1
      ];

    if (
      existeProximo
    ) {

      console.log('');
      console.log(
        '>>> ITEM ENCERRADO.'
      );

      console.log(
        '>>> ORQUESTRADOR CONTINUARÁ PARA O PRÓXIMO ITEM.'
      );

      await esperar(
        1000
      );
    }
  }

  // =======================================================
  // RESUMO
  // =======================================================

  console.log('');
  console.log('========================================');
  console.log('RESUMO DO TESTE');
  console.log('========================================');

  console.log(
    resultadosFinais
  );

  // =======================================================
  // VALIDAÇÕES AUTOMÁTICAS
  // =======================================================

  const primeiroItem =
    resultadosFinais[0];

  const segundoItem =
    resultadosFinais[1];

  const falhaCorreta =
    primeiroItem?.status ===
    'FAILED_AFTER_RETRIES';

  const segundoExecutado =
    segundoItem?.status ===
    'SUCCESS';

  console.log('');
  console.log('========================================');
  console.log('VALIDAÇÃO');
  console.log('========================================');

  if (
    falhaCorreta
  ) {

    console.log(
      '✅ Item 1 terminou em FAILED_AFTER_RETRIES.'
    );

  } else {

    console.log(
      '❌ Item 1 não terminou como esperado.'
    );
  }

  if (
    segundoExecutado
  ) {

    console.log(
      '✅ Item 2 foi executado depois da falha do Item 1.'
    );

  } else {

    console.log(
      '❌ Item 2 não foi processado corretamente.'
    );
  }

  if (
    falhaCorreta &&
    segundoExecutado
  ) {

    console.log('');
    console.log(
      '✅ CONTINUIDADE DO LOTE VALIDADA.'
    );

    console.log(
      '✅ Uma falha definitiva não interrompe os próximos medicamentos.'
    );

    console.log(
      '✅ Política escolhida para o RPA está funcionando.'
    );

    console.log('');
    console.log(
      'progress.json REAL NÃO FOI ALTERADO.'
    );

    console.log(
      'results.csv REAL NÃO FOI ALTERADO.'
    );
  }

} catch (error) {

  console.error('');
  console.error('========================================');
  console.error('ERRO NO TESTE');
  console.error('========================================');

  console.error(
    error
  );
}