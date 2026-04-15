import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface ViewCardProps {
  title: string;
  description: string;
  delay: number;
  tag: string;
}

const ViewCard: React.FC<ViewCardProps> = ({ title, description, delay, tag }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100 },
    durationInFrames: 30,
  });

  const opacity = interpolate(cardSpring, [0, 1], [0, 1]);
  const translateY = interpolate(cardSpring, [0, 1], [60, 0]);
  const scale = interpolate(cardSpring, [0, 1], [0.9, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        backgroundColor: "#1e293b",
        borderRadius: 16,
        padding: "34px 30px",
        width: 380,
        border: "1px solid #334155",
      }}
    >
      <div
        style={{
          fontSize: 12,
          marginBottom: 14,
          textTransform: "uppercase",
          letterSpacing: "2px",
          color: "#7dd3fc",
          fontWeight: 700,
        }}
      >
        {tag}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#818cf8",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 19,
          color: "#94a3b8",
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </div>
  );
};

export const Solution: React.FC = () => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        <div
          style={{
            opacity: headerOpacity,
            fontSize: 24,
            fontWeight: 600,
            color: "#818cf8",
            textTransform: "uppercase",
            letterSpacing: "3px",
            marginBottom: 60,
          }}
        >
          Three Operator Surfaces, One Runtime
        </div>

        <div
          style={{
            display: "flex",
            gap: 34,
            justifyContent: "center",
          }}
        >
          <ViewCard
            tag="Store"
            title="Store Manager"
            description="Issue intake, evidence upload, grounded guidance, and action tracking."
            delay={20}
          />
          <ViewCard
            tag="Regional"
            title="Regional Manager"
            description="Cross-store triage, pattern watch, escalation review, and daily watch."
            delay={40}
          />
          <ViewCard
            tag="Shared"
            title="Group Chat + Rail"
            description="Centered collaboration channel plus operator rail for trace, sources, telemetry, and quality."
            delay={60}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
