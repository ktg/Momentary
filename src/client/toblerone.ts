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
	Vector3
} from "three";
import {Scene, Screening} from "./screening";

const size = 15;

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
	progressLine: Mesh;
	positionLine: Mesh;
}

export function isToblerone(mesh: Object3D): mesh is Toblerone {
	return (mesh as Toblerone).screening !== undefined;
}

function generateTexture(path: Scene[]): HTMLCanvasElement {
	//console.log(path);
	const totalLength = path.reduce((sum, current) => sum + current.length, 0) / 10;
	const size = 1024;
	const sideSize = 1024 / 3;
	const gradEnd = 256;
	const gradStart = 128 + 64;
	const gradBase = 0;
	const gradSize = gradEnd - gradStart;
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
			const proportion = y / size;
			let progress = totalLength * proportion * 10;
			for (const scene of path) {
				progress -= scene.length;
				if (progress <= 0) {
					segment = scene;
					break;
				}
			}
			if (segment == null) {
				segment = path[path.length - 1];
			}
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
	colour.setHex(getColour(offset));
}

function getColour(offset: number): number {
	if (offset === 1) {
		return 0x11EE11
	} else if (offset === 2) {
		return 0x1111EE
	} else {
		return 0xEE1111
	}
}

function createBaseToblerone(screening: Screening): Toblerone {
	const totalLength = screening.scenes.reduce((sum, current) => sum + current.length, 0) / 10;
	const geometry = new CylinderBufferGeometry(size, size, totalLength, 3, 1, false);
	const material = new MeshPhongMaterial({
		alphaTest: 0.2,
		color: 0xFFFFFF,
		flatShading: true,
		opacity: 0,
		shininess: 0,
		side: DoubleSide,
		transparent: true
	});
	return new Toblerone(screening, geometry, material);
}

function createTobleroneGeometry(path: Scene[]): BufferGeometry {
	const totalLength = path.reduce((sum, current) => sum + current.length, 0) / 10;
	const geometry = new CylinderBufferGeometry(size, size, totalLength, 3, 1, true);
	const positions = geometry.attributes.position;
	const count = positions.count;
	geometry.setAttribute('color', new BufferAttribute(new Float32Array(count * 3), 3));
	const colour = new Color();
	const colours = geometry.attributes.color;

	for (let i = 0; i < count; i++) {
		colourFor(colour, i % 4);
		colours.setXYZ(i, colour.r, colour.g, colour.b);
	}

	return geometry;
}

function createProgressLine(path: Scene[], opacity = 1): Mesh {
	const progressLineGeometry = new CylinderBufferGeometry(size, size, 0.5, 3, 1, true);
	const transparent = opacity !== 1;
	const material = new MeshPhongMaterial({
		alphaTest: 0.2,
		color: 0xFFFFFF,
		flatShading: true,
		opacity: opacity,
		shininess: 0,
		side: DoubleSide,
		transparent: transparent
	});
	const mesh = new Mesh(progressLineGeometry, material);
	mesh.visible = false;
	return mesh;
}

function createLineSegment(pointStart: Vector3, pointEnd: Vector3, colourStart: number, colourEnd: number): Mesh {
	const sides = 4;

	const direction = new Vector3().subVectors(pointEnd, pointStart);
	const orientation = new Matrix4();
	orientation.lookAt(pointStart, pointEnd, new Object3D().up);
	orientation.multiply(new Matrix4().set(
		1, 0, 0, 0,
		0, 0, 1, 0,
		0, -1, 0, 0,
		0, 0, 0, 1));
	const edgeGeometry = new CylinderBufferGeometry(0.5, 0.5, direction.length(), sides, 1, true);
	let material: MeshPhongMaterial;
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
			vertexColors: true
		});

		edgeGeometry.setAttribute('color', new BufferAttribute(new Float32Array(vertexColours), 3));
	}

	const edge = new Mesh(edgeGeometry, material);
	edge.applyMatrix4(orientation);
	// position based on midpoints - there may be a better solution than this
	edge.position.x = (pointEnd.x + pointStart.x) / 2;
	edge.position.y = (pointEnd.y + pointStart.y) / 2;
	edge.position.z = (pointEnd.z + pointStart.z) / 2;
	return edge;
}

function createLine(path: Scene[], positions: BufferAttribute | InterleavedBufferAttribute, parent: Mesh) {
	let previous = -1;
	let startPosition = null;
	let yOffset = 0;
	for (const scene of path) {
		const current = scene.primary;
		if (previous !== -1) {
			if (previous !== current) {
				const cornerPosition = new Vector3(positions.getX(previous), positions.getY(previous) - yOffset, positions.getZ(previous));
				const endPosition = new Vector3(positions.getX(current), positions.getY(current) - yOffset, positions.getZ(current));

				parent.add(createLineSegment(startPosition, cornerPosition, getColour(previous), getColour(previous)));
				parent.add(createLineSegment(cornerPosition, endPosition, getColour(previous), getColour(current)));

				startPosition = endPosition;
			}
		} else {
			startPosition = new Vector3(positions.getX(current), positions.getY(current) - yOffset, positions.getZ(current));
		}

		yOffset += (scene.length / 10);
		previous = current;
	}

	const endPosition = new Vector3(positions.getX(previous), positions.getY(previous) - yOffset, positions.getZ(previous));
	parent.add(createLineSegment(startPosition, endPosition, getColour(previous), getColour(previous)));
}

export function createToblerone(screening: Screening): Toblerone {
	const toblerone = createBaseToblerone(screening);
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
		vertexColors: true
	});
	toblerone.add(new Mesh(tobleroneGeometry, tobleroneMaterial));

	createLine(screening.scenes, tobleroneGeometry.attributes.position, toblerone);

	const progressLine = createProgressLine(screening.scenes);
	toblerone.add(progressLine);
	toblerone.progressLine = progressLine;

	const positionLine = createProgressLine(screening.scenes, 0.5);
	toblerone.add(positionLine);
	toblerone.positionLine = positionLine;

	toblerone.rotation.x = -Math.PI / 2;
	toblerone.rotation.y = -Math.PI;
	toblerone.rotation.z = -Math.PI;

	return toblerone;
}
