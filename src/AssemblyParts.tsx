import type { CSSProperties } from "react";
import type { Card } from "./model";
export default function AssemblyParts({
  card,
  regions,
  playing,
  speed,
  reduced,
}: {
  card: Card;
  regions: number[][];
  playing: boolean;
  speed: number;
  reduced: boolean;
}) {
  const colors = ["#315f50", "#b66b42", "#5a8092"];
  const animation = {
    animationDuration: `${6 / speed}s`,
    animationPlayState: playing ? "running" : "paused",
  } as CSSProperties;
  if (reduced)
    return (
      <text x="150" y="242" textAnchor="middle" fontSize="262" fill={colors[0]}>
        {card.character}
      </text>
    );
  return (
    <>
      {card.master.components.map((part, i) => {
        const region = regions[i];
        if (!region) return null;
        const vertical = card.master.layout === "vertical";
        const shift =
          (i - (card.master.components.length - 1) / 2) *
          (card.master.components.length === 3 ? 42 : 64);
        return (
          <g
            className="assembly-part"
            key={i}
            style={
              {
                ...animation,
                "--part-x": `${vertical ? 0 : shift}px`,
                "--part-y": `${vertical ? shift : 0}px`,
              } as CSSProperties
            }
          >
            <svg
              x={region[0] + 3}
              y={region[1] + 3}
              width={region[2] - 6}
              height={region[3] - 6}
              viewBox="0 0 300 300"
              preserveAspectRatio="none"
              overflow="visible"
            >
              <text
                x="150"
                y="242"
                textAnchor="middle"
                fontSize="262"
                fill={colors[i]}
              >
                {part}
              </text>
            </svg>
          </g>
        );
      })}
      <g className="assembly-complete" style={animation}>
        <text
          x="150"
          y="242"
          textAnchor="middle"
          fontSize="262"
          fill={colors[0]}
        >
          {card.character}
        </text>
      </g>
    </>
  );
}
