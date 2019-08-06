function generateTexture(path) {
	const size = 1024;
	const sideSize = 1024 / 3;
	const gradEnd = 256;
	const gradStart = 128 + 64;
	const gradBase = 0;
	const gradSize = gradEnd - gradStart;
	const segmentSize = 1024 / path.length;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const context = canvas.getContext('2d');
	const image = context.getImageData(0, 0, size, size);
	let y = 0;
	let segment = 0;
	for (let i = 0, j = 0; i < image.data.length; i += 4, j++) {
		const x = j % size;
		const side = Math.floor(x / sideSize);
		const edge1 = side;
		const edge2 = (side + 1) % 3;
		if (x === 0) {
			y++;
			segment = Math.floor(y / segmentSize);
		}
		const primaryEdge = path[segment].primary;
		const secondaryEdge = path[segment].secondary;
		let value = gradBase;
		if (edge1 === primaryEdge && edge2 === secondaryEdge) {
			const progress = 1 - ((x % sideSize) / sideSize);
			value = (progress * gradSize) + gradStart;
		} else if (edge1 === secondaryEdge && edge2 === primaryEdge) {
			const progress = ((x % sideSize) / sideSize);
			value = (progress * gradSize) + gradStart;
		}

		image.data[i] = value;
		image.data[i + 1] = value;
		image.data[i + 2] = value;
		image.data[i + 3] = value;
	}
	context.putImageData(image, 0, 0);
	return canvas;
}

function colourFor(colour, offset) {
	if (offset === 1) {
		colour.setRGB(0, 1, 0);
	} else if (offset === 2) {
		colour.setRGB(0, 0, 1);
	} else {
		colour.setRGB(1, 0, 0);
	}
}

function getColour(offset) {
	if (offset === 1) {
		return 0x00FF00
	} else if (offset === 2) {
		return 0x0000FF
	} else {
		return 0xFF0000
	}
}

function createTobleroneGeometry(path, size = 20, length = 10) {
	const geometry = new THREE.CylinderBufferGeometry(size, size, path.length * length, 3, 1, true);
	const positions = geometry.attributes.position;
	const count = positions.count;
	geometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
	const colour = new THREE.Color();
	const colours = geometry.attributes.color;

	for (let i = 0; i < count; i++) {
		colourFor(colour, i % 4);
		colours.setXYZ(i, colour.r, colour.g, colour.b);
	}

	return geometry;
}

function createLineSegment(pointStart, pointEnd, colourStart, colourEnd) {
	const sides = 4;

	const direction = new THREE.Vector3().subVectors(pointEnd, pointStart);
	const orientation = new THREE.Matrix4();
	orientation.lookAt(pointStart, pointEnd, new THREE.Object3D().up);
	orientation.multiply(new THREE.Matrix4().set(1, 0, 0, 0,
		0, 0, 1, 0,
		0, -1, 0, 0,
		0, 0, 0, 1));
	const edgeGeometry = new THREE.CylinderBufferGeometry(0.5, 0.5, direction.length(), sides, 1, true);
	let material = null;
	if (colourEnd == null) {
		material = new THREE.MeshPhongMaterial({
			alphaTest: 0.2,
			color: colourStart,
			flatShading: true,
			opacity: 1,
			shininess: 0,
			side: THREE.DoubleSide,
			transparent: false
		});
	} else {
		let vertexColours = [];
		const colour = new THREE.Color(colourEnd);
		const count = edgeGeometry.attributes.position.count / 2;
		for (let i = 0; i < count; i++) {
			vertexColours.push(colour.r, colour.g, colour.b);
		}
		colour.setHex(colourStart);
		for (let i = 0; i < count; i++) {
			vertexColours.push(colour.r, colour.g, colour.b);
		}

		material = new THREE.MeshPhongMaterial({
			alphaTest: 0.2,
			color: 0xFFFFFF,
			flatShading: true,
			opacity: 1,
			shininess: 0,
			side: THREE.DoubleSide,
			transparent: false,
			vertexColors: THREE.VertexColors
		});

		edgeGeometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(vertexColours), 3));
	}

	const edge = new THREE.Mesh(edgeGeometry, material);
	edge.applyMatrix(orientation);
	// position based on midpoints - there may be a better solution than this
	edge.position.x = (pointEnd.x + pointStart.x) / 2;
	edge.position.y = (pointEnd.y + pointStart.y) / 2;
	edge.position.z = (pointEnd.z + pointStart.z) / 2;
	return edge;
}

function createLine(path, positions, parent, length = 10) {
	let previous = -1;
	let startPosition = null;
	for (let i = 0; i < path.length; i++) {
		const yOffset = i * length;
		const current = path[i].primary;

		if (i !== 0) {
			if (previous !== current) {
				const cornerPosition = new THREE.Vector3(positions.getX(previous), positions.getY(previous) - yOffset, positions.getZ(previous));
				const endPosition = new THREE.Vector3(positions.getX(current), positions.getY(current) - yOffset, positions.getZ(current));

				parent.add(createLineSegment(startPosition, cornerPosition, getColour(previous)));
				parent.add(createLineSegment(cornerPosition, endPosition, getColour(previous), getColour(current)));

				//vertices.push(new THREE.Vector3(positions.getX(offset), positions.getY(offset), positions.getZ(offset)));
				//colourFor(colour, current);
				//lineColours.push(colour.r, colour.g, colour.b)
				startPosition = endPosition;
			}
		} else {
			startPosition = new THREE.Vector3(positions.getX(current), positions.getY(current) - yOffset, positions.getZ(current));
		}

		previous = current;
	}

	const yOffset = path.length * length;
	const endPosition = new THREE.Vector3(positions.getX(previous), positions.getY(previous) - yOffset, positions.getZ(previous));
	parent.add(createLineSegment(startPosition, endPosition, getColour(previous)));
}

function createToblerone(screening) {
	const tobleroneGeometry = createTobleroneGeometry(screening.scenes);
	const texture = new THREE.TextureLoader().load("textures/texture3.jpg");
	texture.anisotropy = 4;
	const alphaTexture = new THREE.Texture(generateTexture(screening.path));
	alphaTexture.needsUpdate = true;
	alphaTexture.anisotropy = 4;
	const tobleroneMaterial = new THREE.MeshPhongMaterial({
		alphaMap: alphaTexture,
		alphaTest: 0.2,
		color: 0xFFFFFF,
		flatShading: true,
		map: texture,
		opacity: 0.8,
		shininess: 0,
		side: THREE.DoubleSide,
		transparent: true,
		vertexColors: THREE.VertexColors
	});
	const toblerone = new THREE.Mesh(tobleroneGeometry, tobleroneMaterial);

	createLine(screening.path, tobleroneGeometry.attributes.position, toblerone);

	toblerone.rotation.x = -Math.PI / 2;
	toblerone.rotation.y = -Math.PI;
	toblerone.rotation.z = -Math.PI;

	return toblerone;
}