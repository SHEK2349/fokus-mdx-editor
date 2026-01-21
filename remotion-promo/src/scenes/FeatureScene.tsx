import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface FeatureSceneProps {
  icon: string;
  title: string;
  description: string;
}

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  icon,
  title,
  description,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconOpacity = interpolate(frame, [0, 0.3 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const iconScale = interpolate(frame, [0, 0.5 * fps], [0.5, 1], {
    extrapolateRight: "clamp",
  });

  const textOpacity = interpolate(frame, [0.3 * fps, 0.8 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const textTranslateY = interpolate(frame, [0.3 * fps, 0.8 * fps], [20, 0], {
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
          textAlign: "center",
          maxWidth: 1000,
        }}
      >
        <div
          style={{
            fontSize: 180,
            marginBottom: 40,
            opacity: iconOpacity,
            transform: `scale(${iconScale})`,
          }}
        >
          {icon}
        </div>
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textTranslateY}px)`,
          }}
        >
          <h2
            style={{
              fontSize: 72,
              fontWeight: "bold",
              color: "#ffffff",
              margin: 0,
              marginBottom: 20,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: 36,
              color: "#d4d4d4",
              margin: 0,
              lineHeight: 1.5,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {description}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
