<template>
  <header class="glass-panel header-container">
    <div class="brand">
      <div class="logo-icon">🔍</div>
      <div>
        <h1 class="app-title">Mod Seeker</h1>
        <p class="app-subtitle">Minecraft Dependency Analyzer & Modpack Manager</p>
      </div>
    </div>

    <!-- Build Context Selectors -->
    <div class="context-controls">
      <div class="control-group">
        <label class="control-label">Minecraft</label>
        <select v-model="localContext.gameVersion" @change="emitUpdate" class="custom-select">
          <option value="1.20.1">1.20.1</option>
          <option value="1.20.4">1.20.4</option>
          <option value="1.19.2">1.19.2</option>
          <option value="1.18.2">1.18.2</option>
          <option value="1.16.5">1.16.5</option>
        </select>
      </div>

      <div class="control-group">
        <label class="control-label">Modloader</label>
        <select v-model="localContext.modLoader" @change="emitUpdate" class="custom-select">
          <option value="forge">Forge</option>
          <option value="neoforge">NeoForge</option>
          <option value="fabric">Fabric</option>
          <option value="quilt">Quilt</option>
        </select>
      </div>

      <div class="control-group key-group">
        <label class="control-label">CurseForge API Key</label>
        <input 
          type="password" 
          v-model="localContext.curseforgeApiKey" 
          @change="emitUpdate"
          placeholder="Community Key (Default)"
          class="custom-input"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { BuildContext } from '../types/mod';

const props = defineProps<{
  context: BuildContext;
}>();

const emit = defineEmits<{
  (e: 'update:context', val: BuildContext): void;
}>();

const localContext = reactive<BuildContext>({ ...props.context });

watch(() => props.context, (newVal) => {
  Object.assign(localContext, newVal);
}, { deep: true });

function emitUpdate() {
  emit('update:context', { ...localContext });
}
</script>

<style scoped>
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-icon {
  font-size: 2rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
  border: 1px solid var(--glass-border);
  padding: 10px;
  border-radius: var(--radius-md);
}

.app-title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #FFF, #9CA3AF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.app-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.context-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.custom-select, .custom-input {
  background: rgba(15, 20, 32, 0.8);
  border: 1px solid var(--glass-border);
  color: var(--text-main);
  padding: 8px 14px;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-family: var(--font-body);
  outline: none;
  transition: border-color 0.2s ease;
}

.custom-select:focus, .custom-input:focus {
  border-color: var(--color-primary);
}

.key-group {
  min-width: 220px;
}
</style>
