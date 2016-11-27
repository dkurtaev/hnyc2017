function Twinkles(gl, radius, twinkles) {
  // Each twinkle is a circle. Circle drawing on square. There are two
  // triangles in square:
  // 0 *------* 1
  //   |    / |
  //   | /    |
  // 3 *------* 2
  this.radius = radius;
  this.numTwinkles = twinkles.length;
  var centers = [];
  var indices = [];
  twinkles.forEach(function(position) {
    for (var i = 0; i < 6; ++i) {
      centers.push(position[0], position[1], position[2]);
    }
    indices.push(0, 1, 3, 3, 1, 2);
  });

  // Initialize VBOs.
  this.indicesVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.indicesVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

  this.centersVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.centersVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(centers), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Initialize shader program.
  this.initShaders(gl);
}

Twinkles.prototype.initShaders = function(gl) {
  var vertShaderSrc =
      'precision mediump float;' +

      'attribute float a_index;' +
      'attribute vec3 a_center;' +

      'uniform mat4 u_view_mtx;' +
      'uniform mat4 u_proj_mtx;' +
      'uniform mat4 u_ortho_mtx;' +

      'uniform float u_radius;' +

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

      'vec3 GetPositionByIdx(float idx) {' +
        'if (idx == 0.0) {' +
          'return vec3(-u_radius, u_radius, 0.0);' +
        '} else if (idx == 1.0) {' +
          'return vec3(u_radius, u_radius, 0.0);' +
        '} else if (idx == 2.0) {' +
          'return vec3(u_radius, -u_radius, 0.0);' +
        '} else {' +
          'return vec3(-u_radius, -u_radius, 0.0);' +
        '}' +
      '}' +

      'void main() {' +
        'v_position = GetPositionByIdx(a_index);' +
        'mat4 model_matrix = u_view_mtx;' +
        'model_matrix[3] = vec4(0.0, 0.0, 0.0, 1.0);' +
        'model_matrix = transpose(model_matrix);' +
        'model_matrix[3] = vec4(a_center, 1.0);' +
        'gl_Position = u_ortho_mtx * u_proj_mtx * u_view_mtx * model_matrix *' +
        '              vec4(v_position, 1.0);' +
      '}';
  var fragShaderSrc =
      'precision mediump float;' +

      'uniform float u_radius;' +

      'varying vec3 v_position;' +

      'void main() {' +
        'float d = length(v_position);' +

        'if (d <= u_radius) {' +
          '// L vector is (0.0, 0.0, 1.0).\n' +
          '// V vector is (0.0, 0.0, 1.0).\n' +
          'vec4 ambient = vec4(1.0, 1.0, 1.0, 1.0);' +
          'vec4 diffuse = vec4(0.0, 0.0, 1.0, 1.0);' +
          'vec3 L = vec3(0.0, 0.0, 1.0);' +

          '// Ambient\n' +
          'gl_FragColor = 0.27 * ambient;' +

          '// Diffuse\n' +
          'float z = sqrt(u_radius * u_radius - d * d);' +
          'gl_FragColor += 0.9 * z / u_radius * diffuse;' +

          '// Specular\n' +
          'vec3 normal = vec3(v_position.x, v_position.y, z) / u_radius;' +
          'vec3 R = normalize(2.0 * normal.z * normal - L);' +
          'gl_FragColor += 0.55 * pow(max(0.0, R.z), 0.99);' +

          'gl_FragColor.a = 1.0;' +
        '} else {' +
          'discard;' +
        '}' +
      '}';
  this.shaderProgram = createShaderProgram(gl, vertShaderSrc, fragShaderSrc);
};

Twinkles.prototype.draw = function(gl, projMatrix, viewMatrix, orthoMatrix) {
  gl.useProgram(this.shaderProgram);

  var locViewMtx = gl.getUniformLocation(this.shaderProgram, "u_view_mtx");
  var locProjMtx = gl.getUniformLocation(this.shaderProgram, "u_proj_mtx");
  var locOrthoMtx = gl.getUniformLocation(this.shaderProgram, "u_ortho_mtx");
  var locRadius = gl.getUniformLocation(this.shaderProgram, "u_radius");
  var locIndices = gl.getAttribLocation(this.shaderProgram, "a_index");
  var locCenters = gl.getAttribLocation(this.shaderProgram, "a_center");

  gl.bindBuffer(gl.ARRAY_BUFFER, this.indicesVBO);
  gl.vertexAttribPointer(locIndices, 1, gl.UNSIGNED_BYTE, false, 0, 0);
  gl.enableVertexAttribArray(locIndices);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.centersVBO);
  gl.vertexAttribPointer(locCenters, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(locCenters);

  gl.uniformMatrix4fv(locViewMtx, false, viewMatrix);
  gl.uniformMatrix4fv(locProjMtx, false, projMatrix);
  gl.uniformMatrix4fv(locOrthoMtx, false, orthoMatrix);
  gl.uniform1f(locRadius, this.radius);

  gl.drawArrays(gl.TRIANGLES, 0, this.numTwinkles * 6);

  // Disable all enabled.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.disableVertexAttribArray(locIndices);
  gl.disableVertexAttribArray(locCenters);
  gl.useProgram(null);
};
