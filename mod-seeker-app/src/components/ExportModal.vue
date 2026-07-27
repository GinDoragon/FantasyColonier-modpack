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

        <!-- Preview area -->
        <div class="code-preview-wrapper">
          <textarea readonly class="code-preview" :value="previewContent"></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="copyToClipboard" class="btn btn-secondary">
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

const activeFormat = ref<'mods' | 'packwiz' | 'json'>('json');
const copied = ref(false);

const formats = [
  { id: 'json' as const, label: 'Launcher Manifest (.json)' },
  { id: 'packwiz' as const, label: 'Packwiz (.pw.toml)' },
  { id: 'mods' as const, label: 'Plain Links (mods.txt)' }
];

const previewContent = computed(() => {
  if (activeFormat.value === 'json') {
    return ExporterService.exportJsonManifest(props.nodes, props.context);
  } else if (activeFormat.value === 'packwiz') {
    return ExporterService.exportPackwiz(props.nodes, props.context);
  } else {
    return ExporterService.exportModsTxt(props.nodes);
  }
});

const currentFilename = computed(() => {
  if (activeFormat.value === 'json') return 'modpack-manifest.json';
  if (activeFormat.value === 'packwiz') return 'pack.pw.toml';
  return 'mods.txt';
});

async function copyToClipboard() {
  await navigator.clipboard.writeText(previewContent.value);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
}

function downloadFile() {
  const mime = activeFormat.value === 'json' ? 'application/json' : 'text/plain';
  ExporterService.downloadTextFile(currentFilename.value, previewContent.value, mime);
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
}

.tab-btn {
  padding: 8px 14px;
  border-radius: var(--radius-md);
  background: rgba(15, 20, 32, 0.8);
  border: 1px solid var(--glass-border);
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.tab-btn.active {
  background: var(--color-primary);
  color: white;
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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
