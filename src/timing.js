// =========================================================
// BULARIO RPA V2
// CONTROLE CENTRALIZADO DE TEMPOS
// =========================================================

// ---------------------------------------------------------
// CONFIGURAÇÕES DE TEMPO
// ---------------------------------------------------------

export const TIMING = {

  // Tempo após a página/formulário estar disponível
  antesDeInteragir: {
    min: 1800,
    max: 3000
  },

  // Depois de digitar o nome e antes de selecionar
  autocomplete: {
    min: 1200,
    max: 2200
  },

  // Entre ArrowDown e Enter
  entreTeclas: {
    min: 600,
    max: 1200
  },

  // Depois da tela de resultado carregar
  antesDeLerResultado: {
    min: 1800,
    max: 3000
  },

  // Antes de clicar na bula
  antesDeDownload: {
    min: 2000,
    max: 3500
  },

  // =======================================================
  // INTERVALO ENTRE MEDICAMENTOS
  // =======================================================
  //
  // Este é propositalmente bem maior.
  //
  // Um medicamento termina completamente antes
  // de o próximo começar.
  //
  // 60 a 90 segundos.
  //
  // =======================================================

  entreMedicamentos: {
    min: 60000,
    max: 90000
  },

  // =======================================================
  // BACKOFF EM ERROS TEMPORÁRIOS
  // =======================================================

  erroTemporario: {
    min: 120000,
    max: 180000
  }
};

// =========================================================
// GERAR TEMPO ALEATÓRIO DENTRO DE UMA FAIXA
// =========================================================

export function tempoAleatorio(min, max) {

  if (
    typeof min !== 'number' ||
    typeof max !== 'number'
  ) {
    throw new Error(
      'tempoAleatorio recebeu valores inválidos.'
    );
  }

  if (min < 0 || max < 0) {
    throw new Error(
      'Os tempos não podem ser negativos.'
    );
  }

  if (min > max) {
    throw new Error(
      'O tempo mínimo não pode ser maior que o máximo.'
    );
  }

  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

// =========================================================
// ESPERA BASE
// =========================================================

export function esperar(ms) {

  return new Promise(resolve => {

    setTimeout(
      resolve,
      ms
    );
  });
}

// =========================================================
// ESPERA COM FAIXA
// =========================================================

export async function esperarFaixa(
  minimo,
  maximo,
  descricao = 'Pausa operacional'
) {

  const tempo =
    tempoAleatorio(
      minimo,
      maximo
    );

  console.log(
    `${descricao}: ${(tempo / 1000).toFixed(1)}s`
  );

  await esperar(
    tempo
  );

  return tempo;
}

// =========================================================
// PAUSAS ESPECÍFICAS
// =========================================================

export async function pausaAntesDeInteragir() {

  return esperarFaixa(
    TIMING.antesDeInteragir.min,
    TIMING.antesDeInteragir.max,
    'Pausa antes da interação'
  );
}

// ---------------------------------------------------------

export async function pausaAutocomplete() {

  return esperarFaixa(
    TIMING.autocomplete.min,
    TIMING.autocomplete.max,
    'Pausa antes de selecionar autocomplete'
  );
}

// ---------------------------------------------------------

export async function pausaEntreTeclas() {

  return esperarFaixa(
    TIMING.entreTeclas.min,
    TIMING.entreTeclas.max,
    'Pausa entre teclas'
  );
}

// ---------------------------------------------------------

export async function pausaAntesDeLerResultado() {

  return esperarFaixa(
    TIMING.antesDeLerResultado.min,
    TIMING.antesDeLerResultado.max,
    'Pausa antes de ler resultado'
  );
}

// ---------------------------------------------------------

export async function pausaAntesDeDownload() {

  return esperarFaixa(
    TIMING.antesDeDownload.min,
    TIMING.antesDeDownload.max,
    'Pausa antes do download'
  );
}

// =========================================================
// PAUSA ENTRE MEDICAMENTOS
// =========================================================

export async function pausaEntreMedicamentos() {

  console.log('');
  console.log('========================================');
  console.log('AGUARDANDO PRÓXIMO MEDICAMENTO');
  console.log('========================================');

  const tempo =
    tempoAleatorio(
      TIMING.entreMedicamentos.min,
      TIMING.entreMedicamentos.max
    );

  const segundos =
    Math.round(
      tempo / 1000
    );

  console.log(
    `Próxima consulta em aproximadamente ${segundos} segundos.`
  );

  await esperar(
    tempo
  );

  console.log(
    'Intervalo concluído.'
  );

  return tempo;
}

// =========================================================
// BACKOFF PARA ERROS TEMPORÁRIOS
// =========================================================

export async function pausaErroTemporario() {

  console.log('');
  console.log('========================================');
  console.log('PAUSA POR ERRO TEMPORÁRIO');
  console.log('========================================');

  const tempo =
    tempoAleatorio(
      TIMING.erroTemporario.min,
      TIMING.erroTemporario.max
    );

  const segundos =
    Math.round(
      tempo / 1000
    );

  console.log(
    `Execução aguardará aproximadamente ${segundos} segundos.`
  );

  await esperar(
    tempo
  );

  console.log(
    'Pausa por erro concluída.'
  );

  return tempo;
}