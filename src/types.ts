
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


// unwrap ts types to show a better hover message
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

export type DeepMutable<T> =
 T extends string | number | boolean | bigint | symbol | null | undefined
   ? T
   : T extends (...args: any[]) => any
     ? T
     : T extends readonly [...infer U]
       ? { -readonly [K in keyof U]: DeepMutable<U[K]> }
       : T extends ReadonlyArray<infer U>
         ? DeepMutable<U>[]
         : T extends object
           ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
           : T;


// check if number type is const/literal or just number type
type IsConstNumber<T> = 
    T extends number 
    ? number extends T ? false : true
    : true

// array of type T, length N
export type ArrayOfLength<T, N extends number, A extends T[] = []> =
    IsConstNumber<N> extends true
        ? A['length'] extends N
            ? A
            : ArrayOfLength<T, N, [...A, T]>
        : T[]

// wrap in array if over 1
export type ScalarOrArray<T extends any, C extends number> = C extends 1 ? T : ArrayOfLength<T, C>

// repeat a tuple's contents e.g. RepeatTuple<[number], 2> = [number, number]
export type RepeatTuple<
    T extends unknown[], 
    N extends number, 
    Count extends unknown[] = [], 
    R extends unknown[] = []
> = Count['length'] extends N 
    ? R 
    : RepeatTuple<T, N, [...Count, unknown], [...R, ...T]>