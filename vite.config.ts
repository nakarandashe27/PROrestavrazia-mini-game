import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { version } from './package.json';
export default defineConfig({ plugins: [react(),viteSingleFile(),{
 name:'game-release',generateBundle(){this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({version})})}
}], base: './', server: { host: '127.0.0.1', port: 4173, strictPort: true } });
