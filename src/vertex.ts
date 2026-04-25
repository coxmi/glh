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
    // two names for divisor, remove this later
    divisor?: number
    step?: number
    // remove types from layout internal
    value?: never
}

type VertexSchemaWithLocation = VertexSchema & { 
    location: number
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

type VertexBindingFields = {
    divisor: number
}

type ParsedVertexFields = { 
    path: string
    buffer?: VertexBuffer
    location?: number
    normalize: boolean
}

type ParsedVertexLayout = {
    instances: number,
    vertices: number,
    bindings: ParsedLayout<
        VertexSchema, 
        ParsedVertexFields,
        VertexBindingFields, 
        Layout<VertexSchema>
    >['bindings']
}

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
    readonly buffer: WebGLBuffer
    readonly bytes: number
    readonly count: number
    readonly glFormat: GLBufferType
    readonly gl: WebGL2RenderingContext

    layout?: ParsedVertexLayout

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
        if (!this.layout) throw new Error('Cannot draw vertex buffer directly without a layout description')
        this.gl.drawArrays(mode, 0, this.layout.vertices)
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
    readonly buffer: WebGLBuffer
    readonly count: number
    readonly bytes: number
    readonly glFormat: GLBufferType
    readonly gl: WebGL2RenderingContext

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
    const layout = parseLayout<VertexSchema, ParsedVertexFields, VertexBindingFields>(config.layout, config.buffer, (node, path, binding) => {
        // per buffer, check all instance divisors are equal
        // (no support for mixed instance steps per buffer)
        const divisor = node.divisor ?? node.step ?? 0
        if (binding.divisor === undefined) binding.divisor = divisor
        if (binding.divisor !== divisor) console.warn('buffers with mixed instance steps are not supported')
        return { 
            path, 
            location: node?.location, 
            normalize: !!node.normalize,
        }
    }) 

    let instances = Infinity
    let vertices = 0
    for (const { buffer, stride, divisor } of layout.bindings) {

        const bytes = buffer.count * buffer.bytes
        const elements = bytes / stride
        const errName = `${buffer.constructor.name} – ${buffer.buffer.constructor.name}(elements:${buffer.count})`

        // validate instance could is equal for each instance buffer
        if (divisor > 0) {
            const capacity = elements * divisor
            if (instances === Infinity) {
                instances = capacity
            } else {
                if (capacity !== instances) 
                    console.warn(`instanced attributes have inconsistent capacity: received ${capacity}, but expected ${instances} (from ${elements} elements)`)
                instances = Math.min(instances, capacity)    
            }
            continue   
        }

        // validate stride is a factor of the overall buffer length
        if (bytes % stride !== 0) {
            console.warn(`${errName}: attribute stride (${stride}) is not a factor of buffer size (${bytes})`)
        }
        // check multiple buffers have the same number of vertices
        if (!vertices) vertices = elements
        if (elements !== vertices) {
            console.warn(`${errName}: Vertex count (${vertices}) does not match other buffers (${elements})`)
        }
    }

    return {
        vertices,
        instances: instances < Infinity ? instances : 0,
        bindings: layout.bindings
    }
}

function bindVertexLayout(
    gl: WebGL2RenderingContext, 
    parsedLayout: ParsedVertexLayout, 
    program?: WebGLProgram
): void {
    for (const { buffer, stride, layout, divisor } of parsedLayout.bindings) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer)
        for (const attribute of layout) {
            const { type, path, location, normalize, row, col, offset } = attribute
            const attribLocation = location ?? (program ? gl.getAttribLocation(program, path) : -1)
            if (attribLocation < 0) {
                console.warn(
                    `No location found for ${path}, set the location explicitly` 
                    + (program ? ' or pass in a shader' : '')
                )
                continue
            }
            const attrIntType = isIntOrUintGlEnum(type)
            if (attrIntType && normalize) console.warn(`(${path}) normalize is ignored for integer vertex attributes`)
            const bytesPerCol = row * buffer.bytes
            for (let i = 0; i < col; i++) {
                gl.enableVertexAttribArray(attribLocation + i)
                const off = offset + (i * bytesPerCol)
                if (attrIntType) {
                    gl.vertexAttribIPointer(attribLocation + i, row, buffer.glFormat, stride, off)
                } else {
                    gl.vertexAttribPointer(
                        attribLocation + i, 
                        row, 
                        buffer.glFormat, 
                        // vertexAttribPointer converts int types to floats between the normalisation range
                        // (-1→1 for signed, 0→1 for unsigned)
                        normalize,  
                        stride, 
                        off
                    )
                }
                if (divisor > 0) gl.vertexAttribDivisor(attribLocation + i, divisor)
            }
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
}


function isIntOrUintGlEnum(glEnum: number) {
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
    readonly vao: WebGLVertexArrayObject
    readonly vertexCount: number
    readonly instanceCount: number
    readonly gl: WebGL2RenderingContext

    constructor(gl: WebGL2RenderingContext, shader: Shader, config: VertexLayoutArgs)
    constructor(gl: WebGL2RenderingContext, config: VertexLayoutArgs)
    constructor(gl: WebGL2RenderingContext, a: Shader | VertexLayoutArgs, b?: VertexLayoutArgs) {
        const config = (b ?? a) as VertexLayoutArgs
        const shader = b ? (a as Shader) : undefined
        const layout = parseVertexLayout(config)
        this.vertexCount = layout.vertices
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