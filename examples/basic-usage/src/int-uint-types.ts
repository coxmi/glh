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

    in uint aID; // 32bit uint for ID
    in int aScaleY; // 8bit int
    in int aOffsetY; // 16bit int

    in uint aScaleX; // 8bit uint
    in uint aOffsetX; // 16bit uint

    // int/uint can't use interpolation (uses flat for varyings)
    flat out uint vID;

    void main() {
        vec3 pos = aPosition;
        pos.y *= float(aScaleY) * 0.3;
        pos.y += float(aOffsetY) * 0.5;
        pos.x *= float(aScaleX) * 0.5;
        pos.x -= float(aOffsetX) * 0.25;
        gl_Position = vec4(pos, 1.);
        vID = aID;
    }
`
const fragmentSrc = `
    #version 300 es
    precision highp float;
    flat in uint vID;
    out vec4 outColor;
    void main() {
        // set the rgb color based on 1,2,3 index
        vec3 color;
        if (vID == 1u) {
            color = vec3(1., 0., 0.);
        } else if (vID == 2u) {
            color = vec3(0., 1., 0.);
        } else if (vID == 3u) {
            color = vec3(0., 0., 1.);
        } else {
            color = vec3(0., 0., 0.);
        }
        outColor = vec4(color, 1.0);
    }
`


// program

function iuTypes() {

    const shader = new Shader(gl, vertexSrc, fragmentSrc)
    const vertex = new VertexBuffer(gl, new Float32Array([
        // center-left
        -0.6,  0.5, 0.0,
        -0.8, -0.5, 0.0,
        -0.4, -0.5, 0.0,
        // center
        -0,  0.5, 0.0,
        -0.2, -0.5, 0.0,
        0.2, -0.5, 0.0,
        // center-right
        0.6,  0.5, 0.0,
        0.4, -0.5, 0.0,
        0.8, -0.5, 0.0,
    ]))

    // object IDs are 32-bit uints
    const ids = new VertexBuffer(gl, new Uint32Array([
        1, 1, 1, 
        2, 2, 2, 
        3, 3, 3
    ]))

    // scale the Y pos with 1-byte ints
    const scaleY = new VertexBuffer(gl, new Int8Array([
        1, 1, 1, 
        2, 2, 2, 
        3, 3, 3
    ]))

    // offset the Y pos with 2-byte int/shorts
    const offsetY = new VertexBuffer(gl, new Int16Array([
        -1,-1,-1, 
         0, 0, 0, 
         1, 1, 1
    ]))

    // scale the X pos with 1-byte uints
    const scaleX = new VertexBuffer(gl, new Uint8Array([
        1, 1, 1, 
        2, 2, 2, 
        3, 3, 3
    ]))

    // offset the X pos with 2-byte uints/unsigned shorts
    const offsetX = new VertexBuffer(gl, new Uint16Array([
        1, 1, 1, 
        2, 2, 2, 
        3, 3, 3
    ]))

    const vao = new VAO(gl, shader, {
        layout: {
            aPosition: { type: 'vec3', buffer: vertex },
            aID: { type: 'uint',  buffer: ids },
            aScaleY: { type: 'int', buffer: scaleY },
            aOffsetY: { type: 'int', buffer: offsetY },
            aScaleX: { type: 'uint', buffer: scaleX },
            aOffsetX: { type: 'uint', buffer: offsetX },
        }
    })

    shader.use()
    vao.bind()
    vao.draw()
}


iuTypes()
saveRenderResult(gl)