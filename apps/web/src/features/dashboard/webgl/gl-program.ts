export const createProgram = (
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram => {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()

  if (!program) {
    throw new Error('Unable to create WebGL program')
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program) ?? 'Unknown WebGL program link error'
    gl.deleteProgram(program)
    throw new Error(error)
  }

  return program
}

export const setAttribute = (
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
  size: number,
  stride: number,
  offset: number,
): void => {
  const location = gl.getAttribLocation(program, name)

  if (location < 0) {
    return
  }

  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset)
}

export const setUniformMatrix = (
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
  matrix: Float32List,
): void => {
  const location = gl.getUniformLocation(program, name)

  if (location) {
    gl.uniformMatrix4fv(location, false, matrix)
  }
}

export const setUniform1f = (
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
  value: number,
): void => {
  const location = gl.getUniformLocation(program, name)

  if (location) {
    gl.uniform1f(location, value)
  }
}

export const setUniform1i = (
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
  value: number,
): void => {
  const location = gl.getUniformLocation(program, name)

  if (location) {
    gl.uniform1i(location, value)
  }
}

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader => {
  const shader = gl.createShader(type)

  if (!shader) {
    throw new Error('Unable to create WebGL shader')
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader) ?? 'Unknown WebGL shader compile error'
    gl.deleteShader(shader)
    throw new Error(error)
  }

  return shader
}
