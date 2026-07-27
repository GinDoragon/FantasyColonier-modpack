<template>
  <div class="search-bar-wrapper">
    <div class="glass-panel search-input-card">
      <div class="search-field">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          v-model="query"
          @input="onInput"
          @keyup.enter="triggerAdd"
          placeholder="Enter mod name, slug, or paste CurseForge / Modrinth URL (e.g. create, alexs-mobs)..."
          class="search-input"
        />
        <button v-if="query" @click="clearQuery" class="clear-btn">✕</button>
      </div>

      <!-- Platform selector -->
      <div class="platform-selector">
        <button 
          v-for="p in platforms" 
          :key="p.id"
          :class="['platform-btn', { active: selectedPlatform === p.id }]"
          @click="selectedPlatform = p.id"
        >
          <span class="platform-icon">{{ p.icon }}</span>
          <span>{{ p.label }}</span>
        </button>
      </div>

      <button @click="triggerAdd" class="btn btn-primary add-btn" :disabled="!query.trim() || isSearching">
        <span>{{ isSearching ? 'Searching...' : 'Analyze & Add' }}</span>
      </button>
    </div>

    <!-- Live Search Results Dropdown -->
    <div v-if="searchResults.length > 0 && showDropdown" class="glass-panel search-results-dropdown animate-fade-in">
      <div 
        v-for="res in searchResults" 
        :key="`${res.platform}-${res.id}`"
        @click="selectResult(res)"
        class="result-item"
      >
        <img :src="res.iconUrl || defaultModIcon" class="mod-icon" alt="icon" @error="onImageError" />
        <div class="result-info">
          <div class="result-header">
            <span class="result-name">{{ res.name }}</span>
            <span :class="['platform-badge', res.platform]">{{ res.platform }}</span>
          </div>
          <p class="result-summary">{{ res.summary }}</p>
        </div>
        <button class="btn btn-secondary select-btn">Select</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ModPlatform, ModSearchResult, BuildContext } from '../types/mod';
import { ModrinthService } from '../services/modrinth.service';
import { CurseForgeService } from '../services/curseforge.service';

const props = defineProps<{
  context: BuildContext;
}>();

const emit = defineEmits<{
  (e: 'add-mod', item: { query: string; platform: ModPlatform }): void;
}>();

const query = ref('');
const selectedPlatform = ref<ModPlatform>('auto');
const isSearching = ref(false);
const showDropdown = ref(false);
const searchResults = ref<ModSearchResult[]>([]);

const defaultModIcon = 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/box.svg';

const platforms = [
  { id: 'auto' as ModPlatform, label: 'Auto Detect', icon: '⚡' },
  { id: 'curseforge' as ModPlatform, label: 'CurseForge', icon: '🔥' },
  { id: 'modrinth' as ModPlatform, label: 'Modrinth', icon: '🟢' }
];

let searchTimeout: any = null;

function onInput() {
  clearTimeout(searchTimeout);
  if (!query.value.trim() || query.value.startsWith('http')) {
    searchResults.value = [];
    showDropdown.value = false;
    return;
  }

  searchTimeout = setTimeout(async () => {
    isSearching.value = true;
    try {
      if (selectedPlatform.value === 'modrinth') {
        searchResults.value = await ModrinthService.searchMods(query.value, props.context);
      } else if (selectedPlatform.value === 'curseforge') {
        searchResults.value = await CurseForgeService.searchMods(query.value, props.context);
      } else {
        const [cf, mr] = await Promise.all([
          CurseForgeService.searchMods(query.value, props.context),
          ModrinthService.searchMods(query.value, props.context)
        ]);
        searchResults.value = [...cf, ...mr];
      }
      showDropdown.value = searchResults.value.length > 0;
    } finally {
      isSearching.value = false;
    }
  }, 400);
}

function clearQuery() {
  query.value = '';
  searchResults.value = [];
  showDropdown.value = false;
}

function selectResult(res: ModSearchResult) {
  emit('add-mod', { query: res.slug || String(res.id), platform: res.platform });
  clearQuery();
}

function triggerAdd() {
  if (!query.value.trim()) return;
  emit('add-mod', { query: query.value.trim(), platform: selectedPlatform.value });
  clearQuery();
}

function onImageError(e: Event) {
  (e.target as HTMLImageElement).src = defaultModIcon;
}
</script>

<style scoped>
.search-bar-wrapper {
  position: relative;
  margin-bottom: 24px;
}

.search-input-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  flex-wrap: wrap;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 280px;
  background: rgba(15, 20, 32, 0.8);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 8px 14px;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 0.95rem;
  outline: none;
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 1rem;
}

.platform-selector {
  display: flex;
  background: rgba(15, 20, 32, 0.8);
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
}

.platform-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.platform-btn.active {
  background: var(--color-primary);
  color: white;
}

.search-results-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 100;
  max-height: 380px;
  overflow-y: auto;
  padding: 10px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s ease;
}

.result-item:hover {
  background: rgba(99, 102, 241, 0.15);
}

.mod-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: rgba(255, 255, 255, 0.05);
}

.result-info {
  flex: 1;
  overflow: hidden;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-name {
  font-weight: 600;
  color: var(--text-main);
  font-size: 0.95rem;
}

.result-summary {
  font-size: 0.78rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.platform-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.platform-badge.curseforge {
  background: rgba(249, 115, 22, 0.2);
  color: #FB923C;
}

.platform-badge.modrinth {
  background: rgba(34, 197, 94, 0.2);
  color: #4ADE80;
}
</style>
