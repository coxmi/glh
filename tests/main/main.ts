import { setGLViewport } from '../../src/html/index.ts'
import { Shader, Texture, FrameBuffer } from '../../src/index.ts'
import { VertexBuffer, VertexIndex, VAO } from '../../src/vertex.ts'
import { frameLoop } from '../../src/dev/index.ts'
import { createUniforms } from '../../src/uniforms.ts'


const matrix = {
    identity() {
        return [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]
    },
    translate(tx: number, ty: number) {
        return [
          1, 0, 0,
          0, 1, 0,
          tx, ty, 1,
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

// init
const texture = document.getElementById('texture') as HTMLImageElement
loadImage(texture, (x: HTMLImageElement) => init(x))


function distort(gl: WebGL2RenderingContext) {
    const vertexSrc = `
        #version 300 es
        precision mediump float;
        in vec2 position;
        in vec4 color;
        out vec2 vPos;
        void main() {
            vPos = position;
            gl_Position = vec4(position, 0, 1);
        }
    `
    const fragmentSrc = `
        #version 300 es
        precision mediump float;
        uniform sampler2D tex;
        in vec2 vPos;
        out vec4 fragColor;
        void main() {
            // fragColor = vec4(1,1,1,1);
            // return;
            // map position from NDC (-1..1) to 0..1
            vec2 uv = vPos.xy * 0.5 + 0.5;

            // apply sine-wave wobble horizontally
            float amplitude = 0.01;           // max displacement
            float frequency = 50.0;           // number of waves
            uv.y += sin(uv.x * frequency) * amplitude;
            uv.x += sin(uv.y * frequency) * amplitude;
            fragColor = texture(tex, uv);
        }
    `
    const vertexData = new Float32Array([
        1, 1,       1, -1,      -1, -1,
        -1, -1,       -1, 1,      1, 1,
    ])
    const indices = new Uint16Array([
        0, 1, 2, 
        3, 4, 5
    ])

    type MyUniforms = { tex: 'sampler2D' }
    const shader = new Shader<MyUniforms>(gl, vertexSrc, fragmentSrc, { 
        tex: 0,
    })

    const vertices = new VertexBuffer(gl, vertexData)
    const vao = new VAO(gl, shader, {
        buffer: vertices,
        // index: {}
        layout: {
            position: { type: 'vec2' },
        }
    })

    const index = new VertexIndex(gl, indices)
    shader.use()
    shader.uniforms.tex = 0

    return {
        uniforms: shader.uniforms,
        bind: () => {
            shader.use()
            vao.bind()
            index.bind()
        },
        draw: () => {
            // vao.draw()
            index.draw()
        }
    }
}

function swizzleTriangles(gl: WebGL2RenderingContext, image: HTMLImageElement) {
    const vertexSrc = `
        #version 300 es
        precision mediump float;
        uniform float t;
        uniform mat3 uMatrix;

        in vec3 position;
        in vec3 color;
        in mat3 matrix;

        out vec3 vPos;
        out vec4 vColor;

        void main() {
            vec3 aTransform = matrix * position;
            vec3 uTransform = uMatrix * aTransform;
            gl_Position = vec4(uTransform, 1.0);
            gl_PointSize = 100.;
            vColor = vec4(color, 1.0);
            vPos = position;
        }
    `

    const fragmentSrc = `
        #version 300 es
        precision mediump float;
        uniform float t;
        uniform sampler2D tex;

        in vec3 vPos;
        in vec4 vColor;
        out vec4 outColor;

        void main() {
            vec4 mult = vColor * texture(tex, vec2(vPos.x, vPos.y));
            outColor = vec4(
                cos(t) * 2. * mult.r + 0.5, 
                sin(t) * 2. * mult.g, 
                1. - mult.b, 
                1.0
            );
        }
    `

    // vertices: [x, y, z], [r,g,b], mat3
    const vertexData = new Float32Array([
        1, 1, 0,    0.5, 0.5, 1, ...matrix.identity(),
        0, 1, 0,    0.5, 1, 0.5, ...matrix.identity(),
        0, 0, 0,    1, 0.5, 0.5, ...matrix.identity(),

        0, 0, -0.1,    0.25, 0.25, 1, ...matrix.rotate(1 * Math.PI),
        0.8, 0, -0.1,    0, 1, 0,    ...matrix.rotate(1 * Math.PI),
        0.8, 1, -0.1,    1, 0, 0,    ...matrix.rotate(1 * Math.PI),
    ])

    // triangle indices
    const indices = new Uint16Array([
        0, 1, 2, 
        3, 4, 5
    ])

    type UniformMap = { t: 'float', uMatrix: 'mat3', tex: 'sampler2D' }
    const shader = new Shader<UniformMap>(gl, vertexSrc, fragmentSrc, {
        t: 0,
        uMatrix: new Float32Array(matrix.identity()),
        tex: 0
    })
    const index = new VertexIndex(gl, indices)
    const vertices = new VertexBuffer(gl, vertexData)
    const vao = new VAO(gl, shader, {
        buffer: vertices,
        // index: {}
        layout: {
            position: { type: 'vec3' },
            color: { type: 'vec3' },
            matrix: { type: 'mat3' },
        }
    })
    
    // TODO: texture update on canvas size change
    const tex = new Texture(gl, image)

    return {
        uniforms: shader.uniforms,
        bind: (textureBindLocation: number) => {
            shader.use()
            vao.bind()
            index.bind()
            // bind the texture to the shader's first sampler2d location
            tex.bind(textureBindLocation)
        },
        draw: () => {
            vao.draw()
            index.draw()
        }
    }
}

function init(image: HTMLImageElement) {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement
    const gl = canvas.getContext('webgl2')!
    setGLViewport(gl, canvas)

    // gl.enable(gl.DEPTH_TEST)
    const distortProgram = distort(gl)
    const swizzleProgram = swizzleTriangles(gl, image)

    const firstPassTexture = new Texture(gl)
    const firstPass = new FrameBuffer(gl, firstPassTexture)

    function render(time: number) {
        const uMat = new Float32Array(matrix.rotate(Math.PI * time/10))

        firstPass.bind()
            gl.clear(gl.COLOR_BUFFER_BIT)
            swizzleProgram.bind(0)
            swizzleProgram.uniforms.t = time
            swizzleProgram.uniforms.uMatrix = uMat
            swizzleProgram.draw()

        firstPass.unbind()
            gl.clear(gl.COLOR_BUFFER_BIT)
            distortProgram.bind()
            firstPassTexture.bind(0)
            distortProgram.draw()
    }

    const loop = frameLoop(render)
    loop.start()

    // setTimeout(loop.stop, 2000)
}


// helpers



function loadImage(el: HTMLImageElement, call: (el: HTMLImageElement) => any) {
    el.complete ? call(el) : el.addEventListener('load', () => call(el))
}


type PassFn = (gl: WebGL2RenderingContext, time: number) => void

export class Renderer {
    gl: WebGL2RenderingContext
    canvas: HTMLCanvasElement
    width: number
    height: number
    passes: PassFn[] = []

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        const gl = canvas.getContext('webgl2')
        if (!gl) throw new Error('WebGL2 not supported')
        this.gl = gl

        this.width = canvas.width
        this.height = canvas.height
        gl.viewport(0, 0, this.width, this.height)
    }

    addPass(pass: PassFn) {
        this.passes.push(pass)
    }

    render(time: number) {
        const gl = this.gl

        // Clear screen at start of frame
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        // Run all passes
        for (const pass of this.passes) {
            pass(gl, time)
        }
    }

    resize(width: number, height: number) {
        this.width = width
        this.height = height
        this.canvas.width = width
        this.canvas.height = height
        this.gl.viewport(0, 0, width, height)
    }
}
