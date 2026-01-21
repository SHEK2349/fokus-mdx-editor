import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [0, 0.8 * fps], [0.9, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: 64,
            fontWeight: "bold",
            color: "#ffffff",
            margin: 0,
            marginBottom: 30,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          今すぐダウンロード
        </h2>
        <p
          style={{
            fontSize: 36,
            color: "#d4d4d4",
            margin: 0,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          github.com/SHEK2349/fokus-mdx-editor
        </p>
      </div>
    </AbsoluteFill>
  );
};
