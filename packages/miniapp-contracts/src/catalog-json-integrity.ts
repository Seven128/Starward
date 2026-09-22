import { sha256 } from '@noble/hashes/sha2.js';

/** JSON.stringify bytes match the offline publisher. No Node, WebCrypto,
 * TextEncoder or filesystem dependency is required in the Mini Program.
 */
export function catalogJsonIntegrity(value: unknown) {
  const text=JSON.stringify(value);
  if(typeof text!=='string') throw new TypeError('catalog_json_invalid');
  const escaped=encodeURIComponent(text),buffer=new Uint8Array(escaped.length);
  let length=0;
  for(let i=0;i<escaped.length;i++) {
    if(escaped[i]==='%') { buffer[length++]=Number.parseInt(escaped.slice(i+1,i+3),16);i+=2; }
    else buffer[length++]=escaped.charCodeAt(i);
  }
  const bytes=buffer.subarray(0,length);
  return {bytes:length,sha256:Array.from(sha256(bytes),v=>v.toString(16).padStart(2,'0')).join('')};
}
