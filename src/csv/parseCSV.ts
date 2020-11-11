import csvParser = require('csv-parser');
import {Screening} from "../client/screening";
import * as fs from 'fs';

function readLog(path: string): Promise<Screening> {
	return new Promise((resolve, reject) => {
		let screening = new Screening();
		screening.scenes = [];
		screening.totalCuts = 0;
		screening.threads = [0, 0, 0];
		screening.date = null;

		fs.createReadStream(path)
			.pipe(csvParser({
				headers: [
					'Seconds',
					'Attention',
					'Scene',
					'SceneCombination',
					'Primary',
					'SceneLength',
					'ScenePrimaryLength', 'SceneSecondaryLength', 'ScenePrimaryRatio',
					'SceneCuts',
					'Screening',
					'TimeDay', 'TimeMonth', 'TimeYear', 'TimeHour', 'TimeMinute', 'TimeSecond'],
				skipLines: 1
			}))
			.on('data', (row) => {
				screening.id = row['Screening'];
				if (screening.date === null) {
					screening.date = new Date(row['TimeYear'], row['TimeMonth'], row['TimeDay']);
				}
				const sceneLength = row['SceneLength'];
				if (sceneLength > 0) {
					const scene = {
						length: parseInt(sceneLength, 10),
						primary: characterFor(row['SceneCombination'][0]),
						secondary: characterFor(row['SceneCombination'][1])
					};
					screening.threads[scene.primary] += parseInt(row['ScenePrimaryLength']);
					screening.threads[scene.secondary] += parseInt(row['SceneSecondaryLength']);
					screening.scenes.push(scene);
					screening.totalCuts += parseInt(row['SceneCuts']);
				}
			})
			.on('end', () => {
				let total = screening.threads[0] + screening.threads[1] + screening.threads[2];
				console.log(screening.threads);
				console.log(total);
				screening.threads[0] = Math.round(screening.threads[0] / total * 100);
				screening.threads[1] = Math.round(screening.threads[1] / total * 100);
				screening.threads[2] = Math.round(screening.threads[2] / total * 100);
				resolve(screening);
			});
	});
}

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const path = './data/logs';
fs.readdir(path, (err, files) => {
	if (err) {
		return console.log('Unable to scan directory: ' + err);
	}
	let promises: Promise<Screening>[] = [];
	files.forEach((file) => {
		if (file.endsWith('.csv')) {
			console.log(path + '/' + file);

			let screening = new Screening();
			screening.totalCuts = 0;
			screening.threads = [0, 0, 0];
			screening.date = null;

			promises.push(readLog(path + '/' + file));
		}
	});

	Promise.all(promises)
		.then((screenings) => {
			console.log(screenings);
			fs.writeFileSync('./server/data.json', JSON.stringify(screenings));
		});
});

function characterFor(char: string) {
	if (char === '1') {
		return 0
	} else if (char === '2') {
		return 1
	} else if (char === '3') {
		return 2
	}
}
