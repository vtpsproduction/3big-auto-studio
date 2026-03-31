// ═══════════════════════════════════════════
// worker.js — Tự động thao tác trên 3big
// Thay người làm: điền form → bấm nút → chờ
// ═══════════════════════════════════════════
(function () {
  var CH = new BroadcastChannel('3big_v5');
  var myWid = null;
  var myJobs = [];
  var running = false;
  var jobIdx = 0;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ── Chờ điều kiện ────────────────────────
  function waitFor(fn, timeout, interval) {
    timeout = timeout || 30000; interval = interval || 500;
    return new Promise(function (resolve, reject) {
      var t = Date.now();
      (function check() {
        var r = fn();
        if (r) return resolve(r);
        if (Date.now() - t > timeout) return reject(new Error('Timeout: ' + fn.toString().slice(0, 60)));
        setTimeout(check, interval);
      })();
    });
  }

  // ── Chờ nút theo text ────────────────────
  function waitBtn(text, timeout) {
    return waitFor(function () {
      return Array.from(document.querySelectorAll('button')).find(function (b) {
        return b.textContent.trim().includes(text) && !b.disabled && b.offsetParent !== null;
      });
    }, timeout || 60000, 800);
  }

  // ── Điền select ──────────────────────────
  function setSelect(idx, value) {
    var sel = document.querySelectorAll('select')[idx];
    if (!sel) return false;
    var opt = Array.from(sel.options).find(function (o) { return o.text.trim() === value || o.value === value; });
    if (!opt) return false;
    var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    nativeSetter.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // ── Điền input ───────────────────────────
  function setInput(idx, value) {
    var inp = document.querySelectorAll('input[type="text"]')[idx];
    if (!inp) return false;
    var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(inp, value);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // ── Bấm nút theo text ────────────────────
  function clickBtn(text) {
    var btn = Array.from(document.querySelectorAll('button')).find(function (b) {
      return b.textContent.trim().includes(text) && !b.disabled && b.offsetParent !== null;
    });
    if (btn) { btn.click(); return true; }
    return false;
  }

  // ── Chờ ảnh xong ─────────────────────────
  // Dấu hiệu: nút "Đang tạo" biến mất
  function waitAnhXong() {
    return waitFor(function () {
      var btns = Array.from(document.querySelectorAll('button'));
      var dangTao = btns.find(function (b) { return b.textContent.includes('Đang tạo'); });
      var taoAnh = btns.find(function (b) { return b.textContent.trim() === 'Tạo Ảnh' && !b.disabled; });
      return !dangTao && taoAnh;
    }, 180000, 2000);
  }

  // ── Chờ video xong ───────────────────────
  // Dấu hiệu: nút "Tải Video" có số > 0
  function waitVideoXong() {
    return waitFor(function () {
      var btns = Array.from(document.querySelectorAll('button'));
      // Nút "Đang tạo video" biến mất
      var dangTao = btns.find(function (b) { return b.textContent.includes('Đang tạo') && b.textContent.includes('video'); });
      if (dangTao) return false;
      // Nút Tải Video có số > 0
      var taiVideo = btns.find(function (b) {
        var t = b.textContent.trim();
        if (!t.includes('Tải Video')) return false;
        var m = t.match(/\((\d+)\)/);
        return m && parseInt(m[1]) > 0;
      });
      return !!taiVideo;
    }, 600000, 3000);
  }

  // ── Kiểm tra có video lỗi không ──────────
  function hasVideoLoi() {
    return Array.from(document.querySelectorAll('button')).some(function (b) {
      return b.textContent.includes('Tạo Lại Video Lỗi') && !b.disabled && b.offsetParent !== null;
    });
  }

  // ── Chạy 1 job ───────────────────────────
  async function runJob(job, config) {
    report('JOB_START', { jobId: job.id, nhanVat: job.nhanVat });
    setBadge('⚙ Điền form...', '#FF6B35');

    try {
      // 1. Điền config vào form
      await sleep(500);
      setSelect(0, config.phongCach);
      await sleep(300);
      setSelect(1, config.ngonNgu);
      await sleep(300);

      // Tỉ lệ khung hình (button)
      var ratioText = config.tiLe === '9:16' ? '9:16 Dọc' : '16:9 Ngang';
      var ratioBtn = Array.from(document.querySelectorAll('button')).find(function (b) {
        return b.textContent.trim().includes(ratioText);
      });
      if (ratioBtn) ratioBtn.click();
      await sleep(300);

      setSelect(2, config.danhMuc);
      await sleep(300);
      setSelect(3, config.tone);
      await sleep(300);

      // 2. Điền 2 ô nhân vật và nội dung
      setInput(0, job.nhanVat);
      await sleep(300);
      setInput(1, job.noiDung);
      await sleep(500);

      // 3. Bấm "Tạo Ảnh & Phim"
      setBadge('🎬 Tạo kịch bản...', '#FF6B35');
      report('STEP', { jobId: job.id, step: 'script', progress: 10 });
      clickBtn('Tạo Ảnh & Phim');

      // 4. Chờ Batch List xuất hiện
      await waitFor(function () {
        return Array.from(document.querySelectorAll('button')).some(function (b) {
          return b.textContent.includes('Batch List') || b.textContent.includes('Tạo Ảnh');
        });
      }, 60000, 1000);
      await sleep(2000);

      // 5. Click tab Batch List nếu cần
      var batchTab = Array.from(document.querySelectorAll('button')).find(function (b) {
        return b.textContent.includes('Batch List');
      });
      if (batchTab) { batchTab.click(); await sleep(1000); }

      // 6. Bấm "Tạo Ảnh"
      setBadge('🖼 Tạo ảnh...', '#FF6B35');
      report('STEP', { jobId: job.id, step: 'img', progress: 30 });
      var taoAnhBtn = await waitBtn('Tạo Ảnh', 15000);
      taoAnhBtn.click();
      await sleep(2000);

      // 7. Chờ ảnh xong
      await waitAnhXong();
      setBadge('🖼 Ảnh xong!', '#10b981');
      report('STEP', { jobId: job.id, step: 'vid', progress: 55 });
      await sleep(1000);

      // 8. Bấm "Tạo Video"
      setBadge('🎬 Tạo video...', '#FF6B35');
      var taoVidBtn = await waitBtn('Tạo Video', 10000);
      taoVidBtn.click();
      await sleep(3000);

      // 9. Chờ video xong
      await waitVideoXong();
      await sleep(1000);

      // 10. Nếu có lỗi thì tạo lại
      if (hasVideoLoi()) {
        setBadge('⚠ Tạo lại video lỗi...', '#f59e0b');
        report('STEP', { jobId: job.id, step: 'retry', progress: 75 });
        clickBtn('Tạo Lại Video Lỗi');
        await sleep(3000);
        await waitVideoXong();
      }

      // 11. Bấm "Tải Video"
      setBadge('⬇ Tải video...', '#10b981');
      report('STEP', { jobId: job.id, step: 'download', progress: 90 });
      await sleep(500);
      var taiBtn = await waitBtn('Tải Video', 10000);
      taiBtn.click();
      await sleep(2000);

      setBadge('✓ Job ' + (job.id + 1) + ' xong!', '#10b981');
      report('JOB_DONE', { jobId: job.id, topicTitle: job.nhanVat.slice(0, 40) });

    } catch (err) {
      setBadge('✗ Lỗi: ' + err.message.slice(0, 30), '#ef4444');
      report('JOB_ERR', { jobId: job.id, errorMsg: err.message });
    }

    await sleep(2000);
  }

  // ── Giao tiếp ────────────────────────────
  function report(type, data) {
    var obj = { type: type, wid: myWid };
    if (data) Object.keys(data).forEach(function (k) { obj[k] = data[k]; });
    CH.postMessage(obj);
  }

  // ── Badge worker ─────────────────────────
  function setBadge(txt, color) {
    var b = document.getElementById('a3b-w-badge');
    if (!b) return;
    b.querySelector('.a3b-w-txt').textContent = txt;
    b.querySelector('.a3b-w-dot').style.background = color || '#FF6B35';
    b.style.borderColor = color || '#FF6B35';
  }

  function injectBadge() {
    if (document.getElementById('a3b-w-badge')) return;
    var el = document.createElement('div');
    el.id = 'a3b-w-badge';
    el.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:9999999;background:#fff;border:2px solid #FF6B35;border-radius:10px;padding:8px 14px;font-family:system-ui;font-size:12px;color:#333;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,.12);max-width:280px';
    el.innerHTML = '<div class="a3b-w-dot" style="width:8px;height:8px;border-radius:50%;background:#FF6B35;flex-shrink:0;animation:a3wp 1s infinite"></div><span class="a3b-w-txt">Kết nối manager...</span>';
    var st = document.createElement('style');
    st.textContent = '@keyframes a3wp{0%,100%{opacity:1}50%{opacity:.3}}';
    document.head.appendChild(st);
    document.body.appendChild(el);
  }

  // ── Init ─────────────────────────────────
  function init() {
    if (!localStorage.getItem('3big_session')) return;
    injectBadge();

    window.__a3bTabId = Math.random().toString(36).slice(2, 10);
    window.__a3bStamp = Date.now();

    // Retry báo online
    var retries = 0;
    var iv = setInterval(function () {
      if (myWid !== null || retries++ > 25) { clearInterval(iv); return; }
      CH.postMessage({ type: 'WORKER_ONLINE', tabId: window.__a3bTabId, stamp: window.__a3bStamp });
    }, 2000);
    setTimeout(function () {
      CH.postMessage({ type: 'WORKER_ONLINE', tabId: window.__a3bTabId, stamp: window.__a3bStamp });
    }, 800);

    CH.onmessage = async function (e) {
      var msg = e.data; if (!msg || !msg.type) return;

      if (msg.type === 'ASSIGN' && msg.tabId === window.__a3bTabId) {
        myWid = msg.wid;
        clearInterval(iv);
        setBadge('✓ Worker ' + (myWid + 1) + ' — Sẵn sàng', '#10b981');
        report('READY', {});
      }

      if (msg.type === 'RUN' && msg.wid === myWid) {
        running = true;
        myJobs = msg.jobs || [];
        var config = msg.config || {};

        for (var i = 0; i < myJobs.length; i++) {
          if (!running) break;
          setBadge('▶ Job ' + (i + 1) + '/' + myJobs.length, '#FF6B35');
          await runJob(myJobs[i], config);
          if (i < myJobs.length - 1 && running) await sleep(2000);
        }

        setBadge('✅ Xong ' + myJobs.length + ' jobs!', '#10b981');
        report('ALL_DONE', {});
      }

      if (msg.type === 'STOP') {
        running = false;
        setBadge('⏹ Đã dừng', '#6b7280');
      }
    };
  }

  if (document.readyState === 'complete') setTimeout(init, 2000);
  else window.addEventListener('load', function () { setTimeout(init, 2000); });
})();
