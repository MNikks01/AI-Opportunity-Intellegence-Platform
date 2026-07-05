/** Explicit entrypoint: start the API server. Run: tsx src/main.ts */
import { buildServer } from "./server";

const port = Number(process.env.PORT ?? 3001);

buildServer()
  .then((app) => app.listen({ port, host: "0.0.0.0" }))
  .then(() => console.warn(`[api] listening on :${port}`))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
