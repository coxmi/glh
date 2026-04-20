import { Shader, VertexBuffer, VAO, setGLViewport } from 'gleasy'
import { saveRenderResult } from '../../../test/common/render.ts'


// setup

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const gl = canvas.getContext('webgl2')!
setGLViewport(gl, canvas)


// shaders

const vertexSrc = `
    #version 300 es
    in vec2 aPos;
    in vec2 aCoord;
    in vec3 aColor;
    out vec3 vColor;
    void main() {
        vColor = aColor;
        gl_Position = vec4(aCoord + aPos, 0., 1.);
    }
`

const fragmentSrc = `
    #version 300 es
    precision highp float;
    in vec3 vColor;
    out vec4 outColor;
    void main() {
        outColor = vec4(vColor, 0.7);
    }
`


// program

function instances() {

    // three vertices (the triangle)
    const vertex = new VertexBuffer(gl, new Float32Array([
         0.0,  0.5,  
        -0.5, -0.5,
         0.5, -0.5,
    ]))

    // six instanced positions (centres of triangles)
    const instancePos = new VertexBuffer(gl, new Float32Array([
        -1, 0,
        -0.6, 0,
        -0.2, 0,
         0.2, 0,
         0.6, 0,
         1, 0,
    ]))

    // three instanced colours
    const instanceColor = new VertexBuffer(gl, new Float32Array([
        1, 0, 0,
        0.4, 0, 0.5,
        0, 0, 1,
    ]))

    const shader = new Shader(gl, vertexSrc, fragmentSrc)
    const vao = new VAO(gl, shader, {
        buffer: vertex,
        layout: {
            aPos: { type: 'vec2' },
            aCoord: { type: 'vec2', buffer: instancePos, step: 1 },
            aColor: { type: 'vec3', buffer: instanceColor, step: 2 }
        }
    })

    // opacity blend
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    shader.use()
    vao.bind()
    vao.draw()
}


instances()
saveRenderResult(gl)