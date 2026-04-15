import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface MetricProps {
  value: string;
  label: string;
  delay: number;
}

const Metric: React.FC<MetricProps> = ({ value, label, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const metricSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
    durationInFrames: 30,
  });

  const opacity = interpolate(metricSpring, [0, 1], [0, 1]);
  const scale = interpolate(metricSpring, [0, 1], [0.5, 1]);
  const translateY = interpolate(metricSpring, [0, 1], [30, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        textAlign: "center" as const,
        minWidth: 280,
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: "#818cf8",
          marginBottom: 12,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 22,
          color: "#94a3b8",
          fontWeight: 500,
          textTransform: "uppercase" as const,
          letterSpacing: "2px",
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const Results: React.FC = () => {
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
            marginBottom: 80,
          }}
        >
          Quality Snapshot
        </div>

        <div
          style={{
            display: "flex",
            gap: 80,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Metric value="4.7/5" label="Live Judge Avg" delay={15} />

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 100,
              backgroundColor: "#334155",
              opacity: interpolate(frame, [30, 45], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          />

          <Metric value="100%" label="Reference Coverage" delay={30} />

          <div
            style={{
              width: 1,
              height: 100,
              backgroundColor: "#334155",
              opacity: interpolate(frame, [50, 65], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          />

          <Metric value="Durable" label="Streaming + Trace" delay={45} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
