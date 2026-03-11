# gleasy

A lightweight (4.0kb) wrapper over webgl2, with no dependenices.

You'll need to know WebGL concepts, but won't have to think about binding attribute pointers and uniforms. The main primitives are designed to be as flexible as possible, while abstracting away a lot of the boilerplate.

---

### `Shader`

Create a shader with automatic uniform setters:

In your vertex shader:

```
#version 300 es
uniform mat3 uTransformMatrix;
uniform vec3 uPos;
void main() { 
   gl_Position = vec4(uTransformMatrix * uPos, 1.)
}
```

In your program:

```ts
import { Shader } from 'gleasy'

// describe uniforms to get type hints
type Uniforms = { 
   uTransformMatrix: 'mat3'
   uPos: 'vec3'
}

// set initial values
const shader = new Shader<Uniforms>(gl, vertexSrc, fragmentSrc, {
   uPos: [0, 0, 0],
   uTransformMatrix: [...matrix]
})

// update uniform values later
shader.uniforms.uTransformMatrix = [...transformedMatrix]

// before the draw call
shader.use()

```

#### Uniform types

All gl2 uniform types are supported: <br>
`float` `vec2` `vec3` `vec4` `int` `ivec2` `ivec3` `ivec4` `uint` `uvec2` `uvec3` `uvec4` `bool` `bvec2` `bvec3` `bvec4` `mat2` `mat3` `mat4` `mat2x3` `mat2x4` `mat3x2` `mat3x4` `mat4x2` `mat4x3` `sampler2D` `samplerCube` 

And work with specified lengths for arrays: `float[3]`, `vec3[6]`

Or arrays of unspecified length: `float[]`

Example glsl:

```
#version 300 es
uniform float uTime;
uniform vec2 uPos;
uniform vec3 uColor;
uniform mat3 uMatrix;
uniform sampler2D uTex;
uniform samplerCube uCubeMap;
uniform vec3 uLightColors[4];
...
```

Types:

```ts
type Uniforms { 
   uTime: 'float'
   uPos: 'vec2'
   uColor: 'vec3' 
   uMatrix: 'mat3'
   uTex: 'sampler2D'
   uCubeMap: 'samplerCube'
   uLightColors: 'vec3[4]' 
   ...
}

const shader = new Shader<Uniforms>(gl, vertex, fragment, {
   uLightColors // array[12]
})
```

### `VertexBuffer`

Vertex data can be interleaved, or be spread across multiple buffers. You can pass a TypedArray directly, or it will default to a `Float32Array` when called with a standard array type:

```ts
import { VertexBuffer } from 'gleasy'

// interleaved
const vertices = new VertexBuffer(gl, new Float32Array([
   // x,y,z         // r,g,b
   0.0,  0.5, 0.0,  1.0, 0.0, 0.0, 
  -0.5, -0.5, 0.0,  0.0, 1.0, 0.0, 
   0.5, -0.5, 0.0,  0.0, 0.0, 1.0 
]))

// multiple buffers
const position = new VertexBuffers(gl, [
   0.0,  0.5, 0.0,  
  -0.5, -0.5, 0.0,  
   0.5, -0.5, 0.0,  
])
const color = new VertexBuffers(gl, [
   1.0, 0.0, 0.0,
   0.0, 1.0, 0.0, 
   0.0, 0.0, 1.0 
])
```

### `VAO` / Vertex array objects

Get attribute names/locations from the shader program:

```ts
import { Shader, VAO } from 'gleasy'

const vertices = new VertexBuffer(gl, array)
const shader = new Shader(gl, vertex, fragment)

// describe the vertex attribute layout on 
// the VAO for automatic attribute binding
const vao = new VAO(gl, shader, {
   buffer: vertices,
   layout: { 
      aPosition: { type: 'vec3' }, 
      aColor: { type:'vec3' }
   }
})

// draw
shader.use()
vao.bind()
vao.draw()

```

You can use separate buffers or manually specify attribute locations for better flexibility:

```ts
// set a separate buffer for each attribute:
const vao = new VAO(gl, shader, {
   layout: { 
      aPosition: { type: 'vec3', buffer: position }, 
      aColor: { type:'vec3', buffer: color }
   }
})

// and/or use location indexes (don't pass a shader):
const vao = new VAO(gl, {
   buffer: position, // default buffer
   layout: [
      { type: 'vec3', location: 0 }, // position buffer at location 0
      { type: 'vec3', location: 1, buffer: color } // color buffer at location 1
   ]
})

// draw
shader.use()
vao.bind()
vao.draw()

```

### Vertex attribute layouts

Attribute layouts can also be described directly on the VertexBuffer and used in draw calls directly, if you really want.

In your vertex shader:

```
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aColor;
```

In your program:

```ts
const vertices = new VertexBuffer(gl, array)

// describe the vertex attribute layout
vertices.setLayout([
   { type: 'vec3', location: 0 },
   { type: 'vec3', location: 1 },
])

// create and use a shader
shader.use()

// draw directly from attribute locations
vertices.bind()
// explicit call to bindLayout() as it involves 
// some overhead when compared to VAOs
vertices.bindLayout()
vertices.draw()

```

### `VertexIndex`

Draw parts of your vertex buffers:

```ts
import { VertexIndex, VertexBuffer } from 'gleasy'

// create a vertex buffer
const vertices = new VertexBuffer(gl, array)

// create your index, only draws the first 3 vertices (0, 1, 2)
const index = new VertexIndex(gl, new Uint16Array([0, 1, 2]))

shader.use()
index.bind() 
index.draw()
```

You can also explicitly pass in other typed arrays to the constructor:<br>
`Uint8Array`, `Uint16Array`, `Uint32Array`, `Uint8ClampedArray`. 

A standard array type will default to a 16-bit unsigned int array (`Uint16Array`). 

The index can also be saved in a `VAO`:

```ts
const vao = new VAO(gl, {
   index, // include an index
   buffer,
   layout: {
      aPos: { type: 'vec3' }, 
   }
})

// only need to bind the vao
vao.bind()
index.draw()

```

### `Texture`

Create a texture from an image:

```ts
import { Texture } from 'gleasy'
// create a texture from an image 
// (making sure the image has already loaded)
const texture = new Texture(gl, image, {
   flip:true, // flip vertical        
})

// bind to texture location 0
texture.bind(0)

// set texture location in uniform
type Uniforms = { tex: 'sampler2D' }
const shader = new Shader<Uniforms>(gl, vertex, fragment, { tex:0 })

shader.use()
vao.bind()
vao.draw()
```

#### Texture options:

| Option | Default | Description |
|--------|---------|-------------|
| `flip`            | `false` | Flip the image vertically |
| `repeat`          | `false` | Repeat sampling |
| `repeatMirror`    | `false` | Repeat sampling but mirrored |
| `mipmaps`         | `false` | Generate and use mipmaps |
| `interpolate`     | `true`  | Interpolate (nearest-neighbour filtering) |
| `interpolateMips` | `true`  | Interpolate between mipmap levels |

#### Sampler usage:

In fragment shader:

```
#version 300 es
precision highp float;
uniform sampler2D tex;
in vec2 uv;
out vec4 fragColor;

void main() {
   fragColor = texture(tex, uv);
}

```

### Multi-pass rendering using `FrameBuffer`

```ts
import { Texture, FrameBuffer } from 'gleasy'
// create a texture to use use as the framebuffer
const texture = new Texture(gl)
const frame = new FrameBuffer(gl, texture)

// render first pass into framebuffer
shader.use()
frame.bind() 
vao.draw()

// unbind frame, render to canvas element
frame.unbind()

// render second pass, samping the framebuffer texture
shader2.use()
texture.bind(0)
quad.draw() 
```



### Helpers

The GL viewport should match the canvas, set this with:

```ts
import { setGLViewport } from 'gleasy'
const gl = canvas.getContext('webgl2')
setGLViewport(gl, canvas)
```


