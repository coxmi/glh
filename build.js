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

const exampleConfig = {
    entryPoints: glob.sync('examples/**/main.ts'),
    entryNames: '[dir]/dist/[name]',
    outdir: 'examples',
    outbase: 'examples',
    bundle: true,
    platform: 'browser',
}

if (isDev) {
	const lib = await context(libConfig)
	const examples = await context(exampleConfig)
	await Promise.all([
		lib.watch(),
		examples.watch()
	])
} else {
	await Promise.all([
		build(libConfig),
		build(exampleConfig)
	])
}