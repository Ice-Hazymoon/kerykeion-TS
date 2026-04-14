interface ProcessLike {
  cwd?: () => string;
  env?: Record<string, string | undefined>;
  versions?: Record<string, string | undefined>;
}

function getProcessLike(): ProcessLike | undefined {
  const candidate = (globalThis as { process?: ProcessLike }).process;
  return typeof candidate === "object" && candidate !== null ? candidate : undefined;
}

export function isNodeRuntime(): boolean {
  return Boolean(getProcessLike()?.versions?.node);
}

export function readEnv(name: string): string | undefined {
  return getProcessLike()?.env?.[name];
}

export function getCurrentWorkingDirectory(): string {
  return getProcessLike()?.cwd?.() ?? ".";
}

export function getDefaultOutputDirectory(): string {
  return readEnv("HOME") ?? getCurrentWorkingDirectory();
}
