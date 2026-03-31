// ═══════════════════════════════════════
// ui.js — Manager UI (CSS + HTML + events)
// Chạy sau khi api.js, worker.js, manager.js đã load
// ═══════════════════════════════════════

(function() {

  var TOKEN = localStorage.getItem('3big_session');
  var CH_NAME = '3big_auto_v4';

  // ── QUYẾT ĐỊNH MANAGER HAY WORKER ──────
  // Dùng sessionStorage để tránh xung đột
  var IS_MANAGER_KEY = '3big_is_manager_' + Date.now();

  // Broadcast check: ai là manager?
  var ch = new BroadcastChannel(CH_NAME);
  var decided = false;

  ch.postMessage({ type: '__CHECK_MGR__' });

  var checkTimer = setTimeout(function() {
    if (decided) return;
    decided = true;
    // Không ai trả lời => tab này làm Manager
    startAsManager();
  }, 600);

  ch.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === '__MGR_HERE__' && !decided) {
      // Đã có manager => tab này là Worker
      clearTimeout(checkTimer);
      decided = true;
      startAsWorker();
      return;
    }
    if (e.data.type === '__CHECK_MGR__' && decided && window.__a3bIsManager) {
      ch.postMessage({ type: '__MGR_HERE__' });
    }
  });

  // ── WORKER MODE ─────────────────────────
  function startAsWorker() {
    window.__a3bIsManager = false;
    if (typeof A3B_WORKER !== 'undefined') A3B_WORKER.init();
  }

  // ── MANAGER MODE ─────────────────────────
  function startAsManager() {
    window.__a3bIsManager = true;
    if (!TOKEN) return;

    injectCSS();
    injectHTML();
    bindEvents();
    if (typeof A3B_MANAGER !== 'undefined') A3B_MANAGER.init();

    // Load quota
    if (typeof A3B_API !== 'undefined') {
      A3B_API.quota().then(function(q) {
        var el = document.getElementById('a3m-quota');
        if (el) el.textContent = q.remaining + '/' + q.daily_limit + ' video còn';
      }).catch(function() {});
    }
  }

  // ── CSS ─────────────────────────────────
  function injectCSS() {
    var s = document.createElement('style');
    s.id = 'a3m-css';
    s.textContent = `
#a3m-btn{position:fixed;top:50%;right:0;transform:translateY(-50%);z-index:2147483648;background:#f5c842;border:none;border-radius:10px 0 0 10px;padding:14px 6px;cursor:pointer;color:#111;font-weight:800;font-size:9px;letter-spacing:1px;writing-mode:vertical-rl;font-family:system-ui;box-shadow:-4px 0 16px #0008;transition:all .2s}
#a3m-btn:hover{background:#ffd700;right:-2px}
#a3m-win{position:fixed;top:0;right:0;width:480px;height:100vh;background:#0c0c0c;border-left:1px solid #1e1e1e;z-index:2147483647;display:flex;flex-direction:column;font-family:system-ui;box-shadow:-8px 0 40px #000c;transition:transform .28s cubic-bezier(.4,0,.2,1)}
#a3m-win.hide{transform:translateX(100%)}
.a3mhd{background:linear-gradient(135deg,#1a1a1a,#111);border-bottom:1px solid #1e1e1e;padding:13px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.a3mic{width:28px;height:28px;background:linear-gradient(135deg,#f5c842,#f7a825);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:15px}
.a3mht{font-size:13px;font-weight:700;color:#eee}
.a3mhs{font-size:9px;color:#444;margin-top:1px}
.a3mq{font-size:10px;padding:2px 9px;border-radius:20px;background:#0a1a10;border:1px solid #1a4428;color:#5DCAA5;font-weight:600}
.msdot{width:7px;height:7px;border-radius:50%;background:#2a2a2a;flex-shrink:0}
.msdot.on{background:#5DCAA5;box-shadow:0 0 6px #5DCAA560;animation:mpulse 2s infinite}
@keyframes mpulse{0%,100%{opacity:1}50%{opacity:.4}}
.a3mtabs{display:flex;background:#0f0f0f;border-bottom:1px solid #1e1e1e;flex-shrink:0}
.a3mt{flex:1;padding:9px 4px;font-size:10px;color:#444;cursor:pointer;text-align:center;border-bottom:2px solid transparent;transition:all .15s;user-select:none}
.a3mt.on{color:#f5c842;border-bottom-color:#f5c842;background:#0c0c0c}
.a3mp{flex:1;overflow-y:auto;padding:13px;display:none;flex-direction:column;gap:9px}
.a3mp.on{display:flex}
.a3mcard{background:#141414;border:1px solid #1e1e1e;border-radius:9px;padding:12px}
.a3mlbl{font-size:9.5px;color:#444;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:7px;display:flex;align-items:center;gap:5px}
.a3mlbl::before{content:'';width:3px;height:10px;background:#f5c842;border-radius:2px;display:block}
.a3mta{width:100%;background:#080808;border:1px solid #222;border-radius:7px;color:#ccc;padding:9px;font-size:11px;resize:none;height:130px;line-height:1.6;font-family:monospace;transition:border-color .15s}
.a3mta:focus{outline:none;border-color:#f5c842}
.a3mg2{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.a3msel{width:100%;background:#080808;border:1px solid #222;border-radius:6px;color:#ccc;padding:6px 8px;font-size:10.5px}
.a3mwc{display:flex;gap:5px}
.a3mwcb{flex:1;padding:7px;background:#111;border:1px solid #222;border-radius:6px;color:#444;cursor:pointer;font-size:11px;font-weight:600;text-align:center;transition:all .15s}
.a3mwcb.on{background:#2a2200;border-color:#554400;color:#f5c842}
.a3mpbar{height:4px;background:#1a1a1a;border-radius:2px;overflow:hidden}
.a3mpfill{height:100%;background:linear-gradient(90deg,#f5c842,#f7a825);width:0;transition:width .5s;border-radius:2px}
.a3mpi{display:flex;justify-content:space-between;font-size:10px;color:#444;margin-top:4px}
.a3mbtn{width:100%;padding:11px;background:linear-gradient(135deg,#f5c842,#f7a825);color:#111;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 4px 16px #f5c84230;transition:all .15s}
.a3mbtn:hover{transform:translateY(-1px)}
.a3mbtn:disabled{background:#1a1a1a;color:#333;cursor:not-allowed;box-shadow:none;transform:none}
.a3mstop{width:100%;padding:9px;background:#1a0808;border:1px solid #441a1a;color:#F09595;border-radius:8px;font-size:12px;cursor:pointer;display:none}
.msm{padding:4px 10px;border-radius:5px;font-size:10px;cursor:pointer;border:1px solid #222;background:#111;color:#555;transition:all .15s}
.msm:hover{border-color:#f5c842;color:#f5c842}
.msm.msg{border-color:#1a4428;color:#5DCAA5;background:#0a1a10}
.mstats{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px}
.mstat{background:#111;border:1px solid #1e1e1e;border-radius:8px;padding:9px 8px;text-align:center}
.msn{font-size:20px;font-weight:700;color:#888}
.msl{font-size:9px;color:#444;margin-top:2px;text-transform:uppercase;letter-spacing:.4px}
.msn.gold{color:#f5c842}.msn.green{color:#5DCAA5}.msn.red{color:#F09595}.msn.blue{color:#AFA9EC}
.mwgrid{display:grid;gap:10px;padding:13px}
.mwcard{background:#111;border:1px solid #1e1e1e;border-radius:9px;overflow:hidden;margin-bottom:0}
.mwcard.mactive{border-color:#554400}
.mwcard.mdone{border-color:#1a4428}
.mwcard.merr{border-color:#441a1a}
.mwhd{padding:9px 12px;display:flex;align-items:center;justify-content:space-between;background:#141414;border-bottom:1px solid #1a1a1a}
.mwnm{font-size:11px;font-weight:700;color:#ddd;display:flex;align-items:center;gap:6px}
.mwdot{width:7px;height:7px;border-radius:50%;background:#2a2a2a;flex-shrink:0}
.mwdot.mon{background:#f5c842;animation:mpulse 1s infinite}
.mwdot.mok{background:#5DCAA5}
.mbadge{font-size:9.5px;padding:2px 8px;border-radius:20px}
.mb0{background:#111;color:#444;border:1px solid #222}
.mb1{background:#001a10;color:#5DCAA5;border:1px solid #004428}
.mb2{background:#1a1500;color:#f5c842;border:1px solid #554400}
.mb3{background:#0a1a10;color:#5DCAA5;border:1px solid #1a4428}
.mb4{background:#1a0808;color:#F09595;border:1px solid #441a1a}
.mwbody{padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.mwcj{font-size:11px;color:#888;min-height:28px;line-height:1.5}.mwnd{font-size:10px;color:#555;line-height:1.5;margin-top:2px;font-style:italic}
.mwstep{font-size:10px;color:#444}
.mwpbar{height:3px;background:#1a1a1a;border-radius:2px;overflow:hidden}
.mwpfill{height:100%;background:#f5c842;width:0;transition:width .4s;border-radius:2px}
.mwst{display:flex;gap:10px;font-size:10px;color:#444}
.mwst b{color:#888}
.mwqi{font-size:9.5px;padding:3px 8px;border-radius:5px;border:1px solid #1e1e1e;background:#0a0a0a;color:#444;margin-bottom:2px;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mwqi.qd{color:#5DCAA5;border-color:#1a4428;background:#0a1a10}
.mwqi.qr{color:#f5c842;border-color:#554400;background:#1a1500}
.mwqi.qe{color:#F09595;border-color:#441a1a;background:#1a0808}
.mqdot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0}
.mri{background:#141414;border:1px solid #1e1e1e;border-radius:9px;padding:11px 13px;display:flex;align-items:center;gap:10px}
.mri.mrdone{border-color:#1a4428}.mri.mrerr{border-color:#441a1a}
.mrn{font-size:11px;color:#444;min-width:24px}
.mrinfo{flex:1;min-width:0}
.mrt{font-size:12px;font-weight:600;color:#ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mrm{font-size:10px;color:#444;margin-top:3px}
#a3m-log{background:#080808;border-radius:7px;padding:9px;flex:1;overflow-y:auto;font-family:monospace;font-size:10.5px;line-height:1.9;min-height:60px}
.mll{display:flex;gap:6px}
.mlt{color:#1e1e1e;min-width:52px;font-size:9px;padding-top:1px;flex-shrink:0}
.mli{color:#444}.mlok{color:#5DCAA5}.mle{color:#F09595}.mlr{color:#f5c842}.mlb{color:#AFA9EC}.mlh{color:#1e1e1e}
.mlsep{border-top:1px solid #1a1a1a;margin:4px 0}
.mempty{display:flex;align-items:center;justify-content:center;height:100px;color:#2a2a2a;font-size:12px}
#a3m-win *::-webkit-scrollbar{width:4px}
#a3m-win *::-webkit-scrollbar-track{background:transparent}
#a3m-win *::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}
label{font-size:10px;color:#444;margin-bottom:4px;display:block}
    `;
    document.head.appendChild(s);
  }

  // ── HTML ────────────────────────────────
  function injectHTML() {
    // Toggle button
    var tbtn = document.createElement('button');
    tbtn.id = 'a3m-btn'; tbtn.innerHTML = '⚡<br>AUTO';
    document.body.appendChild(tbtn);

    // Main window
    var win = document.createElement('div');
    win.id = 'a3m-win';
    win.innerHTML = `
<div class="a3mhd">
  <div style="display:flex;align-items:center;gap:9px">
    <div class="a3mic">⚡</div>
    <div><div class="a3mht">3BIG Auto Studio</div><div class="a3mhs">Manager — sản xuất hàng loạt</div></div>
  </div>
  <div style="display:flex;align-items:center;gap:8px">
    <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:#444">
      <div class="msdot" id="a3m-sdot"></div><span id="a3m-stxt">Chờ worker...</span>
    </div>
    <span class="a3mq" id="a3m-quota">— / —</span>
  </div>
</div>

<div class="a3mtabs">
  <div class="a3mt on" data-t="input">✏️ Nhập</div>
  <div class="a3mt" data-t="workers">🖥 Workers</div>
  <div class="a3mt" data-t="results">🎬 Kết quả</div>
  <div class="a3mt" data-t="log">📋 Log</div>
</div>

<div class="a3mp on" id="a3m-p-input">
  <div class="a3mcard">
    <div class="a3mlbl">Danh sách kịch bản</div>
    <div style="font-size:10px;color:#444;margin-bottom:7px">Mỗi dòng 1 JSON — copy từ Claude dán vào đây</div>
    <textarea class="a3mta" id="a3m-ta" placeholder='{"nhanVat":"Máy tập gym, giọng miền Tây","noiDung":"Mua về tập 1 lần rồi treo quần áo"}
{"nhanVat":"Tủ lạnh hay phàn nàn","noiDung":"Chủ ăn kiêng mà mở tủ 8 lần/ngày"}'></textarea>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
      <span style="font-size:10px;color:#444" id="a3m-cnt">0 kịch bản</span>
      <button class="msm" id="a3m-chk">🔍 Kiểm tra</button>
    </div>
  </div>
  <div class="a3mcard">
    <div class="a3mlbl">Cài đặt</div>
    <div class="a3mg2">
      <div><label>Phong cách 3D</label>
        <select class="a3msel" id="a3m-style">
          <option value="3D Pixar Cute">3D Pixar Cute</option>
          <option value="Pixar Realism">Pixar Realism</option>
          <option value="Dat Set">Đất Sét</option>
        </select>
      </div>
      <div><label>Tính cách</label>
        <select class="a3msel" id="a3m-mood">
          <option value="Hau dau & Hai huoc">Hậu đậu & Hài hước</option>
          <option value="Drama & Kich tinh">Drama & Kịch tính</option>
          <option value="Kich tinh & Lo lang">Kịch tính & Lố lăng</option>
        </select>
      </div>
    </div>
  </div>
  <div class="a3mcard">
    <div class="a3mlbl">Số tab worker</div>
    <div class="a3mwc" id="a3m-wc">
      <div class="a3mwcb" data-n="1">1 tab</div>
      <div class="a3mwcb on" data-n="2">2 tab</div>
      <div class="a3mwcb" data-n="3">3 tab ⚡</div>
    </div>
    <div style="font-size:10px;color:#333;margin-top:7px;line-height:1.6">3 tab = 3× tốc độ. Mỗi tab chạy độc lập qua BroadcastChannel.</div>
  </div>
  <div style="display:flex;flex-direction:column;gap:5px">
    <div class="a3mpbar"><div class="a3mpfill" id="a3m-fill"></div></div>
    <div class="a3mpi"><span id="a3m-pdone">0 / 0 video</span><span id="a3m-pst">Sẵn sàng</span></div>
    <button class="a3mbtn" id="a3m-go">⚡ Bắt đầu sản xuất</button>
    <button class="a3mstop" id="a3m-stop">⏹ Dừng tất cả</button>
  </div>
</div>

<div class="a3mp" id="a3m-p-workers">
  <div class="mstats">
    <div class="mstat"><div class="msn" id="a3m-s0">0</div><div class="msl">Tổng</div></div>
    <div class="mstat"><div class="msn gold" id="a3m-s1">0</div><div class="msl">Đang chạy</div></div>
    <div class="mstat"><div class="msn green" id="a3m-s2">0</div><div class="msl">Xong</div></div>
    <div class="mstat"><div class="msn red" id="a3m-s3">0</div><div class="msl">Lỗi</div></div>
  </div>
  <div class="mwgrid" id="a3m-wgrid">
    <div class="mempty">Bấm Bắt đầu để mở worker tabs</div>
  </div>
</div>

<div class="a3mp" id="a3m-p-results">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:11px;color:#444">Video đã hoàn thành</span>
    <button class="msm msg" id="a3m-dlall">⬇ Tải tất cả</button>
  </div>
  <div id="a3m-rlist"><div class="mempty">Chưa có kết quả</div></div>
</div>

<div class="a3mp" id="a3m-p-log">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <span style="font-size:10px;color:#444">Nhật ký hoạt động</span>
    <button class="msm" id="a3m-clrlog">🗑 Xóa</button>
  </div>
  <div id="a3m-log"><div class="mll mlok"><span class="mlt"></span><span>3BIG Auto Studio v4.0 sẵn sàng ✓</span></div></div>
</div>
    `;
    document.body.appendChild(win);
  }

  // ── EVENTS ──────────────────────────────
  function bindEvents() {
    // Toggle
    document.getElementById('a3m-btn').onclick = function() {
      var win = document.getElementById('a3m-win');
      var btn = document.getElementById('a3m-btn');
      win.classList.toggle('hide');
      var open = !win.classList.contains('hide');
      btn.innerHTML = open ? '✕<br>ĐÓNG' : '⚡<br>AUTO';
      btn.style.background = open ? '#444' : '#f5c842';
      btn.style.color = open ? '#ddd' : '#111';
      localStorage.setItem('a3b_open', open);
    };

    // Restore state
    if (localStorage.getItem('a3b_open') === 'false') {
      document.getElementById('a3m-win').classList.add('hide');
      document.getElementById('a3m-btn').innerHTML = '⚡<br>AUTO';
    }

    // Tabs
    document.querySelectorAll('#a3m-win .a3mt[data-t]').forEach(function(t) {
      t.addEventListener('click', function() {
        document.querySelectorAll('#a3m-win .a3mt, #a3m-win .a3mp').forEach(function(el) { el.classList.remove('on'); });
        t.classList.add('on');
        var pane = document.getElementById('a3m-p-' + t.getAttribute('data-t'));
        if (pane) pane.classList.add('on');
      });
    });

    // Worker count
    document.querySelectorAll('#a3m-wc .a3mwcb').forEach(function(b) {
      b.addEventListener('click', function() {
        document.querySelectorAll('#a3m-wc .a3mwcb').forEach(function(x) { x.classList.remove('on'); });
        b.classList.add('on');
        if (typeof A3B_MANAGER !== 'undefined') A3B_MANAGER.setNumW(parseInt(b.getAttribute('data-n')));
      });
    });

    // Counter
    document.getElementById('a3m-ta').addEventListener('input', function() {
      var n = this.value.trim().split('\n').filter(function(l) { return l.trim(); }).reduce(function(c, l) {
        try { var o = JSON.parse(l.trim()); return (o.nhanVat && o.noiDung) ? c + 1 : c; } catch(e) { return c; }
      }, 0);
      document.getElementById('a3m-cnt').textContent = n + ' kịch bản';
    });

    // Check
    document.getElementById('a3m-chk').addEventListener('click', function() {
      if (typeof A3B_MANAGER === 'undefined') return;
      A3B_MANAGER.batDau && document.getElementById('a3m-ta').dispatchEvent(new Event('input'));
    });

    // Start / Stop
    document.getElementById('a3m-go').addEventListener('click', function() {
      if (typeof A3B_MANAGER !== 'undefined') A3B_MANAGER.batDau();
    });
    document.getElementById('a3m-stop').addEventListener('click', function() {
      if (typeof A3B_MANAGER !== 'undefined') A3B_MANAGER.dung();
    });

    // Download all
    document.getElementById('a3m-dlall').addEventListener('click', function() {
      // Gọi dlResult cho tất cả
      for (var i = 0; i < 999; i++) {
        try { A3B_MANAGER.dlResult(i); } catch(e) { break; }
      }
    });

    // Clear log
    document.getElementById('a3m-clrlog').addEventListener('click', function() {
      document.getElementById('a3m-log').innerHTML = '';
    });
  }

})();
