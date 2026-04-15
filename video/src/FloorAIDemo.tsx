import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { TitleCard } from "./scenes/TitleCard";
import { ProblemStatement } from "./scenes/ProblemStatement";
import { Solution } from "./scenes/Solution";
import { Architecture } from "./scenes/Architecture";
import { Results } from "./scenes/Results";
import { CallToAction } from "./scenes/CallToAction";

// Scene durations at 30fps
const SCENE_1_DURATION = 150; // 5s - Title
const SCENE_2_DURATION = 240; // 8s - Problem
const SCENE_3_DURATION = 240; // 8s - Solution
const SCENE_4_DURATION = 240; // 8s - Architecture
const SCENE_5_DURATION = 150; // 5s - Results
const SCENE_6_DURATION = 150; // 5s - CTA

export const FloorAIDemo: React.FC = () => {
  let offset = 0;

  const scene1Start = offset;
  offset += SCENE_1_DURATION;

  const scene2Start = offset;
  offset += SCENE_2_DURATION;

  const scene3Start = offset;
  offset += SCENE_3_DURATION;

  const scene4Start = offset;
  offset += SCENE_4_DURATION;

  const scene5Start = offset;
  offset += SCENE_5_DURATION;

  const scene6Start = offset;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <Sequence from={scene1Start} durationInFrames={SCENE_1_DURATION}>
        <TitleCard />
      </Sequence>

      <Sequence from={scene2Start} durationInFrames={SCENE_2_DURATION}>
        <ProblemStatement />
      </Sequence>

      <Sequence from={scene3Start} durationInFrames={SCENE_3_DURATION}>
        <Solution />
      </Sequence>

      <Sequence from={scene4Start} durationInFrames={SCENE_4_DURATION}>
        <Architecture />
      </Sequence>

      <Sequence from={scene5Start} durationInFrames={SCENE_5_DURATION}>
        <Results />
      </Sequence>

      <Sequence from={scene6Start} durationInFrames={SCENE_6_DURATION}>
        <CallToAction />
      </Sequence>
    </AbsoluteFill>
  );
};
