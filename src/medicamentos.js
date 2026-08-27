import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { CONFIG } from './config.js';

export function loadMedicamentos() {
  const csv = fs.readFileSync(CONFIG.paths.csv, 'utf8');

  return parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  });
}