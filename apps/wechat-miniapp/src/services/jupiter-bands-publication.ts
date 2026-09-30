import type {JupiterBandsManifestData} from "@starward/miniapp-contracts";
import {assertOpalBandsManifest} from "./opal-bands-publication";

export function assertJupiterBandsManifest(value:unknown):asserts value is JupiterBandsManifestData{
  assertOpalBandsManifest<JupiterBandsManifestData>(value,{
    schema:"starward-opal-jupiter-bands-v1",body:"jupiter",
    file:"jupiter-opal-2024c-median-bands-8x512.png",bytes:1026,
    imageSha:"8c3e6e19f2f620581a859e5496ab0361544c3a20b1c903b0c4236e85d4d75a47",
    sourceSha:"b352755811130a1ede851f9c62de48454cc249f2047a763782870ac8d8a158e2",
    sourceFile:"hlsp_opal_hst_wfc3-uvis_jupiter-2024c_f395n-f467m-f658n_v1_globalmap.tif",
    record:"https://archive.stsci.edu/hlsp/opal/opal-jupiter-cycle-31",
    date:"2024-11-19/2024-11-20"});
}
