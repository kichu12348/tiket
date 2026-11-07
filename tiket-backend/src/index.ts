import { startJobs } from "./services/jobs.service";
import { buildApp } from "./app";

const app = buildApp();
startJobs(app);

app.get("/health", () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

const start = async () => {
  await app.listen({
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || "127.0.0.1",
  });
};

const graceFullShutdown = async () => {
  await app.close();
  process.exit(0);
};

process.on("SIGTERM", graceFullShutdown);
process.on("SIGINT", graceFullShutdown);

start();
