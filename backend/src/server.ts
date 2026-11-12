import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`API da oficina rodando em http://localhost:${env.PORT}`);
});
