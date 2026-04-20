import { Shader, VertexBuffer, VAO, setGLViewport } from 'gleasy'
import { saveRenderResult } from '../../../test/common/render.ts'


// setup

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const gl = canvas.getContext('webgl2')!
setGLViewport(gl, canvas)


// shaders

const vertexSrc = `
    #version 300 es
    in vec2 aPosition;
    in vec3 aColor;

    out vec2 vPosition;
    out vec3 vColor;

    void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vColor = aColor;
        vPosition = aPosition;
    }
`

const fragmentSrc = `
    #version 300 es
    precision highp float;
    in vec2 vPosition;
    in vec3 vColor;
    out vec4 outColor;
    
    struct Light {
        vec3 position;
        vec3 color;
        float radius;
        float intensity;
    };
    uniform Light uLight;

    void main() {
        float dist = length(vPosition - uLight.position.xy);
        float falloff = max(0.0, 1.0 - dist / uLight.radius);
        vec3 light = (uLight.color * uLight.intensity * falloff);
        outColor = vec4(vColor + light, 1.0);
    }
`


// program

function uniformStruct() {

    type Uniforms = { 
        uLight: { 
            position: 'vec3'
            color: 'vec3' 
            radius: 'float' 
            intensity: 'float'
        }
    }

    const shader = new Shader<Uniforms>(gl, vertexSrc, fragmentSrc, {
        uLight: { 
            position: [0, -0.5, 0], 
            color: [0.5, 0.5, 1], 
            radius: 1.15,
            intensity: 1,
        }
    })

    const position = new VertexBuffer(gl, [
        -0.5, -0.5,
         0.5, -0.5,
        -0.5,  0.5,
         0.5,  0.5
    ])

    const color = new VertexBuffer(gl, [
        0.5, 0, 0,
        0, 0, 0,
        0.5, 0, 0,
        0, 0, 0
    ])

    const vao = new VAO(gl, shader, {
        layout: { 
            aPosition: { type: 'vec2', buffer: position },
            aColor: { type: 'vec3', buffer: color }
        }
    })

    shader.use()
    vao.bind()
    vao.draw(gl.TRIANGLE_STRIP)
}


uniformStruct()
saveRenderResult(gl)