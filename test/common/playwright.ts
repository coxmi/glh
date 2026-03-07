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
        updateScreenshots()
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

async function writePng(png: PNG, path: string) {
    return await new Promise<void>((resolve, reject) => {
        png.pack().pipe(fs.createWriteStream(path))
            .on("finish", resolve)
            .on("error", reject)
    })
}

type ComparePNGOptions = {
    threshold?: number
}

function comparePng(a: PNG, b: PNG, { threshold = 0 }: ComparePNGOptions = {}) {
    if (a.width !== b.width || a.height !== b.height) {
        throw new Error("Dimension mismatch between screenshot and reference")
    }
    const diff = new PNG({ width: a.width, height: a.height })
    const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { 
        threshold,
        includeAA: true,
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

export async function updateScreenshots() {
    const browser = await createBrowser()
    const exampleDirs = glob.sync('examples/*')

    await fs.promises.rm('test/screenshots', { recursive: true, force: true })
    await fs.promises.mkdir('test/screenshots')

    const processes = exampleDirs.map(async dir => {
        const dirname = path.basename(dir)
        const html = path.join(process.cwd(), dir, 'index.html')
        if (!fs.existsSync(html)) {
            throw new Error(`No file exists at: ${path.join(dir, 'index.html')}`)
        }

        const screenshot = path.join(process.cwd(), 'test/screenshots/', `${dirname}.png`)
        const page = await newPage(browser)
        try {
            const png = await renderScene({ page, url: pathToFileURL(html).href })
            await writePng(png, screenshot)
        } catch(e) {
            console.error('failed:', html)
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
    const name = path.relative(process.cwd(), htmlPath)
    if (!fs.existsSync(htmlPath)) throw new Error(`No file exists at: ${name}`)
    if (!fs.existsSync(screenshotPath)) throw new Error(`No screenshot for file: ${name}`)

    // render
    const page = await newPage(browser)
    let png: PNG
    try {
        png = await renderScene({ page, url: pathToFileURL(htmlPath).href })
    } catch(e) {
        await page.close()
        // stacks are just from playwright, so just rethrow for now
        throw new Error(`Render scene failed: ${name}`)
    }
    await page.close()

    // temporarily render the output, because otherwise the diff doesn't work the same
    const tmpPath = diffPath + '-tmp.png'
    const rendered = await writePng(png, tmpPath)
    const renderedPng = await pngFromFile(tmpPath)
    const screenshotPng = await pngFromFile(screenshotPath)
    const compare = comparePng(renderedPng, screenshotPng)
    await fs.promises.unlink(tmpPath)
    if (compare.pixels > 0) {
        await writePng(compare.diff, diffPath)
        throw new Error(`Pixels differ: ${compare.pixels} (diff saved to ${diffPath})`)
    }
    return true
}


export async function compareExamplesWithScreenshots() {
    const browser = await createBrowser()
    const exampleDirs = glob.sync('examples/*')
    await fs.promises.rm('test/diffs', { recursive: true, force: true })
    await fs.promises.mkdir('test/diffs')
    const processes = exampleDirs.map(async dir => {
        const htmlFile = path.join(process.cwd(), dir, 'index.html')
        const dirname = path.basename(path.dirname(htmlFile))
        const screenshotPath = path.join(process.cwd(), 'test/screenshots/', `${dirname}.png`)
        const diffPath = path.join(process.cwd(), 'test/diffs/', `${dirname}.png`)
        return await compareWithScreenshot(browser, htmlFile, screenshotPath, diffPath)
    })
    try {
        await Promise.all(processes)
    } catch(e) {
        console.log(e)
        await browser.close()
        return false
    }
    await browser.close()
    return true
}

