
type TextureOptions = {
    flip?: boolean // false
    repeat?: boolean // false
    repeatMirror?: boolean // false
    mipmaps?: boolean // false
    interpolate?: boolean // true
    interpolateMips?: boolean // true
}

type TextureWrap =
    | WebGLRenderingContextBase['CLAMP_TO_EDGE']
    | WebGLRenderingContextBase['REPEAT']
    | WebGLRenderingContextBase['MIRRORED_REPEAT']

type TextureFilter = 
    | WebGLRenderingContextBase['NEAREST']
    | WebGLRenderingContextBase['LINEAR']
    | WebGLRenderingContextBase['LINEAR_MIPMAP_LINEAR']
    | WebGLRenderingContextBase['LINEAR_MIPMAP_NEAREST']
    | WebGLRenderingContextBase['NEAREST_MIPMAP_LINEAR']
    | WebGLRenderingContextBase['NEAREST_MIPMAP_NEAREST']

function textureWrap(gl: WebGL2RenderingContext, options: TextureOptions = {}): TextureWrap {
    const { 
        repeat = false, 
        repeatMirror = false 
    } = options
    if (!repeat) return gl.CLAMP_TO_EDGE
    return repeatMirror ? gl.MIRRORED_REPEAT : gl.REPEAT
}

function textureInterpolate(gl: WebGL2RenderingContext, options: TextureOptions = {}): TextureFilter {
    const { mipmaps = false, interpolate = true, interpolateMips = true } = options
    if (!mipmaps) return interpolate ? gl.LINEAR : gl.NEAREST
    if (interpolate && interpolateMips) return gl.LINEAR_MIPMAP_LINEAR
    if (interpolate && !interpolateMips) return gl.LINEAR_MIPMAP_NEAREST
    if (!interpolate && interpolateMips) return gl.NEAREST_MIPMAP_LINEAR
    if (!interpolate && !interpolateMips) return gl.NEAREST_MIPMAP_NEAREST
    return gl.LINEAR_MIPMAP_LINEAR
}

/**
 * create a new Texture, optionally from a source (e.g. image, canvas, video elements)
 */
export class Texture {

    texture: WebGLTexture
    gl: WebGL2RenderingContext

    constructor(
    	gl: WebGL2RenderingContext, 
    	source?: TexImageSource | null, 
    	options: TextureOptions = {}) {

        const texture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texture)

        // flip Y coordinates so we don't have to do this in the shader
        if (options.flip) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

        if (source) {
        	const error = 'complete' in source && !source.complete
            if (error) console.warn('Texture source must be fully loaded before saving to a texture')            
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
        } else {
        	const width = gl.canvas.width
        	const height = gl.canvas.height
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        }

        if (options.mipmaps) gl.generateMipmap(gl.TEXTURE_2D)

        // reset options to default if we set them
        // NOTE: WebGL doesn't allow querying for pixelStorei values
        if (options.flip) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)

        const TEXTURE_INTERPOLATE = textureInterpolate(gl, options)
        const TEXTURE_WRAP = textureWrap(gl, options)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, TEXTURE_INTERPOLATE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, TEXTURE_INTERPOLATE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, TEXTURE_WRAP)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, TEXTURE_WRAP)
        
        gl.bindTexture(gl.TEXTURE_2D, null)
        this.texture = texture
        this.gl = gl
    }

    bind(activeTextureLocation?: number) {
        if (activeTextureLocation !== undefined) this.gl.activeTexture(this.gl.TEXTURE0 + activeTextureLocation)
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
    }

    unbind() { 
        this.gl.bindTexture(this.gl.TEXTURE_2D, null)
    }

    delete() {
        this.gl.deleteTexture(this.texture)
        // @ts-expect-error
        delete this.texture
        // @ts-expect-error
        delete this.gl
    }
}