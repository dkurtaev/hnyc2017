function Tree(gl) {
  this.initVBOs(gl);
  this.initShaders(gl);
}

Tree.prototype.initVBOs = function(gl) {
  this.initTreeMesh(gl);
  this.initTrunkMesh();
  var positions = this.crownCoords.concat(this.trunkCoords);
  var normals = this.crownNormals.concat(this.trunkNormals);
  var colors = this.crownColors.concat(this.trunkColors);
  this.numVertices = positions.length / 3;

  this.positionsVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionsVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  this.normalsVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  this.colorsVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.colorsVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colors), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  this.crownCoords = null;
  this.crownNormals = null;
  this.crownColors = null;
  this.trunkCoords = null;
  this.trunkNormals = null;
  this.trunkColors = null;
};

Tree.prototype.initTreeMesh = function(gl) {
  var NUM_SLICES = 20;  // Should be >= 3.
  var RADIUS = 0.31;
  var TOP = 0.95;
  var zenith = -Math.PI / 2.5;
  var sinZenith = Math.sin(zenith);
  var cosZenith = Math.cos(zenith);

  var positions = [];
  var normals = [];
  var colors = [];

  var r = 0.02;
  var twinkles = [];
  var azimuth = 0;
  var sinAzimuth = 0.0;
  var cosAzimuth = 1.0;
  var step = 2 * Math.PI / NUM_SLICES;
  var sinHalfStep = Math.sin(0.5 * step);
  var cosHalfStep = Math.cos(0.5 * step);

  for (var i = 0; i < NUM_SLICES; ++i) {
    var sinNextAzimuth = Math.sin(azimuth + step);
    var cosNextAzimuth = Math.cos(azimuth + step);
    positions.push(0, TOP, 0);
    positions.push(RADIUS * sinAzimuth, 0, RADIUS * cosAzimuth);
    positions.push(RADIUS * sinNextAzimuth, 0, RADIUS * cosNextAzimuth);

    var sinNormal = cosAzimuth * sinHalfStep + sinAzimuth * cosHalfStep;
    var cosNormal = cosAzimuth * cosHalfStep - sinAzimuth * sinHalfStep;
    for (var j = 0; j < 3; ++j) {
      normals.push(-sinNormal * sinZenith,
                   cosZenith,
                   -cosNormal * sinZenith);
    }

    twinkles.push([
      -r * sinNormal * sinZenith + 0.33 * RADIUS * (sinAzimuth + sinNextAzimuth),
      r * cosZenith + 0.33 * TOP,
      -r * cosNormal * sinZenith + 0.33 * RADIUS * (cosAzimuth + cosNextAzimuth)]);

    sinAzimuth = sinNextAzimuth;
    cosAzimuth = cosNextAzimuth;
    azimuth += step;
  }

  for (var i = 0, l = positions.length / 3; i < l; ++i) {
    colors.push(0, 204, 77);
  }

  this.twinkles = new Twinkles(gl, r, twinkles);
  this.crownCoords = positions;
  this.crownNormals = normals;
  this.crownColors = colors;
};

Tree.prototype.initTrunkMesh = function(gl) {
  var RADIUS = 0.15;
  var HEIGHT = 0.5;
  var NUM_SLICES = 10;

  var positions = [];
  var normals = [];
  var colors = [];

  var azimuth = 0;
  var sinAzimuth = 0.0;
  var cosAzimuth = 1.0;
  var step = 2 * Math.PI / NUM_SLICES;
  var sinHalfStep = Math.sin(0.5 * step);
  var cosHalfStep = Math.cos(0.5 * step);

  for (var i = 0; i < NUM_SLICES; ++i) {
    var sinNextAzimuth = Math.sin(azimuth + step);
    var cosNextAzimuth = Math.cos(azimuth + step);
    positions.push(RADIUS * sinAzimuth, 0, RADIUS * cosAzimuth);
    positions.push(RADIUS * sinAzimuth, -HEIGHT, RADIUS * cosAzimuth);
    positions.push(RADIUS * sinNextAzimuth, 0, RADIUS * cosNextAzimuth);
    positions.push(RADIUS * sinNextAzimuth, 0, RADIUS * cosNextAzimuth);
    positions.push(RADIUS * sinAzimuth, -HEIGHT, RADIUS * cosAzimuth);
    positions.push(RADIUS * sinNextAzimuth, -HEIGHT, RADIUS * cosNextAzimuth);

    var sinNormal = cosAzimuth * sinHalfStep + sinAzimuth * cosHalfStep;
    var cosNormal = cosAzimuth * cosHalfStep - sinAzimuth * sinHalfStep;
    for (var j = 0; j < 6; ++j) {
      normals.push(sinNormal, 0, cosNormal);
    }
    sinAzimuth = sinNextAzimuth;
    cosAzimuth = cosNextAzimuth;
    azimuth += step;
  }

  for (var i = 0, l = positions.length / 3; i < l; ++i) {
    colors.push(204, 127, 30);
  }

  this.trunkCoords = positions;
  this.trunkNormals = normals;
  this.trunkColors = colors;
};

Tree.prototype.initShaders = function(gl) {
  var vertShaderSrc =
      'attribute vec3 a_position;' +
      'attribute vec3 a_normal;' +
      'attribute vec3 a_color;' +

      'uniform mat4 u_view_mtx;' +
      'uniform mat4 u_proj_mtx;' +
      'uniform mat4 u_ortho_mtx;' +

      'varying vec3 v_normal;' +
      'varying vec3 v_color;' +

      'void main() {' +
        'v_normal = a_normal;' +
        'v_color = a_color;' +
        'gl_Position = u_ortho_mtx * u_proj_mtx * u_view_mtx * vec4(a_position, 1.0);' +
      '}';
  var fragShaderSrc =
      'precision mediump float;' +

      'uniform vec3 u_light_vector;' +

      'varying vec3 v_normal;' +
      'varying vec3 v_color;' +

      'void main() {' +
        'vec3 n_light_vector = normalize(u_light_vector);' +
        'vec3 n_normal = normalize(v_normal);' +
        'float lum = 0.66 - 0.33 * dot(n_light_vector, n_normal);' +
        'gl_FragColor = lum * vec4(v_color, 1.0);' +
        'gl_FragColor[3] = 1.0;' +
      '}';
  this.shaderProgram = createShaderProgram(gl, vertShaderSrc, fragShaderSrc);
};

Tree.prototype.draw = function(gl, eyeAzimuth, viewWidth, viewHeight) {
  var projMatrix = perspectiveProjMatrix(viewWidth, viewHeight);
  var viewMatrix = lookAtMatrix(eyeAzimuth, Math.PI / 4, 2.1);
  var orthoMatrix = getOrthoMatrix(-0.6, 0.6, -0.4, 0.85);

  gl.useProgram(this.shaderProgram);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionsVBO);
  gl.vertexAttribPointer(Attrib.POSITION, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(Attrib.POSITION);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsVBO);
  gl.vertexAttribPointer(Attrib.NORMAL, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(Attrib.NORMAL);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.colorsVBO);
  gl.vertexAttribPointer(Attrib.COLOR, 3, gl.UNSIGNED_BYTE, true, 0, 0);
  gl.enableVertexAttribArray(Attrib.COLOR);

  var locViewMtx = gl.getUniformLocation(this.shaderProgram, "u_view_mtx");
  var locProjMtx = gl.getUniformLocation(this.shaderProgram, "u_proj_mtx");
  var locOrthoMtx = gl.getUniformLocation(this.shaderProgram, "u_ortho_mtx");
  var locLightVec = gl.getUniformLocation(this.shaderProgram, "u_light_vector");
  gl.uniformMatrix4fv(locViewMtx, false, viewMatrix);
  gl.uniformMatrix4fv(locProjMtx, false, projMatrix);
  gl.uniformMatrix4fv(locOrthoMtx, false, orthoMatrix);
  gl.uniform3fv(locLightVec, [-1, -1, -1]);

  gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);

  // Disable all enabled.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(Attrib.POSITION);
  gl.disableVertexAttribArray(Attrib.NORMAL);
  gl.disableVertexAttribArray(Attrib.COLOR);
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
