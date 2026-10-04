import { dragSkyView, INITIAL_MANUAL_SKY_VIEW } from '../../../apps/wechat-miniapp/src/features/sky/sky-manual-view.ts';

const direction = (basis: typeof INITIAL_MANUAL_SKY_VIEW) => ({
  azimuthDeg: ((Math.atan2(basis.forward[0], basis.forward[1]) * 180 / Math.PI) + 360) % 360,
  altitudeDeg: Math.asin(basis.forward[2]) * 180 / Math.PI,
});
let basis = INITIAL_MANUAL_SKY_VIEW;
console.log('initial', direction(basis));
for (let i = 0; i < 5; i++) {
  basis = dragSkyView(basis, {x:50,y:450},{x:380,y:450},390.4,844,45);
  console.log('horizontal', i+1, direction(basis));
}
basis = dragSkyView(basis,{x:200,y:790},{x:200,y:90},390.4,844,45);
console.log('vertical', direction(basis));
basis = dragSkyView(basis,{x:200,y:90},{x:200,y:790},390.4,844,45);
console.log('reverse-vertical', direction(basis));
