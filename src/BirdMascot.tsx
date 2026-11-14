import "./birdMascot.css";

export const owlImage = `${import.meta.env.BASE_URL}mascot/owl.png`;
export const owlAnimation = `${import.meta.env.BASE_URL}mascot/owl-peekaboo.gif`;
export function BirdMascotIcon() {
  return <picture className="bird-mascot-icon" aria-hidden="true">
    <source media="(prefers-reduced-motion: reduce)" srcSet={owlImage}/>
    <img src={owlAnimation} alt="" width={32} height={32}/>
  </picture>;
}
export default function BirdMascot() {
  return <div className="bird-mascot-guide">
    <img className="bird-mascot-character" src={owlImage} alt="小貓頭鷹" width={1536} height={1024} />
  </div>;
}
