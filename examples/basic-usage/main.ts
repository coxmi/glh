import { Shader, Texture, FrameBuffer, VertexBuffer, VertexIndex, VAO, setGLViewport } from '../../src/index.ts'
import { saveRenderResult } from '../../test/common/render.ts'

// init canvas and gl

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const gl = canvas.getContext('webgl2')!
setGLViewport(gl, canvas)

// basic shaders 

const vertexSrc = `
    #version 300 es
    in vec3 aPosition;
    in vec3 aColor;
    out vec3 vColor;
    void main() {
        gl_Position = vec4(aPosition, 1.0);
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

// programs

function interleavedAttributes() {
    const shader = new Shader(gl, vertexSrc, fragmentSrc)    
    const buffer = new VertexBuffer(gl, new Float32Array([
         // x,y,z / r,g,b
         0.0,  0.5, 0.0,  1.0, 0.0, 0.0, 
        -0.5, -0.5, 0.0,  0.0, 1.0, 0.0, 
         0.5, -0.5, 0.0,  0.0, 0.0, 1.0 
    ]))
    const vao = new VAO(gl, shader, {
        buffer,
        layout: {
            aPosition: { type: 'vec3' },
            aColor: { type: 'vec3' },
        }
    })
    shader.use()
    vao.bind()
    vao.draw()
}


function multipleBuffers() {
    const shader = new Shader(gl, vertexSrc, fragmentSrc)
    const vertex = new VertexBuffer(gl, new Float32Array([
         0.0,  0.5, 0.0,  
        -0.5, -0.5, 0.0,  
         0.5, -0.5, 0.0,  
    ]))
    const color = new VertexBuffer(gl, new Float32Array([
        1.0, 0.0, 0.0, 
        0.0, 1.0, 0.0, 
        0.0, 0.0, 1.0 
    ]))
    const vao = new VAO(gl, shader, {
        layout: {
            aPosition: { type: 'vec3', buffer: vertex },
            aColor: { type: 'vec3', buffer: color },
        }
    })
    shader.use()
    vao.bind()
    vao.draw()
}


function normalizedValues() {
    const shader = new Shader(gl, vertexSrc, fragmentSrc)

    const vertex = new VertexBuffer(gl, new Int8Array([
           0,  127, 0,
        -127, -127, 0,
         127, -127, 0,
    ]))
    const color = new VertexBuffer(gl, new Uint8Array([
        255, 0, 0, 
        0, 255, 0, 
        0, 0, 255 
    ]))
    const vao = new VAO(gl, shader, {
        layout: {
            aPosition: { type: 'vec3', buffer: vertex, normalize: true },
            aColor: { type: 'vec3', buffer: color, normalize: true },
        }
    })
    shader.use()
    vao.bind()
    vao.draw()
}

function instances() {

    const vertexSrc = `
        #version 300 es
        in vec2 aPos;
        in vec2 aCoord;
        in vec3 aColor;
        out vec3 vColor;
        uniform vec2 uResolution;
        void main() {
            vColor = aColor;
            gl_Position = vec4(aCoord + aPos, 0., 1.);
        }
    `

    const fragmentSrc = `
        #version 300 es
        precision highp float;
        in vec3 vColor;
        out vec4 outColor;
        void main() {
            outColor = vec4(vColor, 1.);
        }
    `

    const vertex = new VertexBuffer(gl, new Float32Array([
         0.0,  0.5,  
        -0.5, -0.5,
         0.5, -0.5,
    ]))

    const instancePos = new VertexBuffer(gl, new Float32Array([
        -0.5, -0.5,
        0, 0,
        0.5, 0.5,
    ]))

    const instanceColor = new VertexBuffer(gl, new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ]))

    const shader = new Shader(gl, vertexSrc, fragmentSrc)
    const vao = new VAO(gl, shader, {
        buffer: vertex,
        layout: {
            aPos: { type: 'vec2' },
            aCoord: { type: 'vec2', buffer: instancePos, divisor: 1 },
            aColor: { type: 'vec3', buffer: instanceColor, divisor: 1 }
        }
    })

    shader.use()
    vao.bind()
    vao.draw()
}


function iuTypes() {
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


function definedAttributeLocations() {
    const vertexSrcWithLocationSpecifiers = `
        #version 300 es
        layout(location = 0) in vec3 aPosition;
        layout(location = 1) in vec3 aColor;
        out vec3 vColor;
        void main() {
            gl_Position = vec4(aPosition, 1.0);
            vColor = aColor;
        }
    `
    const shader = new Shader(gl, vertexSrcWithLocationSpecifiers, fragmentSrc)

    const buffer = new VertexBuffer(gl, [
         0.0,  0.5, 0.0,  1.0, 0.0, 0.0, 
        -0.5, -0.5, 0.0,  0.0, 1.0, 0.0, 
         0.5, -0.5, 0.0,  0.0, 0.0, 1.0 
    ]);

    // when buffer.bind() is called, the described  
    // attribute pointers are bound for the shader
    buffer.setLayout([
        { type: 'vec3', location: 0 },
        { type: 'vec3', location: 1 },
    ])

    shader.use()
    // to call buffer.draw() directly without a VAO, bind the layout, then draw.
    // binding the layout has some overhead, so use VAOs where you can
    buffer.bind()
    buffer.bindLayout()
    buffer.draw()
}


function vertexIndices() {
    const shader = new Shader(gl, vertexSrc, fragmentSrc)
    const buffer = new VertexBuffer(gl, new Float32Array([
         0.0,  0.5, 0.0,  1.0, 0.0, 0.0, 
        -0.5, -0.5, 0.0,  0.0, 1.0, 0.0, 
         0.5, -0.5, 0.0,  0.0, 0.0, 1.0 
    ]))

    // use unsigned int TypedArrays for indices:
    // (e.g. Uint8Array, Uint16Array, Uint32Array, Uint8ClampedArray)
    const index = new VertexIndex(gl, new Uint8Array([0, 1, 2]))
    const index2 = new VertexIndex(gl, new Uint8Array([2, 1, 0]))

    const vao = new VAO(gl, shader, {
        // the first index is bound in the 
        // vertex array object
        index, 
        buffer,
        layout: {
            aPosition: { type: 'vec3' },
            aColor: { type: 'vec3' },
        }
    })
    shader.use()
    // no need to bind/draw the first index, as 
    // it's bound implicitly within the VAO
    vao.bind()
    vao.draw()

    // but if you have multiple indexes, 
    // these can be bound/drawn explicitly
    vao.bind()
    index2.bind()
    index2.draw()
}


function uniforms() {
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
    // use type hints for uniforms, and set initial values
    type Uniforms = { uMovePos: 'vec3' }
    const shader = new Shader<Uniforms>(gl, vertexSrc, fragmentSrc, {
        uMovePos: [0.5, 0.5, 0.5]
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
    // update uniforms before each draw call with:
    // shader.uniforms.uMovePos = [0.4, 0.4, 0.4]
    vao.bind()
    vao.draw()
}


function uniformArrays() {
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

function uniformStruct() {
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


function uniformStructs() {
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
    // const loop = (t = 0) => (render(t), window.requestAnimationFrame(loop))
    // loop()
}


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


async function texture() {
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


function framebuffer() {

    // first pass shader, render triangle
    const triangleShader = new Shader(gl, vertexSrc, fragmentSrc)    
    const triangleVertices = new VertexBuffer(gl, new Float32Array([
         0.0,  0.5, 0.0,  1.0, 0.0, 0.0, 
        -0.5, -0.5, 0.0,  0.0, 1.0, 0.0, 
         0.5, -0.5, 0.0,  0.0, 0.0, 1.0 
    ]))
    const triangleVAO = new VAO(gl, triangleShader, {
        buffer: triangleVertices,
        layout: {
            aPosition: { type: 'vec3' },
            aColor: { type: 'vec3' },
        }
    })

    // second pass shader, full screen quad
    const quad = new VertexBuffer(gl, new Float32Array([
        -1,  1, 0,  
        -1, -1, 0,
         1, -1, 0,
        -1,  1, 0,
         1, -1, 0,
         1,  1, 0,
    ]))
    const vertex = `
        #version 300 es
        in vec3 aPos;
        in vec3 aColor;
        out vec3 vPos;
        out vec3 vColor;
        void main() {
            vPos = aPos;
            vColor = aColor;
            gl_Position = vec4(aPos, 1);
        }
    `
    const fragment = `
        #version 300 es
        precision mediump float;
        uniform sampler2D uFrame;
        in vec3 vPos;
        out vec4 fragColor;
        void main() {
            // map position from normalised device coordinates (-1..1) to 0..1
            vec2 uv = vPos.xy * 0.5 + 0.5;
            // apply sine-wave wobble horizontally
            float amplitude = 0.01; // max displacement
            float frequency = 50.0; // number of waves
            uv.y += sin(uv.x * frequency) * amplitude;
            uv.x += sin(uv.y * frequency) * amplitude; 
            fragColor = texture(uFrame, uv);
        }
    `

    const distortShader = new Shader<{ uFrame: 'sampler2D' }>(gl, vertex, fragment, { uFrame: 0 })
    const distortVAO = new VAO(gl, distortShader, {
        buffer: quad,
        layout: {
            aPos: { type:'vec3' }
        }
    })

    // framebuffer
    const texture = new Texture(gl)
    const frame = new FrameBuffer(gl, texture)
    
    // run shaders
    triangleShader.use()
        frame.bind()
        triangleVAO.bind()
        triangleVAO.draw()
        frame.unbind()

    distortShader.use()
        texture.bind(0)
        distortVAO.bind()
        distortVAO.draw()
}


// helpers

async function loadImage(el: HTMLImageElement): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        el.complete ? resolve(el) : el.addEventListener('load', () => resolve(el))    
    })
}


// expose render functions to html files

// @ts-ignore
window.saveRenderResult = () => saveRenderResult(gl)
// @ts-ignore
window.interleavedAttributes = interleavedAttributes
// @ts-ignore
window.multipleBuffers = multipleBuffers
// @ts-ignore
window.normalizedValues = normalizedValues
// @ts-ignore
window.instances = instances
// @ts-ignore
window.iuTypes = iuTypes
// @ts-ignore
window.definedAttributeLocations = definedAttributeLocations
// @ts-ignore
window.vertexIndices = vertexIndices
// @ts-ignore
window.uniforms = uniforms
// @ts-ignore
window.uniformArrays = uniformArrays
// @ts-ignore
window.uniformStruct = uniformStruct
// @ts-ignore
window.uniformStructs = uniformStructs
// @ts-ignore
window.uniformMatrices = uniformMatrices
// @ts-ignore
window.texture = texture
// @ts-ignore
window.framebuffer = framebuffer