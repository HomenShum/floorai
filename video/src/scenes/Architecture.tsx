import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface ArchBlockProps {
  label: string;
  delay: number;
  color: string;
}

const ArchBlock: React.FC<ArchBlockProps> = ({ label, delay, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const blockSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 120 },
    durationInFrames: 25,
  });

  const opacity = interpolate(blockSpring, [0, 1], [0, 1]);
  const scale = interpolate(blockSpring, [0, 1], [0.7, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        backgroundColor: color,
        borderRadius: 12,
        padding: "24px 32px",
        fontSize: 22,
        fontWeight: 600,
        color: "#ffffff",
        textAlign: "center" as const,
        minWidth: 200,
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </div>
  );
};

const Arrow: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scaleX = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `scaleX(${scaleX})`,
        display: "flex",
        alignItems: "center",
        gap: 0,
      }}
    >
      <div
        style={{
          width: 60,
          height: 3,
          backgroundColor: "#818cf8",
        }}
      />
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          borderLeft: "12px solid #818cf8",
        }}
      />
    </div>
  );
};

export const Architecture: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene fade in
  const sceneOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Header
  const headerOpacity = interpolate(frame, [5, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        opacity: sceneOpacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: headerOpacity,
            fontSize: 24,
            fontWeight: 600,
            color: "#818cf8",
            textTransform: "uppercase",
            letterSpacing: "3px",
            marginBottom: 80,
          }}
        >
          Agent + Evaluation Loop
        </div>

        {/* Pipeline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <ArchBlock label="Convex State + Events" delay={20} color="#6366f1" />
          <Arrow delay={35} />
          <ArchBlock label="Gemini 3.1 Pro" delay={45} color="#8b5cf6" />
          <Arrow delay={58} />
          <ArchBlock
            label="Tool Calls + Grounding"
            delay={68}
            color="#a855f7"
          />
          <Arrow delay={82} />
          <ArchBlock
            label="Answer Packets + Eval"
            delay={92}
            color="#818cf8"
          />
        </div>

        {/* Subtitle explanation */}
        <div
          style={{
            opacity: interpolate(frame, [110, 130], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            fontSize: 20,
            color: "#64748b",
            marginTop: 60,
            textAlign: "center" as const,
            maxWidth: 800,
            lineHeight: 1.6,
          }}
        >
          Streamed message events feed the operator rail, and the same live runtime is evaluated against golden references.
        </div>
      </div>
    </AbsoluteFill>
  );
};
