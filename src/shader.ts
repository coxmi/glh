import { createUniforms } from './uniforms.ts'
import { prettyConsole } from './debug.ts'
import type { UBO } from './ubo.ts'
import type { Uniforms, UniformArgs } from './uniforms.ts'
import type { Expand } from './types.ts'


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

type ShaderConfig<U extends UniformArgs> = {
    vertex: string
    fragment: string
    ubo?: UBO | UBO[]
    uniforms?: Uniforms<U>
}

type ShaderConstructor<U extends UniformArgs> =
    | [gl: WebGL2RenderingContext, config: ShaderConfig<U>]
    | [gl: WebGL2RenderingContext, vertex: string, fragment: string, uniforms?: Uniforms<U>]


export class Shader<U extends UniformArgs = UniformArgs> {
    readonly program: WebGLProgram
    readonly uniforms: Expand<Uniforms<U>>
    readonly gl: WebGL2RenderingContext

    constructor(...args: ShaderConstructor<U>) {
        const gl = args[0]
        const config: ShaderConfig<U> = args.length === 2 
            ? args[1] 
            : { vertex: args[1], fragment: args[2], uniforms: args[3] }

        this.program = createProgram(gl, config.vertex, config.fragment)
        gl.useProgram(this.program)
        this.uniforms = createUniforms<U>(gl, this.program, config.uniforms) 

        if (config.ubo) {
            const ubos = Array.isArray(config.ubo) ? config.ubo : [config.ubo]
            for (const ubo of ubos) {
                const index = gl.getUniformBlockIndex(this.program, ubo.name)
                if (index < 0) console.warn(`Couldn't find uniform block index for ${ubo.name}`)
                gl.uniformBlockBinding(this.program, index, ubo.loc)
            }
        }

        gl.useProgram(null)
        this.gl = gl
    }
    use() {
        this.gl.useProgram(this.program)
    }
    delete() {
        this.gl.deleteProgram(this.program)
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