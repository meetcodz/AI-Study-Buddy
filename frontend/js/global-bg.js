(function() {
  const css = `
    #global-bg-wrap {
      position: fixed;
      inset: 0;
      z-index: -1000;
      pointer-events: none;
      background: #0A0C12;
      overflow: hidden;
    }
    #global-bg-wrap::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(59,130,246,0.035) 1px,transparent 1px),
        linear-gradient(90deg,rgba(59,130,246,0.035) 1px,transparent 1px);
      background-size: 64px 64px;
      pointer-events: none;
    }
    #global-bg-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 70% 55% at 50% 42%,rgba(59,130,246,0.07) 0%,transparent 70%);
      pointer-events: none;
    }
    #global-particle-canvas {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    body { background: transparent !important; }
  `;
  const style = document.createElement('style');
  style.innerHTML = css;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.id = 'global-bg-wrap';
  
  const canvas = document.createElement('canvas');
  canvas.id = 'global-particle-canvas';
  
  const glow = document.createElement('div');
  glow.id = 'global-bg-glow';

  wrap.appendChild(canvas);
  wrap.appendChild(glow);
  document.body.prepend(wrap);

  const ctx = canvas.getContext('2d');
  let W, H, pts = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class P {
    constructor() { this.reset(true); }
    reset(init) {
      this.x = Math.random() * W;
      this.y = init ? Math.random() * H : H + 5;
      this.vx = (Math.random() - .5) * .28;
      this.vy = -(Math.random() * .4 + .1);
      this.r = Math.random() * 1.4 + .3;
      this.a = Math.random() * .35 + .05;
      this.life = 1;
      this.col = Math.random() > .5 ? '59,130,246' : '20,184,166';
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= .0015;
      if (this.life <= 0 || this.y < -5) this.reset(false);
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.col},${this.a * this.life})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 80; i++) pts.push(new P());
  
  (function loop() {
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  })();
})();
