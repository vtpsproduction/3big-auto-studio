// ═══════════════════════════════════════
// api.js — 3BIG API calls
// ═══════════════════════════════════════

var A3B_API = (function() {

  function token() { return localStorage.getItem('3big_session'); }
  function user()  { return localStorage.getItem('3big_user'); }

  function call(path, method, body) {
    var opts = {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() }
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch('https://3big.online' + path, opts).then(function(r) { return r.json(); });
  }

  function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  function quota() {
    return call('/api/admin/quota/' + user());
  }

  function genScript(nhanVat, noiDung, style, mood) {
    return call('/api/secure/xai/character-script', 'POST', {
      category: 'Meo Vat Cuoc Song',
      objectToPersonify: nhanVat,
      tipContent: noiDung,
      mood: mood || 'Hau dau & Hai huoc',
      language: 'vi',
      artStyle: style || '3D Pixar Cute',
      storyModeType: 'image_to_video'
    });
  }

  function createImage(prompt) {
    return call('/api/nano', 'POST', {
      prompt: prompt,
      aspect_ratio: '9:16',
      session_id: user()
    });
  }

  function pollImage(taskid) {
    return new Promise(function(resolve, reject) {
      var tries = 0;
      function check() {
        if (tries++ > 40) return reject(new Error('Timeout tạo ảnh'));
        call('/api/nano/status/' + taskid).then(function(d) {
          if (d.imageUrl || d.image_url || d.status === 'completed') return resolve(d);
          if (d.status === 'failed') return reject(new Error('Tạo ảnh thất bại'));
          setTimeout(check, 3000);
        }).catch(reject);
      }
      setTimeout(check, 3000);
    });
  }

  function createVideo(imageUrl, mediaId, motionPrompt) {
    return call('/api/veo3/start-video', 'POST', {
      prompt: motionPrompt,
      ratio: '9:16',
      session_id: user(),
      media_id: mediaId || '',
      aspect_ratio: '9:16',
      image_url: imageUrl
    });
  }

  function pollVideo(taskId) {
    return new Promise(function(resolve, reject) {
      var tries = 0;
      function check() {
        if (tries++ > 60) return reject(new Error('Timeout tạo video'));
        call('/api/veo3/video-status/' + taskId + '?session_id=' + user()).then(function(d) {
          if (d.video_url || d.status === 'completed') return resolve(d);
          if (d.status === 'failed') return reject(new Error('Tạo video thất bại'));
          setTimeout(check, 5000);
        }).catch(reject);
      }
      setTimeout(check, 5000);
    });
  }

  return { call, sleep, quota, genScript, createImage, pollImage, createVideo, pollVideo, user };

})();
