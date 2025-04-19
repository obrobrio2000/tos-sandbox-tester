import express from 'express';
import dotenv from 'dotenv';
import orderRoutes from './routes/orders';
import { errorHandler } from './utils/errorHandler';

dotenv.config();

const app = express();

app.use(express.json());
app.use('/orders', orderRoutes);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use(errorHandler);

export default app;