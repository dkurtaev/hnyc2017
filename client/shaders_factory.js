var Attrib = {
  POSITION: 0,
  NORMAL: 1,
  CENTER: 2
};

function createShaderProgram(gl, vertShaderSource, fragShaderSource) {
  var shaderProgram = gl.createProgram();

  var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertShaderSource);
  var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSource);

  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);

  gl.bindAttribLocation(shaderProgram, Attrib.POSITION, "a_position");
  gl.bindAttribLocation(shaderProgram, Attrib.NORMAL, "a_normal");
  gl.bindAttribLocation(shaderProgram, Attrib.CENTER, "a_center");

  gl.linkProgram(shaderProgram);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    var msg = "Program linking error: " + gl.getProgramInfoLog(shaderProgram);
    console.log(msg);
    alert(msg);
    return null;
  }

  return shaderProgram;
};

function createShader(gl, type, src) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    var msg = "Shader compilation error: " + gl.getShaderInfoLog(shader);
    alert(msg);
    console.log(msg);
    return null;
  }
  return shader;
};
