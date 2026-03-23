import { TYPE_SIZE } from './attributes.ts'
import { glTypeFromTypedArray } from './util.ts'
import type { TypedArray, UintTypedArray, DrawMode, GLType } from './types.ts'
import type { VertexAttributeType } from './attributes.ts'
import type { Shader } from './shader.ts'


type VertexBufferLayout = Array<{
    type: VertexAttributeType
    location: number
}>

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
    vertices: TypedArray
    layouts?: ParsedLayout[]
    gl: WebGL2RenderingContext

    constructor(gl: WebGL2RenderingContext, vertices: TypedArray | Array<number>) {
        const buffer = gl.createBuffer()
        this.buffer = buffer 
        this.vertices = Array.isArray(vertices) ? new Float32Array(vertices) : vertices
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)
        this.gl = gl
    }

    get count() {
        return this.vertices.length
    }

    get bytes() {
        return this.vertices.BYTES_PER_ELEMENT
    }

    get glType() {
        return glTypeFromTypedArray(this.gl, this.vertices)
    }

    setLayout(layout: VertexBufferLayout) {
        this.layouts = parseLayouts({ buffer: this, layout })
    }

    bindLayout() {
        if (!this.layouts) throw new Error('No layout set for VertexBuffer')
        bindAttributes(this.gl, this.layouts, /* no shader specified */ undefined)
    }

    bind() {
        const gl = this.gl
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    }

    unbind() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
    }

    draw(mode: DrawMode = this.gl.TRIANGLES) {
        if (!this.layouts) throw new Error(
            'Cannot draw vertex buffer directly without a layout description: ' +
            `use a VAO or set a layout with "buffer.layout = [{ location: 0, type: 'vec3' }]"`
        );
        const { stride } = this.layouts[0]
        const vertexCount = this.count / stride
        this.gl.drawArrays(mode, 0, vertexCount)
    }

    delete() {
        this.gl.deleteBuffer(this.buffer)
        // @ts-expect-error
        delete this.buffer
        // @ts-expect-error
        delete this.vertices
        // @ts-expect-error
        delete this.gl
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
    indices: UintTypedArray
    gl: WebGL2RenderingContext

    constructor(gl: WebGL2RenderingContext, indices: UintTypedArray | Array<number>) {
        this.buffer = gl.createBuffer()
        this.indices = Array.isArray(indices) ? new Uint16Array(indices) : indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
        this.gl = gl
    }

    get count() {
        return this.indices.length
    }

    get bytes() {
        return this.indices.BYTES_PER_ELEMENT
    }

    get glType() {
        return glTypeFromTypedArray(this.gl, this.indices)
    }

    bind() {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffer)
    }

    unbind() {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null)
    }

    draw(mode: DrawMode = this.gl.TRIANGLES, offset = 0) {
        this.gl.drawElements(mode, this.count, this.glType, offset)
    }

    delete() {
        this.gl.deleteBuffer(this.buffer)
        // @ts-expect-error
        delete this.buffer
        // @ts-expect-error
        delete this.indices
        // @ts-expect-error
        delete this.gl
    }
}

type LayoutArgs = {
    buffer?: VertexBuffer
    index?: VertexIndex
    layout: 
        | Array<{
            type: VertexAttributeType
            buffer?: VertexBuffer
            location: number
        }>
        | Record<string, {
            type: VertexAttributeType
            buffer?: VertexBuffer
            location?: number
        }>
}

type ParsedLayout = { 
    buffer: VertexBuffer
    stride: number
    layout: Record<string,ParsedAttributeInfo>
}

type ParsedAttributeInfo = { 
    length: number
    columns: number
    offset: number
    location?: number
}

function arrayToObject<T = any>(arr: T[]): Record<string,T> {
    const obj: Record<string, T> = {}
    for (let i = 0, l = arr.length; i < l; i++) {
        obj[i.toString()] = arr[i]
    }
    return obj
}

function parseLayouts(input: LayoutArgs) {
    const layouts: ParsedLayout[] = []
    const buffers = new Map<VertexBuffer, number>()
    const userLayout = Array.isArray(input.layout) ? arrayToObject(input.layout) : input.layout

    for (const name in userLayout) {
        const schema = userLayout[name]
        const buffer = schema.buffer || input.buffer
        if (!buffer) throw new Error('No buffer set for ' + name)
        let index = buffers.get(buffer)
        if (index === undefined) buffers.set(buffer, index = buffers.size)
        const layout = layouts[index] ?? (layouts[index] = { buffer, stride: 0, layout: {} })
        const size = TYPE_SIZE[schema.type]
        // TODO: may need compatibility debug message here that takes into consideration buffer's glType
        // and compares it with the options for attribute types (e.g. using a Uint16Array with an int)
        // if (!typeCompatible(buffer.glType, info.gl) {
        //     console.warn(`Mismatched buffer and attribute types: buffer (${buffer.glType}) attribute:${name} (${info.gl})`)
        // }
        layout.layout[name] = {
            length: size.row,
            columns: size.col,
            offset: layout.stride,
            location: schema.location,
        }
        layout.stride += size.row
    }

    let vertices = 0
    for (const { buffer, stride } of layouts) {
        const elements = buffer.count / stride
        if (!vertices) vertices = elements
        // validate stride length as a factor of the overall buffer length
        const name = `${buffer.constructor.name} – ${buffer.buffer.constructor.name}(elements:${buffer.count})`
        if (buffer.count % stride !== 0) {
            const message = `${name}: attribute stride (${stride}) is not a factor of buffer size (${buffer.count}).`
            console.warn(message, buffer)
        }
        // validate vertex length is equal for all sibling buffers
        if (elements !== vertices) {
            console.warn(`${name}: Vertex count (${vertices}) does not match other buffers (${elements})`)
        }
    }
    return layouts
}

function isIntOrUintType(gl: WebGL2RenderingContext, glEnum: GLType) {
    return (
        glEnum === gl.INT 
        || glEnum === gl.UNSIGNED_INT 
        || glEnum === gl.BYTE 
        || glEnum === gl.UNSIGNED_BYTE
        || glEnum === gl.SHORT
        || glEnum === gl.UNSIGNED_SHORT
    )
}

function bindAttributes(gl: WebGL2RenderingContext, parsedLayouts: ParsedLayout[], program?: WebGLProgram): void {
    for (const item of parsedLayouts) {
        const { stride, buffer, layout } = item
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer)
        for (const name in layout) {
            const { length, columns, offset, location } = layout[name]
            const attribLocation = location ?? (program ? gl.getAttribLocation(program, name) : -1)
            if (attribLocation < 0) {
                console.warn(
                    `No location found for ${name}, set the location explicitly` 
                    + (program ? ' or pass in a shader' : '')
                )
                continue
            }
            const rows = length / columns
            const bytesPerCol = rows * buffer.bytes
            for (let i = 0; i < columns; i++) {
                gl.enableVertexAttribArray(attribLocation + i)
                const str = stride * buffer.bytes
                const off = (offset * buffer.bytes) + (i * bytesPerCol)
                // TODO: work out normalization option (converts ints to -1→1 for signed, 0→1 for unsigned)
                // needs to branch on attribute type (int vs float types), not buffer type, then normalisation 
                // can work to convert int types to floats between the normalisation range
                if (isIntOrUintType(gl, buffer.glType)) {
                    gl.vertexAttribIPointer(attribLocation + i, rows, buffer.glType, str, off)
                } else {
                    gl.vertexAttribPointer(
                        attribLocation + i, rows, buffer.glType, 
                        // TODO: normalisation, see above
                        false,  
                        str, off
                    )
                }
            }
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
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
    layouts: ParsedLayout[]
    vao: WebGLVertexArrayObject
    gl: WebGL2RenderingContext

    constructor(gl: WebGL2RenderingContext, shader: Shader, config: LayoutArgs)
    constructor(gl: WebGL2RenderingContext, config: LayoutArgs)
    constructor(gl: WebGL2RenderingContext, a: Shader | LayoutArgs, b?: LayoutArgs) {
        const config = (b ?? a) as LayoutArgs
        const shader = b ? (a as Shader) : undefined
        this.layouts = parseLayouts(config)
        this.vao = gl.createVertexArray()
        gl.bindVertexArray(this.vao)
        bindAttributes(gl, this.layouts, shader?.program)
        if (config.index) config.index.bind()
        gl.bindVertexArray(null)
        this.gl = gl
    }

    get vertexCount() {
        // only use the first element since they all match in element count
        const { buffer, stride } = this.layouts[0]
        return buffer.count / stride
    }

    bind() {
        this.gl.bindVertexArray(this.vao)
    }
    unbind() {
        this.gl.bindVertexArray(null)
    }

    draw(mode: DrawMode = this.gl.TRIANGLES) {
        this.gl.drawArrays(mode, 0, this.vertexCount)
    }

    delete() {
        this.gl.deleteVertexArray(this.vao)
        // @ts-expect-error
        delete this.layouts
        // @ts-expect-error
        delete this.vao
        // @ts-expect-error
        delete this.gl
    }
}