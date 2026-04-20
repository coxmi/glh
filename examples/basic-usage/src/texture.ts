import { Shader, VertexBuffer, VAO, Texture, setGLViewport } from 'gleasy'
import { saveRenderResult } from '../../../test/common/render.ts'


// setup

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const gl = canvas.getContext('webgl2')!
setGLViewport(gl, canvas)


// shaders

const vertexSrc = `
    #version 300 es
    in vec3 aPos;
    out vec3 vPos;
    void main() {
        gl_Position = vec4(aPos, 1.0);
        vPos = aPos;
    }
`
const fragmentSrc = `
    #version 300 es
    precision mediump float;
    uniform sampler2D tex; // sampler2D texture uniform
    in vec3 vPos;
    out vec4 fragColor;
    void main() {
        // remap position coordinates
        vec2 uv = vPos.xy * 0.5 + 0.5;
        fragColor = texture(tex, uv);
    }
`


// program

async function texture() {

    type MyUniforms = { tex: 'sampler2D' }
    const shader = new Shader<MyUniforms>(gl, vertexSrc, fragmentSrc, { 
        tex: 0, // set tex to texture location 0
    })

    // bind tex to texture location 0
    const image = await loadImage(document.querySelector('.texture') as HTMLImageElement)
    const texture = new Texture(gl, image, {
        flip: true,
        // defaults:
        // repeat: false,
        // repeatMirror: false,
        // mipmaps: false,
        // interpolate: true,
        // interpolateMips: true,
    })
    texture.bind(0)

    const buffer = new VertexBuffer(gl, [
         0.0,  0.5, 0.0,
        -0.5, -0.5, 0.0,
         0.5, -0.5, 0.0,
    ]);

    const vao = new VAO(gl, shader, {
        buffer,
        layout: {
            aPos: { type: 'vec3' }
        }
    })

    shader.use()
    vao.bind()
    vao.draw()
}


// helpers

async function loadImage(el: HTMLImageElement): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        el.complete ? resolve(el) : el.addEventListener('load', () => resolve(el))    
    })
}


texture().then(() => saveRenderResult(gl))
