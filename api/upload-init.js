// Vercel Serverless Function: autoriza e prepara um upload de material pro
// Drive. Não recebe os bytes do arquivo — só valida a senha compartilhada,
// autentica como a conta Google dona da pasta (via refresh token OAuth —
// service accounts não têm cota de armazenamento própria e não conseguem
// escrever num "Meu Drive" pessoal, só em Shared Drives do Workspace), acha
// ou cria a pasta <ROOT>/<DISCIPLINA>/<tipo>/ e devolve uma URL de
// "resumable upload" do próprio Google. O navegador faz o PUT do arquivo
// direto pra essa URL (ver src/pages/UploadPage.vue), sem passar pelo
// limite de payload (~4.5MB) das functions da Vercel.
//
// Env vars exigidas: DRIVE_ROOT_FOLDER_ID (já usada pelo sync de leitura),
// GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
// GOOGLE_OAUTH_REFRESH_TOKEN, UPLOAD_ACCESS_PASSWORD.
// O refresh token é gerado uma vez, localmente, com
// `node --env-file=.env scripts/get-drive-refresh-token.mjs` — veja esse
// script pra instruções de setup do OAuth Client.

import crypto from 'node:crypto'
import { DISCIPLINES } from '../src/data.js'
import { TYPE_TO_FOLDER } from '../src/data/driveTypes.js'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

async function getAccessToken(clientId, clientSecret, refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!res.ok) {
    throw new Error(`Falha ao renovar access token: ${res.status} ${await res.text()}`)
  }
  const data = await res.json()
  return data.access_token
}

function escapeForQuery(value) {
  return String(value).replace(/'/g, "\\'")
}

async function findChildFolder(token, parentId, name) {
  const url = new URL('https://www.googleapis.com/drive/v3/files')
  url.searchParams.set(
    'q',
    `'${escapeForQuery(parentId)}' in parents and trashed = false and mimeType = '${FOLDER_MIME}' and name = '${escapeForQuery(name)}'`,
  )
  url.searchParams.set('fields', 'files(id, name)')
  url.searchParams.set('supportsAllDrives', 'true')
  url.searchParams.set('includeItemsFromAllDrives', 'true')
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    throw new Error(`Falha ao consultar pastas do Drive: ${res.status} ${await res.text()}`)
  }
  const data = await res.json()
  return data.files?.[0] || null
}

async function createFolder(token, parentId, name) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  })
  if (!res.ok) {
    throw new Error(`Falha ao criar pasta no Drive: ${res.status} ${await res.text()}`)
  }
  const data = await res.json()
  return data.id
}

async function findOrCreateFolder(token, parentId, name) {
  const existing = await findChildFolder(token, parentId, name)
  if (existing) return existing.id
  return createFolder(token, parentId, name)
}

async function initResumableUpload(token, folderId, fileName, mimeType, origin) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Upload-Content-Type': mimeType || 'application/octet-stream',
  }
  // O Google só habilita CORS na sessão resumível pra origens que aparecem
  // no header Origin da requisição que a criou. Como quem inicia a sessão é
  // esta function (servidor), precisamos repassar a origem do navegador que
  // vai de fato fazer o PUT do arquivo — senão o upload direto do browser
  // falha silenciosamente como erro de rede/CORS.
  if (origin) headers.Origin = origin

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: fileName, parents: [folderId] }),
    },
  )
  if (!res.ok) {
    throw new Error(`Falha ao iniciar upload resumível: ${res.status} ${await res.text()}`)
  }
  const uploadUrl = res.headers.get('location')
  if (!uploadUrl) throw new Error('Drive não retornou URL de upload.')
  return uploadUrl
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  const expectedPassword = process.env.UPLOAD_ACCESS_PASSWORD
  const rootId = process.env.DRIVE_ROOT_FOLDER_ID
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  if (!expectedPassword || !rootId || !clientId || !clientSecret || !refreshToken) {
    res.status(500).json({ error: 'Upload não configurado no servidor.' })
    return
  }

  const { password, disciplineCode, folderType, fileName, mimeType } = req.body || {}

  if (!password || !safeEqual(password, expectedPassword)) {
    res.status(401).json({ error: 'Senha incorreta.' })
    return
  }

  const code = String(disciplineCode || '').trim().toUpperCase()
  const discipline = DISCIPLINES.find((d) => d.code === code)
  if (!discipline) {
    res.status(400).json({ error: `Disciplina desconhecida: ${disciplineCode}` })
    return
  }

  const folder = TYPE_TO_FOLDER[folderType]
  if (!folder) {
    res.status(400).json({ error: `Tipo de material desconhecido: ${folderType}` })
    return
  }

  if (!fileName || typeof fileName !== 'string') {
    res.status(400).json({ error: 'Nome de arquivo ausente.' })
    return
  }

  try {
    const token = await getAccessToken(clientId, clientSecret, refreshToken)
    const disciplineFolderId = await findOrCreateFolder(token, rootId, code)
    const typeFolderId = await findOrCreateFolder(token, disciplineFolderId, folder)
    const uploadUrl = await initResumableUpload(token, typeFolderId, fileName, mimeType, req.headers.origin)
    res.status(200).json({ uploadUrl })
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'Falha ao preparar upload no Drive.' })
  }
}
