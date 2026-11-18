import shuowen from "./shuowenClues.json";
import soundAudit from "./soundClueAudit.json";
import verified from "./verifiedSoundClues.json";
export type StructureClueKind = "shape" | "sound" | "meaning";

export interface StructureClue {
  title: string;
  explanation: string;
  componentIndexes: number[];
  sources?: { title: string; url: string }[];
}

export interface CharacterStructureClues {
  sound?: StructureClue;
  meaning?: StructureClue;
  synthesis?: string;
}

// 教學用線索須逐字策展；不能只看現代字形便自動推論字源。
const STRUCTURE_CLUES: Partial<Record<string, CharacterStructureClues>> = {
  耶: {"sound": {"title": "依漢典，邑提供聲音線索", "explanation": "漢典將耶分析為從耳、邑聲，右側阝是邑的偏旁變形，可在右格觀察這項聲音線索。聲符反映歷史讀音，不是把邑的國語音直接讀成耶；耳的古代構義仍待核對。", "componentIndexes": [], "sources": [{"title": "漢典（耶）：從耳、邑聲及用法", "url": "https://zdic.net/hant/%E8%80%B6"}]}, "meaning": {"title": "語氣詞用法可查，耳的構義仍待核對", "explanation": "耶可在文言句末表疑問，也有譯音及通爺等用法。字書對最初構義仍保留不詳，不能由疑問語氣便斷言左耳表示聽問題，也不把右阝當成左阝的山坡義。", "componentIndexes": [], "sources": [{"title": "漢典（耶）：從耳、邑聲及用法", "url": "https://zdic.net/hant/%E8%80%B6"}]}},
  軟: {"sound": {"title": "依漢典，欠提供聲音線索", "explanation": "漢典將今字軟分析為從車、欠聲，今字右側仍是欠，可觀察這項聲音線索。教育部另記媆、輭、軟的通行關係，須分開時期理解；不能把欠的今音直接讀成軟。", "componentIndexes": [], "sources": [{"title": "漢典（軟）：今字車、欠聲分析", "url": "https://zdic.net/hant/%E8%BB%9F"}, {"title": "教育部《異體字字典》軟 A04068", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=44335&la=0&powerMode=2"}]}, "meaning": {"title": "柔軟的字義已知，車的古義作用待核對", "explanation": "教育部列柔而不硬的意思，也記早期媆、輭到軟的用字關係。今字左車如何參與柔軟義，仍需更明確證據，不能編造柔軟車輪或軟坐墊為唯一字源，也不能把媆的女旁當成今軟裡已存在的部件。", "componentIndexes": [], "sources": [{"title": "漢典（軟）：今字車、欠聲分析", "url": "https://zdic.net/hant/%E8%BB%9F"}, {"title": "教育部《異體字字典》軟 A04068", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=44335&la=0&powerMode=2"}]}},
  迴: {"sound": {"title": "回與迴同音，古聲符依據仍待核對", "explanation": "教育部記迴讀ㄏㄨㄟˊ，右側寫回，可用同音作讀字聯繫；但該字條未明列回為最初造字的聲符，不能把今音相同當作已核實的古字源。也不能把形近迥字的冋聲分析搬到迴。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》迴 A04132", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?educode=A04132"}, {"title": "國家教育研究院《異形詞辨析手冊》第39頁，李淑萍：迴轉／回轉", "url": "https://teric.naer.edu.tw/wSite/PDFReader?fileName=1737701496821&format=pdf&xmlId=2067323"}]}, "meaning": {"title": "辵旁強化掉頭、掉轉的行動義", "explanation": "國家教育研究院《異形詞辨析手冊》指出，迴的辵旁強化掉頭、掉轉的行動義；今字左下辶就是辵的偏旁變形。右回本有旋轉等意思，但完整古聲義分工仍待核對，不把迥的遠義混進來。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》迴 A04132", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?educode=A04132"}, {"title": "國家教育研究院《異形詞辨析手冊》第39頁，李淑萍：迴轉／回轉", "url": "https://teric.naer.edu.tw/wSite/PDFReader?fileName=1737701496821&format=pdf&xmlId=2067323"}]}},
  量: {"sound": {"title": "古聲符有不同分析，今旦里不能硬套", "explanation": "字庫所錄《說文》記重省、曏省聲，早期字形研究另有不同解讀。今字分成旦、里，不是原樣曏或重，不能把日、旦或里的今音當成已核實的量字聲符。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（量）：不同構形解讀", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%87%8F"}]}, "meaning": {"title": "稱輕重等用法可查，構形初義未定", "explanation": "字庫明記量的構形初義未有定論，列裘錫圭的糧田說及于省吾、劉興隆的日下量度說；《說文》則以稱輕重解釋。這些說法須分別呈現，不把太陽底下量東西的故事宣稱為已證實的唯一字源。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（量）：不同構形解讀", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%87%8F"}]}},
  鬱: {"sound": {"title": "篆形𩰪省聲，今字位置仍待核對", "explanation": "字庫所錄《說文》記從林、𩰪省聲，早期甲金文另有林、勹、大的解讀。今字缶、冖、鬯、彡等部件經過增添及訛變，不能將其中一格任指為完整古聲符，也不把不同時期分析拼在一起。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（鬱）：篆形與早期字形分別解讀", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%AC%B1"}]}, "meaning": {"title": "草木叢生與鬱結的解讀須分開", "explanation": "《說文》以林參與木叢生的構義；字庫另引于省吾的林中人形受踏說，並明列為疑說。今字兩木之間有缶，不能整格都當林，也不能把受踏故事視為已證實的唯一字源；鬱結、茂盛及香酒相關用法須分別理解。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（鬱）：篆形與早期字形分別解讀", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%AC%B1"}]}},
  吔: {"sound": {"title": "也的古聲符作用仍待核對", "explanation": "今字左口、右也，教育部記吔讀輕聲˙ㄧㄝ，用來感嘆或驚訝；字條沒有指定也為聲符。不能用也的第三聲直接替代吔的讀音，也不能只因形近就宣稱造字聲符已獲證。", "componentIndexes": [], "sources": [{"title": "教育部《國語辭典簡編本》（吔）", "url": "https://dict.concised.moe.edu.tw/dictView.jsp?ID=40996"}]}, "meaning": {"title": "感嘆語氣可查，口旁是教學聯繫", "explanation": "教育部將吔解作表達感嘆、驚訝的嘆詞，口旁可幫助聯繫發聲的用法。這是字義與今字形的教學聯繫，尚未證明整個字的古代聲義分工；教材中這個字的來源頁也仍待核對，不自行改成別的字。", "componentIndexes": [], "sources": [{"title": "教育部《國語辭典簡編本》（吔）", "url": "https://dict.concised.moe.edu.tw/dictView.jsp?ID=40996"}]}},
  旁: {"sound": {"title": "依《說文》，方提供聲音線索", "explanation": "字庫所錄《說文》明記方聲，今字下方仍寫方，可在這一格觀察聲音線索。聲符反映歷史讀音，不是說國語方與旁完全同音；上部的古代構義仍未確定。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（旁），含《說文》方聲記載", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%97%81"}]}, "meaning": {"title": "旁邊等用法可查，造字本義未明", "explanation": "字庫記甲金文有方、凡等古形，但造字本義不明，後來又有合筆、訛變。今天旁邊、廣泛、另外的用法不能倒推成上部每一筆的造字意思，因此不編造上部是屋頂、人在方形旁邊的故事。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（旁），含《說文》方聲記載", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%97%81"}]}},
  皆: {"sound": {"title": "依字庫，比提供聲音線索", "explanation": "字庫記一類金文上部由从變為比，後來比用作皆的聲符；今字上方仍可辨認比。這是特定字形演變的解讀，與甲骨文另有几聲的分析須分開，不能用比的今音直接拼讀皆。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（皆）", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%9A%86"}]}, "meaning": {"title": "俱、都的用法可查，白的古義作用未明", "explanation": "字庫說一類金文從从、甘，後來上部改成比；更早字形另有不同解讀，構形初義未定。今天皆表示俱、都，今字下方雖像白，仍不能因此編成人人都說白話、白色或說話的造字故事。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（皆）", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%9A%86"}]}},
  癟: {"sound": {"title": "古聲符來源有假說，不能拆成自聲或侖聲", "explanation": "劉釗提出癟右部可能由扁的古形訛變，但同時保留它原是另一個獨立字形的可能。今字右側自侖須合看，不能把自或侖任一單獨當作已核實聲符，也不把可能從扁演變說成定論。", "componentIndexes": [], "sources": [{"title": "劉釗〈「癟」字源流考〉（2009，復旦大學出土文獻與古文字研究中心）", "url": "https://www.fdgwz.org.cn/Web/Show/783"}]}, "meaning": {"title": "病字旁與古字書用法，仍待完整構字核對", "explanation": "劉釗核對古字書中的疒旁及枯病、不能飛等舊訓，並討論後來字形變化。左疒可作疾病相關的教學提示，但右部起源仍有疑問；不能把自、侖各自編成乾癟、凹陷的造字原因。", "componentIndexes": [], "sources": [{"title": "劉釗〈「癟」字源流考〉（2009，復旦大學出土文獻與古文字研究中心）", "url": "https://www.fdgwz.org.cn/Web/Show/783"}]}},
  另: {"sound": {"title": "口、力的聲符分工尚待核對", "explanation": "教育部確認另上口、下力，並明記《說文》不錄，字條沒有指定口或力為聲符。不能憑力和另的讀音有部分相近，就把力當成已核實的聲符。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》另 A00492", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=5435&la=0"}]}, "meaning": {"title": "另是再、分別，不能套用別字的構形", "explanation": "教育部記另有再、分別等用法，並提醒它與別的左旁、拐的右旁寫法不同。今字口、力如何提示這個字義仍待核對，不把別字的分解骨肉分析移到另，也不編開口出力的字源故事。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》另 A00492", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=5435&la=0"}]}},
  斥: {"sound": {"title": "古屰聲不能直接圈成今字斤或點", "explanation": "教育部所錄古字從广、屰聲，後世通行改寫為斤加一點的斥。今字的斤與點不是原樣的屰，不能以斤的讀音拼讀斥，也不把任一筆當成已核實的古聲符。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》斥 A01752", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=19218&la=0"}]}, "meaning": {"title": "古字與屋相關，今斤形不等於斧頭義", "explanation": "《說文》古義作卻屋，古字有广部件；教育部另列開拓、排除、責罵等用法。今字雖寫斤加點，仍須核對古今字形關係，不能從斤像斧頭便編造用斧頭砍屋或責罵人的唯一字源。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》斥 A01752", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=19218&la=0"}]}},
  壽: {"sound": {"title": "字書有古聲符記載，今字位置未核實", "explanation": "教育部所錄《說文》記老的省形及一個古聲符。古聲符圖形與今字士、工、口、寸等筆畫的對應尚未可靠核對，這裡不任選一格作聲符來讀壽。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》壽 A00836", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?educode=A00836"}]}, "meaning": {"title": "老的省形參與長久義，今字不可硬拆", "explanation": "《說文》解壽為久，古字有老的省形，可聯繫長久、長壽的意思。教育部另說明今字上士、中工、下口寸的寫法，這是書寫規範，不等於這些今字部件各自都是造字義符；老省形的今字範圍仍待核對。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》壽 A00836", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?educode=A00836"}]}},
  睿: {"sound": {"title": "古字部件記載不等於已指定聲符", "explanation": "教育部記《說文》本作叡，從𣦼、目、谷省，睿是其古文寫法。這項字條沒有直接完成今字三格的聲符分析；不能任取八、目或上部的今音當成睿的讀音來源。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》睿 A02791", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=29939&q=1"}]}, "meaning": {"title": "深明、通達的字義已知，部件分工待核對", "explanation": "《說文》以深明、通解釋叡，今字睿也有明智、聰明的意思。雖然古字記有目及谷的省形，仍須核對它們與今字各筆如何共同構義，不能只因目像眼睛，就把其他部件都宣稱為已核實的聰明義符。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》睿 A02791", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=29939&q=1"}]}},
  市: {"sound": {"title": "古聲符是之的省形，今字對應待核對", "explanation": "教育部所錄《說文》記之省聲。今字寫上方點橫、下方巾，不能把亠的今音當成市的讀音，也不能在沒有字形依據時，把完整之字硬圈在其中一格。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》市 A01161", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=12715&powerMode=2&q=1"}]}, "meaning": {"title": "市場古義已見字書，不等於巾是布料義符", "explanation": "《說文》以買賣所到的地方解釋市，並提到市場圍垣及物相及的構字說法。今字下部雖寫巾，仍須核對古部件如何變成今字；不能因巾是布巾，就另編賣布形成市場的字源。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》市 A01161", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=12715&powerMode=2&q=1"}]}},
  敢: {"sound": {"title": "篆形記古聲，今字耳形不是完整古字", "explanation": "教育部所錄《說文》記古聲，並說左半近似耳的寫法來自隸變。今字左格丅耳不是原樣的古，不能把耳的今音當作敢的聲符，右側攵也不能借用攴部首字條的聲符分析。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》敢 A01733", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=18784&la=0"}]}, "meaning": {"title": "進取古義與古部件須分開核對", "explanation": "《說文》解敢為進取，教育部引段注以爪、殳等古形解釋冒而向前。這是篆形的解讀，不能僅因今字左部像耳，就說敢是聽到聲音後去做；右攵與整體古部件的筆畫對應仍須核對。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》敢 A01733", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=18784&la=0"}]}},
  童: {"sound": {"title": "金文東聲、篆文重省聲，不能直接標成里", "explanation": "字庫說部分金文增加東作聲符，《說文》則記重省聲。今字顯示立、里，與古字部件已有合寫及省變，不能把下方里直接讀作童，也不假稱畫面已有完整東或重。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（童）", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%AB%A5"}]}, "meaning": {"title": "古形有多說，不把孩童義倒套成立里故事", "explanation": "字庫列出辛或䇂、目及人形的不同分析，明記構形未有定論；古字有與刑罰、奴隸相關的解讀。今義孩童須配合詞語理解，不能說站立在田里就是童，也不能任指立、里是已核實的古義符。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（童）", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%AB%A5"}]}},
  與: {"sound": {"title": "舁、牙的古聲符說，今字位置尚待核對", "explanation": "字庫列金文舁、牙皆為聲符的解讀，另錄段注舁、与皆亦聲的分析。今字含合寫、省形，畫面尚不能可靠拆出這些完整部件；不以未核對的格子冒充已完成的聲符位置。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（與）", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%88%87"}]}, "meaning": {"title": "給與古義有不同構形解讀", "explanation": "字庫列兩人用雙手互相交付牙齒的解讀，另列四手並舉、由舁分化等不同說法。不能把不同時期、不同學者的分析拼成唯一故事；今字的各筆對應仍待核對，與字也可作和、同等用法。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（與）", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%88%87"}]}},
  煞: {"sound": {"title": "殺的俗字不等於已拆出聲符", "explanation": "字庫說煞是殺的異體俗字，但沒有交代今字上部與下方灬各自的聲符作用。不能從同殺就推成刍聲、攵聲，也不把整個殺字當成今字內已存在的獨立部件。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（煞）：殺的異體俗字與用法", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%85%9E"}]}, "meaning": {"title": "用法可查，灬不宜直接解作火燒", "explanation": "字庫記煞可表示殺害，也有結束、停止或程度深等用法。今字下方雖有灬形，仍未確認它在這個俗字中如何表意；不能把所有煞字詞義都編成用火殺害或火焰熄滅的故事。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（煞）：殺的異體俗字與用法", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%85%9E"}]}},
  笑: {"sound": {"title": "聲符分析仍有字書分歧", "explanation": "《說文》徐鉉注記錄竹、犬的舊寫法，段玉裁也討論後來改作夭的說法，但沒有可直接套在今字竹、夭兩格上的一致結論。這裡不把夭的今音或犬的讀音當成已證實的笑字聲符。", "componentIndexes": [], "sources": [{"title": "《說文解字》徐鉉注及段玉裁注（笑：保留構字疑問）", "url": "https://www.shuowen.org/view/2997"}]}, "meaning": {"title": "不能把竹隨風彎曲當作確定字源", "explanation": "徐鉉注轉述過竹受風彎曲如人笑的說法，同時表示尚不確定；段玉裁對竹、犬的構字義也保留疑問。因此字義可以理解為喜、發笑，但不以竹是樂器或竹子彎曲的故事宣稱已核實造字原因。", "componentIndexes": [], "sources": [{"title": "《說文解字》徐鉉注及段玉裁注（笑：保留構字疑問）", "url": "https://www.shuowen.org/view/2997"}]}},
  幻: {"sound": {"title": "幺或長弧筆的聲符作用仍待核對", "explanation": "字庫記金文從幺及長弧筆，沒有確認哪一部分提示讀音。不能用幺的今音直接讀幻，也不把《說文》的倒予解讀當成已證實的古聲符。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（幻）：構形初義與用法", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B9%BB"}, {"title": "漢典所錄《說文》及段玉裁注（倒予的傳統解釋）", "url": "https://zdic.net/hant/%E5%B9%BB"}]}, "meaning": {"title": "本義未明，倒予是受質疑的傳統解讀", "explanation": "字庫認為早期字形的本義不明，並指出小篆倒予的分析不確。雖然《說文》及段注曾以反予解釋相互詐惑，這裡只列為傳統說法，不據此編造左幺、右折鉤各自的字義。今天幻想、幻影的用法表示不真實或想像，須配合詞語理解。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（幻）：構形初義與用法", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B9%BB"}, {"title": "漢典所錄《說文》及段玉裁注（倒予的傳統解釋）", "url": "https://zdic.net/hant/%E5%B9%BB"}]}},
  耍: {"sound": {"title": "而、女未有已確認的聲符分工", "explanation": "字庫確認今字由上方而、下方女構成，但仍記構形初義不明，沒有指定其中哪個部件作聲符。不能只憑今字兩格就說而聲或女聲。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（耍）：構形初義與用法", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%80%8D"}]}, "meaning": {"title": "玩耍的字義不能倒推成女性故事", "explanation": "字庫記耍有玩、戲弄、施展等用法，但而、女在最初構字時的作用仍不明。這些現代用法不能證明女就是玩耍的義符，也不能把帶鬚者戲弄女子當作已核實的唯一字源。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（耍）：構形初義與用法", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%80%8D"}]}},
  奧: {"sound": {"title": "有爭議的古聲符，不能當成定論", "explanation": "教育部所錄《說文》以𢍏表聲，但同時保留徐鉉認為非聲、未詳的異議。今字上半為丿、冂內釆，下半為大；古聲符與這些今字部件的對應仍待核對，不把釆或大任指為已證實聲符。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》（奧）：說文釋形與字樣說明", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?educode=A00873&powerMode=2"}]}, "meaning": {"title": "古義是屋內深處，今字對應仍待核對", "explanation": "《說文》以宀參與構字，古義指室內西南角，後來泛指深處、精深。教育部的楷書字樣說明不等於已證實每個今字部件的古代作用，不能把下方大解作大房子或深奧的義符。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》（奧）：說文釋形與字樣說明", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?educode=A00873&powerMode=2"}]}},
  彙: {"sound": {"title": "古聲符是胃的省形，今字不能直接當果聲", "explanation": "教育部所錄《說文》記𦞅省聲，並說𦞅即胃。今字下方雖寫成果，還需核對古胃省形與今字筆畫的關係，不能把果的今音或水果義直接當作彙的聲音、意義來源。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》（彙）：說文釋形與字樣說明", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=13982&la=0"}]}, "meaning": {"title": "古字指刺蝟，㣇與今字的對應待核對", "explanation": "《說文》以㣇參與構字，解作像小豪豬的動物，即刺蝟；後來也有同類、聚集的用法。今字顯示彑、冖、果，不代表這三格都能各自當作獨立古義符，也不把果實聚在一起編作彙集的字源。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》（彙）：說文釋形與字樣說明", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=13982&la=0"}]}},
  牠: {"sound": {"title": "也的聲符依據仍待核對", "explanation": "教育部確認牠右半寫作也，但這項字樣說明沒有指定也為聲符。現代牠讀ㄊㄚ，不能把也的國語讀音直接當作牠的讀音，也不能把相同右旁當成已證實的字源。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》牠 A02491：字樣、讀音及釋義", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?educode=A02491"}]}, "meaning": {"title": "動物代詞的今義已見字書", "explanation": "教育部將牠解作指稱動物的第三人稱代詞，並確認左側寫牛旁，可用來聯繫動物的用法。這是今義與今字形的教學聯繫，不等於已證明古代造字只表示牛；字條另列ㄊㄨㄛˊ為㸰的異體，須與今天的動物代詞分開。", "componentIndexes": [], "sources": [{"title": "教育部《異體字字典》牠 A02491：字樣、讀音及釋義", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?educode=A02491"}]}},
  民: {"sound": {"title": "未有可獨立標示的聲符依據", "explanation": "字庫所引郭沫若解讀以早期目形及利器形說明構形，沒有指定其中哪一部分作聲符；今字歸入氏部，不代表氏就是民的聲符。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（民）", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%B0%91"}]}, "meaning": {"title": "古字形的一種解讀：目形與利器形", "explanation": "香港中文大學字庫引郭沫若說，將早期字形解作利器刺眼，與古代奴隸的身分標記有關，後來泛指百姓、人民。這是具名的字源解讀；今字已連筆變形，不能直接把現代每筆圈成目或利器，也不把氏部解作氏族的造字義。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（民）", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%B0%91"}]}},
  由: {"sound": {"title": "丨表聲只是一種待考解讀", "explanation": "字庫列陳劍一說：早期由從口、丨聲，丨或為針的初文，依據是古音關係。來源明記此說尚可備考，不能用今天丨的名稱拼讀由，也不能據此宣稱聲符已無爭議。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（由）", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%94%B1"}]}, "meaning": {"title": "初義未定，不以田部倒推字義", "explanation": "字庫說早期字形在口形上加豎筆或圓形，但本義未有定論，口形在構字中的字義作用仍待核對。今天由常表示原因，或作介詞相當於從；歸入田部不表示原義一定是田地，也不能把早期頭盔說當成已證實結論。", "componentIndexes": [], "sources": [{"title": "香港中文大學漢語多功能字庫（由）", "url": "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%94%B1"}]}},
  闆: {
    sound: {
      title: "聲符依據仍待核對",
      explanation: "字庫將今字分為外側門、內側品，但未指定哪個部件表聲。不能把品或三個口當作已證實的聲符，也不能把老板的板字分析直接移到闆。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫（闆）", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%97%86" }],
    },
    meaning: {
      title: "古字義與老闆的今義須分開",
      explanation: "字庫引《玉篇》記門中視，即從門中窺看，並說古書未見此用法；外側門可幫助理解這項字書記載，但品在構字中的作用仍待核對。今天常用於老闆，指商舖企業的擁有人或僱主，不能另編門內三口就是老闆的故事。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫（闆）", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%97%86" }],
    },
  },
  粄: {"sound": {"title": "聲符的字書依據仍待核對", "explanation": "今字右側是反，但本次核對的教育部字條未明列它作聲符；不能只憑字形相似或同音，就說已證實造字時的聲符。", "componentIndexes": [], "sources": [{"title": "教育部異體字字典（粄）", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=66197&la=0"}]}, "meaning": {"title": "米製食品的字義已見字書", "explanation": "教育部引古字書解作屑米製成的餅，左側米形可作理解米食的教學提示。這是已核對的字義聯繫；本字《說文》不錄，尚不把這項聯繫等同已證明的完整造字分析。", "componentIndexes": [], "sources": [{"title": "教育部異體字字典（粄）", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=66197&la=0"}]}},
  粿: {"sound": {"title": "聲符的字書依據仍待核對", "explanation": "今字右側是果，但本次核對的教育部字條未明列它作聲符；不能只憑字形相似或同音，就說已證實造字時的聲符。", "componentIndexes": [], "sources": [{"title": "教育部異體字字典（粿）", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=66239&la=0"}]}, "meaning": {"title": "米製食品的字義已見字書", "explanation": "教育部引古字書解作用米製成的食品，左側米形可作理解米食的教學提示。這是已核對的字義聯繫；本字《說文》不錄，尚不把這項聯繫等同已證明的完整造字分析。", "componentIndexes": [], "sources": [{"title": "教育部異體字字典（粿）", "url": "https://dict.variants.moe.edu.tw/dictView.jsp?ID=66239&la=0"}]}},
  床: {
    sound: {
      title: "古字「牀」以爿表聲，今字已改寫",
      explanation: "教育部以牀為本字，篆形從木、爿聲；後世通行俗字床。今字外側寫成广，已不能直接圈出完整的爿，不把广的國語讀音當成床的讀音。",
      componentIndexes: [],
      sources: [{ title: "教育部異體字字典（牀為床本字）", url: "https://dict.variants.moe.edu.tw/dictView.jsp?educode=A01203-001" }],
    },
    meaning: {
      title: "木旁提示安身的木製坐臥器具",
      explanation: "古字牀從木，表示讓人安身坐臥的器具；今字內側仍是木。外側广與古爿的改寫關係，不能僅憑外形當成另一個已核實的聲符。",
      componentIndexes: [],
      sources: [{ title: "教育部異體字字典引說文", url: "https://dict.variants.moe.edu.tw/dictView.jsp?educode=A01203" }],
    },
  },
  匆: {
    sound: {
      title: "原字「悤」的囪兼表聲",
      explanation: "教育部引《說文》以囪兼表聲，原字有囪、心兩部分，後來通行怱、匆等寫法。今字分出的勿、丶不是古聲符的兩個獨立讀音，不能依這兩格直接拼讀。",
      componentIndexes: [],
      sources: [{ title: "教育部異體字字典（悤、怱、匆的寫法）", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=4472&la=0" }],
    },
    meaning: {
      title: "原字的心旁提示匆忙，今字已省去",
      explanation: "原字悤用心旁參與表意，表示急忙、急迫。通行匆字已不寫心旁，畫面不能把勿或丶標成心，也不另猜哪一筆代表心情。",
      componentIndexes: [],
      sources: [{ title: "教育部異體字字典引說文及今字說明", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=4472&la=0" }],
    },
  },
  蒐: {
    sound: {
      title: "一說「鬼」提示讀音",
      explanation: "桂馥、馬敘倫將下方的「鬼」解作聲符。張政烺則認為更早的字形以「畟」提示讀音。",
      componentIndexes: [1],
      sources: [{ title: "林清源〈釋「葛」及其相關諸字〉", url: "https://www.fdgwz.org.cn/Web/Show/563" }],
    },
    meaning: {
      title: "「艹」提示植物的原義",
      explanation: "《說文解字》用這個字記錄茜草一類可染紅色的植物。今天也常在「蒐集」中使用這個字。",
      componentIndexes: [0],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/searchShuowen.php?field=1%2C2%2C3%2C4%2C5%2C6%2C7&q=%E9%AC%BC" }],
    },
  },
  葬: {
    sound: {
      title: "部分古字以「爿」提示讀音",
      explanation: "裘錫圭將部分甲骨文中的「爿」解作承載死者的床。香港中文大學字庫也指出這個部件兼有聲符作用，現代楷書的分格中已無可獨立標示的「爿」。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%91%AC" }],
    },
    meaning: {
      title: "古字描畫埋葬",
      explanation: "有些甲骨文像把人或遺骨放入坑中。《說文解字》則把小篆解作以草木覆蓋死者。「葬」的本義是埋葬，現代字形中央的「死」保留了這層線索。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%91%AC" }],
    },
  },
  者: {
    sound: {
      title: "早期字形的聲符尚無定論",
      explanation: "金文可辨認出「木」、數點和「口」，這些部件的構字作用仍不明確。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%80%85" }],
    },
    meaning: {
      title: "金文已有指稱人或事的用法",
      explanation: "早期文獻已把「者」用在詞語後面，指符合前述條件的人或情況。古字怎麼構成這個意思，仍待考證。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%80%85" }],
    },
  },
  言: {
    sound: {
      title: "依甲金文的指事解讀，沒有獨立聲符",
      explanation: "于省吾以舌上加橫解釋這個字的早期字形。《說文解字》另以「䇂」為聲符。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%A8%80" }],
    },
    meaning: {
      title: "舌上的橫畫提示說話",
      explanation: "古字從「舌」，在上方加一道橫畫，提示話語從舌頭發出。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%A8%80" }],
    },
  },
  身: {
    sound: {
      title: "甲金文以人形和指事記號表意",
      explanation: "依香港中文大學字庫的甲金文解讀，古字用人形與腹部記號表意，沒有獨立聲符。《說文解字》另有聲符的記載。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%BA%AB" }],
    },
    meaning: {
      title: "凸出的腹部提示原義",
      explanation: "古字在人形的腹部畫出半圓，有時還加上表示肚臍的點，提示腹部，後來也指整個身體。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%BA%AB" }],
    },
  },
  食: {
    sound: {
      title: "依甲金文的會意解讀，沒有獨立聲符",
      explanation: "香港中文大學字庫採用「倒口就食器」的會意解讀。《說文解字》另記「亼」為聲符，兩者是不同的字源解釋。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%A3%9F" }],
    },
    meaning: {
      title: "古字描畫就著食器吃東西",
      explanation: "古字上部「亼」像倒置的口，下部「皀」像盛食物的器具，合起來提示進食。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%A3%9F" }],
    },
  },
  去: {
    sound: {
      title: "依張口的構形解讀，沒有獨立聲符",
      explanation: "裘錫圭將古字解作人張大嘴巴，兩個部件共同表意。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8E%BB" }],
    },
    meaning: {
      title: "古字的「大」和「口」共同表意",
      explanation: "依張口說，古字以「大」和「口」表示張開嘴巴，兩唇分開可能引申出離去的意思。現代字形的兩部分已變形。",
      componentIndexes: [0, 1],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8E%BB" }],
    },
  },
  員: {
    sound: {
      title: "上方的古圓形提示讀音",
      explanation: "古字上方的圓形是「圓」的早期寫法，也提示「員」的讀音。現代字形上方寫成口形。",
      componentIndexes: [0],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%93%A1" }],
    },
    meaning: {
      title: "古字以鼎口提示圓形",
      explanation: "古字以鼎口的圓形提示原義。畫面標出古鼎在現代字形中演變成「貝」的位置。",
      componentIndexes: [1],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%93%A1" }],
    },
  },
  句: {
    sound: {
      title: "古字的「丩」和「口」都提示讀音",
      explanation: "依香港中文大學字庫，古字的「丩」與「口」都兼有聲音作用。現代字形外側「勹」對應古字的「丩」。",
      componentIndexes: [0, 1],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8F%A5" }],
    },
    meaning: {
      title: "「丩」提示勾連的原義",
      explanation: "「丩」的古形像兩道曲線互相勾住。「句子」的意思可由詞語前後相連來理解。",
      componentIndexes: [0],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8F%A5" }],
    },
  },
  修: {
    sound: {
      title: "「攸」提供聲音線索",
      explanation: "《說文解字》以「攸」為聲符。現代字形中，「攸」分布在左側與右上方。示意圖將兩處並列，並一起標示。",
      componentIndexes: [],
      sources: [{ title: "教育部《異體字字典》「修」", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=1570" }],
    },
    meaning: {
      title: "右下方的「彡」提供意義線索",
      explanation: "《說文解字》以「彡」作形符，將「修」解作修飾。右下方的三撇就是「彡」。",
      componentIndexes: [],
      sources: [{ title: "教育部《異體字字典》「修」", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=1570" }],
    },
  },
  主: {
    sound: {
      title: "《說文》以「丶」兼作聲符",
      explanation: "《說文》把頂端的點解作燈火，並認為它也提示讀音。網站的部件圖把這一點併入上方的「亠」。",
      componentIndexes: [0],
      sources: [{ title: "香港中文大學漢語多功能字庫「主」", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%B8%BB" }],
    },
    meaning: {
      title: "燈火與神主牌位是兩種字源解讀",
      explanation: "《說文》將小篆解作燈中的火炷。唐蘭、陳夢家則認為甲骨文描畫祭祀用的神主牌位，並指出「主」和「示」源自同一早期字形。兩種說法著眼於不同時期的字形。",
      componentIndexes: [],
      sources: [{ title: "香港中文大學漢語多功能字庫「主」", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%B8%BB" }],
    },
  },
  陣: {
    sound: {
      title: "「陣」的讀音與「陳」有關",
      explanation: "戰陣的「陣」原寫作「陳」，古聲符是右側的「東」。現代楷書在同一位置寫「車」，標示的是古聲符原來所在的位置。",
      componentIndexes: [],
      sources: [{ title: "教育部《異體字字典》「陣」", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=48362" }],
    },
    meaning: {
      title: "古義是軍隊排列的隊形",
      explanation: "左側「阝」沿用舊形的「阜」。軍隊排成的隊形可從「陳列」理解。",
      componentIndexes: [],
      sources: [{ title: "教育部《異體字字典》「陣」", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=48362" }],
    },
  },
  熊: {
    sound: {
      title: "《說文》記載「炎」省聲",
      explanation: "依《說文》，下方四點對應「炎」省。徐灝另解為「能」提示讀音，下方的火提示火光，本來和火勢有關。",
      componentIndexes: [1],
      sources: [{ title: "香港中文大學漢語多功能字庫「熊」", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%86%8A" }],
    },
    meaning: {
      title: "《說文》從「能」解釋熊這種動物",
      explanation: "上方的「能」原可表示熊。《說文》用它提示動物的字義，徐灝則從「熊熊」的用法解釋火光的意義。",
      componentIndexes: [0],
      sources: [{ title: "香港中文大學漢語多功能字庫「熊」", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%86%8A" }],
    },
  },
  鼓: {
    sound: {
      title: "「鼓」的字形以會意說明",
      explanation: "《說文》在鼓部以手擊鼓解釋字形，另記籀文異體以「古」作聲符。攴部另有一筆同形條目，解作擊鼓，並以「壴」兼作聲符。",
      componentIndexes: [],
      sources: [
        { title: "香港中文大學《說文》資料「鼓」", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/searchShuowen.php?field=2&page=5&q=%E7%A6%AE" },
        { title: "《說文解字》攴部同形條目", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/2041.json" },
      ],
    },
    meaning: {
      title: "左側是鼓，右側是擊鼓的手",
      explanation: "「壴」表示立鼓，右側部件像手持鼓槌敲擊。",
      componentIndexes: [0, 1],
      sources: [
        { title: "香港中文大學《說文》資料「鼓」", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/searchShuowen.php?field=2&page=5&q=%E7%A6%AE" },
        { title: "《說文解字》攴部同形條目", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/2041.json" },
      ],
    },
  },
  舞: {
    sound: {
      title: "依《說文》，上方對應「無」聲",
      explanation: "《說文》以「無」為聲符。金文研究也指出，上方承自「無」的古形，早期「無」的字形本來就和跳舞有關。",
      componentIndexes: [0],
      sources: [{ title: "香港中文大學漢語多功能字庫「舞」", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%88%9E" }],
    },
    meaning: {
      title: "下方的「舛」提示舞步",
      explanation: "「舛」像交錯的雙腳，提示跳舞時的步伐。",
      componentIndexes: [1],
      sources: [{ title: "香港中文大學漢語多功能字庫「舞」", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%88%9E" }],
    },
  },
  蒜: {
    sound: {
      title: "依《說文》，「祘」提供聲音線索",
      explanation: "《說文解字》將下方的「祘」解作聲符。郭永秉依出土文字另提出，早期字形可能由兩個「柰」形組成，後來也有近似兩個「祟」的寫法，其中的部件也可能提示讀音。",
      componentIndexes: [1],
      sources: [
        { title: "教育部異體字字典・蒜", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=38529&la=0" },
        { title: "香港中文大學漢語多功能字庫・蒜", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%92%9C" },
      ],
    },
    meaning: {
      title: "依《說文》，「艹」提供意義線索",
      explanation: "《說文解字》把上方解作艸部，提示「蒜」是一種植物。",
      componentIndexes: [0],
      sources: [{ title: "教育部異體字字典・蒜", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=38529&la=0" }],
    },
  },
  感: {
    sound: {
      title: "「咸」提供聲音線索",
      explanation: "「咸」是聲符；古今讀音已經變化，所以現在不會完全同音。",
      componentIndexes: [0],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%84%9F" }],
    },
    meaning: {
      title: "「心」提供意義線索",
      explanation: "心部提示這個字和內心的感受、感覺有關。",
      componentIndexes: [1],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%84%9F" }],
    },
    synthesis:
      "把聲音線索和心部的意義線索合起來，幫助記住「感」和內心感受有關。",
  },
  謝: {
    sound: {
      title: "「射」提供聲音線索",
      explanation:
        "「身」和「寸」合成「射」，是聲符；古今讀音已有變化。",
      componentIndexes: [1, 2],
    },
    meaning: {
      title: "「言」提供意義線索",
      explanation: "言部提示「謝」和說話、用言語表達有關。",
      componentIndexes: [0],
    },
    synthesis: "言部提示用言語表達；搭配聲符「射」，組成「謝」。",
  },
  銀: {
    sound: {
      title: "「艮」提供聲音線索",
      explanation: "「艮」是聲符；古今讀音已經變化，現在讀音不完全相同。",
      componentIndexes: [1],
    },
    meaning: {
      title: "金字旁提供意義線索",
      explanation: "金字旁提示「銀」和金屬有關。",
      componentIndexes: [0],
    },
    synthesis: "金字旁提示金屬類別，「艮」提示聲音，合起來幫助認識「銀」。",
  },
  觀: {
    sound: {
      title: "「雚」提供聲音線索",
      explanation: "「雚」是聲符，提供讀音的線索。",
      componentIndexes: [0],
    },
    meaning: {
      title: "「見」提供意義線索",
      explanation: "見部提示「觀」和觀看、看見有關。",
      componentIndexes: [1],
    },
    synthesis: "見部提示觀看的意思，「雚」提示聲音，合起來認識「觀」。",
  },
  察: {
    sound: {
      title: "「祭」提供聲音線索",
      explanation: "「祭」是聲符；古今讀音已有變化，所以現在不完全同音。",
      componentIndexes: [1],
    },
    meaning: {
      title: "「宀」提供意義線索",
      explanation: "「宀」像屋頂，提示屋簷向下覆蓋的古義，後來引申為審察。",
      componentIndexes: [0],
    },
    synthesis: "「宀」和聲符「祭」共同構成「察」；字義需要配合語詞一起理解。",
  },
};

const SEMANTIC_CATEGORIES: Record<string, string> = {
  人: "人、身分或人的行為", 亻: "人、身分或人的行為",
  心: "內心、感受或思想", 忄: "內心、感受或思想",
  手: "手的動作或操作", 扌: "手的動作或操作",
  水: "水、液體或水的狀態", 氵: "水、液體或水的狀態",
  火: "火、熱或燃燒", 灬: "火、熱或燃燒",
  木: "樹木、木材或木製事物", 艸: "草木或植物", 艹: "草木或植物",
  言: "說話、言語或表達", 訁: "說話、言語或表達",
  口: "嘴、發聲或口部動作", 足: "腳、行走或動作", 走: "行走或移動",
  玉: "玉石、寶石或相關材料", 王: "玉石、寶石或相關材料",
  金: "金屬、金錢或金屬器物", 釒: "金屬、金錢或金屬器物",
  糸: "絲線、織物或連結", 糹: "絲線、織物或連結",
  衣: "衣服、布料或穿著", 衤: "衣服、布料或穿著",
  石: "石頭、礦物或堅硬材料", 土: "土地、泥土或地面",
  日: "太陽、光亮或時間", 月: "月亮、時間或身體部位",
  肉: "身體、肌肉或器官", 疒: "疾病或身體不適",
  目: "眼睛、觀看或視覺", 耳: "耳朵、聽覺或聆聽",
  虫: "昆蟲、動物或生物", 鳥: "鳥類", 魚: "魚類或水生動物",
  犬: "動物或動物行為", 犭: "動物或動物行為",
  馬: "馬匹或與馬相關的事物", 車: "車輛或運輸",
  食: "飲食或食物", 飠: "飲食或食物", 米: "米穀、糧食或細小顆粒",
  貝: "財貨、金錢或交易", 門: "門戶、出入或空間",
  襾: "覆蓋或翻覆",
  乑: "多人聚集",
  宀: "房屋、遮蓋或室內空間", 广: "房屋或建築空間",
  山: "山地或高起地形", 阜: "山地、臺階或地勢", 阝: "地勢、區域或聚落",
};

function meaningExplanation(component: string) {
  const category = SEMANTIC_CATEGORIES[component];
  return category
    ? `「${component}」是形符，提示這個字的意義和${category}有關；完整字義仍要配合字典與語詞理解。`
    : `「${component}」是形符，提供字義類別的線索；完整字義仍要配合字典與語詞理解。`;
}

const SHUOWEN_NON_PHONETIC: Partial<Record<string, { kind: string; meaning: string; url: string; sourceTitle?: string; additionalSources?: { title: string; url: string }[] }>> = {
  盈: { kind: "會意", meaning: "這裡採徐鉉及段玉裁的傳統篆形解讀：下方皿是器皿，上方夃取買物多得、益多的意思，兩部合看，說明把器皿裝滿。這項解讀沒有另列獨立聲符，也不是把夃的今音當作盈的讀音。字庫仍指出從夃的原因未明，並把買賣參與構形列為一說，因此這裡呈現的是具名的傳統解釋，不是已無爭議的唯一字源。", url: "https://zdic.net/hant/%E7%9B%88", sourceTitle: "漢典所錄《說文》徐鉉注及段玉裁注（盈：皿、夃的傳統會意解讀）", additionalSources: [{ title: "香港中文大學漢語多功能字庫（盈：從夃原因仍未明）", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%9B%88" }] },
  票: { kind: "會意", meaning: "這裡採段玉裁對古字𤐫的同意解讀：下部火表示火焰，上部與表示升高的𠨧相聯繫，合起來說明火焰升騰，這項解讀不另列獨立聲符。字庫引何琳儀說，後來上部省作覀，下部火誤寫作示，成為今字票；因此今字下方示不是祭祀義，上方覀也不是已證實的獨立聲符。今天車票、票據的用法須配合詞語理解，不把現代兩格直接讀成古構件。", url: "https://www.shuowen.org/view/6452", sourceTitle: "段玉裁《說文解字注》（𤐫：火飛、升高同意的篆形解讀）", additionalSources: [{ title: "香港中文大學漢語多功能字庫（票：古今字形與何琳儀說）", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%A5%A8" }] },
  尺: { kind: "會意", meaning: "這裡採段玉裁對篆形的會意解讀：尸作主，乙是記識的標誌，用來說明量度、標記長短的尺度；《說文》並記古代尺度以人體部位為法。這項說法沒有另列獨立聲符，不是把乙的今音當作尺的讀音。字庫仍將更早構形列為不明，故不把這項傳統篆形解讀當作已證實的唯一造字起源，也不從今字任圈一筆作乙。", url: "https://zdic.net/hant/%E5%B0%BA", sourceTitle: "段玉裁《說文解字注》（尺：尸、乙篆形會意說）", additionalSources: [{ title: "香港中文大學漢語多功能字庫（構形仍未明）", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B0%BA" }] },
  昆: { kind: "會意", meaning: "這裡採《說文》及段玉裁的篆形解讀：上方日取明與同的意思，下方比也取同的意思，兩部共同表意，解作同、共同；這項解讀不另列獨立聲符。字庫對更早金文仍記構義不明，楚簡另有蟲形或云聲的分析，不能混成日下兩人行走的唯一字源。昆弟、昆蟲等詞的意思須配合語詞學習。", url: "https://zdic.net/hant/%E6%98%86", sourceTitle: "《說文解字》及段玉裁注（昆：日、比篆形解讀）", additionalSources: [{ title: "香港中文大學漢語多功能字庫（金文及楚簡的不同分析）", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%98%86" }] },
  款: { kind: "會意", meaning: "這裡採漢典所列的會意分析，參照徐鉉所解意有所欲而仍有所阻塞：欠形和表示塞的省形共同表意，這項解讀不另指定獨立聲符。教育部指出古左上出形改成今士，下方作示；士、示在這裡不是士人、祭祀之義。誠懇、款待、款項等用法須分別學習，不能都由同一故事推出。《康熙字典》㱁條另記省聲分析，屬另一字書的解讀。", url: "https://zdic.net/hans/%E6%AC%BE", sourceTitle: "漢典（款的會意分析及所引徐鉉說）", additionalSources: [{ title: "教育部異體字字典（出改士及意有所欲的說明）", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=22273&powerMode=2" }, { title: "《康熙字典》㱁條（省聲的另一分析）", url: "https://zdic.net/hant/%E3%B1%81" }] },
  暴: { kind: "會意", meaning: "這裡採段玉裁對曬義㬥的篆形會意說：日、出、廾（雙手）、米合看，表示日出時舉米曝曬，沒有另列獨立聲符。教育部說明，曬義㬥與急疾義曓原是不同篆字，後來隸書都寫成暴；今字下部已改寫，不把形近水的筆畫解作澆水，也不把曬米的故事直接解釋成暴虐。古文另有麃聲等寫法，須與這項篆形會意說分開。", url: "https://zdic.net/hant/%E3%AC%A5", sourceTitle: "段玉裁《說文解字注》（㬥：日、出、廾、米會意說）", additionalSources: [{ title: "教育部異體字字典（㬥、曓合為今字暴）", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=20129&powerMode=2" }] },
  肅: { kind: "會意", meaning: "這裡採慧琳引《說文》的篆形會意說：聿（持筆的手）在深淵形𣶒之上，表現戰戰兢兢、謹慎嚴敬；今字已有連筆、變形，不按每筆另編水或手的故事。字庫另列何琳儀、黃錫全的聿聲說，並指更早構形初義未明；兩說分開呈現，不把這項篆形解讀當作唯一古字源。", url: "https://github.com/cbeta-org/xml-p5/blob/dbdea41071e1e260ad84b72faefd4587333cf76d/T/T54/T54n2128.xml", sourceTitle: "慧琳《一切經音義》（T54，329頁下欄15行，惇肅：篆形會意說）", additionalSources: [{ title: "香港中文大學漢語多功能字庫（聿聲的另一分析）", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%82%85" }] },
  般: { kind: "會意", meaning: "這裡採《說文》與段玉裁的篆形會意解讀：左側舟表示船，右側殳表示使船旋轉、進退的工具，合看解釋盤旋，沒有另列獨立聲符。字庫對更早甲骨文另以凡象盥盤、攴旁分析，與篆形舟殳說須分開；一般、種類等後來用法，也不能直接由船與工具推得。", url: "https://www.shuowen.org/view/5422", sourceTitle: "《說文解字》及段玉裁注（舟、殳篆形會意說）", additionalSources: [{ title: "香港中文大學漢語多功能字庫（甲骨凡、攴與後起舟、殳的區別）", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%88%AC" }] },
  是: { kind: "會意", meaning: "這裡採《說文》及段玉裁的篆形解讀：日與正共同表意，以太陽作正準，說明正直，後來用於是非的是；今字上方仍為日，下部由正形改寫，不把下部每筆拆成另一個聲符。字庫對更早金文另列早形、止聲，並明說本義不明，因此這項篆形會意說不是所有時期唯一的字源，也不直接解釋今天判斷句的全部用法。", url: "https://www.shuowen.org/view/1088", sourceTitle: "《說文解字》及段玉裁注（日、正篆形會意說）", additionalSources: [{ title: "香港中文大學漢語多功能字庫（金文與後起篆形的區別）", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%98%AF" }] },
  畏: { kind: "會意", meaning: "這裡採《說文》的篆形解讀：上部為鬼頭，下部為虎的省形，合起來表示可怕、令人畏懼；教育部說明今字上部已寫成田形，不是取田地之義。李孝定對更早甲金文另有鬼兼表聲、卜象杖的分析，與鬼頭虎爪說不同，不混成一套構形，也不把今字中一橫當作獨立聲符。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=28295&q=1", sourceTitle: "教育部異體字字典引說文（鬼頭、虎省的篆形解讀）", additionalSources: [{ title: "香港中文大學漢語多功能字庫引李孝定（金文鬼聲說）", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%95%8F" }] },
  甩: { kind: "變體表意", meaning: "依林季苗的現代漢字分類，甩屬改動筆畫或方向形成的變體表意字，不按一個義符加一個聲符分析。漢語多功能字庫列用形、乚形，解作扔、拋開；今字彎鉤是字形特徵，不把用或乚的讀音當作甩的讀音。論文沒有逐筆解釋甩的變形過程，這裡也不自行添加甩出某一筆的故事。", url: "https://chinesisch.fb06.uni-mainz.de/files/2018/11/hanzirenzhi_papers_lin.pdf#page=5", sourceTitle: "林季苗〈漢字分類及認知之研究與對外教學應用〉第5頁（變體字）", additionalSources: [{ title: "香港中文大學漢語多功能字庫（甩）", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%94%A9" }] },
  色: { kind: "會意", meaning: "依字庫所述的金文解讀，爪形是手、卩形是跪坐的人，合起來表示按壓，是印、抑一系的古形，後因音近借作色。《說文》另從人、卩解作臉上神情，兩種時代的解讀應分開。今字上方𠂊、下方巴是演變後的形狀，不把巴或𠂊另當聲符，也不把按壓直接說成顏色的意義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%89%B2", sourceTitle: "香港中文大學漢語多功能字庫（金文印、抑古形解讀）" },
  疊: { kind: "會意", meaning: "依《說文》所引楊雄的解釋，古字以晶的三日形和宜形，表示古代審案等待三日、得其宜後才執行；後來上部改寫為三田，下部宜也有變形。這是具名的傳統構形解讀，不把田地或宜的讀音當作疊的聲符。今天重疊、折疊等用法須配合詞義理解。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=28623", sourceTitle: "教育部異體字字典引說文楊雄說（篆形解讀）" },
  辯: { kind: "會意", meaning: "依段玉裁的解讀，「言」放在「辡」（兩名涉訟者）之間，提示用言語審理訴訟、分明事理。今字兩側辛形與中央言共同表意。另有辡聲的形聲分析，這裡明採段注會意說，不把兩說混成唯一字源。", url: "https://zdic.net/hant/%E8%BE%AF", sourceTitle: "漢典所引段玉裁說文解字注（治獄會意說）" },
  甚: { kind: "會意", meaning: "依《說文》的篆形解讀，「甘」表示甘美、安樂，「匹」表示配偶，合起來解釋特別安樂。今字上方甘形與下方匹形已有連筆；後來甚多表示很、過分等程度，不把匹另當聲符。更早金文的下部仍有不同解讀。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=28158&la=0", sourceTitle: "教育部異體字字典引說文（甘、匹說）" },
  羹: { kind: "會意", meaning: "依漢典對篆形的解讀，上方「羔」提示羊肉，下方「美」提示味美，合起來表示調和滋味、帶汁的食物。後來也指濃湯；這項解讀中兩部分共同表意，不把美當聲符。更早另有含䰜器形的寫法。", url: "https://zdic.net/hans/%E7%BE%B9", sourceTitle: "漢典詳細解釋及所引說文篆形" },
  套: { kind: "會意", meaning: "依漢典的解讀，「大」和「長」（今字下方寫镸形）提示外面的罩套要比被套住的東西更寬大、長，合起來表示罩在外面的東西。兩部分共同表意，不把長當作提示ㄊㄠˋ的聲符。", url: "https://zdic.net/hans/%E5%A5%97", sourceTitle: "漢典字形及詳細解釋" },
  摯: { kind: "會意", meaning: "依段玉裁對《說文》的會意解讀，「手」和「執」共同提示握住、抓持，今字下方仍是手形。這項篆形解讀沒有另列獨立聲符；今天常見的真摯、摯友等意思，須配合語詞理解。", url: "https://zdic.net/hans/%E6%91%AF", sourceTitle: "漢典所引段玉裁說文解字注（會意說）" },
  疑: { kind: "會意", meaning: "依何琳儀對早期字形的解讀，站立的人拄著杖、側頭張望，提示不知往哪裡走的疑惑。這裡解釋的是會意初文；後來曾加子、矢等音符，《說文》也另有矢聲的篆形分析，不把今字左右兩大格直接當成古字的全部部件。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%96%91", sourceTitle: "香港中文大學漢語多功能字庫引何琳儀（早期會意說）" },
  黑: { kind: "指事", meaning: "依漢典詳細解釋，古字在人形的臉部加標記，描畫臉上用墨刺記，提示黑色。後來人形和點畫逐漸改寫，今字下方雖像灬，不宜直接倒推最早就是用火燻黑；《說文》另有煙燻之色的篆形說。", url: "https://zdic.net/hans/%E9%BB%91", sourceTitle: "漢典詳細解釋（甲金文指事說）" },
  甦: { kind: "會意", meaning: "依教育部研訂說明，「更」提示重新，「生」提示活過來，兩部分合成死而復生、甦醒的意思。這是後起會意字，不把更字當作提示ㄙㄨ讀音的聲符。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=-28214&la=0", sourceTitle: "教育部異體字字典張文彬研訂說明" },
  拜: { kind: "會意", meaning: "依教育部引揚雄對今字所本字形的解讀，兩隻手配合下向的記號，提示低頭拱手行禮。左側龵形是手，右側一丰形包含另一隻手和丅的連寫，兩邊都參與表意，不把右側當聲符。其他古字形另有不同分析。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=17053&la=0", sourceTitle: "教育部異體字字典字樣說明引揚雄" },
  晉: { kind: "會意", meaning: "依《說文》與徐鉉的篆形解讀，「日」提示日出，「臸」提示到達，合起來說明萬物向前、進升。今字上方是兩厶和橫畫，不直接取厶字之義。古文字另有倒矢或臸作聲旁的分析，這裡採篆形說，不當作唯一的古字來源。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?educode=A01795", sourceTitle: "教育部異體字字典引說文、徐鉉會意說" },
  省: { kind: "會意", meaning: "依沈培的解讀，古字以「目」和草芽形「屮」表示眼睛長出障礙物，是眚的初文，後借作省察。今字上方改成少形，不是說少字提示省的讀音；另有視察草木等字源說法。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%9C%81", sourceTitle: "香港中文大學漢語多功能字庫引沈培說" },
  羨: { kind: "會意", meaning: "依林義光的一說，上方「羊」（今作𦍌）和下方張口流涎的「㳄」，描畫見羊而垂涎、想得到的樣子。字庫把這項說法列作備考；不是把羊當聲符，也不把它當成唯一確定的字源。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%BE%A8", sourceTitle: "香港中文大學漢語多功能字庫引林義光說" },
  軍: { kind: "會意", meaning: "依《說文》的篆形解讀，「車」是兵車，外圍的勹（包的省形）提示圍繞，合起來解釋軍隊集結成圍。今字外部改成冖形，不是屋頂義，也不另作聲符。另有加勻聲的金文字形。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%BB%8D", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  班: { kind: "會意", meaning: "古字以「刀」把兩塊玉形「珏」分開，提示切分瑞玉，後引申分開、排列成班。今字兩側王形是玉，中間刀形也已變化，不另作聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%8F%AD", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  脈: { kind: "會意", meaning: "依《說文》及漢典的會意解讀，肉旁提示身體，右側「𠂢」提示分支流行，合起來表示體內的血管，不另列獨立聲符。", url: "https://zdic.net/hant/%E8%84%88", sourceTitle: "漢典詳細解釋及所引說文" },
  磊: { kind: "會意", meaning: "三個「石」堆在一起，提示石塊眾多、堆聚的樣子。畫面下方的「砳」包含兩個石，與上方石共同表意，不作聲符。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=30439", sourceTitle: "教育部異體字字典引說文" },
  美: { kind: "會意", meaning: "依《說文》及徐鉉的篆形解讀，「羊、大」提示羊肥大而滋味美好，後引申美好。古文字另有頭戴裝飾物的人形等解讀，這裡明列篆形說，不當作唯一字源。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=34584&la=1", sourceTitle: "教育部異體字字典引說文、徐鉉" },
  素: { kind: "會意", meaning: "「糸」提示絲織品，上方古从「𠂹」，《說文》以光澤解釋白色細絹的原義。今字上方改寫成龶形，不另作聲符。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=33123&powerMode=2", sourceTitle: "教育部異體字字典引說文" },
  舀: { kind: "會意", meaning: "依《說文》的解讀，「爪」（爫）提示手，「臼」提示容器，合起來表示從臼中取出東西，後表示舀取。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%88%80", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  司: { kind: "指事", meaning: "依漢典的一種解讀，古字像人用口發布命令，與后字反向，提示職掌、主管。今字分格中的𠃌、𠮛是形狀示意，不是分別提示讀音的聲符。", url: "https://zdic.net/hant/%E5%8F%B8", sourceTitle: "漢典詳細解釋引反后說" },
  耐: { kind: "會意", meaning: "本作「耏」，以「而」表示鬚，以彡形表示拂去鬚毛，是古代剃除頰鬚的輕刑。「耐」改以寸旁提示法度，後引申忍受；寸不是聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%80%8F", sourceTitle: "香港中文大學漢語多功能字庫（耏字條）引段玉裁" },
  累: { kind: "會意", meaning: "依古形「絫」的解讀，「厽」提示堆積，「糸」提示纏連，合起來表示積聚。今字上方改寫成「田」形，不直接取田地之義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%B5%AB", sourceTitle: "香港中文大學漢語多功能字庫（絫字條）" },
  酥: { kind: "會意", meaning: "依漢典的分析，「禾」和代表酒的「酉」共同提示食品，本義是牛羊乳製成的酪類；禾不是聲符。後來也用來形容食品鬆脆。", url: "https://zdic.net/hant/%E9%85%A5", sourceTitle: "漢典字形與詳細解釋" },
  焦: { kind: "會意", meaning: "依金文字形的解讀，「隹」和「火」（今作灬）表示用火燒鳥。篆文另有三隹形、以雥作聲符的分析，這裡採金文的會意解讀。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%84%A6", sourceTitle: "香港中文大學漢語多功能字庫" },
  煩: { kind: "會意", meaning: "依《說文》，「火」提示發熱，「頁」原指頭，合起來解釋熱而頭痛，後引申煩悶、心緒紛亂。字庫指出熱頭痛這個原義未見古書用例。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%85%A9", sourceTitle: "香港中文大學漢語多功能字庫引說文、張舜徽" },
  秀: { kind: "會意", meaning: "依何琳儀的解讀，「禾」和省寫的「引」表示禾苗抽引、吐穗開花。下方後來寫成「乃」形，不直接表示乃字的意思。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%A7%80", sourceTitle: "香港中文大學漢語多功能字庫引何琳儀說" },
  秦: { kind: "會意", meaning: "依王文耀、陳秉新的解讀，古字像雙手拿杵搗禾穀，提示脫粒、舂搗。上方𡗗形由手和杵等筆畫演變，後來借作秦國的名字。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%A7%A6", sourceTitle: "香港中文大學漢語多功能字庫引王文耀、陳秉新說" },
  竟: { kind: "會意", meaning: "依《說文》的篆形解讀，「音、人」合起來解釋樂曲演奏完畢，後泛指終止。更早古字的構形尚有不同說法，這裡不當作已確定的甲骨文字源。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%AB%9F", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  章: { kind: "會意", meaning: "《說文》分作「音、十」，以數的終點解釋樂曲的一段完結。這與畫面按今字分出的立、早不同，早不是聲符。字庫指出金文字源未有確解，這是篆形的一種說法。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%AB%A0", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  絕: { kind: "會意", meaning: "古字以「刀」切斷絲線的形狀提示斷絕。「糸」（糹）是絲線，今字右部寫成刀巴形，不能把巴直接當聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%B5%95", sourceTitle: "香港中文大學漢語多功能字庫" },
  綿: { kind: "會意", meaning: "古作「緜」，以「系」和「帛」共同解釋絲線纏連、綿延，今字把系旁寫作糹。這項解讀不把帛另外當作聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%B6%BF", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  縣: { kind: "會意", meaning: "古字像把頭部用絲繩懸掛在木上，從木、系和首形（有的寫目）共同提示懸掛。後來借指州縣；今字左側筆畫由這些古部件演變，不是獨立聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%B8%A3", sourceTitle: "香港中文大學漢語多功能字庫" },
  繭: { kind: "會意", meaning: "「糸」提示絲，「虫」提示蠶等昆蟲，另有省寫的「黹」，共同解釋蠶吐絲結成的殼。今字上方不是取草木義的艸頭；畫面分格只用來看字形位置。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%B9%AD", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  羈: { kind: "會意", meaning: "古字像用繩索綁繫動物，後來有网、馬、革等部件，提示用網罩或皮革繩具束縛馬匹。今字下方䩻形包含革和馬，不另作聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%BE%88", sourceTitle: "香港中文大學漢語多功能字庫" },
  腦: { kind: "會意", meaning: "「肉」（⺼）提示身體，「巛」像頭髮，「囟」提示腦的形狀，共同解釋腦髓。右側在畫面合成一格，不另當聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%85%A6", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  已: { kind: "分化字", meaning: "古文字中已、巳原是同字，後來分化成不同寫法。「已」被借來表示終止、完畢等意思，不能從今字另找出提示這些意思的部件。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B7%B2", sourceTitle: "香港中文大學漢語多功能字庫引王輝說" },
  秉: { kind: "會意", meaning: "古字像「又」（手）握著「禾」，兩部分交疊，共同提示執持，後有掌管、主持之義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%A7%89", sourceTitle: "香港中文大學漢語多功能字庫" },
  興: { kind: "會意", meaning: "古字的「舁」像四隻手，和「同」合起來像眾人一起舉起筒、桶一類的東西，提示起來、興起。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%88%88", sourceTitle: "香港中文大學漢語多功能字庫" },
  赤: { kind: "會意", meaning: "古字從「大、火」，以大火的紅色提示赤紅色。今字筆畫已連成一體，不再把其中某一筆當作聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%B5%A4", sourceTitle: "香港中文大學漢語多功能字庫" },
  里: { kind: "會意", meaning: "「田」和「土」共同提示有田地、可居住的村落，古字中間的豎畫相連。今字示意分格不是字源上的兩個部件，不能按分格猜聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%87%8C", sourceTitle: "香港中文大學漢語多功能字庫" },
  銜: { kind: "會意", meaning: "「金」提示金屬，「行」提示行止，合起來表示放在馬口中、用來控制行止的金屬嚼子。畫面兩側的彳、亍合起來是行。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%8A%9C", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  鄉: { kind: "會意", meaning: "依甲金文的解讀，兩個人相向跪坐、共同進食，提示饗宴，是「饗」的初文。今字的乡、郎形由古字演變，不能直接把郎當聲符；《說文》另有不同的構形分析。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%84%89", sourceTitle: "香港中文大學漢語多功能字庫" },
  計: { kind: "會意", meaning: "「言」和數字「十」共同提示合計、計算；《說文》從這兩部分解釋算數，不另列聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%A8%88", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  討: { kind: "會意", meaning: "《說文》把「言、寸」合起來解釋治理、整治的原義，不把寸另作聲符。後來有探討、聲討、索取等意思。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%A8%8E", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  設: { kind: "會意", meaning: "「言」和「殳」共同表意；《說文》把殳解作使人，提示吩咐、安排人去陳列設置，不另列聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%A8%AD", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  覓: { kind: "會意", meaning: "「爪」（爫）像手，「見」提示看，古字像用手半遮眼睛察看，本義是窺視，後引申為尋找。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%A6%93", sourceTitle: "香港中文大學漢語多功能字庫" },
  負: { kind: "會意", meaning: "「人」和「貝」合起來表示背著、負載物品，今字上方的人形改寫成𠂊形。《說文》另以人守貝解釋倚恃之義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%B2%A0", sourceTitle: "香港中文大學漢語多功能字庫" },
  賣: { kind: "會意", meaning: "古字從「出、買」，提示把貨物拿出去換錢，和買入相對。今字上方寫成「士」形，不是士兵，也不作聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%B3%A3", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  豚: { kind: "會意", meaning: "古字的「肉」和「豕」共同提示小豬，後來肉旁寫成近似「月」的形狀，不表示月亮。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%B1%9A", sourceTitle: "香港中文大學漢語多功能字庫" },
  閉: { kind: "會意", meaning: "「門」中插著像門閂的木材，提示關門；金文中間寫作「才」，字庫以木材的意思解釋，不另作聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%96%89", sourceTitle: "香港中文大學漢語多功能字庫" },
  間: { kind: "會意", meaning: "「門」和「日」表示陽光從門縫照進來，提示間隙，後引申為空間、時間上的距離。與月光入門的「閒」字有異體關係。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%96%93", sourceTitle: "香港中文大學漢語多功能字庫" },
  辱: { kind: "會意", meaning: "依裘錫圭的解讀，「辰」像除草農具，下方手形後來寫作「寸」，合起來表示手持農具除草，是「耨」的初文；恥辱是後來的用義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%BE%B1", sourceTitle: "香港中文大學漢語多功能字庫引裘錫圭說" },
  農: { kind: "會意", meaning: "依甲金文的解讀，草木、田地和除草農具「辰」共同提示開荒耕作，有的古字還加手形。今字上部寫成「曲」形，不直接表示彎曲。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%BE%B2", sourceTitle: "香港中文大學漢語多功能字庫" },
  藝: { kind: "會意", meaning: "初文「埶」像人伸手種植草木，後加「艸」（艹）；下方云形由人形的筆畫演變，不表示雲氣，也不是獨立聲符。本義是種植。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%97%9D", sourceTitle: "香港中文大學漢語多功能字庫" },
  辭: { kind: "會意", meaning: "依字庫的古文字解讀，「𤔔」像雙手整理絲線，另一部分原是有治理含義的「䇂」，後寫成「辛」，原義可能是治理，後用來表示言辭。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%BE%AD", sourceTitle: "香港中文大學漢語多功能字庫" },
  祝: { kind: "會意", meaning: "「示」（礻）提示祭祀，另一部分原像張口跪坐、向神明祝禱的人，後來寫成「兄」。兩部分合起來提示祝禱、祝告，不把兄直接當聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%A5%9D", sourceTitle: "香港中文大學漢語多功能字庫" },
  社: { kind: "會意", meaning: "「示」（礻）提示祭祀，「土」提示土地，合起來表示土地之神、對土地神的祭祀。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%A4%BE", sourceTitle: "香港中文大學漢語多功能字庫" },
  科: { kind: "會意", meaning: "「禾」提示穀物，「斗」是量器；依《說文》以斗量禾的解讀，提示衡量、分等，後來有品類、等級等意思。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%A7%91", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  穿: { kind: "會意", meaning: "「牙」在「穴」中，提示用牙齒鑿通、穿孔；兩部分共同表意，不另列聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%A9%BF", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  突: { kind: "會意", meaning: "「犬」從「穴」中突然竄出，合起來提示突然、衝出。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%AA%81", sourceTitle: "香港中文大學漢語多功能字庫" },
  竄: { kind: "會意", meaning: "「鼠」在「穴」中，提示躲藏、藏匿，後來引申為奔逃。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%AB%84", sourceTitle: "香港中文大學漢語多功能字庫" },
  筋: { kind: "會意", meaning: "「肉」提示身體組織，「力」提示力量，「竹」以竹子多筋作比喻，共同提示肌腱、韌帶。畫面「肋」這格合含肉旁和力，不作聲符解釋。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%AD%8B", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  等: { kind: "會意", meaning: "「竹」提示竹簡；依《說文》「寺」取官署整齊、等平的解讀，兩部分提示整理竹簡、使之齊等，後有等級、輩分等義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%AD%89", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  筆: { kind: "會意", meaning: "「聿」原像手持筆，是筆的初文，後加「竹」提示製筆材料，合起來表示書寫工具。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%AD%86", sourceTitle: "香港中文大學漢語多功能字庫" },
  罷: { kind: "會意", meaning: "依張舜徽的解讀，「能」原指熊，在「网」（罒）下表示獸被網困住而疲乏，本義是疲困，後有停止之義。《說文》另從罷遣罪人解釋，字源有不同說法。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%BD%B7", sourceTitle: "香港中文大學漢語多功能字庫引張舜徽說" },
  羅: { kind: "會意", meaning: "古字的「网」（罒）和「隹」表示用網捕鳥，後加「糸」提示絲線，合起來提示捕鳥用的絲網。畫面的「維」這格含有糸和隹，不直接作聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%BE%85", sourceTitle: "香港中文大學漢語多功能字庫" },
  臭: { kind: "會意", meaning: "「自」原指鼻子，「犬」是狗，合起來突出狗用鼻子嗅聞、追蹤的本領，是「嗅」的初文，後也表示氣味。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%87%AD", sourceTitle: "香港中文大學漢語多功能字庫" },
  表: { kind: "會意", meaning: "「衣」和「毛」共同表意：古人穿毛皮衣服，把毛露在外面，提示外衣、外面。今字上方寫成龶形，是毛形演變後的位置。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%A1%A8", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  肯: { kind: "會意", meaning: "古形從「肉」和省寫的「冎」（骨形），表示附在骨頭上的肉；今字上方改寫成止形，不表示停止。願意、許可是後來的引申義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%82%AF", sourceTitle: "香港中文大學漢語多功能字庫引說文" },
  幾: { kind: "會意", meaning: "依關子尹等人的解讀，兩縷細絲「𢆶」提示細微的事情，「戍」像人持戈防守，合起來提示留意細微、預防危險。今字的人、戈、絲形交疊，不能把畫面的一格硬當作聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B9%BE", sourceTitle: "香港中文大學漢語多功能字庫引關子尹說" },
  慶: { kind: "會意", meaning: "依魏宜輝的解讀，古字的「廌」配上心形或文形，表示神獸身上的美麗花紋，後來引申美善、喜慶。《說文》另從鹿皮賀禮解釋，字源有不同說法。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%85%B6", sourceTitle: "香港中文大學漢語多功能字庫引魏宜輝說" },
  康: { kind: "會意", meaning: "依郭沫若、林潔明的解讀，古字的「庚」像樂器，旁邊點撇像搖動時發出的聲響，提示和樂。這是字源的一種解讀，不把今字下方的隶形誤當聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%BA%B7", sourceTitle: "香港中文大學漢語多功能字庫引郭沫若、林潔明說" },
  斑: { kind: "會意", meaning: "今字從「珏」（兩個玉形）和「文」構成，「文」提示紋理，整字表示顏色錯雜、斑點花紋。字庫另引「辬」的俗寫關係，不把辬字的聲符套在今字上。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%96%91", sourceTitle: "香港中文大學漢語多功能字庫" },
  歪: { kind: "會意", meaning: "「不」和「正」合起來就是不正，提示偏斜、歪斜。這是今字的表意組合，不另有獨立聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%AD%AA", sourceTitle: "香港中文大學漢語多功能字庫" },
  於: { kind: "分化字", meaning: "「於」由像鳥形的「烏」省寫分化而來，後因古音相近而借來表示介詞「于」。不能按今字的「方、仒」分別猜出在、向等字義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%96%BC", sourceTitle: "香港中文大學漢語多功能字庫" },
  毋: { kind: "俗字借用", meaning: "甲骨文、金文借用「母」的字形表示禁止、不要，後來分化成「毋」。這是借字的關係，不能拆出一個專門提示禁止之義的聲旁或義旁。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%AF%8B", sourceTitle: "香港中文大學漢語多功能字庫" },
  建: { kind: "會意", meaning: "古文字像人用手扶著木柱把它樹立起來，提示建立。「聿」形由持柱的人、手和木柱演變，這裡不是用筆書寫的意思；另一部分後來寫作「廴」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%BB%BA", sourceTitle: "香港中文大學漢語多功能字庫" },
  投: { kind: "會意", meaning: "「手」（扌）和「殳」共同提示拋擲的動作，《說文》從這兩部分解釋投擲，不另列聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%8A%95", sourceTitle: "香港中文大學漢語多功能字庫" },
  逐: { kind: "會意", meaning: "「豕」表示豬等動物，古字的腳形、後來的「辵」（辶）表示行走，合起來提示追趕動物。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%80%90", sourceTitle: "香港中文大學漢語多功能字庫" },
  逸: { kind: "會意", meaning: "依金文字形的解讀，「兔」和「辵」（辶）像兔子快速奔跑，提示逃逸；字庫另載更早有不同構形的逃逸用字。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%80%B8", sourceTitle: "香港中文大學漢語多功能字庫引何琳儀說" },
  連: { kind: "會意", meaning: "「車」和表示行走的「辵」（辶）合起來提示人拉著車走，人和車相連，後來引申為連接。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%80%A3", sourceTitle: "香港中文大學漢語多功能字庫引段玉裁說" },
  灶: { kind: "會意", meaning: "「火」和「土」合起來提示用土築成、生火煮食的設備。這是「灶」的構形，不與另一寫法「竈」的聲符分析混用。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%81%B6", sourceTitle: "香港中文大學漢語多功能字庫" },
  矗: { kind: "會意", meaning: "三個「直」重疊組成，提示筆直、高聳。畫面下方的「直直」包含兩個直，不是另一個聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%9F%97", sourceTitle: "香港中文大學漢語多功能字庫" },
  絲: { kind: "會意", meaning: "兩個「糸」像兩束絲線，合起來提示蠶絲、絲線。左邊的「糹」是糸旁的寫法，兩邊共同表意。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%B5%B2", sourceTitle: "香港中文大學漢語多功能字庫" },
  蟲: { kind: "會意", meaning: "三個「虫」重複組成，表示蟲類的總稱；畫面「䖵」包含兩個虫，和另一個虫共同表意。古代所說的蟲類範圍比今天的昆蟲廣。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%9F%B2", sourceTitle: "香港中文大學漢語多功能字庫" },
  轟: { kind: "會意", meaning: "三個「車」合起來提示許多車一起行進的聲響，後來泛指巨大的聲音。畫面的「䡛」包含兩個車，不另作聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%BD%9F", sourceTitle: "香港中文大學漢語多功能字庫引徐鍇會意說" },
  赫: { kind: "會意", meaning: "兩個「赤」共同提示紅色鮮明、熾盛，本義是火紅色，後來引申為明亮、顯著。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%B5%AB", sourceTitle: "香港中文大學漢語多功能字庫" },
  臥: { kind: "會意", meaning: "「人」和表示眼睛朝向改變的「臣」共同提示俯伏休息；這裡的臣形不直接表示臣子。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%87%A5", sourceTitle: "香港中文大學漢語多功能字庫" },
  庫: { kind: "會意", meaning: "「广」表示屋舍，「車」表示所收藏的兵車，合起來提示存放車輛、兵器的庫房。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%BA%AB", sourceTitle: "香港中文大學漢語多功能字庫" },
  弄: { kind: "會意", meaning: "「廾」表示雙手，托著「玉」（今字寫作王形），提示用手把玩玉器，本義是玩賞。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%BC%84", sourceTitle: "香港中文大學漢語多功能字庫" },
  折: { kind: "會意", meaning: "依砍斷草木的構形解讀，「斤」表示斧頭，左邊原是斷開的草木，後來改寫成手旁，合起來提示折斷。不要把今字的手旁當作原始字形。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%8A%98", sourceTitle: "香港中文大學漢語多功能字庫" },
  盜: { kind: "會意", meaning: "表示偷盜的字從「㳄」和「皿」：「㳄」像張口流口水，「皿」是器皿，提示貪圖別人的財物。字庫另述的舟形古字可能是同形異字，不混作這項解釋。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%9B%9C", sourceTitle: "香港中文大學漢語多功能字庫" },
  見: { kind: "會意", meaning: "古文字把「目」放在人形上，突出人的眼睛，提示看見。今字下部寫作「儿」，不是提示讀音的部件。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%A6%8B", sourceTitle: "香港中文大學漢語多功能字庫" },
  買: { kind: "會意", meaning: "「貝」提示古代的貨幣，「网」（今作罒）與攜取物品相關。字庫引以網取貝的解讀；《說文》也從网、貝解釋買物，不另列聲符。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%B2%B7", sourceTitle: "香港中文大學漢語多功能字庫" },
  閃: { kind: "會意", meaning: "「人」在「門」中，提示從門中探頭偷看，後來引申為忽然出現、躲避等意思。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%96%83", sourceTitle: "香港中文大學漢語多功能字庫" },
  閒: { kind: "會意", meaning: "「門」和「月」表示月光從門縫照入，依何琳儀的解讀，提示門間的空隙。此處解釋今字的門、月構形；古字另有帶聲符的異體。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%96%92", sourceTitle: "香港中文大學漢語多功能字庫引何琳儀說" },
  甜: { kind: "會意", meaning: "「舌」提示品嘗，「甘」表示甘美，合起來提示像糖、蜜一樣的味道。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%94%9C", sourceTitle: "香港中文大學漢語多功能字庫" },
  眾: { kind: "會意", meaning: "甲骨文像太陽下有三個人，描畫眾人在日下勞作，提示人多。現代上方和下方的人形都已演變。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%9C%BE", sourceTitle: "香港中文大學漢語多功能字庫" },
  登: { kind: "會意", meaning: "甲骨文可解作雙手捧著食器登上祭台進獻祭品，提示向上、進獻的古義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%99%BB", sourceTitle: "香港中文大學漢語多功能字庫" },
  相: { kind: "會意", meaning: "字形有「木」和「目」，可解作用眼睛觀察樹木，提示觀察的早期字義，後來也用來表示互相。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%9B%B8", sourceTitle: "香港中文大學漢語多功能字庫" },
  直: { kind: "指事", meaning: "早期字形有眼睛形「目」和一豎，豎筆指出目光直視，提示正視，後來引申為筆直、正直。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%9B%B4", sourceTitle: "香港中文大學漢語多功能字庫" },
  益: { kind: "會意", meaning: "甲骨文像器皿裡的水盛滿而溢出，提示溢出的本義，是「溢」的早期寫法，後來引申為增加、益處。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%9B%8A", sourceTitle: "香港中文大學漢語多功能字庫" },
  甸: { kind: "會意", meaning: "金文字形可解作人在田中勞作，提示農作。現代字形內部仍可清楚看見「田」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%94%B8", sourceTitle: "香港中文大學漢語多功能字庫" },
  毒: { kind: "會意", meaning: "《說文解字》將古字分析為草芽形「屮」和「毐」，並以有害的草解釋字義。徐灝也將本義解作毒草，後來泛指毒物。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%AF%92", sourceTitle: "香港中文大學漢語多功能字庫引《說文解字》與徐灝說" },
  段: { kind: "會意", meaning: "金文有石形和表示手持錘子的「殳」，描畫在石上鍛打，是「鍛」等字的早期寫法。後來「段」也用來表示分段、段落。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%AE%B5", sourceTitle: "香港中文大學漢語多功能字庫" },
  殷: { kind: "會意", meaning: "一種甲骨文解讀認為，字形描畫手持針治療脹大的腹部，原義與病痛深重有關，後來也表示繁盛、深切。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%AE%B7", sourceTitle: "香港中文大學漢語多功能字庫" },
  沙: { kind: "會意", meaning: "甲骨文和金文有水形及數個小點，描畫水邊的沙粒。現代左側「氵」保留水的線索，右側寫作「少」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%B2%99", sourceTitle: "香港中文大學漢語多功能字庫" },
  此: { kind: "會意", meaning: "古字由腳形「止」和人形組成，描畫人停步的地方，提示此處，與「彼」相對。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%AD%A4", sourceTitle: "香港中文大學漢語多功能字庫" },
  死: { kind: "會意", meaning: "一種古文字解讀將字形看作活人跪在朽骨旁悼念，提示死亡。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%AD%BB", sourceTitle: "香港中文大學漢語多功能字庫" },
  為: { kind: "會意", meaning: "甲骨文和金文像一隻手牽著大象，字庫將它解作役使大象做事，提示做事、作為的早期字義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%82%BA", sourceTitle: "香港中文大學漢語多功能字庫" },
  漁: { kind: "會意", meaning: "甲骨文有魚、雙手和網，描畫兩手持網捕魚。後來簡化為「水」和「魚」，今字左側水旁和右側魚形共同提示捕魚。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%BC%81", sourceTitle: "香港中文大學漢語多功能字庫" },
  涉: { kind: "會意", meaning: "古字有「水」和兩個腳形，描畫雙腳分處水的兩側，提示步行過河、涉水。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%B6%89", sourceTitle: "香港中文大學漢語多功能字庫" },
  獸: { kind: "會意", meaning: "古字有狩獵工具形「單」和「犬」，描畫帶著獵狗與工具去狩獵，後來也用來表示獸類。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%8D%B8", sourceTitle: "香港中文大學漢語多功能字庫" },
  爽: { kind: "會意", meaning: "季旭昇把早期字形解作人形左右各夾著一件器物，以兩側相配提示配合的意思。兩側記號的古代寫法有多種變化。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%88%BD", sourceTitle: "香港中文大學漢語多功能字庫" },
  灰: { kind: "會意", meaning: "古字有「火」和表示手的「又」。整體與燃燒後留下的灰燼有關。現代上方的手形已經變化，下方仍可見「火」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%81%B0", sourceTitle: "香港中文大學漢語多功能字庫" },
  災: { kind: "會意", meaning: "甲骨文有房屋「宀」和「火」，描畫房屋失火。後來也有「𡿧」和火組合的異體，經隸書省略成現代上「巛」下「火」的寫法。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%81%BD", sourceTitle: "香港中文大學漢語多功能字庫" },
  焚: { kind: "會意", meaning: "古字由「林」和「火」組成，描畫燃燒樹林、雜草，提示焚燒的本義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%84%9A", sourceTitle: "香港中文大學漢語多功能字庫" },
  牢: { kind: "會意", meaning: "甲骨文和金文像牛或羊被關在欄圈內，提示圈養家畜的圍欄。今字下方的「牛」保留了家畜的線索。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E7%89%A2", sourceTitle: "香港中文大學漢語多功能字庫" },
  棘: { kind: "會意", meaning: "左右兩個「朿」並列，提示帶刺的小棗樹叢生。可以從兩棵帶刺的樹聯想到荊棘。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=21369", sourceTitle: "教育部《異體字字典》引《說文解字》" },
  朝: { kind: "會意", meaning: "甲骨文有一種寫法描畫太陽從草木間升起，月亮仍在天空，提示早晨。後來金文也有表示潮水的字形，字源須配合不同時期理解。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%9C%9D", sourceTitle: "香港中文大學漢語多功能字庫" },
  會: { kind: "會意", meaning: "古字像用蓋子蓋上裝有物品的器皿，提示相合的早期字義，後來可表示聚會、會合。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%9C%83", sourceTitle: "香港中文大學漢語多功能字庫" },
  曹: { kind: "會意", meaning: "甲骨文像兩個並列的袋子，後來再加「口」形。丁山、林澐將它解作一雙、成對，後來引申為同輩。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%9B%B9", sourceTitle: "香港中文大學漢語多功能字庫" },
  最: { kind: "會意", meaning: "《說文解字》將「最」分析為「冃」和「取」，以冒犯而取解釋古義。現代多用來表示程度最高，如「最好」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%9C%80", sourceTitle: "香港中文大學漢語多功能字庫引《說文解字》" },
  棉: { kind: "會意", meaning: "左側「木」提示植物，右側「帛」可聯想到纖維製成的織物。字庫將本義解作木棉。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%A3%89", sourceTitle: "香港中文大學漢語多功能字庫" },
  杏: { kind: "會意", meaning: "何琳儀將上方「木」和下方「口」解作杏果可入口的線索。《說文解字》另以「可」的省形解作聲符，字庫指出這項聲符解讀仍有疑問。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%9D%8F", sourceTitle: "香港中文大學漢語多功能字庫" },
  枚: { kind: "會意", meaning: "古字由「木」和「攴」組成，像拿杖敲木。《說文解字》把它解作可作手杖的樹幹。今天常用作量詞，如一枚硬幣。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%9E%9A", sourceTitle: "香港中文大學漢語多功能字庫" },
  棄: { kind: "會意", meaning: "甲骨文有倒寫的孩子形、簸箕形與雙手形，描畫丟棄，後來用來表示放棄、拋棄。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%A3%84", sourceTitle: "香港中文大學漢語多功能字庫" },
  某: { kind: "會意", meaning: "金文以「甘」和「木」組字，字庫將它解作樹上結出酸甜梅子，是「梅」的早期寫法。後來借用表示不明說的人或事物，如「某人」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%9F%90", sourceTitle: "香港中文大學漢語多功能字庫" },
  既: { kind: "會意", meaning: "早期字形像一個人跪坐在食器旁，吃完後把頭轉開，提示進食完畢。後來引申為完成、已經。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%97%A2", sourceTitle: "香港中文大學漢語多功能字庫" },
  帥: { kind: "會意", meaning: "有一種甲骨文解讀認為，整體像一手持杖牽引另一隻手，提示帶領。金文加上「巾」。另有學者將早期字形解作兩手持巾，認為原義是佩巾。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B8%A5", sourceTitle: "香港中文大學漢語多功能字庫" },
  幼: { kind: "會意", meaning: "「幺」像細絲，「力」有一說像翻土農具，整體可解作農具綁著繩索。馬敍倫另從力量微少解釋幼小。這個字的造字本義仍有不同解讀，金文已用來表示年幼。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B9%BC", sourceTitle: "香港中文大學漢語多功能字庫" },
  妻: { kind: "會意", meaning: "甲骨文和金文有女性人形、長髮與手形。字庫把整體解作手抓女性長髮，認為與古代搶婚習俗有關，原義是妻子。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A6%BB", sourceTitle: "香港中文大學漢語多功能字庫" },
  史: { kind: "會意", meaning: "甲骨文像一隻手拿著物件，所持物件有不同解讀。「史」、「吏」、「事」、「使」早期原是一字，後來逐漸分化。《說文解字》把「史」解作記事的人。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8F%B2", sourceTitle: "香港中文大學漢語多功能字庫" },
  寡: { kind: "會意", meaning: "季旭昇把西周金文解作「宀」下有一個人形。「宀」像房屋，整體描畫一個人在屋內獨處，提示孤單、無伴的原義，後來引申為少。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AF%A1", sourceTitle: "香港中文大學漢語多功能字庫引季旭昇說" },
  幸: { kind: "會意", meaning: "依小篆的解讀，「夭」提示早死，「屰」表示相反。合起來提示免去災禍的意思，後來引申為幸運。更早的金文字形本義仍待考。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B9%B8", sourceTitle: "香港中文大學漢語多功能字庫" },
  平: { kind: "指事", meaning: "依《說文解字》的解讀，字形表示氣息向上舒出，中間的一橫指出平穩，提示氣息平舒的古義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B9%B3", sourceTitle: "香港中文大學漢語多功能字庫" },
  席: { kind: "會意", meaning: "《說文解字》把「席」分析為「巾」和省去部分筆畫的「庶」。「巾」提示可鋪墊的織物；徐鉉等將「庶」和眾多賓客相聯繫，解釋用席待客。原義是坐臥用的席墊。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B8%AD", sourceTitle: "香港中文大學漢語多功能字庫引《說文解字》" },
  擤: { kind: "會意", meaning: "左側「扌」提示用手，右側「鼻」指出動作的部位。擤鼻涕時，用手按住鼻子並用力出氣。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=59367", sourceTitle: "教育部《異體字字典》字樣與釋義" },
  文: { kind: "會意", meaning: "甲骨文和金文描畫一個身上有紋樣的人，提示紋身的早期字義。今字可從整體字形理解這項線索。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%96%87", sourceTitle: "香港中文大學漢語多功能字庫" },
  族: { kind: "會意", meaning: "甲骨文和金文有表示旗幟的「㫃」及表示箭的「矢」。依丁山的解讀，旗用於集合眾人，箭用於作戰，合起來提示古代兼有軍事組織作用的氏族。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%97%8F", sourceTitle: "香港中文大學漢語多功能字庫引丁山說" },
  旋: { kind: "會意", meaning: "甲骨文和金文以「㫃」表示旗幟，以「止」表示人的腳。合起來描畫腳步隨旗幟的指揮轉動，提示旋轉的本義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%97%8B", sourceTitle: "香港中文大學漢語多功能字庫" },
  早: { kind: "會意", meaning: "王蘊智、郝士宏將金文上方的「日」解作太陽，下方「甲」是天干之首，提示初始。合起來表示太陽剛升起的時段。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%97%A9", sourceTitle: "香港中文大學漢語多功能字庫" },
  方: { kind: "指事", meaning: "裘錫圭將早期字形解作在「刀」上加一橫，指出刀的鋒芒。後來借這個字表示方圓的「方」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%96%B9", sourceTitle: "香港中文大學漢語多功能字庫" },
  普: { kind: "會意", meaning: "《說文解字》把「普」分析為上方「並」和下方「日」，並將古義解作日光不顯。段玉裁指出，後來借「普」表示「溥」的廣大義，如「普遍」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%99%AE", sourceTitle: "香港中文大學漢語多功能字庫引《說文解字》與段注" },
  易: { kind: "分化字", meaning: "郭沫若認為，古字由表示器中盛水的「益」簡化分化而來，原來表示賞賜。現代字形可辨「日」和「勿」，古字的賞賜義要從整體字形的演變理解。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%98%93", sourceTitle: "香港中文大學漢語多功能字庫引郭沫若說" },
  明: { kind: "會意", meaning: "甲骨文和金文可見「日」與「月」。一說描畫太陽初升而月亮尚未落下，提示天明；另一說以日月相映提示明亮。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%98%8E", sourceTitle: "香港中文大學漢語多功能字庫" },
  昏: { kind: "會意", meaning: "依許慎的解讀，上方「氏」是表示低下的「氐」省形，和下方「日」合起來描畫太陽落下，提示黃昏。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%98%8F", sourceTitle: "香港中文大學漢語多功能字庫" },
  斷: { kind: "會意", meaning: "右側「斤」像斧，左側的古部件表示絲束斷開。合起來可聯想到用斧截斷絲束，提示「截斷」的本義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%96%B7", sourceTitle: "香港中文大學漢語多功能字庫" },
  學: { kind: "會意", meaning: "有一種甲骨文解讀，將上方看成雙手操作算籌，下方「子」代表孩子。合起來可聯想到孩子練習用算籌計數，提示學習的本義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AD%B8", sourceTitle: "香港中文大學漢語多功能字庫" },
  同: { kind: "會意", meaning: "《說文解字》把「同」解作聚合，字形有外部的「𠔼」和內部的「口」。甲骨文另有不同解讀：裘錫圭認為其中的圓形可能原來畫的是筒或桶一類的器物。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%90%8C", sourceTitle: "香港中文大學漢語多功能字庫" },
  恆: { kind: "會意", meaning: "依教育部字典所載的篆文解讀，「亙」像舟在兩地之間反覆長久往返。今字右側保留「亙」，左側「忄」可聯想到持久不變的心志，如「恆心」。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=14917&la=0", sourceTitle: "教育部《異體字字典》" },
  忐: { kind: "會意", meaning: "「忐」和另一個字合成「忐忑」，表示心裡不安。字形中的「上」和下方的「心」可用「心裡七上八下」來記。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=58031", sourceTitle: "教育部《異體字字典》釋義及用例" },
  忑: { kind: "會意", meaning: "「忑」和另一個字合成「忐忑」，表示心裡不安。字形中的「下」和下方的「心」可用「心裡七上八下」來記。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=58030", sourceTitle: "教育部《異體字字典》釋義及用例" },
  弟: { kind: "會意", meaning: "甲骨文和金文可解作繩索有次序地纏繞在戈柄上，提示次序的早期意思，後來也用來表示兄弟。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%BC%9F", sourceTitle: "香港中文大學漢語多功能字庫" },
  弱: { kind: "會意", meaning: "《說文解字》把古字分析成兩個「𢎥」。今字左右兩半相同，各有彎曲的弓形，整體提示柔軟。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%BC%B1", sourceTitle: "香港中文大學漢語多功能字庫" },
  戎: { kind: "會意", meaning: "甲骨文和金文的「戈」表示兵器，另一部件是盾的早期寫法。兩者合起來提示兵器，後來也指戰爭和軍事。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%88%8E", sourceTitle: "香港中文大學漢語多功能字庫" },
  抑: { kind: "分化字", meaning: "古字曾和「印」同形，後來加上左側的「扌」以區別寫法。「扌」可聯想到用手按壓，提示「抑」的本義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E6%8A%91", sourceTitle: "香港中文大學漢語多功能字庫" },
  役: { kind: "會意", meaning: "甲骨文像手持器械驅使人，提示役使、勞役的原義。今字右側的「殳」保留了器械與手的線索。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%BD%B9", sourceTitle: "香港中文大學漢語多功能字庫" },
  後: { kind: "會意", meaning: "早期字形有繩和腳，可理解為腳被繩牽住而落在後面，提示落後、後方。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%BE%8C", sourceTitle: "香港中文大學漢語多功能字庫" },
  徒: { kind: "會意", meaning: "甲骨文有表示腳的「止」和「土」，另有一些小點可解作走路揚起的塵土。整體可聯想到徒步。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%BE%92", sourceTitle: "香港中文大學漢語多功能字庫" },
  奄: { kind: "會意", meaning: "《說文解字》將「奄」解為覆蓋。篆形有「大」和表示伸展的古「申」，可聯想到伸展開來覆蓋。楷書下方是古「申」演變而來的形狀。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=9360&q=1", sourceTitle: "教育部《異體字字典》引《說文解字》" },
  岔: { kind: "會意", meaning: "上方「分」提示分開，下方「山」提示山脈。合起來可理解山脈從主幹分出去，今天也用來形容道路或河流分支。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=12082", sourceTitle: "教育部《異體字字典》字樣與釋義" },
  呆: { kind: "俗字借用", meaning: "今字上「口」下「木」。教育部字典引古字書記載，民間曾用「呆」來寫「獃」，表示反應遲鈍或發愣。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=5606", sourceTitle: "教育部《異體字字典》" },
  宜: { kind: "會意", meaning: "甲骨文和金文像把兩塊肉放在俎案上，提示陳放牲肉的早期意思。現代常用在「適宜」，可配合語詞理解。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AE%9C", sourceTitle: "香港中文大學漢語多功能字庫" },
  就: { kind: "會意", meaning: "王蘊智、郝士宏把甲骨文和金文的「亯」解作宗廟，「京」解作高臺。合起來描畫在高處祭享。今字可辨的部件寫作「京」和「尤」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B0%B1", sourceTitle: "香港中文大學漢語多功能字庫" },
  哥: { kind: "歌唱的古字", meaning: "上、下都是「可」。《說文解字》記載「哥」可用來寫「謌」，也就是「歌」。現代表示兄長的意思是後來的用法，不能從兩個「可」各自推得。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%93%A5", sourceTitle: "香港中文大學漢語多功能字庫引《說文解字》" },
  咒: { kind: "分化字", meaning: "「咒」由「祝」分化而來，早期表示祝禱。上方的兩個「口」可聯想到開口禱告。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%92%92", sourceTitle: "香港中文大學漢語多功能字庫" },
  尖: { kind: "會意", meaning: "上方「小」、下方「大」，合起來可聯想到上端細、底部寬的形狀，提示物體細削或突出的末端。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B0%96", sourceTitle: "香港中文大學漢語多功能字庫" },
  只: { kind: "指事", meaning: "《說文解字》將上方的「口」解作嘴，下方筆畫表示氣息向下引出，整體表示句末語氣。現代常用在「只有」一詞。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8F%AA", sourceTitle: "香港中文大學漢語多功能字庫引《說文解字》" },
  履: { kind: "會意", meaning: "金文字形可見人形、腳趾和「舟」。「舟」在這個解讀中像鞋，整體描畫穿鞋走路或踩踏，所以「履」也可指鞋。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B1%A5", sourceTitle: "香港中文大學漢語多功能字庫" },
  孔: { kind: "指事", meaning: "郭沫若將金文解作在「子」的頭部加一筆，指嬰兒頭頂骨尚未合攏的地方。這個記號提示「孔」的早期字義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AD%94", sourceTitle: "香港中文大學漢語多功能字庫" },
  屋: { kind: "會意", meaning: "依《說文解字》所載的構形，上方「尸」在此解作覆蓋，下方「至」與到達有關，整個字表示房舍。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B1%8B", sourceTitle: "香港中文大學漢語多功能字庫" },
  實: { kind: "會意", meaning: "金文像屋裡裝滿了貝、玉等寶物，提示富實、富足的本義。上方「宀」表示房屋。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AF%A6", sourceTitle: "香港中文大學漢語多功能字庫" },
  寒: { kind: "會意", meaning: "金文上方「宀」像屋頂，屋內的人躺在草上，再覆草取暖，整體提示寒冷。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AF%92", sourceTitle: "香港中文大學漢語多功能字庫" },
  封: { kind: "會意", meaning: "古字像把樹種在土上，金文又加上手形，提示用手植樹作為地界。現代字形右側「寸」的位置沿襲手形。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B0%81", sourceTitle: "香港中文大學漢語多功能字庫" },
  射: { kind: "會意", meaning: "甲骨文以弓和箭描畫箭在弦上的樣子。有些金文加上「又」表示手，提示射箭的本義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B0%84", sourceTitle: "香港中文大學漢語多功能字庫" },
  尊: { kind: "會意", meaning: "古字的「酉」像酒器，下方有雙手或單手的形狀。整體描畫捧著酒器，本義是放置。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B0%8A", sourceTitle: "香港中文大學漢語多功能字庫" },
  尿: { kind: "會意", meaning: "古字描畫人排泄小便。現代字形上方的「尸」可辨作人形，下方的「水」提示流出的尿液。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B0%BF", sourceTitle: "香港中文大學漢語多功能字庫" },
  季: { kind: "會意", meaning: "沈培將甲骨文、金文的「禾」和「子」解作會意，分別提示矮小的禾和小孩子，合起來表示幼小。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AD%A3", sourceTitle: "香港中文大學漢語多功能字庫" },
  守: { kind: "會意", meaning: "金文上方「宀」像屋頂，下方原寫成表示手的「又」，後來改寫為「寸」。王蘊智將整體解作守護居室。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AE%88", sourceTitle: "香港中文大學漢語多功能字庫" },
  官: { kind: "會意", meaning: "甲骨文和金文有表示房屋的「宀」和表示眾人的「𠂤」。合起來可想成眾人在屋內議事，本義是官署，後來也指官員。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AE%98", sourceTitle: "香港中文大學漢語多功能字庫" },
  孫: { kind: "會意", meaning: "「子」指兒女，「糸」像連續的絲線。合起來提示子女一代接一代，本義是孫兒。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AD%AB", sourceTitle: "香港中文大學漢語多功能字庫" },
  尾: { kind: "會意", meaning: "古字以人形和倒寫的「毛」描畫身後帶尾的樣子。字庫將這條尾解作古代服飾的一部分。現代字形的「尸」保留人形，「毛」提示尾。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%B0%BE", sourceTitle: "香港中文大學漢語多功能字庫" },
  委: { kind: "會意", meaning: "施謝捷把早期字形解作「禾」配上彎曲的記號，提示禾莖彎曲，與「委曲」的舊義相關。戰國後期才出現現代字形所見的「禾」和「女」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A7%94", sourceTitle: "香港中文大學漢語多功能字庫引施謝捷說" },
  威: { kind: "會意", meaning: "金文有「戌」和「女」兩個部件。「戌」在這裡像兵器，整體可解作以武力震懾他人，提示聲威、威勢。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A8%81", sourceTitle: "香港中文大學漢語多功能字庫" },
  岩: { kind: "分化字", meaning: "現在寫作上「山」下「石」，可以聯想到山中的石頭，也用在「岩石」一詞。教育部字典另收「岩」為「巖」的異體。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=12182", sourceTitle: "教育部《異體字字典》" },
  審: { kind: "會意", meaning: "《說文解字》的正篆作「宷」。徐鍇將「宀」解作覆蓋，「釆」解作辨別，提示深入辨察、詳知的意思。現代通行的「審」沿用下方寫作「番」的篆文異體。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=11308", sourceTitle: "教育部《異體字字典》引《說文解字》與徐鍇說" },
  吊: { kind: "分化字", meaning: "「吊」本是「弔」的俗字。後來多用「吊」表示懸掛，用「弔」表示追念或慰問。今字的「口」和「巾」可用來辨認字形。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%90%8A", sourceTitle: "香港中文大學漢語多功能字庫" },
  報: { kind: "會意", meaning: "古字形一側是拘押用的刑具，另一側像以手制住人，提示懲治的古義，後來引申為報應。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A0%B1", sourceTitle: "香港中文大學漢語多功能字庫" },
  塞: { kind: "會意", meaning: "甲骨文以「宀」表示房屋，以「廾」表示雙手，描畫雙手把東西填進房屋，提示填塞。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A1%9E", sourceTitle: "香港中文大學漢語多功能字庫" },
  吉: { kind: "會意", meaning: "一種甲金文解讀把上方的「士」看作象徵權威的斧鉞，從尊貴聯想到吉祥。下方保留「口」形。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%90%89", sourceTitle: "香港中文大學漢語多功能字庫" },
  后: { kind: "會意", meaning: "《說文》用人形和「口」來說明君主向四方發號施令。古字形與「司」相近，後來兩字的方向和用法分開。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%90%8E", sourceTitle: "香港中文大學漢語多功能字庫" },
  商: { kind: "會意", meaning: "一種古文字解讀把字形看作在高臺上燃燒柴薪，以祭祀大火星。後來借用「商」表示商人、商業。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%95%86", sourceTitle: "香港中文大學漢語多功能字庫" },
  器: { kind: "會意", meaning: "一種金文解讀把四個「口」看作器物，把中間的「犬」看作守護器物的狗。另有用多個口形表示狗叫聲的解讀。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%99%A8", sourceTitle: "香港中文大學漢語多功能字庫" },
  塵: { kind: "會意", meaning: "《說文》的篆文以三個「鹿」和「土」提示群鹿奔跑揚起塵土。今字上方只保留一個「鹿」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A1%B5", sourceTitle: "香港中文大學漢語多功能字庫" },
  夏: { kind: "會意", meaning: "一種古文字解讀認為，字形畫出人在太陽底下抬頭見日，提示天氣酷熱、炎夏。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A4%8F", sourceTitle: "香港中文大學漢語多功能字庫" },
  奠: { kind: "會意", meaning: "早期字形上方像盛酒的容器，下方像放置容器的桌面，合起來提示把酒放在祭桌上供奉。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A5%A0", sourceTitle: "香港中文大學漢語多功能字庫" },
  如: { kind: "會意", meaning: "古字形從「女」和「口」，古義為順從或跟隨，後來也常用來表示如同、好像。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A6%82", sourceTitle: "香港中文大學漢語多功能字庫" },
  奔: { kind: "會意", meaning: "金文上方像人揚臂奔跑，下方重疊的足形提示腳步急促。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A5%94", sourceTitle: "香港中文大學漢語多功能字庫" },
  妥: { kind: "會意", meaning: "古文字以「爪」表示手，以「女」表示女子。有一說把這個形象解作以手安撫女子，引申為安定、妥當。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A6%A5", sourceTitle: "香港中文大學漢語多功能字庫" },
  奪: { kind: "會意", meaning: "古文字用手形和「隹」描畫伸手從他人懷中搶取鳥，提示搶奪。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A5%AA", sourceTitle: "香港中文大學漢語多功能字庫" },
  奮: { kind: "會意", meaning: "一種金文解讀以「隹」表示鳥、「田」表示田野，描畫鳥從田中振翅飛起，可以聯想到奮起。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A5%AE", sourceTitle: "香港中文大學漢語多功能字庫" },
  契: { kind: "分化字", meaning: "上方的「㓞」是早期字形，提示刻劃。後來加「大」寫成「契」，也可用來表示刻下的憑證或約定。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A5%91", sourceTitle: "香港中文大學漢語多功能字庫" },
  奏: { kind: "會意", meaning: "一種甲骨文解讀把「廾」看作雙手，捧著有裝飾的器具，提示祭禮中的樂舞。另有以雙手收集樹汁的解讀。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A5%8F", sourceTitle: "香港中文大學漢語多功能字庫" },
  央: { kind: "會意", meaning: "一種甲骨文和金文的解讀把「大」看作正面的人形，頸部的外框像枷鎖，提示災殃的古義。今天常用於「中央」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A4%AE", sourceTitle: "香港中文大學漢語多功能字庫" },
  多: { kind: "會意", meaning: "甲骨文以兩個肉形提示數量多。肉形與「夕」形後來混同，今字看起來像兩個「夕」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A4%9A", sourceTitle: "香港中文大學漢語多功能字庫" },
  天: { kind: "指事", meaning: "古文字以「大」描畫正面站立的人，頭頂的記號後來寫成一橫，提示頭頂，再引申為頭頂上方的天空。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%A4%A9", sourceTitle: "香港中文大學漢語多功能字庫" },
  夫: { kind: "會意", meaning: "《說文》把「大」看作人形，把頭上的一橫看作簪子，用來提示成年男子。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=9255", sourceTitle: "教育部《異體字字典》" },
  因: { kind: "會意", meaning: "一種早期字形解讀把「大」看作人、外框看作包裹人的衣物。後來借「因」表示原因、因為。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%9B%A0", sourceTitle: "香港中文大學漢語多功能字庫" },
  喜: { kind: "會意", meaning: "「壴」像鼓，「口」提示唱歌，合起來像擊鼓唱歌作樂，表示歡喜。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%96%9C", sourceTitle: "香港中文大學漢語多功能字庫" },
  品: { kind: "會意", meaning: "三個「口」在古字形中表示多個器皿，可聯想到擺放多種祭品，提示種類繁多。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%93%81", sourceTitle: "香港中文大學漢語多功能字庫" },
  命: { kind: "會意", meaning: "古文字由「令」加「口」分化而來。倒口和跪坐的人形提示向人發號施令，後來也表示天命和生命。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%91%BD", sourceTitle: "香港中文大學漢語多功能字庫" },
  各: { kind: "會意", meaning: "古文字上方像朝下的腳，下方像洞穴，合起來提示人步入洞穴、到達某處。今天多用來表示各自、每一個。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%90%84", sourceTitle: "香港中文大學漢語多功能字庫" },
  向: { kind: "會意", meaning: "依一種甲骨文解讀，屋形和「口」合起來提示在屋內發聲產生的回響。後來借「向」來表示方向。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%90%91", sourceTitle: "香港中文大學漢語多功能字庫" },
  合: { kind: "會意", meaning: "甲骨文和金文以器皿和蓋子相合的形象，提示合在一起，後來也表示聚合。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%90%88", sourceTitle: "香港中文大學漢語多功能字庫" },
  名: { kind: "會意", meaning: "依《說文》的解讀，「夕」提示天黑，「口」提示開口說話。天黑看不清人時，說出名字讓對方辨認。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%90%8D", sourceTitle: "香港中文大學漢語多功能字庫" },
  再: { kind: "會意", meaning: "《說文》把篆文分析為「一」和省寫的「冓」，用一次再加一次來解釋重複。更早的甲骨文、金文構形仍有不同解讀。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%86%8D" },
  勾: { kind: "分化字", meaning: "「勾」曾是「句」的異體，後來常用「勾」表示彎曲、鉤住，用「句」表示語句。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=4461&la=0", sourceTitle: "教育部《異體字字典》" },
  侃: { kind: "會意", meaning: "《說文》用「信」的古字和「川」解釋剛直，取河水日夜不停流動的意思。今字右下方是「川」的變形。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=1210&powerMode=2&q=1", sourceTitle: "教育部《異體字字典》" },
  丐: { kind: "會意", meaning: "今字也有「匄」和「匃」等寫法。《說文》用流離的人向人求助來解說古字，提示乞求的意思。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=39&la=0", sourceTitle: "教育部《異體字字典》" },
  予: { kind: "分化字", meaning: "一種字源解讀認為「予」由古文字的「呂」分化而來。上方的古字形後來變成近似「龴」，下方演變成帶鉤的筆畫。今字用於「給予」，古文也可用來表示「我」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BA%88", sourceTitle: "香港中文大學漢語多功能字庫" },
  卡: { kind: "會意", meaning: "字形由「上」和「下」合在一起，省去一橫。可用上、下兩面夾住東西來記「卡住」；「卡車」的「卡」則是英語音譯。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=4805", sourceTitle: "教育部《異體字字典》" },
  佩: { kind: "會意", meaning: "金文用人形和巾形提示人身上佩著巾，這是「佩戴」的原義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BD%A9", sourceTitle: "香港中文大學漢語多功能字庫" },
  侯: { kind: "會意", meaning: "甲骨文和金文用箭矢與箭靶提示射箭所用的靶子，後來也用作爵位名稱。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BE%AF", sourceTitle: "香港中文大學漢語多功能字庫" },
  丞: { kind: "會意", meaning: "古文字以雙手、跪坐的人和土坑，提示從坑中把人救出，後引申為幫助、輔佐。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%B8%9E", sourceTitle: "香港中文大學漢語多功能字庫" },
  什: { kind: "會意", meaning: "「亻」表示人，「十」表示數量，合起來提示十人為一組。這個用法讀ㄕˊ，「什麼」的「什」則讀ㄕㄣˊ。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=766", sourceTitle: "教育部《異體字字典》" },
  區: { kind: "會意", meaning: "「匸」表示藏放物品的空間，「品」在裡面。古字提示把物品藏在一處，後來也用來表示區域。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8D%80", sourceTitle: "香港中文大學漢語多功能字庫" },
  危: { kind: "會意", meaning: "戰國字形像人站在高高的山頂，提示處境危險。今字上方仍可用站在高處的形象來聯想。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8D%B1", sourceTitle: "香港中文大學漢語多功能字庫" },
  卓: { kind: "會意", meaning: "《說文》以「早」和「匕」組成篆文，釋為高。有一種解讀把「匕」視為「比」，以較早而超出後來者來說明「高出」的意思。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=-4718&la=0", sourceTitle: "教育部《異體字字典》" },
  冤: { kind: "會意", meaning: "「兔」在覆蓋物「冖」下，提示蜷縮、無法舒展。後來引申為受委屈。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%86%A4", sourceTitle: "香港中文大學漢語多功能字庫" },
  兼: { kind: "會意", meaning: "金文以手形「又」拿著兩把「禾」，提示同時兼顧兩件事。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%85%BC", sourceTitle: "香港中文大學漢語多功能字庫" },
  原: { kind: "會意", meaning: "「厂」像岩崖，裡面早期寫作「泉」，合起來提示泉水從岩穴流出。字義由水的源頭引申為事物的起源。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8E%9F", sourceTitle: "香港中文大學漢語多功能字庫" },
  厚: { kind: "會意", meaning: "《說文》以「厂」提示山崖，配合表示厚的古字形，解作山陵的深厚。今字內部寫成上「日」下「子」。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?educode=A00460", sourceTitle: "教育部《異體字字典》" },
  勞: { kind: "會意", meaning: "一種甲骨文解讀以火和衣物提示在火光下縫衣的辛苦。今字下方的「力」可用來聯想費力工作。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8B%9E", sourceTitle: "香港中文大學漢語多功能字庫" },
  協: { kind: "會意", meaning: "古文字以多人持農具耕作、狗在旁看守提示合作。今字右側的「劦」由三個「力」組成，可聯想到大家同心出力。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8D%94", sourceTitle: "香港中文大學漢語多功能字庫" },
  反: { kind: "會意", meaning: "一種甲骨文解讀把「厂」看作山崖，「又」看作手，合起來像人伸手攀崖。這個古義後來另用「扳」表示。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8F%8D", sourceTitle: "香港中文大學漢語多功能字庫" },
  古: { kind: "會意", meaning: "一種甲金文解讀把上方看作盾牌，與下方的「口」合起來提示堅固。今字上方形似「十」，常用來表示久遠的時代。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8F%A4", sourceTitle: "香港中文大學漢語多功能字庫" },
  印: { kind: "會意", meaning: "古文字的「爪」或「又」表示手，「卩」表示跪坐的人，合起來提示用手向下按壓。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8D%B0", sourceTitle: "香港中文大學漢語多功能字庫" },
  即: { kind: "會意", meaning: "早期字形的「皀」畫出盛食物的器皿，「卩」畫出跪坐的人，合起來提示靠近食器用餐，因此引申為接近。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8D%B3", sourceTitle: "香港中文大學漢語多功能字庫" },
  半: { kind: "會意", meaning: "古文字以「八」表示分開，以「牛」表示被分割的牛，合起來提示分成兩半。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8D%8A", sourceTitle: "香港中文大學漢語多功能字庫" },
  占: { kind: "會意", meaning: "古文字上方的「卜」提示占卜所見的裂紋，下方的「口」提示說出判斷，合起來表示依卜兆判斷吉凶。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8D%A0", sourceTitle: "香港中文大學漢語多功能字庫" },
  前: { kind: "會意", meaning: "金文用腳和鞋的形象表示穿鞋向前走，提示前進的原義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%89%8D", sourceTitle: "香港中文大學漢語多功能字庫" },
  加: { kind: "會意", meaning: "一種構形解讀把「力」看作耕作的農具，把「口」看作用力時張口呼喝，合起來提示加把勁。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8A%A0", sourceTitle: "香港中文大學漢語多功能字庫" },
  匠: { kind: "會意", meaning: "「匚」像盛放物品的容器，「斤」是砍削木材的工具，合起來可聯想到使用工具的木工。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%8C%A0", sourceTitle: "香港中文大學漢語多功能字庫" },
  則: { kind: "會意", meaning: "金文以「鼎」和「刀」表示在鼎上刻下規範。今字左側寫作「貝」，右側「刂」保留刀的線索。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%89%87", sourceTitle: "香港中文大學漢語多功能字庫" },
  制: { kind: "會意", meaning: "《說文》以「未」和「刀」說明裁斷的意思。今字右側的「刂」是刀的變形。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=3629", sourceTitle: "教育部《異體字字典》" },
  別: { kind: "會意", meaning: "甲骨文用刀形和骨形表示把骨肉分開。今字右側的「刂」保留刀形，字義後來引申為分別和離別。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%88%A5", sourceTitle: "香港中文大學漢語多功能字庫" },
  刪: { kind: "會意", meaning: "「冊」表示簡冊，「刂」是刀的變形，合起來提示用刀削去竹簡上寫錯的字，後來泛指刪除。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%88%AA", sourceTitle: "香港中文大學漢語多功能字庫" },
  初: { kind: "會意", meaning: "「衤」表示衣料，「刀」用來裁切。裁衣是製作衣服的第一步，字義引申為開始。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%88%9D", sourceTitle: "香港中文大學漢語多功能字庫" },
  利: { kind: "會意", meaning: "「禾」表示穀物，「刂」是刀的變形。甲骨文畫出用刀割禾收成。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%88%A9", sourceTitle: "香港中文大學漢語多功能字庫" },
  凸: { kind: "指事", meaning: "中間一段高出兩側，提示凸起。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%87%B8", sourceTitle: "香港中文大學漢語多功能字庫" },
  凹: { kind: "指事", meaning: "中間一段低於兩側，提示凹陷。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%87%B9", sourceTitle: "香港中文大學漢語多功能字庫" },
  乖: { kind: "會意", meaning: "《說文》把篆文拆為「𦫳」和「𠔁」。其中「𠔁」是「別」的古字，可以聯想到分離、背離。今字也常用來形容孩子聽話。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%B9%96" },
  事: { kind: "會意", meaning: "甲骨文畫出手持物品的樣子。「事」與「史」、「吏」、「使」的早期字形相近，後來分化出「事」來表示職事、要辦的事。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BA%8B", sourceTitle: "香港中文大學漢語多功能字庫" },
  倉: { kind: "會意", meaning: "古文字上方像屋頂，中間像門，下方像儲放穀物的坑，合起來提示糧倉。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%80%89", sourceTitle: "香港中文大學漢語多功能字庫" },
  具: { kind: "會意", meaning: "甲骨文用「廾」畫出雙手捧著盛食物的「鼎」，提示準備食物，後來也用來表示備有、具備。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%85%B7", sourceTitle: "香港中文大學漢語多功能字庫" },
  亡: { kind: "指事", meaning: "一種古文字解讀認為，短畫標出刀鋒的位置，提示鋒芒。後來借用「亡」表示逃亡、死亡等意思。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BA%A1", sourceTitle: "香港中文大學漢語多功能字庫" },
  令: { kind: "會意", meaning: "古文字上方的「亼」像朝下的口，下方的「卩」像跪坐的人，合起來提示向下發號施令。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BB%A4", sourceTitle: "香港中文大學漢語多功能字庫" },
  丟: { kind: "會意", meaning: "可依「一」和「去」來理解，「去」提示物品離開，整個字表示扔掉、拋棄。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%B8%9F", sourceTitle: "香港中文大學漢語多功能字庫" },
  丈: { kind: "會意", meaning: "《說文》把「丈」解作手形「又」持著「十」，提示十尺為一丈，是古代的長度單位。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%B8%88" },
  丑: { kind: "會意", meaning: "甲骨文和金文用手形加上表示尖爪的筆畫，提示指爪的原義。後來借用作地支的第二位。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%B8%91", sourceTitle: "香港中文大學漢語多功能字庫" },
  之: { kind: "會意", meaning: "甲骨文以「止」描畫向外走的腳，以「一」表示地面，合起來提示離開原地、前往別處。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%B9%8B", sourceTitle: "香港中文大學漢語多功能字庫" },
  世: { kind: "會意", meaning: "有一種金文字源解讀認為，「世」取自「枼」的上半部，把樹枝上的葉子簡化成點或短橫，並從層疊的樹葉聯想到世代相續。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%B8%96", sourceTitle: "香港中文大學漢語多功能字庫" },
  中: { kind: "指事", meaning: "依《說文》的解讀，直豎「丨」從方框的中央穿過，指示中間的位置。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=159&la=1", sourceTitle: "教育部《異體字字典》" },
  丹: { kind: "指事", meaning: "依一種甲骨文字形的解讀，外框表示採礦的井，裡面的一點提示井中的紅色丹砂。這個字後來也用來表示紅色。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%B8%B9", sourceTitle: "香港中文大學漢語多功能字庫" },
  乒: { kind: "擬聲", meaning: "「兵」省去右下方的末筆成「乒」。整個字用來模仿物體碰撞的聲音，讀ㄆㄧㄥ。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=289&la=0", sourceTitle: "教育部《異體字字典》" },
  乓: { kind: "擬聲", meaning: "「兵」省去左下方的撇成「乓」。整個字用來模仿物體碰撞的聲音，讀ㄆㄤ。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=290&powerMode=2&q=1", sourceTitle: "教育部《異體字字典》" },
  先: { kind: "會意", meaning: "古文字上方用足形表示向前踏步，下方是人，合起來提示走在別人前面。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%85%88", sourceTitle: "香港中文大學漢語多功能字庫" },
  並: { kind: "會意", meaning: "古文字畫出兩個人並排站立，提示「並立」的意思，後來也用來表示一起。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%B8%A6", sourceTitle: "香港中文大學漢語多功能字庫" },
  乏: { kind: "指事", meaning: "一種金文解讀把「乏」與「正」對照。古字把最上方的橫畫改成斜畫，用來提示偏離正的位置。今字多用於「缺乏」、「疲乏」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%B9%8F", sourceTitle: "香港中文大學漢語多功能字庫" },
  伍: { kind: "會意", meaning: "「亻」表示人，「五」表示數量，合起來提示古代軍隊以五名士兵編成一伍。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BC%8D", sourceTitle: "香港中文大學漢語多功能字庫" },
  保: { kind: "會意", meaning: "古文字畫出大人背著小孩、用手托住的樣子，後來引申為照顧和保護。今字左邊是「亻」，右半保留了古文字的痕跡。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BF%9D", sourceTitle: "香港中文大學漢語多功能字庫" },
  內: { kind: "會意", meaning: "古文字外側是屋室的輪廓，裡面的「入」表示進去，合起來提示從外面走進屋內。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%85%A7", sourceTitle: "香港中文大學漢語多功能字庫" },
  全: { kind: "會意", meaning: "篆文從「入」和「玉」，原指純色的玉，後來引申為完整、完全。今字下方看起來像「王」，是「玉」在這個字裡的寫法。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%85%A8" },
  公: { kind: "會意", meaning: "《說文》把「八」解作背離，把「厶」解作私，合起來提示不偏私。甲骨文另有描畫甕形的解讀。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%85%AC" },
  件: { kind: "會意", meaning: "「亻」表示人，「牛」表示牛。《說文》以牛體大而可以分割來解釋「件」，原義是分開、分別。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BB%B6" },
  伏: { kind: "會意", meaning: "甲骨文像人伏在地上。後來的字形加入「犬」，有一說用狗伏在地上的樣子提示「伏」的意思。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BC%8F", sourceTitle: "香港中文大學漢語多功能字庫" },
  位: { kind: "會意", meaning: "「亻」表示人，「立」表示站立。兩個部件合起來提示人站立的地方，後來用來表示位置或地位。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BD%8D" },
  仰: { kind: "會意", meaning: "「亻」表示人，「卬」有向上望的意思。按《說文》的構形解讀，兩個部件合起來提示抬頭向上看。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BB%B0" },
  便: { kind: "會意", meaning: "「亻」表示人，「更」表示改變。《說文》以人遇到不便時改變做法來解釋這個字，原義指安適。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BE%BF" },
  仙: { kind: "會意", meaning: "今字以「亻」和「山」提示仙人的形象。古字另寫作「僊」，有不同的部件分析。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E4%BB%99", sourceTitle: "香港中文大學漢語多功能字庫" },
  麻: { kind: "會意", meaning: "「广」表示屋宇，「𣏟」提示整理麻的動作。《說文》以在屋下整理麻來解釋這個字，麻的纖維可用來織布。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%BA%BB" },
  音: { kind: "指事", meaning: "古文字在「言」下方的「口」內加上記號，表示聲音從口中發出。今字外觀看起來像上「立」下「日」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%9F%B3", sourceTitle: "香港中文大學漢語多功能字庫" },
  雷: { kind: "會意", meaning: "「雨」提示打雷常伴隨下雨。古文字用車輪滾動的聲響來比喻雷聲，並畫出閃電。今字下方的「田」形由古形簡化而來。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%9B%B7", sourceTitle: "香港中文大學漢語多功能字庫" },
  霍: { kind: "會意", meaning: "「雨」表示下雨，「隹」表示鳥。《說文》用雨中鳥飛的聲音解釋這個字，也可聯想到鳥飛得急速。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%9C%8D" },
  香: { kind: "會意", meaning: "《說文》以「黍」和「甘」解釋穀物煮熟後的香氣。現代字形的部件外觀近似上「禾」下「日」。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%A6%99" },
  魯: { kind: "會意", meaning: "甲骨文從「魚」和「口」。有一說認為「口」像盛魚的器皿，整體提示嘉美。現代下方寫作近似「日」的形狀。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%AD%AF", sourceTitle: "香港中文大學漢語多功能字庫" },
  鬧: { kind: "會意", meaning: "「市」表示市集，「鬥」提示爭鬥，合起來可聯想到人聲嘈雜的情景。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%AC%A7", sourceTitle: "香港中文大學漢語多功能字庫" },
  雀: { kind: "會意", meaning: "「小」表示體形小，「隹」表示鳥，合起來提示小鳥。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/searchShuowen.php?field=1%2C2%2C3%2C4%2C5%2C6%2C7&q=%E9%9B%80" },
  飧: { kind: "會意", meaning: "「夕」表示傍晚，「食」表示吃飯，合起來提示晚餐，也可泛指熟食。", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=50825&q=1" },
  步: {"kind":"會意","meaning":"兩個足形前後錯開，表示行走。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/1080.json"},
  友: {"kind":"會意","meaning":"兩個「又」都是手形，《說文》用雙手相交表示交友。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/1921.json"},
  采: {"kind":"會意","meaning":"上方的手形和下方的樹形合起來，表示用手採取。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/3775.json"},
  炎: {"kind":"會意","meaning":"兩個「火」上下重疊，表示火光向上。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/6500.json"},
  炙: {"kind":"會意","meaning":"肉在火上，表示用火烤肉。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/6550.json"},
  典: {"kind":"會意","meaning":"《說文》把古形解作把冊書放在架上，表示尊重經典。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/3007.json"},
  雙: {"kind":"會意","meaning":"《說文》以手持兩隻鳥表示成對。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/2355.json"},
  解: {"kind":"會意","meaning":"《說文》以刀分開牛角說明分解。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/2839.json"},
  本: {"kind":"指事","meaning":"在「木」的下方加一橫，指出樹根的位置。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/3544.json"},
  末: {"kind":"指事","meaning":"在「木」的上方加一橫，指出樹梢的位置。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/3549.json"},
  刃: {"kind":"指事","meaning":"在刀形上加記號，指出刀口。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/2800.json"},
  亦: {"kind":"指事","meaning":"在表示人形的「大」兩側加記號，指出腋下。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/6582.json"},
  森: {"kind":"會意","meaning":"三個「木」組合表示樹木繁多。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/3838.json"},
  好: {"kind":"會意","meaning":"《說文》以「女」和「子」的組合解釋美好的古義。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/8149.json"},
  牧: {"kind":"會意","meaning":"《說文》用「攴」和「牛」組合表示放養牛的活動。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/2060.json"},
  甘: {"kind":"指事","meaning":"《說文》把字形解作口中含一，提示可口、美味。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/3022.json"},
  寸: {"kind":"指事","meaning":"《說文》把字形解作手和一橫，並以離手一寸的寸口位置說明「寸」。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/1973.json"},
  算: {"kind":"會意","meaning":"《說文》用「竹」與「具」解釋計數的字形，另用「筭」記錄讀音。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/2996.json"},
  闖: {"kind":"會意","meaning":"「馬」在「門」內，《說文》以馬從門裡衝出的樣子說明字義，另用「郴」記錄讀音。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/7748.json"},
  料: {"kind":"會意","meaning":"《說文》以「斗」中盛「米」表示量取，另用「遼」記錄讀音。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/9445.json"},
  兀: {"kind":"指事","meaning":"《說文》用一橫在人形上表示高而頂端平，另用「敻」記錄讀音。","url":"https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/5431.json"},
  取: { kind: "會意", meaning: "《說文》以手取耳的古代情景解釋捕取，後來也泛指拿取。", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/1918.json" },
  看: { kind: "會意", meaning: "上方的手放在眼睛上方，配合下方的「目」表示觀看。", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/2166.json" },
  林: { kind: "會意", meaning: "兩個「木」組合，表示樹木聚集。", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/3830.json" },
  安: { kind: "會意", meaning: "《說文》以「女」在屋頂形的「宀」之下解釋安靜。", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/4557.json" },
  北: { kind: "會意", meaning: "《說文》以兩人背對背說明背向的古義。", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/5207.json" },
  孝: { kind: "會意", meaning: "上方承自「老」，下方是「子」。《說文》以子女承扶長輩說明孝。", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/5360.json" },
  苗: { kind: "會意", meaning: "上方「艹」和下方「田」合起來，表示田裡長出的草木。", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/543.json" },
  男: { kind: "會意", meaning: "《說文》以「田」和「力」合起來，說明古時男子出力耕田的字形解讀。", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/9162.json" },
  休: { kind: "會意", meaning: "《說文》以人靠著樹木的樣子表示休息。", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/3799.json" },
  吹: { kind: "會意", meaning: "「口」和表示張口出氣的「欠」合起來，提示用嘴把氣吹出。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%90%B9" },
  頃: { kind: "會意", meaning: "「頁」表示頭部，徐鉉等將「匕」解作偏斜依附的樣子，合起來提示頭部偏斜。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%A0%83" },
  鳴: { kind: "會意", meaning: "「口」和「鳥」共同提示鳥張嘴鳴叫的原義。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%B3%B4" },
  隻: { kind: "會意", meaning: "「又」描畫手，「隹」描畫鳥，合起來像手中持著一隻鳥。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%9A%BB" },
  集: { kind: "會意", meaning: "現代字形以「隹」和「木」表示鳥聚集在樹上。部分金文另加了提示讀音的部件。", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E9%9B%86" },
  付: { kind: "會意", meaning: "《說文》以手持物交給另一個人解釋「付」，原義是給予。", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/5034.json" },
  伐: { kind: "會意", meaning: "《說文》以人持戈的樣子表示攻擊，今字左側是人、右側是戈。", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/5142.json" },
  上: { kind: "指事", meaning: "以基準線上方的記號表示「在上面」。", url: "https://ctext.org/wiki.pl?if=gb&res=833941" },
  下: { kind: "指事", meaning: "以基準線下方的記號表示「在下面」。", url: "https://ctext.org/wiki.pl?if=gb&res=833941" },
  武: { kind: "會意", meaning: "《說文》以「止」和「戈」合起來解釋字義。", url: "https://ctext.org/wiki.pl?if=gb&res=833941" },
  信: { kind: "會意", meaning: "「人」和「言」合起來提示誠信。", url: "https://ctext.org/wiki.pl?if=gb&res=833941" },
  敗: { kind: "會意", meaning: "「攴」和「貝」合起來提示毀壞。", url: "https://github.com/shuowenjiezi/shuowen/blob/6553a350763ce4feca2c5d1cc2cad7e594dc2975/data/2033.json" },
};

const SOUND_DISPLAY_FORMS: Partial<Record<string, readonly [string, string]>> = {
  奉: ["丰", "𡗗"],
  外: ["月", "夕"],
  善: ["誩", "口"],
  傻: ["夋", "𡕩"],
  劉: ["丣", "卯"],
  剎: ["殺", "𣏂"],
  冠: ["元", "㝴"],
  受: ["舟", "冖"],
  亮: ["京", "亠口冖"],
  兩: ["㒳", "巾𠓜"],
  仁: ["人", "亻"],
  難: ["堇", "廿口夫"],
  黍: ["雨", "人氺"],
  飾: ["食", "飠"],
  電: ["申", "日乚"],
  雪: ["彗", "彐"],
  颳: ["𠯑", "舌"],
  青: ["井", "月"],
  頹: ["貴", "頁"],
  陳: ["申", "東"],
  荊: ["𠛬", "刑"],
  唐: ["庚", "广肀"],
  書: ["者", "日"],
  失: ["乙", "丿"],
  曰: ["乙", "一"],
  尚: ["向", "冋"],
  截: ["雀", "隹"],
  賊: ["則", "貝"],
  酬: ["𠷎", "州"],
  育: ["肉", "⺼"],
  候: ["矦", "丨矦"],
  愛: ["㤅", "爫冖心"],
  寺: ["之", "士"],
  成: ["丁", "𠃌"],
  纂: ["算", "𮅕"],
  覽: ["監", "臣𠂉一罒"],
  希: ["爻", "㐅𠂇"],
  布: ["父", "𠂇"],
  妖: ["芺", "夭"],
  微: ["𢼸", "𣁋"],
  責: ["朿", "龶"],
  賓: ["𡧍", "宀一𣥂"],
  貴: ["臾", "𠀐"],
  憂: ["𢚧", "㥑"],
  扎: ["乙", "乚"],
  然: ["肰", "𠂊冫犬"],
  盡: ["㶳", "𭴘"],
  狂: ["㞷", "王"],
  殺: ["杀", "㐅朮"],
  縛: ["專", "尃"],
  新: ["辛", "亲"],
  寶: ["缶", "𡩧"],
  寬: ["萈", "艹見丶"],
  呈: ["壬", "𡈼"],
  廷: ["壬", "𡈼"],
  往: ["㞷", "主"],
  枉: ["㞷", "王"],
  敷: ["尃", "旉"],
  風: ["凡", "几"],
  似: ["㠯", "以"],
  列: ["𡿪", "歹"],
  吃: ["气", "乞"],
  戴: ["𢦔", "𢦏"],
  栽: ["𢦔", "𢦏"],
  載: ["𢦔", "𢦏"],
  裁: ["𢦒", "𢦏"],
  勵: ["萬", "厲"],
  鋒: ["逢", "夆"],
  擊: ["毄", "𣪠"],
  繫: ["毄", "𣪠"],
  敦: ["𦎫", "享"],
  諄: ["𦎫", "享"],
  猴: ["矦", "侯"],
  癌: ["喦", "嵒"],
  摘: ["啻", "啇"],
  滴: ["啻", "啇"],
  敵: ["啻", "啇"],
  適: ["啻", "啇"],
  到: ["刀", "刂"],
  括: ["𠯑", "舌"],
  活: ["𠯑", "舌"],
  涵: ["圅", "函"],
  港: ["䢽", "巷"],
  滋: ["茲", "兹"],
  磁: ["茲", "兹"],
  濘: ["寕", "寧"],
  瘦: ["叜", "叟"],
  研: ["幵", "开"],
  簡: ["閒", "間"],
  聰: ["怱", "囪心"],
  達: ["羍", "𦍒"],
  鐵: ["𢧤", "𢧜"],
  關: ["𢇅", "𢇇"],
  養: ["羊", "𦍌"],
  餐: ["𣦻", "𣦼"],
  細: ["囟", "田"],
  翱: ["皐", "皋"],
  肖: ["小", "⺌"],
  荒: ["㠩", "巟"],
  話: ["𠯑", "舌"],
  讀: ["賣（𧸇）", "賣"],
  賞: ["尚", "𫩠"],
  起: ["巳", "己"],
  述: ["术", "朮"],
  遺: ["䝿", "貴"],
  還: ["瞏", "睘"],
  鞭: ["𠊳", "便"],
  急: ["及", "刍"],
  勤: ["𡏳", "堇"],
  德: ["㥁", "𢛳"],
  思: ["囟", "田"],
  備: ["𤰈", "𤰇"],
  億: ["𢡃", "意"],
  卻: ["𧮫", "谷"],
  恐: ["𢀜", "巩"],
  懇: ["豤", "貇"],
  應: ["𨿳", "䧹"],
  剪: ["歬", "前"],
  填: ["眞", "真"],
  嫂: ["叜", "叟"],
  巡: ["川", "巛"],
  形: ["幵", "开"],
};

export function structureClues(character: string, components: readonly string[] = []): CharacterStructureClues | null {
  const entry = (verified.entries as Partial<Record<string, { component: string; componentIndexes: number[]; explanation: string }>>)[character];
  const known = STRUCTURE_CLUES[character];
  if (["耶", "軟"].includes(character) && known?.sound) {
    const phonetic = character === "耶" ? "阝" : "欠";
    const index = components.indexOf(phonetic);
    return { ...known, sound: { ...known.sound, componentIndexes: index < 0 ? [] : [index] } };
  }
  if (character === "迴" && known?.meaning) {
    const index = components.indexOf("辶");
    return { ...known, meaning: { ...known.meaning, componentIndexes: index < 0 ? [] : [index] } };
  }
  if (["旁", "皆"].includes(character) && known?.sound) {
    const phonetic = character === "旁" ? "方" : "比";
    const index = components.indexOf(phonetic);
    return { ...known, sound: { ...known.sound, componentIndexes: index < 0 ? [] : [index] } };
  }
  if (["葬", "床"].includes(character) && known?.meaning) {
    const meaningIndex = components.indexOf(character === "葬" ? "死" : "木");
    return { ...known, meaning: { ...known.meaning, componentIndexes: meaningIndex < 0 ? [] : [meaningIndex] } };
  }
  if (character === "主" && components.join("|") === "亠|土" && known?.meaning) {
    return { ...known, meaning: {
      ...known.meaning,
      explanation: `${known.meaning.explanation} 部件圖以「亠」所在的上格標示《說文》所說的火炷位置。`,
      componentIndexes: [0],
    } };
  }
  if (character === "陣" && components.join("|") === "阝|車" && known?.sound && known.meaning) {
    return {
      sound: { ...known.sound, componentIndexes: [1] },
      meaning: { ...known.meaning, componentIndexes: [0] },
    };
  }
  if (["身", "言", "者"].includes(character) && known) return known;
  if (character === "食" && known) return known;
  if (character === "去" && components.join("|") === "土|厶" && known) return known;
  if (character === "員" && components.join("|") === "口|貝" && known) return known;
  if (character === "句" && components.join("|") === "勹|口" && known) return known;
  if (character === "修" && components.join("|") === "亻丨|夂|彡" && known?.sound && known.meaning) {
    return { sound: { ...known.sound, componentIndexes: [0, 1] },
      meaning: { ...known.meaning, componentIndexes: [2] } };
  }
  type ClueRow = { component?: string; semanticComponent?: string; sourceUrl?: string; sourceTitle?: string; pictograph?: boolean; meaning?: string; alsoPhonetic?: boolean; displayedSound?: string; soundVariant?: boolean; displayedSemantic?: string[]; additionalSources?: { title: string; url: string }[] };
  const audited = (soundAudit as Record<string, ClueRow>)[character];
  const historical = !audited?.component
    ? (shuowen as Partial<Record<string, ClueRow>>)[character]
    : undefined;
  const nonPhonetic = SHUOWEN_NON_PHONETIC[character];
  if (nonPhonetic && !known && !entry && !audited?.component) {
    const sources = [{ title: nonPhonetic.sourceTitle ?? "《說文解字》數位文本", url: nonPhonetic.url }, ...(nonPhonetic.additionalSources ?? [])];
    return {
      sound: {
        title: nonPhonetic.sourceTitle ? `一種字源解讀：${nonPhonetic.kind}` : `依《說文》，這是${nonPhonetic.kind}字`,
        explanation: "依這項字源解讀，沒有獨立提示讀音的聲符。",
        componentIndexes: [],
        sources,
      },
      meaning: {
        title: "字形提供意義線索",
        explanation: nonPhonetic.meaning,
        componentIndexes: [],
        sources,
      },
    };
  }
  const row = historical || audited;
  if (character === "嚮" && row?.sourceUrl) {
    const index = components.indexOf("向");
    const componentIndexes = index < 0 ? [] : [index];
    const sources = [{ title: row.sourceTitle ?? "教育部《異體字字典》", url: row.sourceUrl }];
    return {
      sound: {
        title: "下方的「向」提供今音線索",
        explanation: "「嚮」和「向」在現代國語都讀ㄒㄧㄤˋ，可用下方的「向」記住讀音。",
        componentIndexes,
        sources,
      },
      meaning: {
        title: "下方的「向」提示朝向",
        explanation: "「嚮」有面對、朝向的意思，和「向」相通，例如「嚮往」。",
        componentIndexes,
        sources,
      },
    };
  }
  const equivalentForms: Record<string, string[]> = {
    艸: ["艹", "艸"], 水: ["氵", "水"], 手: ["扌", "手"],
    心: ["忄", "⺗", "㣺", "心"], 玉: ["王", "玉"], 辵: ["辶", "辵"],
    犬: ["犭", "犬"], 衣: ["衤", "衣"], 示: ["礻", "示"],
    人: ["亻", "人"], 糸: ["糹", "糸"], 肉: ["⺼", "肉"],
    足: ["𧾷", "足"], 攴: ["攵", "攴"], 刀: ["刂", "刀"],
    食: ["飠", "食"], 火: ["灬", "火"], 网: ["罒", "㓁", "网"],
    仌: ["冫", "仌"], 歺: ["歹", "歺"],
    "⺮": ["竹", "⺮"], 釒: ["金", "釒"],
    木: ["朩", "木"], 卩: ["㔾", "卩"],
  };
  const semanticForms = row?.semanticComponent
    ? equivalentForms[row.semanticComponent] || [row.semanticComponent]
    : [];
  const semanticIndex = components.findIndex((component, index) => {
    if (semanticForms.some(form => form.normalize("NFC") === component.normalize("NFC"))) return true;
    if (character === "青" && row?.semanticComponent === "生" && component === "龶") return true;
    if (character === "書" && row?.semanticComponent === "聿" && component === "𦘒一") return true;
    if (character === "失" && row?.semanticComponent === "手" && component === "夫") return true;
    if (character === "尚" && row?.semanticComponent === "八" && component === "⺌") return true;
    if (character === "截" && row?.semanticComponent === "戈" && component === "𢦏") return true;
    if (character === "賊" && row?.semanticComponent === "戈" && component === "戎") return true;
    if (character === "羞" && row?.semanticComponent === "羊" && component === "𦍌丿") return true;
    if (character === "雜" && row?.semanticComponent === "衣" && component === "𠅃") return true;
    if (character === "屬" && row?.semanticComponent === "尾" && component === "尸丨丷八") return true;
    if (character === "然" && row?.semanticComponent === "火" && component === "灬") return true;
    if (index === 0 && character === "肌" && row?.semanticComponent === "肉" && component === "月") return true;
    if (index === 0 && ["胸", "腿", "膝", "臉"].includes(character) && row?.semanticComponent === "月" && component === "⺼") return true;
    if (index === 0 && character === "覆" && row?.semanticComponent === "襾" && component === "覀") return true;
    if (index === 1 && character === "聚" && row?.semanticComponent === "乑" && component === "人亻人") return true;
    if (index === 1 && character === "舉" && row?.semanticComponent === "手" && component === "二丨") return true;
    if (index === 1 && character === "風" && row?.semanticComponent === "虫" && component === "䖝") return true;
    if (component !== "阝" || components.length !== 2) return false;
    return index === 0
      ? row?.semanticComponent === "阜" || row?.semanticComponent === "𨸏"
      : row?.semanticComponent === "邑";
  });
  const displayedSemanticIndexes = row?.displayedSemantic?.map(part => components.indexOf(part));
  const splitSemanticIndexes = character === "歲" && row?.semanticComponent === "步" && components.join("|") === "止|戌|𣥂"
    ? [0, 2]
    : character === "延" && row?.semanticComponent === "㢟" && components.join("|") === "廴|丿|止"
    ? [0, 2]
    : ["岸", "崖"].includes(character) && row?.semanticComponent === "屵" &&
    components.length === 3 && components[0] === "山" && components[1] === "厂"
    ? [0, 1]
    : character === "臨" && row?.semanticComponent === "臥" && components.join("|") === "臣|𠂉|品"
    ? [0, 1]
    : character === "簸" && row?.semanticComponent === "箕" && components.join("|") === "竹|其|皮"
    ? [0, 1]
    : row?.semanticComponent === "行" &&
    ["術", "街", "衝"].includes(character) && components[0] === "彳" && components[2] === "亍"
    ? [0, 2]
    : row?.semanticComponent === "衣" && ["衷", "裹"].includes(character) &&
      components[0] === "亠" && components[2] === "𧘇"
      ? [0, 2]
      : character === "從" && row?.semanticComponent === "辵" && components.join("|") === "彳|从|龰"
        ? [0, 2]
        : [];
  const sourceUrl = new URL("https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php");
  sourceUrl.searchParams.set("word", character);
  const citedSource = {
    title: row?.sourceTitle ?? (historical ? "《說文解字》數位文本" : "香港中文大學漢語多功能字庫"),
    url: row?.sourceUrl || sourceUrl.href,
  };
  const citedSources = [citedSource, ...(row?.additionalSources ?? [])];
  if (historical?.pictograph && !known && !entry) {
    return {
      sound: {
        title: historical.sourceTitle ? "依所引字源，這是象形字" : "依《說文》，這是象形字",
        explanation: "這項字源解讀以整體字形解釋原義，沒有另列提示讀音的聲符。",
        componentIndexes: [],
        sources: citedSources,
      },
      meaning: {
        title: "整體字形提供意義線索",
        explanation: historical.meaning ?? "依《說文解字》的象形解讀，可以從整體字形理解原義。",
        componentIndexes: [],
        sources: citedSources,
      },
    };
  }
  const generatedMeaning = row?.semanticComponent ? {
    title: character === "必" ? "兵器柄的古形提供意義線索" : character === "剎" ? "「刀」的字義作用未明" : `${historical ? "依《說文》，" : ""}「${row.semanticComponent}」提供意義線索`,
    explanation: character === "徵"
      ? "這裡採慧琳引字書的篆形解讀，以中下𡈼形參與徵召之義，說明有德者雖處微賤而聞達於朝廷，便受到徵召。教育部明確指出今字中下不是王，末橫應斜挑；不把這部分解成國王，也不把更早齒形、刀形的分析混入同一故事。"
      : character === "枴"
      ? "慧琳以老人用來支撐行走的杖解釋枴，並記從木；左側木旁可聯繫杖的木製材質。這裡說的是枴杖，不把右側口形解成嘴巴，也不套用船、樹枝等另造的故事。"
      : character === "這"
      ? "依季旭昇論文所引古義，辵旁（今寫辶）可聯繫前去迎接、接見的動作；不是說走路時講話，也不是用辶直接解釋今天這個、這裡的指示詞義。古今用法須分開理解。"
      : character === "禽"
      ? "《說文》用禸（厹）的獸跡形參與表意，解作走獸總名；後來禽也可泛指獵物、鳥獸，或專指鳥類。教育部說明今字是人下作离，最下方仍為禸；這不是人加離開的故事。古今部件的完整對應仍待核對，不把整個离都當作獸跡。"
      : character === "濬"
      ? "依慧琳引《文字典說》的分析，左側氵（水）參與表意；同條引孔氏注說濬是深，可聯繫水深、疏濬等用法。右側睿在這項分析中提示讀音，不取聰明義。"
      : character === "真"
      ? "依字庫引何琳儀、謝明文的解讀，古字用貝或形近的鼎參與表意，可能原記珍貴，部分字形另加丌。今字下格具形是這些下部構件演變後的區域，不是取工具義。《說文》另有仙人登天的篆形說，不能把兩說合成同一故事，也不直接從貝推得真假的真。"
      : character === "沒"
      ? "左邊氵是水旁，提示沉入水中、淹沒的原義。後來另有消失、沒有等用法，不能把每個沒字都直接解成水。右旁依段注本作聲符，其上部寫法不是殳，也不取刀的切割義。"
      : character === "做"
      ? "依黃氏从人的分析，左側亻參與表意，可聯繫人所進行的工作、活動及製作等用法。做是作的後起寫法，不能把右側故解成故事，編成一個人講故事的字源。"
      : character === "必"
      ? "依字庫所述，早期字形描畫兵器的柄，後來才在兩側加八提示讀音；借作必須後，又加木分化為柲。今字看似心與撇交疊，不是心情加一撇，也不能把後起的完整柲字當成今字裡已存在的部件。"
      : character === "重"
      ? "依柯昌濟、何琳儀的解讀，古字像人背負囊袋，提示沉重；囊袋形東同時兼任聲符。後來人與東共用中豎等筆畫，部分字形又加土表示站立地面，今字不能把每一筆都按獨立的人、東分格。"
      : character === "更"
      ? "于省吾把古字攴解作手持鞭，認為可能是鞭的初文；季旭昇另以兩丙相續解釋繼承義。這些是不同時代字形的解讀，字庫仍指出早期構形初義不明；今字分出的日、乂不直接等於古攴。"
      : character === "曳"
      ? "《說文》列申為形符，原義是牽引、拖曳；來源未詳述申形如何參與這項字義，不把它說成申請，也不自行推定今字哪一筆是手。古申形與聲符𠂆在今字中的交疊位置仍待核對。"
      : character === "裊"
      ? "字庫列下方衣為形符，說明柔軟美好，並列出長枝柔美、煙氣繚繞及搖曳等用法。這是衣旁參與表意的分析，不把上方鳥省形解作鳥在飛。"
      : character === "竊"
      ? "依《說文》，穴、米參與表意，解作從內部盜取。今字上方保留穴，左下米形上端改成撇畫而近似釆；這裡所指是米的演變形，不另套用釆的辨別義。右下禸形屬古聲符的省寫，不表示偷動物。"
      : character === "留"
      ? "《說文》明列田為形符，並以止解釋留；今字下方仍是田。後來有停留、挽留、保存等用法。這項字書說明沒有詳述田形如何引出止義，不另編造在田裡不離開等故事。"
      : character === "舍"
      ? "依字庫的金文解讀，余原來像簡易房屋，屋頂、樑柱參與表意，今字對應上方人形及中間干形；下方口形可能是分化符號，也有房屋地基的解讀。這裡不是人在說話或乾燥的意思。"
      : character === "散"
      ? "依《說文》的篆形解讀，左下肉旁提示雜肉的原義，教育部特別說明這裡是肉形，不是月亮。更早甲金文另有用工具清除草木等說，不能把篆形說當成唯一字源。"
      : character === "泰"
      ? "古字從雙手形廾和水，後來廾與大合寫成上格𡗗，下格氺仍是水形。因此兩格都含表意構件；《說文》解作滑，字庫指出古書未見這項用法，今天安泰、泰山等義不能直接從手水相加推得。"
      : character === "梁"
      ? "左上氵是水，下面朩是木，兩部分共同提示架在水上的木橋。右上刅用來表聲，不把氵也併入聲符。後來梁又指屋梁等橫向支撐物。"
      : character === "視"
      ? "右側「見」由眼睛和人形組成，提示用眼睛看。左側示旁在段注本的分析中作聲符，不在這裡解作祭祀義。"
      : character === "島"
      ? "下方「山」提示水中可以停留的山地，後泛指被水包圍的陸地；上方鳥省形主要作聲符，不是說每個島都因為有鳥才叫島。"
      : character === "度"
      ? "下方「又」是手形。依段玉裁的說明，古人以手、臂等身體長度作量度的標準，因此用手形提示量長短、定尺度。"
      : character === "庶"
      ? "依字庫所述古字，石和火共同提示把石頭燒熱以烹煮食物，石也兼表聲。今字石形變成广、廿，火形改作灬；庶民的眾多義是後來借用，不直接由屋下人多推導。"
      : character === "殼"
      ? "依教育部引《說文》的擊打義，右側殳提示拿器具擊打，並非直接提示蛋殼的外皮義。字庫另採几為構件、𣪊省聲解釋外皮義，兩項分析的部件作用不同，這裡不混成同一說法。"
      : character === "毫"
      ? "下方「毛」提示長而尖細的毛，後來又借作極小的長度、重量單位。它是義符，不把上方高的省形解作毛很高。"
      : character === "幹"
      ? "幹原是榦的俗寫；榦的木旁提示築牆時兩端支撐的木材。今字把這個位置寫成右下干形，不是以盾牌義解釋樹幹，後來又引申軀幹、主幹。"
      : character === "那"
      ? "右側的「阝」是邑字旁，提示古國、地名的原義。後來用作指示較遠事物的代詞，不能直接由邑旁解出今天「那個」的意思。"
      : character === "範"
      ? "依《說文》對古代出行祭祀的解讀，車旁提示駕車經過祭牲的儀式。後來範又表示模具、規範、榜樣，不能直接把今天的典範義解作車輛。"
      : character === "疆"
      ? "左下的「土」提示疆土與疆界。這個字在彊旁加土，用來專門表示邊界；彊旁中的畺形本身也源於田界，但在這項分析中，整個彊兼任聲符。"
      : character === "產"
      ? "下方的「生」提示出生、生育，後引申為出產、產物；上方省寫的彥形用來表聲，不把文或厂另解作產物。"
      : character === "麥"
      ? "依字庫引葉玉森的解讀，古字加倒腳形「夊」原要提示到來，後來反而用麥表示麥子。今字下方寫成夕形，是古倒腳形的演變，不表示傍晚。"
      : character === "幽"
      ? "這裡採《說文》從山中𢆶、解作隱蔽的說法，山與細絲形交疊。甲骨文字源另有火照細絲、表示幼細的解讀，不當成只有一種定論。"
      : character === "知"
      ? "依徐鍇、段玉裁以言詞解釋的說法，「口」提示說話，形容知理敏捷、出口切中事情。字庫也提到口可能是飾筆，這不是唯一的古字解讀。"
      : character === "衡"
      ? "中部古從角形與大（人形），今字改成近似𩵋形，不能直接當成魚。《說文》解作橫在牛角上的木頭，字庫指出更早構形初義仍有疑問。"
      : character === "豐"
      ? "依林澐的解讀，古字的「壴」像鼓，提示鼓聲宏大充盈，後有豐滿、豐厚義。今字下方訛為豆形，只是古鼓形演變後的位置，不表示豆子。"
      : character === "金"
      ? "古字以倒置斧鉞的王形和兩塊金屬餅的點畫，提示鑄器的金屬。今字下部的王丷形保留這些筆畫，不表示國王或數字八。"
      : character === "膚"
      ? "下方胃形的底部是「肉」（月形），提示皮肉；畫面把它與上方田形合在一格，實際表意線索在這格的肉形部分。"
      : character === "臺"
      ? "古字的「宀、室」提示建築物。今字中間冖形和下方至形對應室字的演變，兩格合看，提示高而平的臺。"
      : character === "第"
      ? "竹旁提示古代書冊、竹簡，漢典引《釋名》說因書冊的次第而加竹。今字常用於第一、第二等順序。"
      : character === "釜"
      ? "下方是省寫的「金」，提示金屬製的炊煮器具。畫面以王丷形標示剩餘筆畫，不直接取王或八的意思。"
      : character === "畝"
      ? "「田」提示田地面積，今字左半在田上加亠形，分格以「亩」呈現。上方筆畫與古字的十形有演變關係，不另當作聲符。"
      : character === "辨"
      ? "中間原是「刀」，提示切分、判別，今字改寫成一撇一點，畫面以丿丶示意，與辦字的力不同。"
      : character === "貌"
      ? "右側「皃」像人身和面容，上方白形表示臉，下方儿是人形，提示容貌、儀態；不是白色或兒童。"
      : character === "琴"
      ? "上方的玨形源自古文字的樂器形，字庫把它與瑟的形狀聯繫，提示琴瑟類的撥弦樂器，不直接表示兩塊玉。"
      : character === "致"
      ? "今字右側的夊形與古字的人形、腳形有演變關係，提示專程把東西送到，原義是致送、送到。"
      : character === "答"
      ? "依漢典所列原義，「竹」提示用竹子修補籬笆。回答、答謝是後來通用的字義，不能說竹直接提示說話回答。"
      : character === "法"
      ? "古字「灋」以水的平準提示刑法應當公平；今字省去神獸廌形，仍保留水旁，不能只理解成與河水活動有關。"
      : character === "營"
      ? "《說文》以「宮」提示圍繞而居的處所，今字下方省寫成「吕」，對應宮的內部，後引申營地、經營。"
      : character === "碧"
      ? "依梁東漢的分析，「石」提示玉石，本義是青綠色的玉石。另一種《說文》分析則把上方的玉也列為義符。"
      : character === "罪"
      ? "「网」（罒）提示原本捕魚竹網的意思；後來這個字被借來表示犯罪，不能把今天的罪行義硬套成原始字義。"
      : character === "義"
      ? "「羊」在這項字源解讀中引申提示美善，古字可能是「儀」的初文，表示威儀美盛，不直接表示一隻羊。"
      : character === "置"
      ? "篆文以「网」（罒）作義符，《說文》解作赦放。更早的字形另像雙手放物於架上；今字放置的常用義，不宜只按網子猜測。"
      : character === "習"
      ? "依唐蘭的古文字解讀，下方原是「日」，提示曬乾的本義，後來訛變成「白」；學習、習慣是借用義。"
      : character === "嗅"
      ? "「臭」在古文字中本來就可以表示用鼻子聞，也可表示氣味，因此兼有字義線索。"
      : character === "奉"
      ? "圖中下方的筆畫是「手」的變形，提示用手捧著、承接東西。"
      : character === "外"
      ? "一種古文字解讀以「卜」的直畫為界，裂紋伸向的一側是內，另一側是外。"
      : character === "困"
      ? "框內的「木」提示木製門檻的古義。"
      : character === "善"
      ? "上方保留古字的「羊」形，可聯想到美善和吉祥。"
      : character === "君"
      ? "「口」提示開口發號施令，與上方持杖、掌權的「尹」合起來表示君主。"
      : character === "劉"
      ? "「金」和右側的「刂」一起提示金屬刀具，古義與斧鉞或砍殺有關。今字常用作姓氏。"
      : character === "剎"
      ? "右側「刂」是「刀」的變形。《說文》新附記載「剎」有柱子的古義，但沒有確定「刀」如何提示這個意思。"
      : character === "乎" && row.semanticComponent === "小豎"
      ? "有一種古文字解讀把上方的小豎看作風吹樹枝發出的聲響。「乎」後來常用作語氣詞。"
      : character === "參" && row.semanticComponent === "𠫯"
      ? "古文字上方的三顆星對應今字的三個「厶」形，提示星宿「參宿」的古義。"
      : character === "匆" && row.semanticComponent === "心"
      ? "古字「悤」的「心」提示心裡急迫。今字「匆」已省去下方的「心」。"
      : character === "冥" && row.semanticComponent === "昗"
      ? "下方的「日」和「六」合為一組。《說文》把這一組解作太陽到了第六個時辰，天色轉暗。"
      : character === "冠" && row.semanticComponent === "冖"
      ? "上方「冖」對應古字的帽子形，提示「冠」原指帽子。"
      : character === "受" && row.semanticComponent === "𠬪"
      ? "上方「爫」和下方「又」代表兩隻手，提示一隻手把東西交給另一隻手。"
      : character === "亮" && row.semanticComponent === "儿"
      ? "下方的「儿」對應古字形中的人。有一種解讀以人處於高處來聯想光明、明亮。"
      : character === "兩" && row.semanticComponent === "巾𠓜"
      ? "下方對應古字「㒳」。古文字像車上成對的軛，後來借作數量詞「兩」。《說文》也以這個部件提示平分。"
      : character === "兢" && row.semanticComponent === "兄"
      ? "《說文》以兩個「兄」提示相爭的古義。今字省寫成左右兩個近似「克」的部件，今天常用「兢兢」表示謹慎。"
      : character === "仁" && row.semanticComponent === "二"
      ? "「二」與左側的「人」合起來提示人與人之間的親愛。"
      : character === "難" && row.semanticComponent === "隹"
      ? "「隹」提示鳥類。按《說文》的解釋，「難」原是一種鳥的名稱，後來借用來表示「困難」的意思。"
      : character === "黎" && row.semanticComponent === "人氺"
      ? "《說文》以「黍」提示用黍米做糊來黏鞋的古義。圖中下方標出「黍」可見的部分。"
      : character === "飾" && row.semanticComponent === "𠂉巾"
      ? "右邊上方是「人」的變形，下方是「巾」。《說文》用這兩個部件提示人用布刷拭物品的原義，後來也指裝扮、修飾。"
      : character === "屈" && row.semanticComponent === "尾"
      ? "《說文解字》以「尾」解釋無尾的古義，楷書畫面以外側的「尸」標示其對應位置。"
      : character === "每" && row.semanticComponent === "屮"
      ? "《說文解字》以「屮」提示草木茂盛向上生長的古義。這個部件在今天的楷書寫在上方。"
      : character === "服" && row.semanticComponent === "舟"
      ? "依《說文解字》，「服」從「舟」。教育部字典指出，現代楷書左側的「月」形是「舟」的變形。"
      : character === "乾" && row.semanticComponent === "乙"
      ? "教育部字典指出，右半寫得像「乞」，其中下方的「乙」是《說文》記載的形符。畫面標示包含「乙」的右半。"
      : character === "太"
      ? "「太」從「大」分化出來，保留程度很大的意思。下方的一點用來區分這兩個字。"
      : character === "智"
      ? "早期字形有一種解讀是大人把知識傳授給孩子，提示智慧。小篆還有「白」等部件，今字下方寫作「日」，它的獨立字義作用仍待核對。"
      : character === "替"
      ? "《說文解字》以「竝」表意，原義與廢置、退下有關。現代上方寫作兩個「夫」，畫面以「㚘」表示。"
      : character === "炭"
      ? "「火」提示木材經過燒製而成的燃料。畫面下格「灰」包含這個火形，整個下格不全是形符。"
      : character === "牽"
      ? "「牛」和引牛的繩索形合起來提示拉、挽。今字下方仍可清楚看到「牛」。"
      : character === "百"
      ? "早期在借音表示百數的「白」上加「一」，組成表示「一百」的合文。上方的一橫提示數量。"
      : character === "番"
      ? "高田忠周把「釆」解作手握種子，和下方「田」合起來聯想到在田裡播種。這是一種解讀，造字初義仍無定論。"
      : character === "皇"
      ? "古字上方像插有羽毛、用美玉裝飾的冠冕，後來寫成「白」形。「王」也提示王者所戴，原義是冠冕，後來引申為帝王。"
      : character === "望"
      ? "「望」和古字「朢」相通。古字描畫登高望遠，今字下方的「𡈼」保留了與人形相關的部件。"
      : character === "正"
      ? "下方「止」在古字中像腳，提示向目標前進。「正」是「征」的早期寫法，後來多用來表示端正、糾正。"
      : character === "查"
      ? "「查」原有山楂樹的用法，上方「木」提示樹木。今天「檢查」的意思是後來的用法。"
      : character === "梁"
      ? "《說文解字》以「木」和「水」提示水上的木橋。畫面的上格包含水旁，下格「朩」表示木。"
      : character === "寨"
      ? "下方的「木」提示木製柵欄，與防守用的營寨有關。畫面上的「朩」是這個部件的示意寫法。"
      : character === "師"
      ? "一種字源解讀把左側「𠂤」看作小土丘，聯想到軍隊據高處駐守。「師」早期表示軍隊，後來也表示教導他人的老師。"
      : character === "教"
      ? "甲骨文的「攴」像手持教鞭，和「子」及表示籌策的部件合起來提示教導孩子。今字右側寫作「攵」。"
      : character === "整"
      ? "金文有「束」、「攴」和「正」。今字上方的「敕」包含「束」與「攵」，配合下方「正」可聯想到把事物整治得端正。"
      : character === "或"
      ? "有一種古文字解讀把整體看作兵器。今字的「戈」形由早期器柄形演變而來。今天「或者」的用法則是借用這個字。"
      : character === "展"
      ? "張舜徽把「尸」解作人形，提示人躺臥時翻身的原義。後來「展」也用來表示舒展、展開。"
      : character === "差"
      ? "夏淥將早期金文解作用手搓麥去皮，認為它是「搓」的初文。畫面標出對應古字麥形和手形的上方區塊。金文也已用此字表示差錯。"
      : character === "喪"
      ? "《說文解字》把「喪」解作「哭」和「亡」會意。上方保留的兩個口形可聯想到哭泣，下方所對應的「亡」也提示失去。"
      : character === "千"
      ? "早期字形在「人」上加「一」，表示一千。畫面下方標出的區塊包含對應的橫畫。"
      : character === "夜"
      ? "古字的「夕」表示傍晚，也可指晚上，提示「夜」的本義。畫面標出含有古「夕」變形的下方區塊。"
      : character === "可"
      ? "《說文解字》把「可」解為肯定、應允，並列出「口」這個部件。可從「口」聯想到開口答應。甲骨文、金文的構形初義仍有不同解讀。"
      : character === "對"
      ? "依陳秉新的解讀，甲骨文畫的是手持工具開闢土地。現代字形右側的「寸」在這裡對應古字表示手的「又」。"
      : character === "將"
      ? "戰國字形右側包含「肉」和手形，描畫用手將肉陳列在几案上，提示陳列、進獻的原義。畫面標出這兩個部件所在的右半。"
      : character === "巷" && row.semanticComponent === "邑"
      ? "古字的「邑」提示聚落，整個字原指聚落中的小路。下方在現代楷書寫得像「巳」。"
      : historical?.displayedSemantic
      ? `《說文解字》以「${row.semanticComponent}」解釋原義，現代字形對應「${historical.displayedSemantic.join("、")}」。`
      : character === "防" && row.semanticComponent === "𨸏"
        ? "左側的「阝」是阜字旁，提示堤防的古義。《說文》也記錄了含「土」的異體。"
        : ["肌", "胸", "腿", "膝", "臉"].includes(character) && ["肉", "月"].includes(row.semanticComponent)
        ? "左側是肉字旁，提示這個字和身體部位有關。"
      : character === "虛" && row.semanticComponent === "丘"
        ? "「丘」提示大土丘的原義。部件示意寫作「丘」，它在現代楷書的「虛」字下方已變形。後來「虛」也表示空虛。"
        : meaningExplanation(row.semanticComponent),
    componentIndexes: character === "劉" && components.join("|") === "卯|金|刂" ? [1, 2]
      : character === "剎" ? []
      : character === "受" && components.join("|") === "爫|冖|又" ? [0, 2]
      : displayedSemanticIndexes?.every(index => index >= 0)
      ? displayedSemanticIndexes
      : semanticIndex < 0 ? splitSemanticIndexes : [semanticIndex],
    sources: citedSources,
  } : undefined;
  if (!entry) {
    if (known && ["銀", "謝", "觀", "察"].includes(character) && row?.component && row.semanticComponent) {
      return {
        ...known,
        sound: known.sound && {
          ...known.sound,
          componentIndexes: character === "謝" && components.includes("射")
            ? [components.indexOf("射")]
            : known.sound.componentIndexes,
          sources: citedSources,
        },
        meaning: known.meaning && { ...known.meaning, sources: citedSources },
      };
    }
    if (known || !row?.component) return generatedMeaning ? { ...known, meaning: known?.meaning || generatedMeaning } : known || null;
    const displayedSound = row.displayedSound ?? (row.component === "㕣" && "沿鉛船".includes(character) ? "儿口"
      : row.component === "尚" && "嘗堂常掌當".includes(character) ? "𫩠"
      : row.component);
    const reviewedForm = SOUND_DISPLAY_FORMS[character];
    const soundForms = [row.component, displayedSound];
    if (reviewedForm?.[0] === row.component) soundForms.push(reviewedForm[1]);
    const normalizedSoundForms = soundForms.map(part => part.normalize("NFC"));
    const index = components.findIndex(part => normalizedSoundForms.includes(part.normalize("NFC")));
    const splitSoundAtTop =
      (character === "舍" && row.component === "余" && components.join("|") === "人|干|口") ||
      (["度", "庶"].includes(character) && row.component === "石" && components.length === 3 && components[0] === "广" && components[1] === "廿") ||
      (character === "幹" && row.component === "倝" && components.join("|") === "𠦝|人|干") ||
      (character === "罰" && row.component === "詈" && components.join("|") === "罒|言|刂") ||
      (character === "炭" && row.component === "岸" && components.join("|") === "山|厂|火") ||
      (character === "產" && row.component === "彥" && components.join("|") === "文|厂|生") ||
      (character === "麥" && row.component === "來" && components.join("|") === "十从|人|夕") ||
      (character === "隨" && row.component === "𡐦" && components.join("|") === "阝|𠂇工月|辶") ||
      (character === "霸" && row.component === "䨣" && components.join("|") === "雨|革|月") ||
      (character === "隆" && row.component === "降" && components.join("|") === "阝|夂一|生") ||
      (character === "強" && row.component === "弘" && components.join("|") === "弓|厶|虫") ||
      (character === "桌" && row.component === "卓" && components.join("|") === "⺊|日|木") ||
      (character === "騰" && row.component === "朕" && components.join("|") === "月|龹|馬") ||
      (character === "賴" && row.component === "剌" && components.join("|") === "束|刀|貝") ||
      (character === "條" && row.component === "攸" && components.join("|") === "亻丨|攵|木") ||
      (character === "務" && row.component === "敄" && components.join("|") === "矛|攵|力") ||
      (character === "勝" && row.component === "朕" && components.join("|") === "月|龹|力");
    const splitSoundAroundWater =
      (character === "窪" && row.component === "窐" && components.join("|") === "穴|氵|圭") ||
      (character === "茫" && row.component === "芒" && components.join("|") === "艹|氵|亡") ||
      (character === "蕩" && row.component === "𦳝" && components.join("|") === "艹|氵|昜");
    const splitSoundAroundSpeech = character === "藹" && row.component === "葛" && components.join("|") === "艹|言|曷";
    const splitSaltSound = character === "鹽" && row.component === "監" && components.join("|") === "臣𠂉|鹵|皿";
    const splitRightAndBottomSound =
      (character === "渠" && row.component === "榘" && components.join("|") === "氵|巨|朩") ||
      (["撤", "澈"].includes(character) && row.component === "徹" && components.length === 3 && components[1] === "育" && components[2] === "攵") ||
      (character === "茶" && row.component === "余" && components.join("|") === "艹|人|朩") ||
      (character === "雜" && row.component === "集" && components.join("|") === "𠅃|木|隹") ||
      (character === "染" && row.component === "杂" && components.join("|") === "氵|九|木") ||
      (character === "聖" && row.component === "呈" && components.join("|") === "耳|口|𡈼") ||
      (character === "準" && row.component === "隼" && components.join("|") === "氵|隹|十");
    const splitSoundAcrossSides =
      (character === "散" && row.component === "𢽳" && components.join("|") === "龷|⺼|攵") ||
      (character === "疆" && row.component === "彊" && components.join("|") === "弓|土|畺") ||
      (character === "範" && row.component === "笵" && components.join("|") === "竹|車|㔾") ||
      (character === "衡" && row.component === "行" && components.join("|") === "彳|𩵋|亍") ||
      (character === "粥" && row.component === "䰜" && components.join("|") === "弓|米|弓") ||
      (character === "發" && row.component === "癹" && components.join("|") === "癶|弓|殳") ||
      (character === "穎" && row.component === "頃" && components.join("|") === "匕|禾|頁") ||
      (character === "穀" && row.component === "𣪊" && components.join("|") === "士冖一|禾|殳") ||
      (character === "雖" && row.component === "唯" && components.join("|") === "口|虫|隹") ||
      (character === "類" && row.component === "頪" && components.join("|") === "米|犬|頁");
    const splitClothingSound = character === "哀" && row.component === "衣" && components.join("|") === "亠|口|𧘇";
    const splitSound = row.component === "辡" && ["辦", "辮", "辨", "瓣"].includes(character) &&
      components.length === 3 && components[0] === "辛" && components[2] === "辛";
    const soundExplanation = character === "徵" && row.component === "微"
      ? "慧琳明列微省聲。今字左側彳、中上山與短橫、右側攵合看是省寫聲符的區域，中下𡈼另參與表意，不屬於聲符；不能只圈彳或攵就說是微。微、徵的古音聯繫不表示國語讀音相同。"
      : character === "枴" && row.component === "叧"
      ? "慧琳的枴行條記從木、另聲，並將該聲符注為誇寡反；CBETA把字頭異形規範作枴。今字右側是口下刀的叧形，整格作讀音線索，不拆成口聲或刀聲，也不是照現代另字的ㄌㄧㄥˋ來念。"
      : character === "這" && row.component === "言"
      ? "季旭昇明列這從辵、言聲，並引《廣韻》魚變切、解作迎；右側言提示這項古代讀音。這不是說現代國語的這要讀作言，也不把言的說話義當作本字的造字故事。"
      : character === "禽" && row.component === "今"
      ? "《說文》明列今聲，是古字中的讀音線索。教育部今字寫法為人下作离，已不直接呈現完整的今；尚未確認每筆的演變對應，因此不把上方人形冒充整個今聲，也不能按今的國語讀音直接讀禽。"
      : character === "濬" && row.component === "睿"
      ? "這裡採慧琳《一切經音義》引《文字典說》的從水睿聲說，今字右側整個睿作聲符。這是該字書的構形分析；濬的ㄐㄩㄣˋ與睿的ㄖㄨㄟˋ今音不同，不能照睿的今音直接讀濬，也不把睿的每個小部件另當聲符。"
      : character === "真" && row.component === "𠂈"
      ? "字庫以金文上部𠂈作聲符，說明它與殄、顛的古字音相關。教育部記今字上部已改寫為十；因此上格只標示古上部演變後的位置，不是說數字十的今音可讀成真，也不把十的每筆當作完整的古聲符。"
      : character === "沒" && row.component === "𠬸"
      ? "這裡採段注本《說文》的𠬸聲說，今字右旁改寫為𠬛，整個右格對應聲符。教育部指明其上端是一撇與橫折鉤，撇在外，不作刀；大徐本另列從殳，與段注本不同。聲符先聯繫沉沒的ㄇㄛˋ音，不直接推成沒有的ㄇㄟˊ音。"
      : character === "做" && row.component === "故"
      ? "黃氏在〈粵語解密：做〉明列右側故作聲符，並以古代暮韻討論做字的讀音及其與作的關係。這是具名的歷史音韻分析，不表示故與做今天的國語聲母相同，也不能按故的今音直接念做。"
      : character === "裊" && row.component === "鳥"
      ? "字庫明列鳥聲省。上方是鳥的省寫，畫面以「鳥省」作部件名稱而不是補成完整鳥字；裊和鳥的常用國語音同為ㄋㄧㄠˇ，可用來記讀音。"
      : character === "竊" && row.component === "禼"
      ? "右下⺊、𠔿、禸形合看，是古聲符禼省寫後的所在區域；禸的筆畫還有本字專用寫法，不把禸單獨當聲符。《說文》另記廿亦聲，今標準字已省去，不能在畫面另圈出廿；古音也不等於各部件的今音。"
      : character === "留" && row.component === "丣"
      ? "教育部引《說文》以丣作聲符，並說明今字上半由丣變易而來；畫面上方𠂎、刀形合成的區域對應古聲符，不是把刀獨立當聲符，也不依丣或刀的今音直接推讀留。"
      : character === "舍" && row.component === "余"
      ? "依字庫的金文分析，余兼提示古音。今字余形改寫成上方人形及中間干形，兩格合看才是歷史聲符的對應區域，不按人、干的今音分別拼讀，也不把余的今音直接當作舍的讀音。"
      : character === "散" && row.component === "𢽳"
      ? "依《說文》篆形說，𢽳作聲符。今字左上的龷形和右側攵是演變後的對應區域，兩格合看，不把左下肉旁納入聲符。"
      : character === "泰" && row.component === "大"
      ? "字庫以大作聲符。今字上格𡗗是大與雙手形廾合寫後的形狀，只有其中的大參與表聲；標示整格是指出所在區域，並非每筆都是聲符。泰、大在古音相關，不按大字的今音推讀。"
      : character === "梁" && row.component === "刅"
      ? "《說文》以右上刅作聲符。教育部字樣說明指明它是刀形配兩點，不是單獨的刃，也不含左邊水旁；古今讀音有變化，不能按刀字今音推讀。"
      : character === "視" && row.component === "示"
      ? "依段注本《說文》，左側示形提示讀音，今字寫成示字旁。視、示常用國語音同為ㄕˋ；大徐本只列從見、示，未另加聲字，這裡明採段注本分析。"
      : character === "島" && row.component === "鳥"
      ? "《說文》記為鳥聲，教育部說明今字上方是鳥的省形。畫面以「鳥省」標出省寫的部件名稱，並非完整鳥字，也不是 IDS 來源中的數字佔位符；古今聲母已有變化。"
      : ["度", "庶"].includes(character) && row.component === "石"
      ? "依字庫的古文字分析，石是聲符，後來改寫成今字外側广形及內側上方廿形，兩格合看才是它的演變位置。庶的石亦聲，也參與表意；度另有庶省聲的篆形說，這裡採石聲說，不按石字的今音直接推讀。"
      : character === "殼" && row.component === "𠕓"
      ? "依教育部所引段注本，古形㱿以左側𠕓表聲；通行殼字已改寫為士、冖、短橫和几形所在的左半。畫面標的是變形後的位置，不把几或士單獨當作這項分析的聲符。"
      : character === "毫" && row.component === "高"
      ? "慧琳《一切經音義》引《古今正字》，記為高省聲。今字上方的亠、口、冖形合在同一格，對應高省寫後的位置；毫不按高字今天的讀音念。"
      : character === "浸" && row.component === "𡩠"
      ? "《說文》以𡩠作聲符，教育部引段玉裁說明後來隸省為浸。今字右側𠬶是演變、省寫後的位置，不能把它的幾筆拆開，各自猜讀音。"
      : character === "那" && row.component === "冄"
      ? "《說文》記為冄聲；今字左側變成近似刀二的筆形，畫面標的是古聲符演變後的位置，不是真的由刀與數字二合成讀音。那有多個讀音，須依語詞判斷。"
      : character === "幹" && row.component === "倝"
      ? "教育部指出這個字從倝聲。左側𠦝和右上人形合看是倝，右下干形不在聲符內；幹、倝的國語讀音仍可互相提示。"
      : character === "罰" && row.component === "詈"
      ? "依張世超等的解讀，詈兼作聲符。上方罒和左下言合看是詈，與右下刂分開；詈本有責罵之意，也參與字義，不按它的今音直接推讀罰。"
      : character === "疆" && row.component === "彊"
      ? "古字以「彊」提示讀音，今字左上弓形和右側畺形合看是彊，左下土是後加的義符。疆、彊在古音有關，不把其中的弓單獨當聲符。"
      : character === "範" && row.component === "笵"
      ? "依《說文》，笵省去水旁，保留竹和㔾形提示讀音，需合看上格與右下格。字庫另列𨊠聲的一說；這裡明採笵省聲，不把車旁也納入同一聲符。"
      : character === "炭" && row.component === "岸"
      ? "《說文》記為「岸」省聲，省去干形，留下山、厂兩部分。這兩格合看是古聲符的省寫，火形是義符，不包含在聲符中。"
      : character === "產" && row.component === "彥"
      ? "《說文》記為「彥」省聲，今字保留上方文形和厂形，兩格合看才是省寫的聲符。下方生形提示出生，不屬於聲符；產也不按彥字的今音念。"
      : character === "渠" && row.component === "榘"
      ? "《說文》記為「榘」省聲；今字保留巨形和下方木形，兩格合看是聲符省寫的位置，左上氵不屬於聲符。這是古音線索，不按巨字的今音直接推讀。"
      : character === "聽" && row.component === "壬"
      ? "依《說文》的篆形分析，耳下面的「壬」提示古音，和右側的𢛳形分開。這不是說聽按壬字的國語讀音念；更早的甲骨文另以耳、口表意。"
      : character === "麥" && row.component === "來"
      ? "字庫記載古字以「來」作聲符；今字上方的十从形和中部人形合看，對應來形的演變。古今讀音已有變化，麥不按來字的國語讀音念。"
      : character === "脆" && row.component === "危"
      ? "依漢典對今字的分析，右側「危」提示古音，不能按危字今天的讀音直接推讀。古字脃另有「絕」省聲的解讀；危聲是今字的分析，不混作同一古字來源。"
      : character === "蛋" && row.component === "延"
      ? "字庫記載蛋古作蜑，以「延」省聲。今字上方改寫為疋形，畫面標的是演變後的位置，不是把疋字現在的讀音當作蛋的讀音。"
      : character === "金" && row.component === "今"
      ? "古字以省寫的「今」提示讀音，今字上端保留人形斜筆，橫畫已與下部相接。畫面上格只標示古聲符的上端，不是完整的今字。"
      : character === "豐" && row.component === "丰"
      ? "依林澐的解讀，古字以「丰」提示讀音，今字上方𠁳形是演變後的區域。豐與丰的國語讀音仍相同。"
      : character === "衡" && row.component === "行"
      ? "「行」是聲符，今字分在兩側的彳、亍，兩格合看才是完整的行形。古今讀音不同，不按今天走路的行字讀音推讀。"
      : character === "臺" && row.component === "之"
      ? "古文字以「之」提示古音，後來在它下面增加口形，逐漸變成今字上方的吉形。這是古聲符的演變位置，不按吉字現在的讀音推讀。"
      : character === "第" && row.component === "弟"
      ? "「第」由「弟」分化而來，弟也提示讀音，今字下方保留省寫的𢎨形。兩字國語聲母、韻母相同，聲調不同。"
      : character === "粥" && row.component === "䰜"
      ? "字庫記為「䰜」省聲，今字把它省寫為米兩旁的弓形，要合看左右兩格，不是說粥按弓字的現代讀音來讀。"
      : character === "貌" && row.component === "豹"
      ? "依大徐本所載籀文的分析，左側由「豹」省寫成豸形，與另一从頁的異體同用豹省聲。段注本另只說从豸，這裡不把豸當作野獸義的義符。"
      : character === "畝" && row.component === "久"
      ? "徐鉉解釋右側「久」為聲符，提示古音。畝的國語讀音是ㄇㄨˇ，不按久字現在的讀音直接推讀。"
      : character === "汐" && row.component === "夕"
      ? "依漢典對今字的形聲分析，右側「夕」提示古音，也可聯想到晚間。本站國語讀音依教育部作ㄒㄧˋ；不要把教育部另引夂聲的異體記錄直接等同夕聲。"
      : ["撤", "澈"].includes(character) && row.component === "徹"
      ? "字庫記為「徹」省聲，今字右側保留育形和攵形，不含徹字左邊的彳。兩格合看才是聲符省寫的位置。"
      : character === "歸" && row.component === "𠂤"
      ? "古字以「𠂤」提示古代讀音，今字左上方仍保留這個形狀。畫面左格把𠂤和後加的止合在一起，聲符只對應其中的𠂤。"
      : character === "琴" && row.component === "金"
      ? "戰國字形從「金」聲，今字下方改寫成「今」，畫面標示這個演變後的位置，不把今字上面的玨形當作聲符。"
      : character === "法" && row.component === "去"
      ? "依字庫對古字「灋」的解讀，「去」作聲符；去是盍的初文，與灋的古韻相近。這是古音線索，並非按今天去字的讀音推讀。"
      : character === "碧" && row.component === "珀"
      ? "依梁東漢的一種分析，上方「珀」作古聲符，下方石作義符；《說文》另分作玉、石表意而白表聲。這裡明列不同說法，不按今天珀的讀音直接推讀。"
      : character === "營" && row.component === "熒"
      ? "《說文》記為「熒」省聲，今字上方對應𤇾形，下方仍有宮形的省寫。這是古字源位置對照，不把整個上方都當成完整的熒。"
      : character === "疏" && row.component === "疋"
      ? "《說文》以左側「疋」兼表聲，今字中部的橫筆、折筆已有變化，畫面用𤴔形標出對應的位置。"
      : character === "聯" && row.component === "𢇇"
      ? "早期字形以絲線綁繫耳飾來表意；後來戰國字形右側頂端相連的絲形也作聲符，今字寫作𢇇。"
      : character === "辣" && row.component === "剌"
      ? "字庫以省寫的「剌」提示讀音，今字右邊保留「束」，不含剌字右側的刀旁。辣與剌讀音相近，不能按束的讀音推讀。"
      : character === "螢" && row.component === "熒"
      ? "「熒」省聲：今字上方保留熒的上部「𤇾」，下方的虫提示蟲類。螢和熒的讀音相同。"
      : character === "豪" && row.component === "高"
      ? "古字以「高」提示讀音，今字上方只保留其省寫的亠、口、冖形。下方豕提示豪豬；不要把上方省寫當成完整的高字。"
      : character === "陋" && row.component === "㔷"
      ? "《說文》以右側的「㔷」提示古代讀音。今字右側的折筆形狀有所變化，部件圖以「𫠥」呈現對應的位置。"
      : character === "蝕" && row.component === "食"
      ? "古字以「飤」兼表聲，飤與食相通；今字左邊寫作「飠」。蝕與食讀音相同，虫旁另提示侵蝕、蟲蛀的字義線索。"
      : character === "習" && row.component === "彗"
      ? "依唐蘭的解讀，上方古形是提示讀音的「彗」，後來寫成「羽」形。這項說法與《說文》反覆飛行的解釋不同，不能把羽毛直接當作古聲符的本字。"
      : character === "送" && row.component === "灷"
      ? "字庫以古字「灷」解釋聲符，今字在「辶」內寫作「关」形，圖中標出這個演變後的位置，不能直接按現代「關」的讀音來推讀。"
      : character === "奉" && row.component === "丰"
      ? "段注本《說文》以「丰」提示古代讀音。今字上方與其他筆畫合寫，圖中標出這個區域。"
      : character === "外" && row.component === "月"
      ? "依一種金文解讀，「月」提示古代讀音，對應今字左側近似「夕」的部件。"
      : character === "困" && row.component === "囗"
      ? "依古文字的一種解讀，外框「囗」也提示古代讀音。"
      : character === "善" && row.component === "誩"
      ? "古文字以兩個「言」組成的「誩」提示讀音。今字已簡化，部件圖以最下方的「口」標示所保留的線索。"
      : character === "傻" && row.component === "夋"
      ? "依章太炎的解讀，「傻」由「俊」變來，原由「夋」提示讀音。圖中標示右側變形後的位置。"
      : character === "劉" && row.component === "丣"
      ? "《說文》所錄古形以「丣」提示讀音，部件圖標出今字左上方近似「卯」的位置。"
      : character === "乎" && row.component === "丂"
      ? "依一種甲金文解讀，古字形中的「丂」除了像樹枝，也提示古代讀音。"
      : character === "參" && row.component === "彡"
      ? "依金文的一種解讀，三撇「彡」提示古代讀音，也可聯想到星光。"
      : character === "匆" && row.component === "囪"
      ? "段注本《說文》以「囪」提示古代讀音，今字「匆」是後來通行的省寫。"
      : character === "冠" && row.component === "元"
      ? "甲骨文的「元」像突顯頭部的人形，也提示古代讀音。今字在下方部件中保留「元」。"
      : character === "受" && row.component === "舟"
      ? "《說文》以省寫的「舟」提示古代讀音。今字中央寫成「冖」形，部件圖標出這個位置。"
      : character === "分" && row.component === "八"
      ? "依甲骨文和金文的解讀，「八」像分開的兩物，也提示古代讀音。"
      : character === "亮" && row.component === "京"
      ? "古文字分析以「京」提示古代讀音。古字的「京」與人形共用部分筆畫，圖中標出今字上方對應的區域。"
      : character === "兩" && row.component === "㒳"
      ? "《說文》記載古字「㒳」兼作聲符，圖中標出今字下方對應的位置。"
      : character === "兢" && row.component === "丯"
      ? "《說文》記載篆文以「丯」提示古代讀音。今字已省寫，部件圖以左右近似「克」的形狀呈現。"
      : character === "難" && row.component === "堇"
      ? "《說文》以「堇」提示古代讀音。部件圖標出今字左側對應的位置。"
      : character === "鳳" && row.component === "凡"
      ? "《說文》以外側的「凡」提示古代讀音。作為這個字的部件時，「凡」內的點改寫成短橫。"
      : character === "黍" && row.component === "雨"
      ? "《說文》把下方看作省寫的「雨」，用來提示古代讀音。另有古文字解讀將下方看成水或穀粒。"
      : character === "黎" && row.component === "𥝢"
      ? "《說文》以省寫的古字「𥝢」提示讀音。圖中標出上方的位置。"
      : character === "飾" && row.component === "食"
      ? "《說文》以左側的「食」提示古代讀音。今字左側寫作食字旁，整字讀作ㄕˋ。"
      : character === "飲" && row.component === "欠"
      ? "依金文的一種解讀，右側的「欠」像人張口，古時也能提示讀音。《說文》分析古形「㱃」時，則以左側的「酓」為聲符。"
      : character === "霸" && row.component === "䨣"
      ? "《說文》以「䨣」提示古代讀音。圖中的「雨」和「革」合起來就是「䨣」。"
      : character === "電" && row.component === "申"
      ? "金文的「申」像閃電，古時也提示讀音。畫面標出現代字形下方的位置。"
      : character === "雪" && row.component === "彗"
      ? "《說文》以「彗」提示古代讀音。今字下方省寫成近似「彐」的形狀，畫面標出它的位置。"
      : character === "颳" && row.component === "𠯑"
      ? "右側與「刮」字左側的寫法相同，可用來聯想同音的「刮」。部件圖以近似的「舌」形標位置，楷書實際起筆是撇。"
      : character === "青" && row.component === "井"
      ? "金文下部有「丹」或「井」兩種寫法。字庫指出「井」與「青」古韻相近，畫面標出現代楷書下方近似「月」的位置。上部的「生」也可能兼有讀音作用。"
      : character === "頹" && row.component === "貴"
      ? "《說文解字》收錄「穨」，右側的「貴」提示讀音。現代常寫作「頹」，畫面標在舊形聲符所在的右側。"
      : character === "隨" && row.component === "𡐦"
      ? "《說文解字》記載「𡐦」省聲。部件圖將左側與右上方合併標示聲符所在，並把提示行走的「辶」另列一格。"
      : character === "陳" && row.component === "申"
      ? "《說文解字》以「申」提示讀音。教育部字典指出，現代楷書的右半已變成近似「東」的字形。"
      : character === "雲" && row.component === "云"
      ? "下方「云」是「雲」的早期寫法，兩字都讀ㄩㄣˊ。《說文解字》也用「云」的形狀說明雲氣回轉。"
      : character === "芯" && row.component === "心"
      ? "「芯」讀ㄒㄧㄣ時和下方的「心」同音。「心」也能幫助理解草木中心的意思。"
      : character === "茶" && row.component === "余"
      ? "「茶」原寫作「荼」，以「余」提示讀音。現代字形下方保留省筆後的聲符，畫面將下方兩部分一起標出。"
      : character === "歲" && row.component === "戌"
      ? "《說文解字》以「戌」為聲符。部件圖把交疊的筆畫分開呈現，兩處足形共同對應形符「步」。"
      : character === "垂" && row.component === "𠂹"
      ? "《說文解字》以「𠂹」提示讀音。「土」提示土地邊界的原義，後來這個意思也寫作「陲」。圖中呈現的是古字源部件的位置示意。"
      : character === "曳" && row.component === "𠂆"
      ? "《說文解字》以「𠂆」提示讀音，並記載此字從「申」。現代字形的筆畫交疊，分格中的位置尚待核對。"
      : character === "必" && row.component === "八"
      ? "甲骨文先以整體字形描畫兵器的柄。部分金文在柄的兩側加上「八」提示讀音，後來全字借來表示必須。"
      : character === "更" && row.component === "丙"
      ? "于省吾將甲骨文的「丙」解作聲符、「攴」解作手持鞭形，認為可能是「鞭」的初文。這是對早期字形的一種解讀。"
      : character === "書" && row.component === "者"
      ? "金文以「者」提示讀音，有些古字已將「者」省寫。畫面標出現代字形下方的日形。"
      : character === "失" && row.component === "乙"
      ? "依《說文解字》，古字從手、以「乙」提示讀音。畫面標出現代楷書上端對應的撇筆。"
      : character === "曰" && row.component === "乙"
      ? "《說文解字》將短畫解作「乙」，認為它提示讀音，也描畫氣從口中發出。現代字形的短畫移到口形內。"
      : character === "尚" && row.component === "向"
      ? "《說文解字》以「向」為聲符，畫面標出現代字形下部。甲金文另有以高出地面的堂基解釋字源的說法。"
      : character === "截" && row.component === "雀"
      ? "《說文解字》以「雀」為聲符。現代字形可辨認出「雀」的下半部「隹」，畫面標示這個位置。"
      : character === "重" && row.component === "東"
      ? "甲金文的「東」像裝重物的囊袋，也提示讀音。後來人形和囊袋共用部分筆畫，現代字形難以把聲符單獨框出。"
      : character === "賊" && row.component === "則"
      ? "金文以「則」提示讀音。現代字形只在左側標出仍可辨認的「貝」，這是古聲符的一部分。"
      : character === "酬" && row.component === "𠷎"
      ? "《說文解字》記載「醻」以「𠷎」為聲符，也收錄右側寫「州」的異體「酬」。"
      : character === "桌" && splitSoundAtTop
      ? "字庫記載「卓」是聲符。現代字形保留其上部，畫面標出「木」上面的兩格。"
      : character === "布" && row.component === "父"
      ? "《說文解字》以「父」為聲符。現代字形上方為「𠂇」，下方「巾」提示與布帛有關。"
      : character === "妖" && row.component === "芺"
      ? "《說文解字》收錄的異體「𡝩」以「芺」為聲符。現代字形右側保留「芺」下方的「夭」。"
      : character === "吃" && row.component === "气"
      ? "《說文解字》記為「气」聲，指說話不流利，讀ㄐㄧˊ。現代楷書右側寫「乞」，常見的吃東西則讀ㄔ。"
      : character === "乾" && row.component === "倝"
      ? "《說文解字》以「倝」為聲符。現代楷書的左半是聲符主要可辨認的部分，畫面標示在左側。"
      : character === "勵" && row.component === "萬"
      ? "《說文解字》收錄的古形「勱」以「萬」為聲符。現代字形左側寫「厲」，其中含「萬」，畫面標示包含它的左側部件。"
      : character === "鋒" && row.component === "逢"
      ? "《說文新附》記為「逢」聲。現代字形右側可看到「逢」內的「夆」，左側「金」提示金屬刀刃。"
      : character === "摘" && row.component === "啻"
      ? "《說文解字》記為「啻」聲；徐鉉等另解為「適」省聲。畫面標出右側的「啇」。"
      : character === "對"
      ? "陳秉新認為，甲骨文中工具形「丵」和下方的「土」合起來也提示讀音。畫面標示這一組古部件所對應的左半。"
      : character === "可"
      ? "《說文解字》指出「丂」兼有聲符作用。畫面標出的「丁」形對應古字的「丂」。"
      : character === "夜"
      ? "金文中的「夕」和「亦」都能提示古音。「夕」也提示傍晚或夜晚，畫面標出包含古「夕」變形的區塊。"
      : character === "太"
      ? "于省吾認為「太」由「大」加記號分化而來，「大」也提示古音。"
      : character === "千"
      ? "早期字形借「人」的古音來表示千數。古代的人形分布在今字的撇、豎，畫面標示上方的撇作為辨認線索。"
      : character === "喪"
      ? "部分金文增加「亡」提示古音，《說文解字》也記載「亡」兼作聲符。畫面標示它在現代字形所對應的下方。更早的甲骨文則以「桑」提示讀音。"
      : character === "差"
      ? "後期金文在手形下加「工」等部件而形成「左」形。字庫將「左」解作聲符，畫面標出其下方保留的「工」。"
      : character === "乎"
      ? "劉釗把古字中的「丂」解作聲符。夏淥則指出它也像樹枝，和上方記號合起來可聯想到風中樹枝發出的呼呼聲。"
      : character === "展"
      ? "《說文解字》記載「展」用「𧝑」省去部分筆畫來提示讀音。畫面標出現代字形中「尸」下方對應聲符的位置。"
      : character === "或"
      ? "謝明文認為，古字的圓形部件可能取「員」的早期字形來提示讀音。畫面標出保留這個輪廓的「口」形所在區塊。"
      : character === "春"
      ? "甲骨文和金文以「屯」提示讀音。後來「屯」和草木部件合併，成為現代字形的上半。"
      : character === "教"
      ? "甲骨文的「爻」兼作聲符，提示古音。現代左半寫作「孝」形，畫面標示的是古聲符原來所在的一側。"
      : character === "愣"
      ? "「愣」和異體「楞」的右半相同，用於表示愣住時都可讀ㄌㄥˋ。可用共同的右側部件記住這個讀音。"
      : character === "惱"
      ? "教育部字典指出，「惱」右側寫法和「腦」相同。《說文解字》所收的相關異體也以「匘」的省形表音。今天「惱」和「腦」都讀ㄋㄠˇ，可以用共同的右側部件記住讀音。"
      : character === "志"
      ? "金文的「之」提示古音，也可表示前往。和下方的「心」合起來，可理解為心意所向。畫面標出的上方是古「之」所對應的位置。"
      : character === "寨"
      ? "字庫把上方解作「塞」省去部分筆畫的聲符，提示古音。"
      : character === "梁"
      ? "《說文解字》列「刅」為聲符。它在上格的右側，與左側的水旁同在一格。"
      : character === "查"
      ? "早期寫作「査」，以「且」提示讀音。後來下方變成「旦」形，畫面標示這個位置。"
      : character === "正"
      ? "徐在國、劉釗認為古字上方的「丁」兼有聲符作用。它也標示行程目標，現代字形上方寫作一橫。"
      : character === "望"
      ? "金文用「亡」提示讀音。畫面上格的左側是「亡」，同格也包含古「月」的變形。"
      : character === "替"
      ? "《說文解字》的正篆以「白」提示古音，異體下方也寫作「曰」。教育部標準字下方為「曰」，部件圖目前用「日」形示意。"
      : character === "炭"
      ? "字庫記載「岸」省去部分筆畫後提示古音。這項線索分布在「山」和下方「厂」形，現有兩格示意仍待細分。"
      : character === "牽"
      ? "字庫記載「玄」是聲符，提示古音。畫面標示含有「玄」形的上方區塊，其中也包含繩索的記號。"
      : character === "沉"
      ? "「沉」和「沈」原有相同的字形來源，古字以「冘」提示讀音。現代右側已變形，畫面以「冗」示意。"
      : character === "百"
      ? "古代借「白」的讀音來記錄百數。今天「白」和「百」的讀音仍很接近，但聲調不同。"
      : character === "改"
      ? "甲骨文和金文以「巳」提示古音。現代字形左半寫作「己」形，畫面標示古聲符原來所在的一側。"
      : character === "容" && row.component === "公"
      ? "金文以「公」提示讀音。現代下方寫作「谷」，畫面標出古聲符在今字中所對應的位置。上方「宀」像能盛放東西的房屋，提示容納。"
      : character === "定" && row.component === "正"
      ? "甲骨文和金文以「正」提示讀音。現代字形標出的下方部件對應古字的「正」，上方「宀」像屋頂，提示安身、安定。"
      : character === "笛" && row.component === "由"
      ? "《說文解字》將下方「由」列為聲符，徐鍇另解為「胄」省聲。上方「竹」提示竹製的管樂器。"
      : splitClothingSound
      ? "依《說文解字》，聲符「衣」在現代字形中分布在「口」的上方和下方。"
      : splitSound
      ? "左右兩個「辛」合成聲符「辡」，共同提示讀音。"
      : character === "船" && row.component === "㕣"
      ? "段玉裁將右側解作「㕣」聲；大徐本《說文》作「鉛省聲」。左側的「舟」提示與船隻有關。"
      : (character === "津" || character === "害" || historical?.soundVariant) && historical?.displayedSound
        ? `《說文解字》記載「${row.component}」是聲符，對應現代畫面上的「${historical.displayedSound}」。`
        : historical?.displayedSound
        ? `《說文解字》記載聲符「${row.component}」省去部分筆畫或部件，現代畫面可在「${historical.displayedSound}」的位置找到聲音線索。`
        : historical?.alsoPhonetic
        ? `《說文解字》記載「${row.component}」參與組字，也提示讀音。古今讀音可能不同。`
        : `${historical ? "《說文解字》" : "字庫"}記載「${row.component}」是「${character}」的聲符；歷史讀音與現代讀音可能不同。`;
    return { sound: {
      title: `${historical ? "依《說文》，" : ""}「${row.component}」提供聲音線索`,
      explanation: soundExplanation,
      componentIndexes: ((character === "徽" && components.join("|") === "彳|山一|糸|攵") || (character === "徵" && components.join("|") === "彳|山一|𡈼|攵")) && row.component === "微"
        ? [0, 1, 3]
        : character === "贏" && row.component === "𣎆" && components.join("|") === "吂|月|貝|卂"
        ? [0, 1, 3]
        : splitSoundAtTop ? [0, 1] : splitRightAndBottomSound ? [1, 2] : splitSound || splitClothingSound || splitSoundAroundWater || splitSoundAroundSpeech || splitSoundAcrossSides || splitSaltSound ? [0, 2] : index < 0 ? [] : [index],
      sources: citedSources,
    }, meaning: generatedMeaning };
  }
  return {
    ...STRUCTURE_CLUES[character],
    sound: { ...entry, title: `「${entry.component}」提供聲音線索`, sources: verified.sources },
    meaning: character === "璃" ? {
      title: "玉字旁提供意義線索",
      explanation: "左側的「王」在這裡是玉字旁。從字源看，它提示「璃」與玉石有關，例如「琉璃」的古義之一是青色寶石。",
      componentIndexes: components.flatMap((part, index) => part === "王" || part === "玉" ? [index] : []),
      sources: verified.sources,
    } : STRUCTURE_CLUES[character]?.meaning || generatedMeaning,
  };
}
