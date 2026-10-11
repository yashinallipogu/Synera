import process from "node:process";
import { createAuthHandler } from "../server/auth.js";

if (process.env.VERCEL && !process.env.SYNERA_DATA_DIR) {
  process.env.SYNERA_DATA_DIR = "/tmp/synera";
}

const auth = createAuthHandler();

export default async function handler(request, response) {
  await auth.handler(request, response);
}