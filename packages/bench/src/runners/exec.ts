import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const MAX_BUFFER = 32 * 1024 * 1024;

export const execInRepo = async (
  bin: string,
  cwd: string,
  args: string[]
): Promise<string> => {
  const { stdout } = await execFileAsync(bin, args, {
    cwd,
    maxBuffer: MAX_BUFFER,
  });
  return stdout;
};
