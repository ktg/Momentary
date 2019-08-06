import * as mongoose from 'mongoose'

export interface IScreening extends mongoose.Document {
	id: { type: number, required: true },
	video: string,
	scenes: [{
		length: number,
		primary: number,
		secondary: number
	}],
	date: Date,
	totalCuts: number,
	threads: number[]
}

const ScreeningSchema = new mongoose.Schema({
	id: {type: Number, required: true},
	video: String,
	scenes: [{
		length: Number,
		primary: Number,
		secondary: Number
	}],
	date: Date,
	totalCuts: Number,
	threads: [Number]
});

export const Screening = mongoose.model<IScreening>('Screening', ScreeningSchema);
