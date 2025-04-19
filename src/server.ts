import app from './app';
import { startStatusPoller } from './jobs/statusPoller';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  startStatusPoller();
});