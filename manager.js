// ═══════════════════════════════════════════
// manager.js — Điều phối 2 worker tabs
// ═══════════════════════════════════════════
var A3B = (function () {
  var CH = new BroadcastChannel('3big_v5');
  var WORKERS = []; // [{wid, tabId, status, jobs, doneC, errC, currentJob, step, progress}]
  var ALL_JOBS = [];
  var RESULTS = [];
  var running = false;
  var totalClips = 0;
  var pendingAssign = [];
  var assignedTabs = {};

  // ── Parse kịch bản ───────────────────────
  function parseJobs() {
    var raw = document.getElementById('a3b-ta').value.trim();
    return raw.split('\n').map(function (l) { return l.trim(); }).filter(Boolean)
      .reduce(function (acc, line) {
        try { var o = JSON.parse(line); if (o.nhanVat && o.noiDung) acc.push(o); } catch (e) {}
        return acc;
      }, []);
  }

  // ── Lấy config từ UI ─────────────────────
  function getConfig() {
    return {
      phongCach: document.getElementById('cfg-phong-cach').value,
      ngonNgu: document.getElementById('cfg-ngon-ngu').value,
      tiLe: document.querySelector('input[name="ti-le"]:checked')?.value || '9:16',
      danhMuc: document.getElementById('cfg-danh-muc').value,
      tone: document.getElementById('cfg-tone').value
    };
  }

  // ── Log ──────────────────────────────────
  function log(msg, t) {
    var el = document.getElementById('a3b-log');
    if (!el) return;
    var now = new Date().toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var colors = { ok: '#10b981', e: '#ef4444', r: '#FF6B35', b: '#6366f1', h: '#d1d5db' };
    var d = document.createElement('div');
    d.style.cssText = 'display:flex;gap:8px;align-items:baseline;padding:2px 0;border-bottom:1px solid #f3f4f6';
    d.innerHTML = '<span style="color:#9ca3af;font-size:10px;min-width:52px;flex-shrink:0">' + now + '</span>'
      + '<span style="color:' + (colors[t] || '#374151') + ';font-size:11px">' + msg + '</span>';
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  }
  function logSep() {
    var el = document.getElementById('a3b-log');
    if (!el) return;
    var d = document.createElement('div');
    d.style.cssText = 'border-top:2px solid #e5e7eb;margin:6px 0';
    el.appendChild(d);
  }

  // ── Stats ────────────────────────────────
  function updStats() {
    var done = RESULTS.filter(function (r) { return r.status === 'done'; }).length;
    var err = RESULTS.filter(function (r) { return r.status === 'error'; }).length;
    var runC = WORKERS.filter(function (w) { return w.status === 'running'; }).length;

    setText('stat-total', ALL_JOBS.length);
    setText('stat-run', runC);
    setText('stat-done', done);
    setText('stat-err', err);
    setText('stat-clip', totalClips);

    var pct = ALL_JOBS.length ? (done + err) / ALL_JOBS.length * 100 : 0;
    var fill = document.getElementById('a3b-pfill');
    if (fill) fill.style.width = pct + '%';
    setText('a3b-pdone', (done + err) + ' / ' + ALL_JOBS.length + ' video');
    setText('a3b-pst', runC > 0 ? runC + ' worker đang chạy...' : (running ? 'Chuẩn bị...' : 'Sẵn sàng'));

    WORKERS.forEach(function (w) { updWorkerCard(w.wid); });
  }

  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

  // ── Worker Card ──────────────────────────
  function updWorkerCard(wid) {
    var w = WORKERS[wid]; if (!w) return;
    var card = document.getElementById('wcard-' + wid); if (!card) return;

    var statusMap = {
      idle: { label: 'Chờ kết nối', color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
      ready: { label: 'Sẵn sàng', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
      running: { label: 'Đang chạy', color: '#FF6B35', bg: '#fff7ed', border: '#fed7aa' },
      done: { label: 'Hoàn thành', color: '#10b981', bg: '#f0fdf4', border: '#86efac' },
      error: { label: 'Lỗi', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' }
    };
    var s = statusMap[w.status] || statusMap.idle;

    card.style.borderColor = s.border;
    card.style.background = s.bg;

    var badge = card.querySelector('.w-badge');
    if (badge) { badge.textContent = s.label; badge.style.color = s.color; badge.style.borderColor = s.color + '40'; badge.style.background = s.color + '15'; }

    var dot = card.querySelector('.w-dot');
    if (dot) { dot.style.background = s.color; dot.style.animation = w.status === 'running' ? 'wdot 1s infinite' : 'none'; }

    var jobEl = card.querySelector('.w-job');
    if (jobEl) {
      if (w.currentJob) {
        jobEl.innerHTML = '<div style="font-weight:600;color:#111;font-size:12px;margin-bottom:4px">' + w.currentJob.nhanVat.slice(0, 50) + '</div>'
          + '<div style="color:#6b7280;font-size:11px">' + w.currentJob.noiDung.slice(0, 70) + '...</div>';
      } else {
        jobEl.innerHTML = '<div style="color:#9ca3af;font-size:12px">' + (w.status === 'idle' ? 'Chờ kết nối...' : 'Chờ job mới...') + '</div>';
      }
    }

    var steps = { script: 'Tạo kịch bản', img: 'Tạo ảnh', vid: 'Tạo video', retry: 'Tạo lại lỗi', download: 'Tải video', done: 'Hoàn thành' };
    var stepEl = card.querySelector('.w-step');
    if (stepEl) stepEl.textContent = steps[w.step] || '';

    var progFill = card.querySelector('.w-prog-fill');
    if (progFill) progFill.style.width = (w.progress || 0) + '%';
    var progTxt = card.querySelector('.w-prog-txt');
    if (progTxt) progTxt.textContent = (w.progress || 0) + '%';

    var statsEl = card.querySelector('.w-stats');
    if (statsEl) statsEl.innerHTML = 'Xong: <b style="color:#10b981">' + (w.doneC || 0) + '</b> &nbsp; Lỗi: <b style="color:#ef4444">' + (w.errC || 0) + '</b>';

    // Queue
    var qEl = card.querySelector('.w-queue');
    if (qEl && w.jobs) {
      qEl.innerHTML = '';
      w.jobs.slice(0, 6).forEach(function (job) {
        var st = job.status || 'wait';
        var colors2 = { wait: '#9ca3af', running: '#FF6B35', done: '#10b981', error: '#ef4444' };
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:11px';
        row.innerHTML = '<div style="width:6px;height:6px;border-radius:50%;background:' + (colors2[st] || '#9ca3af') + ';flex-shrink:0"></div>'
          + '<span style="color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + job.nhanVat.slice(0, 38) + '</span>';
        qEl.appendChild(row);
      });
      if (w.jobs.length > 6) {
        var more = document.createElement('div');
        more.style.cssText = 'font-size:10px;color:#9ca3af;padding:3px 0';
        more.textContent = '+' + (w.jobs.length - 6) + ' job khác';
        qEl.appendChild(more);
      }
    }
  }

  // ── Kết quả ──────────────────────────────
  function addResult(r) {
    RESULTS.push(r);
    var list = document.getElementById('a3b-rlist');
    if (!list) return;
    var empty = list.querySelector('.a3b-empty'); if (empty) list.innerHTML = '';

    var row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:30px 1fr auto auto;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid #f3f4f6;transition:background .15s';
    row.onmouseenter = function () { row.style.background = '#f9fafb'; };
    row.onmouseleave = function () { row.style.background = ''; };

    var isDone = r.status === 'done';
    row.innerHTML = '<div style="width:24px;height:24px;border-radius:50%;background:' + (isDone ? '#d1fae5' : '#fee2e2') + ';display:flex;align-items:center;justify-content:center;font-size:12px">' + (isDone ? '✓' : '✗') + '</div>'
      + '<div><div style="font-size:12px;font-weight:600;color:#111">' + (r.topicTitle || r.nhanVat || '—').slice(0, 60) + '</div>'
      + '<div style="font-size:10px;color:#9ca3af;margin-top:2px">Worker ' + (r.wid + 1) + ' · ' + (isDone ? 'Thành công' : 'Lỗi: ' + (r.errorMsg || '')) + '</div></div>'
      + '<div style="font-size:10px;color:' + (isDone ? '#10b981' : '#ef4444') + ';font-weight:600">' + (isDone ? '✓' : '✗') + '</div>'
      + '<div></div>';
    list.insertBefore(row, list.firstChild);

    var badge = document.getElementById('a3b-rb');
    if (badge) badge.textContent = RESULTS.length;
  }

  // ── Nhận tin từ Worker ───────────────────
  function initChannel() {
    CH.onmessage = function (e) {
      var msg = e.data; if (!msg || !msg.type) return;

      if (msg.type === 'WORKER_ONLINE') {
        if (!running) return;
        if (assignedTabs[msg.tabId]) return; // đã assign rồi
        var wid = pendingAssign.shift();
        if (wid === undefined) return;
        assignedTabs[msg.tabId] = wid;
        WORKERS[wid].tabId = msg.tabId;
        CH.postMessage({ type: 'ASSIGN', wid: wid, tabId: msg.tabId });
        log('Worker ' + (wid + 1) + ' kết nối ✓', 'ok');
        return;
      }

      var wid = msg.wid; if (wid === undefined || !WORKERS[wid]) return;
      var w = WORKERS[wid];

      if (msg.type === 'READY') {
        w.status = 'ready'; updStats();
        log('Worker ' + (wid + 1) + ' sẵn sàng — Gửi ' + w.jobs.length + ' jobs', 'ok');
        var cfg = getConfig();
        CH.postMessage({ type: 'RUN', wid: wid, jobs: w.jobs, config: cfg });
        // Cập nhật dot header
        var allReady = WORKERS.every(function (x) { return x.status !== 'idle'; });
        if (allReady) {
          var dot = document.getElementById('a3b-hdot'); if (dot) { dot.style.background = '#10b981'; dot.style.boxShadow = '0 0 6px #10b98160'; }
          setText('a3b-hstatus', WORKERS.length + ' worker đang hoạt động');
        }
      }
      else if (msg.type === 'JOB_START') {
        w.status = 'running'; w.step = 'script'; w.progress = 10;
        var job = w.jobs.find(function (j) { return j.id === msg.jobId; });
        if (job) { job.status = 'running'; w.currentJob = job; }
        log('W' + (wid + 1) + ' ▶ ' + (msg.nhanVat || '').slice(0, 45), 'r');
        updStats();
      }
      else if (msg.type === 'STEP') {
        w.step = msg.step; w.progress = msg.progress;
        var snames = { script: 'Tạo kịch bản', img: 'Tạo ảnh', vid: 'Tạo video', retry: 'Retry lỗi', download: 'Tải về' };
        log('W' + (wid + 1) + ' — ' + (snames[msg.step] || msg.step) + ' ' + msg.progress + '%', 'b');
        updStats();
      }
      else if (msg.type === 'JOB_DONE') {
        w.doneC = (w.doneC || 0) + 1;
        var job2 = w.jobs.find(function (j) { return j.id === msg.jobId; }); if (job2) job2.status = 'done';
        w.currentJob = null;
        totalClips++;
        log('W' + (wid + 1) + ' ✓ "' + (msg.topicTitle || '').slice(0, 40) + '"', 'ok');
        addResult(Object.assign({}, msg, { wid: wid, status: 'done' }));
        updStats();
      }
      else if (msg.type === 'JOB_ERR') {
        w.errC = (w.errC || 0) + 1;
        var job3 = w.jobs.find(function (j) { return j.id === msg.jobId; }); if (job3) job3.status = 'error';
        w.currentJob = null;
        log('W' + (wid + 1) + ' ✗ ' + (msg.errorMsg || ''), 'e');
        addResult(Object.assign({}, msg, { wid: wid, status: 'error' }));
        updStats();
      }
      else if (msg.type === 'ALL_DONE') {
        w.status = 'done'; w.step = 'done'; w.currentJob = null;
        log('W' + (wid + 1) + ' hoàn thành! (' + (w.doneC || 0) + ' xong, ' + (w.errC || 0) + ' lỗi)', 'ok');
        updStats();
        if (WORKERS.every(function (x) { return x.status === 'done' || x.status === 'error'; })) ketThuc();
      }
    };
  }

  // ── Bắt đầu ──────────────────────────────
  function batDau() {
    var jobs = parseJobs();
    if (!jobs.length) { log('⚠ Chưa có kịch bản!', 'e'); return; }

    ALL_JOBS = jobs.map(function (j, i) { return Object.assign({}, j, { id: i, status: 'wait' }); });
    RESULTS = []; totalClips = 0; running = true;
    pendingAssign = [0, 1]; // 2 workers
    assignedTabs = {};

    // Reset UI
    document.getElementById('a3b-log').innerHTML = '';
    document.getElementById('a3b-rlist').innerHTML = '<div class="a3b-empty" style="padding:40px;text-align:center;color:#9ca3af;font-size:13px">Đang sản xuất...</div>';
    document.getElementById('a3b-rb').textContent = '0';

    var goBtn = document.getElementById('a3b-go'); if (goBtn) goBtn.disabled = true;
    var stopBtn = document.getElementById('a3b-stop'); if (stopBtn) stopBtn.style.display = 'block';

    // Phân bổ round-robin cho 2 workers
    var q0 = [], q1 = [];
    ALL_JOBS.forEach(function (j, i) { (i % 2 === 0 ? q0 : q1).push(Object.assign({}, j)); });

    WORKERS = [
      { wid: 0, tabId: null, status: 'idle', jobs: q0, doneC: 0, errC: 0, currentJob: null, step: null, progress: 0 },
      { wid: 1, tabId: null, status: 'idle', jobs: q1, doneC: 0, errC: 0, currentJob: null, step: null, progress: 0 }
    ];

    logSep();
    log('══ Bắt đầu ' + ALL_JOBS.length + ' kịch bản · 2 workers ══', 'r');
    log('W1: ' + q0.length + ' jobs · W2: ' + q1.length + ' jobs', 'h');
    logSep();
    log('👉 Mở 2 tab 3big.online mới: Ctrl+T → 3big.online → Enter', 'r');

    // Hiện hint
    var hint = document.getElementById('a3b-hint'); if (hint) hint.style.display = 'block';

    switchTab('workers');
    updStats();
  }

  function ketThuc() {
    running = false;
    var goBtn = document.getElementById('a3b-go'); if (goBtn) goBtn.disabled = false;
    var stopBtn = document.getElementById('a3b-stop'); if (stopBtn) stopBtn.style.display = 'none';
    var hint = document.getElementById('a3b-hint'); if (hint) hint.style.display = 'none';
    var dot = document.getElementById('a3b-hdot'); if (dot) { dot.style.background = '#9ca3af'; dot.style.boxShadow = 'none'; }
    setText('a3b-hstatus', 'Hoàn thành');
    var done = RESULTS.filter(function (r) { return r.status === 'done'; }).length;
    logSep();
    log('══ Xong! ' + done + '/' + ALL_JOBS.length + ' video ✓ · ' + totalClips + ' clip đã tải ══', 'ok');
    updStats();
    switchTab('results');
  }

  function dung() {
    running = false;
    CH.postMessage({ type: 'STOP' });
    var goBtn = document.getElementById('a3b-go'); if (goBtn) goBtn.disabled = false;
    var stopBtn = document.getElementById('a3b-stop'); if (stopBtn) stopBtn.style.display = 'none';
    log('⏹ Đã dừng', 'e');
  }

  function switchTab(name) {
    document.querySelectorAll('#a3b-win .a3b-tab, #a3b-win .a3b-pane').forEach(function (el) { el.classList.remove('on'); });
    var t = document.querySelector('#a3b-win .a3b-tab[data-t="' + name + '"]');
    var p = document.getElementById('a3b-p-' + name);
    if (t) t.classList.add('on');
    if (p) p.classList.add('on');
  }

  return { init: initChannel, batDau: batDau, dung: dung, switchTab: switchTab };
})();
