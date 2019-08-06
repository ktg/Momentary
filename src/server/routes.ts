import screening from './api/screening'
import * as express from 'express'

const routes = (app: express.Application): void => {
	app.use('/api/screening', screening);
	app.use(express.static('server/static'));

	app.route('/*')
		.get((req: express.Request, res: express.Response) => {
			res.sendStatus(404)
		});
};

export default routes
