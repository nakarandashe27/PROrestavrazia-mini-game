import { build } from 'esbuild';
try {
 const result=await build({entryPoints:['tests/fieldwork.ts'],write:false,bundle:true,platform:'node',format:'esm',logLevel:'error'});
 await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}catch(error){console.error(error.message);process.exitCode=1;}
