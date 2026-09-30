function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderMarkdown(text) {
  let html = escapeHtml(text || '');
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  html = html.replace(/^---$/gm, '<hr />');
  html = html.replace(/^• (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/\n/g, '<br />');
  html = html.replace(/<br \/>(\s*)<(ul|h3|h4|hr)/g, '<$2');
  html = html.replace(/<\/(ul|h3|h4)><br \/>/g, '</$1>');
  return html;
}
