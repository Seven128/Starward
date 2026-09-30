import type {NeptuneBandsManifestData} from "@starward/miniapp-contracts";
import {assertOpalBandsManifest} from "./opal-bands-publication";

export function assertNeptuneBandsManifest(value:unknown):asserts value is NeptuneBandsManifestData{
  assertOpalBandsManifest<NeptuneBandsManifestData>(value,{
    schema:"starward-opal-neptune-bands-v1",body:"neptune",
    file:"neptune-opal-2025b-median-bands-8x512.png",bytes:527,
    imageSha:"447b4fc50a47b025cbaf5c1e4e5a0a8df8b1403c3706ba4b46fd432e7de391e0",
    sourceSha:"8c17a2872b5d55577c63abe7ba1369997ff32bb83e0f9b9c350a46db96713cb8",
    sourceFile:"hlsp_opal_hst_wfc3-uvis_neptune-2025b_f467m-f547m-f657n_v1_globalmap.tif",
    record:"https://archive.stsci.edu/hlsp/opal/opal-neptune-cycle-32",
    date:"2025-08-24"});
}
