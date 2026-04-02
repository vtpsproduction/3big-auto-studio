// worker.js v6 — Click automation đơn giản, chắc chắn
(function () {
  var CH = new BroadcastChannel('3big_v5');
  var myWid = null;
  var running = false;

  function sleep(ms) { return new Promise(function(r){ setTimeout(r,ms); }); }

  // Chờ điều kiện fn() trả về truthy
  function until(fn, timeout, tick) {
    return new Promise(function(resolve, reject) {
      var start = Date.now(); tick = tick||500;
      (function check() {
        var v = fn();
        if (v) return resolve(v);
        if (Date.now()-start > (timeout||30000)) return reject(new Error('Timeout: ' + fn.toString().slice(0,80)));
        setTimeout(check, tick);
      })();
    });
  }

  // Tìm button có text chứa str, không disabled, đang visible
  function findBtn(str) {
    return Array.from(document.querySelectorAll('button')).find(function(b){
      return b.textContent.trim().includes(str) && !b.disabled && b.offsetParent !== null;
    });
  }

  function report(type, data) {
    var obj = {type:type, wid:myWid};
    if (data) Object.keys(data).forEach(function(k){ obj[k]=data[k]; });
    CH.postMessage(obj);
  }

  function setBadge(txt, color) {
    var b = document.getElementById('a3b-w-badge');
    if (!b) return;
    b.querySelector('.a3b-w-txt').textContent = txt;
    b.querySelector('.a3b-w-dot').style.background = color||'#FF6B35';
    b.style.borderColor = color||'#FF6B35';
  }

  // Điền select
  function setSelect(idx, value) {
    var sel = document.querySelectorAll('select')[idx]; if (!sel) return;
    var opt = Array.from(sel.options).find(function(o){ return o.text.trim()===value||o.value===value; });
    if (!opt) return;
    var setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;
    setter.call(sel, opt.value);
    sel.dispatchEvent(new Event('change',{bubbles:true}));
  }

  // Điền input
  function setInput(idx, val) {
    var inp = document.querySelectorAll('input[type="text"]')[idx]; if (!inp) return;
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    setter.call(inp, val);
    inp.dispatchEvent(new Event('input',{bubbles:true}));
  }

  // ── CHẠY 1 JOB ──────────────────────────────────
  async function runJob(job, config) {
    report('JOB_START', {jobId:job.id, nhanVat:job.nhanVat});

    try {
      // ẨN panel manager để không che giao diện
      var mgr = document.getElementById('a3b-win');
      var tog = document.getElementById('a3b-toggle');
      if (mgr) mgr.style.display = 'none';
      if (tog) tog.style.display = 'none';
      await sleep(300);

      // BƯỚC 1: Điền form
      setBadge('⚙ Điền form...', '#6366f1');
      report('STEP', {jobId:job.id, step:'script', progress:5});
      await sleep(500);

      setSelect(0, config.phongCach || '3D Pixar Cute');
      await sleep(200);
      setSelect(1, config.ngonNgu || '🇻🇳 Tiếng Việt');
      await sleep(200);
      setSelect(2, config.danhMuc || 'Mẹo Vặt Cuộc Sống');
      await sleep(200);
      setSelect(3, config.tone || 'Hậu đậu & Hài hước');
      await sleep(200);

      // Tỉ lệ
      var tiLe = config.tiLe === '16:9' ? '16:9 Ngang' : '9:16 Dọc';
      var tiLeBtn = Array.from(document.querySelectorAll('button')).find(function(b){
        return b.textContent.trim().includes(tiLe);
      });
      if (tiLeBtn) tiLeBtn.click();
      await sleep(200);

      setInput(0, job.nhanVat);
      await sleep(200);
      setInput(1, job.noiDung);
      await sleep(500);

      // BƯỚC 2: Bấm "Tạo Ảnh & Phim"
      setBadge('🎬 Tạo kịch bản...', '#FF6B35');
      report('STEP', {jobId:job.id, step:'script', progress:10});
      var taoBtn = findBtn('Tạo Ảnh & Phim');
      if (!taoBtn) throw new Error('Không tìm được nút Tạo Ảnh & Phim');
      taoBtn.click();

      // BƯỚC 3: Chờ Batch List xuất hiện (kịch bản gen xong)
      setBadge('⏳ Chờ kịch bản...', '#FF6B35');
      await until(function(){
        return Array.from(document.querySelectorAll('button')).some(function(b){
          return b.textContent.includes('Batch List') && b.offsetParent !== null;
        });
      }, 90000, 1000);
      await sleep(1500);

      // BƯỚC 4: Click tab Batch List
      var batchTab = Array.from(document.querySelectorAll('button')).find(function(b){
        return b.textContent.includes('Batch List') && b.offsetParent !== null;
      });
      if (batchTab) { batchTab.click(); await sleep(1500); }

      // BƯỚC 5: Bấm "Tạo Ảnh"
      setBadge('🖼 Bấm Tạo Ảnh...', '#FF6B35');
      report('STEP', {jobId:job.id, step:'img', progress:30});
      var taoAnhBtn = await until(function(){ return findBtn('Tạo Ảnh'); }, 15000, 800);
      taoAnhBtn.click();
      await sleep(2000);

      // BƯỚC 6: Chờ ảnh xong
      setBadge('🖼 Đang tạo ảnh...', '#f59e0b');
      await until(function(){
        // Nút Đang tạo phải biến mất
        var dangTao = Array.from(document.querySelectorAll('button')).find(function(b){
          return b.textContent.includes('Đang tạo') && b.offsetParent !== null;
        });
        if (dangTao) return false;
        // Phải có ảnh hiện trong bảng (img tag trong cột Hình Ảnh)
        var imgs = document.querySelectorAll('img[src*="http"]');
        var hasAnhMoi = Array.from(imgs).some(function(img){
          return img.src.includes('nano') || img.src.includes('cloudinary') || img.src.includes('storage') || img.src.includes('generate');
        });
        if (hasAnhMoi) return true;
        // Fallback: nút Tạo Ảnh active = xong
        return !!findBtn('Tạo Ảnh');
      }, 180000, 2000);
      setBadge('✓ Ảnh xong!', '#10b981');
      await sleep(2000);

      // BƯỚC 7: Bấm "Tạo Video"
      setBadge('🎬 Bấm Tạo Video...', '#FF6B35');
      report('STEP', {jobId:job.id, step:'vid', progress:55});
      var taoVidBtn = await until(function(){ return findBtn('Tạo Video'); }, 15000, 800);
      taoVidBtn.click();
      await sleep(3000);

      // BƯỚC 8: Chờ video xong — "Tải Video (N)" với N > 0
      setBadge('🎬 Đang render video...', '#f59e0b');
      await until(function(){
        return Array.from(document.querySelectorAll('button')).find(function(b){
          if (!b.textContent.includes('Tải Video')) return false;
          var m = b.textContent.match(/\((\d+)\)/);
          return m && parseInt(m[1]) > 0;
        });
      }, 600000, 3000);
      await sleep(1000);

      // BƯỚC 9: Nếu có lỗi → Tạo lại
      var loiBtn = findBtn('Tạo Lại Video Lỗi');
      if (loiBtn) {
        setBadge('⚠ Tạo lại video lỗi...', '#f59e0b');
        loiBtn.click();
        await sleep(3000);
        await until(function(){
          return Array.from(document.querySelectorAll('button')).find(function(b){
            if (!b.textContent.includes('Tải Video')) return false;
            var m = b.textContent.match(/\((\d+)\)/);
            return m && parseInt(m[1]) > 0;
          });
        }, 300000, 3000);
        await sleep(1000);
      }

      // BƯỚC 10: Bấm "Tải Video"
      setBadge('⬇ Tải video...', '#10b981');
      report('STEP', {jobId:job.id, step:'download', progress:90});
      var taiBtn = findBtn('Tải Video');
      if (taiBtn) { taiBtn.click(); await sleep(2000); }

      report('JOB_DONE', {jobId:job.id, topicTitle:job.nhanVat.slice(0,40)});
      setBadge('✅ Job xong!', '#10b981');
      // Hiện lại panel manager
      var mgr2 = document.getElementById('a3b-win');
      var tog2 = document.getElementById('a3b-toggle');
      if (mgr2) mgr2.style.display = '';
      if (tog2) tog2.style.display = '';

    } catch(err) {
      var mgr3 = document.getElementById('a3b-win');
      var tog3 = document.getElementById('a3b-toggle');
      if (mgr3) mgr3.style.display = '';
      if (tog3) tog3.style.display = '';
      report('JOB_ERR', {jobId:job.id, errorMsg:err.message});
      setBadge('✗ ' + err.message.slice(0,40), '#ef4444');
    }
    await sleep(2000);
  }

  // ── BADGE ────────────────────────────────────
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

  // ── INIT ────────────────────────────────────
  function init() {
    if (!localStorage.getItem('3big_session')) return;
    if (window.__a3bIsManager) return; // Manager tab bỏ qua
    injectBadge();

    // Auto-dismiss alert/confirm popup của 3big
    window.__origAlert = window.alert;
    window.__origConfirm = window.confirm;
    window.alert = function(msg) { console.log('[3BIG] Auto-dismiss alert:', msg); };
    window.confirm = function(msg) { console.log('[3BIG] Auto-confirm:', msg); return true; };

    window.__a3bTabId = Math.random().toString(36).slice(2, 10);
    window.__a3bStamp = Date.now();

    // Retry báo online mỗi 2s
    var retries = 0;
    var iv = setInterval(function(){
      if (myWid !== null || retries++ > 25) { clearInterval(iv); return; }
      CH.postMessage({type:'WORKER_ONLINE', tabId:window.__a3bTabId, stamp:window.__a3bStamp});
    }, 2000);
    setTimeout(function(){
      CH.postMessage({type:'WORKER_ONLINE', tabId:window.__a3bTabId, stamp:window.__a3bStamp});
    }, 800);

    CH.onmessage = async function(e) {
      var msg = e.data; if (!msg||!msg.type) return;

      if (msg.type === 'ASSIGN' && msg.tabId === window.__a3bTabId) {
        myWid = msg.wid;
        clearInterval(iv);
        setBadge('✓ Worker '+(myWid+1)+' — Sẵn sàng', '#10b981');
        report('READY', {});
      }

      if (msg.type === 'RUN' && msg.wid === myWid) {
        running = true;
        var jobs = msg.jobs||[];
        var config = msg.config||{};
        for (var i=0; i<jobs.length; i++) {
          if (!running) break;
          setBadge('▶ Job '+(i+1)+'/'+jobs.length, '#FF6B35');
          await runJob(jobs[i], config);
          if (i<jobs.length-1 && running) await sleep(2000);
        }
        setBadge('✅ Xong '+jobs.length+' jobs!', '#10b981');
        report('ALL_DONE', {});
      }

      if (msg.type === 'STOP') { running = false; setBadge('⏹ Dừng', '#6b7280'); }
    };
  }

  if (document.readyState==='complete') setTimeout(init, 2000);
  else window.addEventListener('load', function(){ setTimeout(init, 2000); });
})();
