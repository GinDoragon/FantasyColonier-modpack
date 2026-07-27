export type ModPlatform = 'modrinth' | 'curseforge' | 'auto';
export type ModLoader = 'forge' | 'neoforge' | 'fabric' | 'quilt';

export interface BuildContext {
  gameVersion: string;
  modLoader: ModLoader;
  curseforgeApiKey: string;
}

export type DependencyType = 'required' | 'optional' | 'incompatible';

export interface DependencyItem {
  id: string | number;
  name?: string;
  slug?: string;
  type: DependencyType;
  platform: ModPlatform;
}

export interface ModFile {
  fileName: string;
  downloadUrl: string;
  fileSize: number;
  dependencies: DependencyItem[];
}

export interface ModSearchResult {
  id: string | number;
  slug: string;
  name: string;
  summary: string;
  iconUrl: string;
  author: string;
  platform: ModPlatform;
  downloads: number;
}

export interface ResolvedModNode {
  key: string; // Unique identifier: platform-id
  id: string | number;
  name: string;
  slug: string;
  iconUrl?: string;
  summary?: string;
  platform: ModPlatform;
  isDependency: boolean;
  file?: ModFile;
  status: 'ok' | 'missing_deps' | 'incompatible' | 'not_found' | 'resolving';
  missingDeps: string[];
  incompatibilities: string[];
  dependencies: ResolvedModNode[];
  downloadState?: 'idle' | 'downloading' | 'completed' | 'error';
  downloadProgress?: number;
  errorMsg?: string;
}

export interface ExportManifest {
  gameVersion: string;
  modLoader: ModLoader;
  createdTime: string;
  mods: Array<{
    name: string;
    slug: string;
    fileName: string;
    downloadUrl: string;
    platform: ModPlatform;
    isDependency: boolean;
  }>;
}
