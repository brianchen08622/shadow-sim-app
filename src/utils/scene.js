/**
 * Three.js 3D 光影場景
 * 支援兩個場景切換：台北101都市街道 / 台科大校園
 *
 * RN → WebView message：{ azimuth, altitude, month, lat, preset }
 */

export function generateSceneHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body { width:100%; height:100%; background:#0D1117; overflow:hidden; }
    canvas { display:block; width:100%; height:100%; }
    #loading {
      position:absolute; inset:0; display:flex; align-items:center;
      justify-content:center; background:#0D1117; color:#6A8A6A;
      font:15px -apple-system,sans-serif; flex-direction:column; gap:10px; z-index:10;
    }
    #hint {
      position:absolute; bottom:10px; left:50%; transform:translateX(-50%);
      color:rgba(255,255,255,0.4); font:11px -apple-system,sans-serif;
      pointer-events:none; transition:opacity 1s;
    }
  </style>
</head>
<body>
  <div id="loading"><div style="font-size:36px">🏙</div><div>載入場景中...</div></div>
  <canvas id="c"></canvas>
  <div id="hint">拖曳旋轉視角</div>
  <script src="https://unpkg.com/three@0.150.0/build/three.min.js"></script>
  <script>
  (function() {
    const DEG = Math.PI / 180;

    // ── Renderer ──────────────────────────────────────────────
    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.getElementById('loading').style.display = 'none';
    setTimeout(() => { document.getElementById('hint').style.opacity = '0'; }, 3000);

    // ── Scene ─────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xA8C4DC, 0.007);

    // ── Camera ────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.5, 300);
    let camTheta = DEG * 40, camPhi = DEG * 55;
    let camRadius = 65, camTarget = new THREE.Vector3(0, 8, 0);

    function updateCamera() {
      camera.position.set(
        camTarget.x + camRadius * Math.sin(camPhi) * Math.sin(camTheta),
        camTarget.y + camRadius * Math.cos(camPhi),
        camTarget.z + camRadius * Math.sin(camPhi) * Math.cos(camTheta)
      );
      camera.lookAt(camTarget);
    }
    updateCamera();

    // ── Touch ─────────────────────────────────────────────────
    let touch0 = null;
    canvas.addEventListener('touchstart', e => { e.preventDefault(); touch0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault(); if (!touch0) return;
      const dx = e.touches[0].clientX - touch0.x, dy = e.touches[0].clientY - touch0.y;
      camTheta -= dx * 0.007;
      camPhi = Math.max(0.10, Math.min(1.48, camPhi + dy * 0.007));
      touch0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      updateCamera();
    }, { passive: false });
    canvas.addEventListener('touchend', () => touch0 = null);

    // ── Lighting ──────────────────────────────────────────────
    const sunLight = new THREE.DirectionalLight(0xFFF5DC, 2.5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -55; sunLight.shadow.camera.right = 55;
    sunLight.shadow.camera.top = 55; sunLight.shadow.camera.bottom = -55;
    sunLight.shadow.bias = -0.0006;
    scene.add(sunLight); scene.add(sunLight.target);

    const hemi = new THREE.HemisphereLight(0x9ABCD0, 0xC8B490, 0.6);
    scene.add(hemi);

    // ── Sun sphere ────────────────────────────────────────────
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), new THREE.MeshBasicMaterial({ color: 0xFFE055 }));
    sunMesh.add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), new THREE.MeshBasicMaterial({ color: 0xFFCC00, transparent: true, opacity: 0.22 })));
    scene.add(sunMesh);

    // ── Helpers ───────────────────────────────────────────────
    function sunDir(az, alt) {
      return { x: Math.sin(az)*Math.cos(alt), y: Math.sin(alt), z: -Math.cos(az)*Math.cos(alt) };
    }

    function addBox(parent, x, y, z, w, h, d, mat, shadow = true) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      if (shadow) { m.castShadow = true; m.receiveShadow = true; }
      parent.add(m); return m;
    }

    function addCylinder(parent, x, y, z, rt, rb, h, seg, mat) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
      m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
    }

    function textLabel(text, w, h) {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
      const ctx = cv.getContext('2d');
      ctx.font = 'bold 26px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 32);
      return new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
    }

    function compassLabel(text, x, z, rotZ) {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
      const ctx = cv.getContext('2d');
      ctx.font = 'bold 30px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 64, 32);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.5),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = rotZ || 0;
      m.position.set(x, 0.05, z); return m;
    }

    function addTree(parent, x, z) {
      const matT = new THREE.MeshLambertMaterial({ color: 0x7A5828 });
      const matL1 = new THREE.MeshLambertMaterial({ color: 0x3A6820 });
      const matL2 = new THREE.MeshLambertMaterial({ color: 0x285018 });
      const th = 1.0 + Math.random() * 0.6;
      addCylinder(parent, x, th/2, z, 0.11, 0.17, th, 6, matT);
      const ch = 1.6 + Math.random() * 0.5;
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.85, ch, 7), matL1);
      c1.position.set(x, th + ch*0.5, z); c1.castShadow = true; parent.add(c1);
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.6, ch*0.65, 7), matL2);
      c2.position.set(x, th + ch*0.85, z); c2.castShadow = true; parent.add(c2);
    }

    function addWindowBand(parent, bx, bz, bw, bd, y, mat) {
      [[0, bd/2+0.02, 0],[0,-bd/2-0.02,Math.PI],[bw/2+0.02,0,Math.PI/2],[-bw/2-0.02,0,-Math.PI/2]].forEach(([ox,oz,ry]) => {
        const ww = oz !== 0 ? bw*0.72 : bd*0.72;
        const wm = new THREE.Mesh(new THREE.PlaneGeometry(ww, 0.7), mat);
        wm.position.set(bx+ox, y, bz+oz); wm.rotation.y = ry; parent.add(wm);
      });
    }

    // ── Scene objects container ───────────────────────────────
    const group101   = new THREE.Group(); scene.add(group101);
    const groupNTUST = new THREE.Group(); scene.add(groupNTUST);
    const groupIndoor = new THREE.Group(); scene.add(groupIndoor);
    groupNTUST.visible  = false;
    groupIndoor.visible = false;
    let MAIN_H_REF = 38;

    // ════════════════════════════════════════════════════════════
    // 場景A：台北101 都市街道
    // ════════════════════════════════════════════════════════════
    function buildTaipei101() {
      const g = group101;

      const matGnd  = new THREE.MeshLambertMaterial({ color: 0xC0AC90 });
      const matRoad = new THREE.MeshLambertMaterial({ color: 0x686860 });
      const matSW   = new THREE.MeshLambertMaterial({ color: 0xA89878 });
      const matRoof = new THREE.MeshLambertMaterial({ color: 0x7A8888 });
      const matWin  = new THREE.MeshLambertMaterial({ color: 0x607888, transparent:true, opacity:0.75 });
      const matBldg = [0xE8DDD0,0xDED2C0,0xD8CAB8,0xE4D8C8,0xCEC2B2].map(c => new THREE.MeshLambertMaterial({color:c}));

      // 地面
      addBox(g, 0,0,0, 80,0.02,80, matGnd, false).rotation.x = 0;
      const gnd = new THREE.Mesh(new THREE.PlaneGeometry(80,80), matGnd);
      gnd.rotation.x = -Math.PI/2; gnd.receiveShadow = true; g.add(gnd);

      // 道路
      [[0,-3.5,80,3.0],[0,3.5,80,3.0],[-3.5,0,3.0,80],[3.5,0,3.0,80],[0,0,3.0,3.0]].forEach(([x,z,w,d]) => {
        const r = new THREE.Mesh(new THREE.PlaneGeometry(w,d), matRoad);
        r.rotation.x = -Math.PI/2; r.position.set(x,0.01,z); r.receiveShadow=true; g.add(r);
      });
      // 人行道
      [[0,-2.0,80,0.8],[0,2.0,80,0.8],[-2.0,0,0.8,80],[2.0,0,0.8,80]].forEach(([x,z,w,d]) => {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(w,d), matSW);
        s.rotation.x = -Math.PI/2; s.position.set(x,0.02,z); s.receiveShadow=true; g.add(s);
      });

      // 配樓（8棟）
      [{x:-7,z:-7,h:5.5,mi:0},{x:0,z:-7,h:8.0,mi:1},{x:7,z:-7,h:4.5,mi:2},
       {x:-7,z:0,h:9.5,mi:3},{x:7,z:0,h:7.0,mi:1},
       {x:-7,z:7,h:4.5,mi:2},{x:0,z:7,h:6.0,mi:0},{x:7,z:7,h:5.5,mi:3}
      ].forEach(b => {
        addBox(g, b.x, b.h/2, b.z, 3.8, b.h, 3.8, matBldg[b.mi]);
        addBox(g, b.x, b.h+0.15, b.z, 3.95, 0.3, 3.95, matRoof);
        const floors = Math.floor(b.h/2.8);
        for (let f=1; f<=floors; f++) addWindowBand(g, b.x, b.z, 3.8, 3.8, (f/(floors+1))*b.h, matWin);
      });

      // 台北101主塔
      const mat101  = new THREE.MeshLambertMaterial({ color: 0x5A8878 });
      const mat101L = new THREE.MeshLambertMaterial({ color: 0x4A7868 });
      const mat101W = new THREE.MeshLambertMaterial({ color: 0x8ABCB0, transparent:true, opacity:0.7 });
      const matPod  = new THREE.MeshLambertMaterial({ color: 0x8A9090 });
      const matSp   = new THREE.MeshLambertMaterial({ color: 0xCCCCBB });

      addBox(g, 0, 1.5, 0, 7.5, 3.0, 7.5, matPod);  // 裙樓
      const segs = [{w:4.5,h:4.0},{w:4.1,h:4.0},{w:3.7,h:3.8},{w:3.3,h:3.8},
                    {w:3.0,h:3.5},{w:2.7,h:3.5},{w:2.4,h:3.2},{w:2.0,h:3.2}];
      let yb = 3.0;
      segs.forEach((s,i) => {
        addBox(g, 0, yb+(s.h-0.4)/2, 0, s.w, s.h-0.4, s.w, i%2===0 ? mat101 : mat101L);
        addBox(g, 0, yb+0.175, 0, s.w+0.5, 0.35, s.w+0.5, mat101L);
        const rows = Math.floor((s.h-0.4)/1.4);
        for (let r=1; r<=rows; r++) {
          [0,Math.PI/2,Math.PI,Math.PI*1.5].forEach(ry => {
            const wm = new THREE.Mesh(new THREE.PlaneGeometry(s.w*0.75, 0.65), mat101W);
            wm.position.set(Math.sin(ry)*(s.w/2+0.01), yb+(r/(rows+1))*(s.h-0.4), -Math.cos(ry)*(s.w/2+0.01));
            wm.rotation.y = ry; g.add(wm);
          });
        }
        yb += s.h;
      });
      addCylinder(g, 0, yb+1.0, 0, 0.25, 0.35, 2.0, 8, matSp);
      addCylinder(g, 0, yb+6.0, 0, 0.04, 0.22, 8.0, 8, matSp);
      const lbl = textLabel('TAIPEI 101', 4.5, 1.1);
      lbl.position.set(0, yb+12, 3.5); g.add(lbl);

      // 樹木
      [[-5,-5],[5,-5],[-5,5],[5,5],[-14,-14],[14,-14],[-14,14],[14,14],
       [-14,0],[14,0],[0,-14],[0,14]].forEach(([x,z]) => addTree(g, x, z));

      // 羅盤
      g.add(compassLabel('N 北', 0,-24)); g.add(compassLabel('S 南', 0,24));
      g.add(compassLabel('E 東',24,0,Math.PI/2)); g.add(compassLabel('W 西',-24,0,Math.PI/2));
    }

    // ════════════════════════════════════════════════════════════
    // 場景B：台科大校園
    // ════════════════════════════════════════════════════════════
    function buildNTUST() {
      const g = groupNTUST;
      // 座標：+X=東, -Z=北, +Z=南（校門口）
      // 場景以 RB 為中心：
      //   TR(西,-24)  運動場(西,-16~+12)  T1(細,-8)
      //   AU(-4,-8)   RB(0,2)   Library(+14,0)
      //   T4(+4,-16)  E1(+14,-18)

      const matGnd    = new THREE.MeshLambertMaterial({ color: 0xC8C0A0 });
      const matPath   = new THREE.MeshLambertMaterial({ color: 0xDED6BC });
      const matGrass  = new THREE.MeshLambertMaterial({ color: 0x6A9050 });
      const matCourt  = new THREE.MeshLambertMaterial({ color: 0x4A7060 }); // 球場地面
      const matRoof   = new THREE.MeshLambertMaterial({ color: 0x606060 });
      const matWin    = new THREE.MeshLambertMaterial({ color: 0x5A7888, transparent:true, opacity:0.7 });
      const matRB     = new THREE.MeshLambertMaterial({ color: 0xD0C8B8 }); // RB 米白混凝土
      const matTR     = new THREE.MeshLambertMaterial({ color: 0xA8A098 }); // TR 深灰
      const matLib    = new THREE.MeshLambertMaterial({ color: 0xD8D4C8 }); // 圖書館 淺米
      const matT1     = new THREE.MeshLambertMaterial({ color: 0xBCB4A4 }); // T1
      const matT4     = new THREE.MeshLambertMaterial({ color: 0xB8B0A0 }); // T4
      const matGls    = new THREE.MeshLambertMaterial({ color: 0x6090AA, transparent:true, opacity:0.7 });
      const matTrack  = new THREE.MeshLambertMaterial({ color: 0xBB4444 }); // 跑道
      const matInner  = new THREE.MeshLambertMaterial({ color: 0x4A6844 }); // 內場草

      // ── 地面 ──
      const gnd = new THREE.Mesh(new THREE.PlaneGeometry(100,100), matGnd);
      gnd.rotation.x = -Math.PI/2; gnd.receiveShadow = true; g.add(gnd);

      // ── 主要步道 ──
      [ [0, 5, 4, 56], [-8, -3, 4, 30], [5, -12, 30, 4] ]
        .forEach(([x,z,w,d]) => {
          const p = new THREE.Mesh(new THREE.PlaneGeometry(w,d), matPath);
          p.rotation.x = -Math.PI/2; p.position.set(x,0.01,z);
          p.receiveShadow = true; g.add(p);
        });

      // ── 草地廣場（RB 南側 & 圖書館旁）──
      [ {x:4, z:13, w:20, d:8}, {x:14, z:4, w:8, d:12} ]
        .forEach(p => {
          const gr = new THREE.Mesh(new THREE.PlaneGeometry(p.w,p.d), matGrass);
          gr.rotation.x=-Math.PI/2; gr.position.set(p.x,0.02,p.z);
          gr.receiveShadow=true; g.add(gr);
        });

      // ════ TR 研揚大樓（最西側，緊鄰運動場） ════
      // 細長塔，依圖約 10 層
      // TR 橫跨操場全長（z=-19 到 z=16，中心 z=-1.5，深度 35）
      addBox(g, -34, 15, -1.5, 5.0, 30, 35.0, matTR);
      addBox(g, -34, 31, -1.5, 4.0, 2.0, 33.0, matTR);
      addBox(g, -34, 32.2, -1.5, 3.2, 0.4, 32.0, matRoof);
      for (let f=1; f<=10; f++) {
        const wm = new THREE.Mesh(new THREE.PlaneGeometry(33.0, 2.2), matGls);
        wm.position.set(-34, f*2.9-1.0, 14.52); wm.rotation.y = Math.PI; g.add(wm);
      }
      const trLbl = textLabel('TR 研揚大樓', 3.8, 0.85);
      trLbl.position.set(-34, 34, -1.5); g.add(trLbl);

      // ════ 運動場（TR 東側） ════
      // 網球場（北區，2面）
      const tennisMat = new THREE.MeshLambertMaterial({ color: 0x4878A0 });
      const tennis = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), tennisMat);
      tennis.rotation.x = -Math.PI/2; tennis.position.set(-17, 0.03, -14);
      tennis.receiveShadow = true; g.add(tennis);
      // 球場白線
      [-20,-14].forEach(x => {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 10),
          new THREE.MeshLambertMaterial({ color: 0xFFFFFF }));
        line.rotation.x = -Math.PI/2; line.position.set(x, 0.04, -14); g.add(line);
      });

      // 籃球場（中區，2面）
      const bballMat = new THREE.MeshLambertMaterial({ color: 0xC06830 });
      const bball = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), bballMat);
      bball.rotation.x = -Math.PI/2; bball.position.set(-17, 0.03, -2);
      bball.receiveShadow = true; g.add(bball);
      // 中線
      const midLine = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.2),
        new THREE.MeshLambertMaterial({ color: 0xFFFFFF }));
      midLine.rotation.x = -Math.PI/2; midLine.position.set(-17, 0.04, -2); g.add(midLine);

      // 跑道（南區，橢圓形）
      // 直線段 + 半圓近似
      const trackRect = new THREE.Mesh(new THREE.PlaneGeometry(18, 10), matTrack);
      trackRect.rotation.x = -Math.PI/2; trackRect.position.set(-17, 0.03, 11); g.add(trackRect);
      const trackEnd1 = new THREE.Mesh(new THREE.CircleGeometry(5, 32), matTrack);
      trackEnd1.rotation.x = -Math.PI/2; trackEnd1.position.set(-26, 0.03, 11); g.add(trackEnd1);
      const trackEnd2 = new THREE.Mesh(new THREE.CircleGeometry(5, 32), matTrack);
      trackEnd2.rotation.x = -Math.PI/2; trackEnd2.position.set(-8, 0.03, 11); g.add(trackEnd2);
      // 內場草地
      const inner1 = new THREE.Mesh(new THREE.PlaneGeometry(18, 6), matInner);
      inner1.rotation.x = -Math.PI/2; inner1.position.set(-17, 0.04, 11); g.add(inner1);
      const inner2 = new THREE.Mesh(new THREE.CircleGeometry(3, 32), matInner);
      inner2.rotation.x = -Math.PI/2; inner2.position.set(-26, 0.04, 11); g.add(inner2);
      const inner3 = new THREE.Mesh(new THREE.CircleGeometry(3, 32), matInner);
      inner3.rotation.x = -Math.PI/2; inner3.position.set(-8, 0.04, 11); g.add(inner3);

      // ════ T1 第一教學大樓（細長，N-S走向） ════
      addBox(g, -9, 10, -4, 3.5, 20, 18, matT1);
      addBox(g, -9, 20.2, -4, 3.7, 0.4, 18.2, matRoof);
      for (let f=1; f<=6; f++) {
        const wm = new THREE.Mesh(new THREE.PlaneGeometry(17.5, 2.5), matGls);
        wm.position.set(-9, f*3.0-0.5, -4); wm.rotation.y = Math.PI/2; g.add(wm);
      }
      const t1Lbl = textLabel('T1', 2.0, 0.75);
      t1Lbl.position.set(-9, 22, -4); g.add(t1Lbl);

      // ════ AU 視聽館（T1 東側，RB 西北） ════
      // 依圖為梯形/五邊形，用旋轉矩形近似
      addBox(g, -3, 4, -8, 6.0, 8, 5.5, matT4);
      addBox(g, -3, 8.2, -8, 6.2, 0.4, 5.7, matRoof);
      const auLbl = textLabel('AU 視聽館', 2.8, 0.7);
      auLbl.position.set(-3, 9.5, -8); g.add(auLbl);
      // 噴水池
      const pond = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24),
        new THREE.MeshLambertMaterial({ color: 0x5090B0 }));
      pond.rotation.x = -Math.PI/2; pond.position.set(-1, 0.05, -4); g.add(pond);

      // ════ RB 綜合研究大樓（中央主建物，建築系8F） ════
      addBox(g, 4, 12, 4, 14.0, 24, 10.0, matRB);
      addBox(g, 4, 25.5, 4, 11.5, 3.0, 8.0, matRB);
      addBox(g, 4, 27.2, 4, 10.0, 0.4, 7.0, matRoof);
      // 水平遮陽板
      for (let f=1; f<=8; f++) {
        addBox(g, 4, f*2.9-0.1, 9.3, 14.2, 0.2, 0.55, matRoof);
      }
      // 玻璃帷幕南面
      for (let f=1; f<=8; f++) {
        const wm = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.4), matGls);
        wm.position.set(4, f*2.9-1.2, 9.02); g.add(wm);
      }
      const rbLbl = textLabel('RB 建築系 8F', 5.0, 1.0);
      rbLbl.position.set(4, 29.5, 5.5); g.add(rbLbl);

      // ════ 圖書館（RB 東側，較高） ════
      addBox(g, 16, 14, 2, 8.0, 28, 10.0, matLib);
      addBox(g, 16, 28.2, 2, 8.2, 0.4, 10.2, matRoof);
      // 玻璃入口（西面面向廣場）
      addBox(g, 11.95, 6, 2, 0.3, 12, 6.0, matGls);
      for (let f=1; f<=8; f++) addWindowBand(g, 16, 2, 8.0, 10.0, f*3.2, matWin);
      const libLbl = textLabel('圖書館 Library', 4.2, 0.9);
      libLbl.position.set(16, 30, 2); g.add(libLbl);

      // ════ T4 第四教學大樓（RB 北側） ════
      addBox(g, 5, 8, -16, 12.0, 16, 7.0, matT4);
      addBox(g, 5, 16.2, -16, 12.2, 0.4, 7.2, matRoof);
      for (let f=1; f<=5; f++) addWindowBand(g, 5, -16, 12.0, 7.0, f*3.0, matWin);
      const t4Lbl = textLabel('T4', 2.5, 0.75);
      t4Lbl.position.set(5, 18, -16); g.add(t4Lbl);

      // ════ 校園入口牌樓（南方） ════
      addBox(g, 4, 2.5, 24, 16.0, 0.5, 0.8, matRoof);
      addBox(g, -4, 1.25, 24, 0.8, 2.5, 0.8, matRoof);
      addBox(g, 12, 1.25, 24, 0.8, 2.5, 0.8, matRoof);
      const gateLbl = textLabel('國立臺灣科技大學', 7.0, 1.1);
      gateLbl.position.set(4, 3.8, 24); g.add(gateLbl);

      // ── 樹木 ──
      [ [0,20],[8,20],[-4,18],[14,16],[20,8],[20,-4],
        [10,-20],[-2,-20],[-14,-18],[-16,-8],[-16,4],
        [-28,0],[-28,8],[-28,-8],[-4,0],[12,12]
      ].forEach(([x,z]) => addTree(g, x, z));

      // 羅盤
      g.add(compassLabel('N 北', 0,-30)); g.add(compassLabel('S 南', 0,30));
      g.add(compassLabel('E 東',30,0,Math.PI/2)); g.add(compassLabel('W 西',-30,0,Math.PI/2));
    }

    // ════════════════════════════════════════════════════════════
    // 場景C：室內採光
    // ════════════════════════════════════════════════════════════
    function buildIndoor() {
      const g = groupIndoor;

      const matWall  = new THREE.MeshLambertMaterial({ color: 0xEEE8DE, side: THREE.DoubleSide });
      const matFloor = new THREE.MeshLambertMaterial({ color: 0xD4C6A8 });
      const matGnd   = new THREE.MeshLambertMaterial({ color: 0x848478 });
      const matGlass = new THREE.MeshLambertMaterial({ color: 0x88AABB, transparent:true, opacity:0.18, side:THREE.DoubleSide });
      const matPerson= new THREE.MeshLambertMaterial({ color: 0x8090A8 });

      // 室外地面（延伸夠遠，覆蓋相機所在位置）
      const extGnd = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), matGnd);
      extGnd.rotation.x = -Math.PI/2; extGnd.position.set(0, 0, 7);
      extGnd.receiveShadow = true; g.add(extGnd);

      // 室內地板（含格線幫助判斷進深）
      const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 6.0), matFloor);
      floorMesh.rotation.x = -Math.PI/2; floorMesh.position.set(0, 0.01, -3);
      floorMesh.receiveShadow = true; g.add(floorMesh);
      const grid = new THREE.GridHelper(6, 6, 0xB8A888, 0xC8B898);
      grid.position.set(0, 0.02, -3); g.add(grid);

      // 四面牆 + 天花板（完整封閉，陽光只從窗口進入）
      addBox(g, 0, 3.05, -3, 8.0, 0.1, 6.0, matWall);   // 天花板
      addBox(g, 0, 1.5, -6.05, 8.0, 3.0, 0.1, matWall); // 後牆
      addBox(g, -4.05, 1.5, -3, 0.1, 3.0, 6.0, matWall); // 左牆
      addBox(g,  4.05, 1.5, -3, 0.1, 3.0, 6.0, matWall); // 右牆

      // 前牆（窗戶牆 z=0）— 窗口開口 x:-3~+3, y:0.9~2.7
      addBox(g, -3.5, 1.5, 0.05, 1.0, 3.0, 0.1, matWall); // 左段
      addBox(g,  3.5, 1.5, 0.05, 1.0, 3.0, 0.1, matWall); // 右段
      addBox(g,  0,  0.45, 0.05, 6.0, 0.9, 0.1, matWall); // 窗台
      addBox(g,  0,  2.85, 0.05, 6.0, 0.3, 0.1, matWall); // 窗頂樑

      // 玻璃
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 1.8), matGlass);
      glass.position.set(0, 1.8, 0.06); g.add(glass);

      // 窗框橘色線
      const winGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(6.0, 1.8, 0.05));
      const winEdge = new THREE.LineSegments(winGeo,
        new THREE.LineBasicMaterial({ color: 0xFFAA44, transparent:true, opacity:0.9 }));
      winEdge.position.set(0, 1.8, 0.06); g.add(winEdge);

      // 人形比例參考（站在窗邊 1.7m高）
      addBox(g, 2.5, 0.85, -1.0, 0.35, 1.7, 0.35, matPerson);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), matPerson);
      head.position.set(2.5, 1.85, -1.0); g.add(head);
    }

    // ── 初始建場景（全部先建好，用 visible 切換）────────────────
    let currentPreset = 'taipei101';
    buildTaipei101();
    buildNTUST();
    buildIndoor();

    // ── 太陽軌跡弧 ───────────────────────────────────────────
    let pathLine = null;
    function getDOY(m,d) { const dm=[0,31,28,31,30,31,30,31,31,30,31,30,31]; let r=d; for(let i=1;i<m;i++) r+=dm[i]; return r; }

    function buildSunPath(month, latDeg) {
      if (pathLine) { scene.remove(pathLine); pathLine.geometry.dispose(); }
      const pts = [], N = getDOY(month,15), dec = 23.45*Math.sin(DEG*(360/365)*(284+N));
      for (let h=4.5; h<=19.5; h+=0.25) {
        const ha=(h-12)*15;
        const sinAlt = Math.sin(DEG*latDeg)*Math.sin(DEG*dec)+Math.cos(DEG*latDeg)*Math.cos(DEG*dec)*Math.cos(DEG*ha);
        const alt = Math.asin(Math.max(-1,Math.min(1,sinAlt)))/DEG;
        if (alt<=0) continue;
        const cosAlt = Math.cos(DEG*alt);
        const cosAzS = (Math.sin(DEG*dec)-Math.sin(DEG*latDeg)*sinAlt)/(Math.cos(DEG*latDeg)*Math.max(0.001,cosAlt));
        let az = Math.acos(Math.max(-1,Math.min(1,cosAzS)))/DEG;
        if (ha>0) az=360-az; az=((az%360)+360)%360;
        const sd=sunDir(az*DEG,alt*DEG);
        pts.push(new THREE.Vector3(sd.x*38,sd.y*38,sd.z*38));
      }
      if (pts.length<2) return;
      pathLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color:0xFFAA44, transparent:true, opacity:0.5 }));
      scene.add(pathLine);
    }

    // ── 陰影線 ────────────────────────────────────────────────
    let shadowLine = null;
    function updateShadowLine(azDeg, altDeg) {
      if (shadowLine) { scene.remove(shadowLine); shadowLine.geometry.dispose(); }
      if (altDeg<=0.5) return;
      const len = MAIN_H_REF / Math.tan(altDeg*DEG);
      const saz = (azDeg+180)*DEG;
      const pts = [new THREE.Vector3(0,0.05,0), new THREE.Vector3(Math.sin(saz)*len,0.05,-Math.cos(saz)*len)];
      shadowLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color:0xFF6644, transparent:true, opacity:0.7 }));
      scene.add(shadowLine);
    }

    // ── 天空色 ────────────────────────────────────────────────
    const cDay=new THREE.Color(0x87CEEB), cDawn=new THREE.Color(0xFF7040),
          cTwi=new THREE.Color(0x253050), cNight=new THREE.Color(0x0D1117);

    function updateScene(azDeg, altDeg, month, latDeg) {
      const isIndoor = currentPreset === 'indoor';
      const sd=sunDir(azDeg*DEG,altDeg*DEG), dist=50;
      if (altDeg>0) {
        sunLight.position.set(sd.x*dist,sd.y*dist,sd.z*dist);
        sunLight.target.position.set(0,0,0); sunLight.target.updateMatrixWorld();
        sunLight.intensity = isIndoor ? 1.5+Math.sin(altDeg*DEG)*2.5 : 0.5+Math.sin(altDeg*DEG)*2.2;
        sunLight.color.setHex(altDeg<20 ? 0xFF9050 : 0xFFF5DC);
        sunMesh.visible = !isIndoor;
        if (!isIndoor) {
          sunMesh.position.set(sd.x*43,sd.y*43,sd.z*43);
          sunMesh.material.color.setHex(altDeg<15 ? 0xFF7030 : 0xFFE055);
        }
      } else { sunLight.intensity=0; sunMesh.visible=false; }
      hemi.intensity = isIndoor ? 0.30 : Math.max(0.05, 0.08+Math.max(0,Math.sin(altDeg*DEG))*0.65);
      let sky;
      if      (altDeg<=-5)  sky=cNight.clone();
      else if (altDeg<=0)   sky=cNight.clone().lerp(cTwi,(altDeg+5)/5);
      else if (altDeg<=12)  sky=cTwi.clone().lerp(cDawn,altDeg/6).lerp(cDay,altDeg/12);
      else                  sky=cDay.clone();
      scene.background = sky;
      scene.fog.density = isIndoor ? 0 : 0.007;
      scene.fog.color.copy(sky.clone().lerp(new THREE.Color(0xC8DCF0),0.5));
      if (!isIndoor) {
        if (month!==undefined && latDeg!==undefined) buildSunPath(month, latDeg);
        updateShadowLine(azDeg, altDeg);
      } else {
        if (pathLine) { pathLine.visible = false; }
        if (shadowLine) { scene.remove(shadowLine); shadowLine.geometry.dispose(); shadowLine=null; }
      }
    }

    // ── Message ───────────────────────────────────────────────
    let lastMonth=6, lastLat=25.04;
    function onMsg(raw) {
      try {
        const d = JSON.parse(typeof raw==='string' ? raw : raw.data);
        if (d.preset && d.preset !== currentPreset) {
          currentPreset = d.preset;
          group101.visible   = (d.preset === 'taipei101');
          groupNTUST.visible = (d.preset === 'ntust');
          groupIndoor.visible = (d.preset === 'indoor');
          if (d.preset === 'ntust') {
            MAIN_H_REF = 24;
            camRadius = 75; camTarget.set(0, 10, 2);
            sunLight.shadow.camera.left = -55; sunLight.shadow.camera.right = 55;
            sunLight.shadow.camera.top = 55; sunLight.shadow.camera.bottom = -55;
            sunLight.shadow.camera.updateProjectionMatrix();
          } else if (d.preset === 'indoor') {
            MAIN_H_REF = 3;
            camRadius = 12; camTarget.set(0, 1.5, -2);
            camTheta = DEG * 18; camPhi = DEG * 82;
            // 縮小陰影相機範圍，提升室內陰影精度
            sunLight.shadow.camera.left = -10; sunLight.shadow.camera.right = 10;
            sunLight.shadow.camera.top = 10; sunLight.shadow.camera.bottom = -10;
            sunLight.shadow.camera.updateProjectionMatrix();
          } else {
            MAIN_H_REF = 38;
            camRadius = 65; camTarget.set(0, 8, 0);
            sunLight.shadow.camera.left = -55; sunLight.shadow.camera.right = 55;
            sunLight.shadow.camera.top = 55; sunLight.shadow.camera.bottom = -55;
            sunLight.shadow.camera.updateProjectionMatrix();
          }
          updateCamera();
        }
        if (d.orientation !== undefined && currentPreset === 'indoor') {
          const orientMap = { south: 0, east: Math.PI/2, west: -Math.PI/2, north: Math.PI };
          groupIndoor.rotation.y = orientMap[d.orientation] !== undefined ? orientMap[d.orientation] : 0;
        }
        if (d.azimuth!==undefined) {
          lastMonth=d.month||lastMonth; lastLat=d.lat||lastLat;
          updateScene(d.azimuth,d.altitude,lastMonth,lastLat);
        }
      } catch(e) {}
    }
    window.addEventListener('message', onMsg);
    document.addEventListener('message', e => onMsg(e.data));

    // ── Animate ───────────────────────────────────────────────
    (function animate() { requestAnimationFrame(animate); renderer.render(scene,camera); })();
    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth,window.innerHeight);
      camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
    });

    updateScene(155, 58, 6, 25.04);
  })();
  </script>
</body>
</html>`;
}
