import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";

const lines = [
  "Store issues, staffing gaps, and escalations arrive continuously.",
  "Operators need one workspace, not a generic chatbot.",
  "Answers must be grounded, traceable, and ready to act on.",
];

export const ProblemStatement: React.FC = () => {
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

  const headerY = interpolate(frame, [5, 25], [30, 0], {
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
      <div style={{ maxWidth: 1400, padding: "0 80px" }}>
        {/* Header */}
        <div
          style={{
            opacity: headerOpacity,
            transform: `translateY(${headerY}px)`,
            fontSize: 24,
            fontWeight: 600,
            color: "#818cf8",
            textTransform: "uppercase",
            letterSpacing: "3px",
            marginBottom: 50,
          }}
        >
          The Workflow Problem
        </div>

        {/* Lines appearing one by one */}
        {lines.map((line, i) => {
          const lineStart = 30 + i * 40;
          const lineOpacity = interpolate(
            frame,
            [lineStart, lineStart + 25],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const lineX = interpolate(
            frame,
            [lineStart, lineStart + 25],
            [-40, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={i}
              style={{
                opacity: lineOpacity,
                transform: `translateX(${lineX}px)`,
                fontSize: 48,
                fontWeight: 600,
                color: "#e2e8f0",
                marginBottom: 30,
                lineHeight: 1.4,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
