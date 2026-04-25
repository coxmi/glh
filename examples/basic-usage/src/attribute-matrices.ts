import { Shader, VertexBuffer, VAO, setGLViewport } from 'gleasy'
import { saveRenderResult } from '../../../test/common/render.ts'


// setup

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const gl = canvas.getContext('webgl2')!
setGLViewport(gl, canvas)


// shaders

const vertexSrc = `
    #version 300 es
    precision mediump float;

    in mat3 aMatrix;
    in vec3 aPosition;
    in vec3 aColor;

    out vec3 vColor;
    out vec3 aTransformed;

    void main() {
        vec3 aTransform = aMatrix * aPosition;
        gl_Position = vec4(aTransform, 1.0);
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

function attributeMatrices() {
    const shader = new Shader(gl, vertexSrc, fragmentSrc)

    const buffer = new VertexBuffer(gl, new Float32Array([
         // vertices: xyz, rgb, mat3
         0.0,  0.5, 0.0,   1, 0, 0,  ...matrix.identity(),
        -0.5, -0.5, 0.0,   0, 1, 0,  ...matrix.identity(),
         0.5, -0.5, 0.0,   0, 0, 1,  ...matrix.identity(),

         // second triangle smaller, darker, and rotated 180deg
         0.0,  0.4, 0.0,   0.5, 0, 0,  ...matrix.rotate(Math.PI),
        -0.4, -0.4, 0.0,   0, 0.5, 0,  ...matrix.rotate(Math.PI),
         0.4, -0.4, 0.0,   0, 0, 0.5,  ...matrix.rotate(Math.PI),
    ]))

    const vao = new VAO(gl, shader, {
        buffer,
        layout: {
            aPosition: { type: 'vec3' },
            aColor: { type: 'vec3' },
            aMatrix: { type: 'mat3' },
        }
    })

    shader.use()
    vao.bind()
    vao.draw()
}


// simple mat3 examples

const matrix = {
    identity() {
        return [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]
    },
    rotate(radians: number) {
        var c = Math.cos(radians)
        var s = Math.sin(radians)
        return [
          c, -s, 0,
          s, c, 0,
          0, 0, 1,
        ];
    }
}


attributeMatrices()
saveRenderResult(gl)