export type PronunciationSource='mnemonic'|'spoken';
const sounds:Record<string,string>={橫:'ㄏㄥˊ',豎:'ㄕㄨˋ',撇:'ㄆㄧㄝˇ',點:'ㄉㄧㄢˇ',捺:'ㄋㄚˋ',挑:'ㄊㄧㄠˇ',提:'ㄊㄧˊ',折:'ㄓㄜˊ',鉤:'ㄍㄡ',鈎:'ㄍㄡ',彎:'ㄨㄢ',曲:'ㄑㄩ',左:'ㄗㄨㄛˇ',右:'ㄧㄡˋ',上:'ㄕㄤˋ',下:'ㄒㄧㄚˋ',斜:'ㄒㄧㄝˊ',平:'ㄆㄧㄥˊ',微:'ㄨㄟˊ',臥:'ㄨㄛˋ',心:'ㄒㄧㄣ',戈:'ㄍㄜ',再:'ㄗㄞˋ',向:'ㄒㄧㄤˋ',長:'ㄔㄤˊ',頓:'ㄉㄨㄣˋ'};
/** Only the known stroke vocabulary is transcribed; arbitrary custom text requires manual review. */
export function strokeTextToZhuyin(text:string):string|null {
 const output:string[]=[];
 for(const char of text.trim()){
  if(/\s/u.test(char))continue;
  if(/[，、,。；;]/u.test(char)){output.push('，');continue;}
  if(!sounds[char])return null;
  output.push(sounds[char]);
 }
 return output.join(' ').replace(/ ， /g,'，').replace(/ ，$/,'，');
}
export function strokeAuditionText(row:{zhuyin?:string;mnemonic?:string;spoken:string;pronunciationSource?:PronunciationSource}){
 return row.pronunciationSource==='spoken'?row.spoken.trim():row.mnemonic?.trim()||row.spoken.trim();
}
