import type {SaturnBandsManifestData} from "@starward/miniapp-contracts";
import {assertOpalBandsManifest} from "./opal-bands-publication";

export function assertSaturnBandsManifest(value:unknown):asserts value is SaturnBandsManifestData{
  assertOpalBandsManifest<SaturnBandsManifestData>(value,{
    schema:"starward-opal-saturn-bands-v1",body:"saturn",
    file:"saturn-opal-2025a-median-bands-8x512.png",bytes:1003,
    imageSha:"68da69457db865d4f0f517ecb034d0a208925b9fe5595ee8ac1e9a54ba43869c",
    sourceSha:"c34a13a8253a39bcc1f8376b24c077b89f05ce0b5202706f535ded20314440d7",
    sourceFile:"hlsp_opal_hst_wfc3-uvis_saturn-2025a_f395n-f502n-f631n_v1_globalmap.tif",
    record:"https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-32",
    date:"2025-08-29"});
}
