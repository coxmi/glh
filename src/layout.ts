/**
 * This file creates an abstract memory layout to be used in VertexBuffers and UBOs.
 * The proxy allows a structure of gl types (scalar/array/structs) to be fully typed with getters/setters
 */

import { GLSL_TYPES, TYPE_SIZE, STD140_ALIGN } from './attributes.ts'
import type { GlslType, AttributeType, AttributeValueTypes, VertexAttributeType } from './attributes.ts'
import type { Expand, DeepMutable, ArrayOfLength } from './types.ts'


// main schema types for user input

export type Layout<InputFields> = Record<string | number, LayoutNode<InputFields>>

type LayoutNode<InputFields> = 
    | ScalarNode<InputFields> 
    | StructNode<InputFields> 
    | ArrayNode<
        ScalarNode<InputFields> 
        | StructNode<InputFields>
    >

type ScalarNode<
    InputFields,
    T extends AttributeType = AttributeType
> = {
    [K in T]: {
        type: K,
        buffer?: Binding
        value?: AttributeValueTypes[K]
    } & InputFields
}[T]

type StructNode<InputFields> = { 
    type: 'struct'
    fields: Record<string, LayoutNode<InputFields>> 
    buffer?: Binding
}

type ArrayNode<T> = { 
    type: 'array'
    length: number
    element: T
    buffer?: Binding
}

type Binding =  {
    bytes: number
} & any


// subtypes for narrowing schema input

export type VertexLayout<InputFields> = Record<string | number, ScalarNode<InputFields, VertexAttributeType>>
export type VertexLayoutArray<InputFields> = Record<number, ScalarNode<InputFields, VertexAttributeType>>


// parsed/output types

type BindingInfo<OutputFields, BindingFields> = {
    stride: number
    buffer: Binding
    layout: Array<ParsedAttributeInfo<OutputFields>>
} & BindingFields

export type ParsedAttributeInfo<OutputFields> = {
    type: GlslType
    path: string
    row: number
    col: number
    size: number
    align: number
    offset: number
} & OutputFields


// layout info, bound to symbol in parsed tree object for use in proxy

const info = Symbol('info')

type ParsedNodeInfo<OutputFields> = {
    [info]: ParsedAttributeInfo<OutputFields>
}

// recursive parsed node

type ParsedNode<Node extends LayoutNode<F>, OutputFields, F = {}> =
    Node extends ScalarNode<F> ? ParsedNodeInfo<OutputFields> & {
        type: Node['type']
    } :
    Node extends StructNode<F> ? ParsedNodeInfo<OutputFields> & { 
        [K in keyof Node['fields']]: ParsedNode<Node['fields'][K], OutputFields>
    } :
    Node extends ArrayNode<any> 
        ? ParsedNodeInfo<OutputFields> & ArrayOfLength<
            ParsedNode<Node['element'], OutputFields>, 
            Node['length']
        >
        : never

export type ParsedLayout<
    InputFields, 
    OutputFields = {},
    BindingFields = {},
    L extends Layout<InputFields> = Layout<InputFields>,
> = {
    bindings: Array<BindingInfo<OutputFields, BindingFields>>
    attributes: {
        [K in keyof L]: ParsedNode<L[K], OutputFields>    
    }
}


// convert node into parsed tree

type LayoutType = 'vertex' | 'std140'

type LayoutCtx<InputFields, OutputFields, BindingFields> = {
    type: LayoutType
    buffer?: Binding
    bindingInfo: Map<Binding, BindingInfo<OutputFields, BindingFields>>
    meta: (node: ScalarNode<InputFields>, path: string, bindingInfo: BindingInfo<OutputFields, BindingFields>) => OutputFields
}

function computeLayout<
    InputFields,
    OutputFields,
    BindingFields,
    Node extends LayoutNode<InputFields> = LayoutNode<InputFields>
>(
    node: Node,
    path: string = '',
    ctx: LayoutCtx<InputFields, OutputFields, BindingFields>,
    isRoot: boolean = false
): ParsedNode<Node, OutputFields> {

    const { bindingInfo, meta } = ctx
    const buffer = ctx.buffer = node.buffer = (isRoot ? node.buffer : ctx.buffer) || ctx.buffer
    if (buffer === undefined) throw new Error(`No buffer set for ${path}`)

    const binding = getOrInsert(bindingInfo, buffer, {
        buffer,
        stride: 0,
        layout: []
    } as BindingInfo<OutputFields, BindingFields>)

    if (node.type in GLSL_TYPES) {
        const { row, col } = TYPE_SIZE[node.type as VertexAttributeType]
        let size = row * col * binding.buffer.bytes
        const align = ctx.type === 'std140' 
            ? STD140_ALIGN[node.type as keyof typeof STD140_ALIGN]
            : size
        const attr: ParsedAttributeInfo<OutputFields> = {
            type: GLSL_TYPES[node.type as keyof typeof GLSL_TYPES],
            path, 
            offset: binding.stride,
            row, 
            col, 
            size,
            align,
            ...meta(node as ScalarNode<InputFields>, path, binding)
        }
        binding.layout.push(attr)
        binding.stride += Math.max(size, alignTo(size, align))
        const scalar = { [info]: attr }
        return scalar as ParsedNode<typeof node, OutputFields>

    } else if (node.type === 'array') {
        const array: any = []
        for (let i = 0; i < node.length; i++)
            array[i] = computeLayout<InputFields, OutputFields, BindingFields>(node.element, `${path}[${i}]`, ctx)
        return array
    } else if (node.type === 'struct') {
        const struct: any = {}
        for (const key in node.fields)
            struct[key] = computeLayout<InputFields, OutputFields, BindingFields>(node.fields[key], `${path}.${key}`, ctx)
        return struct
    }
    throw new Error(`Type not supported: ${node.type}`)
}


export function parseLayout<
    InputFields, 
    OutputFields = {}, 
    BindingFields = {},
    const L extends Layout<InputFields> = Layout<InputFields>,
    B extends Binding = Binding
>(
    layout: L,
    defaultBuffer: B | undefined,
    meta: (
        node: ScalarNode<InputFields>, 
        path: string, 
        buffer: BindingInfo<OutputFields, BindingFields>
    ) => OutputFields,
    type: LayoutType = 'vertex'
) {
    const ctx: LayoutCtx<InputFields, OutputFields, BindingFields> = {
        type,
        buffer: defaultBuffer,
        bindingInfo: new Map(),
        meta,
    }
    const attributes: any = {}
    for (const key in layout) attributes[key] = computeLayout<InputFields, OutputFields, BindingFields>(layout[key], key, ctx, true)
    const parsed: ParsedLayout<InputFields, OutputFields, BindingFields, L> = { 
        attributes: attributes,
        bindings: [...ctx.bindingInfo.values()],
    }
    return parsed
}


const splitRE = /\.|\[|\]/

// types are too narrow on default isNaN (this is used to check if string is number-like)
declare function isNaN(number: unknown): boolean

type Meta = Record<string, unknown>

/**
 * Used for webGL uniforms where output names are a flat map of array/struct paths:
 * e.g. struct.array[0].uColor[0]
 */
export function objectFromRecord<N, M>(
    input: Record<string, any>, 
    meta: (input: N, path: string) => M
) {
    const parsed: Record<string, any> = {}
    // cache path segments for faster lookup
    const cache = new Map<string, (string | number)[]>()
    for (const flatKey in input) {
        const parts = cache.get(flatKey) || []
        if (!parts.length) {
            for (const part of flatKey.split(splitRE).filter(Boolean))
                parts.push(isNaN(part) ? part : parseInt(part))
            cache.set(flatKey, parts)
        }
        let current = parsed
        for (let i = 0; i < parts.length; i++) {
            const key = parts[i]
            if (i === parts.length - 1) {
                current[key] = { [info] : meta(input[flatKey], flatKey) }
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
    return parsed
}


// proxy version that returns the proper value types per float/vec3/etc

type ParsedProxyNode<Node extends LayoutNode<InputFields>, InputFields> =
    Node extends ScalarNode<InputFields> 
        ? AttributeValueTypes[Node['type']] :
    Node extends StructNode<InputFields> ? { 
        [K in keyof Node['fields']]: ParsedProxyNode<Node['fields'][K], InputFields> 
    } :
    Node extends ArrayNode<InputFields> 
        ? ArrayOfLength<
            ParsedProxyNode<Node['element'], InputFields>, 
            Node['length']
        > 
        : never

export type ParsedProxyLayout<L extends Layout<InputFields>, InputFields = {}> = Expand<DeepMutable<{
    [K in keyof L]: ParsedProxyNode<L[K], InputFields>
}>>

export function proxyFromLayout<
    InputFields,
    OutputFields,
    const L extends Layout<InputFields>,
    const P extends ParsedLayout<InputFields, OutputFields, {}, L>,
    const G extends (meta: ParsedAttributeInfo<OutputFields>) => any,
    const S extends (meta: ParsedAttributeInfo<OutputFields>, value: any) => boolean
>(parsedLayout: P, opts: { get: G, set: S }) {
    return proxyGraph(parsedLayout.attributes, opts.get, opts.set) as ParsedProxyLayout<L>
}

export function proxyFromFlat<M extends Meta, R>(
    layout: Record<string, unknown>, 
    options: {
        meta: (input: any, path: string) => M,
        get: (meta: M) => any,
        set: (meta: M, value: any) => boolean
    },
) {
    const { meta, get, set } = options
    const object = objectFromRecord(layout, meta)
    return proxyGraph(object, get, set) as R
}


// used for tests
export const isProxy = (x: any): boolean => x.isProxy

function proxyGraph<N, V>(
    target: Record<string, any>, 
    get: (nodeInfo: N) => V, 
    set: (nodeInfo: N, value: V) => boolean, 
    cache = new WeakMap<WeakKey, unknown>(),
) { 
    
    function getChild(node: Record<string, any>): any {
        let child = cache.get(node)
        if (child) return child
        child = proxyGraph(node, get, set, cache)
        cache.set(node, child)
        return child
    }

    return new Proxy(target, {
        get(t, prop: string) {
            if (prop === 'isProxy') return true
            const node = t[prop]
            if (!node) return
            if (Array.isArray(t) && prop === 'length') return t.length
            // get node info and return proxy if it's not a leaf node
            const attr = node[info]
            if (attr === undefined) return getChild(node)
            // TODO: test Uncaught TypeError: 'set' on proxy: trap returned falsish for property 'x'
            // when shader not using variable
            return get(attr)
        },
        set(t, prop: string, value: any) {
            const node = t[prop]
            if (!node) {
                console.warn(`"${prop}" does not exist`)
                return true
            }
            const attr = node[info]
            // leaf node
            if (attr !== undefined) return set(attr, value)
            // struct/array node, forward updates to graph children
            if (typeof value === 'object') {
                const child = getChild(node)
                for (const k in value) child[k] = value[k]
                return true
            }
            console.warn(`"${prop}" does not exist`)
            return true
        }
    })
}


// helpers

function alignTo(offset: number, align: number) {
    return Math.ceil(offset / align) * align
}

// TODO: remove once WeakMap.prototype.getOrInsert | getOrInsertComputed gets broad support
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap/getOrInsert
function getOrInsert<K, V>(cache: Map<K, V>, key: K, value: V): V
function getOrInsert<K extends object, V>(cache: WeakMap<K, V>, key: K, value: V): V
function getOrInsert(cache: Map<any, any> | WeakMap<any, any>, key: any, value: any): any {
    if (cache.has(key)) return cache.get(key)
    cache.set(key, value)
    return value
}