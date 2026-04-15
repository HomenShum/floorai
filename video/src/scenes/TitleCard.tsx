import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title fade + scale in
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 40,
  });

  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleScale = interpolate(titleSpring, [0, 1], [0.8, 1]);

  // Subtitle fade in with delay
  const subtitleOpacity = interpolate(frame, [25, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitleY = interpolate(frame, [25, 50], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Accent line grows in
  const lineWidth = interpolate(frame, [40, 70], [0, 200], {
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
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          fontSize: 120,
          fontWeight: 800,
          color: "#ffffff",
          letterSpacing: "-2px",
        }}
      >
        Floor
        <span style={{ color: "#818cf8" }}>AI</span>
      </div>

      <div
        style={{
          width: lineWidth,
          height: 3,
          backgroundColor: "#818cf8",
          marginTop: 20,
          marginBottom: 20,
          borderRadius: 2,
        }}
      />

      <div
        style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          fontSize: 28,
          color: "#94a3b8",
          fontWeight: 400,
          letterSpacing: "3px",
          textTransform: "uppercase",
        }}
      >
        Retail Operations Command Layer
      </div>
    </AbsoluteFill>
  );
};
