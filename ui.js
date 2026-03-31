// ═══════════════════════════════════════════
// ui.js — Manager Panel UI (Light theme)
// ═══════════════════════════════════════════
(function () {
  var CH_DET = new BroadcastChannel('3big_v5');
  var decided = false;

  // Detect: dùng localStorage - tab nào set 'a3b_manager_tab' = tabId của mình thì là manager
  // Mỗi tab có random ID, lưu vào sessionStorage
  if (!window.__a3bMyTabId) {
    window.__a3bMyTabId = Math.random().toString(36).slice(2, 10);
  }

  var savedManagerId = localStorage.getItem('a3b_manager_tab');
  var isThisManager = !savedManagerId || savedManagerId === window.__a3bMyTabId;

  if (isThisManager) {
    // Tab này là Manager
    localStorage.setItem('a3b_manager_tab', window.__a3bMyTabId);
    window.__a3bIsManager = true;
    decided = true;
    if (!localStorage.getItem('3big_session')) return;
    injectCSS();
    injectHTML();
    bindEvents();
    if (typeof A3B !== 'undefined') A3B.init();
    // Load quota
    fetch('https://3big.online/api/admin/quota/' + localStorage.getItem('3big_user'), {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('3big_session') }
    }).then(function (r) { return r.json(); }).then(function (q) {
      var el = document.getElementById('a3b-quota');
      if (el) el.textContent = q.remaining + '/' + q.daily_limit + ' video còn';
    }).catch(function () {});

    // Khi đóng tab manager, xóa localStorage
    window.addEventListener('beforeunload', function() {
      if (localStorage.getItem('a3b_manager_tab') === window.__a3bMyTabId) {
        localStorage.removeItem('a3b_manager_tab');
      }
    });
  } else {
    // Tab này là Worker
    window.__a3bIsManager = false;
    decided = true;
  }

  // Giữ CH_DET để không bị GC
  window.__a3bChDet = CH_DET;

  // ── CSS ─────────────────────────────────
  function injectCSS() {
    if (document.getElementById('a3b-css')) return;
    var s = document.createElement('style');
    s.id = 'a3b-css';
    s.textContent = `
/* TOGGLE BTN */
#a3b-toggle{position:fixed;top:50%;right:0;transform:translateY(-50%);z-index:2147483648;background:#FF6B35;border:none;border-radius:10px 0 0 10px;padding:14px 7px;cursor:pointer;color:#fff;font-weight:800;font-size:9px;letter-spacing:1px;writing-mode:vertical-rl;font-family:system-ui;box-shadow:-3px 0 12px rgba(255,107,53,.4);transition:all .2s}
#a3b-toggle:hover{background:#ea5a28;right:-2px}

/* WINDOW */
#a3b-win{position:fixed;top:0;right:0;width:520px;height:100vh;background:#fff;border-left:1px solid #e5e7eb;z-index:2147483647;display:flex;flex-direction:column;font-family:system-ui,-apple-system,sans-serif;box-shadow:-8px 0 40px rgba(0,0,0,.08);transition:transform .28s cubic-bezier(.4,0,.2,1)}
#a3b-win.hide{transform:translateX(100%)}

/* HEADER */
.a3b-hd{background:linear-gradient(135deg,#FF6B35,#f97316);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.a3b-hd-l{display:flex;align-items:center;gap:10px}
.a3b-logo{width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
.a3b-htitle{font-size:14px;font-weight:700;color:#fff}
.a3b-hsub{font-size:10px;color:rgba(255,255,255,.8);margin-top:1px}
.a3b-quota-badge{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:3px 10px;font-size:10px;color:#fff;font-weight:600}
.a3b-hstatus{display:flex;align-items:center;gap:6px;font-size:10px;color:rgba(255,255,255,.9)}
#a3b-hdot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.5);transition:all .3s}
@keyframes wdot{0%,100%{opacity:1}50%{opacity:.3}}

/* TABS */
.a3b-tabs{display:flex;border-bottom:2px solid #f3f4f6;background:#fff;flex-shrink:0}
.a3b-tab{flex:1;padding:10px 8px;font-size:11px;color:#6b7280;cursor:pointer;text-align:center;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .15s;user-select:none;font-weight:500}
.a3b-tab.on{color:#FF6B35;border-bottom-color:#FF6B35;font-weight:600}
.a3b-tab:hover:not(.on){color:#374151;background:#f9fafb}
.a3b-rbadge{display:inline-block;background:#ef4444;color:#fff;border-radius:20px;padding:0 5px;font-size:9px;margin-left:4px;vertical-align:middle}

/* PANES */
.a3b-pane{flex:1;overflow-y:auto;padding:16px;display:none;flex-direction:column;gap:12px}
.a3b-pane.on{display:flex}

/* CARDS */
.a3b-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.a3b-card-title{font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;display:flex;align-items:center;gap:6px}
.a3b-card-title::before{content:'';width:3px;height:12px;background:#FF6B35;border-radius:2px;display:block}

/* INPUTS */
.a3b-ta{width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:8px;color:#111;padding:10px;font-size:11px;resize:none;height:140px;line-height:1.7;font-family:monospace;transition:border-color .15s}
.a3b-ta:focus{outline:none;border-color:#FF6B35;background:#fff}
.a3b-sel{width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:8px;color:#374151;padding:7px 10px;font-size:11.5px;transition:border-color .15s;cursor:pointer}
.a3b-sel:focus{outline:none;border-color:#FF6B35}
.a3b-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.a3b-lbl{font-size:11px;color:#374151;font-weight:600;margin-bottom:5px;display:block}
.a3b-hint-txt{font-size:10px;color:#9ca3af;margin-top:4px;line-height:1.5}

/* RATIO BUTTONS */
.a3b-ratio{display:flex;gap:8px}
.a3b-ratio-btn{flex:1;padding:8px;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:12px;text-align:center;transition:all .15s;color:#374151;font-weight:500}
.a3b-ratio-btn:hover{border-color:#FF6B35;color:#FF6B35}
input[name="ti-le"]{display:none}
input[name="ti-le"]:checked + .a3b-ratio-btn{background:#fff7f5;border-color:#FF6B35;color:#FF6B35;font-weight:700}

/* PROGRESS */
.a3b-prog-wrap{background:#f3f4f6;border-radius:20px;height:8px;overflow:hidden}
#a3b-pfill{height:100%;background:linear-gradient(90deg,#FF6B35,#f97316);width:0;transition:width .5s;border-radius:20px}
.a3b-prog-info{display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-top:4px}

/* HINT BOX */
#a3b-hint{display:none;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:12px 14px;font-size:11px;color:#92400e;line-height:1.7}
#a3b-hint b{color:#FF6B35}

/* BUTTONS */
.a3b-btn-primary{width:100%;padding:12px;background:linear-gradient(135deg,#FF6B35,#f97316);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(255,107,53,.35);transition:all .15s}
.a3b-btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(255,107,53,.45)}
.a3b-btn-primary:disabled{background:#e5e7eb;color:#9ca3af;cursor:not-allowed;box-shadow:none;transform:none}
.a3b-btn-stop{width:100%;padding:10px;background:#fff;border:1.5px solid #fca5a5;color:#ef4444;border-radius:10px;font-size:12px;cursor:pointer;display:none;font-weight:600;transition:all .15s}
.a3b-btn-stop:hover{background:#fef2f2}
.a3b-btn-sm{padding:5px 12px;border-radius:7px;font-size:10px;cursor:pointer;border:1.5px solid #e5e7eb;background:#fff;color:#6b7280;font-weight:600;transition:all .15s}
.a3b-btn-sm:hover{border-color:#FF6B35;color:#FF6B35}

/* STATS */
.a3b-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.a3b-stat{background:#fff;border:1.5px solid #f3f4f6;border-radius:10px;padding:12px 8px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.a3b-stat-n{font-size:24px;font-weight:700;color:#111}
.a3b-stat-l{font-size:9px;color:#9ca3af;margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
.c-orange{color:#FF6B35}.c-green{color:#10b981}.c-red{color:#ef4444}.c-blue{color:#6366f1}

/* WORKER CARD */
.a3b-wcard{border:1.5px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#fff;transition:all .2s;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.a3b-whd{padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f3f4f6;background:#f9fafb}
.a3b-wnm{font-size:12px;font-weight:700;color:#111;display:flex;align-items:center;gap:7px}
.w-dot{width:8px;height:8px;border-radius:50%;background:#9ca3af;flex-shrink:0;transition:all .3s}
.w-badge{font-size:10px;padding:2px 9px;border-radius:20px;border:1px solid #e5e7eb;background:#f9fafb;color:#6b7280;font-weight:600}
.a3b-wbody{padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.w-prog-wrap{background:#f3f4f6;border-radius:20px;height:5px;overflow:hidden}
.w-prog-fill{height:100%;background:linear-gradient(90deg,#FF6B35,#f97316);width:0;transition:width .4s;border-radius:20px}
.w-stats{font-size:10px;color:#9ca3af}
.w-queue-title{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-top:4px}

/* RESULTS */
.a3b-results-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}

/* LOG */
#a3b-log{background:#f9fafb;border-radius:10px;padding:10px;flex:1;overflow-y:auto;font-family:monospace;font-size:10.5px;line-height:1.9;min-height:80px;border:1px solid #f3f4f6}

/* SCROLLBAR */
#a3b-win ::-webkit-scrollbar{width:5px}
#a3b-win ::-webkit-scrollbar-track{background:transparent}
#a3b-win ::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:3px}
#a3b-win ::-webkit-scrollbar-thumb:hover{background:#d1d5db}
    `;
    document.head.appendChild(s);
  }

  // ── HTML ─────────────────────────────────
  function injectHTML() {
    // Toggle
    var tb = document.createElement('button');
    tb.id = 'a3b-toggle'; tb.innerHTML = '⚡<br>AUTO';
    document.body.appendChild(tb);

    var win = document.createElement('div');
    win.id = 'a3b-win';
    win.innerHTML = `
<!-- HEADER -->
<div class="a3b-hd">
  <div class="a3b-hd-l">
    <div class="a3b-logo">⚡</div>
    <div>
      <div class="a3b-htitle">3BIG Auto Studio</div>
      <div class="a3b-hsub">Điều phối sản xuất video hàng loạt</div>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
    <span class="a3b-quota-badge" id="a3b-quota">Đang tải...</span>
    <div class="a3b-hstatus"><div id="a3b-hdot"></div><span id="a3b-hstatus">Chờ worker...</span></div>
  </div>
</div>

<!-- TABS -->
<div class="a3b-tabs">
  <div class="a3b-tab on" data-t="input">✏️ Kịch bản</div>
  <div class="a3b-tab" data-t="config">⚙️ Cấu hình</div>
  <div class="a3b-tab" data-t="workers">🖥 Workers</div>
  <div class="a3b-tab" data-t="results">🎬 Kết quả <span class="a3b-rbadge" id="a3b-rb">0</span></div>
  <div class="a3b-tab" data-t="log">📋 Log</div>
</div>

<!-- KỊCH BẢN -->
<div class="a3b-pane on" id="a3b-p-input">
  <div class="a3b-card">
    <div class="a3b-card-title">Danh sách kịch bản</div>
    <div class="a3b-hint-txt" style="margin-bottom:8px">Mỗi dòng 1 kịch bản JSON — copy từ Claude dán vào đây</div>
    <textarea class="a3b-ta" id="a3b-ta" placeholder='{"nhanVat":"Máy tập gym, giọng miền Tây, hay nói trời đất ơi","noiDung":"Mua về tập 1 lần rồi treo quần áo 6 tháng"}
{"nhanVat":"Tủ lạnh hay phàn nàn, giọng miền Tây","noiDung":"Chủ ăn kiêng mà mở tủ 8 lần mỗi ngày"}'></textarea>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      <span style="font-size:11px;color:#6b7280" id="a3b-cnt">0 kịch bản</span>
      <button class="a3b-btn-sm" id="a3b-chk">🔍 Kiểm tra</button>
    </div>
  </div>

  <div id="a3b-hint">
    ⚡ Jobs đã phân bổ! Mở <b>2 tab 3big.online mới</b>:<br>
    <span style="color:#b45309">Ctrl+T → gõ 3big.online → Enter (làm 2 lần)</span><br>
    Mỗi tab sẽ tự nhận job và chạy tự động!
  </div>

  <div class="a3b-card" style="display:flex;flex-direction:column;gap:8px">
    <div class="a3b-prog-wrap"><div id="a3b-pfill"></div></div>
    <div class="a3b-prog-info"><span id="a3b-pdone">0 / 0 video</span><span id="a3b-pst">Sẵn sàng</span></div>
    <button class="a3b-btn-primary" id="a3b-go">⚡ Bắt đầu sản xuất hàng loạt</button>
    <button class="a3b-btn-stop" id="a3b-stop">⏹ Dừng tất cả</button>
  </div>
</div>

<!-- CẤU HÌNH -->
<div class="a3b-pane" id="a3b-p-config">
  <div class="a3b-card">
    <div class="a3b-card-title">Phong cách hình ảnh</div>
    <select class="a3b-sel" id="cfg-phong-cach">
      <option>3D Pixar Cute</option>
      <option>Pixar Realism (Nhân hoá)</option>
      <option>Chân thực (Realistic)</option>
      <option>Len Móc (Crochet/Amigurumi)</option>
      <option>Đất Sét (Claymation)</option>
      <option>Mô hình Tí hon (Diorama)</option>
      <option>Đồ chơi Gạch (LEGO)</option>
      <option>Mannequin 3D (Siêu thực)</option>
      <option>3D Educational Simulation (Zack D. Style)</option>
      <option>Bảng Phấn (Chalkboard)</option>
      <option>2D Tối Giản (Minimalist Animation)</option>
      <option>Người Que (Stickman)</option>
      <option>Hoạt hình Simpsons</option>
      <option>Giải thích Doanh nghiệp (Business Explainer)</option>
      <option>Cinematic Dark Surrealism (Siêu thực Đen tối)</option>
    </select>
  </div>
  <div class="a3b-card">
    <div class="a3b-card-title">Tỉ lệ khung hình</div>
    <div class="a3b-ratio">
      <label><input type="radio" name="ti-le" value="9:16" checked><div class="a3b-ratio-btn">📱 9:16 Dọc</div></label>
      <label><input type="radio" name="ti-le" value="16:9"><div class="a3b-ratio-btn">🖥 16:9 Ngang</div></label>
    </div>
  </div>
  <div class="a3b-card">
    <div class="a3b-g2">
      <div>
        <span class="a3b-lbl">Ngôn ngữ lời thoại</span>
        <select class="a3b-sel" id="cfg-ngon-ngu">
          <option>🇻🇳 Tiếng Việt</option>
          <option>🇺🇸 English</option>
          <option>🇯🇵 日本語 (Nhật Bản)</option>
          <option>🇰🇷 한국어 (Hàn Quốc)</option>
          <option>🇪🇸 Español (Tây Ban Nha)</option>
          <option>🇧🇷 Português (Bồ Đào Nha)</option>
          <option>🇫🇷 Français (Pháp)</option>
          <option>🇹🇭 ไทย (Thái Lan)</option>
          <option>🇩🇪 Deutsch (Đức)</option>
        </select>
      </div>
      <div>
        <span class="a3b-lbl">Tính cách / Tone</span>
        <select class="a3b-sel" id="cfg-tone">
          <option>Năng động & Nhiệt tình</option>
          <option>Drama & Kịch tính</option>
          <option>Chuyên gia khó tính</option>
          <option selected>Hậu đậu & Hài hước</option>
          <option>Điềm tĩnh (Zen)</option>
          <option>Kịch tính & Lố lăng</option>
          <option>Sáng tạo & Nghệ sĩ</option>
        </select>
      </div>
    </div>
  </div>
  <div class="a3b-card">
    <span class="a3b-lbl">Chủ đề / Danh mục</span>
    <select class="a3b-sel" id="cfg-danh-muc">
      <option>Mẹo Nấu Ăn</option>
      <option selected>Mẹo Vặt Cuộc Sống</option>
      <option>Mẹo Dọn Dẹp</option>
      <option>Thủ Công & DIY</option>
      <option>Mẹo Học Tập</option>
      <option>Mẹo Sức Khỏe</option>
      <option>Mẹo Làm Đẹp</option>
      <option>Mẹo Tài Chính</option>
      <option>Mẹo Công Nghệ</option>
      <option>Mẹo Chăm Thú Cưng</option>
    </select>
  </div>
</div>

<!-- WORKERS -->
<div class="a3b-pane" id="a3b-p-workers">
  <div class="a3b-stats">
    <div class="a3b-stat"><div class="a3b-stat-n" id="stat-total">0</div><div class="a3b-stat-l">Tổng</div></div>
    <div class="a3b-stat"><div class="a3b-stat-n c-orange" id="stat-run">0</div><div class="a3b-stat-l">Đang chạy</div></div>
    <div class="a3b-stat"><div class="a3b-stat-n c-green" id="stat-done">0</div><div class="a3b-stat-l">Xong</div></div>
    <div class="a3b-stat"><div class="a3b-stat-n c-red" id="stat-err">0</div><div class="a3b-stat-l">Lỗi</div></div>
    <div class="a3b-stat"><div class="a3b-stat-n c-blue" id="stat-clip">0</div><div class="a3b-stat-l">Clip</div></div>
  </div>

  ${[0,1].map(function(i){ return `
  <div class="a3b-wcard" id="wcard-${i}">
    <div class="a3b-whd">
      <div class="a3b-wnm"><div class="w-dot"></div>Worker ${i+1}</div>
      <span class="w-badge">Chờ kết nối</span>
    </div>
    <div class="a3b-wbody">
      <div class="w-job" style="min-height:36px"><div style="color:#9ca3af;font-size:12px">Chờ kết nối...</div></div>
      <div style="font-size:10px;color:#FF6B35;font-weight:600" class="w-step"></div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="w-prog-wrap" style="flex:1"><div class="w-prog-fill"></div></div>
        <span class="w-prog-txt" style="font-size:10px;color:#9ca3af;min-width:28px">0%</span>
      </div>
      <div class="w-stats">Xong: <b style="color:#10b981">0</b> &nbsp; Lỗi: <b style="color:#ef4444">0</b></div>
      <div class="w-queue-title">Queue</div>
      <div class="w-queue"><div style="font-size:11px;color:#9ca3af">Chưa phân bổ</div></div>
    </div>
  </div>
  `; }).join('')}
</div>

<!-- KẾT QUẢ -->
<div class="a3b-pane" id="a3b-p-results">
  <div class="a3b-results-hd">
    <span style="font-size:12px;color:#374151;font-weight:600">Video đã hoàn thành</span>
  </div>
  <div class="a3b-card" style="padding:0;overflow:hidden" id="a3b-rlist">
    <div class="a3b-empty" style="padding:40px;text-align:center;color:#9ca3af;font-size:13px">
      Chưa có kết quả
    </div>
  </div>
</div>

<!-- LOG -->
<div class="a3b-pane" id="a3b-p-log">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-size:12px;color:#374151;font-weight:600">Nhật ký hoạt động</span>
    <button class="a3b-btn-sm" id="a3b-clrlog">🗑 Xóa</button>
  </div>
  <div id="a3b-log">
    <div style="display:flex;gap:8px;padding:2px 0;border-bottom:1px solid #f3f4f6">
      <span style="color:#9ca3af;font-size:10px;min-width:52px">--:--:--</span>
      <span style="color:#10b981;font-size:11px">3BIG Auto Studio sẵn sàng ✓</span>
    </div>
  </div>
</div>
    `;
    document.body.appendChild(win);
  }

  // ── EVENTS ───────────────────────────────
  function bindEvents() {
    // Toggle
    document.getElementById('a3b-toggle').addEventListener('click', function () {
      var win = document.getElementById('a3b-win');
      var btn = document.getElementById('a3b-toggle');
      win.classList.toggle('hide');
      var open = !win.classList.contains('hide');
      localStorage.setItem('a3b_open', open);
      btn.innerHTML = open ? '✕<br>ĐÓNG' : '⚡<br>AUTO';
      btn.style.background = open ? '#6b7280' : '#FF6B35';
    });

    // Restore
    if (localStorage.getItem('a3b_open') === 'false') {
      document.getElementById('a3b-win').classList.add('hide');
      document.getElementById('a3b-toggle').innerHTML = '⚡<br>AUTO';
    }

    // Tabs
    document.querySelectorAll('#a3b-win .a3b-tab[data-t]').forEach(function (t) {
      t.addEventListener('click', function () {
        if (typeof A3B !== 'undefined') A3B.switchTab(t.getAttribute('data-t'));
      });
    });

    // Counter
    document.getElementById('a3b-ta').addEventListener('input', function () {
      var n = this.value.trim().split('\n').filter(function (l) {
        try { var o = JSON.parse(l.trim()); return o.nhanVat && o.noiDung; } catch (e) { return false; }
      }).length;
      document.getElementById('a3b-cnt').textContent = n + ' kịch bản';
    });

    // Check
    document.getElementById('a3b-chk').addEventListener('click', function () {
      var jobs = document.getElementById('a3b-ta').value.trim().split('\n').filter(Boolean).reduce(function (acc, l) {
        try { var o = JSON.parse(l.trim()); if (o.nhanVat && o.noiDung) acc.push(o); } catch (e) {}
        return acc;
      }, []);
      var el = document.getElementById('a3b-log');
      if (!el) return;
      var d = document.createElement('div');
      d.style.cssText = 'padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:11px';
      d.style.color = jobs.length ? '#10b981' : '#ef4444';
      d.textContent = jobs.length ? '✓ ' + jobs.length + ' kịch bản hợp lệ' : '✗ Không đọc được kịch bản nào!';
      el.appendChild(d); el.scrollTop = el.scrollHeight;
    });

    // Start / Stop
    document.getElementById('a3b-go').addEventListener('click', function () {
      if (typeof A3B !== 'undefined') A3B.batDau();
    });
    document.getElementById('a3b-stop').addEventListener('click', function () {
      if (typeof A3B !== 'undefined') A3B.dung();
    });
    document.getElementById('a3b-clrlog').addEventListener('click', function () {
      document.getElementById('a3b-log').innerHTML = '';
    });
  }
})();
