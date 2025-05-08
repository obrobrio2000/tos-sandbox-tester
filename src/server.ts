import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import ordersRouter from './routes/orders';
import callbackRouter from './routes/callback';
import { startStatusPoller } from './jobs/statusPoller';
import { setUrl } from './ngrok';

async function startServer() {  
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());

  // Setup routes
  app.use('/orders', ordersRouter);
  app.use(callbackRouter);

  // Global error handler (optional, but good practice)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });

  app.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);
    // Start background jobs
    await setUrl();
    startStatusPoller();
  });
}

startServer().catch(error => {
  console.error("Failed to start server:", error);
  process.exit(1);
});