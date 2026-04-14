import { isNodeRuntime } from "./runtime";
import { KerykeionException } from "./schemas/kerykeion-exception";

interface NodeFsModule {
  existsSync: (path: string) => boolean;
  mkdirSync: (path: string, options?: { recursive?: boolean }) => void;
  readFileSync: (path: string, encoding: string) => string;
  writeFileSync: (path: string, content: string, encoding: string) => void;
}

interface NodePathModule {
  dirname: (path: string) => string;
  join: (...paths: string[]) => string;
  sep: string;
}

interface NodeChildProcessModule {
  execFileSync: (
    file: string,
    args?: readonly string[],
    options?: {
      encoding?: "utf8";
      input?: string;
      maxBuffer?: number;
      stdio?: ["ignore", "ignore", "ignore"];
    },
  ) => string;
}

export interface OptionalNodeRuntime {
  childProcess: NodeChildProcessModule;
  fs: NodeFsModule;
  path: NodePathModule;
}

interface ProcessWithBuiltinModules {
  getBuiltinModule?: <T>(id: string) => T | undefined;
}

function getBuiltinModule<T>(id: string): T | null {
  if (!isNodeRuntime()) {
    return null;
  }

  const processLike = (globalThis as { process?: ProcessWithBuiltinModules }).process;
  const loadBuiltinModule = processLike?.getBuiltinModule;
  return loadBuiltinModule ? loadBuiltinModule<T>(id) ?? null : null;
}

function loadOptionalNodeRuntime(): OptionalNodeRuntime | null {
  const fs = getBuiltinModule<NodeFsModule>("node:fs") ?? getBuiltinModule<NodeFsModule>("fs");
  const path = getBuiltinModule<NodePathModule>("node:path") ?? getBuiltinModule<NodePathModule>("path");
  const childProcess = getBuiltinModule<NodeChildProcessModule>("node:child_process")
    ?? getBuiltinModule<NodeChildProcessModule>("child_process");

  return fs && path && childProcess ? { childProcess, fs, path } : null;
}

const optionalNodeRuntime = loadOptionalNodeRuntime();

export function getOptionalNodeRuntime(): OptionalNodeRuntime | null {
  return optionalNodeRuntime;
}

export function requireNodeRuntime(feature: string): OptionalNodeRuntime {
  if (optionalNodeRuntime) {
    return optionalNodeRuntime;
  }

  throw new KerykeionException(`${feature} requires a Node.js-compatible runtime with file system access.`);
}
