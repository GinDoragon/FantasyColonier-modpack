import axios from 'axios';
import { BuildContext, ModFile, ModSearchResult, DependencyItem } from '../types/mod';

const CURSEFORGE_BASE_URL = 'https://api.curseforge.com/v1';

export class CurseForgeService {
  private static getHeaders(apiKey: string) {
    const key = apiKey || '$2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6v1uTpKlzhwoueEJQnPnm';
    return {
      'Accept': 'application/json',
      'x-api-key': key,
      'User-Agent': 'PrismLauncher/8.0'
    };
  }

  private static getModLoaderTypeId(loader: string): number {
    switch (loader.toLowerCase()) {
      case 'forge': return 1;
      case 'fabric': return 4;
      case 'quilt': return 5;
      case 'neoforge': return 6;
      default: return 0;
    }
  }

  static async searchMods(query: string, context: BuildContext): Promise<ModSearchResult[]> {
    try {
      // 1. Try search by exact slug first if input is single word / slug format
      if (!query.includes(' ')) {
        const slugUrl = `${CURSEFORGE_BASE_URL}/mods/search?gameId=432&classId=6&slug=${encodeURIComponent(query)}`;
        const slugRes = await axios.get(slugUrl, { headers: this.getHeaders(context.curseforgeApiKey) });
        if (slugRes.data && slugRes.data.data && slugRes.data.data.length > 0) {
          return slugRes.data.data.map((m: any) => this.formatSearchResult(m));
        }
      }

      // 2. Search filter
      const loaderId = this.getModLoaderTypeId(context.modLoader);
      const url = `${CURSEFORGE_BASE_URL}/mods/search?gameId=432&classId=6&gameVersion=${encodeURIComponent(context.gameVersion)}&modLoaderType=${loaderId}&searchFilter=${encodeURIComponent(query)}&pageSize=15`;
      const res = await axios.get(url, { headers: this.getHeaders(context.curseforgeApiKey) });

      if (!res.data || !res.data.data) return [];

      return res.data.data.map((m: any) => this.formatSearchResult(m));
    } catch (error) {
      console.error('CurseForge search error:', error);
      return [];
    }
  }

  static async getMod(modId: number | string, apiKey: string): Promise<any | null> {
    try {
      const url = `${CURSEFORGE_BASE_URL}/mods/${modId}`;
      const res = await axios.get(url, { headers: this.getHeaders(apiKey) });
      return res.data?.data || null;
    } catch (error) {
      return null;
    }
  }

  static async getCompatibleFile(modId: number | string, context: BuildContext): Promise<ModFile | null> {
    try {
      const loaderId = this.getModLoaderTypeId(context.modLoader);
      
      // 1. Try gameVersion + modLoaderType
      let url = `${CURSEFORGE_BASE_URL}/mods/${modId}/files?gameVersion=${encodeURIComponent(context.gameVersion)}&modLoaderType=${loaderId}`;
      let res = await axios.get(url, { headers: this.getHeaders(context.curseforgeApiKey) });
      let files = res.data?.data || [];

      // 2. Fallback: gameVersion only
      if (!files.length) {
        url = `${CURSEFORGE_BASE_URL}/mods/${modId}/files?gameVersion=${encodeURIComponent(context.gameVersion)}`;
        res = await axios.get(url, { headers: this.getHeaders(context.curseforgeApiKey) });
        files = res.data?.data || [];
      }

      // 3. Fallback: pageSize=100
      if (!files.length) {
        url = `${CURSEFORGE_BASE_URL}/mods/${modId}/files?pageSize=100`;
        res = await axios.get(url, { headers: this.getHeaders(context.curseforgeApiKey) });
        const allFiles = res.data?.data || [];
        files = allFiles.filter((f: any) => (f.gameVersions || []).includes(context.gameVersion));
      }

      if (!files.length) return null;

      const topFile = files[0];

      // Convert CurseForge relationType (3 = Required, 2 = Optional, 1 = Embedded, 4 = Incompatible)
      const dependencies: DependencyItem[] = (topFile.dependencies || []).map((dep: any) => ({
        id: dep.modId,
        type: dep.relationType === 3 ? 'required' : dep.relationType === 4 ? 'incompatible' : 'optional',
        platform: 'curseforge'
      }));

      return {
        fileName: topFile.fileName,
        downloadUrl: topFile.downloadUrl || '',
        fileSize: topFile.fileLength || 0,
        dependencies
      };
    } catch (error) {
      console.error(`CurseForge getFile error for ${modId}:`, error);
      return null;
    }
  }

  private static formatSearchResult(m: any): ModSearchResult {
    return {
      id: m.id,
      slug: m.slug,
      name: m.name,
      summary: m.summary || '',
      iconUrl: m.logo?.thumbnailUrl || m.logo?.url || '',
      author: m.authors?.[0]?.name || '',
      platform: 'curseforge',
      downloads: m.downloadCount || 0
    };
  }
}
