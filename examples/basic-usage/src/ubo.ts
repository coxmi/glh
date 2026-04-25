import { Shader, VertexBuffer, VAO, setGLViewport, UBO } from '../../../src/index.ts'
import { saveRenderResult } from '../../../test/common/render.ts'


// setup

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const gl = canvas.getContext('webgl2')!
setGLViewport(gl, canvas)


// shaders

const vertexSrc = `
    #version 300 es
    
    layout(std140) uniform Global {
        vec3 uColor;
        vec3 uOffset;
        mat3 uRotate;
    };

    in vec3 aPosition;
    out vec3 vColor;

    void main() {
        vec3 pos = aPosition * uRotate;
        gl_Position = vec4(pos + uOffset, 1.0);
        vColor = uColor;
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
    
    const ubo = new UBO(gl, {
        name: 'Global',
        bind: 0,
        layout: {
            uColor: { type: 'vec3', value: [1,0,0] },
            uOffset: { type: 'vec3', value: [0,0,0] },
            uRotate: { type: 'mat3', value: rotate(0) }
        }
    })
    
    const shader = new Shader(gl, {
        vertex: vertexSrc,
        fragment: fragmentSrc,
        ubo: ubo
    })

    const buffer = new VertexBuffer(gl, [ 
         0.0,  0.5, 0.0, //  1.0, 0.0, 0.0, 
        -0.5, -0.5, 0.0, // 0.0, 1.0, 0.0, 
         0.5, -0.5, 0.0, // 0.0, 0.0, 1.0 
    ])

    const vao = new VAO(gl, shader, {
        buffer,
        layout: {
            aPosition: { type: 'vec3' },
        }
    })

    shader.use()
    vao.bind()
    vao.draw()

    ubo.uniforms.uColor = [0, 1, 0]
    ubo.uniforms.uOffset = [0.5, 0, 0]
    ubo.uniforms.uRotate = rotate(Math.PI/2)
    vao.draw()

    ubo.uniforms.uColor = [0, 0, 1]
    ubo.uniforms.uOffset = [-0.5, 0, 0]
    ubo.uniforms.uRotate = rotate(-Math.PI/2)
    vao.draw()
}


function rotate(radians: number): [number,number,number,number,number,number,number,number,number] {
    var c = Math.cos(radians)
    var s = Math.sin(radians)
    return [
      c, -s, 0,
      s, c, 0,
      0, 0, 1,
    ];
}


uniforms()
saveRenderResult(gl)