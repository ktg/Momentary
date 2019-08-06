import {IScreening, Screening} from './screening.model'
import {apiMethod} from '../helpers';

export const list = apiMethod<IScreening[]>(async () => {
	return {
		data: await Screening.find()
	}
});
