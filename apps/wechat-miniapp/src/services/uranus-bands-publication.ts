import type {UranusBandsManifestData} from "@starward/miniapp-contracts";
import {assertOpalBandsManifest} from "./opal-bands-publication";

export function assertUranusBandsManifest(value:unknown):asserts value is UranusBandsManifestData{
  assertOpalBandsManifest<UranusBandsManifestData>(value,{
    schema:"starward-opal-uranus-bands-v1",body:"uranus",
    file:"uranus-opal-2025a-median-bands-8x512.png",bytes:421,
    imageSha:"308d1521b5f0adebc14249c686664907335cdf8e0334a5a7008392b62b66c817",
    sourceSha:"854ba9d0b744c2d6e6b646d315847a3528b94b4f0b8970cc4285d71228e69c7b",
    sourceFile:"hlsp_opal_hst_wfc3-uvis_uranus-2025a_f657n-f547m-f467m_v1_globalmap.tif",
    record:"https://archive.stsci.edu/hlsp/opal/opal-uranus-cycle-33",
    date:"2025-10-23"});
}
