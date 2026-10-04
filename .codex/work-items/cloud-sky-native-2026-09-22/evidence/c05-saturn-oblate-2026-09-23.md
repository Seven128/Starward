# C05 Saturn projected oblateness, 2026-09-23

## Input and result

- The existing exact-time SkyReport supplies Saturn's observer ENU ring pole and a globe angular diameter based on the 58,232 km volumetric mean radius. The [NASA Goddard NSSDCA Saturn Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html) gives the 1-bar equatorial and polar radii as 60,268 and 54,364 km. These are geometric numerical references, not an image/texture license.
- `sky-planet-disc.ts` uses those axes, the observer/pole dot product, and the existing stereographic camera tangent to project an oblate globe. At edge-on tilt the short/long-axis ratio is 54,364/60,268; at pole-on it approaches a circle. The projected minor direction follows the report pole, including canvas roll. The far-side C/B/A ring strokes now use this same silhouette for occultation.
- `sky-gpu-renderer.ts` passes the minor direction and ratio to the existing phase shader. Moon and non-Saturn planet discs retain a 1:1 silhouette, and the same inverse ENU ray still clips the geometric horizon.

## Checks

- New geometry regression checks the edge-on ratio, major radius relative to the report mean diameter, projected pole direction, and pole-on circle; targeted planet-disc tests: 7/7. The new assertion failed before the implementation because no oblate result existed.
- Mini typecheck and isolated WEAPP build passed. The build retains existing CSS-order and bundle/performance warnings. Full Mini tests: 815/815, zero failures. Raw logs: `c05-saturn-oblate-build-2026-09-23.log`, `c05-saturn-oblate-mini-tests-2026-09-23.log`.
- A bounded Chromium WebGL 1.0 probe compiled the **actual extracted** `imageVertex`/`moonFragment` shader strings and drew a 0.9 minor-ratio disc. Its framebuffer pixels were minor edge `[0,0,0,0]`, major edge `[193,193,193,255]`, centre `[255,255,255,255]`, and `gl.getError()` was `NO_ERROR`. The source-extraction script is `../saturn-webgl-probe.cjs`; generated local page is `c05-saturn-webgl-probe.html`. The temporary 127.0.0.1:18790 server and hidden browser tab were closed.

## Boundary and next step

This is a projected 1-bar shape with the existing approximate plain phase/light model. It does not add measured clouds, calibrated color, ring optical depth/shadow, or other planetary textures. Chromium WebGL1 checks shader behavior only; official WeChat DevTools/native Canvas pixels, Android/iOS quality, performance and independent review remain unverified. The user's Android was not used, and the shared 8787 BFF was not changed. Continue another independently verifiable non-phone C01/C04/C05/C06/C07 chain; keep the goal active.
