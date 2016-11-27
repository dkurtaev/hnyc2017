function Tree(gl) {
  this.NUM_SLICES = 20;  // Should be >= 3.

  this.initVBOs(gl);
  this.initShaders(gl);
  this.draw(gl);
}

Tree.prototype.initVBOs = function(gl) {
  ZENITH = -Math.PI / 2.5;
  RADIUS = 1.0;
  var TOP = 1.0;

  var cosZenith = Math.cos(ZENITH);
  var sinZenith = Math.sin(ZENITH);

  var positions = [];
  var normals = [];

  var azimuth = 0;
  var step = 2 * Math.PI / this.NUM_SLICES;
  var sinAzimuth = [];
  var cosAzimuth = [];
  for (var i = 0; i < this.NUM_SLICES; ++i) {
    sinAzimuth.push(Math.sin(azimuth));
    cosAzimuth.push(Math.cos(azimuth));
    azimuth += step;
  }
  var sinHalfStep = Math.sin(0.5 * step);
  var cosHalfStep = Math.cos(0.5 * step);

  var r = 0.02;
  var twinkles = [];
  for (var i = 0; i < this.NUM_SLICES; ++i) {
    positions.push(0, TOP, 0);
    positions.push(RADIUS * sinAzimuth[i] * cosZenith,
                   TOP + RADIUS * sinZenith,
                   RADIUS * cosAzimuth[i] * cosZenith);
    var next = (i != this.NUM_SLICES - 1 ? i + 1 : 0);
    positions.push(RADIUS * sinAzimuth[next] * cosZenith,
                   TOP + RADIUS * sinZenith,
                   RADIUS * cosAzimuth[next] * cosZenith);

    var sinNormal = cosAzimuth[i] * sinHalfStep + sinAzimuth[i] * cosHalfStep;
    var cosNormal = cosAzimuth[i] * cosHalfStep - sinAzimuth[i] * sinHalfStep;
    for (var j = 0; j < 3; ++j) {
      normals.push(-sinNormal * sinZenith,
                   cosZenith,
                   -cosNormal * sinZenith);
    }

    twinkles.push([
      -r * sinNormal * sinZenith + 0.33 * (RADIUS * sinAzimuth[i] * cosZenith + RADIUS * sinAzimuth[next] * cosZenith),
      r * cosZenith + 0.33 * (3 * TOP + 2 * RADIUS * sinZenith),
      -r * cosNormal * sinZenith + 0.33 * (RADIUS * cosAzimuth[i] * cosZenith + RADIUS * cosAzimuth[next] * cosZenith)]);
  }

  this.twinkles = new Twinkles(gl, r, twinkles);

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
      'uniform mat4 u_ortho_mtx;' +

      'varying vec3 v_normal;' +

      'void main() {' +
        'v_normal = a_normal;' +
        'gl_Position = u_ortho_mtx * u_proj_mtx * u_view_mtx * vec4(a_position, 1.0);' +
      '}';
  var fragShaderSrc =
      'precision mediump float;' +

      'uniform vec3 u_light_vector;' +

      'varying vec3 v_normal;' +

      'void main() {' +
        'vec3 n_light_vector = normalize(u_light_vector);' +
        'vec3 n_normal = normalize(v_normal);' +
        'float lum = 0.66 - 0.33 * dot(n_light_vector, n_normal);' +
        'gl_FragColor = lum * vec4(0.0, 0.8, 0.3, 1.0);' +
        'gl_FragColor[3] = 1.0;' +
      '}';
  this.shaderProgram = createShaderProgram(gl, vertShaderSrc, fragShaderSrc);
};

Tree.prototype.draw = function(gl) {
  var projMatrix = perspectiveProjMatrix(500, 500);
  var viewMatrix = lookAtMatrix(0, Math.PI / 4, 2.1);
  var orthoMatrix = getOrthoMatrix(-0.6, 0.6, -0.2, 0.9);

  gl.useProgram(this.shaderProgram);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionsVBO);
  gl.vertexAttribPointer(Attrib.POSITION, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(Attrib.POSITION);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsVBO);
  gl.vertexAttribPointer(Attrib.NORMAL, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(Attrib.NORMAL);

  var locViewMtx = gl.getUniformLocation(this.shaderProgram, "u_view_mtx");
  var locProjMtx = gl.getUniformLocation(this.shaderProgram, "u_proj_mtx");
  var locOrthoMtx = gl.getUniformLocation(this.shaderProgram, "u_ortho_mtx");
  var locLightVec = gl.getUniformLocation(this.shaderProgram, "u_light_vector");
  gl.uniformMatrix4fv(locViewMtx, false, viewMatrix);
  gl.uniformMatrix4fv(locProjMtx, false, projMatrix);
  gl.uniformMatrix4fv(locOrthoMtx, false, orthoMatrix);
  gl.uniform3fv(locLightVec, [-1, -1, -1]);

  gl.drawArrays(gl.TRIANGLES, 0, this.NUM_SLICES * 3);

  // Disable all enabled.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(Attrib.POSITION);
  gl.disableVertexAttribArray(Attrib.NORMAL);
  gl.useProgram(null);

  this.twinkles.draw(gl, projMatrix, viewMatrix, orthoMatrix);
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
  var xAxis = { x: cosAzimuth, y: 0, z: -sinAzimuth };
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

function getOrthoMatrix(left, right, bottom, top) {
  // (x=l, y=t) *------* (x=r, y=t)
  //            |      |
  //            |      |
  // (x=l, y=b) *------* (x=r, y=b)
  // To
  //  (x=-1, y=1) *------* (x=1, y=1)
  //              |      |
  //              |      |
  // (x=-1, y=-1) *------* (x=1, y=-1)
  var rl = 1.0 / (right - left);
  var tb = 1.0 / (top - bottom);
  return [2.0 * rl, 0, 0, 0,
          0, 2.0 * tb, 0, 0,
          0, 0, 1, 0,
          -(right + left) * rl, -(top + bottom) * tb, 0, 1];
}
