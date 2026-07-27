<template>
  <div class="mod-tree-node" :class="{ 'is-dependency': node.isDependency }">
    <div class="glass-panel node-card" :class="node.status">
      <div class="node-main">
        <button v-if="node.dependencies.length > 0" @click="isExpanded = !isExpanded" class="toggle-btn">
          {{ isExpanded ? '▼' : '▶' }}
        </button>
        <span v-else class="indent-space"></span>

        <img :src="node.iconUrl || defaultModIcon" class="node-icon" alt="icon" @error="onImageError" />

        <div class="node-details">
          <div class="title-row">
            <h3 class="node-title">{{ node.name }}</h3>
            <span :class="['platform-tag', node.platform]">{{ node.platform }}</span>
            <span v-if="node.isDependency" class="dep-tag">Library</span>
          </div>

          <div class="file-info" v-if="node.file">
            <span class="file-name">📦 {{ node.file.fileName }}</span>
            <span class="file-size">({{ formatSize(node.file.fileSize) }})</span>
          </div>
          <div class="file-info error-text" v-else>
            ⚠️ No compatible {{ context.gameVersion }} {{ context.modLoader }} file found!
          </div>
        </div>

        <!-- Status Badges -->
        <div class="status-badge-container">
          <span v-if="node.status === 'ok'" class="badge badge-ok">✓ Complete</span>
          <span v-else-if="node.status === 'missing_deps'" class="badge badge-warn" :title="node.missingDeps.join(', ')">
            ⚠️ Missing ({{ node.missingDeps.length }})
          </span>
          <span v-else-if="node.status === 'incompatible'" class="badge badge-danger" :title="node.incompatibilities.join(', ')">
            ❌ Incompatible
          </span>
          <span v-else-if="node.status === 'not_found'" class="badge badge-danger">
            ❌ Not Found
          </span>
          <span v-else-if="node.status === 'resolving'" class="badge badge-warn">
            ⏳ Resolving...
          </span>
        </div>

        <!-- Action buttons -->
        <div class="node-actions">
          <a 
            v-if="node.file && node.file.downloadUrl" 
            :href="node.file.downloadUrl" 
            target="_blank" 
            download
            class="btn btn-secondary action-btn download-btn"
            title="Download .jar file"
          >
            ⬇️ Jar
          </a>
          <button v-if="!node.isDependency" @click="$emit('remove-node', node.key)" class="btn btn-secondary action-btn remove-btn" title="Remove mod">
            🗑️
          </button>
        </div>
      </div>

      <!-- Missing dependencies / Incompatibility warnings details -->
      <div v-if="node.missingDeps.length > 0" class="warning-box">
        <strong>⚠️ Missing required libraries:</strong> {{ node.missingDeps.join(', ') }}
      </div>
      <div v-if="node.incompatibilities.length > 0" class="warning-box danger">
        <strong>❌ Declared incompatibilities:</strong> {{ node.incompatibilities.join(', ') }}
      </div>
    </div>

    <!-- Recursive Children -->
    <div v-if="isExpanded && node.dependencies.length > 0" class="children-container">
      <ModTree
        v-for="child in node.dependencies"
        :key="child.key"
        :node="child"
        :context="context"
        @remove-node="$emit('remove-node', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ResolvedModNode, BuildContext } from '../types/mod';

defineProps<{
  node: ResolvedModNode;
  context: BuildContext;
}>();

defineEmits<{
  (e: 'remove-node', key: string): void;
}>();

const isExpanded = ref(true);
const defaultModIcon = 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/box.svg';

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function onImageError(e: Event) {
  (e.target as HTMLImageElement).src = defaultModIcon;
}
</script>

<style scoped>
.mod-tree-node {
  margin-bottom: 12px;
}

.is-dependency {
  margin-left: 28px;
  position: relative;
}

.is-dependency::before {
  content: '';
  position: absolute;
  left: -16px;
  top: -8px;
  bottom: 20px;
  width: 2px;
  background: var(--glass-border);
}

.node-card {
  padding: 14px 18px;
}

.node-card.missing_deps {
  border-color: rgba(245, 158, 11, 0.4);
}

.node-card.incompatible, .node-card.not_found {
  border-color: rgba(239, 68, 68, 0.4);
}

.node-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 4px;
}

.indent-space {
  width: 14px;
}

.node-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: rgba(255, 255, 255, 0.05);
}

.node-details {
  flex: 1;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-title {
  font-family: var(--font-heading);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-main);
}

.platform-tag {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.platform-tag.curseforge {
  background: rgba(249, 115, 22, 0.2);
  color: #FB923C;
}

.platform-tag.modrinth {
  background: rgba(34, 197, 94, 0.2);
  color: #4ADE80;
}

.dep-tag {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(168, 85, 247, 0.2);
  color: #C084FC;
}

.file-info {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.file-name {
  font-family: monospace;
  color: #A5B4FC;
}

.error-text {
  color: #F87171;
}

.node-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  font-size: 0.8rem;
  text-decoration: none;
}

.warning-box {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #FCD34D;
  font-size: 0.82rem;
}

.warning-box.danger {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #FCA5A5;
}

.children-container {
  margin-top: 8px;
}
</style>
