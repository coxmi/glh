import { Texture } from './texture.ts'

export class FrameBuffer {
    readonly buffer: WebGLFramebuffer
    readonly texture: Texture
    readonly gl: WebGL2RenderingContext

    constructor(gl: WebGL2RenderingContext, texture?: Texture, attachLocation = 0) {
        const fbo = gl.createFramebuffer()
        const tex = texture || new Texture(gl)
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, 
            gl.COLOR_ATTACHMENT0 + attachLocation, 
            gl.TEXTURE_2D, 
            tex.texture, 
            0
        )
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
            throw new Error('Framebuffer incomplete')
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.bindTexture(gl.TEXTURE_2D, null)
        this.buffer = fbo
        this.texture = tex
        this.gl = gl        
    }

    bind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.buffer)
    }

    unbind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
    }

    delete() {
        this.gl.deleteBuffer(this.buffer)
    }
}
