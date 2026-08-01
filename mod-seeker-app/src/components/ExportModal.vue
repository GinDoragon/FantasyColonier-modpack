<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="glass-panel modal-card animate-fade-in">
      <div class="modal-header">
        <h2>Export Modpack Manifest</h2>
        <button @click="$emit('close')" class="close-btn">✕</button>
      </div>

      <div class="modal-body">
        <!-- Format selector tabs -->
        <div class="format-tabs">
          <button 
            v-for="fmt in formats" 
            :key="fmt.id"
            :class="['tab-btn', { active: activeFormat === fmt.id }]"
            @click="activeFormat = fmt.id"
          >
            <span>{{ fmt.label }}</span>
          </button>
        </div>

        <!-- Preview area (not shown for mrpack binary) -->
        <div v-if="activeFormat !== 'mrpack'" class="code-preview-wrapper">
          <textarea readonly class="code-preview" :value="previewContent"></textarea>
        </div>
        <div v-else class="mrpack-info">
          <div class="mrpack-info__icon">📦</div>
          <h3>Modrinth Pack Format</h3>
          <p>
            Будет создан .mrpack файл (ZIP-архив), содержащий <code>modrinth.index.json</code>
            с {{ uniqueModCount }} модами для Minecraft {{ context.gameVersion }} ({{ context.modLoader }}).
          </p>
          <p class="mrpack-info__note">
            Совместим с Prism Launcher, MultiMC, ATLauncher и Modrinth App.
          </p>
        </div>
      </div>

      <div class="modal-footer">
        <button v-if="activeFormat !== 'mrpack'" @click="copyToClipboard" class="btn btn-secondary">
          <span>{{ copied ? '✓ Copied!' : '📋 Copy to Clipboard' }}</span>
        </button>
        <button @click="downloadFile" class="btn btn-primary">
          <span>⬇️ Download {{ currentFilename }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ResolvedModNode, BuildContext } from '../types/mod';
import { ExporterService } from '../services/exporter.service';

const props = defineProps<{
  isOpen: boolean;
  nodes: ResolvedModNode[];
  context: BuildContext;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const activeFormat = ref<'mods' | 'packwiz' | 'json' | 'mrpack'>('json');
const copied = ref(false);

const formats = [
  { id: 'json' as const, label: 'Launcher Manifest (.json)' },
  { id: 'mrpack' as const, label: 'Modrinth Pack (.mrpack)' },
  { id: 'packwiz' as const, label: 'Packwiz (.pw.toml)' },
  { id: 'mods' as const, label: 'Plain Links (mods.txt)' }
];

const uniqueModCount = computed(() => ExporterService.getUniqueModFiles(props.nodes).length);

const previewContent = computed(() => {
  if (activeFormat.value === 'json') {
    return ExporterService.exportJsonManifest(props.nodes, props.context);
  } else if (activeFormat.value === 'packwiz') {
    return ExporterService.exportPackwiz(props.nodes, props.context);
  } else if (activeFormat.value === 'mrpack') {
    return ExporterService.exportMrpackManifest(props.nodes, props.context);
  } else {
    return ExporterService.exportModsTxt(props.nodes);
  }
});

const currentFilename = computed(() => {
  if (activeFormat.value === 'json') return 'modpack-manifest.json';
  if (activeFormat.value === 'mrpack') return 'FantasyColonier.mrpack';
  if (activeFormat.value === 'packwiz') return 'pack.pw.toml';
  return 'mods.txt';
});

async function copyToClipboard() {
  await navigator.clipboard.writeText(previewContent.value);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
}

async function downloadFile() {
  if (activeFormat.value === 'mrpack') {
    await ExporterService.downloadMrpack(props.nodes, props.context);
  } else {
    const mime = activeFormat.value === 'json' ? 'application/json' : 'text/plain';
    ExporterService.downloadTextFile(currentFilename.value, previewContent.value, mime);
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  z-index: 200;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 680px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-family: var(--font-heading);
  font-size: 1.3rem;
  color: var(--text-main);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.format-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 14px;
  border-radius: var(--radius-md);
  background: rgba(15, 20, 32, 0.8);
  border: 1px solid var(--glass-border);
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-dim);
  border-color: var(--color-primary);
}

.tab-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.code-preview-wrapper {
  flex: 1;
  min-height: 280px;
}

.code-preview {
  width: 100%;
  height: 100%;
  min-height: 280px;
  background: rgba(10, 14, 22, 0.9);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: #A5B4FC;
  font-family: monospace;
  font-size: 0.85rem;
  padding: 14px;
  outline: none;
  resize: none;
}

.mrpack-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  background: rgba(10, 14, 22, 0.5);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
}

.mrpack-info__icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.mrpack-info h3 {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  color: var(--text-main);
  margin-bottom: 8px;
}

.mrpack-info p {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
  max-width: 400px;
}

.mrpack-info code {
  background: rgba(165, 180, 252, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  color: #A5B4FC;
  font-size: 0.85em;
}

.mrpack-info__note {
  color: var(--text-dim) !important;
  font-size: 0.8rem !important;
  margin-top: 8px !important;
  font-style: italic;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
