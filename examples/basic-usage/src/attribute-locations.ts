import { Shader, VertexBuffer, setGLViewport } from 'gleasy'
import { saveRenderResult } from '../../../test/common/render.ts'


// setup

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const gl = canvas.getContext('webgl2')!
setGLViewport(gl, canvas)


// shaders

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

function attributeLocations() {

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


attributeLocations()
saveRenderResult(gl)