/* Shared browser-prototype motion. Domain selection/commit stays with each consumer. */
(() => {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function rubber(v,a,b,limit=48){const edge=clamp(v,a,b),d=v-edge;return edge+Math.sign(d)*limit*(1-1/(1+Math.abs(d)*.55/limit));}
  function unRubber(v,a,b,limit=48){const edge=clamp(v,a,b),d=Math.min(limit-.001,Math.abs(v-edge));return edge+Math.sign(v-edge)*(limit/(1-d/limit)-limit)/.55;}
  function velocity(samples,now){const s=samples.filter(p=>now-p.t<=100&&p.t<=now);if(s.length<2||now-s.at(-1).t>50)return 0;const dt=s.at(-1).t-s[0].t;return dt<8?0:clamp((s.at(-1).v-s[0].v)/dt,-3,3);}
  function resistance(v,a,b,limit=48){const d=Math.abs(v-clamp(v,a,b));return d?.55/(1+d*.55/limit)**2:1;}
  function sample(from,to,speed,ms,bouncy=false){
    const t=ms/1000,a=from-to,d=bouncy?19:24;
    if(!bouncy){const b=speed*1000+d*a,e=Math.exp(-d*t);return{value:to+(a+b*t)*e,speed:(b-d*(a+b*t))*e/1000};}
    const w=14,b=(speed*1000+d*a)/w,e=Math.exp(-d*t),wave=a*Math.cos(w*t)+b*Math.sin(w*t);
    return{value:to+wave*e,speed:(-a*w*Math.sin(w*t)+b*w*Math.cos(w*t)-d*wave)*e/1000};
  }
  function reduced(){return typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;}
  function scalar(value,paint){let frame=0,speed=0,finish=null,target=value;const stop=()=>{cancelAnimationFrame(frame);frame=0;finish=null;};
    const api={get value(){return value;},get speed(){return speed;},get active(){return !!frame;},stop,
      set(v){stop();value=v;speed=0;paint(v);},
      to(to,{velocity:initial=speed,bouncy=false,done}={}){stop();target=to;const from=value,at=performance.now();finish=done;if(reduced()){value=to;speed=0;paint(to);finish=null;done?.();return;}
        const tick=now=>{const s=sample(from,to,initial,now-at,bouncy);value=s.value;speed=s.speed;paint(value);
          if((Math.abs(value-to)<.001&&Math.abs(speed)<.0001)||now-at>=650){frame=0;value=to;speed=0;paint(to);const f=finish;finish=null;f?.();}else frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
      },finish(){if(!frame)return;cancelAnimationFrame(frame);frame=0;value=target;speed=0;paint(target);const f=finish;finish=null;f?.();}};return api;}
  function projected(value,speed,min,max,ms=160){return clamp(Math.round(value+speed*ms),min,max);}
  globalThis.StarwardFluid={clamp,rubber,unRubber,resistance,velocity,sample,scalar,reduced,projected};
})();
