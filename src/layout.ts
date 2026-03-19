/**
 * This file creates an abstract memory layout to be uesd in VertexBuffers, Uniforms, and Uniform buffer objects
 * The returned layout value includes an [info] symbol property for later updates using a graph of proxy nodes
 * 
 * The proxy allows a structure of gl types (scalar/array/structs) to be fully typed with getters/setters
 */

import { GL_TYPES } from './attributes.ts'
import type { AttributeType, AttributeValueTypes } from './attributes.ts'
import type { Expand, DeepMutable, ArrayOfLength } from './types.ts'

const info = Symbol('info')


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

type Meta<M extends any> = {
    // meta functions provide body of info
    // e.g. glTypes and rows/cols in vertex layouts
    // glTypes/paths in uniforms
    // std140 alignment in ubos
    [info]: M
}

// recursive parsed node, with Meta generic 
// only leaf nodes get metadata, structural types just become objects/arrays

type ParsedNode<N extends LayoutNode, M extends any> =
    N extends ScalarNode ? Meta<M> :
    N extends StructNode ? { [K in keyof N['fields']]: ParsedNode<N['fields'][K], M> } :
    N extends ArrayNode 
        ? ArrayOfLength<
            ParsedNode<N['element'], M>, 
            N['length']
        > 
        : never

type ParsedLayout<L extends Layout, M extends any> = {
    [K in keyof L]: ParsedNode<L[K], M>
}

type UserMetaFn<N extends LayoutNode, M> = (node: N, path: string) => M


// convert node into parsed tree

function parseNode<N extends LayoutNode, M extends any>(node: N, createMeta: UserMetaFn<N, M>, path = '') {
    if (node.type in GL_TYPES) {
        const scalar = { [info]: createMeta(node, path) }
        return scalar as ParsedNode<N, M>
    } else if (node.type === 'struct') {
        const struct: any = {}
        for (const key in node.fields) 
            struct[key] = parseNode(node.fields[key] as N, createMeta, `${path}.${key}`)
        return struct as ParsedNode<N, M>
    } else if (node.type === 'array') {
        const array: any = []
        for (let i = 0; i < node.length; i++) 
            array.push(parseNode(node.element as N, createMeta, `${path}[${i}]`))
        return array as ParsedNode<N, M>
    }
    throw new Error(`Type not supported: ${node.type}`)
}


function parseLayout<M extends any, const L extends Layout>(fields: L, createMeta: UserMetaFn<L[keyof L], M>) {
    const result: any = {}
    for (const key in fields) result[key] = parseNode(fields[key], createMeta, key)
    return result as Expand<DeepMutable<ParsedLayout<L, M>>>
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

type ValueTypeFromLayoutNode<N extends LayoutNode> = N extends ScalarNode 
    ? AttributeValueTypes[N['type']]
    : never

export function createLayoutProxy<M extends any, const L extends Layout = Layout>(
    layout: L, 
    options: {
        meta: UserMetaFn<L[keyof L], M>,
        get: (nodeInfo: M) => ValueTypeFromLayoutNode<L[keyof L]>,
        set: (nodeInfo: M, value: ValueTypeFromLayoutNode<L[keyof L]>) => boolean
    }
) {
    const { meta, get, set } = options
    const parsed: Expand<DeepMutable<ParsedLayout<L, M>>> = parseLayout(layout, meta)
    return proxyGraph(parsed, get, set) as Expand<DeepMutable<ParsedProxyLayout<L>>>
}


export const isProxy = (x: any): boolean => x.isProxy

function proxyGraph<N, V>(target: Record<string | symbol, any>, get: (nodeInfo: N) => V, set: (nodeInfo: N, value: V) => boolean, cache = new WeakMap()) { 
    const getChildProxy = (node: any) => getOrInsertComputed(cache, node, () => proxyGraph(node, get, set, cache))
    return new Proxy(target, {
        get(target, prop: string) {
            if (prop === 'isProxy') return true
            const node = target[prop]
            if (!node) return
            if (Array.isArray(target) && prop === 'length') return target.length
            // get node info and return proxy if it's not a leaf node
            const nodeInfo = node[info]   
            if (nodeInfo === undefined) return getChildProxy(node)
            return get(nodeInfo)
        },
        set(target, prop: string, value: any) {
            const node = target[prop]
            if (!node) return false
            const nodeInfo = node[info]
            // leaf node
            if (nodeInfo !== undefined) return set(nodeInfo, value)
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
function getOrInsertComputed<T extends WeakKey, V>(cache: WeakMap<T, V>, key: T, fn: () => V) {
    if (cache.has(key)) return cache.get(key)
    const value = fn()
    cache.set(key, value)
    return value
}