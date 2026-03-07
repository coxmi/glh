
export function renderResult(gl: WebGL2RenderingContext) {
    const canvas = gl.canvas
    const pixels = new Uint8Array(canvas.width * canvas.height * 4)
    gl.readPixels(
        0,
        0,
        canvas.width,
        canvas.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
    )
    return {
        width: canvas.width,
        height: canvas.height,
        pixels: pixels
    }
}


export function saveRenderResult(gl: WebGL2RenderingContext) {    
    window.__rendered = renderResult(gl)
}