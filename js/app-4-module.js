
/* Comptes : Firebase Authentication (e-mail + mot de passe, Google). Les clés ci-dessous sont publiques. */
(async function () {
  try {
    var base = 'https://www.gstatic.com/firebasejs/11.0.2/';
    var A = await import(base + 'firebase-app.js');
    var U = await import(base + 'firebase-auth.js');
    var app = A.initializeApp({
      apiKey: "AIzaSyBMLpHz3JBPI1_RFYXcl4PdHhE10FB_v8Q",
      authDomain: "anything2gether-9be31.firebaseapp.com",
      projectId: "anything2gether-9be31",
      storageBucket: "anything2gether-9be31.firebasestorage.app",
      messagingSenderId: "904544548153",
      appId: "1:904544548153:web:9d38f5cee9b80af31de4e8"
    });
    var auth = U.getAuth(app);
    auth.languageCode = 'fr';
    function pub(u) {
      var o = u ? { uid: u.uid, name: u.displayName || (u.email || '').split('@')[0], email: u.email || '' } : null;
      window.__a2gUser = o;
      window.dispatchEvent(new CustomEvent('a2g-user', { detail: o }));
    }
    U.onAuthStateChanged(auth, pub);
    U.getRedirectResult(auth).catch(function () {});
    window.a2gAuth = {
      signIn: function (em, pw) { return U.signInWithEmailAndPassword(auth, em, pw); },
      signUp: function (em, pw, name) {
        return U.createUserWithEmailAndPassword(auth, em, pw).then(function (c) {
          return U.updateProfile(c.user, { displayName: String(name || '').slice(0, 20) }).then(function () { pub(auth.currentUser); });
        });
      },
      google: function () {
        var p = new U.GoogleAuthProvider();
        return U.signInWithPopup(auth, p).catch(function (e) {
          if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) return U.signInWithRedirect(auth, p);
          throw e;
        });
      },
      reset: function (em) { return U.sendPasswordResetEmail(auth, em); },
      out: function () { return U.signOut(auth); }
    };
  } catch (e) { console.error('[comptes]', e); }
})();
