import { Router } from 'express';
import * as controller from '../controllers/ordersController';

const router = Router();

router.post('/', controller.createOrder);
router.post('/:orderId/texts', controller.addText);
router.post('/:orderId/submit', controller.submitOrder);
router.get('/:orderId', controller.getOrder);

export default router;