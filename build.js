import { context, build } from 'esbuild'
import { glob } from 'glob'

const isDev = process.argv[2] === '--dev' 

const libConfig = {
	target: 'esnext',
	format: 'esm',
	entryPoints: ['src/index.ts'],
	outdir: 'dist',
	bundle: true,
	sourcemap: true,
	minify: true,
	keepNames: false
}

const exampleConfig = {
	target: 'esnext',
    entryPoints: glob.sync('examples/*/src/*.ts'),
    entryNames: '[dir]/../dist/[name]',
    outdir: 'examples',
    outbase: 'examples',
    bundle: true,
    keepNames: true
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