import { describe, test } from 'node:test'
import assert from 'node:assert'
import { compareExamplesWithScreenshots } from './common/playwright.ts' 

describe('Example screenshots', () => {
    test('WebGL renders match saved references', async () => {
        await assert.doesNotReject(compareExamplesWithScreenshots)
    })
})