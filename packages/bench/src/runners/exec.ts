import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const MAX_BUFFER = 32 * 1024 * 1024;
const TIMEOUT_MS = 5 * 60 * 1000;

export const execInRepo = async (
  bin: string,
  cwd: string,
  args: string[]
): Promise<string> => {
  const { stdout } = await execFileAsync(bin, args, {
    cwd,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    killSignal: "SIGKILL",
    maxBuffer: MAX_BUFFER,
    timeout: TIMEOUT_MS,
  });
  return stdout;
};
