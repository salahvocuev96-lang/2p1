import { CalculateMetadataFunction, Composition, useCurrentFrame, interpolate } from "remotion";

type Props = {};

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {};
};

export const MyComposition = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComponent}
      durationInFrames={150}
      fps={30}
      width={1280}
      height={720}
      calculateMetadata={calculateMetadata}
    />
  );
};

export const MyComponent: React.FC<Props> = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30, 120, 150], [0, 1, 1, 0]);
  const scale = interpolate(frame, [0, 30], [0.8, 1]);

  return (
    <div
      style={{
        flex: 1,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <h1
        style={{
          fontSize: 72,
          fontWeight: "bold",
          color: "white",
          margin: 0,
          textAlign: "center",
        }}
      >
        Remotion Works! 🎬
      </h1>
      <p
        style={{
          fontSize: 32,
          color: "rgba(255,255,255,0.8)",
          marginTop: 20,
        }}
      >
        Your first test video
      </p>
    </div>
  );
};
