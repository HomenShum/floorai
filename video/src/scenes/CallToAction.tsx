import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "Try it live" spring
  const liveSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15 },
    durationInFrames: 30,
  });

  const liveOpacity = interpolate(liveSpring, [0, 1], [0, 1]);
  const liveY = interpolate(liveSpring, [0, 1], [40, 0]);

  // GitHub spring
  const ghSpring = spring({
    frame: frame - 30,
    fps,
    config: { damping: 15 },
    durationInFrames: 30,
  });

  const ghOpacity = interpolate(ghSpring, [0, 1], [0, 1]);
  const ghY = interpolate(ghSpring, [0, 1], [40, 0]);

  // Bottom accent line
  const lineWidth = interpolate(frame, [50, 90], [0, 400], {
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
          gap: 40,
        }}
      >
        {/* Live URL */}
        <div
          style={{
            opacity: liveOpacity,
            transform: `translateY(${liveY}px)`,
            textAlign: "center" as const,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#64748b",
              fontWeight: 500,
              textTransform: "uppercase" as const,
              letterSpacing: "3px",
              marginBottom: 12,
            }}
          >
            Live Demo
          </div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: "#818cf8",
            }}
          >
            getfloorai.vercel.app
          </div>
        </div>

        {/* GitHub */}
        <div
          style={{
            opacity: ghOpacity,
            transform: `translateY(${ghY}px)`,
            textAlign: "center" as const,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#64748b",
              fontWeight: 500,
              textTransform: "uppercase" as const,
              letterSpacing: "3px",
              marginBottom: 12,
            }}
          >
            Repo + Collateral
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#e2e8f0",
              lineHeight: 1.4,
              textAlign: "center" as const,
            }}
          >
            README + slide deck + Remotion demo video
          </div>
        </div>

        {/* Accent line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            backgroundColor: "#818cf8",
            borderRadius: 2,
            marginTop: 20,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
