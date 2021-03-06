import {createToblerone, isToblerone, Toblerone} from "./toblerone";
import {AmbientLight, Color, Fog, PerspectiveCamera, Raycaster, Scene, Vector2, WebGLRenderer} from "three";
import {OutlinePass} from "three/examples/jsm/postprocessing/OutlinePass";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";
import {FXAAShader} from "three/examples/jsm/shaders/FXAAShader";
import {TweenLite} from "gsap";
import {Screening} from "./screening";
import log = require("loglevel");
import remote = require ('loglevel-plugin-remote')
import {uuid} from "uuidv4"

const windowId = uuid()
// Enable Remote Logging
remote.apply(log, {
	url: "/3/loglevel/themoment",
	token: "VSFthq6ibr5lY6p7PpdJDfkBV1qqlYBn",
	format(message) {
		message.level = message.level.label
		message.windowid = windowId
		return message
	}
});
log.setLevel("INFO")

const raycaster = new Raycaster();
const mouse = new Vector2();
let toblerones: Toblerone[] = [];
let highlighted: Toblerone = null;
let selected: Toblerone = null;
let compare: Toblerone = null;

function createObjects(scene: Scene, screenings: Screening[]) {
	const item_per_row = 5;
	const distance = 50;
	const offset = (item_per_row - 1) / 2;
	for (let i = 0; i < screenings.length; i++) {
		const toblerone = createToblerone(screenings[i]);
		toblerone.position.set(((i % item_per_row) - offset) * distance, (Math.floor(i / item_per_row) * -distance), 0);
		toblerone.origin = toblerone.position.clone();
		toblerones.push(toblerone);
		scene.add(toblerone);
	}
}

function createScene() {
	const scene = new Scene();
	scene.background = new Color(0x000000);
	scene.fog = new Fog(0x000000, 400, 800);

	const light = new AmbientLight(0xFFFFFF);
	scene.add(light);

	return scene;
}

function api<T>(url: string): Promise<T> {
	return fetch(url)
		.then(response => {
			if (!response.ok) {
				throw new Error(response.statusText)
			}
			return response.json()
		})
	//.then(data => {
	//	return data.data
	//})
}

const renderer = new WebGLRenderer({antialias: true})
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement)

const camera = new PerspectiveCamera(20, window.innerWidth / window.innerHeight, 1, 2000)
camera.position.set(0, -10, 500)

const scene = createScene()
const outlinePass = new OutlinePass(new Vector2(window.innerWidth, window.innerHeight), scene, camera)

let frameRequest: number = 0
const composer = new EffectComposer(renderer)
const effectFXAA = new ShaderPass(FXAAShader)
effectFXAA.renderToScreen = true
composer.addPass(new RenderPass(scene, camera))
composer.addPass(outlinePass)
composer.addPass(effectFXAA)

onWindowResize()

window.addEventListener('resize', onWindowResize, false)
document.addEventListener('click', onDocumentClick, false)
document.addEventListener('mousemove', onDocumentMouseMove, false)
document.addEventListener('mousewheel', onDocumentScroll, false)

const vidElement = <HTMLVideoElement>document.getElementById('video')
vidElement.onplay = () => {
	log.info(selected.screening.id + " playing from " + vidElement.currentTime)
}
vidElement.onpause = () => {
	log.info(selected.screening.id + " pausing at " + vidElement.currentTime)
}

api<Screening[]>('data.json')
	.then((screenings) => {
		log.info("Loaded " + screenings.length + " screenings")
		log.info(screenings.map((screening) => {
			return screening.id
		}).join(', '))
		createObjects(scene, screenings)
		document.getElementById('endSelect').addEventListener('click', () => {
			selectToblerone(null)
		});

		const input = <HTMLInputElement>document.getElementById('screeningInput');
		input.addEventListener('input', () => {
			selectToblerone(findTolberone(input.value))
		})

		const hash = location.hash.replace(/^(#)/, "")
		selectToblerone(findTolberone(hash), false)
		animate()
	})
	.catch(error => {
		log.error(error)
	});

function findTolberone(id: string): Toblerone {
	for (const toblerone of toblerones) {
		if (toblerone.screening.id.toString() === id) {
			return toblerone
		}
	}
	return null
}

function animate() {
	frameRequest = requestAnimationFrame(animate);

	raycaster.setFromCamera(mouse, camera);

	const intersects = raycaster.intersectObjects(toblerones)
	if (intersects.length > 0) {
		if (selected === null) {
			const item = intersects[0].object
			if (isToblerone(item)) {
				highlightToblerone(item)
			} else {
				highlightToblerone(null)
			}
		} else if (selected === intersects[0].object) {
			highlightToblerone(null)
			selected.positionLine.position.y = -intersects[0].point.x
			selected.positionLine.visible = true
		}
	} else {
		if (selected !== null) {
			selected.positionLine.visible = false
		}
		highlightToblerone(null)
	}
	composer.render()
}

function onDocumentClick() {
	if (selected === null) {
		if (highlighted !== null) {
			selectToblerone(highlighted)
		}
	} else {
		if (selected.positionLine.visible) {
			const vidElement = <HTMLVideoElement>document.getElementById('video');
			if (vidElement.duration > 0) {
				const length = selected.screening.scenes.reduce((sum, current) => sum + current.length, 0) / 10
				const offset = (length / 2) - selected.positionLine.position.y
				vidElement.currentTime = (offset / length) * vidElement.duration
				log.info(selected.screening.id + " skipped to " + vidElement.currentTime)
			}
		}
	}
}

function highlightToblerone(toblerone: Toblerone) {
	if (highlighted !== toblerone) {
		highlighted = toblerone;
		if (toblerone === null) {
			outlinePass.selectedObjects = [];
		} else {
			outlinePass.selectedObjects = [highlighted];
		}
		showDetails();
	}
}

function showDetails() {
	const toblerone = highlighted || selected;
	const detailElement = document.getElementById('details');
	if (toblerone === null) {
		detailElement.style.display = 'none';
	} else {
		detailElement.style.display = 'flex';
		if (typeof toblerone.screening.date === 'string') {
			toblerone.screening.date = new Date(toblerone.screening.date);
		}
		document.getElementById('details-screening').innerText = toblerone.screening.id.toString();
		document.getElementById('details-date').innerText = toblerone.screening.date.toLocaleDateString('en-GB', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
		document.getElementById('details-path1').innerText = toblerone.screening.threads[0].toString() + '%';
		document.getElementById('details-path2').innerText = toblerone.screening.threads[1].toString() + '%';
		document.getElementById('details-path3').innerText = toblerone.screening.threads[2].toString() + '%';
		document.getElementById('details-cuts').innerText = toblerone.screening.totalCuts.toString() + ' cuts';
	}
}

function startCompare() {
	compare = selected;
	selectToblerone(null);
}

function selectToblerone(toblerone: Toblerone, animated: Boolean = true) {
	if (toblerone === null && selected !== null) {
		log.info(selected.screening.id + " Unselected")
		if (animated) {
			TweenLite.to(selected.rotation, 5, {x: -Math.PI / 2, z: -Math.PI});
			TweenLite.to(selected.position, 5, {x: selected.origin.x, y: selected.origin.y, z: 0});
			for (const toblerone of toblerones) {
				if (toblerone !== selected) {
					TweenLite.to(toblerone.position, 3, {z: 0});
				}
			}
		} else {
			for (const toblerone of toblerones) {
				toblerone.rotation.set(-Math.PI / 2, -Math.PI, -Math.PI);
				toblerone.position.set(toblerone.origin.x, toblerone.origin.y, toblerone.origin.z);
			}
		}

		const vidElement = <HTMLVideoElement>document.getElementById('video')
		vidElement.ontimeupdate = function () {
		}
		selected.progressLine.visible = false
		vidElement.pause()
		vidElement.removeAttribute('src')
		vidElement.load()
		vidElement.style.display = 'none';
		animate();

		document.getElementById('endSelect').style.display = 'none';
		document.getElementById('header').style.opacity = '1';
		document.getElementById('header').style.display = 'flex';
		selected = null;
		window.location.hash = '';
		const input = <HTMLInputElement>document.getElementById('screeningInput');
		input.value = '';
	} else if (compare !== null && toblerone !== compare && toblerone !== selected) {
		// TODO Compare
	} else if (toblerone !== null && toblerone !== selected) {
		log.info(toblerone.screening.id + " Selected")
		selected = toblerone;
		const vidElement = <HTMLVideoElement>document.getElementById('video');
		window.location.hash = '#' + selected.screening.id;
		vidElement.src = 'videos/' + selected.screening.id + '.mp4';
		vidElement.ontimeupdate = function () {
			if (vidElement.duration > 0) {
				const length = toblerone.screening.scenes.reduce((sum, current) => sum + current.length, 0) / 10;
				let offset = length / 2;
				offset -= (vidElement.currentTime / vidElement.duration) * length;
				toblerone.progressLine.position.y = offset;
				toblerone.progressLine.visible = true;
			} else {
				toblerone.progressLine.visible = false;
			}
		};

		if (animated) {
			for (const toblerone of toblerones) {
				if (toblerone !== selected) {
					TweenLite.to(toblerone.position, 3, {z: -400});
				}
			}
			TweenLite.to(selected.rotation, 5, {
				x: -Math.PI, z: -Math.PI / 2, onComplete: () => {
					if (selected !== null) {
						vidElement.style.display = 'block';
					} else {
						vidElement.style.display = 'none';
					}
					//cancelAnimationFrame(frameRequest);
				}
			});
			TweenLite.to(selected.position, 5, {x: camera.position.x, y: camera.position.y - 50, z: 100});
		} else {
			for (const toblerone of toblerones) {
				if (toblerone === selected) {
					toblerone.rotation.set(-Math.PI, -Math.PI, -Math.PI / 2);
					toblerone.position.set(camera.position.x, camera.position.y - 50, 100);
				} else {
					toblerone.rotation.set(-Math.PI / 2, -Math.PI, -Math.PI);
					toblerone.position.set(toblerone.origin.x, toblerone.origin.y, -400);
				}
			}
			vidElement.style.display = 'block';
		}

		document.getElementById('endSelect').style.display = 'block';
		document.getElementById('header').style.opacity = '0';
		document.getElementById('header').style.display = 'none';
		const input = <HTMLInputElement>document.getElementById('screeningInput');
		input.value = selected.screening.id.toString();
	}
	showDetails();
}

function onDocumentScroll(event: WheelEvent) {
	if (selected === null) {
		// TODO Test
		//camera.position.y += (event.deltaY / 10.0);
		TweenLite.to(camera.position, 0.5, {y: camera.position.y + (event.deltaY / 10.0)});
	}
}

function onDocumentMouseMove(event: MouseEvent) {
	event.preventDefault();
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
	composer.setSize(window.innerWidth, window.innerHeight);

	let uniforms: any = effectFXAA.uniforms;
	uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
}