const target = new URL(process.env.DATABASE_URL || "");
console.log(
  JSON.stringify({
    host: target.hostname,
    port: target.port,
    database: target.pathname.slice(1),
  }),
);
