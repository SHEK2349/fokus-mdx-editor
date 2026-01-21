import { Composition } from "remotion";
import { FokusPromo } from "./FokusPromo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FokusPromo"
        component={FokusPromo}
        durationInFrames={1800}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
