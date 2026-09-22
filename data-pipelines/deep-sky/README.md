# AllWISE W3 deep-sky imagery publication

`publish_allwise_w3.py` builds the three progressive image levels used by the
Mini Program from the pinned 51-row OpenNGC Messier catalog. It queries the
IRSA-hosted AllWISE W3 HiPS (12 µm) and requests exact north-up TAN products
from the documented CDS `hips2fits` processor at build time. It writes those
self-hosted JPEGs plus a provenance manifest that binds the IRSA survey URL,
the processing request and both dataset/service citations.

Rendered build products are regenerable cache inputs and must stay outside the release
bundle. The default output contains only the derived assets and manifest:

```powershell
.\.venv\Scripts\python.exe data-pipelines/deep-sky/publish_allwise_w3.py `
  --cache output/allwise-w3-source-cache `
  --output workers/miniapp-api/assets/deep-sky `
  --all
```

Use `--objects M:31,M:42` for a bounded integration trial. Requests are
sequential and cached so interrupted builds can resume without repeatedly
loading IRSA.

## Commercial-use notices and distribution

The adopted AllWISE W3 HiPS is `CDS/P/allWISE/W3`. Its [CDS record](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FallWISE%2FW3&fmt=html&get=record) identifies ODbL-1.0, CNRS/Unistra, CDS/Aladin and HiPS DOI `10.26093/cds/aladin/na1n-03`. The IRSA mirror's `unclonable` flag concerns HiPS mirroring; it is not a noncommercial license. See [HiPS §5.4](https://www.ivoa.net/documents/HiPS/20170519/REC-HIPS-1.0-20170519.pdf).

Keep the full [AllWISE WISE + NEOWISE acknowledgment](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec1_6b.html), IPAC/NASA credit and original Atlas DOI `10.26131/IRSA153` separately from the HiPS database license. Credit the actual [online CDS hips2fits service](https://alasky.cds.unistra.fr/hips-image-services/hips2fits); `10.26093/2msf-n437` refers to a different offline script and is not this pipeline's service citation. No CDS/NASA logos or endorsement are implied.

Starward offers this imagery selection/arrangement under ODbL, preserving the upstream database notice and the individual image acknowledgment. The manifest separately credits OpenNGC's CC BY-SA 4.0 target identities/positions. ODbL is not applied to the entire app or substituted for the catalog or image-content terms. The manifest describes the modifications and every exact processing request; the existing object-information source disclosure offers its hash-bound download, which lists all three image levels and their verified download URLs. This supplies the machine-readable collection and changes for [ODbL §§4.2–4.6](https://opendatacommons.org/licenses/odbl/1-0/). On an update, preserve applicable notices, regenerate publication identity, and keep the offer associated with the images being served.

The BFF serves `/v2/sky/deep-sky/{publicationHash}/manifest`; its hash identifies the stored manifest before delivery URLs are added. It is not the raw-byte SHA of that response. Image download URLs include the same hash and reject an unavailable version. Deployment must include the actual JPEGs and this download route; a local manifest alone does not deliver the offer to users. The runtime never retrieves upstream images.
