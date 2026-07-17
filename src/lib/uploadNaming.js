// Regras de nomeação de arquivo por tipo de material, usadas pelo formulário
// de upload (src/pages/UploadPage.vue). Cada config define os campos que o
// formulário precisa pedir e como montar o nome-base do arquivo (sem
// extensão — a extensão do arquivo original é anexada por fora).
//
// Exemplos (do pedido original):
//   prova:  MAT141-P1-2026-1
//   lista:  ECO270-Pib e Mercado-L3-2026-2
//   resumo: Gravitação-FIS201-2026-1
//   slide:  Slide-MAT141-P1-2026-1
//   livro:  <nome do livro> (a disciplina só define a subpasta, não entra no nome)

function clean(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

export const UPLOAD_TYPES = [
  {
    type: 'prova',
    label: 'Prova',
    fields: [
      { key: 'materia', label: 'Disciplina' },
      { key: 'prova', label: 'Prova (ex.: P1, AV2)' },
      { key: 'ano', label: 'Ano' },
      { key: 'semestre', label: 'Semestre' },
    ],
    buildName: (f) => `${clean(f.materia)}-${clean(f.prova)}-${clean(f.ano)}-${clean(f.semestre)}`,
  },
  {
    type: 'lista',
    label: 'Tarefa/Lista',
    fields: [
      { key: 'materia', label: 'Disciplina' },
      { key: 'nome', label: 'Nome do trabalho' },
      { key: 'numero', label: 'Número da lista/tarefa (ex.: L3)' },
      { key: 'ano', label: 'Ano' },
      { key: 'semestre', label: 'Semestre' },
    ],
    buildName: (f) =>
      `${clean(f.materia)}-${clean(f.nome)}-${clean(f.numero)}-${clean(f.ano)}-${clean(f.semestre)}`,
  },
  {
    type: 'resumo',
    label: 'Resumo',
    fields: [
      { key: 'nome', label: 'Nome' },
      { key: 'materia', label: 'Disciplina' },
      { key: 'ano', label: 'Ano' },
      { key: 'semestre', label: 'Semestre' },
    ],
    buildName: (f) => `${clean(f.nome)}-${clean(f.materia)}-${clean(f.ano)}-${clean(f.semestre)}`,
  },
  {
    type: 'slide',
    label: 'Slide',
    fields: [
      { key: 'materia', label: 'Disciplina' },
      { key: 'numero', label: 'Número' },
      { key: 'ano', label: 'Ano' },
      { key: 'semestre', label: 'Semestre' },
    ],
    buildName: (f) => `Slide-${clean(f.materia)}-${clean(f.numero)}-${clean(f.ano)}-${clean(f.semestre)}`,
  },
  {
    type: 'livro',
    label: 'Livro',
    fields: [
      { key: 'nome', label: 'Nome do livro' },
      // `materia` também é pedido no formulário (ver UploadPage.vue), mas só
      // define em qual subpasta de disciplina o arquivo cai — não entra no nome.
    ],
    buildName: (f) => clean(f.nome),
  },
]

export function getUploadTypeConfig(type) {
  return UPLOAD_TYPES.find((t) => t.type === type) || null
}

function extensionOf(fileName) {
  const match = /\.[^.]+$/.exec(String(fileName ?? ''))
  return match ? match[0] : ''
}

export function buildFileName(type, fields, originalFileName) {
  const config = getUploadTypeConfig(type)
  if (!config) throw new Error(`Tipo de material desconhecido: ${type}`)
  const base = config.buildName(fields)
  return base + extensionOf(originalFileName)
}
