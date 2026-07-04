<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { CONTRIBUTE_FORM_URL } from '../../config'
import { archiveState, closeDiscipline, disciplineByCode, typeCounts, filesByType } from '../../data/useArchive'

const typeLabels = { prova: 'Provas', lista: 'Listas', resumo: 'Resumos', slide: 'Slides', livro: 'Livros' }

const discipline = computed(() => (archiveState.activeCode ? disciplineByCode(archiveState.activeCode) : null))

function onKeydown(e) {
  if (e.key === 'Escape' && discipline.value) closeDiscipline()
}

// trava o scroll do fundo enquanto o popup está aberto
watch(discipline, (d) => {
  document.body.style.overflow = d ? 'hidden' : ''
})
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <teleport to="body">
    <transition name="dm-backdrop">
      <div v-if="discipline" class="dm-backdrop" @click="closeDiscipline">
        <transition name="dm-panel" appear>
          <div v-if="discipline" class="dm-panel" role="dialog" aria-modal="true" @click.stop>
            <button class="dm-close" aria-label="Fechar" @click="closeDiscipline">✕</button>

            <div class="dm-head">
              <span class="hub-mono dm-period">P{{ discipline.period }}</span>
              <div class="dm-code hub-mono">{{ discipline.code }}</div>
              <div class="dm-name">{{ discipline.name }}</div>
              <div class="hub-mono dm-total">{{ discipline.files.length }} arquivo{{ discipline.files.length === 1 ? '' : 's' }} no total</div>
            </div>

            <div class="dm-counts">
              <div v-for="tc in typeCounts(discipline)" :key="tc.type" class="dm-count" :class="{ zero: tc.count === 0 }">
                <span class="dm-count-n hub-mono">{{ tc.count }}</span>
                <span class="dm-count-t hub-mono">{{ tc.type }}</span>
              </div>
            </div>

            <div class="dm-body">
              <div v-if="!discipline.files.length" class="dm-empty">
                <p class="dm-empty-text">Ainda sem material enviado pra essa disciplina.</p>
                <a
                  v-if="CONTRIBUTE_FORM_URL"
                  class="hub-btn primary dm-empty-btn"
                  :href="CONTRIBUTE_FORM_URL"
                  target="_blank"
                  rel="noopener noreferrer"
                >Seja o primeiro a contribuir <span>→</span></a>
              </div>

              <div v-for="group in filesByType(discipline)" :key="group.type" class="dm-group">
                <div class="hub-mono dm-group-head">
                  // {{ typeLabels[group.type].toUpperCase() }} <span class="dm-group-n">({{ group.count }})</span>
                </div>
                <a
                  v-for="(f, fi) in group.files"
                  :key="fi"
                  class="dm-file"
                  :class="{ 'no-link': !f.url }"
                  :href="f.url || undefined"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click="!f.url && $event.preventDefault()"
                >
                  <span class="dm-file-name">{{ f.name }}</span>
                  <span class="hub-mono dm-file-date">{{ f.date || '—' }}</span>
                  <span class="dm-file-dl" aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.dm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(15, 15, 15, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 8vh 20px 40px;
  overflow-y: auto;
}
.dm-backdrop-enter-active,
.dm-backdrop-leave-active {
  transition: opacity 220ms ease;
}
.dm-backdrop-enter-from,
.dm-backdrop-leave-to {
  opacity: 0;
}

.dm-panel {
  background: var(--hub-off);
  /* teleportado pra <body>, então não herda a cor de texto de .hub — sem
     isso ele pega a cor do body (branco, tema do grafo) e some no fundo claro */
  color: var(--hub-black);
  font-family: var(--hub-font-body);
  border-radius: 6px;
  width: 100%;
  max-width: 620px;
  position: relative;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
  padding: 36px 36px 28px;
}
.dm-panel-enter-active {
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease;
}
.dm-panel-leave-active {
  transition: transform 200ms ease, opacity 180ms ease;
}
.dm-panel-enter-from,
.dm-panel-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}

.dm-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--hub-line);
  background: #fff;
  color: var(--hub-muted);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  transition: border-color 150ms, color 150ms;
}
.dm-close:hover {
  border-color: var(--hub-red);
  color: var(--hub-red);
}

.dm-head {
  padding-right: 30px;
}
.dm-period {
  display: inline-block;
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--hub-red);
  border: 1px solid var(--hub-red);
  padding: 3px 9px;
  border-radius: 3px;
  margin-bottom: 14px;
}
.dm-code {
  font-size: 15px;
  color: var(--hub-red);
  font-weight: 500;
}
.dm-name {
  font-family: var(--hub-font-display);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.5px;
  margin-top: 4px;
}
.dm-total {
  font-size: 11px;
  color: var(--hub-faint);
  margin-top: 8px;
}

.dm-counts {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-top: 22px;
}
.dm-count {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border: 1px solid var(--hub-line-soft);
  border-radius: 4px;
  padding: 10px 4px 8px;
}
.dm-count-n {
  font-size: 18px;
  font-weight: 600;
  color: var(--hub-red);
  line-height: 1;
}
.dm-count-t {
  font-size: 9px;
  letter-spacing: 0.5px;
  color: var(--hub-muted);
}
.dm-count.zero .dm-count-n {
  color: var(--hub-line);
}
.dm-count.zero .dm-count-t {
  color: var(--hub-faint);
  opacity: 0.6;
}

.dm-body {
  margin-top: 24px;
  border-top: 1px solid var(--hub-line-soft);
  padding-top: 20px;
  max-height: 46vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.dm-empty {
  text-align: center;
  padding: 16px 0 6px;
}
.dm-empty-text {
  font-size: 14px;
  color: var(--hub-muted);
  margin: 0 0 16px;
}
.dm-empty-btn {
  display: inline-flex;
}

.dm-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dm-group-head {
  font-size: 10px;
  letter-spacing: 1.2px;
  color: var(--hub-faint);
}
.dm-group-head .dm-group-n {
  color: var(--hub-red);
}
.dm-file {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 3px;
  color: inherit;
  text-decoration: none;
  transition: background 120ms;
}
.dm-file:not(.no-link):hover {
  background: var(--hub-off-2);
}
.dm-file.no-link {
  cursor: default;
}
.dm-file.no-link .dm-file-dl {
  color: var(--hub-faint);
}
.dm-file-name {
  font-size: 13.5px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dm-file-date {
  font-size: 11px;
  color: var(--hub-faint);
  flex-shrink: 0;
}
.dm-file-dl {
  color: var(--hub-red);
  font-size: 14px;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .dm-backdrop {
    padding: 0;
    align-items: stretch;
  }
  .dm-panel {
    max-width: none;
    width: 100%;
    min-height: 100%;
    border-radius: 0;
    padding: 28px 20px 24px;
  }
  .dm-counts {
    grid-template-columns: repeat(5, 1fr);
    gap: 5px;
  }
  .dm-body {
    max-height: none;
  }
}
</style>
