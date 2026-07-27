import axios from 'axios';
import { BuildContext, ModFile, ModSearchResult, DependencyItem } from '../types/mod';

const MODRINTH_BASE_URL = 'https://api.modrinth.com/v2';

export class ModrinthService {
  private static getHeaders() {
    return {
      'User-Agent': 'FantasyColonier/ModSeekerApp/1.0'
    };
  }

  static async searchMods(query: string, context: BuildContext): Promise<ModSearchResult[]> {
    try {
      const facets = JSON.stringify([
        [`versions:${context.gameVersion}`],
        [`categories:${context.modLoader}`]
      ]);
      const url = `${MODRINTH_BASE_URL}/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent(facets)}&limit=15`;
      const res = await axios.get(url, { headers: this.getHeaders() });
      
      if (!res.data || !res.data.hits) return [];

      return res.data.hits.map((hit: any) => ({
        id: hit.project_id || hit.slug,
        slug: hit.slug,
        name: hit.title,
        summary: hit.description || '',
        iconUrl: hit.icon_url || '',
        author: hit.author || '',
        platform: 'modrinth',
        downloads: hit.downloads || 0
      }));
    } catch (error) {
      console.error('Modrinth search error:', error);
      return [];
    }
  }

  static async getProject(idOrSlug: string): Promise<any | null> {
    try {
      const url = `${MODRINTH_BASE_URL}/project/${encodeURIComponent(idOrSlug)}`;
      const res = await axios.get(url, { headers: this.getHeaders() });
      return res.data || null;
    } catch (error) {
      return null;
    }
  }

  static async getCompatibleVersion(idOrSlug: string, context: BuildContext): Promise<ModFile | null> {
    try {
      // 1. Try with game_versions & loaders filter
      let url = `${MODRINTH_BASE_URL}/project/${encodeURIComponent(idOrSlug)}/version?game_versions=${encodeURIComponent(JSON.stringify([context.gameVersion]))}&loaders=${encodeURIComponent(JSON.stringify([context.modLoader]))}`;
      let res = await axios.get(url, { headers: this.getHeaders() });
      let versions = res.data || [];

      // 2. Fallback: try game_versions filter only
      if (!versions.length) {
        url = `${MODRINTH_BASE_URL}/project/${encodeURIComponent(idOrSlug)}/version?game_versions=${encodeURIComponent(JSON.stringify([context.gameVersion]))}`;
        res = await axios.get(url, { headers: this.getHeaders() });
        versions = res.data || [];
      }

      if (!versions.length) return null;

      const topVersion = versions[0];
      const primaryFile = topVersion.files.find((f: any) => f.primary) || topVersion.files[0];

      if (!primaryFile) return null;

      const dependencies: DependencyItem[] = (topVersion.dependencies || []).map((dep: any) => ({
        id: dep.project_id || dep.version_id,
        type: dep.dependency_type === 'required' ? 'required' : dep.dependency_type === 'incompatible' ? 'incompatible' : 'optional',
        platform: 'modrinth'
      }));

      return {
        fileName: primaryFile.filename,
        downloadUrl: primaryFile.url,
        fileSize: primaryFile.size || 0,
        dependencies
      };
    } catch (error) {
      console.error(`Modrinth getVersion error for ${idOrSlug}:`, error);
      return null;
    }
  }
}
