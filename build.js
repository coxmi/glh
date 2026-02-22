import { context, build } from 'esbuild'
import { glob } from 'glob'

const isDev = process.argv[2] === '--watch' 

const libConfig = {
	entryPoints: ['src/index.ts'],
	target: 'esnext',
	outdir: 'dist',
	bundle: true,
	sourcemap: true,
	minify: true,
	keepNames: true,
	define: {
       'DEBUG': JSON.stringify(isDev)
   }
}

const testConfig = {
    entryPoints: glob.sync('tests/**/main.ts'),
    entryNames: '[dir]/dist/[name]',
    outdir: 'tests',
    outbase: 'tests',
    bundle: true,
    platform: 'browser',
}

if (isDev) {
	await Promise.race([
		(await context(libConfig)).watch(),
		(await context(testConfig)).watch()
	])
} else {
	await Promise.race([
		build(libConfig),
		build(testConfig)
	])
}