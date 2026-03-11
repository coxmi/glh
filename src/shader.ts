import { createUniforms } from './uniforms.ts'
import { prettyConsole } from './debug.ts'
import type { Uniforms, UniformArgs } from './uniforms.ts'
import type { Expand } from './util.ts'

/**
 * ```ts
 * // create a shader with automatic uniforms:
 * type Uniforms = { 
 *   uTex: 'sampler2D'
 *   uLightColor: 'vec3[2]'
 * }
 * 
 * const shader = new Shader<Uniforms>(gl, vertex, fragment, {
 *   uTex: 0,
 *   uLightColor: [255,255,255, 100,100,100]
 * })
 * 
 * // update the uniform values during rendering:
 * shader.uniforms.uTex = 1
 * ```
 */

export class Shader<U extends UniformArgs = {}> {
    program: WebGLProgram
    uniforms: Expand<Uniforms<U>>
    gl: WebGL2RenderingContext
    constructor(
        gl: WebGL2RenderingContext, 
        vertexShader: string, 
        fragmentShader: string, 
        uniformValues?: Uniforms<U>
    ) {
        this.program = createProgram(gl, vertexShader, fragmentShader)
        gl.useProgram(this.program)
        this.uniforms = createUniforms<U>(gl, this.program, uniformValues) 
        gl.useProgram(null)
        this.gl = gl
    }
    use() {
        this.gl.useProgram(this.program)
    }
    delete() {
        this.gl.deleteProgram(this.program)
        // @ts-expect-error
        delete this.program
        // @ts-expect-error
        delete this.uniforms
        // @ts-expect-error
        delete this.gl
    }
}


function createProgram(gl: WebGL2RenderingContext, vertexShader: string, fragmentShader: string) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vertexShader)
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader)
    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    // cleanup
    gl.detachShader(program, vs)
    gl.detachShader(program, fs)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(program) as string)
    return program
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source.trimStart())
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = (gl.getShaderInfoLog(shader) || 'Unknown error')
        const [message, ...styles] = prettyConsole(log, source, true)
        console.error('shader compilation failed:\n\n' + message, ...styles)        
        throw new Error('shader compilation failed:\n' + log)
    }

    return shader
}