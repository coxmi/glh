import { Shader, VertexBuffer, VAO, setGLViewport } from 'gleasy'
import { saveRenderResult } from '../../../test/common/render.ts'


// setup

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const gl = canvas.getContext('webgl2')!
setGLViewport(gl, canvas)


// shaders

const vertexSrc = `
    #version 300 es
    uniform mat3 uTransform; // matrix transform
    in vec3 aPosition;
    in vec3 aColor;
    out vec3 vColor;
    void main() {
        vec3 pos = uTransform * aPosition;
        // correct for canvas aspect ratio (800px x 600px)
        pos.x = pos.x * 6./8.; 
        gl_Position = vec4(pos, 1.0);
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

function uniformMatrices() {

    // TODO: easier types
    function rotate(radians: number): [number,number,number,number,number,number,number,number,number] {
        var c = Math.cos(radians)
        var s = Math.sin(radians)
        return [
          c, -s, 0,
          s, c, 0,
          0, 0, 1,
        ];
    }    

    type Uniforms = { uTransform: 'mat3' }
    const shader = new Shader<Uniforms>(gl, vertexSrc, fragmentSrc, {
        uTransform: rotate(Math.PI/4)
    })

    // 4 vertices for a quad using gl.TRIANGLE_STRIP, with colors
    const buffer = new VertexBuffer(gl, [
        -0.5, -0.5, 0,  1.0, 0.0, 0.0,
         0.5, -0.5, 0,  0.0, 1.0, 0.0,
        -0.5,  0.5, 0,  0.0, 0.0, 1.0,
         0.5,  0.5, 0,  0.0, 0.0, 0.0,
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
    vao.draw(gl.TRIANGLE_STRIP)
}


uniformMatrices()
saveRenderResult(gl)