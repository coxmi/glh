import test from 'node:test'
import { compareExamplesWithScreenshots } from './common/playwright.ts' 

test("WebGL renders match saved references", async () => {
    await compareExamplesWithScreenshots()
})