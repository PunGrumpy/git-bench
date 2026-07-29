// libgit2 bindings via bun:ffi. Requires system libgit2 (>= 1.5).
// Override the library location with GIT_BENCH_LIBGIT2 if needed.
import type { OperationId, Runner, RunnerContext } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bunFfi: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lib: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let symbols: any;
// libgit2 returns 64-bit pointers, but bun:ffi only accepts `number` (not
// bigint) for FFIType.ptr arguments. We read out-pointers via BigUint64Array
// then narrow to Number — safe on all platforms where pointers fit in
// Number.MAX_SAFE_INTEGER (2^53), which covers every mainstream OS today.
let repoPtr = 0;
const rd = (buf: BigUint64Array) => Number(buf[0]);

const LIB_CANDIDATES = [
  process.env.GIT_BENCH_LIBGIT2,
  "/home/linuxbrew/.linuxbrew/lib/libgit2.so",
  "/usr/lib/x86_64-linux-gnu/libgit2.so",
  "libgit2.so.1.9",
  "libgit2.so.1.8",
  "libgit2.so.1.7",
  "libgit2.so.1.6",
  "libgit2.so.1.5",
  "libgit2.so.1",
  "libgit2.so",
  "libgit2.dylib",
  "libgit2.openbsd.so",
].filter(Boolean) as string[];

const GIT_ITEROVER = -31;

// libgit2 renamed its `*_init_options` helpers to `*_options_init` in 1.0;
// try the modern spelling first and fall back for pre-1.0 libraries.
const STATUS_OPTIONS_INIT_NAMES = [
  "git_status_options_init",
  "git_status_init_options",
] as const;

const GIT_STATUS_OPTIONS_VERSION = 1;
// GIT_STATUS_OPT_INCLUDE_UNTRACKED (bit 0) plus
// GIT_STATUS_OPT_RECURSE_UNTRACKED_DIRS (bit 4), spelled as the combined
// literal because the lint config bans bitwise operators.
const GIT_STATUS_OPT_UNTRACKED_FLAGS = 0x00_11;
// `git_status_options` starts { unsigned int version; git_status_show_t show;
// unsigned int flags; ... }, so `flags` sits at byte 8 on LP64 little-endian.
const STATUS_FLAGS_OFFSET = 8;
// The real struct is well under 64 bytes; over-allocating costs nothing and
// tolerates fields added by future libgit2 releases.
const STATUS_OPTIONS_SIZE = 256;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let buildSignatures: (statusOptionsInitName: string) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let statusOptionsInit: any;

const loadLib = (explicitPath?: string | null) => {
  const errors: string[] = [];
  const candidates = [explicitPath, ...LIB_CANDIDATES].filter(
    Boolean
  ) as string[];
  for (const candidate of candidates) {
    for (const initName of STATUS_OPTIONS_INIT_NAMES) {
      try {
        return {
          initName,
          lib: bunFfi.dlopen(candidate, buildSignatures(initName)),
        };
      } catch (error) {
        errors.push(`${candidate} (${initName}): ${(error as Error).message}`);
      }
    }
  }
  throw new Error(
    `Could not load libgit2 (tried ${candidates.length} locations). Last error: ${errors.at(-1)}`
  );
};

const cstr = (s: string) => Buffer.from(`${s}\0`, "utf-8");

const ok = (rc: number, what: string) => {
  if (rc < 0) {
    throw new Error(`libgit2 ${what} failed: rc=${rc}`);
  }
};

const outPtr = () => new BigUint64Array(1);

// Passing NULL to git_status_list_new does not mean "defaults" - libgit2 fills
// in INCLUDE_IGNORED too, so it reports ignored paths that `git status
// --porcelain=v1` never prints. Initialize the struct explicitly and ask for
// exactly what the git CLI collects: tracked changes plus untracked files.
const statusOptions = () => {
  const buf = Buffer.alloc(STATUS_OPTIONS_SIZE);
  ok(
    statusOptionsInit(buf, GIT_STATUS_OPTIONS_VERSION),
    "git_status_options_init"
  );
  const version = buf.readUInt32LE(0);
  if (version !== GIT_STATUS_OPTIONS_VERSION) {
    throw new Error(
      `git_status_options version readback was ${version}, expected ${GIT_STATUS_OPTIONS_VERSION}: struct layout mismatch`
    );
  }
  buf.writeUInt32LE(GIT_STATUS_OPT_UNTRACKED_FLAGS, STATUS_FLAGS_OFFSET);
  return buf;
};

export const libgit2FfiRunner: Runner = {
  id: "libgit2-ffi",
  label: "bun:ffi + libgit2",
  run(op: OperationId, ctx: RunnerContext): Promise<unknown> {
    const result = (() => {
      switch (op) {
        case "current-branch": {
          const refOut = outPtr();
          ok(
            symbols.git_repository_head(refOut, repoPtr),
            "git_repository_head"
          );
          const ref = rd(refOut);
          const name = String(symbols.git_reference_shorthand(ref));
          symbols.git_reference_free(ref);
          return name;
        }

        case "status": {
          const listOut = outPtr();
          ok(
            symbols.git_status_list_new(listOut, repoPtr, statusOptions()),
            "git_status_list_new"
          );
          const list = rd(listOut);
          const count = Number(symbols.git_status_list_entrycount(list));
          symbols.git_status_list_free(list);
          return count;
        }

        case "log-100": {
          const walkOut = outPtr();
          ok(symbols.git_revwalk_new(walkOut, repoPtr), "git_revwalk_new");
          const walk = rd(walkOut);
          ok(symbols.git_revwalk_push_head(walk), "git_revwalk_push_head");
          const oid = Buffer.alloc(20);
          let count = 0;
          for (let i = 0; i < 100; i += 1) {
            const rc = symbols.git_revwalk_next(oid, walk);
            if (rc === GIT_ITEROVER) {
              break;
            }
            if (rc < 0) {
              symbols.git_revwalk_free(walk);
              throw new Error(`git_revwalk_next failed: rc=${rc}`);
            }
            count += 1;
          }
          symbols.git_revwalk_free(walk);
          return count;
        }

        case "tracked-files": {
          const idxOut = outPtr();
          ok(
            symbols.git_repository_index(idxOut, repoPtr),
            "git_repository_index"
          );
          const idx = rd(idxOut);
          const count = Number(symbols.git_index_entrycount(idx));
          // Touch every entry so we're comparing enumeration cost, not just count.
          for (let i = 0; i < count; i += 1) {
            symbols.git_index_get_byindex(idx, BigInt(i));
          }
          symbols.git_index_free(idx);
          return count;
        }

        case "changed-files": {
          const headOut = outPtr();
          const parentOut = outPtr();
          ok(
            symbols.git_revparse_single(headOut, repoPtr, cstr("HEAD")),
            "revparse HEAD"
          );
          ok(
            symbols.git_revparse_single(parentOut, repoPtr, cstr("HEAD~1")),
            "revparse HEAD~1"
          );
          const headObj = rd(headOut);
          const parentObj = rd(parentOut);

          const treeAOut = outPtr();
          const treeBOut = outPtr();
          ok(
            symbols.git_commit_tree(treeAOut, parentObj),
            "git_commit_tree parent"
          );
          ok(
            symbols.git_commit_tree(treeBOut, headObj),
            "git_commit_tree head"
          );
          const treeA = rd(treeAOut);
          const treeB = rd(treeBOut);

          const diffOut = outPtr();
          ok(
            symbols.git_diff_tree_to_tree(diffOut, repoPtr, treeA, treeB, null),
            "git_diff_tree_to_tree"
          );
          const diff = rd(diffOut);
          const numDeltas = Number(symbols.git_diff_num_deltas(diff));

          symbols.git_diff_free(diff);
          symbols.git_tree_free(treeA);
          symbols.git_tree_free(treeB);
          symbols.git_object_free(headObj);
          symbols.git_object_free(parentObj);
          return numDeltas;
        }

        case "read-25-blobs": {
          const sizes: number[] = [];
          for (const p of ctx.blobPaths) {
            const objOut = outPtr();
            ok(
              symbols.git_revparse_single(objOut, repoPtr, cstr(`HEAD:${p}`)),
              `revparse HEAD:${p}`
            );
            const obj = rd(objOut);
            sizes.push(Number(symbols.git_blob_rawsize(obj)));
            symbols.git_object_free(obj);
          }
          return sizes;
        }
        default: {
          const _exhaustive: never = op;
          throw new Error(`Unhandled operation: ${_exhaustive}`);
        }
      }
    })();
    return Promise.resolve(result);
  },
  async setup(ctx: RunnerContext) {
    bunFfi = await import("bun:ffi");
    const { FFIType } = bunFfi;
    buildSignatures = (statusOptionsInitName: string) => ({
      [statusOptionsInitName]: {
        args: [FFIType.ptr, FFIType.u32],
        returns: FFIType.i32,
      },
      git_blob_rawcontent: { args: [FFIType.ptr], returns: FFIType.ptr },
      git_blob_rawsize: { args: [FFIType.ptr], returns: FFIType.u64 },
      git_commit_tree: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.i32,
      },
      git_diff_free: { args: [FFIType.ptr], returns: FFIType.void },
      git_diff_num_deltas: { args: [FFIType.ptr], returns: FFIType.u64 },
      git_diff_tree_to_tree: {
        args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr],
        returns: FFIType.i32,
      },
      git_index_entrycount: { args: [FFIType.ptr], returns: FFIType.u64 },
      git_index_free: { args: [FFIType.ptr], returns: FFIType.void },
      git_index_get_byindex: {
        args: [FFIType.ptr, FFIType.u64],
        returns: FFIType.ptr,
      },
      git_libgit2_init: { args: [], returns: FFIType.i32 },
      git_libgit2_shutdown: { args: [], returns: FFIType.i32 },
      git_object_free: { args: [FFIType.ptr], returns: FFIType.void },
      git_reference_free: { args: [FFIType.ptr], returns: FFIType.void },
      git_reference_shorthand: {
        args: [FFIType.ptr],
        returns: FFIType.cstring,
      },
      git_repository_free: { args: [FFIType.ptr], returns: FFIType.void },
      git_repository_head: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.i32,
      },
      git_repository_index: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.i32,
      },
      git_repository_open: {
        args: [FFIType.ptr, FFIType.cstring],
        returns: FFIType.i32,
      },
      git_revparse_single: {
        args: [FFIType.ptr, FFIType.ptr, FFIType.cstring],
        returns: FFIType.i32,
      },
      git_revwalk_free: { args: [FFIType.ptr], returns: FFIType.void },
      git_revwalk_new: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.i32,
      },
      git_revwalk_next: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.i32,
      },
      git_revwalk_push_head: { args: [FFIType.ptr], returns: FFIType.i32 },
      git_status_list_entrycount: {
        args: [FFIType.ptr],
        returns: FFIType.u64,
      },
      git_status_list_free: { args: [FFIType.ptr], returns: FFIType.void },
      git_status_list_new: {
        args: [FFIType.ptr, FFIType.ptr, FFIType.ptr],
        returns: FFIType.i32,
      },
      git_tree_free: { args: [FFIType.ptr], returns: FFIType.void },
    });

    const loaded = loadLib(ctx.libgit2Path);
    ({ lib } = loaded);
    ({ symbols } = lib);
    statusOptionsInit = symbols[loaded.initName];

    // git_libgit2_init returns the number of init calls (>=1 on success).
    const initRc = symbols.git_libgit2_init();
    if (initRc < 0) {
      throw new Error(`git_libgit2_init failed: rc=${initRc}`);
    }

    const repoOut = outPtr();
    ok(
      symbols.git_repository_open(repoOut, cstr(ctx.repoDir)),
      "git_repository_open"
    );
    repoPtr = rd(repoOut);
  },
  teardown(): Promise<void> {
    if (repoPtr) {
      symbols.git_repository_free(repoPtr);
      repoPtr = 0;
    }
    symbols.git_libgit2_shutdown();
    return Promise.resolve();
  },
};
