import * as controller from './screening.controller'
import { Router } from 'express'

const router = Router();

router.get('/list', controller.list);

export default router
