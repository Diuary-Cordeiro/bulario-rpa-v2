import fs from 'node:fs';

import {
  CONFIG
} from './config.js';

// =========================================================
// CARREGAR PROGRESSO
// =========================================================

export function loadProgress() {

  try {

    if (
      !fs.existsSync(
        CONFIG.paths.progress
      )
    ) {

      console.log(
        'progress.json não encontrado. Iniciando do índice 0.'
      );

      return 0;
    }

    const conteudo =
      fs.readFileSync(
        CONFIG.paths.progress,
        'utf8'
      );

    const progress =
      JSON.parse(
        conteudo
      );

    const nextIndex =
      Number(
        progress.nextIndex
      );

    if (
      !Number.isInteger(nextIndex) ||
      nextIndex < 0
    ) {

      throw new Error(
        'nextIndex inválido no progress.json.'
      );
    }

    return nextIndex;

  } catch (error) {

    throw new Error(
      `Falha ao carregar progress.json: ${error.message}`
    );
  }
}

// =========================================================
// SALVAR PROGRESSO
// =========================================================

export function saveProgress(
  nextIndex
) {

  if (
    !Number.isInteger(nextIndex) ||
    nextIndex < 0
  ) {

    throw new Error(
      `Índice inválido para salvar progresso: ${nextIndex}`
    );
  }

  const progress = {

    nextIndex,

    updatedAt:
      new Date().toISOString()

  };

  const caminhoFinal =
    CONFIG.paths.progress;

  const caminhoTemporario =
    new URL(
      './progress.tmp.json',
      caminhoFinal
    );

  try {

    // =====================================================
    // PRIMEIRO ESCREVER ARQUIVO TEMPORÁRIO
    // =====================================================

    fs.writeFileSync(
      caminhoTemporario,
      JSON.stringify(
        progress,
        null,
        2
      ),
      'utf8'
    );

    // =====================================================
    // SUBSTITUIR O PROGRESS.JSON
    // =====================================================

    fs.renameSync(
      caminhoTemporario,
      caminhoFinal
    );

    console.log(
      `Progresso salvo. Próximo índice: ${nextIndex}`
    );

  } catch (error) {

    // Limpeza caso o temporário tenha ficado
    try {

      if (
        fs.existsSync(
          caminhoTemporario
        )
      ) {

        fs.unlinkSync(
          caminhoTemporario
        );
      }

    } catch {
      // Não interromper pelo cleanup.
    }

    throw new Error(
      `Falha ao salvar progresso: ${error.message}`
    );
  }
}