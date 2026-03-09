
export type TypedArray =
    | Float32Array
    | Int8Array
    | Int16Array
    | Int32Array
    | Uint8Array
    | Uint16Array
    | Uint32Array
    | Uint8ClampedArray
    // unsupported due to no equivalent gl enum types
    // Float16Array
    // Float64Array
    // BigInt64Array
    // BigUint64Array

export type UintTypedArray =
    | Uint8Array
    | Uint16Array
    | Uint32Array
    | Uint8ClampedArray

export type GLType = 
    | WebGLRenderingContextBase['BYTE'] 
    | WebGLRenderingContextBase['UNSIGNED_BYTE']
    | WebGLRenderingContextBase['SHORT'] 
    | WebGLRenderingContextBase['UNSIGNED_SHORT'] 
    | WebGLRenderingContextBase['INT'] 
    | WebGLRenderingContextBase['UNSIGNED_INT'] 
    | WebGLRenderingContextBase['FLOAT'] 

export type DrawMode = 
    | WebGLRenderingContextBase['POINTS']
    | WebGLRenderingContextBase['LINES']
    | WebGLRenderingContextBase['LINE_LOOP']
    | WebGLRenderingContextBase['LINE_STRIP']
    | WebGLRenderingContextBase['TRIANGLES']
    | WebGLRenderingContextBase['TRIANGLE_STRIP']
    | WebGLRenderingContextBase['TRIANGLE_FAN']

