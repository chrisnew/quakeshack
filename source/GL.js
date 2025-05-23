/* global GL, gl, Con, COM, Cmd, Cvar, SCR, Sys, Draw, VID */

// eslint-disable-next-line no-global-assign
GL = {};

GL.textures = [];
GL.currenttextures = [];
GL.programs = [];

GL.Bind = function(target, texnum, flushStream) {
  if (GL.currenttextures[target] !== texnum) {
    if (flushStream === true) {
      GL.StreamFlush();
    }
    if (GL.activetexture !== target) {
      GL.activetexture = target;
      gl.activeTexture(gl.TEXTURE0 + target);
    }
    GL.currenttextures[target] = texnum;
    gl.bindTexture(gl.TEXTURE_2D, texnum);
  }
};

GL.TextureMode_f = function(name) {
  let i;
  if (name === undefined) {
    for (i = 0; i < GL.modes.length; ++i) {
      if (GL.filter_min === GL.modes[i][1]) {
        Con.Print(GL.modes[i][0] + '\n');
        return;
      }
    }
    Con.Print('current filter is unknown???\n');
    return;
  }
  name = name.toUpperCase();
  for (i = 0; i < GL.modes.length; ++i) {
    if (GL.modes[i][0] === name) {
      break;
    }
  }
  if (i === GL.modes.length) {
    Con.Print('bad filter name\n');
    return;
  }
  GL.filter_min = GL.modes[i][1];
  GL.filter_max = GL.modes[i][2];
  for (i = 0; i < GL.textures.length; ++i) {
    GL.Bind(0, GL.textures[i].texnum);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, GL.filter_min);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, GL.filter_max);
  }
};

GL.ortho = [
  0.0, 0.0, 0.0, 0.0,
  0.0, 0.0, 0.0, 0.0,
  0.0, 0.0, -1.0, 0.0,
  -1.0, 1.0, 0.0, 1.0,
];

GL.Set2D = function() {
  gl.viewport(0, 0, (VID.width * SCR.devicePixelRatio) >> 0, (VID.height * SCR.devicePixelRatio) >> 0);
  GL.UnbindProgram();
  let i; let program;
  for (i = 0; i < GL.programs.length; ++i) {
    program = GL.programs[i];
    if (program.uOrtho == null) {
      continue;
    }
    gl.useProgram(program.program);
    gl.uniformMatrix4fv(program.uOrtho, false, GL.ortho);
  }
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
};

GL.ResampleTexture = function(data, inwidth, inheight, outwidth, outheight) {
  const outdata = new ArrayBuffer(outwidth * outheight);
  const out = new Uint8Array(outdata);
  const xstep = inwidth / outwidth; const ystep = inheight / outheight;
  let src; let dest = 0;
  let i; let j;
  for (i = 0; i < outheight; ++i) {
    src = Math.floor(i * ystep) * inwidth;
    for (j = 0; j < outwidth; ++j) {
      out[dest + j] = data[src + Math.floor(j * xstep)];
    }
    dest += outwidth;
  }
  return out;
};

GL.Upload = function(data, width, height) {
  let scaled_width = width; let scaled_height = height;
  if (((width & (width - 1)) !== 0) || ((height & (height - 1)) !== 0)) {
    --scaled_width;
    scaled_width |= (scaled_width >> 1);
    scaled_width |= (scaled_width >> 2);
    scaled_width |= (scaled_width >> 4);
    scaled_width |= (scaled_width >> 8);
    scaled_width |= (scaled_width >> 16);
    ++scaled_width;
    --scaled_height;
    scaled_height |= (scaled_height >> 1);
    scaled_height |= (scaled_height >> 2);
    scaled_height |= (scaled_height >> 4);
    scaled_height |= (scaled_height >> 8);
    scaled_height |= (scaled_height >> 16);
    ++scaled_height;
  }
  if (scaled_width > GL.maxtexturesize) {
    scaled_width = GL.maxtexturesize;
  }
  if (scaled_height > GL.maxtexturesize) {
    scaled_height = GL.maxtexturesize;
  }
  if ((scaled_width !== width) || (scaled_height !== height)) {
    data = GL.ResampleTexture(data, width, height, scaled_width, scaled_height);
  }
  const trans = new ArrayBuffer((scaled_width * scaled_height) << 2);
  const trans32 = new Uint32Array(trans);
  let i;
  for (i = scaled_width * scaled_height - 1; i >= 0; --i) {
    trans32[i] = COM.LittleLong(VID.d_8to24table[data[i]] + 0xff000000);
    if (data[i] >= 224) {
      trans32[i] &= 0xffffff;
    }
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, scaled_width, scaled_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(trans));
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, GL.filter_min);
  gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, GL.filter_max);
};

GL.LoadTexture = function(identifier, width, height, data) {
  let glt; let i;
  if (identifier.length !== 0) {
    for (i = 0; i < GL.textures.length; ++i) {
      glt = GL.textures[i];
      if (glt.identifier === identifier) {
        if ((width !== glt.width) || (height !== glt.height)) {
          Sys.Error('GL.LoadTexture: cache mismatch');
        }
        return glt;
      }
    }
  }

  let scaled_width = width; let scaled_height = height;
  if (((width & (width - 1)) !== 0) || ((height & (height - 1)) !== 0)) {
    --scaled_width;
    scaled_width |= (scaled_width >> 1);
    scaled_width |= (scaled_width >> 2);
    scaled_width |= (scaled_width >> 4);
    scaled_width |= (scaled_width >> 8);
    scaled_width |= (scaled_width >> 16);
    ++scaled_width;
    --scaled_height;
    scaled_height |= (scaled_height >> 1);
    scaled_height |= (scaled_height >> 2);
    scaled_height |= (scaled_height >> 4);
    scaled_height |= (scaled_height >> 8);
    scaled_height |= (scaled_height >> 16);
    ++scaled_height;
  }
  if (scaled_width > GL.maxtexturesize) {
    scaled_width = GL.maxtexturesize;
  }
  if (scaled_height > GL.maxtexturesize) {
    scaled_height = GL.maxtexturesize;
  }
  scaled_width >>= GL.picmip.value;
  if (scaled_width === 0) {
    scaled_width = 1;
  }
  scaled_height >>= GL.picmip.value;
  if (scaled_height === 0) {
    scaled_height = 1;
  }
  if ((scaled_width !== width) || (scaled_height !== height)) {
    data = GL.ResampleTexture(data, width, height, scaled_width, scaled_height);
  }

  glt = {texnum: gl.createTexture(), identifier: identifier, width: width, height: height};
  GL.Bind(0, glt.texnum);
  GL.Upload(data, scaled_width, scaled_height);
  GL.textures[GL.textures.length] = glt;
  return glt;
};

GL.LoadPicTexture = function(pic) {
  let data = pic.data; let scaled_width = pic.width; let scaled_height = pic.height;
  if (((pic.width & (pic.width - 1)) !== 0) || ((pic.height & (pic.height - 1)) !== 0)) {
    --scaled_width;
    scaled_width |= (scaled_width >> 1);
    scaled_width |= (scaled_width >> 2);
    scaled_width |= (scaled_width >> 4);
    scaled_width |= (scaled_width >> 8);
    scaled_width |= (scaled_width >> 16);
    ++scaled_width;
    --scaled_height;
    scaled_height |= (scaled_height >> 1);
    scaled_height |= (scaled_height >> 2);
    scaled_height |= (scaled_height >> 4);
    scaled_height |= (scaled_height >> 8);
    scaled_height |= (scaled_height >> 16);
    ++scaled_height;
  }
  if (scaled_width > GL.maxtexturesize) {
    scaled_width = GL.maxtexturesize;
  }
  if (scaled_height > GL.maxtexturesize) {
    scaled_height = GL.maxtexturesize;
  }
  if ((scaled_width !== pic.width) || (scaled_height !== pic.height)) {
    data = GL.ResampleTexture(data, pic.width, pic.height, scaled_width, scaled_height);
  }

  const texnum = gl.createTexture();
  GL.Bind(0, texnum);
  const trans = new ArrayBuffer((scaled_width * scaled_height) << 2);
  const trans32 = new Uint32Array(trans);
  let i;
  for (i = scaled_width * scaled_height - 1; i >= 0; --i) {
    if (data[i] !== 255) {
      trans32[i] = COM.LittleLong(VID.d_8to24table[data[i]] + 0xff000000);
    }
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, scaled_width, scaled_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(trans));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return texnum;
};

GL.CreateProgram = async function(identifier, uniforms, attribs, textures) {
  const p = gl.createProgram();
  const program =
  {
    identifier: identifier,
    program: p,
    attribs: [],
  };

  let source = null;

  const vsh = gl.createShader(gl.VERTEX_SHADER);
  source = await COM.LoadTextFileAsync(`shaders/${identifier}.vert`);
  gl.shaderSource(vsh, source);
  gl.compileShader(vsh);
  if (gl.getShaderParameter(vsh, gl.COMPILE_STATUS) !== true) {
    throw new Error('Error compiling shader: ' + gl.getShaderInfoLog(vsh));
  }

  const fsh = gl.createShader(gl.FRAGMENT_SHADER);
  source = await COM.LoadTextFileAsync(`shaders/${identifier}.frag`);
  gl.shaderSource(fsh, source);
  gl.compileShader(fsh);
  if (gl.getShaderParameter(fsh, gl.COMPILE_STATUS) !== true) {
    throw new Error('Error compiling shader: ' + gl.getShaderInfoLog(fsh));
  }

  gl.attachShader(p, vsh);
  gl.attachShader(p, fsh);

  gl.linkProgram(p);
  if (gl.getProgramParameter(p, gl.LINK_STATUS) !== true) {
    Sys.Error('Error linking program: ' + gl.getProgramInfoLog(p));
  }

  gl.useProgram(p);

  for (let i = 0; i < uniforms.length; ++i) {
    program[uniforms[i]] = gl.getUniformLocation(p, uniforms[i]);
  }

  program.vertexSize = 0;
  program.attribBits = 0;
  for (let i = 0; i < attribs.length; ++i) {
    const attribParameters = attribs[i];
    const attrib =
    {
      name: attribParameters[0],
      location: gl.getAttribLocation(p, attribParameters[0]),
      type: attribParameters[1],
      components: attribParameters[2],
      normalized: (attribParameters[3] === true),
      offset: program.vertexSize,
    };
    program.attribs[i] = attrib;
    program[attrib.name] = attrib;
    if (attrib.type === gl.FLOAT) {
      program.vertexSize += attrib.components * 4;
    } else if (attrib.type === gl.BYTE || attrib.type === gl.UNSIGNED_BYTE) {
      program.vertexSize += 4;
    } else {
      Sys.Error('Unknown vertex attribute type');
    }
    program.attribBits |= 1 << attrib.location;
  }

  for (let i = 0; i < textures.length; ++i) {
    program[textures[i]] = i;
    gl.uniform1i(gl.getUniformLocation(p, textures[i]), i);
  }

  GL.programs[GL.programs.length] = program;
  return program;
};

GL.UseProgram = function(identifier, flushStream) {
  const currentProgram = GL.currentProgram;
  if (currentProgram != null) {
    if (currentProgram.identifier === identifier) {
      return currentProgram;
    }
    if (flushStream === true) {
      GL.StreamFlush();
    }
  }

  let program = null;
  for (let i = 0; i < GL.programs.length; ++i) {
    if (GL.programs[i].identifier === identifier) {
      program = GL.programs[i];
      break;
    }
  }
  if (program == null) {
    return null;
  }

  let enableAttribs = program.attribBits; let disableAttribs = 0;
  if (currentProgram != null) {
    enableAttribs &= ~currentProgram.attribBits;
    disableAttribs = currentProgram.attribBits & ~program.attribBits;
  }
  GL.currentProgram = program;
  gl.useProgram(program.program);
  for (let attrib = 0; enableAttribs !== 0 || disableAttribs !== 0; ++attrib) {
    const mask = 1 << attrib;
    if ((enableAttribs & mask) !== 0) {
      gl.enableVertexAttribArray(attrib);
    } else if ((disableAttribs & mask) !== 0) {
      gl.disableVertexAttribArray(attrib);
    }
    enableAttribs &= ~mask;
    disableAttribs &= ~mask;
  }

  return program;
};

GL.UnbindProgram = function() {
  if (GL.currentProgram == null) {
    return;
  }
  GL.StreamFlush();
  let i;
  for (i = 0; i < GL.currentProgram.attribs.length; ++i) {
    gl.disableVertexAttribArray(GL.currentProgram.attribs[i].location);
  }
  GL.currentProgram = null;
};

GL.identity = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];

GL.RotationMatrix = function(pitch, yaw, roll) {
  pitch *= Math.PI / -180.0;
  yaw *= Math.PI / 180.0;
  roll *= Math.PI / 180.0;
  const sp = Math.sin(pitch);
  const cp = Math.cos(pitch);
  const sy = Math.sin(yaw);
  const cy = Math.cos(yaw);
  const sr = Math.sin(roll);
  const cr = Math.cos(roll);
  return [
    cy * cp,					sy * cp,					-sp,
    -sy * cr + cy * sp * sr,	cy * cr + sy * sp * sr,		cp * sr,
    -sy * -sr + cy * sp * cr,	cy * -sr + sy * sp * cr,	cp * cr,
  ];
};

GL.StreamFlush = function() {
  if (GL.streamArrayVertexCount === 0) {
    return;
  }
  const program = GL.currentProgram;
  if (program != null) {
    gl.bindBuffer(gl.ARRAY_BUFFER, GL.streamBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, GL.streamBufferPosition,
        GL.streamArrayBytes.subarray(0, GL.streamArrayPosition));
    const attribs = program.attribs;
    for (let i = 0; i < attribs.length; ++i) {
      const attrib = attribs[i];
      gl.vertexAttribPointer(attrib.location,
          attrib.components, attrib.type, attrib.normalized,
          program.vertexSize, GL.streamBufferPosition + attrib.offset);
    }
    gl.drawArrays(gl.TRIANGLES, 0, GL.streamArrayVertexCount);
    GL.streamBufferPosition += GL.streamArrayPosition;
  }
  GL.streamArrayPosition = 0;
  GL.streamArrayVertexCount = 0;
};

GL.StreamGetSpace = function(vertexCount) {
  const program = GL.currentProgram;
  if (program == null) {
    return;
  }
  const length = vertexCount * program.vertexSize;
  if ((GL.streamBufferPosition + GL.streamArrayPosition + length) > GL.streamArray.byteLength) {
    GL.StreamFlush();
    GL.streamBufferPosition = 0;
  }
  GL.streamArrayVertexCount += vertexCount;
};

GL.StreamWriteFloat = function(x) {
  GL.streamArrayView.setFloat32(GL.streamArrayPosition, x, true);
  GL.streamArrayPosition += 4;
};

GL.StreamWriteFloat2 = function(x, y) {
  const view = GL.streamArrayView;
  const position = GL.streamArrayPosition;
  view.setFloat32(position, x, true);
  view.setFloat32(position + 4, y, true);
  GL.streamArrayPosition += 8;
};

GL.StreamWriteFloat3 = function(x, y, z) {
  const view = GL.streamArrayView;
  const position = GL.streamArrayPosition;
  view.setFloat32(position, x, true);
  view.setFloat32(position + 4, y, true);
  view.setFloat32(position + 8, z, true);
  GL.streamArrayPosition += 12;
};

GL.StreamWriteFloat4 = function(x, y, z, w) {
  const view = GL.streamArrayView;
  const position = GL.streamArrayPosition;
  view.setFloat32(position, x, true);
  view.setFloat32(position + 4, y, true);
  view.setFloat32(position + 8, z, true);
  view.setFloat32(position + 12, w, true);
  GL.streamArrayPosition += 16;
};

GL.StreamWriteUByte4 = function(x, y, z, w) {
  const view = GL.streamArrayView;
  const position = GL.streamArrayPosition;
  view.setUint8(position, x);
  view.setUint8(position + 1, y);
  view.setUint8(position + 2, z);
  view.setUint8(position + 3, w);
  GL.streamArrayPosition += 4;
};

GL.StreamDrawTexturedQuad = function(x, y, w, h, u, v, u2, v2) {
  const x2 = x + w; const y2 = y + h;
  GL.StreamGetSpace(6);
  GL.StreamWriteFloat4(x, y, u, v);
  GL.StreamWriteFloat4(x, y2, u, v2);
  GL.StreamWriteFloat4(x2, y, u2, v);
  GL.StreamWriteFloat4(x2, y, u2, v);
  GL.StreamWriteFloat4(x, y2, u, v2);
  GL.StreamWriteFloat4(x2, y2, u2, v2);
};

GL.StreamDrawColoredQuad = function(x, y, w, h, r, g, b, a) {
  const x2 = x + w; const y2 = y + h;
  GL.StreamGetSpace(6);
  GL.StreamWriteFloat2(x, y);
  GL.StreamWriteUByte4(r, g, b, a);
  GL.StreamWriteFloat2(x, y2);
  GL.StreamWriteUByte4(r, g, b, a);
  GL.StreamWriteFloat2(x2, y);
  GL.StreamWriteUByte4(r, g, b, a);
  GL.StreamWriteFloat2(x2, y);
  GL.StreamWriteUByte4(r, g, b, a);
  GL.StreamWriteFloat2(x, y2);
  GL.StreamWriteUByte4(r, g, b, a);
  GL.StreamWriteFloat2(x2, y2);
  GL.StreamWriteUByte4(r, g, b, a);
};

GL.Init = function() {
  VID.mainwindow = document.getElementById('mainwindow');
  try {
    const options = {
      preserveDrawingBuffer: true,
    };
    // eslint-disable-next-line no-global-assign
    gl = VID.mainwindow.getContext('webgl', options) || VID.mainwindow.getContext('experimental-webgl', options);
  } catch (e) {
    Sys.Error(`Unable to initialize WebGL. ${e.message}`);
  }
  if (gl == null) {
    Sys.Error('Unable to initialize WebGL. Your browser may not support it.');
  }

  GL.maxtexturesize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.cullFace(gl.FRONT);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

  GL.modes = [
    ['GL_NEAREST', gl.NEAREST, gl.NEAREST],
    ['GL_LINEAR', gl.LINEAR, gl.LINEAR],
    ['GL_NEAREST_MIPMAP_NEAREST', gl.NEAREST_MIPMAP_NEAREST, gl.NEAREST],
    ['GL_LINEAR_MIPMAP_NEAREST', gl.LINEAR_MIPMAP_NEAREST, gl.LINEAR],
    ['GL_NEAREST_MIPMAP_LINEAR', gl.NEAREST_MIPMAP_LINEAR, gl.NEAREST],
    ['GL_LINEAR_MIPMAP_LINEAR', gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR],
  ];
  GL.filter_min = gl.LINEAR_MIPMAP_NEAREST;
  GL.filter_max = gl.LINEAR;

  GL.picmip = new Cvar('gl_picmip', '0');
  Cmd.AddCommand('gl_texturemode', GL.TextureMode_f);

  GL.streamArray = new ArrayBuffer(8192); // Increasing even a little bit ruins all performance on Mali.
  GL.streamArrayBytes = new Uint8Array(GL.streamArray);
  GL.streamArrayPosition = 0;
  GL.streamArrayVertexCount = 0;
  GL.streamArrayView = new DataView(GL.streamArray);
  GL.streamBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, GL.streamBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, GL.streamArray.byteLength, gl.DYNAMIC_DRAW);
  GL.streamBufferPosition = 0;

  VID.mainwindow.style.display = 'inline-block';
  VID.mainwindow.style.backgroundImage = 'url("' + Draw.PicToDataURL(Draw.PicFromWad('BACKTILE')) + '")';
};

GL.Shutdown = function() {
  // eslint-disable-next-line no-global-assign
  gl = null;
  VID.mainwindow.style.display = 'none';
};
