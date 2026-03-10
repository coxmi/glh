import path from 'node:path'
import { pathToFileURL } from 'node:url'
import fs from 'node:fs'
import { glob } from 'glob'
import { chromium } from 'playwright'
import type { Browser, Page } from 'playwright'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'


// Script runner (only runs when called directly from cli, e.g. from npm scripts)

if (import.meta.url === `file://${process.argv[1]}`) {
    const arg = process.argv[2]
    if (arg === '--update-screenshots') {
        const whitelist = process.argv.length > 3 && process.argv.slice(3) || undefined
        updateScreenshots(whitelist)
    }
}


export async function createBrowser(debug = false) {
    const debugOptions = {
        headless: false, 
        slowMo: 250
    } 
    return await chromium.launch({
        headless: !debug,
        args: ["--use-gl=angle"],
        ...(debug ? debugOptions: {})
    })    
}

export async function newPage(browser: Browser, debug = false) {
    const page = await browser.newPage()
    page.on("pageerror", err => console.log(`[BROWSER ${err.name}] ${err.message}`))
    if (debug) {
        page.on("console", msg => console.log(`[BROWSER ${msg.type()}] ${msg.text()}`))
        page.on("requestfinished", req => console.log("[BROWSER REQUEST FINISHED]", req.url()))
        page.on("requestfailed", req => console.log("[BROWSER REQUEST FAILED]", req.url()))
    }
    return page
}

type RenderSceneArgs = { 
    page: Page, 
    url: string, 
    timeout?: number 
}

declare global {
    interface Window {
        __rendered?: {
            width: number
            height: number
            pixels: Uint8Array
        }
    }
}

/**
 * Expects window.__rendered property to exist in browser page
 */
export async function renderScene({ page, url, timeout = 1000 }: RenderSceneArgs) {
    await page.goto(url)
    await page.waitForFunction(() => window.__rendered, [], { timeout })
    const result = await page.evaluate(() => window.__rendered)
    if (!result?.pixels) throw new Error("No pixels returned from window.__rendered")

    const { width, height, pixels } = result
    const png = new PNG({ width, height })
    Buffer.from(pixels).copy(png.data)
    return png
}

// PNG helpers

async function writePng(png: PNG, filepath: string) {
    await fs.promises.mkdir(path.dirname(filepath), { recursive: true })
    return await new Promise<void>((resolve, reject) => {
        png.pack().pipe(fs.createWriteStream(filepath))
            .on("finish", resolve)
            .on("error", reject)
    })
}

function comparePng(a: PNG, b: PNG) {
    if (a.width !== b.width || a.height !== b.height) {
        throw new Error(`Dimension mismatch between screenshot and reference (${a.width}x${a.height}, ${b.width}x${b.height})`)
    }
    const diff = new PNG({ width: a.width, height: a.height })
    const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { 
        threshold: 0.15,
        includeAA: false,
        diffMask: true 
    })
    return { diff, pixels }
}

async function pngFromFile(file: string) {
    const buffer = fs.readFileSync(file)
    return await new Promise<PNG>((resolve, reject) => {
        return new PNG().parse(buffer, (err, data) => err ? reject(err) : resolve(data))
    })
}


// render screenshots to /test/screenshots/ folder

export async function updateScreenshots(whitelist?: string[]) {
    const browser = await createBrowser()

    const htmlFiles = glob.sync('examples/*/*.html').filter(path => {
        if (!whitelist?.length) return true
        return whitelist.some(w => path.includes(w))
    })

    if (!whitelist) {
        await fs.promises.rm('test/screenshots', { recursive: true, force: true })
        await fs.promises.mkdir('test/screenshots')
    }

    const processes = htmlFiles.map(async htmlFile => {
        const example  = getExampleInfo(htmlFile)
        const screenshot = path.join(process.cwd(), 'test/screenshots/', `${example.screenshotBase}.png`)
        const page = await newPage(browser)
        try {
            const png = await renderScene({ page, url: pathToFileURL(example.path).href })
            await writePng(png, screenshot)
        } catch(e) {
            console.error('failed:', htmlFile)
            // stacks are just from playwright, so we can 
            // just ignore them for now
            e.stack = ''
            console.error(e)
        }
    })
    await Promise.all(processes)
    await browser.close()
}


export async function compareWithScreenshot(
    browser: Browser, 
    htmlPath: string, 
    screenshotPath: string, 
    diffPath: string
) {
    const name = path.relative(process.cwd(), htmlPath).replace(/\/index\.html$/, '')
    const diffName = path.relative(process.cwd(), diffPath)
    if (!fs.existsSync(htmlPath)) throw new Error(`No file exists at: ${name}`)
    if (!fs.existsSync(screenshotPath)) throw new Error(`No screenshot for file: ${name}`)

    // render
    const page = await newPage(browser)
    let png: PNG
    try {
        png = await renderScene({ page, url: pathToFileURL(htmlPath).href })
    } catch(e) {
        await page.close()
        // stacks are just from playwright, so just throw a simple message instead
        throw new Error(`${name} - failed to render scene`)
    }
    await page.close()

    // compare output
    let compare: ReturnType<typeof comparePng>
    try {
        const screenshotPng = await pngFromFile(screenshotPath)
        compare = comparePng(png, screenshotPng)
    } catch(e) {
        e.message = `${name} - ${e.message}`
        throw e
    }

    // pick a small but non-zero pizel threshold, as some comparisons keep jamming up CI
    if (compare.pixels > 20) {
        await writePng(compare.diff, diffPath)
        const format = num => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(num)
        throw new Error(`${name}: ${format(compare.pixels)} pixels differ, saved diff at: ${diffName}`)
    }
    return true
}


function getExampleInfo(htmlFile) {
    let fileNameBase = path.basename(htmlFile).replace(/\.html$/, '')
    if (fileNameBase === 'index') fileNameBase = ''
    const folderName = path.dirname(htmlFile)
    const screenshotBase = path.join([folderName, fileNameBase].filter(Boolean).join('-'))
    const htmlPath = path.join(process.cwd(), htmlFile)
    if (!fs.existsSync(htmlPath)) {
        throw new Error(`No file exists at: ${path.relative(process.cwd(), htmlPath)}`)
    }
    return {
        fileNameBase, 
        folderName, 
        path: htmlPath, 
        screenshotBase, 
    }
}


export async function compareExamplesWithScreenshots(whitelist?: string[]) {
    const browser = await createBrowser()
    const exampleHtmlFiles = glob.sync('examples/*/*.html').filter(path => {
        if (!whitelist?.length) return true
        return whitelist.some(w => path.includes(w))
    })

    if (!whitelist) {
        await fs.promises.rm('test/diffs', { recursive: true, force: true })
        await fs.promises.mkdir('test/diffs')
    }

    const processes = exampleHtmlFiles.map(async htmlFile => {
        const example = getExampleInfo(htmlFile)
        const screenshotPath = path.join(process.cwd(), 'test/screenshots/', `${example.screenshotBase}.png`)
        const diffPath = path.join(process.cwd(), 'test/diffs/', `${example.screenshotBase}.png`)
        return await compareWithScreenshot(browser, htmlFile, screenshotPath, diffPath)
    })

    try {
        await Promise.all(processes)    
    } catch(e) {
        await browser.close()
        throw e
    }
    await browser.close()
    return true
}

