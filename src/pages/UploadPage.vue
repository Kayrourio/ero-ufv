<script setup>
import { computed, reactive, ref } from 'vue'
import { DISCIPLINES } from '../data'
import { UPLOAD_TYPES, getUploadTypeConfig, buildFileName } from '../lib/uploadNaming'
import SiteNav from '../components/hub/SiteNav.vue'
import SiteFooter from '../components/hub/SiteFooter.vue'

const password = ref('')
const type = ref(UPLOAD_TYPES[0].type)
const disciplineCode = ref('')
const fieldValues = reactive({})
const file = ref(null)
const fileInput = ref(null)

const uploading = ref(false)
const progress = ref(0)
const error = ref('')
const success = ref('')

const currentConfig = computed(() => getUploadTypeConfig(type.value))
// "materia" já vira o seletor de disciplina fixo acima do formulário — não
// repete como campo dinâmico, mesmo quando o tipo (ex. prova/slide) usa
// materia no nome do arquivo.
const dynamicFields = computed(() => currentConfig.value.fields.filter((f) => f.key !== 'materia'))

const sortedDisciplines = computed(() =>
  [...DISCIPLINES].sort((a, b) => a.code.localeCompare(b.code)),
)

const previewName = computed(() => {
  if (!disciplineCode.value) return ''
  try {
    return buildFileName(
      type.value,
      { ...fieldValues, materia: disciplineCode.value },
      file.value?.name || '',
    )
  } catch {
    return ''
  }
})

function resetDynamicFields() {
  for (const key of Object.keys(fieldValues)) delete fieldValues[key]
}

function onTypeChange() {
  resetDynamicFields()
  clearFile()
}

function onFileChange(e) {
  file.value = e.target.files?.[0] || null
}

function clearFile() {
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const missingFields = computed(() => {
  const missing = []
  if (!disciplineCode.value) missing.push('Disciplina')
  for (const f of dynamicFields.value) {
    if (!String(fieldValues[f.key] || '').trim()) missing.push(f.label)
  }
  if (!file.value) missing.push('Arquivo')
  if (!password.value) missing.push('Senha')
  return missing
})

const canSubmit = computed(() => missingFields.value.length === 0 && !uploading.value)

function uploadBytes(uploadUrl, uploadFile) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', uploadFile.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) progress.value = Math.round((e.loaded / e.total) * 100)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload falhou (status ${xhr.status}).`))
    }
    xhr.onerror = () => reject(new Error('Erro de rede durante o upload.'))
    xhr.send(uploadFile)
  })
}

async function submit() {
  if (!canSubmit.value) return
  error.value = ''
  success.value = ''
  uploading.value = true
  progress.value = 0

  const fileName = previewName.value

  try {
    const initRes = await fetch('/api/upload-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: password.value,
        disciplineCode: disciplineCode.value,
        folderType: type.value,
        fileName,
        mimeType: file.value.type,
      }),
    })
    const initData = await initRes.json().catch(() => ({}))
    if (!initRes.ok) throw new Error(initData.error || 'Falha ao autorizar upload.')

    await uploadBytes(initData.uploadUrl, file.value)

    success.value = `${fileName} enviado.`
    clearFile()
  } catch (err) {
    error.value = err.message || 'Erro ao enviar arquivo.'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="hub up-page">
    <site-nav></site-nav>

    <header class="up-head hub-wrap">
      <div class="hub-eyebrow" v-reveal="0">Upload de material</div>
      <h1 class="up-h1" v-reveal="1">Enviar material pro Archive.</h1>
      <p class="up-sub" v-reveal="2">
        O nome do arquivo é gerado automaticamente a partir dos campos abaixo, seguindo o padrão de cada tipo de
        material.
      </p>
    </header>

    <main class="up-body hub-wrap">
      <form class="up-form" @submit.prevent="submit">
        <div class="up-row">
          <label class="up-field">
            <span class="up-label hub-mono">Tipo de material</span>
            <select v-model="type" class="up-select" @change="onTypeChange">
              <option v-for="t in UPLOAD_TYPES" :key="t.type" :value="t.type">{{ t.label }}</option>
            </select>
          </label>

          <label class="up-field">
            <span class="up-label hub-mono">Disciplina</span>
            <select v-model="disciplineCode" class="up-select">
              <option value="" disabled>Selecione...</option>
              <option v-for="d in sortedDisciplines" :key="d.code" :value="d.code">{{ d.code }} — {{ d.name }}</option>
            </select>
          </label>
        </div>

        <div class="up-row">
          <label v-for="f in dynamicFields" :key="f.key" class="up-field">
            <span class="up-label hub-mono">{{ f.label }}</span>
            <input v-model="fieldValues[f.key]" type="text" class="up-input" />
          </label>
        </div>

        <div class="up-preview hub-mono" v-if="previewName">
          <span class="up-preview-label">Nome final:</span> {{ previewName }}
        </div>

        <label class="up-field">
          <span class="up-label hub-mono">Arquivo</span>
          <div class="up-file-row">
            <button type="button" class="hub-btn ghost-light up-file-btn" @click="fileInput?.click()">
              Escolher arquivo
            </button>
            <span class="up-file-name hub-mono" :class="{ empty: !file }">
              {{ file ? file.name : 'Nenhum arquivo selecionado' }}
            </span>
            <input ref="fileInput" type="file" class="up-file-input" @change="onFileChange" />
          </div>
        </label>

        <label class="up-field">
          <span class="up-label hub-mono">Senha de acesso</span>
          <input v-model="password" type="password" class="up-input" autocomplete="off" />
        </label>

        <div class="up-actions">
          <button type="submit" class="hub-btn primary" :disabled="!canSubmit">
            {{ uploading ? `Enviando... ${progress}%` : 'Enviar' }}
          </button>
          <span v-if="!canSubmit && !uploading && missingFields.length" class="up-hint hub-mono">
            Faltando: {{ missingFields.join(', ') }}
          </span>
        </div>

        <div v-if="uploading" class="up-progress">
          <div class="up-progress-bar" :style="{ width: progress + '%' }"></div>
        </div>

        <p v-if="error" class="up-msg error">{{ error }}</p>
        <p v-if="success" class="up-msg success">{{ success }}</p>
      </form>
    </main>

    <site-footer></site-footer>
  </div>
</template>

<style scoped>
.up-page {
  display: flex;
  flex-direction: column;
}
.up-head {
  padding: 56px 0 32px;
}
.up-h1 {
  font-family: var(--hub-font-display);
  font-weight: 600;
  font-size: 42px;
  letter-spacing: -1px;
  margin: 10px 0;
}
.up-sub {
  font-size: 17px;
  color: var(--hub-muted);
  margin: 0;
  max-width: 560px;
}
.up-body {
  flex: 1;
  padding: 16px 0 64px;
}
.up-form {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.up-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.up-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 200px;
}
.up-label {
  font-size: 11px;
  letter-spacing: 0.4px;
  color: var(--hub-muted);
}
.up-input,
.up-select {
  border: 1px solid var(--hub-line);
  border-radius: 3px;
  padding: 10px 12px;
  font-size: 15px;
  background: #fff;
  color: var(--hub-black);
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;
}
.up-input:focus,
.up-select:focus {
  border-color: var(--hub-red);
  box-shadow: 0 0 0 3px rgba(230, 48, 48, 0.12);
}
.up-file-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.up-file-btn {
  padding: 10px 18px;
  font-size: 14px;
}
.up-file-name {
  font-size: 13px;
  color: var(--hub-black);
}
.up-file-name.empty {
  color: var(--hub-faint);
}
.up-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
.up-preview {
  background: var(--hub-off-2);
  border: 1px solid var(--hub-line);
  border-radius: 3px;
  padding: 12px 14px;
  font-size: 13px;
  color: var(--hub-black);
}
.up-preview-label {
  color: var(--hub-faint);
  margin-right: 6px;
}
.up-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.up-hint {
  font-size: 12px;
  color: var(--hub-faint);
}
.up-progress {
  height: 4px;
  border-radius: 2px;
  background: var(--hub-line-soft);
  overflow: hidden;
}
.up-progress-bar {
  height: 100%;
  background: var(--hub-red);
  transition: width 120ms linear;
}
.up-msg {
  font-size: 14px;
  margin: 0;
}
.up-msg.error {
  color: var(--hub-red);
}
.up-msg.success {
  color: #2a8a4a;
}
</style>
