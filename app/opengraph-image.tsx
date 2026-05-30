import { ImageResponse } from "next/og";

export const alt = "Git Bench";
export const size = { height: 630, width: 1200 };
export const contentType = "image/png";

const geistSemiBoldUrl =
  "https://fonts.gstatic.com/s/geist/v5/gyBhhwUxId8gMGYQMKR3pzfaWI_RQuQ4nQ.ttf";
const geistMonoRegularUrl =
  "https://fonts.gstatic.com/s/geistmono/v5/or3yQ6H-1_WfwkMZI_qYPLs1a-t7PU0AbeE9KJ5T.ttf";

const loadFonts = async () => {
  const [geistSans, geistMono] = await Promise.all([
    fetch(geistSemiBoldUrl).then((res) => res.arrayBuffer()),
    fetch(geistMonoRegularUrl).then((res) => res.arrayBuffer()),
  ]);

  return [
    {
      data: geistSans,
      name: "Geist",
      style: "normal" as const,
      weight: 600 as const,
    },
    {
      data: geistMono,
      name: "Geist Mono",
      style: "normal" as const,
      weight: 400 as const,
    },
  ];
};

// Lucide folder-git-2 icon
const FolderGit2Icon = () => (
  <svg
    fill="none"
    height="20"
    stroke="#ffffff"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18 19a5 5 0 0 1-5-5v8" />
    <path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5" />
    <circle cx="13" cy="12" r="2" />
    <circle cx="20" cy="19" r="2" />
  </svg>
);

const OpenGraphImage = async () => {
  const fonts = await loadFonts();

  return new ImageResponse(
    <div
      style={{
        background: "#171717",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Geist",
        height: "100%",
        padding: "80px",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: "12px",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#262626",
            border: "1px solid #404040",
            borderRadius: "10px",
            display: "flex",
            height: "40px",
            justifyContent: "center",
            width: "40px",
          }}
        >
          <FolderGit2Icon />
        </div>
        <span
          style={{
            fontSize: "28px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Git Bench
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          lineHeight: 1.15,
        }}
      >
        <span
          style={{
            fontSize: "68px",
            fontWeight: 600,
            letterSpacing: "-0.03em",
          }}
        >
          Four git clients. One real repo.
        </span>
        <span
          style={{
            fontSize: "68px",
            fontWeight: 600,
            letterSpacing: "-0.03em",
          }}
        >
          Median timings, published.
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#1f1f1f",
            border: "1px solid #525252",
            borderRadius: "16px",
            display: "flex",
            fontFamily: "Geist Mono",
            fontSize: "28px",
            gap: "12px",
            padding: "20px 32px",
          }}
        >
          <span style={{ color: "#a3a3a3" }}>$</span>
          <span>bun run bench</span>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts,
    }
  );
};

export default OpenGraphImage;
