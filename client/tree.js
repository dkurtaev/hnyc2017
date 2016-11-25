function Tree(gl) {
  this.NUM_SLICES = 6;  // Should be >= 3.

  this.initVBOs(gl);
  this.initShaders(gl);
  this.draw(gl);
}

Tree.prototype.initVBOs = function(gl) {
  TOP = { x: 0.0, y: 1.0, z: 0.0 };
  ZENITH = -Math.PI / 4;
  RADIUS = 1.0;
  var cosZenith = Math.cos(ZENITH);
  var sinZenith = Math.sin(ZENITH);

  var positions = [TOP.x, TOP.y, TOP.z];
  var normals = [0, 1, 0];
  var azimuth = 0.0;
  var step = 2.0 * Math.PI / this.NUM_SLICES;
  for (var i = 0; i <= this.NUM_SLICES; ++i) {
    var sinAzimuth = Math.sin(azimuth);
    var cosAzimuth = Math.cos(azimuth);
    positions.push(TOP.x + RADIUS * sinAzimuth * cosZenith);
    positions.push(TOP.y + RADIUS * sinZenith);
    positions.push(TOP.z + RADIUS * cosAzimuth * cosZenith);

    normals.push(sinAzimuth * sinZenith);
    normals.push(cosZenith);
    normals.push(cosAzimuth * sinZenith);
    azimuth += step;
  }

  this.positionsVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionsVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  this.normalsVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

Tree.prototype.initShaders = function(gl) {
  var vertShaderSrc =
      'attribute vec3 a_position;' +
      'attribute vec3 a_normal;' +
      'uniform mat4 u_view_mtx;' +
      'uniform mat4 u_proj_mtx;' +
      'varying vec3 v_position;' +
      'varying vec3 v_normal;' +
      'void main() {' +
        'v_position = a_position;' +
        'v_normal = a_normal;' +
        'gl_Position = u_proj_mtx * u_view_mtx * vec4(a_position, 1.0);' +
      '}';
  var fragShaderSrc =
      'precision mediump float;' +
      'uniform vec3 u_light_vector;' +
      'varying vec3 v_position;' +
      'varying vec3 v_normal;' +
      'void main() {' +
        'vec3 n_light_vector = normalize(u_light_vector);' +
        'vec3 n_normal = normalize(v_normal);' +
        'float lum = 0.66 - 0.33 * dot(n_light_vector, n_normal);' +
        'gl_FragColor = lum * vec4(0.0, 1.0, 0.0, 1.0);' +
        'gl_FragColor[3] = 1.0;' +
      '}';
  this.shaderProgram = createShaderProgram(gl, vertShaderSrc, fragShaderSrc);
};

Tree.prototype.draw = function(gl) {
  var projMatrix = perspectiveProjMatrix(500, 500);
  var viewMatrix = lookAtMatrix(Math.PI / 4, Math.PI / 4, 3);

  gl.useProgram(this.shaderProgram);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionsVBO);
  gl.vertexAttribPointer(Attrib.POSITION, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(Attrib.POSITION);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsVBO);
  gl.vertexAttribPointer(Attrib.NORMAL, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(Attrib.NORMAL);

  var locViewMtx = gl.getUniformLocation(this.shaderProgram, "u_view_mtx");
  var locProjMtx = gl.getUniformLocation(this.shaderProgram, "u_proj_mtx");
  var locLightVec = gl.getUniformLocation(this.shaderProgram, "u_light_vector");
  gl.uniformMatrix4fv(locViewMtx, false, viewMatrix);
  gl.uniformMatrix4fv(locProjMtx, false, projMatrix);
  gl.uniform3fv(locLightVec, [-1, -1, -1]);

  gl.drawArrays(gl.TRIANGLE_FAN, 0, this.NUM_SLICES + 2);

  // Disable all enabled.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(Attrib.POSITION);
  gl.disableVertexAttribArray(Attrib.NORMAL);
  gl.useProgram(null);
};


function lookAtMatrix(eyeAzimuth, eyeZenith, eyeRadius) {
  var cosZenith = Math.cos(eyeZenith);
  var sinZenith = Math.sin(eyeZenith);
  var cosAzimuth = Math.cos(eyeAzimuth);
  var sinAzimuth = Math.sin(eyeAzimuth);
  var zAxis = {
    x: sinAzimuth * cosZenith,
    y: -sinZenith,
    z: cosAzimuth * cosZenith
  };
  var xAxis = { x: zAxis.z / cosZenith, y: 0, z: -zAxis.x / cosZenith };
  var yAxis = {
    x: sinAzimuth * sinZenith,
    y: cosZenith,
    z: cosAzimuth * sinZenith
  };

  // View matrix an inverse matrix to
  // x.x, y.x, z.x, R*z.x,
  // x.y, y.y, z.y, R*z.y,
  // x.z, y.z, z.z, R*z.z,
  //   0,   0,   0, 1
  // Actually, it is
  // x.x, x.y, x.z,  0,
  // y.x, y.y, y.z,  0,
  // z.x, z.y, z.z, -R,
  //   0,   0,   0,  1
  return [xAxis.x, yAxis.x, zAxis.x, 0,
          xAxis.y, yAxis.y, zAxis.y, 0,
          xAxis.z, yAxis.z, zAxis.z, 0,
          0, 0, -eyeRadius, 1];
}

function perspectiveProjMatrix(viewWidth, viewHeight) {
  var aspect = viewWidth / viewHeight;
  var far = 100;
  var near = 0.1;
  var f = 1.0 / Math.tan(Math.PI / 6);
  return [f / aspect, 0, 0, 0,
          0, f, 0, 0,
          0, 0, (far + near) / (near - far), -1,
          0, 0, 2 * far * near / (near - far), 0];
}
