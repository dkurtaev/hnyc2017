function Tree(gl) {
  this.initVBOs(gl);
  this.initShaders(gl);
  this.draw(gl);
}

Tree.prototype.initVBOs = function(gl) {
  TOP = { x: 0.0, y: 1.0, z: 0.0 };
  NUM_SLICES = 5;
  ZENITH = -Math.PI / 4;
  RADIUS = 1.0;

  var data = [TOP.x, TOP.y, TOP.z];
  var cosZenith = Math.cos(ZENITH);
  var sinZenith = Math.sin(ZENITH);
  var azimuth = 0.0;
  var step = 2.0 * Math.PI / NUM_SLICES;
  for (var i = 0; i <= NUM_SLICES; ++i) {
    data.push(TOP.x + RADIUS * Math.sin(azimuth) * cosZenith);
    data.push(TOP.y + RADIUS * sinZenith);
    data.push(TOP.z + RADIUS * Math.cos(azimuth) * cosZenith);
    azimuth += step;
  }

  console.log(data.length / 3);
  // data = [0, 0, 0, 1, 0, 0, 0, 1, 0];

  this.vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
};

Tree.prototype.initShaders = function(gl) {
  var vertShaderSrc =
      'attribute vec3 a_position;' +
      'uniform mat4 u_view_mtx;' +
      'uniform mat4 u_proj_mtx;' +
      'void main() {' +
        'gl_Position = u_proj_mtx * u_view_mtx * vec4(a_position, 1.0);' +
      '}';
  var fragShaderSrc =
      'void main() {' +
        'gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);' +
      '}';
  this.shaderProgram = createShaderProgram(gl, vertShaderSrc, fragShaderSrc);
};

Tree.prototype.draw = function(gl) {
  var viewWidth = 500;
  var viewHeight = 500;
  var aspect = viewWidth / viewHeight;
  var far = 100;
  var near = 0.1;
  var f = 1.0 / Math.tan(Math.PI / 6);
  var projMatrix = [f / aspect, 0, 0, 0,
                    0, f, 0, 0,
                    0, 0, (far + near) / (near - far), -1,
                    0, 0, 2 * far * near / (near - far), 0];
  gl.viewport(0, 0, viewWidth, viewHeight);

  var viewMatrix = lookAtMatrix(Math.PI / 6, Math.PI / 6, 3);

  gl.useProgram(this.shaderProgram);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
  gl.vertexAttribPointer(Attrib.POSITION, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(Attrib.POSITION);

  var locViewMtx = gl.getUniformLocation(this.shaderProgram, "u_view_mtx");
  var locProjMtx = gl.getUniformLocation(this.shaderProgram, "u_proj_mtx");
  gl.uniformMatrix4fv(locViewMtx, false, viewMatrix);
  gl.uniformMatrix4fv(locProjMtx, false, projMatrix);

  gl.drawArrays(gl.TRIANGLE_FAN, 0, 6);

  // Disable all enabled.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(Attrib.POSITION);
  gl.useProgram(null);

  this.drawAxises(gl)
};


function lookAtMatrix(eyeAzimuth, eyeZenith, eyeRadius) {
  var cosZenith = Math.cos(eyeZenith);
  var sinZenith = Math.sin(eyeZenith);
  var cosAzimuth = Math.cos(eyeAzimuth);
  var sinAzimuth = Math.sin(eyeAzimuth);
  var zAxis = {
    x: sinAzimuth * cosZenith,
    y: sinZenith,
    z: cosAzimuth * cosZenith
  };
  var xAxis = { x: zAxis.z, y: 0, z: -zAxis.x };
  var yAxis = {
    x: -sinAzimuth * sinZenith,
    y: cosZenith,
    z: -cosAzimuth * sinZenith
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


Tree.prototype.drawAxises = function(gl) {
  var data = [0, 0, 0, 100, 0, 0,
              0, 0, 0, 0, 100, 0,
              0, 0, 0, 0, 0, 100];
  this.vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);


  var viewWidth = 500;
  var viewHeight = 500;
  var aspect = viewWidth / viewHeight;
  var far = 100;
  var near = 0.1;
  var f = 1.0 / Math.tan(Math.PI / 6);
  var projMatrix = [f / aspect, 0, 0, 0,
                    0, f, 0, 0,
                    0, 0, (far + near) / (near - far), -1,
                    0, 0, 2 * far * near / (near - far), 0];
  gl.viewport(0, 0, viewWidth, viewHeight);

  var viewMatrix = lookAtMatrix(Math.PI / 6, Math.PI / 6, 3);

  gl.useProgram(this.shaderProgram);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
  gl.vertexAttribPointer(Attrib.POSITION, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(Attrib.POSITION);

  var locViewMtx = gl.getUniformLocation(this.shaderProgram, "u_view_mtx");
  var locProjMtx = gl.getUniformLocation(this.shaderProgram, "u_proj_mtx");
  gl.uniformMatrix4fv(locViewMtx, false, viewMatrix);
  gl.uniformMatrix4fv(locProjMtx, false, projMatrix);

  gl.drawArrays(gl.LINES, 0, 6);

  // Disable all enabled.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(Attrib.POSITION);
  gl.useProgram(null);
}
