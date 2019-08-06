import {
	BufferAttribute,
	BufferGeometry,
	Color,
	CylinderBufferGeometry,
	DoubleSide,
	Geometry,
	InterleavedBufferAttribute,
	Material,
	Matrix4,
	Mesh,
	MeshPhongMaterial,
	Object3D,
	Texture,
	TextureLoader,
	Vector3,
	VertexColors
} from "three";
import {Scene, Screening} from "./screening";

export class Toblerone extends Mesh {
	constructor(
		screening: Screening,
		geometry: Geometry | BufferGeometry,
		material: Material | Material[]
	) {
		super(geometry, material);
		this.screening = screening
	}

	screening: Screening;
	origin: Vector3;
}

export function isToblerone(mesh: Object3D): mesh is Toblerone {
	return (mesh as Toblerone).screening !== undefined;
}

function generateTexture(path: Scene[]): HTMLCanvasElement {
	console.log(path);
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
	let segment: Scene = null;
	for (let i = 0, j = 0; i < image.data.length; i += 4, j++) {
		const x = j % size;
		const side = Math.floor(x / sideSize);
		const edge1 = side;
		const edge2 = (side + 1) % 3;
		if (x === 0) {
			y++;
			segment = path[Math.min(path.length - 1, Math.floor(y / segmentSize))];
		}
		const primaryEdge = segment.primary;
		const secondaryEdge = segment.secondary;
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

function colourFor(colour: Color, offset: number) {
	if (offset === 1) {
		colour.setRGB(0, 1, 0);
	} else if (offset === 2) {
		colour.setRGB(0, 0, 1);
	} else {
		colour.setRGB(1, 0, 0);
	}
}

function getColour(offset: number) {
	if (offset === 1) {
		return 0x00FF00
	} else if (offset === 2) {
		return 0x0000FF
	} else {
		return 0xFF0000
	}
}

function createTobleroneGeometry(path: Scene[], size = 20, length = 10): BufferGeometry {
	const geometry = new CylinderBufferGeometry(size, size, path.length * length, 3, 1, true);
	const positions = geometry.attributes.position;
	const count = positions.count;
	geometry.addAttribute('color', new BufferAttribute(new Float32Array(count * 3), 3));
	const colour = new Color();
	const colours = geometry.attributes.color;

	for (let i = 0; i < count; i++) {
		colourFor(colour, i % 4);
		colours.setXYZ(i, colour.r, colour.g, colour.b);
	}

	return geometry;
}

function createLineSegment(pointStart: Vector3, pointEnd: Vector3, colourStart: number, colourEnd: number): Mesh {
	const sides = 4;

	const direction = new Vector3().subVectors(pointEnd, pointStart);
	const orientation = new Matrix4();
	orientation.lookAt(pointStart, pointEnd, new Object3D().up);
	orientation.multiply(new Matrix4().set(1, 0, 0, 0,
		0, 0, 1, 0,
		0, -1, 0, 0,
		0, 0, 0, 1));
	const edgeGeometry = new CylinderBufferGeometry(0.5, 0.5, direction.length(), sides, 1, true);
	let material = null;
	if (colourEnd == null) {
		material = new MeshPhongMaterial({
			alphaTest: 0.2,
			color: colourStart,
			flatShading: true,
			opacity: 1,
			shininess: 0,
			side: DoubleSide,
			transparent: false
		});
	} else {
		let vertexColours = [];
		const colour = new Color(colourEnd);
		const count = edgeGeometry.attributes.position.count / 2;
		for (let i = 0; i < count; i++) {
			vertexColours.push(colour.r, colour.g, colour.b);
		}
		colour.setHex(colourStart);
		for (let i = 0; i < count; i++) {
			vertexColours.push(colour.r, colour.g, colour.b);
		}

		material = new MeshPhongMaterial({
			alphaTest: 0.2,
			color: 0xFFFFFF,
			flatShading: true,
			opacity: 1,
			shininess: 0,
			side: DoubleSide,
			transparent: false,
			vertexColors: VertexColors
		});

		edgeGeometry.addAttribute('color', new BufferAttribute(new Float32Array(vertexColours), 3));
	}

	const edge = new Mesh(edgeGeometry, material);
	edge.applyMatrix(orientation);
	// position based on midpoints - there may be a better solution than this
	edge.position.x = (pointEnd.x + pointStart.x) / 2;
	edge.position.y = (pointEnd.y + pointStart.y) / 2;
	edge.position.z = (pointEnd.z + pointStart.z) / 2;
	return edge;
}

function createLine(path: Scene[], positions: BufferAttribute | InterleavedBufferAttribute, parent: Mesh) {
	let previous = -1;
	let startPosition = null;
	const length = 10;
	for (let i = 0; i < path.length; i++) {
		const yOffset = i * length;
		const current = path[i].primary;

		if (i !== 0) {
			if (previous !== current) {
				const cornerPosition = new Vector3(positions.getX(previous), positions.getY(previous) - yOffset, positions.getZ(previous));
				const endPosition = new Vector3(positions.getX(current), positions.getY(current) - yOffset, positions.getZ(current));

				parent.add(createLineSegment(startPosition, cornerPosition, getColour(previous), getColour(previous)));
				parent.add(createLineSegment(cornerPosition, endPosition, getColour(previous), getColour(current)));

				//vertices.push(new THREE.Vector3(positions.getX(offset), positions.getY(offset), positions.getZ(offset)));
				//colourFor(colour, current);
				//lineColours.push(colour.r, colour.g, colour.b)
				startPosition = endPosition;
			}
		} else {
			startPosition = new Vector3(positions.getX(current), positions.getY(current) - yOffset, positions.getZ(current));
		}

		previous = current;
	}

	const yOffset = path.length * length;
	const endPosition = new Vector3(positions.getX(previous), positions.getY(previous) - yOffset, positions.getZ(previous));
	parent.add(createLineSegment(startPosition, endPosition, getColour(previous), getColour(previous)));
}

export function createToblerone(screening: Screening): Toblerone {
	const tobleroneGeometry = createTobleroneGeometry(screening.scenes);
	const texture = new TextureLoader().load("textures/texture3.jpg");
	texture.anisotropy = 4;
	const alphaTexture = new Texture(generateTexture(screening.scenes));
	alphaTexture.needsUpdate = true;
	alphaTexture.anisotropy = 4;
	const tobleroneMaterial = new MeshPhongMaterial({
		alphaMap: alphaTexture,
		alphaTest: 0.2,
		color: 0xFFFFFF,
		flatShading: true,
		map: texture,
		opacity: 0.8,
		shininess: 0,
		side: DoubleSide,
		transparent: true,
		vertexColors: VertexColors
	});
	const toblerone = new Toblerone(screening, tobleroneGeometry, tobleroneMaterial);

	createLine(screening.scenes, tobleroneGeometry.attributes.position, toblerone);

	toblerone.rotation.x = -Math.PI / 2;
	toblerone.rotation.y = -Math.PI;
	toblerone.rotation.z = -Math.PI;

	return toblerone;
}
