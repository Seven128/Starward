/** v1 retains its DOI contract. v2 can state that the processed product has
 * no supplied DOI; its publisher's actual IVOA identifier remains required.
 * An original dataset DOI is a separate identity, never a substitute. */
export function opticalHipsSourceIdentityValid(source:{hipsDoi:unknown;hipsCreatorDid?:unknown},version:unknown):boolean {
  const doi=typeof source.hipsDoi==="string"&&source.hipsDoi.trim().length>0;
  if(version==="starward-optical-hips-v1")return doi;
  return version==="starward-optical-hips-v2"&&(source.hipsDoi===null||doi)&&
    typeof source.hipsCreatorDid==="string"&&/^ivo:\/\/[^\s/?#]+\/[^\s?#]+$/u.test(source.hipsCreatorDid);
}
