export const STROKE_CATALOG = [
 ['基本筆畫','橫','㇐','橫','一、三'],
 ['基本筆畫','豎','㇑','豎','丨、十'],
 ['基本筆畫','撇','㇒','撇','丿、人'],
 ['基本筆畫','點','㇔','點','丶、六'],
 ['基本筆畫','捺','㇏','捺','人、大'],
 ['基本筆畫','挑／提','㇀','挑','冫、打'],
 ['基本筆畫','豎鉤','㇚','豎，左鉤','亅、小'],
 ['基本筆畫','斜鉤／戈鉤','㇂','斜彎，鉤','戈、我'],
 ['向左轉折','橫撇','㇇','橫，撇','又、水、夕'],
 ['向左轉折','橫撇彎鉤','㇌','橫，撇，彎，左鉤','隊、陽、那'],
 ['向左轉折','橫折折撇','㇋','橫，撇，折，撇','建、及、延'],
 ['向左轉折','豎撇','㇒','豎，撇','月、用、幾'],
 ['向右轉折','豎折','㇗','豎，折','山、區、醫'],
 ['向右轉折','豎挑／豎提','㇙','豎，挑','長、民、衣'],
 ['向右轉折','豎彎','㇄','豎，彎','四、西、酒'],
 ['向右轉折','豎彎鉤','㇟','豎，彎，鉤','也、七、兒'],
 ['向右轉折','豎折折鉤','㇉','豎，折，下折，左鉤','馬、鳥、與'],
 ['向右轉折','豎折撇','㇞','豎，折，撇','專、傳、鼎'],
 ['向右轉折','撇折','㇜','撇，折','公、去、私'],
 ['向右轉折','撇點','㇛','撇，點','女、巡、災'],
 ['向右轉折','橫折彎','㇍','橫，折，彎','沒、沿、船'],
 ['向右轉折','橫折彎鉤','㇈','橫，折，彎，鉤','九、幾、凡'],
 ['向右轉折','橫折折折鉤','㇎','橫，撇，折，下折，左鉤','乃、奶、仍'],
 ['向下與鉤類','橫折','㇕','橫，折','口、日、田'],
 ['向下與鉤類','橫鉤','㇖','橫，向左下鉤','買、字、寶'],
 ['向下與鉤類','橫折鉤','㇆','橫，折，左鉤','月、刀、力'],
 ['向下與鉤類','橫折提','㇊','橫，折，挑','計、說、話'],
 ['向下與鉤類','橫斜鉤','⺄','橫，向右下斜彎，鉤','風、飛、氣'],
 ['向下與鉤類','橫折折','㇅','橫，折，右折','凹'],
 ['向下與鉤類','豎折折','㇞','豎，折，下折','凸、亞、鼎'],
 ['向下與鉤類','彎鉤','㇁','向下微彎，左鉤','手、狗、家'],
 ['向下與鉤類','臥鉤／心鉤','㇃','向右下平彎，左鉤','心、思、必'],
].map(([group,name,symbol,spoken,examples])=>({group,name,symbol,spoken,examples}));

// 依使用者核對圖補充後台既有名稱；不以共用 Unicode 符號推定別名。
const LEGACY_STROKE_PRESETS:Record<string,{name:string;spoken:string}> = {
 '橫曲鉤':{name:'橫曲鉤',spoken:'橫，折，彎，鉤'},
 '豎曲鉤':{name:'豎曲鉤',spoken:'豎，彎，鉤'},
 '撇橫':{name:'撇橫',spoken:'撇，折'},
 '撇挑':{name:'撇挑',spoken:'撇，挑'},
 '撇頓點':{name:'撇頓點',spoken:'撇，點'},
 '橫折橫':{name:'橫折橫',spoken:'橫，折，右折'},
 '豎橫折':{name:'豎橫折',spoken:'豎，折，下折'},
 '豎橫折鉤':{name:'豎橫折鉤',spoken:'豎，折，下折，左鉤'},
 '橫撇橫折鉤':{name:'橫撇橫折鉤',spoken:'橫，撇，折，下折，左鉤'},
};
export function findStrokePreset(name:string) {
 return STROKE_CATALOG.find(item=>item.name===name || item.name.split('／').includes(name))??LEGACY_STROKE_PRESETS[name];
}

export function fillStrokeMnemonic<T extends {name:string;mnemonic?:string;confirmed:boolean}>(row:T):T {
 const preset=findStrokePreset(row.name);
 return !row.mnemonic?.trim()&&preset?{...row,mnemonic:preset.spoken,confirmed:false}:row;
}

export const MNEMONIC_REVISION='2026-11-18-final-1';
export function upgradeStrokeMnemonic<T extends {name:string;mnemonic?:string;mnemonicRevision?:string;confirmed:boolean}>(row:T):T & {mnemonicRevision?:string} {
 const preset=findStrokePreset(row.name);
 if(!preset||row.mnemonicRevision===MNEMONIC_REVISION)return row;
 return {...row,mnemonic:preset.spoken,mnemonicRevision:MNEMONIC_REVISION,confirmed:row.mnemonic===preset.spoken?row.confirmed:false};
}
export function strokeMnemonicReason(name:string):string {
 const preset=findStrokePreset(name);if(!preset)return '本項尚無定案口訣，請依實際筆形人工核對。';
 const text=preset.spoken,parts=['依運筆順序分段朗讀；逗號表示停頓。'];
 if(text.includes('折'))parts.push('橫後第一折預設向下，豎或撇後第一折預設向右，省略可推知的方向。');
 if(text.includes('右折')||text.includes('下折'))parts.push('連續轉折保留後續的「右折／下折」，避免方向混淆。');
 if(text.includes('彎'))parts.push('「彎」表示圓轉，與有轉角的「折」分開；保留斜彎、微彎、平彎的差異。');
 if(text.includes('挑'))parts.push('「挑」表示向右上斜出，與向右平折區分。');
 if(text.includes('左鉤'))parts.push('保留「左鉤」以明確指出收筆鉤向。');
 if(!text.includes('，'))parts.push('單一動作直接念筆畫名稱，不加方向贅詞。');
 return parts.join(' ');
}
