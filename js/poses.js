// Skeleton poses (angles in radians) used by drawChar / drawRig
export const POSE={
  stand:{hip:.8,lean:.03,legs:[{a:.08,b:.05},{a:-.08,b:.05}],arms:[{a:.2,b:.3},{a:-.15,b:.3}]},
  crouch:{hip:.5,lean:1.15,legs:[{a:1.3,b:2.1},{a:.35,b:1.6}],arms:[{a:0,b:0},{a:.08,b:0}]},
  set:{hip:.68,lean:1.25,legs:[{a:.9,b:1.6},{a:.1,b:1.0}],arms:[{a:0,b:0},{a:.08,b:0}]},
  ljAir:{hip:.8,lean:.35,legs:[{a:1.5,b:.2},{a:1.35,b:.3}],arms:[{a:1.8,b:.2},{a:1.6,b:.3}]},
  sit:{hip:.17,lean:.75,legs:[{a:1.5,b:.25},{a:1.4,b:.2}],arms:[{a:1.3,b:.2},{a:1.1,b:.3}]},
  hurdle:{hip:.8,lean:.55,legs:[{a:1.5,b:.05},{a:-.35,b:1.9}],arms:[{a:1.5,b:.15},{a:-.6,b:1.0}]},
  stumble:{hip:.5,lean:1.3,legs:[{a:.4,b:1.3},{a:-.5,b:.7}],arms:[{a:1.7,b:.2},{a:1.4,b:.3}]},
  dip:{hip:.72,lean:.75,legs:[{a:-.7,b:.4},{a:.8,b:.4}],arms:[{a:-1.3,b:.3},{a:-1.0,b:.2}]},
  cheer:{hip:.8,lean:0,legs:[{a:.12,b:.05},{a:-.12,b:.05}],arms:[{a:2.7,b:.2},{a:-2.7,b:-.2}]},
  // same celebration for image parts: both arms up and back so the wide near arm doesn't cover the face
  cheerRig:{hip:.8,lean:0,legs:[{a:.12,b:.05},{a:-.12,b:.05}],arms:[{a:-2.55,b:-.4},{a:-2.85,b:-.2}]},
  pvPlant:{hip:.82,lean:-.15,legs:[{a:.5,b:.6},{a:-.4,b:.3}],arms:[{a:2.75,b:.1},{a:2.55,b:.2}]},
  pvSwing:{hip:.85,lean:-.3,legs:[{a:1.7,b:.25},{a:1.5,b:.45}],arms:[{a:2.9,b:.05},{a:2.75,b:.1}]},
  pvOver:{hip:.85,lean:-.5,legs:[{a:-1.4,b:-.5},{a:-1.2,b:-.7}],arms:[{a:2.6,b:.1},{a:2.4,b:.2}]},
  lie:{hip:.25,lean:1.55,legs:[{a:1.45,b:.3},{a:1.6,b:.2}],arms:[{a:2.2,b:.2},{a:2.6,b:.3}]},
  javBack:{hip:.78,lean:-.28,legs:[{a:.55,b:.3},{a:-.45,b:.2}],arms:[{a:-2.0,b:.05},{a:1.0,b:.5}]},
  javRel:{hip:.78,lean:.38,legs:[{a:.65,b:.1},{a:-.55,b:.5}],arms:[{a:2.5,b:.1},{a:-.7,b:.6}]}
};
// run cycle at phase p (radians, one stride = 2π), amp 0 (walk) .. 1 (sprint); run:true marks it as continuous
// motion for the stickman's pose blending. The body bobs twice per stride (lowest when a foot lands), the knee folds
// up behind on the swing, and the elbows open a little on the back swing.
export function runPose(p,amp,arms){
  const leg=q=>({a:.9*amp*Math.sin(q),b:.2+amp*(1.5*Math.max(0,Math.cos(q))+.35*Math.max(0,-Math.sin(q))*Math.max(0,-Math.cos(q)))});
  const arm=q=>({a:-.9*amp*Math.sin(q),b:1.3-.35*amp*Math.max(0,Math.sin(q))});
  const J={run:true,hip:.8-.04*amp+.035*amp*Math.cos(2*p),lean:.08+.26*amp+.03*amp*Math.cos(2*p),legs:[leg(p),leg(p+Math.PI)],arms:[arm(p),arm(p+Math.PI)]};
  if(arms==='jav') J.arms=[{a:-2.4,b:.55},arm(p+Math.PI)];
  if(arms==='pole'){ J.arms=[{a:1.05,b:1.25},{a:.75,b:1.5}]; J.lean=.05+.15*amp; }
  return J;
}
