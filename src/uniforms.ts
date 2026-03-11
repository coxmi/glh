import type { Expand } from "./util.ts"

/**
 * Basic uniform types
 */
export type UniformType =
    | 'float' | 'vec2' | 'vec3' | 'vec4'
    | 'int' | 'ivec2' | 'ivec3' | 'ivec4'
    | 'uint' | 'uvec2' | 'uvec3' | 'uvec4'
    | 'bool' | 'bvec2' | 'bvec3' | 'bvec4'
    | 'mat2' | 'mat3' | 'mat4'
    | 'mat2x3' | 'mat2x4'
    | 'mat3x2' | 'mat3x4'
    | 'mat4x2' | 'mat4x3'
    | 'sampler2D' | 'samplerCube'

/**
 * Allowed values in the uniform setters
 */
type UniformValueMap<C extends number> = {
    float: ScalarOrArray<number, C>
    vec2: RepeatTuple<[number, number], C>
    vec3: RepeatTuple<[number, number, number], C>
    vec4: RepeatTuple<[number, number, number, number], C>

    int: ScalarOrArray<number, C>
    ivec2: RepeatTuple<[number, number], C>
    ivec3: RepeatTuple<[number, number, number], C>
    ivec4: RepeatTuple<[number, number, number, number], C>

    uint: ScalarOrArray<number, C>
    uvec2: RepeatTuple<[number, number], C>
    uvec3: RepeatTuple<[number, number, number], C>
    uvec4: RepeatTuple<[number, number, number, number], C>

    bool: ScalarOrArray<number, C>
    bvec2: RepeatTuple<[number, number], C>
    bvec3: RepeatTuple<[number, number, number], C>
    bvec4: RepeatTuple<[number, number, number, number], C>

    mat2: RepeatTuple<ArrayLength<number, 4>, C>
    mat3: RepeatTuple<ArrayLength<number, 9>, C>
    mat4: RepeatTuple<ArrayLength<number, 16>, C>
    mat2x3: RepeatTuple<ArrayLength<number, 6>, C>
    mat2x4: RepeatTuple<ArrayLength<number, 8>, C>
    mat3x2: RepeatTuple<ArrayLength<number, 6>, C>
    mat3x4: RepeatTuple<ArrayLength<number, 12>, C>
    mat4x2: RepeatTuple<ArrayLength<number, 8>, C>
    mat4x3: RepeatTuple<ArrayLength<number, 12>, C>

    sampler2D: ScalarOrArray<number, C>
    samplerCube: ScalarOrArray<number, C>
}


/*
 * Type helpers for handling uniform arrays:
 * e.g. vec3[4] -> number[12]
 * e.g. vec3 -> number[3]
 * e.g. float[2] -> number[2]
 * e.g. float -> number
 */

// parse out the base uniform type (e.g. vec3 from 'vec3[4]')
type ParseUniformType<S extends string> = S extends `${infer U}[${string}]` ? U : S

// parse out the array length (e.g. 4 from 'vec3[4]')
type ParseArrayLength<S extends string> = S extends `${string}[${infer N extends number}]` ? N : never

// array of type T, length L
type ArrayLength<T, L extends number, R extends T[] = []> = 
    R['length'] extends L 
        ? R 
        : ArrayLength<T, L, [...R, T]>

// wrap in array if over 1
type ScalarOrArray<T extends any, C extends number> = C extends 1 ? T : ArrayLength<T, C>

// repeat a tuple's contents e.g. RepeatTuple<[number], 2> = [number, number]
type RepeatTuple<
    T extends unknown[], 
    N extends number, 
    Count extends unknown[] = [], 
    R extends unknown[] = []
> = Count['length'] extends N 
    ? R 
    : RepeatTuple<T, N, [...Count, unknown], [...R, ...T]>

// detect array length vec3[x], or fall back to single vec3
type UniformValue<T extends string> =
    ParseUniformType<T> extends UniformType
        ? ParseArrayLength<T> extends never
            ? T extends `${string}[]`
                ? number[]
                : UniformValueMap<1>[ParseUniformType<T> & keyof UniformValueMap<1>]
            : UniformValueMap<ParseArrayLength<T>>[ParseUniformType<T> & keyof UniformValueMap<ParseArrayLength<T>>]
        : never

// allowed user input vec3 / vec3[] / vec3[4]
export type UniformTypeWithSizes = 
    | UniformType
    | `${UniformType}[${number}]`
    | `${UniformType}[]`

export type UniformArgs = Record<string, UniformTypeWithSizes>

export type Uniforms<T extends UniformArgs> = {
    [K in keyof T]: UniformValue<T[K]>
}

// create setters

const GL = WebGL2RenderingContext
const setters: Record<GLenum, (gl: WebGL2RenderingContext, loc: WebGLUniformLocation, v: any) => void> = {
    [GL.FLOAT]: (gl, loc, v) => gl.uniform1f(loc, v),
    [GL.FLOAT_VEC2]: (gl, loc, v) => gl.uniform2fv(loc, v),
    [GL.FLOAT_VEC3]: (gl, loc, v) => gl.uniform3fv(loc, v),
    [GL.FLOAT_VEC4]: (gl, loc, v) => gl.uniform4fv(loc, v),
    [GL.INT]: (gl, loc, v) => gl.uniform1i(loc, v),
    [GL.INT_VEC2]: (gl, loc, v) => gl.uniform2iv(loc, v),
    [GL.INT_VEC3]: (gl, loc, v) => gl.uniform3iv(loc, v),
    [GL.INT_VEC4]: (gl, loc, v) => gl.uniform4iv(loc, v),
    [GL.UNSIGNED_INT]: (gl, loc, v) => gl.uniform1ui(loc, v),
    [GL.UNSIGNED_INT_VEC2]: (gl, loc, v) => gl.uniform2uiv(loc, v),
    [GL.UNSIGNED_INT_VEC3]: (gl, loc, v) => gl.uniform3uiv(loc, v),
    [GL.UNSIGNED_INT_VEC4]: (gl, loc, v) => gl.uniform4uiv(loc, v),
    [GL.BOOL]: (gl, loc, v) => gl.uniform1i(loc, v),
    [GL.BOOL_VEC2]: (gl, loc, v) => gl.uniform2iv(loc, v),
    [GL.BOOL_VEC3]: (gl, loc, v) => gl.uniform3iv(loc, v),
    [GL.BOOL_VEC4]: (gl, loc, v) => gl.uniform4iv(loc, v),
    [GL.FLOAT_MAT2]: (gl, loc, v) => gl.uniformMatrix2fv(loc, false, v),
    [GL.FLOAT_MAT3]: (gl, loc, v) => gl.uniformMatrix3fv(loc, false, v),
    [GL.FLOAT_MAT4]: (gl, loc, v) => gl.uniformMatrix4fv(loc, false, v),
    [GL.FLOAT_MAT2x3]: (gl, loc, v) => gl.uniformMatrix2x3fv(loc, false, v),
    [GL.FLOAT_MAT2x4]: (gl, loc, v) => gl.uniformMatrix2x4fv(loc, false, v),
    [GL.FLOAT_MAT3x2]: (gl, loc, v) => gl.uniformMatrix3x2fv(loc, false, v),
    [GL.FLOAT_MAT3x4]: (gl, loc, v) => gl.uniformMatrix3x4fv(loc, false, v),
    [GL.FLOAT_MAT4x2]: (gl, loc, v) => gl.uniformMatrix4x2fv(loc, false, v),
    [GL.FLOAT_MAT4x3]: (gl, loc, v) => gl.uniformMatrix4x3fv(loc, false, v),
    [GL.SAMPLER_2D]: (gl, loc, v) => gl.uniform1i(loc, v),
    [GL.SAMPLER_CUBE]: (gl, loc, v) => gl.uniform1i(loc, v)
}


/**
 * create uniforms with typed setters
 * Works with:
 *  - Arrays with a specific length: vec3[8]
 *  - Or an unspecified length: vec3[]
 * 
 */
export function createUniforms<T extends UniformArgs>(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    initial?: Uniforms<T>
): Expand<Uniforms<T>> {
    const values: Record<string, any> = {}
    const uniformInfo: Record<string, { loc: WebGLUniformLocation, type: number }> = {}
    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < numUniforms; i++) {
        const { name, type } = gl.getActiveUniform(program, i)!
        const loc = gl.getUniformLocation(program, name)
        const setter = loc && setters[type]
        if (!setter) {
            console.warn('Unsupported uniform type:', type, name)
            continue
        }
        // normalize array names for setters
        const setterName = name.endsWith('[0]') ? name.slice(0, -3) : name
        uniformInfo[setterName] = { loc, type: type }
        if (initial && setterName in initial) {
            values[setterName] = initial[setterName as keyof typeof initial]
        }
    }

    if (initial) {
        for (const key in initial) {
            if (!(key in uniformInfo)) console.warn(`Uniform '${key}' not used in shader`)
            const uniform = uniformInfo[key]
            if (uniform) setters[uniform.type](gl, uniform.loc, initial[key])
        }
    }

    return new Proxy(values, {
        get: (_, prop: string) => values[prop],
        set (_, prop: string, v: any) {
            const info = uniformInfo[prop]
            if (!info) throw new Error(`Uniform '${prop}' not used in shader`)
            values[prop] = v
            setters[info.type](gl, info.loc, v)
            return true
        }
    }) as Expand<Uniforms<T>>
}