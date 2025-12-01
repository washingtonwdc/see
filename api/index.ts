import express from "express";
import { registerRoutes } from "../server/routes";

const app = express();

declare module 'http' {
  interface IncomingMessage { rawBody: unknown }
}

app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));

let init: Promise<void> | undefined;
function ensureInit() {
  if (!init) {
    init = (async () => { await registerRoutes(app); })();
  }
  return init;
}

export default async function handler(req: any, res: any) {
  await ensureInit();
  return (app as any)(req, res);
}
