import { AbsoluteFill, Sequence } from "remotion";
import { TitleScene } from "./scenes/TitleScene";
import { SubtitleScene } from "./scenes/SubtitleScene";
import { FeatureScene } from "./scenes/FeatureScene";
import { ScreenshotScene } from "./scenes/ScreenshotScene";
import { CTAScene } from "./scenes/CTAScene";

export const FokusPromo: React.FC = () => {
  const fps = 60;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1a1a1a",
      }}
    >
      {/* Title Scene: 0-3s */}
      <Sequence from={0} durationInFrames={3 * fps}>
        <TitleScene />
      </Sequence>

      {/* Subtitle Scene: 3-6s */}
      <Sequence from={3 * fps} durationInFrames={3 * fps}>
        <SubtitleScene />
      </Sequence>

      {/* Feature 1: MDX Support (6-10s) */}
      <Sequence from={6 * fps} durationInFrames={4 * fps}>
        <FeatureScene
          icon="✍️"
          title="MDX対応"
          description="書くことに集中するための、ミニマルで美しいMDXエディタ"
        />
      </Sequence>

      {/* Feature 2: Real-time Preview (10-14s) */}
      <Sequence from={10 * fps} durationInFrames={4 * fps}>
        <FeatureScene
          icon="👁️"
          title="リアルタイムプレビュー"
          description="書いた内容を即座にプレビュー"
        />
      </Sequence>

      {/* Feature 3: Git Integration (14-18s) */}
      <Sequence from={14 * fps} durationInFrames={4 * fps}>
        <FeatureScene
          icon="🔄"
          title="Git統合"
          description="コミット・プッシュがアプリ内で完結"
        />
      </Sequence>

      {/* Feature 4: Lightweight (18-22s) */}
      <Sequence from={18 * fps} durationInFrames={4 * fps}>
        <FeatureScene
          icon="⚡"
          title="軽量・高速"
          description="Rust + Tauriで構築、ネイティブ並みの高速動作"
        />
      </Sequence>

      {/* Screenshot Scene: 22-27s */}
      <Sequence from={22 * fps} durationInFrames={5 * fps}>
        <ScreenshotScene />
      </Sequence>

      {/* CTA Scene: 27-30s */}
      <Sequence from={27 * fps} durationInFrames={3 * fps}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
