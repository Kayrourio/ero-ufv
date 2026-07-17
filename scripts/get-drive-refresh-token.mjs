// Script de uso único (roda na sua máquina) pra gerar o GOOGLE_OAUTH_REFRESH_TOKEN
// usado por api/upload-init.js. Necessário porque service accounts não têm
// cota de armazenamento própria e não conseguem escrever num "Meu Drive"
// pessoal — a function precisa se autenticar como a conta Google de verdade
// que é dona da pasta raiz do Drive.
//
// Setup (uma vez só):
//   1. No Google Cloud Console (mesmo projeto da Drive API já habilitada):
//      APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth
//      → tipo de aplicativo "App para computador" (Desktop app).
//   2. Copie o Client ID e o Client Secret gerados.
//   3. Rode este script passando essas duas credenciais via env var:
//        node --env-file=.env scripts/get-drive-refresh-token.mjs
//      (ou exporte GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET no
//      shell antes de rodar)
//   4. Uma aba do navegador abre pedindo login — entre com a conta Google
//      que é DONA da pasta raiz do Drive (a mesma do DRIVE_ROOT_FOLDER_ID)
//      e autorize o acesso.
//   5. O terminal imprime GOOGLE_OAUTH_REFRESH_TOKEN=... — copie esse valor
//      (junto com o Client ID e Client Secret) pras env vars da Vercel.

import http from 'node:http'
import crypto from 'node:crypto'
import { exec } from 'node:child_process'

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET
const PORT = 53682
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2callback`
const SCOPE = 'https://www.googleapis.com/auth/drive'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET antes de rodar.\n' +
      'Ex.: node --env-file=.env scripts/get-drive-refresh-token.mjs',
  )
  process.exit(1)
}

const state = crypto.randomBytes(16).toString('hex')

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.set('client_id', CLIENT_ID)
authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', SCOPE)
authUrl.searchParams.set('access_type', 'offline')
authUrl.searchParams.set('prompt', 'consent')
authUrl.searchParams.set('state', state)

function openBrowser(url) {
  const cmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`
  exec(cmd, () => {})
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI)
  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404).end()
    return
  }

  const code = url.searchParams.get('code')
  const returnedState = url.searchParams.get('state')
  if (!code || returnedState !== state) {
    res
      .writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
      .end('<h1>Falha na autorização.</h1>Código ou state inválido. Pode fechar esta aba e rodar o script de novo.')
    server.close()
    return
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })
    const data = await tokenRes.json()
    if (!tokenRes.ok) throw new Error(JSON.stringify(data))

    res
      .writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      .end('<h1>Pronto!</h1>Pode fechar esta aba e voltar pro terminal.')

    if (!data.refresh_token) {
      console.log(
        '\nNenhum refresh_token retornado — normalmente acontece quando essa conta já autorizou esse\n' +
          'mesmo app antes. Revogue o acesso em https://myaccount.google.com/permissions e rode o\n' +
          'script de novo (o prompt=consent deveria forçar um novo token, mas às vezes precisa disso).',
      )
    } else {
      console.log('\n--- Autorizado com sucesso ---')
      console.log('\nGOOGLE_OAUTH_REFRESH_TOKEN=' + data.refresh_token)
      console.log('\nColoque esse valor, junto com GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET, nas env vars da Vercel.')
    }
  } catch (err) {
    console.error('\nFalha ao trocar o código por tokens:', err.message || err)
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' }).end('<h1>Erro</h1>Confira o terminal.')
  } finally {
    server.close()
  }
})

server.listen(PORT, () => {
  console.log('Abrindo o navegador para autorizar o acesso ao Drive...')
  console.log('Entre com a conta Google DONA da pasta raiz do Drive.')
  console.log('\nSe não abrir sozinho, acesse:\n' + authUrl.toString() + '\n')
  openBrowser(authUrl.toString())
})
