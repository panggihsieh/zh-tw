export interface Point { x:number; y:number }
export function length(points:Point[]):number;
export function sample(points:Point[],count?:number):Point[];
export function judgeStroke(input:Point[],reference:Point[]):boolean;
