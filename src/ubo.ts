import { parseLayout, proxyFromLayout } from './layout.ts'
import type { Layout, ParsedAttributeInfo, ParsedProxyLayout } from './layout.ts'
import { TypedArray } from './types.ts'




// user input args

type UBOSchema = { 
    location?: number
    // remove types from layout internal
    buffer?: never
}

export type UBOArgs = {
	name: string
	bind: number
	layout: Layout<UBOSchema>
}




export class UBO<const UBOConfig extends UBOArgs = UBOArgs> {
	readonly buffer: WebGLBuffer
	readonly data: Float32Array
	readonly loc: number
	readonly name: string
	readonly uniforms: ParsedProxyLayout<UBOConfig['layout']>
	readonly gl: WebGL2RenderingContext

	constructor(gl: WebGL2RenderingContext, config: UBOConfig) {
		const bytes = 4
		const buffer = gl.createBuffer()
		const binding = { bytes, buffer }
		this.buffer = buffer
		this.loc = config.bind
		this.name = config.name
	    const layout = parseLayout<UBOSchema>(config.layout, binding, node => ({
	    	value: node.value
	    }), 'std140') 
	    const desc = layout.bindings[0]

	    if (!desc) console.warn(`No layout description for UBO '${this.name}'`)
	    this.data = new Float32Array(desc.stride / bytes)
		gl.bindBuffer(gl.UNIFORM_BUFFER, buffer)
		gl.bufferData(gl.UNIFORM_BUFFER, desc.stride, gl.DYNAMIC_DRAW)
		gl.bindBufferBase(gl.UNIFORM_BUFFER, this.loc, buffer)

		// initial values
		desc.layout.map(node => {
			// @ts-expect-error
			const v = node.value
			writeToBuffer(this.data, node, v)
		})

		gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.data)

	    this.uniforms = proxyFromLayout(layout, {
	    	get: node => {
	    		// @ts-expect-error
	    		return node.value
	    	},
	    	set: (node, value) => {
	    		// @ts-expect-error
	    		node.value = value
				writeToBuffer(this.data, node, value)
	    		this.bind()
	    		gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.data)
	    		this.unbind()
	    		return true
	    	}
	    });
	    
	    gl.bindBuffer(gl.UNIFORM_BUFFER, null)
	    this.gl = gl
	}

	bind() {
		this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.buffer)
	}

	unbind() {
		this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null)
	}

	delete() {
		this.gl.deleteBuffer(this.buffer)
	}
}

function writeToBuffer(buffer: TypedArray, attr: ParsedAttributeInfo<{}>, value: number | number[]) {
    const base = attr.offset / buffer.BYTES_PER_ELEMENT
    const { row, col, align } = attr
    const stride = align / buffer.BYTES_PER_ELEMENT
    for (let c = 0; c < col; c++) {
        for (let r = 0; r < row; r++) {
            const srcIndex = c * row + r
            const dstIndex = base + c * stride + r
            buffer[dstIndex] = Array.isArray(value)
                ? value[srcIndex]
                : value
        }
    }
}