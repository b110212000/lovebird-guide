import React,{useState,useEffect,useRef,useCallback} from 'react';
import {UI,CONTENT} from './content.js';
import {CloudPage} from './CloudPage.jsx';
import {FeedingCheckIn,closestFeeding,CLOCK_RE,labelForSlot,evaluateSlots} from './FeedingCheckIn.jsx';
import {CLOCK_RE as SLOT_CLOCK,slotsFromLegacy,normalizeSlots,addSlot,updateSlot,deleteSlot,activeCount,MAX_SLOTS} from './feed-slots.js';
import {deviceLocale,resolveLanguage} from './device-language.js';
import {backendReady,readCredentials,cloudState,queueChange,syncPending} from './cloud-api.js';

const V='2.6.0';
const SITE_URL='https://b110212000.github.io/lovebird-guide/';
const MAIN=['home','guide','growth','journal','settings'];
const HELP={
hans:{
cloud:['每个人都有自己独立的云端账号，恢复密钥不要随意分享。','请在主屏幕 App 中打开推送通知。'],
home:['首页只显示今天最重要的事：两次饲料检查和六项日常照顾。','点下方「打卡」标记完成；所有数据只存在当前设备。'],
guide:['选择想了解的主题，再进入对应页面。','幼鸟喂奶、断奶及身体异常请找鸟类兽医。'],
growth:['各月龄仅作参考，每只鸟断奶时间不一样。','不要仅凭月龄停止人工喂奶；幼鸟体重、食欲与自主进食更重要。'],
journal:['可以自行新增、修改、删除喂食时段，支持一天多餐，各时段独立提醒。','喂完点击「确认已喂」，App 自动保存实际喂食时间；删除时段不清除历史。','喂食频率需按幼鸟年龄、断奶状态及鸟类兽医建议决定。'],
settings:['小鸟名字、提醒、语言及资料备份都在这里调整。','换手机、清除浏览器或删掉主屏幕 App 前先导出 JSON 备份。'],
pet:['改名后，App 内标题、问候和提醒文字都会更新。','不知道真正生日就留空，别把接回家的日期当生日。'],
reminders:['网页只有打开或回到前台时才会检查提醒，无法在关闭状态下自己推送。','导出 .ics 后，需要在 iPhone 日历确认导入、开启通知；无法导入时请使用「提醒事项」手动设置每天重复提醒。'],
language:['默认跟随设备主要语言；台湾、香港与澳门使用繁体，中国大陆与新加坡使用简体。','你仍可以手动指定简体或繁体，随时切回跟随设备。','其他设备语言暂时使用繁体中文；目前没有英语等其他翻译。'],
backup:['导出为 JSON 文件，包含小鸟资料、提醒时间、打卡、日记。','导入会覆盖相同项目的现有记录。请妥善保管备份文件。'],
install:['iPhone 使用 Safari 打开→分享→添加到主屏幕→添加。','已安装时无需重复安装，通常重新打开 App 就能获取更新。'],
arrival:['刚到家先稳定作息、饮水和进食，别强行上手。'],
food:['成鸟饮食建议不适用未断奶的幼鸟。','牛油果、巧克力、咖啡因及不粘锅烟雾等可能严重伤害鸟儿。'],
behavior:['单一行为不能作为健康诊断，结合食欲、精神和环境观察。'],
environment:['放飞前确认门窗、电扇、厨房和其他宠物安全。'],
health:['出现呼吸费力、外伤、明显虚弱、疑似中毒或卡蛋时，应立即就医，不要等到明天。'],
knowledge:['维基百科提供物种背景，不替代专业兽医意见。']
},
hant:{
cloud:['每個人都有獨立的雲端帳戶，復原金鑰請勿隨意分享。','請在主畫面 App 中開啟推播通知。'],
home:['首頁只顯示今天最重要的事：兩次飼料檢查與六項每日照顧。','點下方「打卡」標記完成；資料僅儲存在目前裝置。'],
guide:['選擇想了解的主題，再進入相對應的頁面。','幼鳥餵奶、斷奶及身體異常請諮詢鳥類獸醫。'],
growth:['各月齡僅供參考，每隻鳥斷奶的時間不同。','不能只憑月齡停止人工餵奶。'],
journal:['可自行新增、編輯、刪除餵食時段，一天多餐各自提醒。','餵完按「確認已餵」會記錄實際時間；刪除時段也會保留歷史紀錄。','餵食頻率請依幼鳥年齡、是否斷奶及鳥類獸醫建議設定。'],
settings:['小鳥名字、提醒、語言和資料備份都在此調整。','換手機、清除資料或刪除主畫面 App 前，請先匯出 JSON。'],
pet:['改名後，App 內標題、問候與提醒文字會更新。','不知道生日請留空，勿用接回家日期代替。'],
reminders:['網頁只有開啟或回到前景時才會檢查提醒，關閉後無法自行推播。','匯出 .ics 後，請確認已加入 iPhone 行事曆並啟用通知；無法匯入時可手動設定提醒事項。'],
language:['預設跟隨裝置主要語言；臺灣、香港與澳門使用繁體，中國大陸與新加坡使用簡體。','也可以手動選擇繁體或簡體，隨時切回跟隨裝置。','其他裝置語言暫時顯示繁體中文；目前尚無英文等翻譯。'],
backup:['匯出的 JSON 包含小鳥資料、提醒時間、打卡與日誌。','匯入時會覆蓋相同項目的既有資料。'],
install:['使用 iPhone Safari 開啟→分享→加入主畫面→加入。','已安裝的 App 通常只需重新開啟即可更新。'],
arrival:['剛到家先維持安定作息、清水與實際進食，不要強迫上手。'],
food:['成鳥飲食建議不適用未斷奶幼鳥。','酪梨、巧克力、咖啡因與不沾鍋煙霧可能嚴重傷害鳥兒。'],
behavior:['單一動作無法判斷健康，需結合食慾、精神和環境。'],
environment:['放風前檢查門窗、電扇、廚房與其他寵物。'],
health:['呼吸困難、外傷、虛弱、疑似中毒或卡蛋應立即就醫。'],
knowledge:['百科提供物種背景，不能取代鳥類獸醫意見。']
}};
const I18N={
hans:{app:'养鸟手册',cloud:'云端同步与通知',tab:['首页','指南','月龄','打卡','设置'],homeHi:'今天也要照顾好',homeSub:'慢慢来，一件一件完成就好',today:'今日照顾',check:'去打卡',learn:'养鸟指南',feed:'喂食确认',feedTitle:'检查饲料',daily:'日常检查',notes:'观察日记',morning:'早上检查',evening:'晚上检查',done:'已完成',pending:'待确认',complete:'标记完成',undo:'撤销完成',at:'完成于',next:'下一次检查',time:'检查时间',feedHint:'主食和清水应该持续供应。两次打卡只是检查、补充饲料，不是限制喂食次数。',save:'保存记录',delete:'删除',empty:'还没有记录',pet:'小鸟资料',reminders:'喂食提醒',language:'语言',backup:'数据备份',install:'安装与分享',help:'使用说明',close:'关闭',back:'返回',birthday:'出生日期（不知道就留空）',petName:'小鸟名字',petPlaceholder:'例如：香蕉',age:'估算月龄',unknown:'未设置',nameSaved:'名字已更新',dateSaved:'生日已保存',timeSaved:'提醒时间已更新',saved:'已保存',removed:'已删除',reverted:'已取消',checked:'已打卡',calendar:'导出 iPhone 日历提醒',calendarReady:'已生成提醒文件，请确认导入到日历并启用通知',copyTimes:'复制提醒时间',copied:'已复制到剪贴板',copy:'复制链接',share:'分享 App',export:'导出 JSON 备份',import:'导入 JSON 备份',importConfirm:'导入将覆盖相同项目的现有记录，确认继续？',importDone:'导入完成，正在重新载入',importError:'无法读取这份备份',shareText:'分享这个免费的养鸟小工具给你！',installAction:'添加到主屏幕',installSteps:[['用 Safari 打开','在 iPhone 上用 Safari 浏览器打开本站。'],['点击分享','点 Safari 工具栏里的方框上箭头。'],['添加到主屏幕','选「添加到主屏幕」，再点右上角的「添加」。']],reminderNotice:'现在该检查饲料啦',settingsHint:'设置保存在这台设备',offline:'纯本地记录 · 不会上传服务器',pickTopic:'想了解哪方面？',readMore:'点击查看',error:'操作失败，请重试',guideLabels:['到家第一周','饮食与禁忌','行为与互动','居家安全','健康警示','百科资料'],guideSub:['先让它安心适应','能吃什么，不能吃什么','看懂它的小动作','鸟笼、空气与睡眠','什么时候该去医院','来源与学习资料'],notice:'提醒方式',source:'参考资料',refresh:'更新百科',wikiOffline:'暂时无法联网，显示离线介绍',notesPlaceholder:'今天精神、食欲、便便怎么样？',allDone:'今天都完成啦！',progress:'已完成',choose:'选择一项查看详情',new:'新增观察'},
hant:{app:'養鳥手冊',cloud:'雲端同步與通知',tab:['首頁','指南','月齡','打卡','設定'],homeHi:'今天也要好好照顧',homeSub:'慢慢來，一件一件完成就好',today:'今日照顧',check:'去打卡',learn:'養鳥指南',feed:'餵食確認',feedTitle:'檢查飼料',daily:'每日檢查',notes:'觀察日誌',morning:'早上檢查',evening:'晚上檢查',done:'已完成',pending:'待確認',complete:'標記完成',undo:'取消完成',at:'完成於',next:'下次檢查',time:'檢查時間',feedHint:'主食和飲水應持續供應。兩次打卡只是檢查、補充飼料，不是限制餵食次數。',save:'儲存紀錄',delete:'刪除',empty:'目前沒有紀錄',pet:'小鳥資料',reminders:'餵食提醒',language:'語言',backup:'資料備份',install:'安裝與分享',help:'使用說明',close:'關閉',back:'返回',birthday:'出生日期（不知道可留空）',petName:'小鳥名字',petPlaceholder:'例如：香蕉',age:'估算月齡',unknown:'未設定',nameSaved:'名字已更新',dateSaved:'生日已儲存',timeSaved:'提醒時間已更新',saved:'已儲存',removed:'已刪除',reverted:'已取消',checked:'已打卡',calendar:'匯出 iPhone 行事曆提醒',calendarReady:'已產生提醒檔，請確認匯入行事曆並開啟通知',copyTimes:'複製提醒時間',copied:'已複製',copy:'複製連結',share:'分享 App',export:'匯出 JSON 備份',import:'匯入 JSON 備份',importConfirm:'匯入會覆蓋相同項目的現有紀錄，確定繼續嗎？',importDone:'匯入完成，即將重新載入',importError:'無法讀取這份備份',shareText:'分享這個免費養鳥小工具給你！',installAction:'加入主畫面',installSteps:[['使用 Safari 開啟','在 iPhone 上用 Safari 瀏覽器開啟本站。'],['點選分享','點 Safari 工具列的方框向上箭頭。'],['加入主畫面','選擇「加入主畫面」，再點右上角「加入」。']],reminderNotice:'該檢查飼料囉',settingsHint:'設定只存在這台裝置',offline:'僅本機儲存 · 不會上傳伺服器',pickTopic:'想了解哪方面？',readMore:'點選查看',error:'操作失敗，請再試一次',guideLabels:['到家第一週','飲食與禁忌','行為與互動','居家安全','健康警示','百科資料'],guideSub:['先讓牠安心適應','可以吃什麼、不能吃什麼','看懂牠的小動作','鳥籠、空氣與睡眠','什麼時候該就醫','資料來源與學習'],notice:'提醒方式',source:'參考資料',refresh:'更新百科',wikiOffline:'暫時無法連線，顯示離線簡介',notesPlaceholder:'今天精神、食慾、便便如何？',allDone:'今天都完成囉！',progress:'已完成',choose:'選擇一項查看詳細內容',new:'新增觀察'}
};
const PAGES=['home','guide','arrival','food','behavior','environment','health','knowledge','growth','journal','settings','pet','reminders','language','backup','cloud','install'];
const NAV=[['home','🏠'],['guide','📖'],['growth','🌱'],['journal','✅'],['settings','⚙️']];
const GUIDE=[['arrival','🪺',0],['food','🥬',1],['behavior','💛',2],['environment','🏡',3],['health','🩺',4],['knowledge','📚',5]];
const MENU=['home','guide','growth','journal','settings','pet','reminders','cloud','install','health'];
const DEFAULT_SCHEDULE={morning:'08:00',evening:'18:00'};
const TODAY=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function read(k,f){try{const x=localStorage.getItem(k);return x===null?f:JSON.parse(x)}catch{return f}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function readRaw(k,f=''){try{return localStorage.getItem(k)??f}catch{return f}}
function storeRaw(k,v){try{localStorage.setItem(k,v)}catch{}}
function usePersist(key,fallback){const [v,set]=useState(()=>read(key,fallback));const change=useCallback((next)=>set(old=>{const nv=typeof next==='function'?next(old):next;write(key,nv);return nv}),[key]);return [v,change]}
function useRaw(key,fallback){const [v,set]=useState(()=>readRaw(key,fallback));const change=useCallback(next=>set(old=>{const val=typeof next==='function'?next(old):next;storeRaw(key,val);return val}),[key]);return [v,change]}
function formatClock(stamp){const date=new Date(stamp);return Number.isFinite(date.getTime())?date.toLocaleTimeString('zh',{hour:'2-digit',minute:'2-digit',hour12:false}):''}
function validClock(s){return typeof s==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s)}
function download(file,blob){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=file;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function stamp(d){const z=n=>String(n).padStart(2,'0');return ''+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'T'+z(d.getHours())+z(d.getMinutes())+'00'}
function calendarText(name,slots,lang){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Banana Care//React App//ZH','CALSCALE:GREGORIAN'];
 for(const slot of normalizeSlots(slots)){
  const time=slot.time,d=new Date();
  d.setHours(Number(time.slice(0,2)),Number(time.slice(3,5)),0,0);
  if(d<=new Date())d.setDate(d.getDate()+1);
  const end=new Date(d.getTime()+10*60000);
  const title=name+' · '+(lang==='hans'?'喂食提醒':'餵食提醒')+' '+time;
  lines.push('BEGIN:VEVENT','UID:banana-care-'+slot.id+'@lovebird-guide','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART:'+stamp(d),'DTEND:'+stamp(end),'RRULE:FREQ=DAILY','SUMMARY:'+title,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+title,'TRIGGER:PT0M','END:VALARM','END:VEVENT');
 }
 return lines.concat('END:VCALENDAR').join('\r\n')+'\r\n';
}
function useToast(){const [toast,setToast]=useState(null);const timer=useRef(null);const show=useCallback((text,type='success')=>{clearTimeout(timer.current);const id=Date.now();setToast({id,text,type});timer.current=setTimeout(()=>setToast(t=>t?.id===id?null:t),type==='error'?4000:2000)},[]);useEffect(()=>()=>clearTimeout(timer.current),[]);return [toast,show]}
function Toast({toast}){return <div className="toast-region" aria-live="polite">{toast&&<div key={toast.id} className={'toast '+toast.type} role={toast.type==='error'?'alert':'status'}>{toast.type==='success'?'✓ ':'! '}{toast.text}</div>}</div>}
function HelpModal({view,lang,close}){const t=I18N[lang];const box=useRef(null);useEffect(()=>{box.current?.focus();const f=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',f);return()=>document.removeEventListener('keydown',f)},[close]);return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section ref={box} tabIndex="-1" role="dialog" aria-modal="true" aria-label={t.help} className="help-modal"><div className="modal-head"><span className="modal-icon">❔</span><h2>{t.help}</h2><button className="icon-button" type="button" onClick={close} aria-label={t.close}>✕</button></div><div className="modal-scroll">{(HELP[lang][view]||HELP[lang].home).map((x,i)=><p key={i} className="help-line">{x}</p>)}{view==='install'&&<div className="modal-install">{t.installSteps.map((x,i)=><div key={i}><b>{i+1}. {x[0]}</b><span>{x[1]}</span></div>)}</div>}</div><button className="wide-button" onClick={close}>{t.close}</button></section></div>}
function Drawer({open,close,navigate,lang,name}){const t=I18N[lang];return <div className={'drawer-layer'+(open?' open':'')} aria-hidden={!open}><button className="drawer-scrim" tabIndex={open?0:-1} onClick={close} aria-label={t.close}/><aside className="drawer" role="dialog" aria-modal={open?'true':undefined} aria-label={t.app}><div className="drawer-head"><span className="drawer-avatar">🐤</span><span><b>{name}{lang==='hans'?'的养鸟手册':'的養鳥手冊'}</b><small>BANANA CARE</small></span><button onClick={close} className="icon-button" aria-label={t.close}>✕</button></div><div className="drawer-list">{MENU.map(id=><button type="button" key={id} onClick={()=>{navigate(id);close()}}><span>{NAV.find(x=>x[0]===id)?.[1]||{pet:'🐥',reminders:'🔔',cloud:'☁️',install:'📲',health:'🩺'}[id]}</span><b>{titleFor(id,t)}</b><span className="chev">›</span></button>)}</div><div className="drawer-foot">v{V} · {t.offline}</div></aside></div>}
function titleFor(view,t){if(view==='home')return t.tab[0];if(view==='guide')return t.tab[1];if(view==='growth')return t.tab[2];if(view==='journal')return t.tab[3];if(view==='settings')return t.tab[4];if(view==='pet')return t.pet;if(view==='reminders')return t.reminders;if(view==='language')return t.language;if(view==='backup')return t.backup;if(view==='cloud')return t.cloud;if(view==='install')return t.install;const idx=GUIDE.findIndex(x=>x[0]===view);return idx>=0?t.guideLabels[idx]:view}
function GroupCard({emoji,title,sub,onClick}){return <button type="button" className="group-card" onClick={onClick}><span className="group-emoji">{emoji}</span><span className="group-copy"><b>{title}</b>{sub&&<small>{sub}</small>}</span><span className="chev">›</span></button>}
function GuideHome({lang,navigate}){const t=I18N[lang];return <div className="view-flow"><div className="section-lead"><h2>{t.tab[1]}</h2><p>{t.pickTopic}</p></div><div className="group-list">{GUIDE.map(([id,emoji,i])=><GroupCard key={id} emoji={emoji} title={t.guideLabels[i]} sub={t.guideSub[i]} onClick={()=>navigate(id)}/>)}</div></div>}
function Topic({page,lang}){const c=CONTENT[lang],u=UI[lang],t=I18N[lang];if(page==='arrival')return <div className="view-flow"><div className="section-lead"><h2>{u.arrivalTitle?.replace(/<[^>]+>/g,'')}</h2><p>{u.arrivalSubtitle}</p></div>{c.week.map(([day,name,desc,items])=><details key={day} className="detail-card"><summary><small>{day}</small><b>{name}</b><span>⌄</span></summary><div><p>{desc}</p><ul>{items.map(x=><li key={x}>{x}</li>)}</ul></div></details>)}<div className="safety-strip">{u.arrivalAlert}</div></div>;
if(page==='food')return <div className="view-flow"><div className="section-lead"><h2>{u.foodTitle?.replace(/<[^>]+>/g,'')}</h2><p>{u.foodSubtitle}</p></div>{c.foodNotes.map(([emoji,title,desc])=><div className="info-card" key={title}><h3>{emoji} {title}</h3><p>{desc}</p></div>)}{c.foodColumns.map(([tone,title,items])=><details className={'detail-card '+tone} key={title}><summary><b>{title}</b><span>⌄</span></summary><div><ul>{items.map(x=><li key={x}>{x}</li>)}</ul></div></details>)}<div className="safety-strip">{u.weaningWarning}</div></div>;
if(page==='behavior')return <div className="view-flow"><div className="section-lead"><h2>{t.guideLabels[2]}</h2><p>{u.behaviorSubtitle}</p></div>{c.behaviors.map(([emoji,title,desc,label,warning])=><details className={'detail-card'+(warning?' red':'')} key={title}><summary><span className="summary-emoji">{emoji}</span><b>{title}</b><span>⌄</span></summary><div><p>{desc}</p><small>{label}</small></div></details>)}<div className="safety-strip">{u.bondingTip}</div></div>;
if(page==='environment')return <div className="view-flow"><div className="section-lead"><h2>{t.guideLabels[3]}</h2><p>{u.environmentSubtitle}</p></div>{c.environment.map(([emoji,title,desc])=><details key={title} className="detail-card"><summary><span className="summary-emoji">{emoji}</span><b>{title}</b><span>⌄</span></summary><div><p>{desc}</p></div></details>)}</div>;
if(page==='health')return <div className="view-flow"><div className="section-lead"><h2>{u.healthTitle?.replace(/<[^>]+>/g,'')}</h2><p>{u.healthSubtitle}</p></div><div className="info-card health-alert"><h3>🚨 {u.emergencyTitle}</h3><ul>{c.emergency.map(x=><li key={x}>{x}</li>)}</ul></div><details className="detail-card" open><summary><b>{u.monitorTitle}</b><span>⌄</span></summary><div><ul>{c.monitor.map(x=><li key={x}>{x}</li>)}</ul></div></details><div className="safety-strip">{u.healthAlert}</div></div>;
return <Knowledge lang={lang} c={c} u={u} t={t}/>}
function Knowledge({lang,c,u,t}){const [data,setData]=useState(()=>read('ylg-wiki-'+lang,null)?.extract||u.wikiIntro);const [busy,setBusy]=useState(false);const refresh=useCallback(async()=>{setBusy(true);const ctl=new AbortController();const tid=setTimeout(()=>ctl.abort(),7000);try{const q=new URLSearchParams({action:'query',format:'json',prop:'extracts',titles:'情侶鸚鵡',redirects:'1',exintro:'1',explaintext:'1',exchars:'500',origin:'*',variant:lang==='hans'?'zh-hans':'zh-hant'});const res=await fetch('https://zh.wikipedia.org/w/api.php?'+q,{signal:ctl.signal});if(!res.ok)throw Error('wiki');const obj=await res.json();const item=Object.values(obj.query?.pages||{}).find(x=>x.extract);if(!item)throw Error('empty');setData(String(item.extract).slice(0,700));write('ylg-wiki-'+lang,{extract:String(item.extract).slice(0,700),date:new Date().toISOString()})}catch{setData(read('ylg-wiki-'+lang,null)?.extract||u.wikiIntro)}finally{clearTimeout(tid);setBusy(false)}},[lang,u.wikiIntro]);useEffect(()=>{refresh()},[refresh]);return <div className="view-flow"><div className="section-lead"><h2>{t.guideLabels[5]}</h2><p>{u.knowledgeSubtitle}</p></div><div className="info-card"><div className="card-inline"><h3>📚 {u.wikiTitle}</h3><button className="small-button" onClick={refresh} disabled={busy}>{busy?'…':t.refresh}</button></div><p>{data}</p><a className="source-item" href="https://zh.wikipedia.org/wiki/情侶鸚鵡" target="_blank" rel="noreferrer">{u.readWiki} ↗</a></div><h3 className="subhead">{t.source}</h3>{c.sources.map(([title,url])=><a className="source-item" key={url} href={url} target="_blank" rel="noreferrer"><span>{title}</span><span>↗</span></a>)}</div>}
function Growth({lang}){const t=I18N[lang],ages=CONTENT[lang].ages;const [n,setN]=useState(2);const a=ages[n];return <div className="view-flow"><div className="section-lead"><h2>{t.tab[2]}</h2><p>{UI[lang].growthSubtitle}</p></div><div className="age-strip" role="tablist" aria-label={t.tab[2]}>{ages.map((x,i)=><button key={i} type="button" role="tab" aria-selected={i===n} className={i===n?'selected':''} onClick={()=>setN(i)}>{x[0]}</button>)}</div><div className="info-card age-body"><div className="age-cover"><span>{a[1]}</span><h3>{a[2]}</h3><small>{a[0]}</small></div><p>{a[3]}</p><ul>{a[4].map(x=><li key={x}>{x}</li>)}</ul><div className="safety-strip">{a[5]}</div></div></div>}
function Home({lang,name,count,feed,slots,navigate}){
 const t=I18N[lang],[now,setNow]=useState(()=>new Date());
 useEffect(()=>{
  const tick=()=>setNow(new Date());
  const timer=setInterval(tick,30000);
  document.addEventListener('visibilitychange',tick);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick)};
 },[]);
 const fed=activeCount(feed,slots);
 const next=closestFeeding(feed,slots,now);const time=next?.time||'✓',target=6+slots.length;return <div className="view-flow home-view"><div className="home-greeting"><div><small>🐤 BANANA CARE</small><h2>{name}，{lang==='hans'?'今天怎么样？':'今天好嗎？'}</h2><p>{t.homeSub}</p></div><div className="hello-bird">🐥</div></div><div className="progress-card"><div><small>{t.today}</small><strong>{count} / {target}</strong><span>{count===target?t.allDone:t.progress}</span></div><div className="circle-meter" style={{'--progress':(count/target*100)+'%'}}><b>{Math.round(count/target*100)}%</b></div></div><button className="next-feed" onClick={()=>navigate('journal')}><span className="next-icon">🥣</span><span><b>{t.feed}</b><small>{fed} / {slots.length} · {next?(next.state==='due'?t.reminderNotice:t.next)+' · '+labelForSlot(next.id,slots,lang)+' '+time:t.allDone}</small></span><span className="chev">›</span></button><div className="home-actions"><GroupCard emoji="✅" title={t.check} onClick={()=>navigate('journal')}/><GroupCard emoji="📖" title={t.learn} onClick={()=>navigate('guide')}/></div></div>}
function Journal({lang,dateKey,feed,onMarkFeed,onChangeTime,onAddSlot,onDeleteSlot,checked,setChecked,notes,setNotes,slots,toast}){const t=I18N[lang],list=CONTENT[lang].checklist;const [tab,setTab]=useState('feed'),[draft,setDraft]=useState('');const today=TODAY();const markTask=i=>{setChecked(old=>old.includes(i)?old.filter(x=>x!==i):[...old,i]);toast(checked.includes(i)?t.reverted:t.checked)};return <div className="view-flow"><div className="section-lead"><h2>{t.tab[3]}</h2><p>{new Intl.DateTimeFormat(lang==='hans'?'zh-CN':'zh-TW',{month:'long',day:'numeric',weekday:'long'}).format(new Date())}</p></div><div className="segmented" role="tablist">{[['feed',t.feed],['daily',t.daily],['notes',t.notes]].map(([k,v])=><button type="button" key={k} role="tab" aria-selected={k===tab} onClick={()=>setTab(k)}>{v}</button>)}</div>{tab==='feed'&&<FeedingCheckIn lang={lang} dateKey={dateKey} feed={feed} slots={slots} onMarkFeed={onMarkFeed} onChangeTime={onChangeTime} onAddSlot={onAddSlot} onDeleteSlot={onDeleteSlot} toast={toast}/>}
{tab==='daily'&&<><div className="small-stats"><strong>{checked.length} / 6</strong><span>{t.daily}</span></div>{list.map((x,i)=><label className="daily-row" key={i}><input type="checkbox" checked={checked.includes(i)} onChange={()=>markTask(i)}/><span>{x}</span></label>)}</>}{tab==='notes'&&<><textarea className="note-input" value={draft} placeholder={t.notesPlaceholder} maxLength={500} onChange={e=>setDraft(e.target.value)} rows={4}/><button className="wide-button" disabled={!draft.trim()} onClick={()=>{setNotes(old=>[{id:Date.now()+'-'+Math.random().toString(36).slice(2),text:draft.trim(),date:new Date().toLocaleDateString(lang==='hans'?'zh-CN':'zh-TW')},...old].slice(0,40));setDraft('');toast(t.saved)}}>{t.save}</button>{notes.length?notes.slice(0,12).map(n=><div className="note-card" key={n.id}><div><small>{n.date}</small><button onClick={()=>{setNotes(old=>old.filter(x=>x.id!==n.id));toast(t.removed)}}>{t.delete}</button></div><p>{n.text}</p></div>):<p className="empty-state">{t.empty}</p>}</>}</div>}
function Settings({lang,navigate}){const t=I18N[lang];return <div className="view-flow"><div className="section-lead"><h2>{t.tab[4]}</h2><p>{t.settingsHint}</p></div><div className="group-list"><GroupCard emoji="🐥" title={t.pet} onClick={()=>navigate('pet')}/><GroupCard emoji="🔔" title={t.reminders} onClick={()=>navigate('reminders')}/><GroupCard emoji="🌐" title={t.language} onClick={()=>navigate('language')}/><GroupCard emoji="💾" title={t.backup} onClick={()=>navigate('backup')}/><GroupCard emoji="☁️" title={t.cloud} onClick={()=>navigate('cloud')}/><GroupCard emoji="📲" title={t.install} onClick={()=>navigate('install')}/></div><p className="minor-copy center">{t.offline}</p></div>}
function PetSettings({lang,name,setName,birth,setBirth,toast,onNameCommit}){const t=I18N[lang];const since=birth?new Date(birth+'T12:00:00'):null;const age=since&&since<=new Date()?Math.max(0,(new Date().getFullYear()-since.getFullYear())*12+new Date().getMonth()-since.getMonth()):null;return <div className="view-flow"><div className="section-lead"><h2>{t.pet}</h2></div><div className="form-card"><label>{t.petName}<input type="text" value={name==='香蕉'&&readRaw('ylg-name','')===''?'':name} maxLength={32} placeholder={t.petPlaceholder} onChange={e=>setName(e.target.value||'香蕉')} onBlur={()=>{onNameCommit?.(name);toast(t.nameSaved)}}/></label><label>{t.birthday}<input type="date" value={birth} max={TODAY()} onChange={e=>{setBirth(e.target.value);toast(t.dateSaved)}}/></label><div className="subtle-field">{t.age}：{age===null?t.unknown:age+(lang==='hans'?' 个月':' 個月')}</div></div></div>}
function ReminderSettings({lang,name,slots,onChangeTime,onAddSlot,onDeleteSlot,toast}){
 const t=I18N[lang],[time,setTime]=useState('12:00');
 const remove=id=>{if(slots.length<=1){toast(lang==='hans'?'至少保留一餐':'至少保留一餐','error');return}
  if(window.confirm(lang==='hans'?'确定删除该时段？历史记录仍会保留。':'確定刪除此時段？歷史紀錄仍會保留。'))onDeleteSlot(id)};
 return <div className="view-flow"><div className="section-lead"><h2>{t.reminders}</h2><p>{lang==='hans'?'每餐都能设独立通知时间':'每餐皆可設定獨立提醒時間'}</p></div>
 <div className="form-card">{slots.map((slot,i)=><label className="time-setting" key={slot.id}><span>{labelForSlot(slot.id,slots,lang)}</span><input type="time" value={slot.time} onChange={e=>{if(SLOT_CLOCK.test(e.target.value)){onChangeTime(slot.id,e.target.value);toast(t.timeSaved)}}}/>
 <button className="feeding-remove" type="button" aria-label={t.delete} onClick={()=>remove(slot.id)}>✕</button></label>)}</div>
 <div className="feeding-add"><label>{lang==='hans'?'新时段':'新時段'}<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><button disabled={slots.length>=MAX_SLOTS} onClick={()=>{if(SLOT_CLOCK.test(time)){onAddSlot(time);toast(lang==='hans'?'已新增时段':'已新增時段')}}}>{lang==='hans'?'＋ 新增时段':'＋ 新增時段'}</button></div>
 <button className="wide-button" onClick={()=>{download('banana-reminders.ics',new Blob([calendarText(name,slots,lang)],{type:'text/calendar;charset=utf-8'}));toast(t.calendarReady)}}>📅 {t.calendar}</button>
 <p className="minor-copy">{(HELP[lang].reminders).join(' ')}</p></div>
}
function LanguageSettings({lang,languageMode,setLanguageMode,deviceLanguage,locale}){
 const t=I18N[lang],autoLabel=lang==='hans'?'跟随设备语言':'跟隨裝置語言';
 const displayed=deviceLanguage==='hans'?'简体中文':'繁體中文';
 const options=[['auto',autoLabel,locale+' · '+displayed],['hans','简体中文',''],['hant','繁體中文','']];
 return <div className="view-flow"><div className="section-lead"><h2>{t.language}</h2><p>{lang==='hans'?'默认跟随设备，手动选择后会保持该语言。':'預設跟隨裝置，手動選擇後會保留該語言。'}</p></div>
 <div className="group-list">{options.map(([id,title,sub])=><button type="button" className="language-card" key={id} aria-pressed={languageMode===id} onClick={()=>setLanguageMode(id)}>
 <span>{id==='auto'?'📱':'🌐'}</span><span style={{display:'grid',textAlign:'start',gap:4}}><b>{title}</b>{sub&&<small>{sub}</small>}</span><span>{languageMode===id?'✓':'　'}</span></button>)}</div>
 <p className="minor-copy">{lang==='hans'?'当前仅支持简体、繁体中文；其他设备语言暂用繁体中文。':'目前僅支援繁體、簡體中文；其他裝置語言暫用繁體中文。'}</p></div>
}
function Backup({lang,toast}){const t=I18N[lang];const input=useRef(null);const exportBackup=()=>{const entries={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('ylg-'))entries[k]=localStorage.getItem(k)}}catch{}download('banana-backup-'+TODAY()+'.json',new Blob([JSON.stringify({app:'banana-care',schema:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:'application/json'}));toast(t.saved)};const importBackup=async(e)=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('size');const data=JSON.parse(await file.text());if(data.app!=='banana-care'||data.schema!==1||!data.entries||typeof data.entries!=='object'||Array.isArray(data.entries)||Object.entries(data.entries).some(([k,v])=>!k.startsWith('ylg-')||typeof v!=='string'||v.length>250000))throw Error('invalid');if(!window.confirm(t.importConfirm))return;for(const [k,v] of Object.entries(data.entries))localStorage.setItem(k,v);toast(t.importDone);setTimeout(()=>window.location.reload(),600)}catch{toast(t.importError,'error')}finally{e.target.value=''}};return <div className="view-flow"><div className="section-lead"><h2>{t.backup}</h2></div><div className="group-list"><GroupCard emoji="📤" title={t.export} onClick={exportBackup}/><GroupCard emoji="📥" title={t.import} onClick={()=>input.current?.click()}/></div><input type="file" ref={input} hidden accept=".json,application/json" onChange={importBackup}/><p className="minor-copy">{HELP[lang].backup.join(' ')}</p></div>}
async function copyUrl(){try{await navigator.clipboard.writeText(SITE_URL);return true}catch{const e=document.createElement('textarea');e.value=SITE_URL;document.body.appendChild(e);e.select();const result=document.execCommand('copy');e.remove();return result}}
function Install({lang,name,toast}){const t=I18N[lang];const share=async()=>{if(navigator.share){try{await navigator.share({title:name+' · '+t.app,text:t.shareText,url:SITE_URL});return}catch(e){if(e.name==='AbortError')return}}const ok=await copyUrl();toast(ok?t.copied:t.error,ok?'success':'error')};return <div className="view-flow"><div className="section-lead"><h2>{t.install}</h2></div><div className="install-cover"><img src="./icons/banana-192.png" alt="Banana" /><strong>{name} · {t.app}</strong><small>PWA · iPhone</small></div><div className="install-buttons"><button onClick={share}>↗ {t.share}</button><button onClick={async()=>toast(await copyUrl()?t.copied:t.error)}>🔗 {t.copy}</button></div><div className="info-card"><h3>📱 {t.installAction}</h3>{t.installSteps.map((row,i)=><div className="install-step" key={i}><span>{i+1}</span><div><b>{row[0]}</b><p>{row[1]}</p></div></div>)}</div></div>}
export function App(){const [languageMode,setLanguageMode]=useRaw('ylg-language','auto'),[locale,setLocale]=useState(deviceLocale),[name,setName]=useRaw('ylg-name','香蕉'),[birth,setBirth]=useRaw('ylg-birth',''),[slots,setSlots]=usePersist('ylg-feed-slots-v2',slotsFromLegacy(read('ylg-feed-schedule-v1',DEFAULT_SCHEDULE))),[view,setView]=useState(()=>{const key=location.hash.replace('#','');return PAGES.includes(key)?key:'home'}),[menu,setMenu]=useState(false),[help,setHelp]=useState(false),[toast,show]=useToast(),[date,setDate]=useState(TODAY),[feed,setFeed]=usePersist('ylg-feed-'+date,{}),[checked,setChecked]=usePersist('ylg-check-'+date,[]),[notes,setNotes]=usePersist('ylg-notes',[]),[cloudCred,setCloudCred]=useState(readCredentials);const display=name.trim()||'香蕉',safeLang=resolveLanguage(languageMode,locale),t=I18N[safeLang],scroller=useRef(null),lastMain=useRef('home');
const deviceLanguage=resolveLanguage('auto',locale);
useEffect(()=>{
 if(languageMode!=='auto')return;
 const update=()=>setLocale(previous=>{const value=deviceLocale();return value===previous?previous:value});
 update();
 window.addEventListener('languagechange',update);
 window.addEventListener('pageshow',update);
 window.addEventListener('focus',update);
 document.addEventListener('visibilitychange',update);
 return()=>{
  window.removeEventListener('languagechange',update);
  window.removeEventListener('pageshow',update);
  window.removeEventListener('focus',update);
  document.removeEventListener('visibilitychange',update);
 };
},[languageMode]);
const navigate=useCallback(next=>{if(!PAGES.includes(next))return;history.pushState({},'','#'+next);setView(next);setHelp(false);setMenu(false)},[]);
useEffect(()=>{const onBack=()=>{const k=location.hash.replace('#','');setView(PAGES.includes(k)?k:'home')};window.addEventListener('popstate',onBack);window.addEventListener('hashchange',onBack);return()=>{window.removeEventListener('popstate',onBack);window.removeEventListener('hashchange',onBack)}},[]);
useEffect(()=>{if(MAIN.includes(view))lastMain.current=view;scroller.current?.scrollTo({top:0,behavior:'instant'});},[view]);
useEffect(()=>{document.documentElement.lang=safeLang==='hans'?'zh-Hans':'zh-Hant';document.title=display+' · '+t.app},[safeLang,display,t.app]);
useEffect(()=>{const refresh=()=>setDate(TODAY());const interval=setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',refresh)}},[]);
useEffect(()=>{setFeed(read('ylg-feed-'+date,{}));setChecked(read('ylg-check-'+date,[]))},[date]);
useEffect(()=>{if(!MAIN.includes(view))return;const onTouchStart=e=>{if(e.touches.length!==1||e.target.closest('button,a,input,textarea,summary,.age-strip,.segmented,.drawer'))return;scroller.current.__touch={x:e.touches[0].clientX,y:e.touches[0].clientY,page:view}};const onTouchEnd=e=>{const p=scroller.current?.__touch;if(!p||!e.changedTouches.length)return;scroller.current.__touch=null;const dx=e.changedTouches[0].clientX-p.x,dy=e.changedTouches[0].clientY-p.y;if(Math.abs(dx)<110||Math.abs(dx)<Math.abs(dy)*1.8||Math.abs(dy)>65)return;const i=MAIN.indexOf(p.page)+(dx<0?1:-1);if(i>=0&&i<MAIN.length)navigate(MAIN[i])};const el=scroller.current;el?.addEventListener('touchstart',onTouchStart,{passive:true});el?.addEventListener('touchend',onTouchEnd,{passive:true});return()=>{el?.removeEventListener('touchstart',onTouchStart);el?.removeEventListener('touchend',onTouchEnd)}},[view,navigate]);
useEffect(()=>{const check=()=>{for(const slot of evaluateSlots(feed,slots,new Date())){if(slot.state!=='due')continue;const key='ylg-noticed-'+TODAY()+'-'+slot.id+'-'+slot.time;try{if(sessionStorage.getItem(key))continue;sessionStorage.setItem(key,'1')}catch{}show(t.reminderNotice+'：'+labelForSlot(slot.id,slots,safeLang));break}};check();const timer=setInterval(check,60000);document.addEventListener('visibilitychange',check);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',check)}},[feed,slots,safeLang,t]);
useEffect(()=>{if(!('serviceWorker' in navigator))return;navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{})},[]);

const hydrateCloud=useCallback(state=>{
 if(!state?.account)return;
 if(typeof state.account.name==='string')setName(state.account.name);
 if(state.account.slots)setSlots(normalizeSlots(state.account.slots));
 else if(state.account.times)setSlots(slotsFromLegacy(state.account.times));
 if(state.feed&&typeof state.feed==='object')setFeed(state.feed);
},[setName,setSlots,setFeed]);
useEffect(()=>{
 if(!cloudCred||!backendReady())return;
 let stopped=false;
 const update=async()=>{
  const flushed=await syncPending(cloudCred);
  if(!flushed||stopped)return;
  try{const remote=await cloudState(cloudCred,date);if(!stopped)hydrateCloud(remote)}catch(e){console.warn('Cloud sync pending',e?.message)}
 };
 update();window.addEventListener('online',update);
 const periodic=setInterval(update,120000);
 return()=>{stopped=true;window.removeEventListener('online',update);clearInterval(periodic)};
},[cloudCred?.accountId,cloudCred?.accessKey,date,hydrateCloud]);
const submitChange=useCallback(job=>{
 if(!cloudCred||!backendReady())return;
 queueChange(job);
 syncPending(cloudCred).catch(()=>{});
},[cloudCred?.accountId,cloudCred?.accessKey]);
useEffect(()=>{
 if(!cloudCred||!backendReady())return;
 submitChange({kind:'account',patch:{language:safeLang}});
},[safeLang,cloudCred?.accountId,cloudCred?.accessKey,submitChange]);
const markFeed=useCallback((slot,done)=>{
 const completedAt=done?new Date().toISOString():null;
 setFeed(previous=>{
  const next={...previous};
  if(done)next[slot]=completedAt;else delete next[slot];
  return next;
 });
 submitChange({kind:'feed',date,slot,done,completedAt});
},[date,setFeed,submitChange]);
const saveRemoteName=useCallback(value=>{
 submitChange({kind:'account',patch:{name:String(value||'香蕉').trim()||'香蕉'}});
},[submitChange]);
const saveSlots=useCallback(next=>{
 if(!next)return;
 setSlots(next);
 submitChange({kind:'account',patch:{slots:next}});
},[setSlots,submitChange]);
const editSlotTime=useCallback((id,time)=>{
 if(!SLOT_CLOCK.test(time))return;
 const next=updateSlot(normalizeSlots(read('ylg-feed-slots-v2',slots)),id,time);
 saveSlots(next);
},[slots,saveSlots]);
const createSlot=useCallback(time=>{
 const next=addSlot(normalizeSlots(read('ylg-feed-slots-v2',slots)),time);
 saveSlots(next);
},[slots,saveSlots]);
const removeSlot=useCallback(id=>{
 const next=deleteSlot(normalizeSlots(read('ylg-feed-slots-v2',slots)),id);
 saveSlots(next);
},[slots,saveSlots]);

const safeChecked=Array.isArray(checked)?checked.filter(x=>Number.isInteger(x)&&x>=0&&x<6):[];const count=Math.min(6,new Set(safeChecked).size) +activeCount(feed,slots);
let body;if(view==='home')body=<Home lang={safeLang} name={display} count={count} feed={feed} slots={slots} navigate={navigate}/>;else if(view==='guide')body=<GuideHome lang={safeLang} navigate={navigate}/>;else if(GUIDE.some(x=>x[0]===view))body=<Topic page={view} lang={safeLang}/>;else if(view==='growth')body=<Growth lang={safeLang}/>;else if(view==='journal')body=<Journal lang={safeLang} dateKey={date} feed={feed} onMarkFeed={markFeed} onChangeTime={editSlotTime} onAddSlot={createSlot} onDeleteSlot={removeSlot} checked={safeChecked} setChecked={setChecked} notes={Array.isArray(notes)?notes:[]} setNotes={setNotes} slots={slots} toast={show}/>;else if(view==='settings')body=<Settings lang={safeLang} navigate={navigate}/>;else if(view==='pet')body=<PetSettings lang={safeLang} name={display} setName={setName} birth={birth} setBirth={setBirth} toast={show} onNameCommit={saveRemoteName}/>;else if(view==='reminders')body=<ReminderSettings lang={safeLang} name={display} slots={slots} onChangeTime={editSlotTime} onAddSlot={createSlot} onDeleteSlot={removeSlot} toast={show}/>;else if(view==='language')body=<LanguageSettings lang={safeLang} languageMode={languageMode} setLanguageMode={setLanguageMode} deviceLanguage={deviceLanguage} locale={locale}/>;else if(view==='backup')body=<Backup lang={safeLang} toast={show}/>;else if(view==='install')body=<Install lang={safeLang} name={display} toast={show}/>;else if(view==='cloud')body=<CloudPage lang={safeLang} name={display} slots={slots} feed={feed} credentials={cloudCred} onConnected={setCloudCred} onDisconnected={()=>setCloudCred(null)} onRemoteState={hydrateCloud} toast={show}/>;
return <div className="app-shell"><Toast toast={toast}/><Drawer open={menu} close={()=>setMenu(false)} navigate={navigate} lang={safeLang} name={display}/><header className="app-header"><div className="header-start">{MAIN.includes(view)?<button className="icon-button menu-trigger" aria-label={safeLang==='hans'?'打开菜单':'開啟選單'} onClick={()=>setMenu(true)}>☰</button>:<button className="icon-button menu-trigger" aria-label={t.back} onClick={()=>navigate(lastMain.current)}>‹</button>}<span className="header-bird">🐤</span><div className="header-copy"><strong>{view==='home'?display+' · '+t.app:titleFor(view,t)}</strong><small>Banana Care · v{V}</small></div></div><button type="button" className="icon-button help-trigger" onClick={()=>setHelp(true)} aria-label={t.help} aria-haspopup="dialog">?</button></header><main className="app-scroller" ref={scroller} key={view}>{body}</main><nav className="app-tabs" aria-label="Main navigation">{NAV.map(([page,emoji],i)=><button key={page} type="button" className={view===page||((!MAIN.includes(view))&&(page===lastMain.current))?'selected':''} aria-current={view===page?'page':undefined} onClick={()=>navigate(page)}><span>{emoji}</span><small>{t.tab[i]}</small></button>)}</nav>{help&&<HelpModal view={view} lang={safeLang} close={()=>setHelp(false)}/>}</div>}
