/**
 * This file creates an abstract memory layout to be uesd in VertexBuffers, Uniforms, and Uniform buffer objects
 * The returned layout value includes an [info] symbol property for later updates using a graph of proxy nodes
 * 
 * The proxy allows a structure of gl types (scalar/array/structs) to be fully typed with getters/setters
 */

import { GL_TYPES } from './attributes.ts'
import type { AttributeType, AttributeValueTypes } from './attributes.ts'
import type { Expand, DeepMutable, ArrayOfLength } from './types.ts'


// basic schema types

export type Layout = Record<string, LayoutNode>

export type LayoutNode = ScalarNode | StructNode | ArrayNode<ScalarNode | StructNode>

type ScalarNode = { 
    type: AttributeType
}

type StructNode = { 
    type: 'struct'
    fields: Record<string, LayoutNode> 
}

type ArrayNode<T = LayoutNode> = { 
    type: 'array'
    length: number
    element: T
}

// parsed node type that returns an object structure, but each leaf node has metadata set by the caller

// meta functions provide body of info
// e.g. glTypes and rows/cols in vertex layouts
// glTypes/paths in uniforms
// std140 alignment in ubos
type Meta = Record<string, unknown>


// recursive parsed node, with Meta generic 
// only leaf nodes get metadata, structural types just become objects/arrays

type ParsedNode<N extends LayoutNode, M extends Meta> =
    N extends ScalarNode ? Meta :
    N extends StructNode ? { [K in keyof N['fields']]: ParsedNode<N['fields'][K], M> } :
    N extends ArrayNode 
        ? ArrayOfLength<
            ParsedNode<N['element'], M>, 
            N['length']
        > 
        : never

type ParsedLayout<L extends Layout, M extends Meta> = {
    [K in keyof L]: ParsedNode<L[K], M>
}

type UserMetaFn<N extends LayoutNode, M> = (input: N, path: string) => M


// convert node into parsed tree

function parseNode<N extends LayoutNode, M extends Meta>(
    node: N, 
    createMeta: UserMetaFn<N, M>, 
    path = '', 
    leaves: WeakSet<M>
) {
    if (node.type in GL_TYPES) {
        const scalar = createMeta(node, path)
        leaves.add(scalar)
        return scalar as ParsedNode<N, M>
    } else if (node.type === 'struct') {
        const struct: any = {}
        for (const key in node.fields) 
            struct[key] = parseNode(node.fields[key] as N, createMeta, `${path}.${key}`, leaves)
        return struct as ParsedNode<N, M>
    } else if (node.type === 'array') {
        const array: any = []
        for (let i = 0; i < node.length; i++) 
            array.push(parseNode(node.element as N, createMeta, `${path}[${i}]`, leaves ))
        return array as ParsedNode<N, M>
    }
    throw new Error(`Type not supported: ${node.type}`)
}


function parseLayout<const L extends Layout, M extends Meta>(fields: L, createMeta: UserMetaFn<L[keyof L], M>) {
    const parsed: any = {}
    const leaves: WeakSet<M> = new WeakSet()
    for (const key in fields) parsed[key] = parseNode(fields[key], createMeta, key, leaves)
    return { 
        parsed: (parsed as Expand<DeepMutable<ParsedLayout<L, M>>>), 
        leaves 
    }
}

const splitRE = /\.|\[|\]/

declare function isNaN(number: unknown): boolean

/**
 * Used for uniforms where output names are a flat map of array/struct paths:
 * e.g. struct.array[0].uColor[0]
 */
function parseFlat<N extends any, M extends Meta>(input: Record<string, any>, createMeta: (input: N, path: string) => M) {
    const leaves: WeakSet<M> = new WeakSet()
    const parsed: Record<string, any> = {}
    // cache path segments for faster lookup
    const cache = new Map()
    for (const flatKey in input) {
        const parts = cache.get(flatKey) || []
        if (!parts.length) {
            for (const part of flatKey.split(splitRE).filter(Boolean)) parts.push(isNaN(part) ? part : parseInt(part))            
            cache.set(flatKey, parts)
        }
        let current = parsed
        for (let i = 0; i < parts.length; i++) {
            const key = parts[i]
            if (i === parts.length - 1) {
                const scalar = createMeta(input[flatKey], flatKey)
                current[key] = scalar
                leaves.add(scalar)
                break
            }
            let obj = current[key]
            if (obj === undefined) {
                const nextKey = parts[i + 1]
                obj = typeof nextKey === "number" ? [] : {}
                current[key] = obj
            }
            current = obj
        }
    }
    return { parsed, leaves }
}


// proxy version that returns the proper value types per float/vec3/etc
// this only does compile-time type validation, and bad values can still be passed to the proxy at runtime
// (this is a task for the implementation to resolve if required)

type ParsedProxyNode<N extends LayoutNode> =
    N extends ScalarNode ? AttributeValueTypes[N['type']] :
    N extends StructNode ? { [K in keyof N['fields']]: ParsedProxyNode<N['fields'][K]> } :
    N extends ArrayNode 
        ? ArrayOfLength<
            ParsedProxyNode<N['element']>, 
            N['length']
        > 
        : never

type ParsedProxyLayout<L extends Layout> = {
    [K in keyof L]: ParsedProxyNode<L[K]>
}

export function proxyFromLayout<M extends Meta, const L extends Layout = Layout>(
    layout: L, 
    options: {
        meta: UserMetaFn<LayoutNode, M>,
        get: (meta: M) => any,
        set: (meta: M, value: any) => boolean
    },
) {
    const { meta, get, set } = options
    const { parsed, leaves } = parseLayout(layout, meta)
    return proxyGraph(parsed, get, set, leaves) as Expand<DeepMutable<ParsedProxyLayout<L>>>
}

export function proxyFromFlat<I, M extends Meta, R>(
    layout: Record<string, unknown>, 
    options: {
        meta: (input: any, path: string) => M,
        get: (meta: M) => any,
        set: (meta: M, value: any) => boolean
    },
) {
    const { meta, get, set } = options
    const { parsed, leaves } = parseFlat(layout, meta)
    return proxyGraph(parsed, get, set, leaves) as R
}


export const isProxy = (x: any): boolean => x.isProxy

type ProxyRecord = Record<string, any>

function proxyGraph<N, V, M extends Meta>(
    target: ProxyRecord, 
    get: (nodeInfo: N) => V, 
    set: (nodeInfo: N, value: V) => boolean, 
    leaves: WeakSet<M> = new WeakSet<M>(),
    cache = new WeakMap<WeakKey, unknown>(),
) { 
    const getChildProxy = (node: ProxyRecord): any => 
        getOrInsertComputed(cache, node, () => proxyGraph(node, get, set, leaves, cache))

    return new Proxy(target, {
        get(target, prop: string) {
            if (prop === 'isProxy') return true
            const node = target[prop]
            if (!node) return
            if (Array.isArray(target) && prop === 'length') return target.length
            // leaf node  
            if (leaves.has(node)) return get(node)
            // struct/array node, return proxy
            return getChildProxy(node)
        },
        set(target, prop: string, value: any) {
            const node = target[prop]
            if (!node) return false
            // leaf node
            if (leaves.has(node)) return set(node, value)
            // struct/array node, forward updates to graph children
            if (typeof value === 'object') {
                const child = getChildProxy(node)
                for (const k in value) child[k] = value[k]
                return true
            }
            return false
        }
    })
}

// TODO: remove once WeakMap.prototype.getOrInsert | getOrInsertComputed gets broad support
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap/getOrInsert
function getOrInsertComputed<K, V>(cache: Map<K, V>, key: K, fn: () => V): V
function getOrInsertComputed<K extends object, V>(cache: WeakMap<K, V>, key: K, fn: () => V): V
function getOrInsertComputed(cache: Map<any, any> | WeakMap<any, any>, key: any, fn: () => any): any {
    if (cache.has(key)) return cache.get(key)
    const value = fn()
    cache.set(key, value)
    return value
}