import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const SubtitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame, [0, 1 * fps], [30, 0], {
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
          transform: `translateY(${translateY}px)`,
          textAlign: "center",
          maxWidth: 900,
        }}
      >
        <p
          style={{
            fontSize: 48,
            color: "#d4d4d4",
            margin: 0,
            lineHeight: 1.5,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Astroブログのための
          <br />
          ミニマルなMDXエディタ
        </p>
      </div>
    </AbsoluteFill>
  );
};
