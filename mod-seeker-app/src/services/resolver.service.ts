import { BuildContext, ModPlatform, ResolvedModNode, ModFile } from '../types/mod';
import { ModrinthService } from './modrinth.service';
import { CurseForgeService } from './curseforge.service';

export class ResolverService {
  /**
   * Detects platform from input string (URL, slug, or search result)
   */
  static detectPlatform(input: string, explicitPlatform: ModPlatform = 'auto'): ModPlatform {
    if (explicitPlatform !== 'auto') return explicitPlatform;
    if (input.includes('modrinth.com')) return 'modrinth';
    if (input.includes('curseforge.com')) return 'curseforge';
    return 'curseforge'; // default platform
  }

  /**
   * Resolves a target mod and its entire tree of required dependencies recursively
   */
  static async resolveMod(
    queryOrId: string | number,
    platform: ModPlatform,
    context: BuildContext,
    isDependency = false,
    visited = new Set<string>()
  ): Promise<ResolvedModNode> {
    const key = `${platform}-${queryOrId}`;
    
    // Cyclic prevention
    if (visited.has(key)) {
      return {
        key,
        id: queryOrId,
        name: String(queryOrId),
        slug: String(queryOrId),
        platform,
        isDependency,
        status: 'ok',
        missingDeps: [],
        incompatibilities: [],
        dependencies: []
      };
    }
    visited.add(key);

    let name = String(queryOrId);
    let slug = String(queryOrId);
    let iconUrl = '';
    let summary = '';
    let file: ModFile | null = null;

    if (platform === 'modrinth') {
      const project = await ModrinthService.getProject(String(queryOrId));
      if (project) {
        name = project.title || name;
        slug = project.slug || slug;
        iconUrl = project.icon_url || '';
        summary = project.description || '';
      }
      file = await ModrinthService.getCompatibleVersion(slug, context);
    } else {
      // CurseForge
      if (typeof queryOrId === 'number' || !isNaN(Number(queryOrId))) {
        const mod = await CurseForgeService.getMod(queryOrId, context.curseforgeApiKey);
        if (mod) {
          name = mod.name || name;
          slug = mod.slug || slug;
          iconUrl = mod.logo?.thumbnailUrl || mod.logo?.url || '';
          summary = mod.summary || '';
        }
        file = await CurseForgeService.getCompatibleFile(queryOrId, context);
      } else {
        // Try searching CurseForge by slug or query string
        const results = await CurseForgeService.searchMods(String(queryOrId), context);
        if (results.length > 0) {
          const match = results[0];
          name = match.name;
          slug = match.slug;
          iconUrl = match.iconUrl;
          summary = match.summary;
          file = await CurseForgeService.getCompatibleFile(match.id, context);
        }
      }
    }

    if (!file) {
      return {
        key,
        id: queryOrId,
        name,
        slug,
        iconUrl,
        summary,
        platform,
        isDependency,
        status: 'not_found',
        missingDeps: [],
        incompatibilities: [],
        dependencies: []
      };
    }

    // Process Dependencies
    const childNodes: ResolvedModNode[] = [];
    const missingDeps: string[] = [];
    const incompatibilities: string[] = [];

    for (const dep of file.dependencies) {
      if (dep.type === 'incompatible') {
        incompatibilities.push(`Incompatible with: ${dep.id}`);
        continue;
      }

      if (dep.type === 'required') {
        const childNode = await this.resolveMod(
          dep.id,
          dep.platform || platform,
          context,
          true,
          visited
        );

        if (childNode.status === 'not_found') {
          missingDeps.push(childNode.name || String(dep.id));
        }

        childNodes.push(childNode);
      }
    }

    const hasMissing = missingDeps.length > 0 || childNodes.some(c => c.status === 'missing_deps');
    const hasIncompat = incompatibilities.length > 0 || childNodes.some(c => c.status === 'incompatible');

    let status: ResolvedModNode['status'] = 'ok';
    if (hasMissing) status = 'missing_deps';
    if (hasIncompat) status = 'incompatible';

    return {
      key,
      id: queryOrId,
      name,
      slug,
      iconUrl,
      summary,
      platform,
      isDependency,
      file,
      status,
      missingDeps,
      incompatibilities,
      dependencies: childNodes,
      downloadState: 'idle'
    };
  }
}
