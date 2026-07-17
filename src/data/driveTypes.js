// Mapeamento entre as subpastas do Drive (<CODIGO>/<subpasta>/arquivo) e os
// tipos de material usados pelo Archive. Compartilhado entre o script de
// sync (leitura, scripts/sync-archive-from-drive.mjs) e a function de
// upload (escrita, api/upload-init.js) pra não duplicar a lista em dois
// lugares.
export const FOLDER_TO_TYPE = {
  exams: 'prova',
  assignments: 'lista',
  summaries: 'resumo',
  slides: 'slide',
  books: 'livro',
}

export const TYPE_TO_FOLDER = Object.fromEntries(
  Object.entries(FOLDER_TO_TYPE).map(([folder, type]) => [type, folder]),
)
