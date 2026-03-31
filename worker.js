// ═══════════════════════════════════════
// worker.js — Logic chạy từng job
// ═══════════════════════════════════════

var A3B_WORKER = (function() {

  var CH_NAME = '3big_auto_v4';
  var myWid = null;
  var running = false;
  var ch = null;

  function report(type, data) {
    var obj = { type: type, wid: myWid };
    if (data) Object.assign(obj, data);
    ch.postMessage(obj);
  }

  function download(url, name) {
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
  }

  async function runJob(job, style, mood) {
    report('JOB_START', { jobId: job.id, nhanVat: job.nhanVat });

    // 1. Gen kịch bản
    report('STEP', { jobId: job.id, step: 'script', progress: 10 });
    var kb = await A3B_API.genScript(job.nhanVat, job.noiDung, style, mood);
    if (kb.detail || !kb.scenes) throw new Error(kb.detail?.[0]?.msg || 'Gen kịch bản thất bại');

    // 2. Tạo ảnh song song
    report('STEP', { jobId: job.id, step: 'img', progress: 30 });
    var imgs = await Promise.all(kb.scenes.map(async function(scene) {
      var res = await A3B_API.createImage(scene.imagePrompt);
      if (!res.taskid) throw new Error('Không có taskid ảnh');
      return A3B_API.pollImage(res.taskid);
    }));

    // 3. Tạo video song song
    report('STEP', { jobId: job.id, step: 'vid', progress: 60 });
    var vids = await Promise.all(kb.scenes.map(async function(scene, i) {
      var img = imgs[i];
      if (!img) return null;
      var res = await A3B_API.createVideo(
        img.imageUrl || img.image_url,
        img.mediaId,
        scene.motionPrompt
      );
      if (!res.task_id) throw new Error('Không có task_id video');
      return A3B_API.pollVideo(res.task_id);
    }));

    var videos = vids.map(function(v) {
      return v ? (v.video_url || v.url || null) : null;
    }).filter(Boolean);

    // Tải về
    videos.forEach(function(url, i) {
      setTimeout(function() {
        download(url, 'w' + (myWid+1) + '_j' + (job.id+1) + '_s' + (i+1) + '.mp4');
      }, i * 600);
    });

    return { topicTitle: kb.topicTitle, videos: videos };
  }

  function init() {
    var token = localStorage.getItem('3big_session');
    if (!token) return;

    ch = new BroadcastChannel(CH_NAME);

    // Badge nhỏ góc màn hình
    var badge = document.createElement('div');
    badge.id = 'a3b-worker-badge';
    badge.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:9999999;background:#141414;border:1px solid #f5c842;border-radius:8px;padding:8px 12px;font-family:system-ui;font-size:11px;color:#f5c842;display:flex;align-items:center;gap:6px;box-shadow:0 4px 16px #000a';
    badge.innerHTML = '<div id="a3b-wdot" style="width:7px;height:7px;border-radius:50%;background:#f5c842;animation:a3wpulse 1s infinite"></div><span id="a3b-wtxt">⚙ Worker — Kết nối...</span>';
    var st = document.createElement('style');
    st.textContent = '@keyframes a3wpulse{0%,100%{opacity:1}50%{opacity:.3}}';
    document.head.appendChild(st);
    document.body.appendChild(badge);

    function setBadge(txt, color) {
      var t = document.getElementById('a3b-wtxt');
      var d = document.getElementById('a3b-wdot');
      if (t) t.textContent = txt;
      if (d && color) { d.style.background = color; badge.style.borderColor = color; }
    }

    // Tạo tab ID ngẫu nhiên
    window.__a3bTabId = Math.random().toString(36).slice(2, 8);
    window.__a3bStamp = Date.now(); // Timestamp để manager biết tab nào mới

    // Báo manager online — retry mỗi 2 giây, tối đa 30 giây
    var onlineRetry = 0;
    var onlineInterval = setInterval(function() {
      if (myWid !== null) { clearInterval(onlineInterval); return; }
      if (onlineRetry++ > 15) { clearInterval(onlineInterval); return; } // Dừng sau 30 giây
      ch.postMessage({ type: 'WORKER_ONLINE', tabId: window.__a3bTabId, stamp: window.__a3bStamp });
    }, 2000);
    setTimeout(function() {
      ch.postMessage({ type: 'WORKER_ONLINE', tabId: window.__a3bTabId, stamp: window.__a3bStamp });
    }, 500);

    ch.onmessage = async function(e) {
      var msg = e.data;
      if (!msg || !msg.type) return;

      // Được assign workerId
      if (msg.type === 'ASSIGN' && msg.tabId === window.__a3bTabId) {
        myWid = msg.wid;
        setBadge('✓ Worker ' + (myWid + 1) + ' — Sẵn sàng', '#5DCAA5');
        ch.postMessage({ type: 'READY', wid: myWid });

        // Báo quota
        try {
          var q = await A3B_API.quota();
          ch.postMessage({ type: 'QUOTA', wid: myWid, remaining: q.remaining, limit: q.daily_limit });
        } catch(e) {}
      }

      // Nhận lệnh chạy
      if (msg.type === 'RUN' && msg.wid === myWid) {
        running = true;
        var jobs = msg.jobs || [];
        var style = msg.style || '3D Pixar Cute';
        var mood  = msg.mood  || 'Hau dau & Hai huoc';

        for (var i = 0; i < jobs.length; i++) {
          if (!running) break;
          var job = jobs[i];
          setBadge('▶ Worker ' + (myWid+1) + ' — Job ' + (i+1) + '/' + jobs.length, '#f5c842');

          try {
            var result = await runJob(job, style, mood);
            report('JOB_DONE', { jobId: job.id, topicTitle: result.topicTitle, videos: result.videos });
          } catch(err) {
            report('JOB_ERR', { jobId: job.id, errorMsg: err.message });
          }

          if (i < jobs.length - 1 && running) await A3B_API.sleep(3000);
        }

        setBadge('✓ Worker ' + (myWid+1) + ' — Xong!', '#5DCAA5');
        report('ALL_DONE', {});
      }

      if (msg.type === 'STOP') running = false;
    };
  }

  return { init: init };

})();

// Tự khởi động sau khi page load
if (document.readyState === 'complete') {
  setTimeout(A3B_WORKER.init, 1500);
} else {
  window.addEventListener('load', function() { setTimeout(A3B_WORKER.init, 1500); });
}
