import fs from 'node:fs/promises';
import path from 'node:path';

import {
  pausaAntesDeInteragir,
  pausaAutocomplete,
  pausaEntreTeclas,
  pausaAntesDeLerResultado,
  pausaAntesDeDownload
} from './timing.js';

// =========================================================
// CONSTANTES
// =========================================================

const URL_BULARIO =
  'https://consultas.anvisa.gov.br/#/bulario/';

// =========================================================
// NORMALIZAR NOME DE ARQUIVO
// =========================================================

function normalizarNomeArquivo(valor) {

  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// =========================================================
// NORMALIZAR REGISTRO ANVISA
// =========================================================

function normalizarRegistro(valor) {

  return String(valor || '')
    .replace(/\D/g, '')
    .trim();
}

// =========================================================
// TRADUZIR MOTIVOS DE BUSCA
// =========================================================

function traduzirMotivoBusca(motivo) {

  const motivos = {

    REGISTRATION_FIELD_MISMATCH:
      'O número de registro informado não permaneceu corretamente preenchido no campo da ANVISA.',

    REGISTRATION_RESULT_NOT_FOUND:
      'A consulta pelo número de registro não retornou nenhum resultado válido no Bulário da ANVISA.'
  };

  return (
    motivos[motivo] ||
    motivo ||
    'Motivo não identificado.'
  );
}

// =========================================================
// MENSAGEM AMIGÁVEL DE ERRO
// =========================================================

function mensagemAmigavelErro(error) {

  const mensagem =
    String(
      error?.message ||
      error ||
      ''
    );

  const mensagemLower =
    mensagem.toLowerCase();

  if (
    mensagemLower.includes(
      'target page, context or browser has been closed'
    )
  ) {

    return (
      'Falha temporária do navegador durante a consulta à ANVISA. ' +
      'A página, o contexto ou o navegador foi encerrado antes da conclusão da operação.'
    );
  }

  if (
    mensagemLower.includes(
      'timeout'
    )
  ) {

    return (
      'A ANVISA demorou mais que o tempo esperado para responder à operação.'
    );
  }

  if (
    mensagemLower.includes(
      'net::err'
    )
  ) {

    return (
      'Falha de comunicação com o site da ANVISA durante a consulta.'
    );
  }

  return (
    mensagem ||
    'Ocorreu uma falha inesperada durante o processamento do medicamento.'
  );
}

// =========================================================
// VALIDAR PDF
// =========================================================

async function validarPdf(caminhoArquivo) {

  try {

    const stat =
      await fs.stat(
        caminhoArquivo
      );

    if (stat.size <= 0) {

      return {
        valido: false,
        motivo:
          'O arquivo PDF está vazio.',
        tamanho:
          stat.size
      };
    }

    const arquivo =
      await fs.open(
        caminhoArquivo,
        'r'
      );

    try {

      const buffer =
        Buffer.alloc(5);

      await arquivo.read(
        buffer,
        0,
        5,
        0
      );

      const assinatura =
        buffer.toString('ascii');

      if (
        assinatura !== '%PDF-'
      ) {

        return {
          valido: false,
          motivo:
            'O arquivo baixado não possui uma assinatura PDF válida.',
          tamanho:
            stat.size,
          assinatura
        };
      }

      return {
        valido: true,
        tamanho:
          stat.size,
        assinatura
      };

    } finally {

      await arquivo.close();
    }

  } catch (error) {

    return {
      valido: false,
      motivo:
        `Falha ao validar o PDF: ${mensagemAmigavelErro(error)}`
    };
  }
}

// =========================================================
// EXTRAIR DADOS ANGULAR
// =========================================================

async function extrairDadosProduto(
  linhaMedicamento
) {

  return linhaMedicamento.evaluate(
    linha => {

      if (!window.angular) {

        return {
          sucesso: false,
          erro:
            'O Angular da página da ANVISA não foi localizado.'
        };
      }

      const elementoAngular =
        window.angular.element(
          linha
        );

      let scope = null;

      if (
        typeof elementoAngular.scope ===
        'function'
      ) {

        scope =
          elementoAngular.scope();
      }

      if (
        !scope &&
        typeof elementoAngular.inheritedData ===
        'function'
      ) {

        scope =
          elementoAngular.inheritedData(
            '$scope'
          );
      }

      if (!scope?.produto) {

        return {
          sucesso: false,
          erro:
            'Os dados internos do produto não foram encontrados na linha de resultado.'
        };
      }

      const produto =
        scope.produto;

      return {

        sucesso: true,

        idProduto:
          produto.idProduto ??
          null,

        nomeProduto:
          produto.nomeProduto ??
          produto.nome ??
          null,

        idBulaPacienteProtegido:
          produto.idBulaPacienteProtegido ??
          null,

        idBulaProfissionalProtegido:
          produto.idBulaProfissionalProtegido ??
          null
      };
    }
  );
}

// =========================================================
// ABRIR FORMULÁRIO
// =========================================================

async function abrirFormulario(
  page
) {

  console.log(
    'Abrindo formulário do Bulário da ANVISA...'
  );

  await page.goto(
    URL_BULARIO,
    {
      waitUntil:
        'domcontentloaded',

      timeout:
        60000
    }
  );

  const campoMedicamento =
    page.locator(
      'autocomplete[ng-model="filter.nomeProduto"] input'
    );

  await campoMedicamento.waitFor({
    state:
      'visible',

    timeout:
      30000
  });

  return campoMedicamento;
}

// =========================================================
// AGUARDAR TELA DE RESULTADOS
// =========================================================

async function aguardarResultados(
  page
) {

  console.log(
    'Aguardando resultado da consulta...'
  );

  const resultadoConsulta =
    page.getByText(
      'Resultado da Consulta de Bulário Eletrônico',
      {
        exact: true
      }
    );

  await resultadoConsulta.waitFor({
    state:
      'visible',

    timeout:
      30000
  });

  console.log(
    'Tela de resultados detectada.'
  );
}

// =========================================================
// BUSCAR PELO REGISTRO ANVISA
// ÚNICA ESTRATÉGIA DE BUSCA
// =========================================================

async function buscarPorRegistro(
  page,
  registroAnvisa
) {

  console.log('');
  console.log('========================================');
  console.log('BUSCA PELO REGISTRO ANVISA');
  console.log('========================================');

  console.log(
    'Registro:',
    registroAnvisa
  );

  // =======================================================
  // ABRIR FORMULÁRIO LIMPO
  // =======================================================

  const campoMedicamento =
    await abrirFormulario(
      page
    );

  await pausaAntesDeInteragir();

  // =======================================================
  // GARANTIR CAMPO MEDICAMENTO VAZIO
  // =======================================================

  await campoMedicamento.fill('');

  const valorMedicamento =
    await campoMedicamento.inputValue();

  console.log(
    'Campo Medicamento:',
    valorMedicamento
      ? valorMedicamento
      : '(vazio)'
  );

  // =======================================================
  // LOCALIZAR CAMPO DO REGISTRO
  // =======================================================

  const campoRegistro =
    page.locator(
      'input#txtNumeroRegistro[ng-model="filter.numeroRegistro"]'
    );

  await campoRegistro.waitFor({
    state:
      'visible',

    timeout:
      30000
  });

  console.log(
    'Campo Número do Registro localizado.'
  );

  // =======================================================
  // LIMPAR E PREENCHER REGISTRO
  // =======================================================

  await campoRegistro.fill('');

  await campoRegistro.fill(
    registroAnvisa
  );

  console.log(
    'Registro ANVISA preenchido.'
  );

  // =======================================================
  // CONFIRMAR VALOR
  // =======================================================

  const valorRegistro =
    normalizarRegistro(
      await campoRegistro.inputValue()
    );

  console.log(
    'Registro confirmado no campo:',
    valorRegistro
  );

  if (
    valorRegistro !==
    registroAnvisa
  ) {

    return {
      sucesso: false,
      motivo:
        'REGISTRATION_FIELD_MISMATCH'
    };
  }

  await pausaAutocomplete();

  // =======================================================
  // BOTÃO CONSULTAR
  // =======================================================

  const botaoConsultar =
    page.locator(
      'input[type="submit"][value="Consultar"]'
    );

  await botaoConsultar.waitFor({
    state:
      'visible',

    timeout:
      30000
  });

  console.log(
    'Botão Consultar localizado.'
  );

  await pausaEntreTeclas();

  console.log(
    'Consultando pelo número de registro ANVISA...'
  );

  await botaoConsultar.click();

  // =======================================================
  // AGUARDAR RESULTADO
  // =======================================================

  try {

    await aguardarResultados(
      page
    );

  } catch {

    return {
      sucesso: false,
      motivo:
        'REGISTRATION_RESULT_NOT_FOUND'
    };
  }

  console.log(
    'Consulta pelo registro retornou resultados.'
  );

  return {
    sucesso: true,
    buscaUtilizada:
      'REGISTRO'
  };
}

// =========================================================
// LOCALIZAR LINHA DO RESULTADO
// =========================================================

async function localizarLinhaResultado(
  page
) {

  console.log(
    'Aguardando linha do resultado encontrado pelo registro...'
  );

  const linhaResultado =
    page
      .locator(
        'tr:has(td:nth-child(8))'
      )
      .first();

  try {

    await linhaResultado.waitFor({
      state:
        'visible',

      timeout:
        30000
    });

  } catch {

    console.log(
      'Nenhuma linha válida apareceu no resultado da consulta pelo registro.'
    );

    return null;
  }

  console.log(
    'Linha do resultado encontrada.'
  );

  await pausaAntesDeLerResultado();

  const colunas =
    linhaResultado.locator(
      'td'
    );

  const quantidadeColunas =
    await colunas.count();

  console.log(
    'Quantidade de colunas:',
    quantidadeColunas
  );

  if (
    quantidadeColunas < 8
  ) {

    return null;
  }

  const nomeRetornado =
    (
      await colunas
        .nth(1)
        .innerText()
    ).trim();

  if (!nomeRetornado) {

    return null;
  }

  console.log(
    'Medicamento localizado pelo registro:',
    nomeRetornado
  );

  return linhaResultado;
}

// =========================================================
// PROCESSAR MEDICAMENTO
// =========================================================

export async function processarMedicamento(
  page,
  medicamento
) {

  // =======================================================
  // VALIDAR ENTRADA
  // =======================================================

  if (!page) {

    return {
      status:
        'INVALID_INPUT',

      detalhe:
        'A página do navegador não foi informada.'
    };
  }

  if (
    !medicamento
      ?.NOME_PRODUTO
  ) {

    return {
      status:
        'INVALID_INPUT',

      detalhe:
        'O nome do medicamento está ausente.'
    };
  }

  if (
    !medicamento
      ?.NUMERO_REGISTRO_PRODUTO
  ) {

    return {
      status:
        'INVALID_INPUT',

      detalhe:
        'O número de registro ANVISA está ausente.'
    };
  }

  const nomeMedicamento =
    String(
      medicamento.NOME_PRODUTO
    ).trim();

  const registroAnvisa =
    normalizarRegistro(
      medicamento
        .NUMERO_REGISTRO_PRODUTO
    );

  let buscaUtilizadaAtual =
    'REGISTRO';

  let etapaAtual =
    'Início do processamento';

  console.log('');
  console.log('========================================');
  console.log('PROCESSANDO MEDICAMENTO');
  console.log('========================================');

  console.log(
    'Medicamento:',
    nomeMedicamento
  );

  console.log(
    'Registro ANVISA:',
    registroAnvisa
  );

  try {

    // =====================================================
    // BUSCA SOMENTE PELO REGISTRO
    // =====================================================

    etapaAtual =
      'Consulta pelo número de registro ANVISA';

    buscaUtilizadaAtual =
      'REGISTRO';

    const resultadoBusca =
      await buscarPorRegistro(
        page,
        registroAnvisa
      );

    // =====================================================
    // NÃO ENCONTROU PELO REGISTRO
    // =====================================================

    if (
      !resultadoBusca.sucesso
    ) {

      console.log('');

      console.log(
        'O registro ANVISA não retornou um resultado válido.'
      );

      console.log(
        'Motivo:',
        traduzirMotivoBusca(
          resultadoBusca.motivo
        )
      );

      return {

        status:
          'SEARCH_NOT_FOUND',

        medicamento:
          nomeMedicamento,

        registroAnvisa,

        buscaUtilizada:
          'REGISTRO',

        etapa:
          etapaAtual,

        detalhe:
          `Medicamento não encontrado pelo número de registro ANVISA. ${traduzirMotivoBusca(resultadoBusca.motivo)}`
      };
    }

    const buscaUtilizada =
      'REGISTRO';

    console.log('');

    console.log(
      'Busca utilizada:',
      buscaUtilizada
    );

    // =====================================================
    // LOCALIZAR LINHA
    // =====================================================

    etapaAtual =
      'Localização da linha de resultado';

    const linhaMedicamento =
      await localizarLinhaResultado(
        page
      );

    if (
      !linhaMedicamento
    ) {

      return {

        status:
          'RESULT_NOT_FOUND',

        medicamento:
          nomeMedicamento,

        registroAnvisa,

        buscaUtilizada,

        etapa:
          etapaAtual,

        detalhe:
          'A ANVISA apresentou a tela de resultados, mas nenhuma linha válida do medicamento foi encontrada.'
      };
    }

    console.log(
      'Linha do medicamento localizada.'
    );

    // =====================================================
    // COLUNAS
    // =====================================================

    etapaAtual =
      'Leitura dos dados do resultado';

    const colunas =
      linhaMedicamento.locator(
        'td'
      );

    const quantidadeColunas =
      await colunas.count();

    if (
      quantidadeColunas < 8
    ) {

      return {

        status:
          'UNEXPECTED_RESULT_STRUCTURE',

        medicamento:
          nomeMedicamento,

        registroAnvisa,

        buscaUtilizada,

        etapa:
          etapaAtual,

        detalhe:
          `A estrutura do resultado da ANVISA está diferente do esperado. Foram encontradas ${quantidadeColunas} colunas.`
      };
    }

    // =====================================================
    // NOME REAL DA ANVISA
    // =====================================================

    const nomeResultado =
      (
        await colunas
          .nth(1)
          .innerText()
      ).trim();

    console.log(
      'Medicamento retornado pela ANVISA:',
      nomeResultado
    );

    // =====================================================
    // EMPRESA
    // =====================================================

    const empresaTexto =
      (
        await colunas
          .nth(2)
          .innerText()
      ).trim();

    const empresa =
      empresaTexto
        .replace(
          /\s*-\s*\d{14}\s*$/,
          ''
        )
        .trim();

    console.log(
      'Empresa:',
      empresa
    );

    // =====================================================
    // DADOS ANGULAR
    // =====================================================

    etapaAtual =
      'Leitura dos dados internos da bula';

    const dadosProduto =
      await extrairDadosProduto(
        linhaMedicamento
      );

    if (
      !dadosProduto.sucesso
    ) {

      return {

        status:
          'PRODUCT_DATA_ERROR',

        medicamento:
          nomeMedicamento,

        nomeResultado,

        registroAnvisa,

        empresa,

        buscaUtilizada,

        etapa:
          etapaAtual,

        detalhe:
          dadosProduto.erro
      };
    }

    // =====================================================
    // ESCOLHER BULA
    // =====================================================

    etapaAtual =
      'Seleção da bula';

    let tipoBula = null;

    if (
      dadosProduto
        .idBulaProfissionalProtegido
    ) {

      tipoBula =
        'PROFISSIONAL';

    } else if (
      dadosProduto
        .idBulaPacienteProtegido
    ) {

      tipoBula =
        'PACIENTE';
    }

    if (!tipoBula) {

      return {

        status:
          'NO_BULA_AVAILABLE',

        medicamento:
          nomeMedicamento,

        nomeResultado,

        registroAnvisa,

        empresa,

        buscaUtilizada,

        etapa:
          etapaAtual,

        detalhe:
          'Nenhuma bula profissional ou bula do paciente está disponível para este resultado.'
      };
    }

    console.log(
      'Tipo de bula escolhido:',
      tipoBula
    );

    if (
      tipoBula ===
      'PACIENTE'
    ) {

      console.log(
        'Bula profissional indisponível. A bula do paciente será utilizada como alternativa.'
      );
    }

    // =====================================================
    // LINK DA BULA
    // =====================================================

    let linkBula;

    if (
      tipoBula ===
      'PROFISSIONAL'
    ) {

      linkBula =
        linhaMedicamento.locator(
          'a[ng-if="produto.idBulaProfissionalProtegido"]'
        );

    } else {

      linkBula =
        linhaMedicamento.locator(
          'a[ng-if="produto.idBulaPacienteProtegido"]'
        );
    }

    await linkBula.waitFor({
      state:
        'visible',

      timeout:
        30000
    });

    // =====================================================
    // NOME DO ARQUIVO
    // =====================================================

    const nomeParaArquivo =
      nomeResultado ||
      nomeMedicamento;

    const fabricanteNormalizado =
      normalizarNomeArquivo(
        empresa
      );

    const medicamentoNormalizado =
      normalizarNomeArquivo(
        nomeParaArquivo
      );

    const registroNormalizado =
      normalizarNomeArquivo(
        registroAnvisa
      );

    let nomeArquivo =
      `${fabricanteNormalizado}__` +
      `${medicamentoNormalizado}__` +
      `${registroNormalizado}`;

    if (
      tipoBula ===
      'PACIENTE'
    ) {

      nomeArquivo +=
        '__PACIENTE';
    }

    nomeArquivo +=
      '.pdf';

    // =====================================================
    // PASTA DE SAÍDA
    // =====================================================

    const pastaBulas =
      path.resolve(
        'out',
        'bulas'
      );

    await fs.mkdir(
      pastaBulas,
      {
        recursive: true
      }
    );

    const caminhoFinal =
      path.join(
        pastaBulas,
        nomeArquivo
      );

    console.log(
      'Arquivo:',
      nomeArquivo
    );

    // =====================================================
    // VERIFICAR DUPLICADO
    // =====================================================

    etapaAtual =
      'Verificação de arquivo existente';

    try {

      await fs.access(
        caminhoFinal
      );

      const validacaoExistente =
        await validarPdf(
          caminhoFinal
        );

      if (
        validacaoExistente.valido
      ) {

        console.log(
          'O PDF já existe e é válido. O download será ignorado.'
        );

        return {

          status:
            'ALREADY_EXISTS',

          medicamento:
            nomeMedicamento,

          nomeResultado,

          registroAnvisa,

          empresa,

          tipoBula,

          buscaUtilizada,

          etapa:
            etapaAtual,

          arquivo:
            nomeArquivo,

          caminho:
            caminhoFinal,

          tamanho:
            validacaoExistente.tamanho,

          detalhe:
            'A bula já havia sido baixada anteriormente e o arquivo existente é válido.'
        };
      }

      console.log(
        'O arquivo existente é inválido e será substituído.'
      );

      await fs.unlink(
        caminhoFinal
      );

    } catch (error) {

      if (
        error.code !==
        'ENOENT'
      ) {

        throw error;
      }
    }

    // =====================================================
    // DOWNLOAD
    // =====================================================

    etapaAtual =
      'Download da bula';

    await pausaAntesDeDownload();

    console.log(
      'Preparando captura da bula...'
    );

    const respostaPdfPromise =
      page.waitForResponse(
        response => {

          return (
            response
              .url()
              .includes(
                '/api/consulta/medicamentos/arquivo/bula/parecer/'
              ) &&
            response.status() ===
              200
          );
        },
        {
          timeout:
            30000
        }
      );

    console.log(
      'Solicitando bula...'
    );

    await linkBula.click();

    const respostaPdf =
      await respostaPdfPromise;

    const headers =
      await respostaPdf.allHeaders();

    const contentType =
      headers['content-type'] ||
      '';

    console.log(
      'Status da resposta da bula:',
      respostaPdf.status()
    );

    console.log(
      'Tipo de conteúdo:',
      contentType ||
      '(não informado)'
    );

    const bufferPdf =
      await respostaPdf.body();

    if (
      !bufferPdf ||
      bufferPdf.length === 0
    ) {

      return {

        status:
          'EMPTY_DOWNLOAD',

        medicamento:
          nomeMedicamento,

        nomeResultado,

        registroAnvisa,

        empresa,

        tipoBula,

        buscaUtilizada,

        etapa:
          etapaAtual,

        detalhe:
          'A ANVISA retornou a bula sem conteúdo.'
      };
    }

    const assinatura =
      bufferPdf
        .subarray(
          0,
          5
        )
        .toString(
          'ascii'
        );

    if (
      assinatura !==
      '%PDF-'
    ) {

      return {

        status:
          'INVALID_PDF_RESPONSE',

        medicamento:
          nomeMedicamento,

        nomeResultado,

        registroAnvisa,

        empresa,

        tipoBula,

        buscaUtilizada,

        etapa:
          etapaAtual,

        detalhe:
          'A resposta recebida da ANVISA não corresponde a um arquivo PDF válido.'
      };
    }

    // =====================================================
    // SALVAR
    // =====================================================

    etapaAtual =
      'Gravação do arquivo PDF';

    console.log(
      'Gravando PDF...'
    );

    await fs.writeFile(
      caminhoFinal,
      bufferPdf
    );

    // =====================================================
    // VALIDAR FINAL
    // =====================================================

    etapaAtual =
      'Validação final do PDF';

    const validacao =
      await validarPdf(
        caminhoFinal
      );

    if (
      !validacao.valido
    ) {

      await fs.unlink(
        caminhoFinal
      ).catch(
        () => {}
      );

      return {

        status:
          'INVALID_SAVED_PDF',

        medicamento:
          nomeMedicamento,

        nomeResultado,

        registroAnvisa,

        empresa,

        tipoBula,

        buscaUtilizada,

        etapa:
          etapaAtual,

        detalhe:
          validacao.motivo
      };
    }

    // =====================================================
    // SUCESSO
    // =====================================================

    etapaAtual =
      'Processamento concluído';

    console.log('');
    console.log('========================================');
    console.log('MEDICAMENTO PROCESSADO COM SUCESSO');
    console.log('========================================');

    console.log(
      'Medicamento original:',
      nomeMedicamento
    );

    console.log(
      'Medicamento ANVISA:',
      nomeResultado
    );

    console.log(
      'Registro:',
      registroAnvisa
    );

    console.log(
      'Empresa:',
      empresa
    );

    console.log(
      'Busca utilizada:',
      buscaUtilizada
    );

    console.log(
      'Bula:',
      tipoBula
    );

    console.log(
      'Arquivo:',
      nomeArquivo
    );

    console.log(
      'Tamanho:',
      validacao.tamanho,
      'bytes'
    );

    return {

      status:
        'SUCCESS',

      medicamento:
        nomeMedicamento,

      nomeResultado,

      registroAnvisa,

      empresa,

      idProduto:
        dadosProduto.idProduto,

      buscaUtilizada,

      tipoBula,

      fallbackPaciente:
        tipoBula ===
        'PACIENTE',

      etapa:
        etapaAtual,

      arquivo:
        nomeArquivo,

      caminho:
        caminhoFinal,

      tamanho:
        validacao.tamanho,

      detalhe:
        'Bula localizada pelo registro ANVISA, baixada e validada com sucesso.'
    };

  } catch (error) {

    console.error(
      `Falha ao processar ${nomeMedicamento}:`
    );

    console.error(
      error
    );

    return {

      status:
        'ERROR',

      medicamento:
        nomeMedicamento,

      registroAnvisa,

      buscaUtilizada:
        buscaUtilizadaAtual,

      etapa:
        etapaAtual,

      detalhe:
        mensagemAmigavelErro(
          error
        )
    };
  }
}