import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  writeBatch,
  increment,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
  firebaseConfig,
  ADMIN_UID,
  NOMBRE,
  AUTOR,
  S,
  PTS,
  PR,
  MC,
  MB,
  MP,
  WHATSAPP,
  RECAPTCHA_KEY,
  CANCEL_HS,
} from "./config.js";

const app = initializeApp(firebaseConfig),
  auth = getAuth(app),
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
if (RECAPTCHA_KEY) {
  const ac =
    await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check.js");
  ac.initializeAppCheck(app, {
    provider: new ac.ReCaptchaV3Provider(RECAPTCHA_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
window.addEventListener("offline", () =>
  M({
    k: "w",
    h: "Sin conexión",
    b: "Mientras no tengas internet no vas a poder reservar ni cancelar. Podés seguir viendo tus datos.",
  }),
);
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const $$ = (n) => "$" + n.toLocaleString("es-AR");

/* ====== Loader, ventanas modales y contraseña segura ====== */
let bt,
  boot = 0,
  pnd = 0,
  ready = 0,
  mf = null,
  mr = null;
const PW_MIN = 6,
  COMUN = [
    "123456",
    "1234567",
    "12345678",
    "123456789",
    "password",
    "contraseña",
    "qwerty",
    "abc123",
    "111111",
    "admin123",
  ];
const LT = {
  entrar: "Ingresando…",
  registro: "Creando tu cuenta…",
  book: "Reservando tu turno…",
  cancel: "Cancelando turno…",
  done: "Guardando el cobro…",
  redeemGo: "Canjeando tu premio…",
  used: "Marcando como usado…",
  olvide: "Enviando email…",
  reenviar: "Enviando email…",
  recheck: "Verificando…",
  cfgGuardar: "Guardando horarios…",
};
const busy = (on, t, soft) => {
  const l = $("#ld");
  clearTimeout(bt);
  l.className = on ? (soft ? "soft" : "") : "off";
  if (on) {
    $("#ldt").textContent = t || "Cargando…";
    bt = setTimeout(() => busy(0), 15000); // red de seguridad
  }
};
bt = setTimeout(() => busy(0), 15000); // si algo falla, el loader inicial no queda para siempre
const wait = async (t, fn) => {
  if (!navigator.onLine)
    return M({
      k: "w",
      h: "Sin conexión",
      b: "Necesitás internet para esta acción. Probá de nuevo cuando vuelva la conexión.",
    });
  busy(1, t, 1);
  try {
    await fn();
  } finally {
    busy(0);
  }
};
const pwRules = (p, em = "") => {
  const u = em.split("@")[0].toLowerCase();
  return [
    ["Mínimo " + PW_MIN + " caracteres", p.length >= PW_MIN],
    ["Una letra mayúscula", /\p{Lu}/u.test(p)],
    ["Una letra minúscula", /\p{Ll}/u.test(p)],
    ["Un número", /\d/.test(p)],
    ["Un carácter especial (! @ # $ % & *…)", /[^\p{L}\p{N}\s]/u.test(p)],
    ["Sin espacios", p !== "" && !/\s/.test(p)],
    [
      "No ser común ni incluir tu email",
      p !== "" &&
        !COMUN.includes(p.toLowerCase()) &&
        !(u.length >= 3 && p.toLowerCase().includes(u)),
    ],
  ];
};
const pwHtml = (p, em) =>
  pwRules(p, em)
    .map((r) => `<li class="${r[1] ? "y" : ""}">${r[0]}</li>`)
    .join("");
const pwLive = () => {
  const l = $("#pwl");
  if (l) l.innerHTML = pwHtml($("#pw").value, $("#em").value);
};
// k: w = advertencia, x = error, q = pregunta, ok = éxito
const M = (o) => {
  mf = o.fn || null;
  mr = document.activeElement;
  const k = o.k || "w",
    m = $("#mo");
  m.innerHTML = `<div class="mb" role="alertdialog" aria-modal="true" aria-labelledby="mh"><div class="pole"></div><div class="mi ${k}">${{ w: "!", x: "✕", q: "?", ok: "✓" }[k]}</div><h2 id="mh">${o.h}</h2><div class="mt">${o.b || ""}</div><div class="chips"><button class="main" id="mok" onclick="Mok()">${o.ok || "Entendido"}</button>${o.no ? `<button onclick="Mx()">${o.no}</button>` : ""}</div></div>`;
  m.hidden = false;
  busy(0);
  $("#mok").focus();
};
const Mx = () => {
  $("#mo").hidden = true;
  mf = null;
  mr && mr.focus && mr.focus();
};
const Mok = () => {
  const f = mf;
  Mx();
  f && f();
};
let me = null,
  U = null,
  T = [],
  C = [],
  OC = {},
  us = [],
  ou = null,
  view = "home",
  msg = "",
  tab = "in",
  cf = -1,
  sel = { s: 0, d: "", t: "" };
const isAdm = () => me && me.uid === ADMIN_UID;
let H = [],
  CU = [],
  per = "mes";
const CFD = {
  a: 540,
  c: 1020,
  dias: [1, 2, 3, 4, 5, 6],
  libres: [],
  al: 0,
  ah: 0,
}; // horario por defecto
let UA = [],
  CF = { ...CFD },
  cd = null,
  ag = new Date().toLocaleDateString("en-CA"); // dashboard: cortes hechos, canjes usados, período
let CA = [],
  cx = null,
  cr = "",
  cn = "",
  dn = null,
  dm = "",
  dp = "Efectivo"; // cancelados + formularios de cancelar / cobrar
const days = () => {
  const o = [];
  for (let i = 0; o.length < 6 && i < 120; i++) {
    const x = new Date();
    x.setDate(x.getDate() + i);
    const k = x.toLocaleDateString("en-CA");
    if (CF.dias.includes(x.getDay()) && !CF.libres.includes(k)) o.push(k);
  }
  return o;
};
const fd = (d) =>
  new Date(d + "T12:00").toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
const hm = (m) =>
  String((m / 60) | 0).padStart(2, "0") + ":" + (m % 60 ? "30" : "00");
const blocks = (t, dur) => {
  const [a, b] = t.split(":"),
    s = +a * 60 + +b,
    o = [];
  for (let m = s; m < s + dur; m += 30) o.push(hm(m));
  return o;
};
function slots() {
  const dur = S[sel.s].m,
    n = new Date(),
    hoy = n.toLocaleDateString("en-CA") === sel.d,
    o = [];
  for (let m = CF.a; m + dur <= CF.c; m += 30) {
    if (CF.al && m < CF.ah && m + dur > CF.al) continue;
    if (hoy && m <= n.getHours() * 60 + n.getMinutes()) continue;
    if (blocks(hm(m), dur).some((t) => OC[t])) continue;
    o.push(hm(m));
  }
  return o;
}
const ERR = {
  "auth/invalid-credential": "Email o contraseña incorrectos.",
  "auth/email-already-in-use": "Ese email ya tiene una cuenta.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/invalid-email": "El email no es válido.",
  "permission-denied": "No tenés permiso para esa acción.",
  "auth/network-request-failed":
    "Sin conexión. Revisá tu internet e intentá de nuevo.",
  "auth/too-many-requests":
    "Demasiados intentos. Esperá unos minutos e intentá de nuevo.",
  unavailable: "Sin conexión con el servidor. Intentá de nuevo en un momento.",
};
const err = (e) => {
  if (!me && e.code === "permission-denied") return;
  const w = [
    "auth/invalid-credential",
    "auth/email-already-in-use",
    "auth/invalid-email",
    "auth/weak-password",
  ].includes(e.code);
  M({
    k: w ? "w" : "x",
    h: w ? "Revisá los datos" : "No se pudo completar",
    b: esc(ERR[e.code] || "Ocurrió un error. Intentá de nuevo."),
  });
};
function unsub() {
  us.forEach((f) => f());
  us = [];
  ou && ou();
  ou = null;
  U = null;
  CA = [];
  cx = null;
  dn = null;
  T = [];
  C = [];
  OC = {};
  UA = [];
  cd = null;
}
function occ() {
  ou && ou();
  OC = {};
  ou = onSnapshot(
    query(collection(db, "ocupados"), where("d", "==", sel.d)),
    (s) => {
      OC = {};
      s.forEach((x) => (OC[x.data().t] = 1));
      R();
    },
    err,
  );
}
onAuthStateChanged(auth, (a) => {
  ready = 1;
  unsub();
  me = a;
  view = isAdm() ? "bar" : "home";
  H = [];
  CU = [];
  CA = [];
  if (a) {
    const id = a.uid,
      ad = isAdm();
    sel.d = days()[0] || "";
    us.push(
      onSnapshot(
        doc(db, "users", id),
        (s) => {
          U = s.exists() ? s.data() : null;
          R();
        },
        err,
      ),
    );
    us.push(
      onSnapshot(
        query(
          collection(db, "turnos"),
          ad ? where("st", "==", "pend") : where("uid", "==", id),
        ),
        (s) => {
          T = s.docs.map((d) => ({ id: d.id, ...d.data() }));
          R();
        },
        err,
      ),
    );
    us.push(
      onSnapshot(
        query(
          collection(db, "canjes"),
          ad ? where("used", "==", false) : where("uid", "==", id),
        ),
        (s) => {
          C = s.docs.map((d) => ({ id: d.id, ...d.data() }));
          R();
        },
        err,
      ),
    );
    if (ad) {
      us.push(
        onSnapshot(
          query(collection(db, "turnos"), where("st", "==", "hecho")),
          (s) => {
            H = s.docs.map((d) => ({ id: d.id, ...d.data() }));
            R();
          },
          err,
        ),
      );
      us.push(
        onSnapshot(
          query(collection(db, "canjes"), where("used", "==", true)),
          (s) => {
            CU = s.docs.map((d) => ({ id: d.id, ...d.data() }));
            R();
          },
          err,
        ),
      );
    }
    if (ad)
      us.push(
        onSnapshot(
          query(collection(db, "turnos"), where("st", "==", "cancel")),
          (s) => {
            CA = s.docs.map((d) => ({ id: d.id, ...d.data() }));
            R();
          },
          err,
        ),
      );
    us.push(
      onSnapshot(
        doc(db, "config", "horario"),
        (s) => {
          CF = s.exists() ? { ...CFD, ...s.data() } : { ...CFD };
          if (!days().includes(sel.d)) {
            sel.d = days()[0] || "";
            sel.t = "";
            occ();
          }
          R();
        },
        () => {},
      ),
    );
    if (ad)
      us.push(
        onSnapshot(
          collection(db, "users"),
          (s) => {
            UA = s.docs.map((d) => ({ id: d.id, ...d.data() }));
            R();
          },
          err,
        ),
      );
    occ();
  }
  R();
});

const W = {
  ver() {
    const t = $("#pw").type === "password" ? "text" : "password";
    ["#pw", "#pw2"].forEach((s) => {
      const e = $(s);
      if (e) e.type = t;
    });
    $("#eye").textContent = t === "text" ? "Ocultar" : "Ver";
  },
  async olvide() {
    const em = $("#em").value.trim();
    if (!em)
      return M({
        k: "w",
        h: "Falta tu email",
        b: "Escribí tu email arriba y volvé a tocar “¿Olvidaste tu contraseña?”.",
      });
    try {
      await sendPasswordResetEmail(auth, em);
    } catch (e) {
      if (
        [
          "auth/invalid-email",
          "auth/network-request-failed",
          "auth/too-many-requests",
        ].includes(e.code)
      )
        return err(e);
    }
    M({
      k: "ok",
      h: "Revisá tu email",
      b: "Si ese email tiene una cuenta, te enviamos un link para crear una contraseña nueva. Mirá también en spam.",
    });
  },
  async reenviar() {
    try {
      await sendEmailVerification(me);
      M({
        k: "ok",
        h: "Email enviado",
        b: "Abrí el link que te mandamos y después tocá “Ya verifiqué”.",
      });
    } catch (e) {
      err(e);
    }
  },
  async recheck() {
    try {
      await me.reload();
      await me.getIdToken(true);
    } catch (e) {
      return err(e);
    }
    R();
    if (!me.emailVerified)
      M({
        k: "w",
        h: "Todavía no está verificado",
        b: "Abrí el link del email que te enviamos y volvé a probar.",
      });
  },
  setAg(d) {
    ag = d;
    R();
  },
  cfgSet(k, v) {
    cd[k] = +v;
    R();
  },
  cfgDia(i) {
    const s = new Set(cd.dias);
    s.has(i) ? s.delete(i) : s.add(i);
    cd.dias = [...s].sort();
    R();
  },
  cfgLibre() {
    const v = $("#lb").value;
    if (!v || cd.libres.includes(v)) return;
    cd.libres = [...cd.libres, v].sort();
    R();
  },
  cfgQuitar(d) {
    cd.libres = cd.libres.filter((x) => x !== d);
    R();
  },
  async cfgGuardar() {
    const c = cd;
    if (
      !c.dias.length ||
      c.a >= c.c ||
      (c.al && (c.al >= c.ah || c.al < c.a || c.ah > c.c))
    )
      return M({
        k: "w",
        h: "Revisá los horarios",
        b: "Elegí al menos un día, que la apertura sea antes del cierre y que la pausa quede dentro del horario.",
      });
    try {
      await setDoc(doc(db, "config", "horario"), c);
      msg = "Horarios guardados. Ya se aplican a las reservas nuevas.";
      R();
    } catch (e) {
      err(e);
    }
  },
  go(v) {
    if (v === view) return W.goNow(v);
    busy(1, "Cargando…", 1);
    setTimeout(() => {
      W.goNow(v);
      busy(0);
    }, 350);
  },
  goNow(v) {
    view = v;
    if (v === "cfg") cd = { ...CF, dias: [...CF.dias], libres: [...CF.libres] };
    cf = -1;
    cx = null;
    dn = null;
    R();
  },
  setTab(t) {
    tab = t;
    R();
  },
  async entrar() {
    if (!$("#em").value.trim() || !$("#pw").value)
      return M({
        k: "w",
        h: "Faltan datos",
        b: "Ingresá tu email y tu contraseña para continuar.",
      });
    try {
      await signInWithEmailAndPassword(
        auth,
        $("#em").value.trim(),
        $("#pw").value,
      );
    } catch (e) {
      err(e);
    }
  },
  async registro() {
    const nm = $("#nm").value.trim(),
      ph = $("#ph").value.replace(/\D/g, "");
    if (nm.length < 2 || nm.length > 40 || ph.length < 8 || ph.length > 15) {
      return M({
        k: "w",
        h: "Revisá tus datos",
        b: "Completá tu nombre (2 a 40 letras) y un teléfono válido, solo con números.",
      });
    }
    if ($("#pw").value !== $("#pw2").value)
      return M({
        k: "w",
        h: "Las contraseñas no coinciden",
        b: "Escribí la misma contraseña en los dos campos.",
      });
    const bad = pwRules($("#pw").value, $("#em").value).some((r) => !r[1]);
    if (bad)
      return M({
        k: "w",
        h: "Contraseña poco segura",
        b: `<p>Tu contraseña tiene que cumplir todo esto:</p><ul class="pwl">${pwHtml($("#pw").value, $("#em").value)}</ul>`,
        ok: "Corregir",
      });
    try {
      const c = await createUserWithEmailAndPassword(
        auth,
        $("#em").value.trim(),
        $("#pw").value,
      );
      await setDoc(doc(db, "users", c.user.uid), {
        nm: nm,
        ph: ph,
        pt: 0,
      });
      sendEmailVerification(c.user).catch(() => {});
      M({
        k: "ok",
        h: "¡Cuenta creada!",
        b: "Te enviamos un email para verificar tu cuenta. Lo necesitás para reservar turnos.",
      });
    } catch (e) {
      if (e.code === "auth/email-already-in-use")
        return M({
          k: "w",
          h: "Ese email ya tiene cuenta",
          b: "Ingresá con ese email. Si no recordás la contraseña, usá “¿Olvidaste tu contraseña?”.",
          ok: "Ir a ingresar",
          no: "Cerrar",
          fn: () => W.setTab("in"),
        });
      if (auth.currentUser) await auth.currentUser.delete().catch(() => {}); // evita cuentas sin perfil si falló a mitad de camino
      err(e);
    }
  },
  salir() {
    M({
      k: "q",
      h: "¿Cerrar sesión?",
      b: "Vas a tener que ingresar de nuevo para ver tus turnos.",
      ok: "Cerrar sesión",
      no: "Quedarme",
      fn: () => signOut(auth),
    });
  },
  setDay(d) {
    sel.d = d;
    sel.t = "";
    occ();
    R();
  },
  async askBook() {
    if (!isAdm() && !me.emailVerified) {
      busy(1, "Verificando…", 1);
      try {
        await me.reload();
        if (me.emailVerified) {
          await me.getIdToken(true);
          R();
        }
      } catch (_) {}
      busy(0);
    }
    if (!isAdm() && !me.emailVerified)
      return M({
        k: "w",
        h: "Verificá tu email",
        b: "Para reservar tenés que verificar tu email. Revisá tu bandeja de entrada (y spam).",
        ok: "Reenviar email",
        no: "Cerrar",
        fn: () => W.reenviar(),
      });
    const s = S[sel.s];
    M({
      k: "q",
      h: "¿Confirmar tu turno?",
      b: `<div class="line"><span>Servicio</span><b>${esc(s.n)}</b></div><div class="line"><span>Día</span><b>${fd(sel.d)}</b></div><div class="line"><span>Hora</span><b>${sel.t}</b></div><div class="line"><span>Precio</span><b>${$$(s.p)}</b></div>`,
      ok: "Confirmar turno",
      no: "Volver",
      fn: () => W.book(),
    });
  },
  async book() {
    const dur = S[sel.s].m,
      bl = blocks(sel.t, dur);
    if (bl.some((t) => OC[t])) {
      sel.t = "";
      R();
      return M({
        k: "w",
        h: "Horario ocupado",
        b: "Alguien reservó ese horario recién. Elegí otro.",
      });
    }
    const b = writeBatch(db),
      r = doc(collection(db, "turnos")),
      ids = bl.map((t) => sel.d + "_" + t.replace(":", ""));
    b.set(r, {
      uid: me.uid,
      nm: U.nm,
      s: sel.s,
      d: sel.d,
      t: sel.t,
      st: "pend",
      bl: ids,
    });
    ids.forEach((x, i) =>
      b.set(doc(db, "ocupados", x), { uid: me.uid, d: sel.d, t: bl[i] }),
    );
    try {
      await b.commit();
      const wa =
        WHATSAPP &&
        "https://wa.me/" +
          WHATSAPP +
          "?text=" +
          encodeURIComponent(
            `Hola, soy ${U.nm}. Reservé ${S[sel.s].n} para el ${fd(sel.d)} a las ${sel.t}.`,
          );
      sel.t = "";
      W.goNow("tur");
      M({
        k: "ok",
        h: "Turno reservado",
        b:
          "Te esperamos. Sumás " + PTS + " puntos cuando se complete el corte.",
        ok: wa ? "Avisar por WhatsApp" : "Listo",
        no: wa ? "Cerrar" : "",
        fn: wa ? () => open(wa, "_blank", "noopener") : null,
      });
    } catch (e) {
      if (e.code === "permission-denied") {
        sel.t = "";
        R();
        return M({
          k: "w",
          h: "No se pudo reservar",
          b: "Ese horario se acaba de ocupar o tu email todavía no figura como verificado. Elegí otro horario e intentá de nuevo.",
        });
      }
      err(e);
    }
  },
  askCancel(id) {
    const t0 = T.find((x) => x.id === id);
    if (
      t0 &&
      !isAdm() &&
      new Date(t0.d + "T" + t0.t) - Date.now() < CANCEL_HS * 36e5
    ) {
      const wa =
        WHATSAPP &&
        "https://wa.me/" +
          WHATSAPP +
          "?text=" +
          encodeURIComponent(
            `Hola, soy ${U.nm}. Necesito cancelar mi turno del ${fd(t0.d)} a las ${t0.t}.`,
          );
      return M({
        k: "w",
        h: "Ya no podés cancelar online",
        b: `Faltan menos de ${CANCEL_HS} horas para tu turno. Escribile a la barbería para avisar.`,
        ok: wa ? "Escribir por WhatsApp" : "Entendido",
        no: wa ? "Cerrar" : "",
        fn: wa ? () => open(wa, "_blank", "noopener") : null,
      });
    }
    cx = id;
    cr = "";
    cn = "";
    dn = null;
    R();
  },
  askDone(id) {
    const t = T.find((x) => x.id === id);
    if (!t) return;
    dn = id;
    dm = String(S[t.s].p);
    dp = MP[0];
    cx = null;
    R();
  },
  closeX() {
    cx = null;
    dn = null;
    R();
  },
  setMot(i) {
    cr = (isAdm() ? MB : MC)[i];
    R();
  },
  setCn(el) {
    cn = el.value.slice(0, 80);
  },
  setDm(el) {
    dm = el.value.replace(/\D/g, "").slice(0, 8);
    el.value = dm;
  },
  setDmv(n) {
    dm = String(n);
    R();
  },
  setDp(p) {
    dp = p;
    R();
  },
  async cancel(id) {
    const t = T.find((x) => x.id === id);
    if (!t) return;
    if (!cr) {
      return M({
        k: "w",
        h: "Falta el motivo",
        b: "Elegí un motivo para cancelar el turno.",
      });
    }
    const adm = isAdm(),
      mot = (cr === "Otro motivo" && cn.trim() ? cn.trim() : cr).slice(0, 80),
      b = writeBatch(db);
    b.update(doc(db, "turnos", id), {
      st: "cancel",
      mot: mot,
      por: adm ? "bar" : "cli",
      canEn: Date.now(),
    });
    t.bl.forEach((x) => b.delete(doc(db, "ocupados", x)));
    try {
      await b.commit();
      cx = null;
      msg = "Turno cancelado. El horario quedó libre.";
      R();
    } catch (e) {
      err(e);
    }
  },
  async done(id) {
    const t = T.find((x) => x.id === id);
    if (!t || !isAdm()) return;
    if (dm === "") {
      return M({
        k: "w",
        h: "Falta el monto",
        b: "Ingresá el monto cobrado (0 si fue gratis).",
      });
    }
    const monto = parseInt(dm, 10),
      b = writeBatch(db);
    b.update(doc(db, "turnos", id), {
      st: "hecho",
      precio: monto,
      lista: S[t.s].p,
      serv: S[t.s].n,
      medio: dp,
      hechoEn: Date.now(),
    });
    b.update(doc(db, "users", t.uid), { pt: increment(PTS) });
    try {
      await b.commit();
      dn = null;
      msg =
        "Corte cobrado " +
        $$(monto) +
        " (" +
        dp +
        ") · +" +
        PTS +
        " puntos para " +
        t.nm;
      R();
    } catch (e) {
      err(e);
    }
  },
  redeem(i) {
    const p = PR[i];
    if (U.pt < p.p) return;
    M({
      k: "q",
      h: "¿Canjear este premio?",
      b: `<p><b>${esc(p.n)}</b> por ${p.p} puntos.<br>Te van a quedar ${U.pt - p.p} puntos.</p>`,
      ok: "Canjear",
      no: "Volver",
      fn: () => W.redeemGo(i),
    });
  },
  async redeemGo(i) {
    const p = PR[i];
    if (U.pt < p.p) return;
    const b = writeBatch(db),
      c = crypto
        .getRandomValues(new Uint32Array(1))[0]
        .toString(36)
        .slice(0, 5)
        .toUpperCase();
    b.set(doc(collection(db, "canjes")), {
      uid: me.uid,
      nm: U.nm,
      pr: p.n,
      cost: p.p,
      c: c,
      used: false,
    });
    b.update(doc(db, "users", me.uid), { pt: increment(-p.p) });
    try {
      await b.commit();
      cf = -1;
      msg = "Canje listo ✅ Mostrale el código al barbero.";
      R();
    } catch (e) {
      err(e);
    }
  },
  setPer(p) {
    per = p;
    R();
  },
  exportar() {
    const f = rng(),
      L = H.filter((t) => f(t.d)).sort((a, b) =>
        (a.d + a.t).localeCompare(b.d + b.t),
      ),
      q = (v) => {
        let s = String(v);
        if (/^[=+\-@]/.test(s)) s = "'" + s; // evita fórmulas maliciosas en Excel
        return '"' + s.replace(/"/g, '""') + '"';
      },
      csv =
        "Fecha,Hora,Cliente,Servicio,Precio cobrado,Precio de lista,Medio de pago\n" +
        L.map((t) =>
          [
            t.d,
            t.t,
            t.nm,
            t.serv || S[t.s].n,
            t.precio || 0,
            t.lista ?? "",
            t.medio || "",
          ]
            .map(q)
            .join(","),
        ).join("\n"),
      a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    a.download = "cortes-" + per + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  },
  askUsed(id) {
    M({
      k: "q",
      h: "¿Marcar como usado?",
      b: "Esta acción no se puede deshacer. El código deja de ser válido.",
      ok: "Marcar usado",
      no: "Volver",
      fn: () => W.used(id),
    });
  },
  async used(id) {
    try {
      await writeBatch(db)
        .update(doc(db, "canjes", id), { used: true })
        .commit();
    } catch (e) {
      err(e);
    }
  },
};
Object.keys(LT).forEach((k) => {
  const f = W[k];
  W[k] = (...a) => wait(LT[k], () => f(...a));
});
Object.assign(window, W, { Mok, Mx, pwLive });

const ST = {
  pend: "Pendiente",
  hecho: "Completado",
  cancel: "Cancelado",
};
const lines = () =>
  S.map(
    (s) =>
      `<div class="line"><span><b>${s.n}</b> <small>${s.m} min</small></span><span class="price">${$$(s.p)}</span></div>`,
  ).join("");
function authH() {
  const up = tab === "up";
  return `<div class="auth"><div class="hero"><div class="pole"></div><h1>Tu corte, a tu hora.</h1><p>Reservá online y sumá puntos en cada visita para canjear descuentos y cortes gratis.</p><h3>Servicios y precios</h3>${lines()}</div>
<div class="card"><div class="tabs"><button class="${up ? "" : "on"}" onclick="setTab('in')">Ingresar</button><button class="${up ? "on" : ""}" onclick="setTab('up')">Crear cuenta</button></div>
${up ? `<input id="nm" placeholder="Tu nombre" maxlength="40" autocomplete="name"><input id="ph" placeholder="Tu teléfono" inputmode="numeric" maxlength="20" autocomplete="tel">` : ""}
<input id="em" type="email" placeholder="Email" autocomplete="email"><div class="pww"><input id="pw" type="password" placeholder="Contraseña" ${up ? 'oninput="pwLive()"' : ""} autocomplete="${up ? "new-password" : "current-password"}"><button id="eye" type="button" class="eye" onclick="ver()">Ver</button></div>${up ? `<ul id="pwl" class="pwl">${pwHtml("", "")}</ul>` : ""}${up ? `<input id="pw2" type="password" placeholder="Repetí la contraseña" autocomplete="new-password">` : `<button class="lnk" type="button" onclick="olvide()">¿Olvidaste tu contraseña?</button>`}
<button class="main" style="margin-top:4px" onclick="${up ? "registro" : "entrar"}()">${up ? "Crear cuenta" : "Ingresar"}</button></div></div>`;
}
const vn = () =>
  me.emailVerified
    ? ""
    : `<div class="msg"><b>Verificá tu email</b> para poder reservar turnos. Te enviamos un link a ${esc(me.email)}.<div class="chips" style="margin-top:10px"><button onclick="reenviar()">Reenviar email</button><button onclick="recheck()">Ya verifiqué</button></div></div>`;
function homeH() {
  const nx = PR.find((p) => p.p > U.pt),
    pct = nx ? Math.min(100, (U.pt / nx.p) * 100) : 100,
    mine = C.filter((c) => !c.used);
  return (
    `${vn()}<div class="grid"><div class="side"><small>Hola,</small><h1>${esc(U.nm)}</h1><div class="pts"><small>TUS PUNTOS</small><b class="big">${U.pt}</b><div class="bar"><i style="width:${pct}%"></i></div>
<p>${nx ? `Te faltan <b>${nx.p - U.pt}</b> puntos para “${nx.n}”` : "Ya podés canjear cualquier premio"}</p></div></div>
<div><div class="card"><h2>Servicios y precios</h2>${lines()}</div><h2>Premios disponibles</h2>` +
    PR.map((p, i) => {
      const ok = U.pt >= p.p;
      return `<div class="row"><div><b>${p.n}</b><br><small>${p.p} puntos${ok ? "" : " · te faltan " + (p.p - U.pt)}</small></div><button ${ok ? "" : "disabled"} onclick="redeem(${i})">${cf === i ? "Confirmar canje" : ok ? "Canjear" : "Ver"}</button></div>`;
    }).join("") +
    (mine.length
      ? `<h2>Tus códigos</h2>` +
        mine
          .map(
            (c) =>
              `<div class="row"><div><b>${esc(c.pr)}</b><br><small>Mostrá este código al barbero</small></div><span class="code">${esc(c.c)}</span></div>`,
          )
          .join("")
      : "") +
    `</div></div>`
  );
}
function resH() {
  const f = slots(),
    s = S[sel.s];
  return `<h1>Reservar turno</h1><div class="grid r"><div class="card"><h3 style="margin-top:0">Servicio</h3><div class="chips">${S.map((x, i) => `<button class="chip ${i == sel.s ? "on" : ""}" onclick="sel.s=${i};sel.t='';R()">${x.n} · ${$$(x.p)}</button>`).join("")}</div>
<h3>Día</h3><div class="chips">${days()
    .map(
      (d) =>
        `<button class="chip ${d == sel.d ? "on" : ""}" onclick="setDay('${d}')">${fd(d)}</button>`,
    )
    .join("")}</div>
<h3>Hora</h3><div class="chips t">${f.length ? f.map((t) => `<button class="chip ${t == sel.t ? "on" : ""}" onclick="sel.t='${t}';R()">${t}</button>`).join("") : "<small>No quedan horarios este día.</small>"}</div></div>
<aside class="card side"><h2>Tu turno</h2><div class="line"><span>Servicio</span><b>${s.n}</b></div><div class="line"><span>Día</span><b>${fd(sel.d)}</b></div><div class="line"><span>Hora</span><b>${sel.t || "—"}</b></div><div class="line"><span>Precio</span><span class="price">${$$(s.p)}</span></div>
<button class="main" ${sel.t ? "" : "disabled"} onclick="askBook()">Confirmar turno</button><p style="margin:10px 0 0"><small>Sumás ${PTS} puntos cuando se completa el corte.</small></p></aside></div>`;
}
const quien = (t) =>
  t.por === "bar"
    ? "Cancelado por la barbería"
    : t.por === "cli"
      ? isAdm()
        ? "Cancelado por el cliente"
        : "Cancelado por vos"
      : "Cancelado";
const cxForm = (t) =>
  `<div class="sub"><label>${isAdm() ? "Motivo de la cancelación" : "¿Por qué cancelás?"}</label><div class="chips">${(isAdm() ? MB : MC).map((m, i) => `<button class="chip ${cr === m ? "on" : ""}" onclick="setMot(${i})">${m}</button>`).join("")}</div>${cr === "Otro motivo" ? `<input id="cn" maxlength="80" placeholder="Contá el motivo (opcional)" value="${esc(cn)}" oninput="setCn(this)">` : ""}<small>El horario se libera para otros clientes.</small><div class="chips"><button class="main" ${cr ? "" : "disabled"} onclick="cancel('${t.id}')">Confirmar cancelación</button><button onclick="closeX()">Volver</button></div></div>`;
const dnForm = (t) => {
  const l = S[t.s].p,
    ch = [
      ["Lista", l],
      ["−20%", Math.round(l * 0.8)],
      ["−50%", Math.round(l * 0.5)],
      ["Gratis", 0],
    ];
  return `<div class="sub"><label for="dm">Monto cobrado ($)</label><input id="dm" inputmode="numeric" maxlength="8" value="${dm}" oninput="setDm(this)"><div class="chips">${ch.map((c) => `<button class="chip ${dm === String(c[1]) ? "on" : ""}" onclick="setDmv(${c[1]})">${c[0]} · ${$$(c[1])}</button>`).join("")}</div><label>Medio de pago</label><div class="chips">${MP.map((m) => `<button class="chip ${dp === m ? "on" : ""}" onclick="setDp('${m}')">${m}</button>`).join("")}</div><div class="chips"><button class="main" ${dm === "" ? "disabled" : ""} onclick="done('${t.id}')">Guardar cobro y completar</button><button onclick="closeX()">Volver</button></div></div>`;
};
function turH() {
  const l = [...T].sort((a, b) => (b.d + b.t).localeCompare(a.d + a.t));
  return (
    `<div style="max-width:640px"><h1>Mis turnos</h1>` +
    (l.length
      ? l
          .map((t) => {
            const x = cx === t.id,
              pr = t.st === "hecho" && t.precio != null ? t.precio : S[t.s].p;
            return `<div class="row ${x ? "ex" : ""} ${t.st === "cancel" ? "no" : ""}"><div class="top"><div><b>${S[t.s].n}</b> · ${$$(pr)}<br><small>${fd(t.d)} · ${t.t} · ${ST[t.st]}</small>${t.st === "cancel" ? `<br><small>${quien(t)}${t.mot ? " · " + esc(t.mot) : ""}</small>` : ""}</div>${t.st === "pend" && !x ? `<button onclick="askCancel('${t.id}')">Cancelar</button>` : ""}</div>${x ? cxForm(t) : ""}</div>`;
          })
          .join("")
      : "<p><small>Todavía no reservaste. Tocá “Reservar” para elegir un horario.</small></p>") +
    `</div>`
  );
}
function barH() {
  const hoy = new Date().toLocaleDateString("en-CA"),
    p = [...T]
      .filter((t) => !ag || t.d === ag)
      .sort((a, b) => (a.d + a.t).localeCompare(b.d + b.t));
  return (
    `<h1>Panel del barbero</h1><div class="grid b"><div><h2>Agenda</h2><div class="chips" style="margin-bottom:12px">${[["", "Todos"], ...[...new Set([hoy, ...days()])].sort().map((d) => [d, d === hoy ? "Hoy" : fd(d)])].map((a) => `<button class="chip ${ag === a[0] ? "on" : ""}" onclick="setAg('${a[0]}')">${a[1]}</button>`).join("")}</div>` +
    (p.length
      ? p
          .map((t) => {
            const o = cx === t.id || dn === t.id;
            return `<div class="row ${o ? "ex" : ""}"><div class="top"><div><b>${esc(t.nm)}</b><br><small>${S[t.s].n} · ${$$(S[t.s].p)}<br>${fd(t.d)} · ${t.t}</small></div>${o ? "" : `<div class="chips"><button onclick="askDone('${t.id}')">Completó</button><button onclick="askCancel('${t.id}')">Cancelar</button></div>`}</div>${dn === t.id ? dnForm(t) : ""}${cx === t.id ? cxForm(t) : ""}</div>`;
          })
          .join("")
      : `<p><small>No hay turnos${ag ? " para este día" : ""}.</small></p>`) +
    `</div><div><h2>Canjes sin usar</h2>` +
    (C.length
      ? C.map(
          (x) =>
            `<div class="row"><div><b>${esc(x.pr)}</b><br><small>${esc(x.nm)}</small><br><span class="code">${esc(x.c)}</span></div><button onclick="askUsed('${x.id}')">Marcar usado</button></div>`,
        ).join("")
      : "<p><small>No hay canjes pendientes.</small></p>") +
    `</div></div>`
  );
}
const rng = () => {
  const ymd = (x) => x.toLocaleDateString("en-CA"),
    t = new Date();
  if (per === "hoy") return (d) => d === ymd(t);
  if (per === "sem") {
    const a = new Date();
    a.setDate(a.getDate() - 6);
    return (d) => d >= ymd(a) && d <= ymd(t);
  }
  if (per === "mes") return (d) => d.startsWith(ymd(t).slice(0, 7));
  return () => true;
};
function dashH() {
  const f = rng(),
    srt = (a, b) => (b.d + b.t).localeCompare(a.d + a.t),
    L = H.filter((t) => f(t.d)).sort(srt),
    CL = CA.filter((t) => f(t.d)).sort(srt),
    tot = L.reduce((a, t) => a + (t.precio || 0), 0),
    dsc = L.reduce(
      (a, t) => a + Math.max(0, (t.lista || 0) - (t.precio || 0)),
      0,
    ),
    by = {},
    md = {};
  L.forEach((t) => {
    const k = t.serv || S[t.s].n,
      m = t.medio || "Sin dato";
    by[k] = by[k] || { n: 0, m: 0 };
    by[k].n++;
    by[k].m += t.precio || 0;
    md[m] = md[m] || { n: 0, m: 0 };
    md[m].n++;
    md[m].m += t.precio || 0;
  });
  const P = [
      ["hoy", "Hoy"],
      ["sem", "7 días"],
      ["mes", "Este mes"],
      ["all", "Todo"],
    ],
    kp = (l, v) => `<div class="card kpi"><small>${l}</small><b>${v}</b></div>`,
    grp = (o) =>
      Object.keys(o).length
        ? `<div class="card">${Object.keys(o)
            .map(
              (k) =>
                `<div class="line"><span><b>${esc(k)}</b> <small>${o[k].n} ${o[k].n === 1 ? "corte" : "cortes"}</small></span><span class="price">${$$(o[k].m)}</span></div>`,
            )
            .join("")}</div>`
        : "<p><small>Todavía no hay cortes en este período.</small></p>";
  return (
    `<h1>Dashboard</h1><div class="chips" style="margin-bottom:18px">${P.map((p) => `<button class="chip ${per === p[0] ? "on" : ""}" onclick="setPer('${p[0]}')">${p[1]}</button>`).join("")}</div>` +
    `<div class="kpis">${kp("Cortes realizados", L.length)}${kp("Ingresos cobrados", $$(tot))}${kp("Promedio por corte", $$(L.length ? Math.round(tot / L.length) : 0))}${kp("Turnos cancelados", CL.length)}${kp("Descuentos otorgados", $$(dsc))}${kp("Canjes entregados (total)", CU.length)}</div>` +
    `<div class="grid b"><div><h2 style="margin-top:26px">Por servicio</h2>${grp(by)}<h2>Por medio de pago</h2>${grp(md)}</div><div><div class="head"><h2>Registro de cortes</h2><button onclick="exportar()" ${L.length ? "" : "disabled"}>Descargar CSV</button></div>` +
    (L.length
      ? L.map(
          (t) =>
            `<div class="row"><div><b>${esc(t.nm)}</b><br><small>${esc(t.serv || S[t.s].n)} · ${fd(t.d)} · ${t.t}${t.medio ? " · " + esc(t.medio) : ""}</small></div><span class="price">${$$(t.precio || 0)}</span></div>`,
        ).join("")
      : "<p><small>Cuando marques “Completó” en un turno, aparece acá.</small></p>") +
    `</div></div><h2>Cancelaciones</h2>` +
    (CL.length
      ? CL.map(
          (t) =>
            `<div class="row no"><div><b>${esc(t.nm)}</b><br><small>${esc(S[t.s].n)} · ${fd(t.d)} · ${t.t}<br>${quien(t)} · ${esc(t.mot || "Sin motivo registrado")}</small></div></div>`,
        ).join("")
      : "<p><small>No hubo cancelaciones en este período.</small></p>")
  );
}
function cliH() {
  const by = {};
  H.forEach((t) => (by[t.uid] = by[t.uid] || []).push(t));
  const L = [...UA].sort((a, b) => String(a.nm).localeCompare(String(b.nm)));
  return (
    `<h1>Clientes</h1>` +
    (L.length
      ? L.map((u) => {
          const h = (by[u.id] || []).sort((a, b) =>
              (b.d + b.t).localeCompare(a.d + a.t),
            ),
            tot = h.reduce((a, t) => a + (t.precio || 0), 0);
          return `<details class="row ex cl"><summary><b>${esc(u.nm)}</b><small>${u.pt} pts · ${h.length} ${h.length === 1 ? "corte" : "cortes"} · ${$$(tot)}</small></summary><div class="sub"><a href="https://wa.me/${esc(u.ph)}" target="_blank" rel="noopener">WhatsApp ${esc(u.ph)}</a>${h.length ? h.map((t) => `<div class="line"><span>${esc(t.serv || S[t.s].n)} <small>${fd(t.d)} · ${t.t}</small></span><b>${$$(t.precio || 0)}</b></div>`).join("") : "<small>Todavía no tiene cortes.</small>"}</div></details>`;
        }).join("")
      : "<p><small>Todavía no hay clientes registrados.</small></p>")
  );
}
const hrs = (v, a, b, none) =>
  (none ? `<option value="0" ${v ? "" : "selected"}>${none}</option>` : "") +
  Array.from({ length: (b - a) / 30 + 1 }, (_, i) => a + i * 30)
    .map(
      (m) =>
        `<option value="${m}" ${m === v ? "selected" : ""}>${hm(m)}</option>`,
    )
    .join("");
function cfgH() {
  const c = cd || CF,
    D = [
      [1, "Lun"],
      [2, "Mar"],
      [3, "Mié"],
      [4, "Jue"],
      [5, "Vie"],
      [6, "Sáb"],
      [0, "Dom"],
    ];
  return `<div style="max-width:640px"><h1>Horarios</h1><div class="card"><h3 style="margin-top:0">Días de atención</h3><div class="chips">${D.map((d) => `<button class="chip ${c.dias.includes(d[0]) ? "on" : ""}" onclick="cfgDia(${d[0]})">${d[1]}</button>`).join("")}</div>
<h3>Apertura y cierre</h3><div class="chips"><select aria-label="Apertura" onchange="cfgSet('a',this.value)">${hrs(c.a, 360, 1380)}</select><select aria-label="Cierre" onchange="cfgSet('c',this.value)">${hrs(c.c, 360, 1380)}</select></div>
<h3>Pausa (almuerzo)</h3><div class="chips"><select aria-label="Pausa desde" onchange="cfgSet('al',this.value)">${hrs(c.al, 360, 1380, "Sin pausa")}</select><select aria-label="Pausa hasta" onchange="cfgSet('ah',this.value)">${hrs(c.ah, 360, 1380, "—")}</select></div>
<h3>Días libres (feriados, vacaciones)</h3><div class="chips"><input id="lb" type="date" aria-label="Día libre" style="width:auto;margin:0"><button onclick="cfgLibre()">Agregar</button></div><div class="chips" style="margin-top:10px">${c.libres.map((d) => `<button class="chip on" onclick="cfgQuitar('${d}')" aria-label="Quitar ${d}">${fd(d)} ✕</button>`).join("")}</div>
<button class="main" onclick="cfgGuardar()">Guardar horarios</button></div></div>`;
}
function R() {
  let h,
    nv = "";
  $("#brand").textContent = NOMBRE;
  $("#lo").hidden = !me;
  if (me && !isAdm() && !U) {
    pnd = 1;
    busy(1, "Cargando tu cuenta…");
  } else if (ready && (pnd || !boot)) {
    pnd = 0;
    boot = 1;
    busy(0);
  }
  if (!me) h = authH();
  else if (isAdm()) {
    h = { dash: dashH, cli: cliH, cfg: cfgH }[view]?.() ?? barH();
    nv = [
      ["bar", "Agenda"],
      ["cli", "Clientes"],
      ["dash", "Dashboard"],
      ["cfg", "Horarios"],
    ]
      .map(
        (a) =>
          `<button class="${view === a[0] ? "on" : ""}" onclick="go('${a[0]}')">${a[1]}</button>`,
      )
      .join("");
  } else if (!U) h = "<p><small>Cargando tu cuenta…</small></p>";
  else {
    h = view === "res" ? resH() : view === "tur" ? turH() : homeH();
    nv = [
      ["home", "Inicio"],
      ["res", "Reservar"],
      ["tur", "Mis turnos"],
    ]
      .map(
        (a) =>
          `<button class="${view === a[0] ? "on" : ""}" onclick="go('${a[0]}')">${a[1]}</button>`,
      )
      .join("");
  }
  const ae = document.activeElement,
    aid = ae && ae.tagName === "INPUT" ? ae.id : "";
  $("#nav").innerHTML = nv;
  $("#app").innerHTML =
    (msg ? `<p class="msg">${esc(msg)}</p>` : "") +
    h +
    `<p class="credit">Desarrollado por <b>${esc(AUTOR)}</b> · ${new Date().getFullYear()}</p>`;
  msg = "";
  if (aid) {
    const e = $("#" + aid);
    if (e) {
      e.focus();
      try {
        e.setSelectionRange(e.value.length, e.value.length);
      } catch (_) {}
    }
  }
}
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || me || e.target.tagName !== "INPUT") return;
  e.preventDefault();
  tab === "up" ? W.registro() : W.entrar();
});
document.addEventListener("keydown", (e) => {
  if ($("#mo").hidden) return;
  if (e.key === "Escape") Mx();
  if (e.key === "Tab") {
    const b = [...$("#mo").querySelectorAll("button")],
      i = b.indexOf(document.activeElement);
    e.preventDefault();
    b[(i + (e.shiftKey ? -1 : 1) + b.length) % b.length].focus();
  }
});
window.R = R;
window.sel = sel;
R();
