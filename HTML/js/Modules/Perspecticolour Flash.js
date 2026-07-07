window.addEventListener('DOMContentLoaded', async function()
{
	function sin(θ) { return Math.sin(θ * Math.PI / 180); }
	function cos(θ) { return Math.cos(θ * Math.PI / 180); }
	class Pt // point in 3D space
	{
		constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
		plus(op) { return p(this.x + op.x, this.y + op.y, this.z + op.z); }
		minus(op) { return p(this.x - op.x, this.y - op.y, this.z - op.z); }
		mul(factor) { return p(this.x*factor, this.y*factor, this.z*factor); }
		times(op) { return p(this.y * op.z - this.z * op.y, this.z * op.x - this.x * op.z, this.x * op.y - this.y * op.x); }
		normalize()
		{
			let d = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
			return p(this.x / d, this.y / d, this.z / d);
		}
		dist(other) { return Math.sqrt(Math.pow(this.x-other.x, 2) + Math.pow(this.y-other.y, 2) + Math.pow(this.z-other.z, 2)); }
		timesMatrix(matrix)
		{
			return p(
				matrix[0] * this.x + matrix[1] * this.y + matrix[2] * this.z,
				matrix[3] * this.x + matrix[4] * this.y + matrix[5] * this.z,
				matrix[6] * this.x + matrix[7] * this.y + matrix[8] * this.z);
		}
		projectTo2D(camPos, camMatrix)
		{
			let calc = this.minus(camPos).timesMatrix(camMatrix);
			return { x: 100 * calc.x / calc.z, y: -100 * calc.y / calc.z };
		}
		rotateX(angle) { return p(this.x, this.y * cos(angle) - this.z * sin(angle), this.y * sin(angle) + this.z * cos(angle)); }
		rotateY(angle) { return p(this.x * cos(angle) - this.z * sin(angle), this.y, this.x * sin(angle) + this.z * cos(angle)); }
		rotateZ(angle) { return p(this.x * cos(angle) - this.y * sin(angle), this.x * sin(angle) + this.y * cos(angle), this.z); }
		rotate(q) {
			let a = q.a, b = q.b, c = q.c, d = q.d;
			return this.timesMatrix([
				a*a + b*b - c*c - d*d,
				2*(b*c - a*d),
				2*(b*d + a*c),
				2*(b*c + a*d),
				a*a + c*c - b*b - d*d,
				2*(c*d - a*b),
				2*(b*d - a*c),
				2*(c*d + a*b),
				a*a + d*d - b*b - c*c
			]);
		}
	}
	function p(x, y, z) { return new Pt(x, y, z); }
	class Qt // quaternion (rotation)
	{
		constructor(a, b, c, d) { this.a = a; this.b = b; this.c = c; this.d = d; }
		comp(rot)
		{
			return new Qt(
				this.a * rot.a - this.b * rot.b - this.c * rot.c - this.d * rot.d,
				this.a * rot.b + this.b * rot.a - this.c * rot.d + this.d * rot.c,
				this.a * rot.c + this.c * rot.a - this.d * rot.b + this.b * rot.d,
				this.a * rot.d + this.d * rot.a - this.b * rot.c + this.c * rot.b);
		}
	}
	function q(axisX, axisY, axisZ, angle)
	{
		return new Qt(
			Math.cos(angle/2),
			Math.sin(angle/2) * axisX,
			Math.sin(angle/2) * axisY,
			Math.sin(angle/2) * axisZ);
	}

	let coroutines = {}, counter = 0;
	function getCounter() { let c = counter++; counter %= 2147483647; return c; }
	async function coroutine(id, data, fnc)
	{
		let val = id === null ? null : (coroutines[id] = getCounter()), stop = false;
		for (let ix = 0; ix < data.length && !stop; ix++)
		{
			if (data[ix] === null)
				continue;
			if (typeof data[ix] === 'function')
			{
				await data[ix]();
				continue;
			}
			let startTime = await new Promise(requestAnimationFrame), elapsed = 0, dur = data[ix].d * 1000, ea = data[ix].e ?? (t => t), obj;
			if (id !== null && coroutines[id] !== val)
				break;
			while (elapsed < dur)
			{
				obj = data[ix].v ? Object.fromEntries(Object.entries(data[ix].v).map(([k, [s, e]]) => [k, (e-s)*ea(elapsed/dur) + s])) : elapsed/dur;
				if (fnc)
					fnc(obj, ix, false);
				if (data[ix].fn)
					data[ix].fn(obj, ix, false);
				elapsed = (await new Promise(requestAnimationFrame)) - startTime;
				if (id !== null && coroutines[id] !== val)
				{
					stop = true;
					break;
				}
			}
			obj = data[ix].v ? Object.fromEntries(Object.entries(data[ix].v).map(([k, v]) => [k, v[1]])) : 1;
			if (fnc)
				fnc(obj, ix, true);
			if (data[ix].fn)
				data[ix].fn(obj, ix, false);
		}
		delete coroutines[id];
	}

	const Colour = { Red: 0, Yellow: 1, Green: 2, Blue: 3, Magenta: 4, White: 5 };
	const cubes = [
		{ center: p(-1, -1, -2),	faces: [ Colour.Green, Colour.Blue, Colour.Red, Colour.Yellow, Colour.White, Colour.Magenta ] },
		{ center: p(-1, 0, -2),		faces: [ Colour.Red, Colour.Magenta, Colour.White, Colour.Green, Colour.Yellow, Colour.Blue ] },
		{ center: p(0, 0, -2),		faces: [ Colour.White, Colour.Yellow, Colour.Red, Colour.Magenta, Colour.Blue, Colour.Green ] },
		{ center: p(-1, -1, -1),	faces: [ Colour.White, Colour.Green, Colour.Magenta, Colour.Blue, Colour.Yellow, Colour.Red ] },
		{ center: p(0, -1, -1),		faces: [ Colour.Magenta, Colour.Green, Colour.Yellow, Colour.Blue, Colour.White, Colour.Red ] },
		{ center: p(0, 0, -1),		faces: [ Colour.Blue, Colour.White, Colour.Magenta, Colour.Green, Colour.Red, Colour.Yellow ] },
		{ center: p(0, 1, -1),		faces: [ Colour.Red, Colour.Magenta, Colour.Blue, Colour.Green, Colour.White, Colour.Yellow ] },
		{ center: p(1, 1, -1),		faces: [ Colour.Blue, Colour.White, Colour.Green, Colour.Yellow, Colour.Magenta, Colour.Red ] },
		{ center: p(-2, 0, 0),		faces: [ Colour.Green, Colour.Blue, Colour.Yellow, Colour.Red, Colour.Magenta, Colour.White ] },
		{ center: p(-2, 1, 0),		faces: [ Colour.Yellow, Colour.Green, Colour.White, Colour.Red, Colour.Blue, Colour.Magenta ] },
		{ center: p(-1, -1, 0),		faces: [ Colour.Magenta, Colour.Red, Colour.White, Colour.Green, Colour.Yellow, Colour.Blue ] },
		{ center: p(-1, 0, 0),		faces: [ Colour.Red, Colour.Magenta, Colour.Green, Colour.Blue, Colour.White, Colour.Yellow ] },
		{ center: p(0, -2, 0),		faces: [ Colour.Yellow, Colour.Blue, Colour.Green, Colour.White, Colour.Magenta, Colour.Red ] },
		{ center: p(0, 1, 0),		faces: [ Colour.Blue, Colour.White, Colour.Green, Colour.Red, Colour.Magenta, Colour.Yellow ] },
		{ center: p(0, 2, 0),		faces: [ Colour.Red, Colour.Green, Colour.Blue, Colour.White, Colour.Yellow, Colour.Magenta ] },
		{ center: p(1, -2, 0),		faces: [ Colour.Green, Colour.Red, Colour.Blue, Colour.Magenta, Colour.White, Colour.Yellow ] },
		{ center: p(1, -1, 0),		faces: [ Colour.Blue, Colour.Red, Colour.Green, Colour.White, Colour.Yellow, Colour.Magenta ] },
		{ center: p(1, 0, 0),		faces: [ Colour.Blue, Colour.Red, Colour.White, Colour.Yellow, Colour.Green, Colour.Magenta ] },
		{ center: p(1, 1, 0),		faces: [ Colour.Magenta, Colour.Green, Colour.White, Colour.Red, Colour.Blue, Colour.Yellow ] },
		{ center: p(2, 0, 0),		faces: [ Colour.Magenta, Colour.White, Colour.Blue, Colour.Red, Colour.Green, Colour.Yellow ] },
		{ center: p(2, 1, 0),		faces: [ Colour.Yellow, Colour.Red, Colour.Green, Colour.Magenta, Colour.Blue, Colour.White ] },
		{ center: p(-1, 0, 1),		faces: [ Colour.Blue, Colour.Red, Colour.Green, Colour.Magenta, Colour.Yellow, Colour.White ] },
		{ center: p(-1, 1, 1),		faces: [ Colour.Blue, Colour.Red, Colour.Yellow, Colour.White, Colour.Green, Colour.Magenta ] },
		{ center: p(-1, 2, 1),		faces: [ Colour.White, Colour.Red, Colour.Magenta, Colour.Green, Colour.Blue, Colour.Yellow ] },
		{ center: p(0, -2, 1),		faces: [ Colour.Green, Colour.White, Colour.Blue, Colour.Magenta, Colour.Yellow, Colour.Red ] },
		{ center: p(0, -1, 1),		faces: [ Colour.Magenta, Colour.Green, Colour.Blue, Colour.Yellow, Colour.Red, Colour.White ] },
		{ center: p(0, 2, 1),		faces: [ Colour.Yellow, Colour.White, Colour.Red, Colour.Magenta, Colour.Green, Colour.Blue ] },
		{ center: p(1, -1, 1),		faces: [ Colour.Green, Colour.Red, Colour.Magenta, Colour.Yellow, Colour.White, Colour.Blue ] },
		{ center: p(0, -1, 2),		faces: [ Colour.Red, Colour.Green, Colour.White, Colour.Yellow, Colour.Magenta, Colour.Blue ] },
		{ center: p(0, 0, 2),		faces: [ Colour.White, Colour.Red, Colour.Blue, Colour.Yellow, Colour.Green, Colour.Magenta ] }
	];

	function getCameraMatrix(cameraPosition, lookingAt)
	{
		let forward = (lookingAt.minus(cameraPosition)).normalize();
		let right = (p(0, 1, 0).times(forward)).normalize();
		let x = right;
		let y = forward.times(right).normalize();
		let z = forward;
		let matrix = [x.x, y.x, z.x, x.y, y.y, z.y, x.z, y.z, z.z];

		// Start of matrix inverse algorithm

		let augmented = Array(6 * 3).fill(null).map((_, ix) => ix % 6 < 3 ? matrix[ix % 6 + ((ix / 6)|0) * 3] : ix % 6 - 3 === ((ix / 6)|0) ? 1 : 0);

		// Since we’re going kind of diagonal, ‘rc’ may refer to a row or a column, but we’re really processing one column at a time.
		// Each iteration of this loop turns column ‘rc’ into the corresponding column of an identity matrix.
		for (let rc = 0; rc < 3; rc++)
		{
			// Turn matrix[rc, rc] into 1 by multiplying the row by its inverse.
			// If this coefficient is currently 0, find a later row that we can swap this one with.
			// If there is no other such row, the matrix is not invertible.
			if (augmented[rc + 6 * rc] == 0)
			{
				let otherRowIx = Array(3-1-rc).fill(null).map((_, c) => c + rc + 1).filter(r => augmented[rc + 6 * r] !== 0)[0] ?? -1;
				if (otherRowIx == -1)
					throw new Error("The matrix is not invertible.");
				for (let i = 0; i < 6; i++)
					[augmented[i + 6 * rc], augmented[i + 6 * otherRowIx]] = [augmented[i + 6 * otherRowIx], augmented[i + 6 * rc]];
			}

			let div = augmented[rc + 6 * rc];
			for (let i = rc; i < 6; i++)
				augmented[i + 6 * rc] /= div;

			for (let row = 0; row < 3; row++)
				if (row != rc)
				{
					// Need to turn this index into 0 by subtracting a multiple of row ‘rc’ (where the relevant index is now 1)
					let mult = augmented[rc + 6 * row];
					for (let i = rc; i < 6; i++)
						augmented[i + 6 * row] -= mult * augmented[i + 6 * rc];
				}
		}

		return Array(3 * 3).fill(null).map((c, ix) => augmented[3 + (ix % 3) + 6 * ((ix / 3)|0)]);
	}

	const svg = document.getElementById('svg');
	const transparentCubes = new Set();
	let mouseStart = null;

	svg.addEventListener('pointerdown', e =>
	{
		if (e.button !== 0)
			return;
		
		e.preventDefault();
		svg.setPointerCapture(e.pointerId);
		
		const path = e.target.closest?.('path.face');
		if (path) {
			const cubeIx = Number(path.dataset.cube);
			if (Number.isNaN(cubeIx))
				return;
	
			if (transparentCubes.has(cubeIx))
				transparentCubes.delete(cubeIx);
			else
				transparentCubes.add(cubeIx);
			return;
		}
		
		mouseStart = { x: e.clientX, y: e.clientY };
		curDiagramRotation = diagramRotation;
	});

	document.addEventListener('pointermove', e =>
	{
		if (mouseStart === null)
			return;
		
		if ((e.buttons & 1) === 0) {
			endDrag();
			return;
		}
		
		let dx = e.clientX - mouseStart.x;
		let dy = e.clientY - mouseStart.y;
		let mAngle = Math.atan2(dy, dx);
		let mDist = Math.sqrt(dx*dx + dy*dy);
		let quat = q(Math.cos(mAngle + Math.PI/2), Math.sin(mAngle - Math.PI/2), 0, mDist/180);
		curDiagramRotation = diagramRotation.comp(quat);
	});

	document.addEventListener('pointerup', e =>
	{
		try {
			svg.releasePointerCapture(e.pointerId);
		} catch {}
		endDrag();
	});
	
	svg.addEventListener('pointercancel', endDrag);
	svg.addEventListener('lostpointercapture', endDrag);
	
	function endDrag() {
		if (mouseStart === null)
			return;
		mouseStart = null;
		diagramRotation = curDiagramRotation;
	}
	
	const center = p(0, 0, 0);
	const cubeSize = .25;
	let cameraPosition = p(0, 0, -10);
	let diagramRotation = q(1, 0, 0, 0);
	let curDiagramRotation = q(1, 0, 0, 0);
	let queue = [];

	function updateDiagram()
	{
		let faces = cubes
			.map((cube, cubeIx) => [
				{
					cubeIx: cubeIx,
					faceIx: 0,
					center: p(0, 1, 0).mul(cubeSize).plus(cube.center).rotate(curDiagramRotation),
					corners: [p(-1, 1, -1), p(1, 1, -1), p(1, 1, 1), p(-1, 1, 1)].map(pt => pt.mul(cubeSize).plus(cube.center).rotate(curDiagramRotation)),
					color: cube.faces[0]
				},
				{
					cubeIx: cubeIx,
					faceIx: 1,
					center: p(0, 0, -1).mul(cubeSize).plus(cube.center).rotate(curDiagramRotation),
					corners: [p(-1, -1, -1), p(1, -1, -1), p(1, 1, -1), p(-1, 1, -1)].map(pt => pt.mul(cubeSize).plus(cube.center).rotate(curDiagramRotation)),
					color: cube.faces[1]
				},
				{
					cubeIx: cubeIx,
					faceIx: 2,
					center: p(1, 0, 0).mul(cubeSize).plus(cube.center).rotate(curDiagramRotation),
					corners: [p(1, -1, -1), p(1, 1, -1), p(1, 1, 1), p(1, -1, 1)].map(pt => pt.mul(cubeSize).plus(cube.center).rotate(curDiagramRotation)),
					color: cube.faces[2]
				},
				{
					cubeIx: cubeIx,
					faceIx: 3,
					center: p(0, 0, 1).mul(cubeSize).plus(cube.center).rotate(curDiagramRotation),
					corners: [p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1)].map(pt => pt.mul(cubeSize).plus(cube.center).rotate(curDiagramRotation)),
					color: cube.faces[3]
				},
				{
					cubeIx: cubeIx,
					faceIx: 4,
					center: p(-1, 0, 0).mul(cubeSize).plus(cube.center).rotate(curDiagramRotation),
					corners: [p(-1, -1, -1), p(-1, 1, -1), p(-1, 1, 1), p(-1, -1, 1)].map(pt => pt.mul(cubeSize).plus(cube.center).rotate(curDiagramRotation)),
					color: cube.faces[4]
				},
				{
					cubeIx: cubeIx,
					faceIx: 5,
					center: p(0, -1, 0).mul(cubeSize).plus(cube.center).rotate(curDiagramRotation),
					corners: [p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1)].map(pt => pt.mul(cubeSize).plus(cube.center).rotate(curDiagramRotation)),
					color: cube.faces[5]
				}
			])
			.flat();
		faces.sort((a, b) => b.center.dist(cameraPosition) - a.center.dist(cameraPosition));

		let cameraMatrix = getCameraMatrix(cameraPosition, center);
		svg.innerHTML = faces.map(face => {
			const pts = face.corners
				.map(p => p.projectTo2D(cameraPosition, cameraMatrix))
				.map(p2 => `${p2.x} ${p2.y}`)
				.join(' ');


			const isTransparent = transparentCubes.has(face.cubeIx);
			return `<path class="face color-${face.color}
				${isTransparent ? 'is-transparent' : ''}"
				data-cube="${face.cubeIx}"
				data-face="${face.faceIx}"
				d="M${pts}z"></path>`;
		}).join('');
	}

	let rotationButtons = [
		{ id: 'xCcw',	x: 1,	y: 0,	z: 0,	angle: Math.PI/2	},
		{ id: 'xCw',	x: 1,	y: 0,	z: 0,	angle: -Math.PI/2	},
		{ id: 'yCcw',	x: 0,	y: 1,	z: 0,	angle: Math.PI/2	},
		{ id: 'yCw',	x: 0,	y: 1,	z: 0,	angle: -Math.PI/2	},
		{ id: 'zCcw',	x: 0,	y: 0,	z: 1,	angle: Math.PI/2	},
		{ id: 'zCw',	x: 0,	y: 0,	z: 1,	angle: -Math.PI/2	}
	];

	for (let inf of rotationButtons)
	{
		document.getElementById(inf.id).onclick = function()
		{
			queue.push(() => {
				let startRotation = diagramRotation;
				diagramRotation = diagramRotation.comp(q(inf.x, inf.y, inf.z, inf.angle));
				coroutine('rotation', [
					{
						d:	.4,
						e:	t => t < .5 ? 2 * t * t : (4 - 2 * t) * t - 1,
						v:	{ v: [0, inf.angle] },
						fn:	t => { curDiagramRotation = startRotation.comp(q(inf.x, inf.y, inf.z, t.v)); }
					}
				]);
			});
		};
	}

	while (true)
	{
		await new Promise(requestAnimationFrame);
		if (queue.length > 0 && !('rotation' in coroutines))
			queue.pop()();
		updateDiagram();
	}
});
