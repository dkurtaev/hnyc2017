function Twinkles(gl, radius) {
  this.radius = radius;
  this.initVBOs(gl);
  this.initShaders(gl);
}

Twinkles.prototype.initVBOs = function(gl) {
  var positions = [-this.radius, this.radius, 0,
                   this.radius, this.radius, 0,
                   -this.radius, -this.radius, 0,
                   -this.radius, -this.radius, 0,
                   this.radius, this.radius, 0,
                   this.radius, -this.radius, 0];
  var centers = [
    0, 4, 0, 0, 4, 0, 0, 4, 0,
    0, 4, 0, 0, 4, 0, 0, 4, 0
  ];

  this.positionsVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionsVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  this.centersVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.centersVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(centers), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

Twinkles.prototype.initShaders = function(gl) {
  var vertShaderSrc =
      'attribute vec3 a_position;' +
      'attribute vec3 a_center;' +

      'uniform mat4 u_view_mtx;' +
      'uniform mat4 u_proj_mtx;' +

      'varying vec3 v_position;' +

      'mat4 transpose(mat4 m) {' +
        'vec4 col1 = m[0];' +
        'vec4 col2 = m[1];' +
        'vec4 col3 = m[2];' +
        'vec4 col4 = m[3];' +
        'return mat4(vec4(col1[0], col2[0], col3[0], col4[0]),' +
        '            vec4(col1[1], col2[1], col3[1], col4[1]),' +
        '            vec4(col1[2], col2[2], col3[2], col4[2]),' +
        '            vec4(col1[3], col2[3], col3[3], col4[3]));' +
      '}' +

      'void main() {' +
        'v_position = a_position;' +
        'mat4 model_matrix = transpose(u_view_mtx);' +
        'model_matrix[3] = vec4(a_center, 1.0);' +
        'gl_Position = u_proj_mtx * u_view_mtx * model_matrix * ' +
        '              vec4(a_position, 1.0);' +
      '}';
  var fragShaderSrc =
      'precision mediump float;' +
      'uniform float u_radius;' +
      'varying vec3 v_position;' +
      'void main() {' +
        'float d = length(v_position);' +
        'if (d <= u_radius) {' +
          'gl_FragColor = vec4(1.0, 1.0 - d / u_radius, 1.0 - d / u_radius, 1.0);' +
        '} else {' +
          'gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);' +
        '}' +
      '}';
  this.shaderProgram = createShaderProgram(gl, vertShaderSrc, fragShaderSrc);
};

Twinkles.prototype.draw = function(gl) {
  var projMatrix = perspectiveProjMatrix(500, 500);
  var viewMatrix = lookAtMatrix(0, Math.PI/2.5, 10);

  gl.useProgram(this.shaderProgram);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionsVBO);
  gl.vertexAttribPointer(Attrib.POSITION, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(Attrib.POSITION);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.centersVBO);
  gl.vertexAttribPointer(Attrib.CENTER, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(Attrib.CENTER);

  var locViewMtx = gl.getUniformLocation(this.shaderProgram, "u_view_mtx");
  var locProjMtx = gl.getUniformLocation(this.shaderProgram, "u_proj_mtx");
  var locRadius = gl.getUniformLocation(this.shaderProgram, "u_radius");
  gl.uniformMatrix4fv(locViewMtx, false, viewMatrix);
  gl.uniformMatrix4fv(locProjMtx, false, projMatrix);
  gl.uniform1f(locRadius, this.radius);

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Disable all enabled.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(Attrib.POSITION);
  gl.disableVertexAttribArray(Attrib.CENTER);
  gl.useProgram(null);
};
