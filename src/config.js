export const CONFIG = {

  // =========================================================
  // LOTE DIÁRIO
  // =========================================================

  batchSize: 150,

  // =========================================================
  // HORÁRIO DO SCHEDULER
  // =========================================================
  //
  // Execução diária às 02:00 da manhã
  //
  // =========================================================

  schedule: {

    hour: 13,

    minute: 14

  },

  // =========================================================
  // NAVEGADOR
  // =========================================================

  browser: {

    headless: false,

    slowMo: 100

  },

  // =========================================================
  // CAMINHOS
  // =========================================================

  paths: {

    csv: new URL(
      '../data/medicamentos.csv',
      import.meta.url
    ),

    progress: new URL(
      '../out/progress.json',
      import.meta.url
    ),

    results: new URL(
      '../out/results.csv',
      import.meta.url
    ),

    bulas: new URL(
      '../out/bulas/',
      import.meta.url
    ),

    screenshots: new URL(
      '../out/screenshots/',
      import.meta.url
    ),

    logs: new URL(
      '../logs/',
      import.meta.url
    )

  }

};