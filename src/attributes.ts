import type { ArrayOfLength, ScalarOrArray, RepeatTuple } from './types.ts'

export type GlslType = typeof GLSL_TYPES[AttributeType]
export type AttributeType = keyof typeof GLSL_TYPES

// limit attribute types depending on use
// e.g. no bool/bvec or sampler types in vertex attributes
export type VertexAttributeType = Exclude<
    AttributeType, 
    'bool' | 'bvec2' | 'bvec3' | 'bvec4' | 'sampler2D' | 'samplerCube'
>

// TODO: should this return a repeated tuple, or an array of arrays?
// uniforms currently use repeated tuple, but not sure if the DX is quite right
export type AttributeValueTypes<C extends number = 1> = {
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
    mat2: RepeatTuple<ArrayOfLength<number, 4>, C>
    mat3: RepeatTuple<ArrayOfLength<number, 9>, C>
    mat4: RepeatTuple<ArrayOfLength<number, 16>, C>
    mat2x3: RepeatTuple<ArrayOfLength<number, 6>, C>
    mat2x4: RepeatTuple<ArrayOfLength<number, 8>, C>
    mat3x2: RepeatTuple<ArrayOfLength<number, 6>, C>
    mat3x4: RepeatTuple<ArrayOfLength<number, 12>, C>
    mat4x2: RepeatTuple<ArrayOfLength<number, 8>, C>
    mat4x3: RepeatTuple<ArrayOfLength<number, 12>, C>
    sampler2D: ScalarOrArray<number, C>
    samplerCube: ScalarOrArray<number, C>
}

export const GLSL_TYPES = {
    float: 0x1406, vec2: 0x8B50, vec3: 0x8B51, vec4: 0x8B52,
    int: 0x1404, ivec2: 0x8B53, ivec3: 0x8B54, ivec4: 0x8B55,
    uint: 0x1405, uvec2: 0x8DC6, uvec3: 0x8DC7, uvec4: 0x8DC8,
    bool: 0x8B56, bvec2: 0x8B57, bvec3: 0x8B58, bvec4: 0x8B59,
    mat2: 0x8B5A, mat3: 0x8B5B, mat4: 0x8B5C,
    mat2x3: 0x8B65, mat2x4: 0x8B66,
    mat3x2: 0x8B67, mat3x4: 0x8B68,
    mat4x2: 0x8B69, mat4x3: 0x8B6A,
    sampler2D: 0x8B5E,
    samplerCube: 0x8B60
} as const


// export const GLSL_INT_TYPES = new Set([
//     GLSL_TYPES.int, GLSL_TYPES.ivec2, GLSL_TYPES.ivec3, GLSL_TYPES.ivec4,
//     GLSL_TYPES.uint, GLSL_TYPES.uvec2, GLSL_TYPES.uvec3, GLSL_TYPES.uvec4,
//     GLSL_TYPES.bool, GLSL_TYPES.bvec2, GLSL_TYPES.bvec3, GLSL_TYPES.bvec4
// ] as Array<number>)


export const TYPE_SIZE = {
    float: { row: 1, col: 1 },
    vec2: { row: 2, col: 1 },
    vec3: { row: 3, col: 1 },
    vec4: { row: 4, col: 1 },
    int: { row: 1, col: 1 },
    ivec2: { row: 2, col: 1 },
    ivec3: { row: 3, col: 1 },
    ivec4: { row: 4, col: 1 },
    uint: { row: 1, col: 1 },
    uvec2: { row: 2, col: 1 },
    uvec3: { row: 3, col: 1 },
    uvec4: { row: 4, col: 1 },
    bool: { row: 1, col: 1 },
    bvec2: { row: 2, col: 1 },
    bvec3: { row: 3, col: 1 },
    bvec4: { row: 4, col: 1 },
    mat2: { row: 2, col: 2 },
    mat3: { row: 3, col: 3 },
    mat4: { row: 4, col: 4 },
    mat2x3: { row: 3, col: 2 },
    mat2x4: { row: 4, col: 2 },
    mat3x2: { row: 2, col: 3 },
    mat3x4: { row: 4, col: 3 },
    mat4x2: { row: 2, col: 4 },
    mat4x3: { row: 3, col: 4 }
}

export const STD140_ALIGN = {
    float: 4, vec2: 8, vec3: 16, vec4: 16,
    int: 4, ivec2: 8, ivec3: 16, ivec4: 16,
    uint: 4, uvec2: 8, uvec3: 16, uvec4: 16,
    bool: 4, bvec2: 8, bvec3: 16, bvec4: 16,
    mat2: 16, mat3: 16, mat4: 16,
    mat2x3: 16, mat2x4: 16,
    mat3x2: 16, mat3x4: 16,
    mat4x2: 16, mat4x3: 16,
} as const
