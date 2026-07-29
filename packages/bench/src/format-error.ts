const MAX_SUMMARY_LENGTH = 120;
const ISOMORPHIC_GIT_MARKER = "with this error message:";

export interface FormattedBenchError {
  readonly summary: string;
  readonly detail: string | null;
}

export const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const escapeRegExp = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const normalizeRepoPath = (repoPath: string): string =>
  repoPath.replaceAll("\\", "/").replace(/^\.\//u, "");

const truncate = (text: string): string =>
  text.length > MAX_SUMMARY_LENGTH
    ? `${text.slice(0, MAX_SUMMARY_LENGTH - 1).trim()}…`
    : text;

const normalizeRawError = (raw: string): string => {
  const markerIndex = raw.toLowerCase().indexOf(ISOMORPHIC_GIT_MARKER);
  const text =
    markerIndex === -1
      ? raw
      : raw.slice(markerIndex + ISOMORPHIC_GIT_MARKER.length);

  return text.replaceAll(/\n{2,}/gu, "\n").trim();
};

const repoPathPatterns = (repoPath: string) => {
  const normalized = normalizeRepoPath(repoPath);

  return { escaped: escapeRegExp(normalized), normalized };
};

export const sanitizeBenchError = (raw: string, repoPath: string): string => {
  const safeRaw = typeof raw === "string" ? raw : String(raw);
  const { escaped, normalized } = repoPathPatterns(repoPath);
  const unixPattern = new RegExp(
    `(?<![\\w])/(?:[^/\\s]+/)*?${escaped}(?=/|$)`,
    "gu"
  );
  const windowsPattern = new RegExp(
    `(?<![\\w])[A-Za-z]:\\\\(?:[^\\\\\\s]+\\\\)*?${escaped.replaceAll("/", "\\\\")}(?=\\\\|$)`,
    "gu"
  );

  return normalizeRawError(safeRaw)
    .replace(unixPattern, normalized)
    .replace(windowsPattern, normalized)
    .replaceAll(/\s+/gu, " ")
    .trim();
};

const buildSummary = (detail: string, repoPath: string): string => {
  const { escaped } = repoPathPatterns(repoPath);
  const atPathPattern = new RegExp(
    `\\s+at\\s+(?:/(?:[^/\\s]+/)*?${escaped}|${escaped})[\\w./-]*(?=\\.\\s|$)`,
    "giu"
  );

  const summary = detail
    .replace(atPathPattern, "")
    .replaceAll(/\s+/gu, " ")
    .trim();
  const sentences = summary.split(/(?<=[.!?])\s+/u).filter(Boolean);

  if (sentences.length === 0) {
    return truncate(detail);
  }

  let text = sentences[0] ?? summary;
  if (text.length < 80 && sentences[1]) {
    text = `${text} ${sentences[1]}`;
  }

  return truncate(text);
};

export const formatBenchError = (
  raw: string,
  repoPath: string
): FormattedBenchError => {
  const detail = sanitizeBenchError(raw, repoPath);
  const summary = buildSummary(detail, repoPath);

  return {
    detail: detail === summary ? null : detail,
    summary,
  };
};
