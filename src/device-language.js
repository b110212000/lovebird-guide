// Prefer the device's primary browser/app language (navigator.languages[0]).
// Only Simplified/Traditional Chinese UI is currently available.
export function deviceLocale(){
  if(typeof navigator==='undefined')return 'zh-TW';
  return navigator.languages?.[0]||navigator.language||'zh-TW';
}
export function languageForLocale(locale){
  const value=String(locale||'').replace(/_/g,'-').toLowerCase();
  if(/^zh(?:-(?:hant|tw|hk|mo))(?:-|$)/.test(value))return 'hant';
  if(/^zh(?:-(?:hans|cn|sg|my))(?:-|$)/.test(value))return 'hans';
  if(value==='zh')return 'hans';
  // The app only has Chinese content: non-Chinese device languages
  // fall back to Traditional Chinese rather than pretending to be translated.
  return 'hant';
}
export function resolveLanguage(preference,locale){
  return preference==='hans'||preference==='hant'?preference:languageForLocale(locale);
}
