// worker.js — Tự động điền form và bấm nút trên 3big.online
// Chạy như người thật: điền ô → bấm nút → chờ → lấy video

(function() {
  var CH = new BroadcastChannel('3big_v4');
  var myJobs = null;
  var myWid = null;
  var running = false;

  function sleep(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }

  // Điền vào input field
  function fillInput(el, value) {
    var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Chờ element xuất hiện
  function waitEl(selector, timeout) {
    timeout = timeout || 30000;
    return new Promise(function(resolve, reject) {
      var start = Date.now();
      function check() {
        var el = document.querySelector(selector);
        if (el) return resolve(el);
        if (Date.now() - start > timeout) return reject(new Error('Timeout: ' + selector));
        setTimeout(check, 500);
      }
      check();
    });
  }

  // Chờ button theo text
  function waitBtn(text, timeout) {
    timeout = timeout || 60000;
    return new Promise(function(resolve, reject) {
      var start = Date.now();
      function check() {
        var btns = document.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
          if (btns[i].textContent.includes(text) && !btns[i].disabled) {
            return resolve(btns[i]);
          }
        }
        if (Date.now() - start > timeout) return reject(new Error('Timeout button: ' + text));
        setTimeout(check, 1000);
      }
      check();
    });
  }

  // Chờ video xuất hiện (polling)
  function waitVideo(timeout) {
    timeout = timeout || 300000; // 5 phút
    return new Promise(function(resolve, reject) {
      var start = Date.now();
      function check() {
        // Tìm link video
        var links = document.querySelectorAll('a[href*=".mp4"], video source, video[src]');
        if (links.length > 0) return resolve(links);
        // Tìm nút Tải Video đã active
        var dlBtn = Array.from(document.querySelectorAll('button')).find(function(b) {
          return b.textContent.includes('Tải Video') && !b.disabled;
        });
        if (dlBtn) return resolve(dlBtn);
        if (Date.now() - start > timeout) return reject(new Error('Timeout video'));
        setTimeout(check, 3000);
      }
      check();
    });
  }

  function report(type, data) {
    var obj = { type: type, wid: myWid };
    if (data) Object.assign(obj, data);
    CH.postMessage(obj);
  }

  // Cập nhật badge
  function setBadge(txt, color) {
    var b = document.getElementById('a3b-badge');
    if (b) {
      b.querySelector('span').textContent = txt;
      if (color) b.style.borderColor = color;
    }
  }

  // Chạy 1 job = 1 prompt
  async function runJob(job) {
    report('JOB_START', { jobId: job.id, nhanVat: job.nhanVat });
    setBadge('⚙ Đang điền form...', '#f5c842');

    try {
      // 1. Tìm và điền ô "Nhân hóa đồ vật"
      report('STEP', { jobId: job.id, step: 'fill', progress: 10 });
      var inputs = document.querySelectorAll('input[type="text"]');
      var nhanVatInput = null;
      var noiDungInput = null;
      inputs.forEach(function(inp) {
        var placeholder = inp.placeholder || '';
        if (placeholder.includes('Miếng thịt') || placeholder.includes('nhân vật') || placeholder.includes('vật')) {
          nhanVatInput = inp;
        }
        if (placeholder.includes('tẩy trắng') || placeholder.includes('mẹo') || placeholder.includes('nội dung')) {
          noiDungInput = inp;
        }
      });

      // Fallback: lấy 2 input đầu tiên
      if (!nhanVatInput && inputs.length >= 1) nhanVatInput = inputs[0];
      if (!noiDungInput && inputs.length >= 2) noiDungInput = inputs[1];

      if (!nhanVatInput) throw new Error('Không tìm được ô Nhân hóa đồ vật');
      if (!noiDungInput) throw new Error('Không tìm được ô Nội dung');

      fillInput(nhanVatInput, job.nhanVat);
      await sleep(500);
      fillInput(noiDungInput, job.noiDung);
      await sleep(500);
      setBadge('🖱 Bấm Tạo Ảnh & Phim...', '#f5c842');

      // 2. Bấm nút "Tạo Ảnh & Phim"
      report('STEP', { jobId: job.id, step: 'script', progress: 20 });
      var taoBtn = await waitBtn('Tạo Ảnh & Phim', 10000);
      taoBtn.click();
      await sleep(3000); // Chờ kịch bản gen xong

      // 3. Chờ tab Batch List và nút "Tạo Ảnh" xuất hiện
      report('STEP', { jobId: job.id, step: 'img', progress: 35 });
      setBadge('🖼 Chờ Tạo Ảnh...', '#AFA9EC');
      await sleep(5000); // Chờ kịch bản gen

      var taoAnhBtn = await waitBtn('Tạo Ảnh', 30000);
      taoAnhBtn.click();
      setBadge('🖼 Đang tạo ảnh...', '#AFA9EC');

      // 4. Chờ nút "Tạo Video" xuất hiện (ảnh xong)
      report('STEP', { jobId: job.id, step: 'vid', progress: 55 });
      await sleep(3000);
      var taoVidBtn = await waitBtn('Tạo Video', 120000);
      setBadge('🎬 Bấm Tạo Video...', '#5DCAA5');
      taoVidBtn.click();

      // 5. Chờ video xong → Bấm Tải Video
      report('STEP', { jobId: job.id, step: 'download', progress: 75 });
      setBadge('🎬 Đang render video...', '#5DCAA5');
      await waitVideo(300000);
      await sleep(2000);

      var taiBtn = await waitBtn('Tải Video', 30000);
      setBadge('⬇ Đang tải video...', '#5DCAA5');
      taiBtn.click();
      await sleep(2000);

      report('JOB_DONE', { jobId: job.id, topicTitle: job.nhanVat.slice(0,40) });
      setBadge('✓ Job ' + (job.id+1) + ' xong!', '#5DCAA5');
      await sleep(3000);

    } catch(err) {
      report('JOB_ERR', { jobId: job.id, errorMsg: err.message });
      setBadge('✗ Lỗi: ' + err.message.slice(0,30), '#F09595');
      await sleep(2000);
    }
  }

  // Inject badge
  function injectBadge() {
    if (document.getElementById('a3b-badge')) return;
    var s = document.createElement('style');
    s.textContent = '@keyframes a3bp{0%,100%{opacity:1}50%{opacity:.3}}';
    document.head.appendChild(s);
    var b = document.createElement('div');
    b.id = 'a3b-badge';
    b.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:9999999;background:#141414;border:1px solid #f5c842;border-radius:8px;padding:8px 12px;font-family:system-ui;font-size:11px;color:#f5c842;display:flex;align-items:center;gap:6px;box-shadow:0 4px 16px #000a;max-width:280px';
    b.innerHTML = '<div style="width:7px;height:7px;border-radius:50%;background:#f5c842;flex-shrink:0;animation:a3bp 1s infinite"></div><span>Kết nối manager...</span>';
    document.body.appendChild(b);
  }

  function init() {
    if (!localStorage.getItem('3big_session')) return;
    injectBadge();

    // Tạo tabId
    window.__a3bTabId = Math.random().toString(36).slice(2, 10);
    window.__a3bStamp = Date.now();

    // Retry báo online mỗi 2s, tối đa 20 lần
    var retries = 0;
    var interval = setInterval(function() {
      if (myWid !== null || retries++ > 20) { clearInterval(interval); return; }
      CH.postMessage({ type: 'WORKER_ONLINE', tabId: window.__a3bTabId, stamp: window.__a3bStamp });
    }, 2000);

    setTimeout(function() {
      CH.postMessage({ type: 'WORKER_ONLINE', tabId: window.__a3bTabId, stamp: window.__a3bStamp });
    }, 800);

    CH.onmessage = async function(e) {
      var msg = e.data;
      if (!msg || !msg.type) return;

      if (msg.type === 'ASSIGN' && msg.tabId === window.__a3bTabId) {
        myWid = msg.wid;
        clearInterval(interval);
        setBadge('✓ Worker ' + (myWid+1) + ' — Sẵn sàng', '#5DCAA5');
        CH.postMessage({ type: 'READY', wid: myWid });
      }

      if (msg.type === 'RUN' && msg.wid === myWid) {
        running = true;
        myJobs = msg.jobs || [];

        for (var i = 0; i < myJobs.length; i++) {
          if (!running) break;
          setBadge('▶ Job ' + (i+1) + '/' + myJobs.length, '#f5c842');
          await runJob(myJobs[i]);
          if (i < myJobs.length - 1 && running) await sleep(2000);
        }

        setBadge('✓ Xong tất cả ' + myJobs.length + ' jobs!', '#5DCAA5');
        CH.postMessage({ type: 'ALL_DONE', wid: myWid });
      }

      if (msg.type === 'STOP') {
        running = false;
        setBadge('⏹ Đã dừng', '#F09595');
      }
    };
  }

  if (document.readyState === 'complete') setTimeout(init, 2000);
  else window.addEventListener('load', function() { setTimeout(init, 2000); });

})();
