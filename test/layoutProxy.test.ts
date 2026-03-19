import { describe, test } from 'node:test'
import assert from 'node:assert'
import { createLayoutProxy, isProxy } from './../src/layout.ts'
import type { ArrayOfLength } from '../src/types.ts'


// description of complex layout (scalar field, struct, scalar array, struct array)

const layout = {
    scalar: { type: 'float' },
    struct: {
        type: 'struct',
        fields: {
            uv: { type: 'vec2' },
            color: { type: 'vec3' }
        }
    },
    scalarArray: {
        type: 'array',
        length: 2,
        element: { type: 'vec4' }
    },
    structArray: {
        type: 'array',
        length: 2,
        element: {
            type: 'struct',
            fields: {
                field1: { type: 'ivec3' },
                field2: { type: 'bvec3' }
            }
        }
    }
} as const


// basic implementation that just gets/sets a value on the respective graph node

const proxyValues: Record<string, number> = {}
const proxy = createLayoutProxy(layout, {
    meta: (_node, path) => path,
    get: path => proxyValues[path],
    set: (path, value) => (proxyValues[path] = value, true)
});


describe('Layout proxy graph', () => {

    test("Layout .scalar setters", () => {
        proxy.scalar = 0.5
        assert(proxy.scalar === 0.5)
        assert.equal(proxy.scalar, proxy.scalar)
        assert.equal(proxyValues['scalar'], 0.5)
    })

    test("Layout struct { a:x, b:x } setters", () => {
        proxy.struct = { 
            uv: [0.25, 0.5],
            color: [255, 0, 0],
        }
        // deep equal for arrays
        assert.deepEqual(proxy.struct.uv, [0.25, 0.5])
        assert.deepEqual(proxy.struct.color, [255, 0, 0])
        // equal for proxies
        assert.equal(proxy.struct, proxy.struct)
        assert.equal(proxy.struct.uv, proxy.struct.uv)
        assert.equal(proxy.struct.color, proxy.struct.color)
        // equal in proxyValues
        assert.deepEqual(proxyValues['struct.uv'], proxy.struct.uv)
        assert.deepEqual(proxyValues['struct.color'], proxy.struct.color)
    })

    test("Layout struct.leaf setters", () => {
        proxy.struct.uv = [0.75, 0.5]
        // deep equal for arrays
        assert.deepEqual(proxy.struct.uv, [0.75, 0.5])
        // equal for proxies
        assert.equal(proxy.struct.uv, proxy.struct.uv)
        // equal in proxyValues
        assert.equal(proxyValues['struct.uv'], proxy.struct.uv)
    })

    test("Layout scalar[0] setters", () => {
        proxy.scalarArray = [
            [1,2,3,4], [5,6,7,8]
        ]
        // individual values are equal
        assert.deepEqual(proxy.scalarArray[0], [1,2,3,4])
        assert.deepEqual(proxy.scalarArray[1], [5,6,7,8])
        assert.deepEqual(proxy.scalarArray, [
            [1,2,3,4], [5,6,7,8]
        ])
        // structural types (arrays/structs) are proxies so just 
        // test some properties and proxy equality
        assert(isProxy(proxy.scalarArray))
        assert(proxy.scalarArray === proxy.scalarArray)
        assert.deepEqual(proxyValues['scalarArray[0]'], [1,2,3,4])
        assert.deepEqual(proxyValues['scalarArray[1]'], [5,6,7,8])
    })

    test("Layout structarray[0].field setters", () => {
        const vec3: ArrayOfLength<number, 3> = [9,8,7]
        proxy.structArray[1].field1 = vec3
        assert(isProxy(proxy.structArray))
        assert(isProxy(proxy.structArray[1]))
        assert.deepEqual(proxy.structArray[1].field1, vec3)
        assert(proxy.structArray === proxy.structArray)
        assert.deepEqual(proxyValues['structArray[1].field1'], vec3)
    })
})