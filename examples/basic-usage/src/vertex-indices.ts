import { Shader, VertexBuffer, VertexIndex, VAO, setGLViewport } from 'gleasy'
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

function vertexIndices() {
    const shader = new Shader(gl, vertexSrc, fragmentSrc)
    const buffer = new VertexBuffer(gl, new Float32Array([
         0.0,  0.5, 0.0,  1.0, 0.0, 0.0, 
        -0.5, -0.5, 0.0,  0.0, 1.0, 0.0, 
         0.5, -0.5, 0.0,  0.0, 0.0, 1.0 
    ]))

    // use unsigned int TypedArrays for indices:
    // (e.g. Uint8Array, Uint16Array, Uint32Array, Uint8ClampedArray)
    const index = new VertexIndex(gl, new Uint8Array([0, 1, 2]))
    const index2 = new VertexIndex(gl, new Uint8Array([2, 1, 0]))

    const vao = new VAO(gl, shader, {
        // the first index is bound in the 
        // vertex array object
        index, 
        buffer,
        layout: {
            aPosition: { type: 'vec3' },
            aColor: { type: 'vec3' },
        }
    })
    shader.use()
    // no need to bind/draw the first index, as 
    // it's bound implicitly within the VAO
    vao.bind()
    vao.draw()

    // but if you have multiple indexes, 
    // these can be bound/drawn explicitly
    vao.bind()
    index2.bind()
    index2.draw()
}


vertexIndices()
saveRenderResult(gl)