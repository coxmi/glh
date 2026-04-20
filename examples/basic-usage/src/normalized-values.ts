import { Shader, VertexBuffer, VAO, setGLViewport } from 'gleasy'
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

function normalizedValues() {
    const shader = new Shader(gl, vertexSrc, fragmentSrc)

    const vertex = new VertexBuffer(gl, new Int8Array([
           0,  127, 0,
        -127, -127, 0,
         127, -127, 0,
    ]))
    const color = new VertexBuffer(gl, new Uint8Array([
        255, 0, 0, 
        0, 255, 0, 
        0, 0, 255 
    ]))
    const vao = new VAO(gl, shader, {
        layout: {
            aPosition: { type: 'vec3', buffer: vertex, normalize: true },
            aColor: { type: 'vec3', buffer: color, normalize: true },
        }
    })
    shader.use()
    vao.bind()
    vao.draw()
}


normalizedValues()
saveRenderResult(gl)