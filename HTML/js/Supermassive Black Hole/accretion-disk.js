let gl;
let timeLocation;
let initialTime;

function createAccretionDisk(canvasId) {
	const canvas = document.getElementById(canvasId);
	gl = canvas.getContext("webgl");
	if (!gl) {
		console.error("Failed to get the rendering context for WebGL");
		return false;
	}
	const vs = document.getElementById("accretion-disk-vertex-shader").innerHTML;
	const fs = document.getElementById("accretion-disk-fragment-shader").innerHTML;
	const vertexShader = makeShader(gl, vs, gl.VERTEX_SHADER);
	if (!vertexShader) return false;
	const fragmentShader = makeShader(gl, fs, gl.FRAGMENT_SHADER);
	if (!fragmentShader) return false;
	const glProgram = gl.createProgram();
	gl.attachShader(glProgram, vertexShader);
	gl.attachShader(glProgram, fragmentShader);
	gl.linkProgram(glProgram);
	if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
		console.error("Unable to initialize the shader program");
		return false;
	}
	gl.useProgram(glProgram);
	gl.program = glProgram;
	const n = initVertexBuffers(gl);
	if (n < 0) {
		console.error("Failed to set the positions of the vertices");
		return false;
	}

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, loadTexture(gl, "img/Supermassive Black Hole/noise_0.png"));
	gl.uniform1i(gl.getUniformLocation(gl.program, "u_Noise_0"), 0);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, loadTexture(gl, "img/Supermassive Black Hole/noise_1.png"));
	gl.uniform1i(gl.getUniformLocation(gl.program, "u_Noise_1"), 1);

	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, loadTexture(gl, "img/Supermassive Black Hole/noise_2.png"));
	gl.uniform1i(gl.getUniformLocation(gl.program, "u_Noise_2"), 2);

	timeLocation = gl.getUniformLocation(gl.program, "u_Time");
	initialTime = Date.now() / 1e3;
	return true;
}

function makeShader(gl, src, type) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
	console.error("Error compiling shader: " + gl.getShaderInfoLog(shader));
	return null;
}

function initVertexBuffers(gl) {
	const verticesCount = initFloat32ArrayAttrib(gl, [
		-1, 1, 1, 1, 1, -1,
		-1, 1, 1, -1, -1, -1,
	], "a_Position");
	const textureCoordsCount = initFloat32ArrayAttrib(gl, [
		0, 1, 1, 1, 1, 0,
		0, 1, 1, 0, 0, 0,
	], "a_TextureCoord");
	if (verticesCount !== textureCoordsCount) {
		console.error("Invalid coords count");
		return -1;
	}
	return verticesCount;
}

function initFloat32ArrayAttrib(gl, data, name) {
	const arr = new Float32Array(data);
	const buffer = gl.createBuffer();
	if (!buffer) {
		console.error("Failed to create the buffer object");
		return -1;
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
	const attrib = gl.getAttribLocation(gl.program, name);
	if (attrib < 0) {
		console.error(`Failed to get the storage location of ${name}`);
		return -1;
	}
	gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(attrib);
	return data.length / 2;
}

function loadTexture(gl, url) {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	const level = 0;
	const internalFormat = gl.RGBA;
	const width = 1;
	const height = 1;
	const border = 0;
	const srcFormat = gl.RGBA;
	const srcType = gl.UNSIGNED_BYTE;
	gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, new Uint8Array([0, 0, 0, 255]));
	const image = new Image();
	image.onload = () => {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	};
	image.src = url;
	return texture;
}

function renderAccretionDisk() {
	gl.uniform1f(timeLocation, Date.now() / 1e3 - initialTime);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}
