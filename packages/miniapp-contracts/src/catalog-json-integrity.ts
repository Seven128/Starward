import { utf8ContentIntegrity } from './utf8-content-integrity.ts';

/** JSON.stringify bytes match the offline publisher. No Node, WebCrypto,
 * TextEncoder or filesystem dependency is required in the Mini Program.
 */
export function catalogJsonIntegrity(value: unknown) {
  const text=JSON.stringify(value);
  if(typeof text!=='string') throw new TypeError('catalog_json_invalid');
  return utf8ContentIntegrity(text);
}
