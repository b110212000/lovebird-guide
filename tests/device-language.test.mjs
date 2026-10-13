import test from 'node:test';
import assert from 'node:assert/strict';
import {languageForLocale,resolveLanguage} from '../src/device-language.js';

test('Taiwan, Hong Kong, Macau and Hant locales use Traditional Chinese',()=>{
  for(const locale of ['zh-TW','zh-HK','zh-MO','zh-Hant','zh-Hant-TW','zh_Hant_HK']){
    assert.equal(languageForLocale(locale),'hant',locale);
  }
});
test('Mainland, Singapore, Hans and plain Chinese use Simplified Chinese',()=>{
  for(const locale of ['zh-CN','zh-SG','zh-Hans','zh-Hans-CN','zh']){
    assert.equal(languageForLocale(locale),'hans',locale);
  }
});
test('non-Chinese languages fall back to Traditional while English UI is unavailable',()=>{
  assert.equal(languageForLocale('en-US'),'hant');
  assert.equal(languageForLocale('ja-JP'),'hant');
});
test('manual choices override device, auto follows device',()=>{
  assert.equal(resolveLanguage('auto','zh-CN'),'hans');
  assert.equal(resolveLanguage('auto','zh-TW'),'hant');
  assert.equal(resolveLanguage('hant','zh-CN'),'hant');
  assert.equal(resolveLanguage('hans','zh-TW'),'hans');
  assert.equal(resolveLanguage('', 'zh-TW'),'hant');
});
