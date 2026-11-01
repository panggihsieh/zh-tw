import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Card } from "./model";
import { fitInk, relativeInkBox } from "./assemblyGeometry";
import { structureProfile } from "./structureProfiles";
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
  const root = useRef<SVGGElement>(null);
  const [transforms, setTransforms] = useState<(string | null)[]>([]);
  const profile = structureProfile(card.master);
  useLayoutEffect(() => {
    if (reduced) return;
    let active = true;
    const measure = () => {
      if (!active || !root.current) return;
      const context = document.createElement("canvas").getContext("2d");
      const ink = (text: SVGTextElement) => {
        if (!context) return text.getBBox();
        const font = getComputedStyle(text);
        context.font = `${font.fontStyle} ${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
        context.textAlign = "center";
        context.textBaseline = "alphabetic";
        const metrics = context.measureText(text.textContent || "");
        return {
          x: 150 - metrics.actualBoundingBoxLeft,
          y: 242 - metrics.actualBoundingBoxAscent,
          width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
          height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
        };
      };
      const base = root.current.querySelector<SVGTextElement>(".assembly-base");
      const full = base && ink(base);
      if (!full || !full.width || !full.height) return;
      const next = Array.from(root.current.querySelectorAll<SVGTextElement>(".assembly-source")).map((text, i) => {
        const r = regions[i];
        if (!r) return null;
        const target = profile?.assemblyBoxes?.[i]
          ? relativeInkBox(full, profile.assemblyBoxes[i])
          : { x: r[0] + 3, y: r[1] + 3, width: r[2] - 6, height: r[3] - 6 };
        return fitInk(profile?.assemblyBoxes?.[i] ? ink(text) : { x: 0, y: 0, width: 300, height: 300 }, target);
      });
      setTransforms(next);
    };
    measure();
    void document.fonts.ready.then(measure);
    document.fonts.addEventListener("loadingdone", measure);
    return () => { active = false; document.fonts.removeEventListener("loadingdone", measure); };
  }, [card.character, card.master, reduced, JSON.stringify(regions)]);
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
    <g ref={root}>
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
            <g transform={transforms[i] || undefined} opacity={transforms[i] ? 1 : 0}>
              <text
                className="assembly-source"
                x="150"
                y="242"
                textAnchor="middle"
                fontSize="262"
                fill={colors[i]}
              >
                {part}
              </text>
            </g>
          </g>
        );
      })}
      <g className="assembly-complete" style={animation}>
        <text
          className="assembly-base"
          x="150"
          y="242"
          textAnchor="middle"
          fontSize="262"
          fill={colors[0]}
        >
          {card.character}
        </text>
      </g>
    </g>
  );
}
