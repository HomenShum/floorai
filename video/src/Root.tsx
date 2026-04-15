import React from "react";
import { Composition } from "remotion";
import { FloorAIDemo } from "./FloorAIDemo";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="FloorAIDemo"
        component={FloorAIDemo}
        durationInFrames={1170}
        width={1920}
        height={1080}
        fps={30}
        defaultProps={{}}
      />
    </>
  );
};
