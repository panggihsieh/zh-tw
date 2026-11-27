export interface SentenceItemFeedback { reason:string; suggestion:string; quote:string }
export function itemFeedbackInstruction(items:{key:string}[]):string;
export function validateItemFeedback(items:{key:string}[],value:unknown,sentence:string,options?:{required?:boolean}):Record<string,SentenceItemFeedback>;
