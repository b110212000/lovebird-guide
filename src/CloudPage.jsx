import React,{useState,useEffect,useCallback} from 'react';
import {backendReady,readCredentials,saveCredentials,clearCredentials,registerAccount,cloudUpdate,cloudFeed,cloudState,cloudHistory,queueLength,syncPending,enableCloudPush,disableCloudPush,subscriptionSupported} from './cloud-api.js';
import {API_BASE} from './cloud-config.js';
const WORDS={
hans:{title:'云端同步与通知',intro:'每个人独立保存自己的鸟和喂食记录。',notReady:'后台代码已经准备好，但 Cloudflare Worker 还没有部署，暂时仍使用本地模式。',local:'本地模式',connected:'已连接自己的云端账号',create:'开启我的云端账号',busy:'正在连接…',code:'我的恢复密钥',codeHint:'这是进入你个人数据的密钥。请只保存在自己信任的地方，不要分享给别人。换手机可用它恢复账号。',copy:'复制恢复密钥',restore:'在新设备恢复账号',restoreInput:'粘贴恢复密钥（账号ID.访问密钥）',restoreButton:'连接已有账号',current:'当前保存记录',history:'近 30 天喂食记录',noHistory:'还没有云端喂食记录',push:'iPhone 通知',enable:'开启推送通知',disable:'关闭推送通知',pushHint:'请从 iPhone 主屏幕打开 App 后点击开启通知。需要 iOS 16.4 或更新版本，且必须允许通知。',pushEnabled:'推送已经开启',pushOff:'未开启推送',pending:'待同步记录',sync:'立即同步',syncDone:'云端同步完成',createDone:'个人云端账号已建立',restoreDone:'已恢复账号并同步',fail:'云端请求失败，请检查网络与 Worker 设置',invalid:'恢复密钥格式不正确',copied:'恢复密钥已复制',disconnect:'只退出这台设备',confirm:'确定在这台设备退出云端吗？本机记录不会删除，记得保存恢复密钥。',disconnected:'本机已退出云端',status:'状态',timezone:'时区'},
hant:{title:'雲端同步與通知',intro:'每個人獨立儲存自己的小鳥及餵食紀錄。',notReady:'後端程式已準備好，但 Cloudflare Worker 尚未部署，目前仍使用本機模式。',local:'本機模式',connected:'已連接自己的雲端帳戶',create:'啟用我的雲端帳戶',busy:'連線中…',code:'我的復原金鑰',codeHint:'這是進入你個人資料的金鑰。請妥善保存，不要分享給別人；換手機可用來恢復帳戶。',copy:'複製復原金鑰',restore:'在新裝置恢復帳戶',restoreInput:'貼上復原金鑰（帳戶ID.存取金鑰）',restoreButton:'連接既有帳戶',current:'目前儲存紀錄',history:'近 30 天餵食紀錄',noHistory:'目前沒有雲端餵食紀錄',push:'iPhone 通知',enable:'開啟推播通知',disable:'關閉推播通知',pushHint:'請從 iPhone 主畫面開啟 App 再啟用通知。需要 iOS 16.4 以上並允許通知。',pushEnabled:'推播已開啟',pushOff:'尚未開啟推播',pending:'待同步紀錄',sync:'立即同步',syncDone:'雲端同步完成',createDone:'個人雲端帳戶已建立',restoreDone:'已恢復帳戶並同步',fail:'雲端請求失敗，請檢查網路與 Worker 設定',invalid:'復原金鑰格式不正確',copied:'復原金鑰已複製',disconnect:'只在此裝置登出',confirm:'確定在這台裝置登出雲端嗎？本機紀錄不會刪除，請先保存復原金鑰。',disconnected:'此裝置已登出雲端',status:'狀態',timezone:'時區'}
};
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
export function CloudPage({lang,name,schedule,feed,credentials,onConnected,onDisconnected,toast,onRemoteState}){
 const t=WORDS[lang], [busy,setBusy]=useState(false),[remote,setRemote]=useState(null),[history,setHistory]=useState([]),[secretInput,setSecretInput]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(queueLength());
 const creds=credentials||readCredentials();
 const refresh=useCallback(async()=>{
  if(!backendReady()||!creds)return;
  try{
    await syncPending(creds);
    const [state,events]=await Promise.all([cloudState(creds,today()),cloudHistory(creds)]);
    setRemote(state.account);setHistory(events.history||[]);setPending(queueLength());
    if(onRemoteState)onRemoteState(state);
    setError('');
  }catch(e){setError(e.message||t.fail)}
 },[creds?.accountId,creds?.accessKey,onRemoteState]);
 useEffect(()=>{refresh()},[refresh]);
 const perform=async(task,success)=>{
  setBusy(true);setError('');
  try{await task();if(success)toast(success)}
  catch(e){setError(e.message||t.fail);toast(t.fail,'error')}
  finally{setBusy(false)}
 };
 const start=()=>perform(async()=>{
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Taipei';
  const account=await registerAccount(name,tz);
  const auth={accountId:account.accountId,accessKey:account.accessKey};
  saveCredentials(auth);
  await cloudUpdate(auth,{times:schedule});
  for(const [slot,done] of Object.entries(feed||{}))if(['morning','evening'].includes(slot)&&done)await cloudFeed(auth,today(),slot,true);
  const state=await cloudState(auth,today());setRemote(state.account);setPending(queueLength());onConnected(auth);
 },t.createDone);
 const restore=()=>perform(async()=>{
  const [id,key,...extra]=secretInput.trim().split('.');
  if(extra.length||!id||!key||!/^[a-f0-9]{32}$/.test(id)||!/^[A-Za-z0-9_-]{43}$/.test(key))throw Error(t.invalid);
  const auth={accountId:id,accessKey:key};
  const state=await cloudState(auth,today());saveCredentials(auth);onConnected(auth);
  setRemote(state.account);setSecretInput('');if(onRemoteState)onRemoteState(state);
 },t.restoreDone);
 const copy=()=>perform(async()=>{const code=creds.accountId+'.'+creds.accessKey;await navigator.clipboard.writeText(code)},t.copied);
 const notify=()=>perform(async()=>{
  const account=remote?.subscriptionActive?await disableCloudPush(creds):await enableCloudPush(creds);
  if(account)setRemote(account);
  else setRemote(prev=>({...prev,subscriptionActive:false,notificationsEnabled:false}));
 },t.syncDone);
 const sync=()=>perform(async()=>{await syncPending(creds);await refresh()},t.syncDone);
 const disconnect=()=>{
  if(!window.confirm(t.confirm))return;
  clearCredentials();onDisconnected();setRemote(null);setHistory([]);toast(t.disconnected);
 };
 return <div className="view-flow cloud-page"><div className="section-lead"><h2>{t.title}</h2><p>{t.intro}</p></div>
  {!backendReady()?<div className="info-card cloud-warning"><h3>☁️ {t.local}</h3><p>{t.notReady}</p><small>{t.status}: Worker {API_BASE||'(not configured)'}</small></div>:
  !creds?<><div className="info-card"><h3>☁️ {t.local}</h3><p>{t.intro}</p><button className="wide-button" disabled={busy} onClick={start}>{busy?t.busy:t.create}</button></div><div className="info-card"><h3>🔑 {t.restore}</h3><textarea className="note-input" value={secretInput} onChange={e=>setSecretInput(e.target.value)} placeholder={t.restoreInput} rows="3"/><button className="wide-button" disabled={busy||!secretInput.trim()} onClick={restore}>{t.restoreButton}</button></div></>:
  <><div className="info-card cloud-connected"><h3>☁️ {t.connected}</h3><p>{t.status}: {remote?.name||name}</p><p>{t.timezone}: {remote?.timezone||'—'}</p><p>{t.pending}: {pending}</p><button className="wide-button" disabled={busy} onClick={sync}>{t.sync}</button></div>
  <div className="info-card"><h3>🔔 {t.push}</h3><p>{remote?.subscriptionActive?t.pushEnabled:t.pushOff}</p><button className="wide-button" disabled={busy||!subscriptionSupported()} onClick={notify}>{remote?.subscriptionActive?t.disable:t.enable}</button><p className="minor-copy">{t.pushHint}</p></div>
  <div className="info-card"><h3>🔑 {t.code}</h3><p>{t.codeHint}</p><button className="wide-button" disabled={busy} onClick={copy}>{t.copy}</button></div>
  <div className="info-card"><h3>📆 {t.history}</h3>{history.length?history.slice(0,30).map(row=><div className="cloud-history-row" key={row.date}><span>{row.date}</span><div className="cloud-history-feed"><strong>{['morning','evening'].filter(id=>row.feed?.[id]).length} / 2</strong><small>{['morning','evening'].map((id,i)=>{const ts=row.feed?.[id];if(!ts||!Number.isFinite(Date.parse(ts)))return null;return (i?'晚上':'早上')+' '+new Intl.DateTimeFormat(lang==='hans'?'zh-CN':'zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ts))}).filter(Boolean).join(' · ')}</small></div></div>):<p>{t.noHistory}</p>}</div>
  <button type="button" className="cloud-disconnect" onClick={disconnect}>{t.disconnect}</button></>}
  {error&&<p className="cloud-error" role="alert">{error}</p>}
 </div>
}