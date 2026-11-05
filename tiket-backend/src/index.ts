import { startJobs } from "./services/jobs.service";
import { buildApp } from "./app";

const app = buildApp();
startJobs(app);

await app.listen({
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || "127.0.0.1",
});

const graceFullShutdown = async (signal: string) => {
  console.log(`${signal} received...`);
  await app.close();
  console.log("Server closed");
  process.exit(0);
};

process.on("SIGTERM", graceFullShutdown);
process.on("SIGINT", graceFullShutdown);
