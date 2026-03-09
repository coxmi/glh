import fs from 'node:fs'
import zlib from 'zlib'

const file = fs.readFileSync('./dist/index.js')
const gzipped = zlib.gzipSync(file, { level: 9 })

const numkb: number = gzipped.length / 1024
const kb = numkb % 1 === 0 ? numkb.toString() : numkb.toFixed(1)

const readme = fs.readFileSync('README.md', 'utf8')
const updated = readme.replace(/\(\d+\.?\d+?kb\)/, `(${kb}kb)`)

console.log(`dist/index.js: ${kb}kb`)

fs.writeFileSync('README.md', updated, 'utf8')