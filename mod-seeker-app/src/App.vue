<template>
  <div class="app-wrapper">
    <div class="container">
      <!-- Header -->
      <Header :context="context" @update:context="val => Object.assign(context, val)" />

      <!-- Search & Add Bar -->
      <SearchBar :context="context" @add-mod="handleAddMod" />

      <!-- Quick Preset Actions -->
      <div class="glass-panel presets-bar">
        <span class="presets-label">⚡ Quick Presets:</span>
        <button @click="loadPreset('fantasy')" class="btn btn-secondary preset-btn">
          <span>🎮 FantasyColonier Pack (20 Mods)</span>
        </button>
        <button @click="loadPreset('essential')" class="btn btn-secondary preset-btn">
          <span>🛠️ Performance & Essentials</span>
        </button>
        <button v-if="resolvedNodes.length > 0" @click="clearAll" class="btn btn-secondary preset-btn clear-all-btn">
          <span>🗑️ Clear List</span>
        </button>
      </div>

      <!-- Stats Summary & Global Actions -->
      <div v-if="resolvedNodes.length > 0" class="glass-panel stats-bar animate-fade-in">
        <div class="stat-item">
          <span class="stat-value">{{ totalUniqueMods }}</span>
          <span class="stat-label">Total Unique Mods</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ formattedTotalSize }}</span>
          <span class="stat-label">Total Pack Size</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value" :class="{ 'text-warn': missingCount > 0 }">{{ missingCount }}</span>
          <span class="stat-label">Missing Libraries</span>
        </div>

        <div class="stats-actions">
          <button @click="packModpack" class="btn btn-secondary" :disabled="isPacking">
            <span>{{ isPacking ? '📦 Packing...' : '📦 Pack Release ZIP' }}</span>
          </button>
          <button @click="downloadAllFiles" class="btn btn-primary" :disabled="isBatchDownloading">
            <span>{{ isBatchDownloading ? 'Downloading...' : '⬇️ Download All .jar' }}</span>
          </button>
          <button @click="isExportModalOpen = true" class="btn btn-secondary">
            <span>📦 Export Manifest</span>
          </button>
        </div>
      </div>

      <!-- Mod Tree List -->
      <div v-if="isResolvingGlobal" class="glass-panel loading-banner animate-fade-in">
        <span class="spinner">⏳</span>
        <span>Resolving mod tree & dependencies recursively...</span>
      </div>

      <div v-else-if="resolvedNodes.length > 0" class="mod-tree-list">
        <ModTree
          v-for="node in resolvedNodes"
          :key="node.key"
          :node="node"
          :context="context"
          @remove-node="removeNode"
        />
      </div>

      <div v-else class="glass-panel empty-state">
        <div class="empty-icon">📦</div>
        <h3>No Mods Added Yet</h3>
        <p>Use the search bar above or click a quick preset to analyze dependencies!</p>
      </div>

      <!-- Export Modal -->
      <ExportModal 
        :is-open="isExportModalOpen" 
        :nodes="resolvedNodes" 
        :context="context"
        @close="isExportModalOpen = false" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { BuildContext, ResolvedModNode, ModPlatform } from './types/mod';
import { ResolverService } from './services/resolver.service';
import { ExporterService } from './services/exporter.service';

import Header from './components/Header.vue';
import SearchBar from './components/SearchBar.vue';
import ModTree from './components/ModTree.vue';
import ExportModal from './components/ExportModal.vue';

const context = reactive<BuildContext>({
  gameVersion: '1.20.1',
  modLoader: 'forge',
  curseforgeApiKey: '$2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6v1uTpKlzhwoueEJQnPnm'
});

const resolvedNodes = ref<ResolvedModNode[]>([]);
const isResolvingGlobal = ref(false);
const isBatchDownloading = ref(false);
const isExportModalOpen = ref(false);
const isPacking = ref(false);

const uniqueMods = computed(() => ExporterService.getUniqueModFiles(resolvedNodes.value));
const totalUniqueMods = computed(() => uniqueMods.value.length);

const formattedTotalSize = computed(() => {
  const totalBytes = uniqueMods.value.reduce((acc, curr) => acc + (curr.file?.fileSize || 0), 0);
  if (!totalBytes) return '0 MB';
  return (totalBytes / (1024 * 1024)).toFixed(1) + ' MB';
});

const missingCount = computed(() => {
  return resolvedNodes.value.filter(n => n.status === 'missing_deps' || n.status === 'not_found').length;
});

// Re-resolve tree if build context changes (gameVersion / modLoader)
watch(() => [context.gameVersion, context.modLoader], async () => {
  if (resolvedNodes.value.length === 0) return;
  isResolvingGlobal.value = true;
  try {
    const currentKeys = resolvedNodes.value.filter(n => !n.isDependency).map(n => ({ query: String(n.id), platform: n.platform }));
    resolvedNodes.value = [];
    for (const item of currentKeys) {
      const node = await ResolverService.resolveMod(item.query, item.platform, context);
      resolvedNodes.value.push(node);
    }
  } finally {
    isResolvingGlobal.value = false;
  }
});

async function packModpack() {
  isPacking.value = true;
  try {
    const res = await fetch('/api/package-modpack', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert('Modpack packed successfully to: ' + data.path);
    } else {
      alert('Failed to pack modpack: ' + data.error);
    }
  } catch (err: any) {
    alert('Failed to trigger packing: ' + err.message);
  } finally {
    isPacking.value = false;
  }
}

async function handleAddMod(item: { query: string; platform: ModPlatform }) {
  isResolvingGlobal.value = true;
  try {
    const detectedPlatform = ResolverService.detectPlatform(item.query, item.platform);
    const node = await ResolverService.resolveMod(item.query, detectedPlatform, context);
    
    // Check if already added
    const existsIndex = resolvedNodes.value.findIndex(n => n.key === node.key);
    if (existsIndex >= 0) {
      resolvedNodes.value[existsIndex] = node;
    } else {
      resolvedNodes.value.push(node);
    }
  } finally {
    isResolvingGlobal.value = false;
  }
}

function removeNode(key: string) {
  resolvedNodes.value = resolvedNodes.value.filter(n => n.key !== key);
}

function clearAll() {
  resolvedNodes.value = [];
}

async function loadPreset(preset: 'fantasy' | 'essential') {
  clearAll();
  isResolvingGlobal.value = true;
  
  const fantasyList = [
    'create', 'embeddium', 'alexs-mobs', 'irons-spells-n-spellbooks', 
    'farmers-delight', 'simply-swords', 'when-dungeons-arise', 
    'serene-seasons', 'modernfix', 'ferritecore', 'immediatelyfast', 
    'drippy-loading-screen', 'watermedia', 'ftb-quests', 'ftb-teams', 'lootr'
  ];

  const essentialList = ['embeddium', 'modernfix', 'ferritecore', 'immediatelyfast'];

  const targets = preset === 'fantasy' ? fantasyList : essentialList;

  try {
    for (const modSlug of targets) {
      const node = await ResolverService.resolveMod(modSlug, 'curseforge', context);
      resolvedNodes.value.push(node);
    }
  } finally {
    isResolvingGlobal.value = false;
  }
}

function downloadAllFiles() {
  const items = uniqueMods.value;
  if (!items.length) return;

  isBatchDownloading.value = true;
  items.forEach((item, index) => {
    if (item.file?.downloadUrl) {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = item.file!.downloadUrl;
        link.download = item.file!.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 400); // Stagger downloads
    }
  });

  setTimeout(() => {
    isBatchDownloading.value = false;
  }, items.length * 400 + 1000);
}
</script>

<style scoped>
.app-wrapper {
  padding: 32px 20px;
  min-height: 100vh;
}

.container {
  max-width: 1080px;
  margin: 0 auto;
}

.presets-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.presets-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-dim);
}

.preset-btn {
  font-size: 0.82rem;
  padding: 6px 12px;
}

.clear-all-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #F87171;
}

.stats-bar {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  margin-bottom: 24px;
  gap: 24px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-family: var(--font-heading);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.text-warn {
  color: #FBBF24;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: var(--glass-border);
}

.stats-actions {
  margin-left: auto;
  display: flex;
  gap: 12px;
}

.loading-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  font-size: 1.05rem;
  color: #A5B4FC;
}

.spinner {
  font-size: 1.5rem;
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 12px;
}

.empty-state h3 {
  font-family: var(--font-heading);
  font-size: 1.3rem;
  color: var(--text-main);
  margin-bottom: 6px;
}

.empty-state p {
  color: var(--text-muted);
  font-size: 0.9rem;
}
</style>
