import type { TypedArray, GLBufferType } from "./types.ts"

/**
 * Set the GL viewport to the currently displayed dimensions of the canvas
 */
export function setGLViewport(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const width = rect.width * dpr
    const height = rect.height * dpr
    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)
}

export function glBufferFormat(gl: WebGL2RenderingContext, arr: TypedArray): GLBufferType {
    if (arr instanceof Float32Array) return gl.FLOAT
    if (arr instanceof Int32Array) return gl.INT
    if (arr instanceof Uint32Array) return gl.UNSIGNED_INT
    if (arr instanceof Int8Array) return gl.BYTE
    if (arr instanceof Uint8Array) return gl.UNSIGNED_BYTE
    if (arr instanceof Uint8ClampedArray) return gl.UNSIGNED_BYTE
    if (arr instanceof Int16Array) return gl.SHORT
    if (arr instanceof Uint16Array) return gl.UNSIGNED_SHORT
    // Unsupported TypedArray types: 
    // Float16Array, Float64Array, BigInt64Array, BigUint64Array

    // @ts-expect-error: arr is type never, but we still need to handle 
    // this at runtime if an unsupported type is used
    throw new Error(`Unsupported TypedArray: ${arr?.constructor?.name}`)
}