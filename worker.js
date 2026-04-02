// ============================================================
// worker.js v7 — 3BIG Auto Studio
// Thuật toán chuẩn xác từ 3 lần test thực tế
// ============================================================
(function () {
  'use strict';

  // ── Setup ────────────────────────────────────────────────
  window.alert   = function (m) { console.log('[3BIG dismiss]', m); };
  window.confirm = function ()  { return true; };

  var CH    = new BroadcastChannel('3big_v5');
  var myWid = null;
  var running = false;

  // ── Helpers ───────────────────────────────────────────────

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  // Chờ fn() trả về truthy
  function waitFor(fn, timeout, tick) {
    timeout = timeout || 30000;
    tick    = tick    || 800;
    return new Promise(function (res, rej) {
      var s = Date.now();
      (function c() {
        var v = fn();
        if (v) return res(v);
        if (Date.now() - s > timeout) return rej(new Error('Timeout: ' + fn.toString().slice(0, 60)));
        setTimeout(c, tick);
      })();
    });
  }

  // RC click — mousedown + mouseup + click (cho React)
  function RC(el) {
    if (!el || !el.scrollIntoView) return;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    ['mousedown', 'mouseup', 'click'].forEach(function (t) {
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
    });
  }

  // clickWithCoords — dispatch MouseEvent với đúng clientX/clientY
  // React nhận event này vì có coordinates hợp lệ
  function clickWithCoords(el) {
    if (!el) return false;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    var r = el.getBoundingClientRect();
    var cx = r.x + r.width / 2;
    var cy = r.y + r.height / 2;
    el.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, view: window,
      clientX: cx, clientY: cy,
      screenX: cx, screenY: cy,
      button: 0, buttons: 1
    }));
    return true;
  }

  // Tìm button theo text (không check #a3b-win panel)
  function findBtn(text, exact) {
    return Array.from(document.querySelectorAll('button')).find(function (b) {
      if (b.closest && b.closest('#a3b-win')) return false;
      var t = b.textContent.trim();
      return exact ? t === text : t.includes(text);
    });
  }

  // fillSelect + fillInput
  function fillS(idx, val) {
    var s = document.querySelectorAll('select')[idx];
    if (!s) return;
    var o = Array.from(s.options).find(function (o) { return o.text.includes(val); });
    if (!o) return;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, o.value);
    s.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillI(idx, val) {
    var el = document.querySelectorAll('input[type="text"]')[idx];
    if (!el) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Badge
  function badge(txt, color) {
    var b = document.getElementById('a3b-w-badge');
    if (!b) return;
    var dot = b.querySelector('.a3b-w-dot');
    var span = b.querySelector('.a3b-w-txt');
    if (span) span.textContent = txt;
    if (dot)  dot.style.background = color || '#FF6B35';
    b.style.borderColor = color || '#FF6B35';
  }

  function injectBadge() {
    if (document.getElementById('a3b-w-badge')) return;
    var st = document.createElement('style');
    st.textContent = '@keyframes a3bp{0%,100%{opacity:1}50%{opacity:.3}}';
    document.head.appendChild(st);
    var el = document.createElement('div');
    el.id = 'a3b-w-badge';
    el.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:9999999;background:#fff;border:2px solid #FF6B35;border-radius:10px;padding:8px 14px;font-family:system-ui;font-size:12px;color:#333;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,.12);max-width:300px';
    el.innerHTML = '<div class="a3b-w-dot" style="width:8px;height:8px;border-radius:50%;background:#FF6B35;flex-shrink:0;animation:a3bp 1s infinite"></div><span class="a3b-w-txt">Kết nối manager...</span>';
    document.body.appendChild(el);
  }

  function report(type, data) {
    var obj = { type: type, wid: myWid };
    if (data) Object.keys(data).forEach(function (k) { obj[k] = data[k]; });
    CH.postMessage(obj);
  }

  // ── MAIN FLOW ─────────────────────────────────────────────

  async function runJob(job, config) {
    report('JOB_START', { jobId: job.id, nhanVat: job.nhanVat });

    try {
      // S1: Điền form
      badge('⚙ Điền form...', '#6366f1');
      report('STEP', { jobId: job.id, step: 'script', progress: 5 });
      fillS(0, config.phongCach || '3D Pixar Cute');
      fillS(1, config.ngonNgu  || 'Tiếng Việt');
      fillS(2, config.danhMuc  || 'Mẹo Vặt');
      fillS(3, config.tone     || 'Hậu đậu');
      await sleep(300);
      fillI(0, job.nhanVat);
      fillI(1, job.noiDung);
      await sleep(400);

      // Tỉ lệ khung hình
      var tiLe = (config.tiLe === '16:9') ? '16:9 Ngang' : '9:16 Dọc';
      var tiLeBtn = findBtn(tiLe, false);
      if (tiLeBtn) tiLeBtn.click();
      await sleep(200);

      // S2: Bấm Tạo Ảnh & Phim
      badge('🎬 Tạo kịch bản...', '#FF6B35');
      var taoBtn = await waitFor(function () {
        return findBtn('Tạo Ảnh & Phim', false);
      }, 10000);
      taoBtn.scrollIntoView({ block: 'center', behavior: 'instant' });
      taoBtn.click();
      report('STEP', { jobId: job.id, step: 'script', progress: 10 });

      // S3: Chờ Batch List → click + verify "Tạo Ảnh" xuất hiện
      // Phải verify vì React tab switch không lúc nào cũng thành công ngay
      badge('⏳ Chờ kịch bản...', '#FF6B35');
      await waitFor(function () {
        return Array.from(document.querySelectorAll('button')).some(function (b) {
          return b.textContent.includes('Batch List') && b.offsetParent !== null;
        });
      }, 90000, 1000);
      await sleep(1000);

      var batchOK = false;
      for (var attempt = 0; attempt < 8; attempt++) {
        var bl = Array.from(document.querySelectorAll('button')).find(function (b) {
          return b.textContent.includes('Batch List') && b.offsetParent !== null;
        });
        if (bl) clickWithCoords(bl);
        // Verify: chờ "Tạo Ảnh" button (exact text) xuất hiện = tab đã switch
        var switched = await new Promise(function (res) {
          var s = Date.now();
          (function c() {
            var ok = Array.from(document.querySelectorAll('button')).find(function (b) {
              if (b.closest && b.closest('#a3b-win')) return false;
              return b.textContent.trim() === 'Tạo Ảnh' && b.offsetParent !== null;
            });
            if (ok)              return res(true);
            if (Date.now()-s > 2000) return res(false);
            setTimeout(c, 300);
          })();
        });
        if (switched) { batchOK = true; break; }
        await sleep(600);
      }
      if (!batchOK) throw new Error('Batch List tab không switch sau 8 lần thử');
      badge('📋 Batch List OK', '#10b981');

      // S4: Click Tạo Ảnh (textContent === 'Tạo Ảnh', không phải aria-label)
      badge('🖼 Tạo ảnh...', '#FF6B35');
      report('STEP', { jobId: job.id, step: 'img', progress: 30 });
      var taoAnhBtn = await waitFor(function () {
        return Array.from(document.querySelectorAll('button')).find(function (b) {
          if (b.closest && b.closest('#a3b-win')) return false;
          return b.textContent.trim() === 'Tạo Ảnh' && !b.disabled && b.offsetParent !== null;
        });
      }, 10000);
      taoAnhBtn.scrollIntoView({ block: 'center', behavior: 'instant' });
      taoAnhBtn.click();
      await sleep(2000);

      // S5: Poll per-row — ảnh scene nào xong thì click Create video ngay
      // QUAN TRỌNG: dùng img.naturalWidth > 0 (KHÔNG dùng img.src — bị extension block)
      // TR = btn.parentElement.parentElement.parentElement (DIV → TD → TR)
      // Dừng khi: không còn "Đang tạo" VÀ không còn Create button nào
      badge('🖼 Tạo ảnh + video...', '#FF6B35');
      report('STEP', { jobId: job.id, step: 'vid', progress: 50 });
      var clickedRows = {};

      await new Promise(function (res, rej) {
        var start = Date.now();
        var iv = setInterval(function () {

          // Tìm tất cả Create buttons trong cột Video
          var creates = Array.from(document.querySelectorAll('button')).filter(function (b) {
            if (b.closest && b.closest('#a3b-win')) return false;
            return b.textContent.trim() === 'Create' && !b.disabled && b.offsetParent !== null;
          });

          // Click Create của row nào đã có ảnh
          creates.forEach(function (btn, i) {
            if (clickedRows[i]) return;
            var tr = btn.parentElement &&
                     btn.parentElement.parentElement &&
                     btn.parentElement.parentElement.parentElement; // DIV > TD > TR
            if (!tr) return;
            var img = tr.querySelector('img');
            // naturalWidth > 0 = ảnh đã load xong (không dùng src vì bị block)
            if (img && img.naturalWidth > 0) {
              clickedRows[i] = true;
              RC(btn);
              console.log('[3BIG] Scene ' + (i+1) + ' ảnh xong → Create video ✓');
            }
          });

          // Điều kiện dừng: không còn "Đang tạo" VÀ không còn Create nào
          var dangTao = Array.from(document.querySelectorAll('button')).find(function (b) {
            if (b.closest && b.closest('#a3b-win')) return false;
            return b.textContent.includes('Đang tạo') && b.offsetParent !== null;
          });
          var remainCreate = Array.from(document.querySelectorAll('button')).filter(function (b) {
            if (b.closest && b.closest('#a3b-win')) return false;
            return b.textContent.trim() === 'Create' && !b.disabled && b.offsetParent !== null;
          });

          // Dừng: ảnh xong hết + không còn Create button nào chưa click
          if (!dangTao && remainCreate.length === 0 && Object.keys(clickedRows).length > 0) {
            clearInterval(iv);
            console.log('[3BIG] S5 done: tất cả scenes đã tạo video');
            res();
            return;
          }

          if (Date.now() - start > 300000) { // 5 phút
            clearInterval(iv);
            rej(new Error('S5 timeout 5min'));
          }
        }, 1500);
      });

      // S6: Chờ TẤT CẢ video render xong
      // Điều kiện đồng thời:
      // 1. Không còn % progress (không còn scene nào đang render)
      // 2. Không còn Create button (tất cả đã click)
      // 3. "Tải Video (N)" với N > 0 trong toolbar Batch List
      badge('🎬 Render video...', '#f59e0b');
      report('STEP', { jobId: job.id, step: 'vid', progress: 70 });

      await waitFor(function () {
        // 1. Còn % không?
        var hasPct = Array.from(document.querySelectorAll('*')).some(function (el) {
          return el.children.length === 0 && /^\d+%$/.test(el.textContent.trim());
        });
        if (hasPct) return false;

        // 2. Còn Create không?
        var hasCreate = Array.from(document.querySelectorAll('button')).some(function (b) {
          if (b.closest && b.closest('#a3b-win')) return false;
          return b.textContent.trim() === 'Create' && !b.disabled && b.offsetParent !== null;
        });
        if (hasCreate) return false;

        // 3. Tải Video (N>0)?
        return Array.from(document.querySelectorAll('button')).find(function (b) {
          if (b.closest && b.closest('#a3b-win')) return false;
          if (!b.textContent.includes('Tải Video')) return false;
          var m = b.textContent.match(/\((\d+)\)/);
          return m && parseInt(m[1]) > 0;
        });
      }, 600000, 3000);

      badge('✓ Video xong!', '#10b981');
      report('STEP', { jobId: job.id, step: 'download', progress: 90 });
      await sleep(500);

      // S7: Retry nếu có video lỗi
      var loiBtn = Array.from(document.querySelectorAll('button')).find(function (b) {
        if (b.closest && b.closest('#a3b-win')) return false;
        return b.textContent.includes('Tạo Lại Video Lỗi') && !b.disabled && b.offsetParent !== null;
      });
      if (loiBtn) {
        badge('⚠ Retry lỗi...', '#f59e0b');
        RC(loiBtn);
        await sleep(5000);
        // Chờ retry xong
        await waitFor(function () {
          var hasPct = Array.from(document.querySelectorAll('*')).some(function (el) {
            return el.children.length === 0 && /^\d+%$/.test(el.textContent.trim());
          });
          if (hasPct) return false;
          return Array.from(document.querySelectorAll('button')).find(function (b) {
            if (b.closest && b.closest('#a3b-win')) return false;
            if (!b.textContent.includes('Tải Video')) return false;
            var m = b.textContent.match(/\((\d+)\)/);
            return m && parseInt(m[1]) > 0;
          });
        }, 300000, 3000);
        await sleep(500);
      }

      // S8: Tải video
      var taiBtn = Array.from(document.querySelectorAll('button')).find(function (b) {
        if (b.closest && b.closest('#a3b-win')) return false;
        return b.textContent.includes('Tải Video') && b.offsetParent !== null;
      });
      RC(taiBtn);
      badge('✅ Job xong!', '#10b981');
      report('JOB_DONE', { jobId: job.id, topicTitle: job.nhanVat.slice(0, 50) });
      console.log('[3BIG] ✅ JOB XONG:', job.nhanVat.slice(0, 40));

    } catch (err) {
      badge('✗ ' + err.message.slice(0, 40), '#ef4444');
      report('JOB_ERR', { jobId: job.id, errorMsg: err.message });
      console.error('[3BIG] ERR:', err.message);
    }

    await sleep(2000);
  }

  // ── INIT ─────────────────────────────────────────────────

  function init() {
    if (!localStorage.getItem('3big_session')) return;
    if (window.__a3bIsManager) return; // manager tab bỏ qua

    injectBadge();
    window.__a3bTabId  = Math.random().toString(36).slice(2, 10);
    window.__a3bStamp  = Date.now();

    // Báo online với manager, retry mỗi 2s
    var retries = 0;
    var iv = setInterval(function () {
      if (myWid !== null || retries++ > 30) { clearInterval(iv); return; }
      CH.postMessage({ type: 'WORKER_ONLINE', tabId: window.__a3bTabId, stamp: window.__a3bStamp });
    }, 2000);
    setTimeout(function () {
      CH.postMessage({ type: 'WORKER_ONLINE', tabId: window.__a3bTabId, stamp: window.__a3bStamp });
    }, 800);

    CH.onmessage = async function (e) {
      var msg = e.data;
      if (!msg || !msg.type) return;

      if (msg.type === 'ASSIGN' && msg.tabId === window.__a3bTabId) {
        myWid = msg.wid;
        clearInterval(iv);
        badge('✓ Worker ' + (myWid + 1) + ' — Sẵn sàng', '#10b981');
        report('READY', {});
      }

      if (msg.type === 'RUN' && msg.wid === myWid) {
        running = true;
        var jobs   = msg.jobs   || [];
        var config = msg.config || {};

        for (var i = 0; i < jobs.length; i++) {
          if (!running) break;
          badge('▶ Job ' + (i+1) + '/' + jobs.length, '#FF6B35');
          await runJob(jobs[i], config);
          if (i < jobs.length - 1 && running) await sleep(2000);
        }

        badge('✅ Xong ' + jobs.length + ' jobs!', '#10b981');
        report('ALL_DONE', {});
        running = false;
      }

      if (msg.type === 'STOP') {
        running = false;
        badge('⏹ Dừng', '#6b7280');
      }
    };
  }

  if (document.readyState === 'complete') setTimeout(init, 2000);
  else window.addEventListener('load', function () { setTimeout(init, 2000); });

})();
