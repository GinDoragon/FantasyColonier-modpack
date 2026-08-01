import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'
import { ZipArchive } from 'archiver'

function modpackPackagerPlugin() {
  return {
    name: 'modpack-packager',
    configureServer(server: any) {
      // Original ZIP packaging endpoint
      server.middlewares.use('/api/package-modpack', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }

        const modpackDir = path.resolve(__dirname, '..');
        const zipPath = path.resolve(modpackDir, 'modpack-release.zip');

        const output = fs.createWriteStream(zipPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });

        output.on('close', () => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, path: zipPath, size: archive.pointer() }));
        });

        archive.on('error', (err: any) => {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: err.message }));
        });

        archive.pipe(output);

        fs.readdirSync(modpackDir).forEach(file => {
          if (file === 'mod-seeker-app') return;
          if (file === 'modpack-release.zip') return;
          if (file === '.git') return;
          if (file === '.gitignore') return;

          const filePath = path.join(modpackDir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            archive.directory(filePath, file);
          } else {
            archive.file(filePath, { name: file });
          }
        });

        archive.finalize();
      });

      // MRPACK packaging endpoint — creates a .mrpack file
      // The mrpack contains:
      //   - modrinth.index.json (with file references)
      //   - overrides/ (config, resourcepacks, shaderpacks)
      server.middlewares.use('/api/package-mrpack', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }

        const modpackDir = path.resolve(__dirname, '..');
        const mrpackPath = path.resolve(modpackDir, 'FantasyColonier.mrpack');

        const output = fs.createWriteStream(mrpackPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });

        output.on('close', () => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, path: mrpackPath, size: archive.pointer() }));
        });

        archive.on('error', (err: any) => {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: err.message }));
        });

        archive.pipe(output);

        // Build modrinth.index.json from existing mods directory
        const modsDir = path.join(modpackDir, 'mods');
        const files: any[] = [];

        if (fs.existsSync(modsDir)) {
          const modFiles = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar'));
          for (const modFile of modFiles) {
            const filePath = path.join(modsDir, modFile);
            const stat = fs.statSync(filePath);
            
            // Compute hashes
            const crypto = require('crypto');
            const fileBuffer = fs.readFileSync(filePath);
            const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');
            const sha512 = crypto.createHash('sha512').update(fileBuffer).digest('hex');

            files.push({
              path: `mods/${modFile}`,
              hashes: { sha1, sha512 },
              env: { client: 'required', server: 'required' },
              downloads: [], // Will need to be filled manually or via API
              fileSize: stat.size,
            });
          }
        }

        const mrpackIndex = {
          formatVersion: 1,
          game: 'minecraft',
          versionId: '1.0.0',
          name: 'FantasyColonier',
          summary: 'Custom Minecraft 1.20.1 modpack',
          files,
          dependencies: {
            minecraft: '1.20.1',
            forge: 'latest',
          },
        };

        // Add modrinth.index.json
        archive.append(JSON.stringify(mrpackIndex, null, 2), { name: 'modrinth.index.json' });

        // Add overrides (config, resourcepacks, shaderpacks)
        const overrideDirs = ['config', 'resourcepacks', 'shaderpacks'];
        for (const dir of overrideDirs) {
          const dirPath = path.join(modpackDir, dir);
          if (fs.existsSync(dirPath)) {
            archive.directory(dirPath, `overrides/${dir}`);
          }
        }

        // Also add the mods themselves into overrides for self-contained mrpack
        // (This makes the mrpack work even without download URLs)
        if (fs.existsSync(modsDir)) {
          archive.directory(modsDir, 'overrides/mods');
        }

        archive.finalize();
      });
    }
  }
}

export default defineConfig({
  plugins: [vue(), modpackPackagerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
