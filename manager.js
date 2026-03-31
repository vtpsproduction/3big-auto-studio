// ═══════════════════════════════════════
// manager.js — UI điều phối Manager
// ═══════════════════════════════════════

var A3B_MANAGER = (function() {

  var CH_NAME = '3big_auto_v4';
  var ch = null;

  // STATE
  var WORKERS = [];
  var ALL_JOBS = [];
  var RESULTS = [];
  var NUM_W = 2;
  var running = false;
  var totalClips = 0;
  var pendingAssign = []; // wid chờ assign tab

  // ── HELPERS ────────────────────────────
  function parseInput() {
    var raw = document.getElementById('a3m-ta').value.trim();
    return raw.split('\n').map(function(l) { return l.trim(); }).filter(Boolean)
      .reduce(function(acc, line) {
        try {
          var o = JSON.parse(line);
          if (o.nhanVat && o.noiDung) acc.push(o);
        } catch(e) {}
        return acc;
      }, []);
  }

  function log(msg, t) {
    var el = document.getElementById('a3m-log');
    if (!el) return;
    var now = new Date().toLocaleTimeString('vi',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    var d = document.createElement('div');
    d.className = 'mll ml' + (t || 'i');
    d.innerHTML = '<span class="mlt">' + now + '</span><span>' + msg + '</span>';
    el.appendChild(d); el.scrollTop = el.scrollHeight;
  }

  function logSep() {
    var el = document.getElementById('a3m-log');
    if (!el) return;
    var d = document.createElement('div'); d.className = 'mlsep'; el.appendChild(d);
  }

  function switchTab(name) {
    document.querySelectorAll('#a3m-win .a3mt, #a3m-win .a3mp').forEach(function(el) { el.classList.remove('on'); });
    var tab = document.querySelector('#a3m-win .a3mt[data-t="' + name + '"]');
    var pane = document.getElementById('a3m-p-' + name);
    if (tab) tab.classList.add('on');
    if (pane) pane.classList.add('on');
  }

  function updStats() {
    var done = RESULTS.filter(function(r) { return r.status === 'done'; }).length;
    var err  = RESULTS.filter(function(r) { return r.status === 'error'; }).length;
    var run  = WORKERS.filter(function(w) { return w.status === 'running'; }).length;
    var els = {
      's0': ALL_JOBS.length, 's1': run,
      's2': done, 's3': err, 's4': totalClips
    };
    Object.keys(els).forEach(function(id) {
      var el = document.getElementById('a3m-' + id);
      if (el) el.textContent = els[id];
    });
    var total = ALL_JOBS.length;
    var pct = total ? (done + err) / total * 100 : 0;
    var fill = document.getElementById('a3m-fill'); if (fill) fill.style.width = pct + '%';
    var pd = document.getElementById('a3m-pdone'); if (pd) pd.textContent = (done+err) + '/' + total + ' video';
    var ps = document.getElementById('a3m-pst');   if (ps)  ps.textContent = run > 0 ? run + ' worker đang chạy...' : (running ? 'Đang phân bổ...' : 'Xong!');
  }

  function updCard(wid) {
    var w = WORKERS[wid]; if (!w) return;
    var badges = {
      idle:    ['mb0','Chờ kết nối'],
      ready:   ['mb1','✓ Sẵn sàng'],
      running: ['mb2','▶ Đang chạy'],
      done:    ['mb3','✓ Hoàn thành'],
      error:   ['mb4','✗ Lỗi']
    };
    var ba = badges[w.status] || badges.idle;
    var badge = document.getElementById('a3m-wb-' + wid);
    var card  = document.getElementById('a3m-wc-' + wid);
    var dot   = document.getElementById('a3m-wd-' + wid);
    if (badge) { badge.className = 'mbadge ' + ba[0]; badge.textContent = ba[1]; }
    if (card)  card.className = 'mwcard' + (w.status==='running'?' mactive':w.status==='done'?' mdone':w.status==='error'?' merr':'');
    if (dot)   dot.className = 'mwdot' + (w.status==='running'?' mon':w.status==='done'?' mok':'');
    var jel = document.getElementById('a3m-wj-' + wid);
    if (jel) { jel.style.color = w.currentJob ? '#888' : '#444'; jel.textContent = w.currentJob ? w.currentJob.nhanVat.slice(0,50) : 'Chờ job...'; }
    var steps = {script:'⚙ Gen kịch bản...', img:'🖼 Tạo ảnh...', vid:'🎬 Tạo video...', done:'✓ Xong', idle:''};
    var sel = document.getElementById('a3m-ws-' + wid); if (sel) sel.textContent = steps[w.step] || '';
    var pel = document.getElementById('a3m-wp-' + wid); if (pel) pel.style.width = (w.progress || 0) + '%';
    var de = document.getElementById('a3m-wd2-' + wid); if (de) de.textContent = w.doneC || 0;
    var ee = document.getElementById('a3m-we-' + wid);  if (ee) ee.textContent = w.errC  || 0;
    var ve = document.getElementById('a3m-wv-' + wid);  if (ve) ve.textContent = w.vidC  || 0;

    // Queue list
    var qel = document.getElementById('a3m-wq-' + wid);
    if (qel && w.jobs) {
      qel.innerHTML = '';
      w.jobs.slice(0, 5).forEach(function(job) {
        var st = job.status || 'wait';
        var d = document.createElement('div');
        d.className = 'mwqi' + (st==='done'?' qd':st==='running'?' qr':st==='error'?' qe':'');
        d.innerHTML = '<div class="mqdot"></div><span>' + (job.nhanVat || '—').slice(0, 30) + '</span>';
        qel.appendChild(d);
      });
      if (w.jobs.length > 5) {
        var m = document.createElement('div');
        m.style.cssText = 'font-size:9.5px;color:#333;padding:2px 7px';
        m.textContent = '+' + (w.jobs.length - 5) + ' job khác';
        qel.appendChild(m);
      }
    }
  }

  function buildCards(n) {
    var g = document.getElementById('a3m-wgrid');
    if (!g) return;
    g.innerHTML = '';
    g.style.gridTemplateColumns = n === 1 ? '1fr' : n === 2 ? '1fr 1fr' : '1fr 1fr 1fr';
    for (var i = 0; i < n; i++) {
      var c = document.createElement('div');
      c.className = 'mwcard'; c.id = 'a3m-wc-' + i;
      c.innerHTML = '<div class="mwhd">'
        + '<div class="mwnm"><div class="mwdot" id="a3m-wd-' + i + '"></div>Worker ' + (i+1) + '</div>'
        + '<span class="mbadge mb0" id="a3m-wb-' + i + '">Đang mở tab...</span>'
        + '</div>'
        + '<div class="mwbody">'
        + '<div class="mwcj" id="a3m-wj-' + i + '" style="color:#444">Chờ kết nối...</div>'
        + '<div class="mwstep" id="a3m-ws-' + i + '"></div>'
        + '<div class="mwpbar"><div class="mwpfill" id="a3m-wp-' + i + '"></div></div>'
        + '<div class="mwst">Xong:<b id="a3m-wd2-' + i + '">0</b> Lỗi:<b id="a3m-we-' + i + '">0</b> Clip:<b id="a3m-wv-' + i + '">0</b></div>'
        + '<div style="font-size:9px;color:#333;text-transform:uppercase;letter-spacing:.5px;margin:5px 0 3px">Queue</div>'
        + '<div id="a3m-wq-' + i + '"><div style="font-size:10px;color:#333">Chờ phân bổ...</div></div>'
        + '</div>';
      g.appendChild(c);
    }
  }

  function addResult(r) {
    RESULTS.push(r);
    var list = document.getElementById('a3m-rlist');
    if (!list) return;
    var empty = list.querySelector('.mempty'); if (empty) list.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'mri' + (r.status === 'done' ? ' mrdone' : ' mrerr');
    var videos = r.videos || [];
    div.innerHTML = '<div class="mrn">#' + RESULTS.length + '</div>'
      + '<div class="mrinfo">'
      + '<div class="mrt">' + (r.topicTitle || r.nhanVat || '—').slice(0,60) + '</div>'
      + '<div class="mrm">Worker ' + (r.wid+1) + ' · ' + (r.status==='done' ? '✓ ' + videos.length + ' clip' : '✗ ' + (r.errorMsg||'')) + '</div>'
      + '</div>'
      + (r.status==='done' ? '<button class="msm msg" onclick="A3B_MANAGER.dlResult(' + (RESULTS.length-1) + ')">⬇ Tải</button>' : '');
    list.insertBefore(div, list.firstChild);
  }

  // ── NHẬN TIN TỪ WORKER ─────────────────
  function initChannel() {
    ch = new BroadcastChannel(CH_NAME);
    ch.onmessage = function(e) {
      var msg = e.data; if (!msg || !msg.type) return;

      if (msg.type === 'WORKER_ONLINE') {
        if (!running) return;
        var wid = pendingAssign.shift();
        if (wid === undefined) return;
        WORKERS[wid].tabId = msg.tabId;
        ch.postMessage({ type: 'ASSIGN', wid: wid, tabId: msg.tabId });
        log('Worker ' + (wid+1) + ' kết nối ✓', 'b');
        return;
      }

      var wid = msg.wid;
      if (wid === undefined || !WORKERS[wid]) return;
      var w = WORKERS[wid];

      if (msg.type === 'READY') {
        w.status = 'ready'; updCard(wid);
        log('Worker ' + (wid+1) + ' sẵn sàng ✓', 'ok');
        var allReady = WORKERS.every(function(x) { return x.status !== 'idle'; });
        if (allReady) {
          var dot = document.getElementById('a3m-sdot'); if (dot) dot.classList.add('on');
          var stxt = document.getElementById('a3m-stxt'); if (stxt) stxt.textContent = WORKERS.length + ' worker đang hoạt động';
        }
        // Gửi jobs
        var style = document.getElementById('a3m-style') ? document.getElementById('a3m-style').value : '3D Pixar Cute';
        var mood  = document.getElementById('a3m-mood')  ? document.getElementById('a3m-mood').value  : 'Hau dau & Hai huoc';
        ch.postMessage({ type: 'RUN', wid: wid, jobs: w.jobs, style: style, mood: mood });
      }
      else if (msg.type === 'QUOTA') {
        var qel = document.getElementById('a3m-quota'); if (qel) qel.textContent = msg.remaining + '/' + msg.limit + ' video còn';
      }
      else if (msg.type === 'JOB_START') {
        w.status = 'running'; w.step = 'script'; w.progress = 10;
        var job = w.jobs.find(function(j) { return j.id === msg.jobId; });
        if (job) { job.status = 'running'; w.currentJob = job; }
        log('Worker ' + (wid+1) + ' ▶ ' + (msg.nhanVat||'').slice(0,40), 'r');
        updCard(wid); updStats();
      }
      else if (msg.type === 'STEP') {
        w.step = msg.step; w.progress = msg.progress;
        var sn = {script:'Gen kịch bản',img:'Tạo ảnh',vid:'Tạo video'};
        log('Worker ' + (wid+1) + ' — ' + (sn[msg.step]||msg.step) + ' ' + msg.progress + '%', 'b');
        updCard(wid);
      }
      else if (msg.type === 'JOB_DONE') {
        w.doneC = (w.doneC||0) + 1;
        w.vidC  = (w.vidC||0)  + (msg.videos ? msg.videos.length : 0);
        totalClips += (msg.videos ? msg.videos.length : 0);
        var job2 = w.jobs.find(function(j) { return j.id === msg.jobId; }); if (job2) job2.status = 'done';
        w.currentJob = null;
        log('Worker ' + (wid+1) + ' ✓ "' + (msg.topicTitle||'') + '" — ' + (msg.videos ? msg.videos.length : 0) + ' clip', 'ok');
        addResult(Object.assign({}, msg, { wid: wid, status: 'done' }));
        updCard(wid); updStats();
      }
      else if (msg.type === 'JOB_ERR') {
        w.errC = (w.errC||0) + 1;
        var job3 = w.jobs.find(function(j) { return j.id === msg.jobId; }); if (job3) job3.status = 'error';
        w.currentJob = null;
        log('Worker ' + (wid+1) + ' ✗ ' + msg.errorMsg, 'e');
        addResult(Object.assign({}, msg, { wid: wid, status: 'error' }));
        updCard(wid); updStats();
      }
      else if (msg.type === 'ALL_DONE') {
        w.status = 'done'; w.step = 'done'; w.currentJob = null;
        log('Worker ' + (wid+1) + ' hoàn thành! (' + (w.doneC||0) + ' xong, ' + (w.errC||0) + ' lỗi)', 'ok');
        updCard(wid); updStats();
        if (WORKERS.every(function(x) { return x.status === 'done' || x.status === 'error'; })) ketThuc();
      }
    };
  }

  // ── BẮT ĐẦU ───────────────────────────
  function batDau() {
    var jobs = parseInput();
    if (!jobs.length) { log('⚠ Chưa có kịch bản!', 'e'); return; }

    ALL_JOBS = jobs.map(function(j, i) { return Object.assign({}, j, { id: i, status: 'wait' }); });
    RESULTS = []; totalClips = 0; running = true; pendingAssign = [];

    var rlist = document.getElementById('a3m-rlist'); if (rlist) rlist.innerHTML = '<div class="mempty" style="height:100px;display:flex;align-items:center;justify-content:center;color:#2a2a2a;font-size:12px">⚙ Đang sản xuất...</div>';
    var logEl = document.getElementById('a3m-log'); if (logEl) logEl.innerHTML = '';
    var go = document.getElementById('a3m-go'); if (go) go.disabled = true;
    var stop = document.getElementById('a3m-stop'); if (stop) stop.style.display = 'block';
    switchTab('workers');
    buildCards(NUM_W);
    logSep();
    log('══ Bắt đầu ' + ALL_JOBS.length + ' video với ' + NUM_W + ' worker ══', 'ok');

    // Phân bổ jobs round-robin
    var queues = [];
    for (var i = 0; i < NUM_W; i++) queues.push([]);
    ALL_JOBS.forEach(function(j, i) { queues[i % NUM_W].push(Object.assign({}, j)); });

    WORKERS = queues.map(function(q, i) {
      return { wid: i, tabId: null, status: 'idle', jobs: q, doneC: 0, errC: 0, vidC: 0, currentJob: null, step: null, progress: 0 };
    });
    WORKERS.forEach(function(_, i) { pendingAssign.push(i); });

    // Mở worker tabs
    WORKERS.forEach(function(w, i) {
      setTimeout(function() {
        window.open('https://3big.online', '_blank');
        log('Mở Worker ' + (i+1) + ' — ' + w.jobs.length + ' jobs', 'b');
      }, i * 1200);
    });

    updStats();
  }

  function ketThuc() {
    running = false;
    var go = document.getElementById('a3m-go'); if (go) go.disabled = false;
    var stop = document.getElementById('a3m-stop'); if (stop) stop.style.display = 'none';
    var dot = document.getElementById('a3m-sdot'); if (dot) dot.classList.remove('on');
    var stxt = document.getElementById('a3m-stxt'); if (stxt) stxt.textContent = 'Hoàn thành!';
    var done = RESULTS.filter(function(r) { return r.status === 'done'; }).length;
    var err  = RESULTS.filter(function(r) { return r.status === 'error'; }).length;
    logSep();
    log('══ Xong! ' + done + '/' + ALL_JOBS.length + ' video ✓ | ' + err + ' lỗi | ' + totalClips + ' clip ══', 'ok');
    updStats(); switchTab('results');
  }

  // ── PUBLIC ─────────────────────────────
  return {
    init: function() { initChannel(); },
    batDau: batDau,
    dung: function() {
      running = false;
      if (ch) ch.postMessage({ type: 'STOP' });
      var go = document.getElementById('a3m-go'); if (go) go.disabled = false;
      var stop = document.getElementById('a3m-stop'); if (stop) stop.style.display = 'none';
      log('⏹ Đã dừng', 'e');
    },
    setNumW: function(n) { NUM_W = n; },
    dlResult: function(idx) {
      var r = RESULTS[idx]; if (!r || !r.videos) return;
      r.videos.forEach(function(url, i) {
        if (url) setTimeout(function() {
          var a = document.createElement('a'); a.href = url; a.download = '3big_' + (idx+1) + '_s' + (i+1) + '.mp4';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }, i * 700);
      });
    }
  };

})();
