import { Shader, VertexBuffer, VAO, setGLViewport } from 'gleasy'
import { saveRenderResult } from '../../../test/common/render.ts'


// setup

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const gl = canvas.getContext('webgl2')!
setGLViewport(gl, canvas)


// shaders

const vertexSrc = `
    #version 300 es
    uniform vec3 uColors[4]; // array of 4 colors
    in vec2 aPosition;
    out vec3 vColor;
    void main() {
        gl_Position = vec4(aPosition, 1.0, 1.0);
        // pick a color based on vertex index
        int idx = gl_VertexID % 4; 
        vColor = uColors[idx];
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

function uniformArrays() {

    type Uniforms = { uColors: 'vec3[4]' }
    const shader = new Shader<Uniforms>(gl, vertexSrc, fragmentSrc, {
        uColors: [
            // red, green, blue, yellow
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0,
            1.0, 1.0, 0.0,
        ]
    })
    
    // 4 vertices for a quad, using gl.TRIANGLE_STRIP
    const buffer = new VertexBuffer(gl, [
        -0.5, -0.5,
         0.5, -0.5,
        -0.5,  0.5,
         0.5,  0.5
    ])

    const vao = new VAO(gl, shader, {
        buffer,
        layout: {
            aPosition: { type: 'vec2' },
        }
    })

    shader.use()
    vao.bind()
    vao.draw(gl.TRIANGLE_STRIP)
}


uniformArrays()
saveRenderResult(gl)