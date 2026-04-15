import { GLSL_TYPES, GLSL_INT_TYPES } from './attributes.ts'
import { parseLayout } from './layout.ts'
import { glBufferFormat } from './util.ts'
import type { Layout, VertexLayout, VertexLayoutArray, ParsedLayout } from './layout.ts'
import type { TypedArray, GLBufferType, UintTypedArray, DrawMode } from './types.ts'
import type { Shader } from './shader.ts'


// user input args

type VertexSchema = { 
    buffer?: VertexBuffer
    location?: number
    normalize?: boolean
    divisor?: number
}

type VertexSchemaWithLocation = { 
    buffer?: VertexBuffer
    location: number
    normalize?: boolean
    divisor?: number
}

type VertexLayoutArgs = {
    buffer?: VertexBuffer,
    index?: VertexIndex
    layout: 
        | VertexLayoutArray<VertexSchemaWithLocation> 
        | VertexLayout<VertexSchema>
}


// input args for single Vertex array (location required, must be an array)

type SingleVertexLayoutArgs = VertexLayoutArray<VertexSchemaWithLocation>


// parsed node

type ParsedVertexFields = { 
    path: string
    buffer?: VertexBuffer
    location?: number
    normalize: boolean
    divisor?: number
}

type ParsedVertexLayout = ParsedLayout<
    VertexSchema, 
    ParsedVertexFields, 
    Layout<VertexSchema>
>

/**
 * ```ts
 * // create a VertexBuffer with a typed array
 * const vertexBuffer = new VertexBuffer(gl, new Float32Array([0, 0.5, 1]))
 *
 * // usage:
 * vertexBuffer.bind/unbind/delete()
 * ```
 */

export class VertexBuffer {
    buffer: WebGLBuffer
    bytes: number
    count: number
    layout?: ParsedVertexLayout
    glFormat: GLBufferType
    gl: WebGL2RenderingContext

    constructor(gl: WebGL2RenderingContext, vertices: TypedArray | Array<number>) {
        const buffer = gl.createBuffer()
        this.buffer = buffer 
        vertices = Array.isArray(vertices) ? new Float32Array(vertices) : vertices
        this.bytes = vertices.BYTES_PER_ELEMENT
        this.glFormat = glBufferFormat(gl, vertices)
        this.count = vertices.length
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)
        this.gl = gl
    }

    setLayout(layout: SingleVertexLayoutArgs) {
        this.layout = parseVertexLayout({ buffer: this, layout })
    }

    bindLayout() {
        this.layout && bindVertexLayout(this.gl, this.layout)
    }

    bind() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer)
    }

    unbind() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
    }

    draw(mode: DrawMode = this.gl.TRIANGLES) {
        if (!this.layout) throw new Error('Cannot draw vertex buffer directly without a layout description');
        const { stride } = this.layout.bindings[0]
        const vertexCount = this.count / stride
        this.gl.drawArrays(mode, 0, vertexCount)
    }

    delete() {
        this.gl.deleteBuffer(this.buffer)
    }
}


/**
 * ```ts
 * // Create an index for use with gl.drawElements()
 * const index = new VertexIndex(gl, new Uint8Array[0, 1, 2, 3])
 * 
 * // usage:
 * index.bind/unbind/delete()
 * ```
 */
export class VertexIndex {
    buffer: WebGLBuffer
    count: number
    bytes: number
    glFormat: GLBufferType
    gl: WebGL2RenderingContext

    constructor(gl: WebGL2RenderingContext, indices: UintTypedArray | Array<number>) {
        this.buffer = gl.createBuffer()
        indices = Array.isArray(indices) ? new Uint16Array(indices) : indices
        this.count = indices.length
        this.bytes = indices.BYTES_PER_ELEMENT
        this.glFormat = glBufferFormat(gl, indices)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
        this.gl = gl
    }

    bind() {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffer)
    }

    unbind() {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null)
    }

    draw(mode: DrawMode = this.gl.TRIANGLES, offset = 0) {
        this.gl.drawElements(mode, this.count, this.glFormat, offset)
    }

    delete() {
        this.gl.deleteBuffer(this.buffer)
    }
}

function parseVertexLayout(config: VertexLayoutArgs) {
    // TODO: work out proper logic for instance buffers, this is a quick fix
    const instanceBuffers = new Set<any>()
    const layout = parseLayout<VertexSchema, ParsedVertexFields>(config.layout, config.buffer, (node, path) => {
        if (node.divisor) instanceBuffers.add(node.buffer)
        return { 
            path, 
            location: node?.location, 
            normalize: !!node.normalize,
            divisor: node?.divisor
        }
    }) 

    let instances = 0
    let vertices = 0
    for (const { buffer, stride } of layout.bindings) {
        const elements = buffer.count / stride
        const errName = `${buffer.constructor.name} – ${buffer.buffer.constructor.name}(elements:${buffer.count})`

        // TODO: add tests for instances, this is a quick fix
        if (instanceBuffers.has(buffer)) {
            if (!instances) instances = elements
            if (elements !== instances) console.warn(`${errName}: instance count does not match other buffers`)
            continue   
        }

        // validate stride is a factor of the overall buffer length
        if (buffer.count % stride !== 0) {
            console.warn(`${errName}: attribute stride (${stride}) is not a factor of buffer size (${buffer.count})`)
        }
        // check multiple buffers have the same number of vertices
        if (!vertices) vertices = elements
        if (elements !== vertices) {
            console.warn(`${errName}: Vertex count (${vertices}) does not match other buffers (${elements})`)
        }
    }

    // TODO: fix types
    // @ts-expect-error
    layout.vertices = vertices
    // @ts-expect-error
    layout.instances = instances
    return layout
}

function bindVertexLayout(
    gl: WebGL2RenderingContext, 
    parsedLayout: ParsedVertexLayout, 
    program?: WebGLProgram
): void {
    for (const { buffer, stride, layout } of parsedLayout.bindings) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer)
        for (const attribute of layout) {
            const { type, path, location, normalize, size, col, offset, divisor } = attribute
            const attribLocation = location ?? (program ? gl.getAttribLocation(program, path) : -1)
            if (attribLocation < 0) {
                console.warn(
                    `No location found for ${path}, set the location explicitly` 
                    + (program ? ' or pass in a shader' : '')
                )
                continue
            }
            const attrIntType = isIntOrUintAttrType(type)
            if (attrIntType && normalize) console.warn(`(${path}) normalize is ignored for integer vertex attributes`)
            const bytesPerCol = size * buffer.bytes
            for (let i = 0; i < col; i++) {
                gl.enableVertexAttribArray(attribLocation + i)
                const str = stride * buffer.bytes
                const off = (offset * buffer.bytes) + (i * bytesPerCol)
                if (attrIntType) {
                    gl.vertexAttribIPointer(attribLocation + i, size, buffer.glFormat, str, off)
                } else {
                    gl.vertexAttribPointer(
                        attribLocation + i, size, 
                        buffer.glFormat, 
                        // vertexAttribPointer converts int types to floats between the normalisation range
                        // (-1→1 for signed, 0→1 for unsigned)
                        normalize,  
                        str, off
                    )
                }
                if (divisor !== undefined) gl.vertexAttribDivisor(attribLocation + i, divisor)
            }
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
}


function isIntOrUintAttrType(attrType: keyof typeof GLSL_TYPES) {
    return GLSL_INT_TYPES.has(GLSL_TYPES[attrType])
}

function isIntOrUintBufferType(glEnum: number) {
    // same as matching against:
    // gl.INT, gl.UNSIGNED_INT, gl.BYTE, gl.UNSIGNED_BYTE, gl.SHORT, gl.UNSIGNED_SHORT
    return glEnum <= 5125 && glEnum >= 5120
}



/**
 * Create a vertex array object, to easily bind/unbind sets of attributes.
 * ```ts
 * // Instantiate with a shader reference:
 * const vao = new VAO(gl, Shader, {
 *   buffer: VertexBuffer,
 *   layout: {
 *     aPos: { type: 'vec3' }
 *   }
 * })
 * 
 * // or with layout specifiers to reuse the VAO in multiple shaders:
 * const vao = new VAO(gl, {
 *   buffer: VertexBuffer,
 *   layout: {
 *     aPos: { type: 'vec3', location: 0 }
 *   }
 * })
 * 
 * vao.draw(gl.TRIANGLES)
 * ```
 */

export class VAO {
    vao: WebGLVertexArrayObject
    vertexCount: number
    instanceCount: number
    gl: WebGL2RenderingContext

    constructor(gl: WebGL2RenderingContext, shader: Shader, config: VertexLayoutArgs)
    constructor(gl: WebGL2RenderingContext, config: VertexLayoutArgs)
    constructor(gl: WebGL2RenderingContext, a: Shader | VertexLayoutArgs, b?: VertexLayoutArgs) {
        const config = (b ?? a) as VertexLayoutArgs
        const shader = b ? (a as Shader) : undefined
        const layout = parseVertexLayout(config)
        const { buffer, stride } = layout.bindings[0]
        this.vertexCount = buffer.count / stride
        // @ts-expect-error
        this.instanceCount = layout.instances
        this.vao = gl.createVertexArray()
        gl.bindVertexArray(this.vao)
        bindVertexLayout(gl, layout, shader?.program)
        if (config.index) config.index.bind()
        gl.bindVertexArray(null)
        this.gl = gl
    }

    bind() {
        this.gl.bindVertexArray(this.vao)
    }
    unbind() {
        this.gl.bindVertexArray(null)
    }

    draw(mode: DrawMode = this.gl.TRIANGLES) {
        if (this.instanceCount) {
            this.gl.drawArraysInstanced(mode, 0, this.vertexCount, this.instanceCount)
        } else {
            this.gl.drawArrays(mode, 0, this.vertexCount)
        }
    }

    delete() {
        this.gl.deleteVertexArray(this.vao)
    }
}