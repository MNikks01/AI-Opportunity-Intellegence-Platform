/** Explicit entrypoint: start the API server. Run: tsx src/main.ts */
import { buildServer } from "./server";

const app = buildServer();
const port = Number(process.env.PORT ?? 3001);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => console.warn(`[api] listening on :${port}`))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
