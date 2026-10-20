/**
 * deadline.js — 有效期过期降级（全站唯一 JS，REQ-DL-002/003/005）
 * today > data-deadline：加 .is-expired、移除限时徽章、文案改为"活动时间
 * 可能已结束，可点击查看最新情况"；CTA 不动。无 JS 或失败时静态文案停留。
 */
(function () {
  try {
    var n = new Date();
    var today = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
    var nodes = document.querySelectorAll('[data-deadline]');
    for (var i = 0; i < nodes.length; i++) {
      if (today > nodes[i].getAttribute('data-deadline')) {
        nodes[i].classList.add('is-expired');
        var badge = nodes[i].querySelector('.badge-limited');
        if (badge) badge.remove();
        var text = nodes[i].querySelector('.deadline-text');
        if (text) text.textContent = '活动时间可能已结束，可点击查看最新情况';
      }
    }
  } catch (e) { /* 静默：停留静态文案 */ }
})();
