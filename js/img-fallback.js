// Retire les icônes qui ne se chargent pas (remplace l'attribut onerror inline, interdit par la CSP)
document.addEventListener('error', function (e) {
  var t = e.target;
  if (t && t.tagName === 'IMG' && t.hasAttribute('data-remove-on-error')) t.remove();
}, true);
