export class Scene {
	length: number;
	primary: number;
	secondary: number
}

export class Screening {
	id: { type: number, required: true };
	video: string;
	scenes: Scene[];
	date: Date;
	totalCuts: number;
	threads: number[];
}