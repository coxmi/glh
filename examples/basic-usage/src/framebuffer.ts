import { Shader, VertexBuffer, VAO, setGLViewport, Texture, FrameBuffer } from 'gleasy'
import { saveRenderResult } from '../../../test/common/render.ts'


// setup

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const gl = canvas.getContext('webgl2')!
setGLViewport(gl, canvas)


// shaders

const vertexSrc = `
    #version 300 es
    in vec3 aPosition;
    in vec3 aColor;
    out vec3 vColor;
    void main() {
        gl_Position = vec4(aPosition, 1.0);
        vColor = aColor;
    }
`

const fragmentSrc = `
    #version 300 es
    precision highp float;
    in vec3 vColor;
    out vec4 outColor;
    void main() {
        outColor = vec4(vColor, 1.0);
    }
`

// program

function framebuffer() {

    // first pass shader, render triangle
    const triangleShader = new Shader(gl, vertexSrc, fragmentSrc)    
    const triangleVertices = new VertexBuffer(gl, new Float32Array([
         0.0,  0.5, 0.0,  1.0, 0.0, 0.0, 
        -0.5, -0.5, 0.0,  0.0, 1.0, 0.0, 
         0.5, -0.5, 0.0,  0.0, 0.0, 1.0 
    ]))
    const triangleVAO = new VAO(gl, triangleShader, {
        buffer: triangleVertices,
        layout: {
            aPosition: { type: 'vec3' },
            aColor: { type: 'vec3' },
        }
    })

    // second pass shader, full screen quad
    const quad = new VertexBuffer(gl, new Float32Array([
        -1,  1, 0,  
        -1, -1, 0,
         1, -1, 0,
        -1,  1, 0,
         1, -1, 0,
         1,  1, 0,
    ]))
    const vertexSrcDistort = `
        #version 300 es
        in vec3 aPos;
        in vec3 aColor;
        out vec3 vPos;
        out vec3 vColor;
        void main() {
            vPos = aPos;
            vColor = aColor;
            gl_Position = vec4(aPos, 1);
        }
    `
    const fragmentSrcDistort = `
        #version 300 es
        precision mediump float;
        uniform sampler2D uFrame;
        in vec3 vPos;
        out vec4 fragColor;
        void main() {
            // map position from normalised device coordinates (-1..1) to 0..1
            vec2 uv = vPos.xy * 0.5 + 0.5;
            // apply sine-wave wobble horizontally
            float amplitude = 0.01; // max displacement
            float frequency = 50.0; // number of waves
            uv.y += sin(uv.x * frequency) * amplitude;
            uv.x += sin(uv.y * frequency) * amplitude; 
            fragColor = texture(uFrame, uv);
        }
    `

    const distortShader = new Shader<{ uFrame: 'sampler2D' }>(gl, vertexSrcDistort, fragmentSrcDistort, { uFrame: 0 })
    const distortVAO = new VAO(gl, distortShader, {
        buffer: quad,
        layout: {
            aPos: { type:'vec3' }
        }
    })

    // framebuffer
    const texture = new Texture(gl)
    const frame = new FrameBuffer(gl, texture)
    
    // run shaders
    triangleShader.use()
        frame.bind()
        triangleVAO.bind()
        triangleVAO.draw()
        frame.unbind()

    distortShader.use()
        texture.bind(0)
        distortVAO.bind()
        distortVAO.draw()
}


framebuffer()
saveRenderResult(gl)