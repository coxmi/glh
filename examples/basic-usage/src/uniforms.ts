import { Shader, VertexBuffer, VAO, setGLViewport } from 'gleasy'
import { saveRenderResult } from '../../../test/common/render.ts'


// setup

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const gl = canvas.getContext('webgl2')!
setGLViewport(gl, canvas)


// shaders

const vertexSrc = `
    #version 300 es
    // uniform added to transform position attribute
    uniform vec3 uMovePos; 
    in vec3 aPosition;
    in vec3 aColor;
    out vec3 vColor;

    void main() {
        gl_Position = vec4(aPosition + uMovePos, 1.0);
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

function uniforms() {
    
    // use type hints for uniforms, and set initial values
    type Uniforms = { uMovePos: 'vec3' }
    const shader = new Shader<Uniforms>(gl, vertexSrc, fragmentSrc, {
        uMovePos: [0.25, 0.25, 0.25]
    })

    const buffer = new VertexBuffer(gl, [ 
         0.0,  0.5, 0.0,  1.0, 0.0, 0.0, 
        -0.5, -0.5, 0.0,  0.0, 1.0, 0.0, 
         0.5, -0.5, 0.0,  0.0, 0.0, 1.0 
    ])

    const vao = new VAO(gl, shader, {
        buffer,
        layout: {
            aPosition: { type: 'vec3' },
            aColor: { type: 'vec3' },
        }
    })

    shader.use()
    vao.bind()

    // draw first triangle
    vao.draw()

    // update uniforms, and draw a second
    shader.uniforms.uMovePos = [0.5, 0.5, 0.5]
    vao.draw()
}


uniforms()
saveRenderResult(gl)