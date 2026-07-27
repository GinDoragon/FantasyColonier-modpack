import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'
import { ZipArchive } from 'archiver'

function modpackPackagerPlugin() {
  return {
    name: 'modpack-packager',
    configureServer(server: any) {
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
