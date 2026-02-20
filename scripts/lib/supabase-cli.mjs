import { execFileSync } from "node:child_process";
import { appendFileSync, chmodSync, copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CLI_VERSION = process.env.SUPABASE_CLI_VERSION || "2.76.12";
const CLI_REPO = "supabase/cli";
const PACKAGE_NAME = "supabase";

const ARCH_MAPPING = {
  x64: "amd64",
  arm64: "arm64",
};

const PLATFORM_MAPPING = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
};

const platform = PLATFORM_MAPPING[process.platform];
const arch = ARCH_MAPPING[process.arch];
const isWindows = process.platform === "win32";

const ensureSupportedPlatform = () => {
  if (!platform || !arch) {
    throw new Error(`Unsupported runtime for Supabase CLI bootstrap: ${process.platform}/${process.arch}`);
  }
};

const getBootstrapPaths = () => {
  const root = resolve(process.cwd(), ".cache", "supabase-cli", `v${CLI_VERSION}`, `${platform}-${arch}`);
  const binaryName = isWindows ? "supabase.exe" : "supabase";
  return {
    root,
    binaryPath: join(root, binaryName),
    archivePath: join(root, `${PACKAGE_NAME}_${platform}_${arch}.tar.gz`),
  };
};

const tryExec = (command, args, options) => {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, options),
    };
  } catch (error) {
    return {
      ok: false,
      error,
    };
  }
};

const getContentLength = (url) => {
  const headers = execFileSync("curl", ["-fsLI", url], { encoding: "utf8" });
  const matches = [...headers.matchAll(/content-length:\s*(\d+)/gi)];
  if (matches.length === 0) {
    throw new Error("Could not determine Supabase CLI archive size from HTTP headers.");
  }

  const value = Number(matches.at(-1)?.[1]);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Received invalid Supabase CLI archive size.");
  }

  return value;
};

const downloadArchiveInRanges = (url, archivePath) => {
  const totalBytes = getContentLength(url);
  const chunkSize = 2 * 1024 * 1024;
  writeFileSync(archivePath, "");

  for (let start = 0; start < totalBytes; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, totalBytes - 1);
    const expectedChunkBytes = end - start + 1;
    const chunk = execFileSync(
      "curl",
      [
        "-fsL",
        "--retry",
        "10",
        "--retry-delay",
        "1",
        "--retry-all-errors",
        "--range",
        `${start}-${end}`,
        url,
      ],
      { maxBuffer: Math.max(expectedChunkBytes + 1024, 3 * 1024 * 1024) },
    );

    if (chunk.length !== expectedChunkBytes) {
      throw new Error(
        `Supabase CLI download chunk size mismatch (${start}-${end} expected ${expectedChunkBytes} bytes, got ${chunk.length}).`,
      );
    }

    appendFileSync(archivePath, chunk);
  }
};

const installStandaloneCli = () => {
  ensureSupportedPlatform();
  const { root, binaryPath, archivePath } = getBootstrapPaths();

  if (existsSync(binaryPath)) {
    return binaryPath;
  }

  mkdirSync(root, { recursive: true });
  const url = `https://github.com/${CLI_REPO}/releases/download/v${CLI_VERSION}/${PACKAGE_NAME}_${platform}_${arch}.tar.gz`;
  const extractDir = join(tmpdir(), `supabase-cli-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  try {
    mkdirSync(extractDir, { recursive: true });
    downloadArchiveInRanges(url, archivePath);
    execFileSync("tar", ["-xzf", archivePath, "-C", extractDir], { stdio: "ignore" });

    const extractedBinary = join(extractDir, isWindows ? "supabase.exe" : "supabase");
    copyFileSync(extractedBinary, binaryPath);
    if (!isWindows) chmodSync(binaryPath, 0o755);
  } finally {
    rmSync(extractDir, { recursive: true, force: true });
    rmSync(archivePath, { force: true });
  }

  return binaryPath;
};

export const runSupabase = (args, options = {}) => {
  if (process.env.SUPABASE_CLI_USE_GLOBAL === "1") {
    const direct = tryExec("supabase", args, options);
    if (direct.ok) return direct.output;
    if (!(direct.error instanceof Error && "code" in direct.error && direct.error.code === "ENOENT")) {
      throw direct.error;
    }
  }

  const standaloneBinary = installStandaloneCli();
  return execFileSync(standaloneBinary, args, options);
};
