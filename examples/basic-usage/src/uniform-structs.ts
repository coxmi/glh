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
    // array of 2 lights
    uniform Light uLights[2]; 

    void main() {
        vec3 totalLight = vec3(0.0);
        for (int i = 0; i < 2; i++) {
            float dist = length(vPosition - uLights[i].position.xy);
            float falloff = max(0.0, 1.0 - dist / uLights[i].radius);
            totalLight += uLights[i].color * uLights[i].intensity * falloff;
        }
        outColor = vec4(clamp(vColor + totalLight, 0.0, 1.0), 1.0);
    }
`


// program

function uniformStructs() {

    type Uniforms = { 
        uLights: Array<{ 
            position: 'vec3',
            color: 'vec3',
            radius: 'float',
            intensity: 'float'
        }>
    }

    const shader = new Shader<Uniforms>(gl, vertexSrc, fragmentSrc, {
        uLights: [
            { 
                position: [ -0.5, -0.5, 0 ], 
                color: [ 0.5, 0.5, 1 ], 
                radius: 1.0, 
                intensity: 1
            },
            { 
                position: [ 0.25, 0.25, 0 ], 
                color: [ 1.0, 0.5, 0.2 ], 
                radius: 1.0, 
                intensity: 2
            }
        ]
    })

    const position = new VertexBuffer(gl, [
        -0.5, -0.5,
         0.5, -0.5,
        -0.5,  0.5,
         0.5,  0.5
    ])

    const color = new VertexBuffer(gl, [
        0.5, 0, 0,
        0.5, 0, 0,
        0.5, 0, 0,
        0.5, 0, 0
    ])

    const vao = new VAO(gl, shader, {
        layout: { 
            aPosition: { type: 'vec2', buffer: position },
            aColor: { type: 'vec3', buffer: color }
        }
    })

    shader.use()
    vao.bind()
    function render(t = 0) {
        shader.uniforms.uLights[1].position = [Math.sin(t/1000), 0.5, 0]    
        vao.draw(gl.TRIANGLE_STRIP)
    }
    render(500)
}


uniformStructs()
saveRenderResult(gl)