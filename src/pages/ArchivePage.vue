<script setup>
import { navigate } from '../router'
import { CONTRIBUTE_FORM_URL } from '../config'
import {
  archiveState,
  filteredPeriods,
  openDiscipline,
  typeCounts,
  TYPES,
  totalDisciplines,
  totalPeriods,
} from '../data/useArchive'
import SiteNav from '../components/hub/SiteNav.vue'
import SiteFooter from '../components/hub/SiteFooter.vue'
import DisciplineModal from '../components/hub/DisciplineModal.vue'

const typeLabels = { todos: 'Todos', prova: 'Provas', lista: 'Listas', resumo: 'Resumos', slide: 'Slides', livro: 'Livros' }
const typeFilters = ['todos', ...TYPES]

function jumpTo(period) {
  const el = document.getElementById('periodo-' + period)
  if (!el) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <div class="hub">
    <site-nav></site-nav>

    <header class="arc-head hub-wrap">
      <div class="hub-eyebrow" v-reveal="0">02 — ERO Archive</div>
      <div class="arc-head-row" v-reveal="1">
        <div>
          <h1 class="arc-h1">Materiais da turma.</h1>
          <p class="arc-sub">Materiais organizados por disciplina, mantidos pela turma.</p>
        </div>
        <span class="hub-mono badge">{{ totalDisciplines }} disciplinas · {{ totalPeriods }} períodos</span>
      </div>
    </header>

    <div class="arc-search-wrap hub-wrap" v-reveal="0">
      <div class="arc-search hub-search-box">
        <span class="hub-mono search-ph" :class="{ hidden: archiveState.search }">_ buscar por disciplina, tipo ou conteúdo...</span>
        <input
          v-model="archiveState.search"
          type="text"
          class="arc-search-input hub-mono"
          aria-label="Buscar no archive"
        />
        <span class="hub-caret" :class="{ hidden: archiveState.search }" aria-hidden="true"></span>
      </div>
      <div class="arc-filters">
        <button
          v-for="f in typeFilters"
          :key="f"
          class="hub-pill"
          :class="{ active: archiveState.activeType === f }"
          @click="archiveState.activeType = f"
        >
          {{ typeLabels[f] }}
        </button>
      </div>
    </div>

    <!-- atalho de período: só aparece em telas estreitas, onde os 55 cards
         em coluna única viram uma rolagem bem longa -->
    <nav v-if="filteredPeriods.length > 1" class="arc-jump hub-wrap" aria-label="Ir para período">
      <button v-for="p in filteredPeriods" :key="p.period" class="arc-jump-chip hub-mono" @click="jumpTo(p.period)">
        {{ p.period }}º
      </button>
    </nav>

    <main class="arc-body hub-wrap">
      <div v-if="!filteredPeriods.length" class="arc-empty hub-mono">Nenhum material encontrado.</div>

      <section v-for="p in filteredPeriods" :key="p.period" :id="'periodo-' + p.period" class="arc-period">
        <div class="arc-period-head" v-reveal="0">
          <span class="arc-period-title">{{ p.title }}</span>
          <span class="hub-mono arc-period-count">{{ p.count }}</span>
          <div class="arc-period-rule"></div>
        </div>
        <div class="arc-grid">
          <article
            v-for="(c, i) in p.disciplines"
            :key="c.code"
            class="arc-card hub-scan-card hub-lift hub-clickable"
            v-reveal="i"
            @click="openDiscipline(c.code)"
          >
            <div class="arc-card-top">
              <span class="arc-card-code hub-mono">{{ c.code }}</span>
              <span class="hub-mono arc-card-files">{{ c.files.length }} arquivos</span>
            </div>
            <div class="arc-card-name">{{ c.name }}</div>
            <div class="arc-counts">
              <div
                v-for="tc in typeCounts(c)"
                :key="tc.type"
                class="arc-count"
                :class="{ zero: tc.count === 0 }"
              >
                <span class="arc-count-n hub-mono">{{ tc.count }}</span>
                <span class="arc-count-t hub-mono">{{ tc.type }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <div class="arc-contribute" v-reveal="0">
        <div>
          <div class="arc-contribute-title">Tem material pra compartilhar?</div>
          <div class="arc-contribute-desc">Envie pelo formulário — disciplina, tipo de material e o link do arquivo.</div>
        </div>
        <a
          v-if="CONTRIBUTE_FORM_URL"
          class="hub-btn ghost-light"
          :href="CONTRIBUTE_FORM_URL"
          target="_blank"
          rel="noopener noreferrer"
        >Contribuir <span class="red">→</span></a>
        <button v-else class="hub-btn ghost-light" disabled title="Configure VITE_CONTRIBUTE_FORM_URL">
          Contribuir <span class="red">→</span>
        </button>
      </div>
    </main>

    <site-footer></site-footer>
    <discipline-modal></discipline-modal>
  </div>
</template>

<style scoped>
.arc-head {
  padding: 56px 0 32px;
}
.arc-head-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.arc-h1 {
  font-family: var(--hub-font-display);
  font-weight: 600;
  font-size: 42px;
  letter-spacing: -1px;
  margin: 0 0 10px;
}
.arc-sub {
  font-size: 17px;
  color: var(--hub-muted);
  margin: 0;
}
.badge {
  font-size: 12px;
  color: var(--hub-black);
  border: 1px solid var(--hub-line);
  padding: 7px 12px;
  border-radius: 3px;
  white-space: nowrap;
}

.arc-search-wrap {
  padding-bottom: 8px;
}
.arc-search {
  width: 100%;
}
.search-ph {
  position: absolute;
  left: 18px;
  font-size: 16px;
  color: var(--hub-faint);
  pointer-events: none;
  transition: opacity 120ms;
}
.search-ph.hidden {
  opacity: 0;
}
.hub-caret.hidden {
  display: none;
}
.arc-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 16px;
  color: var(--hub-black);
  position: relative;
  z-index: 1;
}
.arc-filters {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.arc-jump {
  display: none;
}

.arc-body {
  padding: 40px 0 64px;
}
.arc-period {
  scroll-margin-top: 66px;
}
.arc-empty {
  color: var(--hub-faint);
  padding: 40px 0;
  font-size: 13px;
}
.arc-period {
  margin-bottom: 44px;
}
.arc-period-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}
.arc-period-title {
  font-family: var(--hub-font-display);
  font-size: 22px;
  font-weight: 600;
}
.arc-period-count {
  font-size: 12px;
  color: var(--hub-faint);
}
.arc-period-rule {
  flex: 1;
  height: 1px;
  background: var(--hub-line);
}
.arc-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: start;
}
.arc-card {
  background: #fff;
  border: 1px solid var(--hub-line);
  border-radius: 4px;
  padding: 20px;
  cursor: pointer;
}
.arc-card:hover {
  border-color: #b8b8b8;
}
.arc-card-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.arc-card-code {
  font-size: 14px;
  color: var(--hub-red);
  font-weight: 500;
}
.arc-card-files {
  font-size: 11px;
  color: var(--hub-faint);
}
.arc-card-name {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.3;
  margin-bottom: 14px;
}
.arc-counts {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.arc-count {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  border: 1px solid var(--hub-line-soft);
  border-radius: 3px;
  padding: 6px 2px 5px;
}
.arc-count-n {
  font-size: 14px;
  font-weight: 600;
  color: var(--hub-red);
  line-height: 1;
}
.arc-count-t {
  font-size: 8px;
  letter-spacing: 0.5px;
  color: var(--hub-muted);
}
.arc-count.zero .arc-count-n {
  color: var(--hub-line);
}
.arc-count.zero .arc-count-t {
  color: var(--hub-faint);
  opacity: 0.6;
}
.arc-contribute {
  margin-top: 20px;
  background: var(--hub-off-2);
  border: 1px solid var(--hub-line);
  border-radius: 4px;
  padding: 32px 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.arc-contribute-title {
  font-family: var(--hub-font-display);
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 6px;
}
.arc-contribute-desc {
  font-size: 15px;
  color: var(--hub-muted);
}
.red {
  color: var(--hub-red);
}

@media (max-width: 900px) {
  .arc-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .hub-wrap {
    padding: 0 20px;
  }
  .arc-grid {
    grid-template-columns: 1fr;
  }
  .arc-h1 {
    font-size: 32px;
  }
  .arc-jump {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-top: 4px;
    padding-bottom: 14px;
    position: sticky;
    top: 0;
    z-index: 15;
    background: var(--hub-off);
  }
  .arc-jump::-webkit-scrollbar {
    display: none;
  }
  .arc-jump-chip {
    flex: 0 0 auto;
    font-size: 12px;
    padding: 7px 13px;
    border-radius: 3px;
    border: 1px solid var(--hub-line);
    background: #fff;
    color: var(--hub-muted);
    cursor: pointer;
  }
  .arc-jump-chip:active {
    border-color: var(--hub-red);
    color: var(--hub-red);
  }
}
</style>
