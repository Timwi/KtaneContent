"use strict";
function gr(e, t) {
  const n = Object.create(null),
    r = e.split(",");
  for (let l = 0; l < r.length; l++) n[r[l]] = !0;
  return t ? (l) => !!n[l.toLowerCase()] : (l) => !!n[l];
}
const ha =
    "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly",
  ga = gr(ha);
function Js(e) {
  return !!e || e === "";
}
function pr(e) {
  if (W(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const r = e[n],
        l = de(r) ? Ea(r) : pr(r);
      if (l) for (const s in l) t[s] = l[s];
    }
    return t;
  } else {
    if (de(e)) return e;
    if (se(e)) return e;
  }
}
const pa = /;(?![^(]*\))/g,
  ba = /:(.+)/;
function Ea(e) {
  const t = {};
  return (
    e.split(pa).forEach((n) => {
      if (n) {
        const r = n.split(ba);
        r.length > 1 && (t[r[0].trim()] = r[1].trim());
      }
    }),
    t
  );
}
function vn(e) {
  let t = "";
  if (de(e)) t = e;
  else if (W(e))
    for (let n = 0; n < e.length; n++) {
      const r = vn(e[n]);
      r && (t += r + " ");
    }
  else if (se(e)) for (const n in e) e[n] && (t += n + " ");
  return t.trim();
}
const kt = (e) =>
    de(e)
      ? e
      : e == null
      ? ""
      : W(e) || (se(e) && (e.toString === zs || !H(e.toString)))
      ? JSON.stringify(e, qs, 2)
      : String(e),
  qs = (e, t) =>
    t && t.__v_isRef
      ? qs(e, t.value)
      : wt(t)
      ? {
          [`Map(${t.size})`]: [...t.entries()].reduce(
            (n, [r, l]) => ((n[`${r} =>`] = l), n),
            {}
          ),
        }
      : Qs(t)
      ? { [`Set(${t.size})`]: [...t.values()] }
      : se(t) && !W(t) && !el(t)
      ? String(t)
      : t,
  z = {},
  Mt = [],
  Ve = () => {},
  La = () => !1,
  Ta = /^on[^a-z]/,
  Cn = (e) => Ta.test(e),
  br = (e) => e.startsWith("onUpdate:"),
  ye = Object.assign,
  Er = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  },
  Ia = Object.prototype.hasOwnProperty,
  Y = (e, t) => Ia.call(e, t),
  W = Array.isArray,
  wt = (e) => On(e) === "[object Map]",
  Qs = (e) => On(e) === "[object Set]",
  H = (e) => typeof e == "function",
  de = (e) => typeof e == "string",
  Lr = (e) => typeof e == "symbol",
  se = (e) => e !== null && typeof e == "object",
  Zs = (e) => se(e) && H(e.then) && H(e.catch),
  zs = Object.prototype.toString,
  On = (e) => zs.call(e),
  Na = (e) => On(e).slice(8, -1),
  el = (e) => On(e) === "[object Object]",
  Tr = (e) =>
    de(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e,
  _n = gr(
    ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
  ),
  An = (e) => {
    const t = Object.create(null);
    return (n) => t[n] || (t[n] = e(n));
  },
  ya = /-(\w)/g,
  $t = An((e) => e.replace(ya, (t, n) => (n ? n.toUpperCase() : ""))),
  va = /\B([A-Z])/g,
  jt = An((e) => e.replace(va, "-$1").toLowerCase()),
  tl = An((e) => e.charAt(0).toUpperCase() + e.slice(1)),
  Wn = An((e) => (e ? `on${tl(e)}` : "")),
  zt = (e, t) => !Object.is(e, t),
  Hn = (e, t) => {
    for (let n = 0; n < e.length; n++) e[n](t);
  },
  En = (e, t, n) => {
    Object.defineProperty(e, t, { configurable: !0, enumerable: !1, value: n });
  },
  Ca = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  };
let Yr;
const Oa = () =>
  Yr ||
  (Yr =
    typeof globalThis < "u"
      ? globalThis
      : typeof self < "u"
      ? self
      : typeof window < "u"
      ? window
      : typeof global < "u"
      ? global
      : {});
let Je;
class nl {
  constructor(t = !1) {
    (this.active = !0),
      (this.effects = []),
      (this.cleanups = []),
      !t &&
        Je &&
        ((this.parent = Je),
        (this.index = (Je.scopes || (Je.scopes = [])).push(this) - 1));
  }
  run(t) {
    if (this.active) {
      const n = Je;
      try {
        return (Je = this), t();
      } finally {
        Je = n;
      }
    }
  }
  on() {
    Je = this;
  }
  off() {
    Je = this.parent;
  }
  stop(t) {
    if (this.active) {
      let n, r;
      for (n = 0, r = this.effects.length; n < r; n++) this.effects[n].stop();
      for (n = 0, r = this.cleanups.length; n < r; n++) this.cleanups[n]();
      if (this.scopes)
        for (n = 0, r = this.scopes.length; n < r; n++) this.scopes[n].stop(!0);
      if (this.parent && !t) {
        const l = this.parent.scopes.pop();
        l &&
          l !== this &&
          ((this.parent.scopes[this.index] = l), (l.index = this.index));
      }
      this.active = !1;
    }
  }
}
function Aa(e) {
  return new nl(e);
}
function ka(e, t = Je) {
  t && t.active && t.effects.push(e);
}
const Ir = (e) => {
    const t = new Set(e);
    return (t.w = 0), (t.n = 0), t;
  },
  rl = (e) => (e.w & _t) > 0,
  sl = (e) => (e.n & _t) > 0,
  Fa = ({ deps: e }) => {
    if (e.length) for (let t = 0; t < e.length; t++) e[t].w |= _t;
  },
  Pa = (e) => {
    const { deps: t } = e;
    if (t.length) {
      let n = 0;
      for (let r = 0; r < t.length; r++) {
        const l = t[r];
        rl(l) && !sl(l) ? l.delete(e) : (t[n++] = l),
          (l.w &= ~_t),
          (l.n &= ~_t);
      }
      t.length = n;
    }
  },
  Xn = new WeakMap();
let Jt = 0,
  _t = 1;
const Gn = 30;
let Ue;
const vt = Symbol(""),
  Jn = Symbol("");
class Nr {
  constructor(t, n = null, r) {
    (this.fn = t),
      (this.scheduler = n),
      (this.active = !0),
      (this.deps = []),
      (this.parent = void 0),
      ka(this, r);
  }
  run() {
    if (!this.active) return this.fn();
    let t = Ue,
      n = dt;
    for (; t; ) {
      if (t === this) return;
      t = t.parent;
    }
    try {
      return (
        (this.parent = Ue),
        (Ue = this),
        (dt = !0),
        (_t = 1 << ++Jt),
        Jt <= Gn ? Fa(this) : Xr(this),
        this.fn()
      );
    } finally {
      Jt <= Gn && Pa(this),
        (_t = 1 << --Jt),
        (Ue = this.parent),
        (dt = n),
        (this.parent = void 0),
        this.deferStop && this.stop();
    }
  }
  stop() {
    Ue === this
      ? (this.deferStop = !0)
      : this.active &&
        (Xr(this), this.onStop && this.onStop(), (this.active = !1));
  }
}
function Xr(e) {
  const { deps: t } = e;
  if (t.length) {
    for (let n = 0; n < t.length; n++) t[n].delete(e);
    t.length = 0;
  }
}
let dt = !0;
const ll = [];
function Kt() {
  ll.push(dt), (dt = !1);
}
function Bt() {
  const e = ll.pop();
  dt = e === void 0 ? !0 : e;
}
function Pe(e, t, n) {
  if (dt && Ue) {
    let r = Xn.get(e);
    r || Xn.set(e, (r = new Map()));
    let l = r.get(n);
    l || r.set(n, (l = Ir())), al(l);
  }
}
function al(e, t) {
  let n = !1;
  Jt <= Gn ? sl(e) || ((e.n |= _t), (n = !rl(e))) : (n = !e.has(Ue)),
    n && (e.add(Ue), Ue.deps.push(e));
}
function it(e, t, n, r, l, s) {
  const i = Xn.get(e);
  if (!i) return;
  let c = [];
  if (t === "clear") c = [...i.values()];
  else if (n === "length" && W(e))
    i.forEach((u, d) => {
      (d === "length" || d >= r) && c.push(u);
    });
  else
    switch ((n !== void 0 && c.push(i.get(n)), t)) {
      case "add":
        W(e)
          ? Tr(n) && c.push(i.get("length"))
          : (c.push(i.get(vt)), wt(e) && c.push(i.get(Jn)));
        break;
      case "delete":
        W(e) || (c.push(i.get(vt)), wt(e) && c.push(i.get(Jn)));
        break;
      case "set":
        wt(e) && c.push(i.get(vt));
        break;
    }
  if (c.length === 1) c[0] && qn(c[0]);
  else {
    const u = [];
    for (const d of c) d && u.push(...d);
    qn(Ir(u));
  }
}
function qn(e, t) {
  const n = W(e) ? e : [...e];
  for (const r of n) r.computed && Gr(r);
  for (const r of n) r.computed || Gr(r);
}
function Gr(e, t) {
  (e !== Ue || e.allowRecurse) && (e.scheduler ? e.scheduler() : e.run());
}
const Ra = gr("__proto__,__v_isRef,__isVue"),
  il = new Set(
    Object.getOwnPropertyNames(Symbol)
      .filter((e) => e !== "arguments" && e !== "caller")
      .map((e) => Symbol[e])
      .filter(Lr)
  ),
  Ma = yr(),
  wa = yr(!1, !0),
  Sa = yr(!0),
  Jr = Da();
function Da() {
  const e = {};
  return (
    ["includes", "indexOf", "lastIndexOf"].forEach((t) => {
      e[t] = function (...n) {
        const r = q(this);
        for (let s = 0, i = this.length; s < i; s++) Pe(r, "get", s + "");
        const l = r[t](...n);
        return l === -1 || l === !1 ? r[t](...n.map(q)) : l;
      };
    }),
    ["push", "pop", "shift", "unshift", "splice"].forEach((t) => {
      e[t] = function (...n) {
        Kt();
        const r = q(this)[t].apply(this, n);
        return Bt(), r;
      };
    }),
    e
  );
}
function yr(e = !1, t = !1) {
  return function (r, l, s) {
    if (l === "__v_isReactive") return !e;
    if (l === "__v_isReadonly") return e;
    if (l === "__v_isShallow") return t;
    if (l === "__v_raw" && s === (e ? (t ? Za : dl) : t ? fl : ul).get(r))
      return r;
    const i = W(r);
    if (!e && i && Y(Jr, l)) return Reflect.get(Jr, l, s);
    const c = Reflect.get(r, l, s);
    return (Lr(l) ? il.has(l) : Ra(l)) || (e || Pe(r, "get", l), t)
      ? c
      : he(c)
      ? i && Tr(l)
        ? c
        : c.value
      : se(c)
      ? e
        ? ml(c)
        : Or(c)
      : c;
  };
}
const xa = ol(),
  $a = ol(!0);
function ol(e = !1) {
  return function (n, r, l, s) {
    let i = n[r];
    if (Ut(i) && he(i) && !he(l)) return !1;
    if (
      !e &&
      (!Ln(l) && !Ut(l) && ((i = q(i)), (l = q(l))), !W(n) && he(i) && !he(l))
    )
      return (i.value = l), !0;
    const c = W(n) && Tr(r) ? Number(r) < n.length : Y(n, r),
      u = Reflect.set(n, r, l, s);
    return (
      n === q(s) && (c ? zt(l, i) && it(n, "set", r, l) : it(n, "add", r, l)), u
    );
  };
}
function Ua(e, t) {
  const n = Y(e, t);
  e[t];
  const r = Reflect.deleteProperty(e, t);
  return r && n && it(e, "delete", t, void 0), r;
}
function Wa(e, t) {
  const n = Reflect.has(e, t);
  return (!Lr(t) || !il.has(t)) && Pe(e, "has", t), n;
}
function Ha(e) {
  return Pe(e, "iterate", W(e) ? "length" : vt), Reflect.ownKeys(e);
}
const cl = { get: Ma, set: xa, deleteProperty: Ua, has: Wa, ownKeys: Ha },
  Va = {
    get: Sa,
    set(e, t) {
      return !0;
    },
    deleteProperty(e, t) {
      return !0;
    },
  },
  ja = ye({}, cl, { get: wa, set: $a }),
  vr = (e) => e,
  kn = (e) => Reflect.getPrototypeOf(e);
function on(e, t, n = !1, r = !1) {
  e = e.__v_raw;
  const l = q(e),
    s = q(t);
  n || (t !== s && Pe(l, "get", t), Pe(l, "get", s));
  const { has: i } = kn(l),
    c = r ? vr : n ? kr : en;
  if (i.call(l, t)) return c(e.get(t));
  if (i.call(l, s)) return c(e.get(s));
  e !== l && e.get(t);
}
function cn(e, t = !1) {
  const n = this.__v_raw,
    r = q(n),
    l = q(e);
  return (
    t || (e !== l && Pe(r, "has", e), Pe(r, "has", l)),
    e === l ? n.has(e) : n.has(e) || n.has(l)
  );
}
function un(e, t = !1) {
  return (
    (e = e.__v_raw), !t && Pe(q(e), "iterate", vt), Reflect.get(e, "size", e)
  );
}
function qr(e) {
  e = q(e);
  const t = q(this);
  return kn(t).has.call(t, e) || (t.add(e), it(t, "add", e, e)), this;
}
function Qr(e, t) {
  t = q(t);
  const n = q(this),
    { has: r, get: l } = kn(n);
  let s = r.call(n, e);
  s || ((e = q(e)), (s = r.call(n, e)));
  const i = l.call(n, e);
  return (
    n.set(e, t), s ? zt(t, i) && it(n, "set", e, t) : it(n, "add", e, t), this
  );
}
function Zr(e) {
  const t = q(this),
    { has: n, get: r } = kn(t);
  let l = n.call(t, e);
  l || ((e = q(e)), (l = n.call(t, e))), r && r.call(t, e);
  const s = t.delete(e);
  return l && it(t, "delete", e, void 0), s;
}
function zr() {
  const e = q(this),
    t = e.size !== 0,
    n = e.clear();
  return t && it(e, "clear", void 0, void 0), n;
}
function fn(e, t) {
  return function (r, l) {
    const s = this,
      i = s.__v_raw,
      c = q(i),
      u = t ? vr : e ? kr : en;
    return (
      !e && Pe(c, "iterate", vt), i.forEach((d, g) => r.call(l, u(d), u(g), s))
    );
  };
}
function dn(e, t, n) {
  return function (...r) {
    const l = this.__v_raw,
      s = q(l),
      i = wt(s),
      c = e === "entries" || (e === Symbol.iterator && i),
      u = e === "keys" && i,
      d = l[e](...r),
      g = n ? vr : t ? kr : en;
    return (
      !t && Pe(s, "iterate", u ? Jn : vt),
      {
        next() {
          const { value: E, done: p } = d.next();
          return p
            ? { value: E, done: p }
            : { value: c ? [g(E[0]), g(E[1])] : g(E), done: p };
        },
        [Symbol.iterator]() {
          return this;
        },
      }
    );
  };
}
function ct(e) {
  return function (...t) {
    return e === "delete" ? !1 : this;
  };
}
function Ka() {
  const e = {
      get(s) {
        return on(this, s);
      },
      get size() {
        return un(this);
      },
      has: cn,
      add: qr,
      set: Qr,
      delete: Zr,
      clear: zr,
      forEach: fn(!1, !1),
    },
    t = {
      get(s) {
        return on(this, s, !1, !0);
      },
      get size() {
        return un(this);
      },
      has: cn,
      add: qr,
      set: Qr,
      delete: Zr,
      clear: zr,
      forEach: fn(!1, !0),
    },
    n = {
      get(s) {
        return on(this, s, !0);
      },
      get size() {
        return un(this, !0);
      },
      has(s) {
        return cn.call(this, s, !0);
      },
      add: ct("add"),
      set: ct("set"),
      delete: ct("delete"),
      clear: ct("clear"),
      forEach: fn(!0, !1),
    },
    r = {
      get(s) {
        return on(this, s, !0, !0);
      },
      get size() {
        return un(this, !0);
      },
      has(s) {
        return cn.call(this, s, !0);
      },
      add: ct("add"),
      set: ct("set"),
      delete: ct("delete"),
      clear: ct("clear"),
      forEach: fn(!0, !0),
    };
  return (
    ["keys", "values", "entries", Symbol.iterator].forEach((s) => {
      (e[s] = dn(s, !1, !1)),
        (n[s] = dn(s, !0, !1)),
        (t[s] = dn(s, !1, !0)),
        (r[s] = dn(s, !0, !0));
    }),
    [e, n, t, r]
  );
}
const [Ba, Ya, Xa, Ga] = Ka();
function Cr(e, t) {
  const n = t ? (e ? Ga : Xa) : e ? Ya : Ba;
  return (r, l, s) =>
    l === "__v_isReactive"
      ? !e
      : l === "__v_isReadonly"
      ? e
      : l === "__v_raw"
      ? r
      : Reflect.get(Y(n, l) && l in r ? n : r, l, s);
}
const Ja = { get: Cr(!1, !1) },
  qa = { get: Cr(!1, !0) },
  Qa = { get: Cr(!0, !1) },
  ul = new WeakMap(),
  fl = new WeakMap(),
  dl = new WeakMap(),
  Za = new WeakMap();
function za(e) {
  switch (e) {
    case "Object":
    case "Array":
      return 1;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return 2;
    default:
      return 0;
  }
}
function ei(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : za(Na(e));
}
function Or(e) {
  return Ut(e) ? e : Ar(e, !1, cl, Ja, ul);
}
function ti(e) {
  return Ar(e, !1, ja, qa, fl);
}
function ml(e) {
  return Ar(e, !0, Va, Qa, dl);
}
function Ar(e, t, n, r, l) {
  if (!se(e) || (e.__v_raw && !(t && e.__v_isReactive))) return e;
  const s = l.get(e);
  if (s) return s;
  const i = ei(e);
  if (i === 0) return e;
  const c = new Proxy(e, i === 2 ? r : n);
  return l.set(e, c), c;
}
function St(e) {
  return Ut(e) ? St(e.__v_raw) : !!(e && e.__v_isReactive);
}
function Ut(e) {
  return !!(e && e.__v_isReadonly);
}
function Ln(e) {
  return !!(e && e.__v_isShallow);
}
function _l(e) {
  return St(e) || Ut(e);
}
function q(e) {
  const t = e && e.__v_raw;
  return t ? q(t) : e;
}
function hl(e) {
  return En(e, "__v_skip", !0), e;
}
const en = (e) => (se(e) ? Or(e) : e),
  kr = (e) => (se(e) ? ml(e) : e);
function gl(e) {
  dt && Ue && ((e = q(e)), al(e.dep || (e.dep = Ir())));
}
function pl(e, t) {
  (e = q(e)), e.dep && qn(e.dep);
}
function he(e) {
  return !!(e && e.__v_isRef === !0);
}
function Ze(e) {
  return bl(e, !1);
}
function ni(e) {
  return bl(e, !0);
}
function bl(e, t) {
  return he(e) ? e : new ri(e, t);
}
class ri {
  constructor(t, n) {
    (this.__v_isShallow = n),
      (this.dep = void 0),
      (this.__v_isRef = !0),
      (this._rawValue = n ? t : q(t)),
      (this._value = n ? t : en(t));
  }
  get value() {
    return gl(this), this._value;
  }
  set value(t) {
    const n = this.__v_isShallow || Ln(t) || Ut(t);
    (t = n ? t : q(t)),
      zt(t, this._rawValue) &&
        ((this._rawValue = t), (this._value = n ? t : en(t)), pl(this));
  }
}
function si(e) {
  return he(e) ? e.value : e;
}
const li = {
  get: (e, t, n) => si(Reflect.get(e, t, n)),
  set: (e, t, n, r) => {
    const l = e[t];
    return he(l) && !he(n) ? ((l.value = n), !0) : Reflect.set(e, t, n, r);
  },
};
function El(e) {
  return St(e) ? e : new Proxy(e, li);
}
var Ll;
class ai {
  constructor(t, n, r, l) {
    (this._setter = n),
      (this.dep = void 0),
      (this.__v_isRef = !0),
      (this[Ll] = !1),
      (this._dirty = !0),
      (this.effect = new Nr(t, () => {
        this._dirty || ((this._dirty = !0), pl(this));
      })),
      (this.effect.computed = this),
      (this.effect.active = this._cacheable = !l),
      (this.__v_isReadonly = r);
  }
  get value() {
    const t = q(this);
    return (
      gl(t),
      (t._dirty || !t._cacheable) &&
        ((t._dirty = !1), (t._value = t.effect.run())),
      t._value
    );
  }
  set value(t) {
    this._setter(t);
  }
}
Ll = "__v_isReadonly";
function ii(e, t, n = !1) {
  let r, l;
  const s = H(e);
  return (
    s ? ((r = e), (l = Ve)) : ((r = e.get), (l = e.set)),
    new ai(r, l, s || !l, n)
  );
}
function mt(e, t, n, r) {
  let l;
  try {
    l = r ? e(...r) : e();
  } catch (s) {
    Fn(s, t, n);
  }
  return l;
}
function je(e, t, n, r) {
  if (H(e)) {
    const s = mt(e, t, n, r);
    return (
      s &&
        Zs(s) &&
        s.catch((i) => {
          Fn(i, t, n);
        }),
      s
    );
  }
  const l = [];
  for (let s = 0; s < e.length; s++) l.push(je(e[s], t, n, r));
  return l;
}
function Fn(e, t, n, r = !0) {
  const l = t ? t.vnode : null;
  if (t) {
    let s = t.parent;
    const i = t.proxy,
      c = n;
    for (; s; ) {
      const d = s.ec;
      if (d) {
        for (let g = 0; g < d.length; g++) if (d[g](e, i, c) === !1) return;
      }
      s = s.parent;
    }
    const u = t.appContext.config.errorHandler;
    if (u) {
      mt(u, null, 10, [e, i, c]);
      return;
    }
  }
  oi(e, n, l, r);
}
function oi(e, t, n, r = !0) {
  console.error(e);
}
let Tn = !1,
  Qn = !1;
const be = [];
let ze = 0;
const Dt = [];
let at = null,
  Nt = 0;
const Tl = Promise.resolve();
let Fr = null;
function ci(e) {
  const t = Fr || Tl;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function ui(e) {
  let t = ze + 1,
    n = be.length;
  for (; t < n; ) {
    const r = (t + n) >>> 1;
    tn(be[r]) < e ? (t = r + 1) : (n = r);
  }
  return t;
}
function Pr(e) {
  (!be.length || !be.includes(e, Tn && e.allowRecurse ? ze + 1 : ze)) &&
    (e.id == null ? be.push(e) : be.splice(ui(e.id), 0, e), Il());
}
function Il() {
  !Tn && !Qn && ((Qn = !0), (Fr = Tl.then(yl)));
}
function fi(e) {
  const t = be.indexOf(e);
  t > ze && be.splice(t, 1);
}
function di(e) {
  W(e)
    ? Dt.push(...e)
    : (!at || !at.includes(e, e.allowRecurse ? Nt + 1 : Nt)) && Dt.push(e),
    Il();
}
function es(e, t = ze) {
  for (; t < be.length; t++) {
    const n = be[t];
    n && n.pre && (be.splice(t, 1), t--, n());
  }
}
function Nl(e) {
  if (Dt.length) {
    const t = [...new Set(Dt)];
    if (((Dt.length = 0), at)) {
      at.push(...t);
      return;
    }
    for (at = t, at.sort((n, r) => tn(n) - tn(r)), Nt = 0; Nt < at.length; Nt++)
      at[Nt]();
    (at = null), (Nt = 0);
  }
}
const tn = (e) => (e.id == null ? 1 / 0 : e.id),
  mi = (e, t) => {
    const n = tn(e) - tn(t);
    if (n === 0) {
      if (e.pre && !t.pre) return -1;
      if (t.pre && !e.pre) return 1;
    }
    return n;
  };
function yl(e) {
  (Qn = !1), (Tn = !0), be.sort(mi);
  const t = Ve;
  try {
    for (ze = 0; ze < be.length; ze++) {
      const n = be[ze];
      n && n.active !== !1 && mt(n, null, 14);
    }
  } finally {
    (ze = 0),
      (be.length = 0),
      Nl(),
      (Tn = !1),
      (Fr = null),
      (be.length || Dt.length) && yl();
  }
}
function _i(e, t, ...n) {
  if (e.isUnmounted) return;
  const r = e.vnode.props || z;
  let l = n;
  const s = t.startsWith("update:"),
    i = s && t.slice(7);
  if (i && i in r) {
    const g = `${i === "modelValue" ? "model" : i}Modifiers`,
      { number: E, trim: p } = r[g] || z;
    p && (l = n.map((y) => y.trim())), E && (l = n.map(Ca));
  }
  let c,
    u = r[(c = Wn(t))] || r[(c = Wn($t(t)))];
  !u && s && (u = r[(c = Wn(jt(t)))]), u && je(u, e, 6, l);
  const d = r[c + "Once"];
  if (d) {
    if (!e.emitted) e.emitted = {};
    else if (e.emitted[c]) return;
    (e.emitted[c] = !0), je(d, e, 6, l);
  }
}
function vl(e, t, n = !1) {
  const r = t.emitsCache,
    l = r.get(e);
  if (l !== void 0) return l;
  const s = e.emits;
  let i = {},
    c = !1;
  if (!H(e)) {
    const u = (d) => {
      const g = vl(d, t, !0);
      g && ((c = !0), ye(i, g));
    };
    !n && t.mixins.length && t.mixins.forEach(u),
      e.extends && u(e.extends),
      e.mixins && e.mixins.forEach(u);
  }
  return !s && !c
    ? (se(e) && r.set(e, null), null)
    : (W(s) ? s.forEach((u) => (i[u] = null)) : ye(i, s),
      se(e) && r.set(e, i),
      i);
}
function Pn(e, t) {
  return !e || !Cn(t)
    ? !1
    : ((t = t.slice(2).replace(/Once$/, "")),
      Y(e, t[0].toLowerCase() + t.slice(1)) || Y(e, jt(t)) || Y(e, t));
}
let et = null,
  Rn = null;
function In(e) {
  const t = et;
  return (et = e), (Rn = (e && e.type.__scopeId) || null), t;
}
function hi(e) {
  Rn = e;
}
function gi() {
  Rn = null;
}
function pi(e, t = et, n) {
  if (!t || e._n) return e;
  const r = (...l) => {
    r._d && cs(-1);
    const s = In(t),
      i = e(...l);
    return In(s), r._d && cs(1), i;
  };
  return (r._n = !0), (r._c = !0), (r._d = !0), r;
}
function Vn(e) {
  const {
    type: t,
    vnode: n,
    proxy: r,
    withProxy: l,
    props: s,
    propsOptions: [i],
    slots: c,
    attrs: u,
    emit: d,
    render: g,
    renderCache: E,
    data: p,
    setupState: y,
    ctx: R,
    inheritAttrs: F,
  } = e;
  let A, _;
  const v = In(e);
  try {
    if (n.shapeFlag & 4) {
      const T = l || r;
      (A = qe(g.call(T, T, E, s, y, p, R))), (_ = u);
    } else {
      const T = t;
      (A = qe(
        T.length > 1 ? T(s, { attrs: u, slots: c, emit: d }) : T(s, null)
      )),
        (_ = t.props ? u : bi(u));
    }
  } catch (T) {
    (qt.length = 0), Fn(T, e, 1), (A = Oe(Ot));
  }
  let k = A;
  if (_ && F !== !1) {
    const T = Object.keys(_),
      { shapeFlag: I } = k;
    T.length && I & 7 && (i && T.some(br) && (_ = Ei(_, i)), (k = Wt(k, _)));
  }
  return (
    n.dirs && ((k = Wt(k)), (k.dirs = k.dirs ? k.dirs.concat(n.dirs) : n.dirs)),
    n.transition && (k.transition = n.transition),
    (A = k),
    In(v),
    A
  );
}
const bi = (e) => {
    let t;
    for (const n in e)
      (n === "class" || n === "style" || Cn(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  },
  Ei = (e, t) => {
    const n = {};
    for (const r in e) (!br(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
    return n;
  };
function Li(e, t, n) {
  const { props: r, children: l, component: s } = e,
    { props: i, children: c, patchFlag: u } = t,
    d = s.emitsOptions;
  if (t.dirs || t.transition) return !0;
  if (n && u >= 0) {
    if (u & 1024) return !0;
    if (u & 16) return r ? ts(r, i, d) : !!i;
    if (u & 8) {
      const g = t.dynamicProps;
      for (let E = 0; E < g.length; E++) {
        const p = g[E];
        if (i[p] !== r[p] && !Pn(d, p)) return !0;
      }
    }
  } else
    return (l || c) && (!c || !c.$stable)
      ? !0
      : r === i
      ? !1
      : r
      ? i
        ? ts(r, i, d)
        : !0
      : !!i;
  return !1;
}
function ts(e, t, n) {
  const r = Object.keys(t);
  if (r.length !== Object.keys(e).length) return !0;
  for (let l = 0; l < r.length; l++) {
    const s = r[l];
    if (t[s] !== e[s] && !Pn(n, s)) return !0;
  }
  return !1;
}
function Ti({ vnode: e, parent: t }, n) {
  for (; t && t.subTree === e; ) ((e = t.vnode).el = n), (t = t.parent);
}
const Ii = (e) => e.__isSuspense;
function Ni(e, t) {
  t && t.pendingBranch
    ? W(e)
      ? t.effects.push(...e)
      : t.effects.push(e)
    : di(e);
}
function yi(e, t) {
  if (_e) {
    let n = _e.provides;
    const r = _e.parent && _e.parent.provides;
    r === n && (n = _e.provides = Object.create(r)), (n[e] = t);
  }
}
function hn(e, t, n = !1) {
  const r = _e || et;
  if (r) {
    const l =
      r.parent == null
        ? r.vnode.appContext && r.vnode.appContext.provides
        : r.parent.provides;
    if (l && e in l) return l[e];
    if (arguments.length > 1) return n && H(t) ? t.call(r.proxy) : t;
  }
}
const ns = {};
function xt(e, t, n) {
  return Cl(e, t, n);
}
function Cl(
  e,
  t,
  { immediate: n, deep: r, flush: l, onTrack: s, onTrigger: i } = z
) {
  const c = _e;
  let u,
    d = !1,
    g = !1;
  if (
    (he(e)
      ? ((u = () => e.value), (d = Ln(e)))
      : St(e)
      ? ((u = () => e), (r = !0))
      : W(e)
      ? ((g = !0),
        (d = e.some((_) => St(_) || Ln(_))),
        (u = () =>
          e.map((_) => {
            if (he(_)) return _.value;
            if (St(_)) return Ft(_);
            if (H(_)) return mt(_, c, 2);
          })))
      : H(e)
      ? t
        ? (u = () => mt(e, c, 2))
        : (u = () => {
            if (!(c && c.isUnmounted)) return E && E(), je(e, c, 3, [p]);
          })
      : (u = Ve),
    t && r)
  ) {
    const _ = u;
    u = () => Ft(_());
  }
  let E,
    p = (_) => {
      E = A.onStop = () => {
        mt(_, c, 4);
      };
    };
  if (sn)
    return (p = Ve), t ? n && je(t, c, 3, [u(), g ? [] : void 0, p]) : u(), Ve;
  let y = g ? [] : ns;
  const R = () => {
    if (!!A.active)
      if (t) {
        const _ = A.run();
        (r || d || (g ? _.some((v, k) => zt(v, y[k])) : zt(_, y))) &&
          (E && E(), je(t, c, 3, [_, y === ns ? void 0 : y, p]), (y = _));
      } else A.run();
  };
  R.allowRecurse = !!t;
  let F;
  l === "sync"
    ? (F = R)
    : l === "post"
    ? (F = () => Ce(R, c && c.suspense))
    : ((R.pre = !0), c && (R.id = c.uid), (F = () => Pr(R)));
  const A = new Nr(u, F);
  return (
    t
      ? n
        ? R()
        : (y = A.run())
      : l === "post"
      ? Ce(A.run.bind(A), c && c.suspense)
      : A.run(),
    () => {
      A.stop(), c && c.scope && Er(c.scope.effects, A);
    }
  );
}
function vi(e, t, n) {
  const r = this.proxy,
    l = de(e) ? (e.includes(".") ? Ol(r, e) : () => r[e]) : e.bind(r, r);
  let s;
  H(t) ? (s = t) : ((s = t.handler), (n = t));
  const i = _e;
  Ht(this);
  const c = Cl(l, s.bind(r), n);
  return i ? Ht(i) : Ct(), c;
}
function Ol(e, t) {
  const n = t.split(".");
  return () => {
    let r = e;
    for (let l = 0; l < n.length && r; l++) r = r[n[l]];
    return r;
  };
}
function Ft(e, t) {
  if (!se(e) || e.__v_skip || ((t = t || new Set()), t.has(e))) return e;
  if ((t.add(e), he(e))) Ft(e.value, t);
  else if (W(e)) for (let n = 0; n < e.length; n++) Ft(e[n], t);
  else if (Qs(e) || wt(e))
    e.forEach((n) => {
      Ft(n, t);
    });
  else if (el(e)) for (const n in e) Ft(e[n], t);
  return e;
}
function Al(e) {
  return H(e) ? { setup: e, name: e.name } : e;
}
const gn = (e) => !!e.type.__asyncLoader,
  kl = (e) => e.type.__isKeepAlive;
function Ci(e, t) {
  Fl(e, "a", t);
}
function Oi(e, t) {
  Fl(e, "da", t);
}
function Fl(e, t, n = _e) {
  const r =
    e.__wdc ||
    (e.__wdc = () => {
      let l = n;
      for (; l; ) {
        if (l.isDeactivated) return;
        l = l.parent;
      }
      return e();
    });
  if ((Mn(t, r, n), n)) {
    let l = n.parent;
    for (; l && l.parent; )
      kl(l.parent.vnode) && Ai(r, t, n, l), (l = l.parent);
  }
}
function Ai(e, t, n, r) {
  const l = Mn(t, e, r, !0);
  Rr(() => {
    Er(r[t], l);
  }, n);
}
function Mn(e, t, n = _e, r = !1) {
  if (n) {
    const l = n[e] || (n[e] = []),
      s =
        t.__weh ||
        (t.__weh = (...i) => {
          if (n.isUnmounted) return;
          Kt(), Ht(n);
          const c = je(t, n, e, i);
          return Ct(), Bt(), c;
        });
    return r ? l.unshift(s) : l.push(s), s;
  }
}
const ot =
    (e) =>
    (t, n = _e) =>
      (!sn || e === "sp") && Mn(e, t, n),
  Pl = ot("bm"),
  Rl = ot("m"),
  ki = ot("bu"),
  Fi = ot("u"),
  Pi = ot("bum"),
  Rr = ot("um"),
  Ri = ot("sp"),
  Mi = ot("rtg"),
  wi = ot("rtc");
function Si(e, t = _e) {
  Mn("ec", e, t);
}
function Lt(e, t, n, r) {
  const l = e.dirs,
    s = t && t.dirs;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    s && (c.oldValue = s[i].value);
    let u = c.dir[r];
    u && (Kt(), je(u, n, 8, [e.el, c, e, t]), Bt());
  }
}
const Di = Symbol();
function jn(e, t, n, r) {
  let l;
  const s = n && n[r];
  if (W(e) || de(e)) {
    l = new Array(e.length);
    for (let i = 0, c = e.length; i < c; i++)
      l[i] = t(e[i], i, void 0, s && s[i]);
  } else if (typeof e == "number") {
    l = new Array(e);
    for (let i = 0; i < e; i++) l[i] = t(i + 1, i, void 0, s && s[i]);
  } else if (se(e))
    if (e[Symbol.iterator])
      l = Array.from(e, (i, c) => t(i, c, void 0, s && s[c]));
    else {
      const i = Object.keys(e);
      l = new Array(i.length);
      for (let c = 0, u = i.length; c < u; c++) {
        const d = i[c];
        l[c] = t(e[d], d, c, s && s[c]);
      }
    }
  else l = [];
  return n && (n[r] = l), l;
}
const Zn = (e) => (e ? (Kl(e) ? Sr(e) || e.proxy : Zn(e.parent)) : null),
  Nn = ye(Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => Zn(e.parent),
    $root: (e) => Zn(e.root),
    $emit: (e) => e.emit,
    $options: (e) => wl(e),
    $forceUpdate: (e) => e.f || (e.f = () => Pr(e.update)),
    $nextTick: (e) => e.n || (e.n = ci.bind(e.proxy)),
    $watch: (e) => vi.bind(e),
  }),
  xi = {
    get({ _: e }, t) {
      const {
        ctx: n,
        setupState: r,
        data: l,
        props: s,
        accessCache: i,
        type: c,
        appContext: u,
      } = e;
      let d;
      if (t[0] !== "$") {
        const y = i[t];
        if (y !== void 0)
          switch (y) {
            case 1:
              return r[t];
            case 2:
              return l[t];
            case 4:
              return n[t];
            case 3:
              return s[t];
          }
        else {
          if (r !== z && Y(r, t)) return (i[t] = 1), r[t];
          if (l !== z && Y(l, t)) return (i[t] = 2), l[t];
          if ((d = e.propsOptions[0]) && Y(d, t)) return (i[t] = 3), s[t];
          if (n !== z && Y(n, t)) return (i[t] = 4), n[t];
          zn && (i[t] = 0);
        }
      }
      const g = Nn[t];
      let E, p;
      if (g) return t === "$attrs" && Pe(e, "get", t), g(e);
      if ((E = c.__cssModules) && (E = E[t])) return E;
      if (n !== z && Y(n, t)) return (i[t] = 4), n[t];
      if (((p = u.config.globalProperties), Y(p, t))) return p[t];
    },
    set({ _: e }, t, n) {
      const { data: r, setupState: l, ctx: s } = e;
      return l !== z && Y(l, t)
        ? ((l[t] = n), !0)
        : r !== z && Y(r, t)
        ? ((r[t] = n), !0)
        : Y(e.props, t) || (t[0] === "$" && t.slice(1) in e)
        ? !1
        : ((s[t] = n), !0);
    },
    has(
      {
        _: {
          data: e,
          setupState: t,
          accessCache: n,
          ctx: r,
          appContext: l,
          propsOptions: s,
        },
      },
      i
    ) {
      let c;
      return (
        !!n[i] ||
        (e !== z && Y(e, i)) ||
        (t !== z && Y(t, i)) ||
        ((c = s[0]) && Y(c, i)) ||
        Y(r, i) ||
        Y(Nn, i) ||
        Y(l.config.globalProperties, i)
      );
    },
    defineProperty(e, t, n) {
      return (
        n.get != null
          ? (e._.accessCache[t] = 0)
          : Y(n, "value") && this.set(e, t, n.value, null),
        Reflect.defineProperty(e, t, n)
      );
    },
  };
let zn = !0;
function $i(e) {
  const t = wl(e),
    n = e.proxy,
    r = e.ctx;
  (zn = !1), t.beforeCreate && rs(t.beforeCreate, e, "bc");
  const {
    data: l,
    computed: s,
    methods: i,
    watch: c,
    provide: u,
    inject: d,
    created: g,
    beforeMount: E,
    mounted: p,
    beforeUpdate: y,
    updated: R,
    activated: F,
    deactivated: A,
    beforeDestroy: _,
    beforeUnmount: v,
    destroyed: k,
    unmounted: T,
    render: I,
    renderTracked: S,
    renderTriggered: x,
    errorCaptured: ne,
    serverPrefetch: X,
    expose: le,
    inheritAttrs: ae,
    components: ge,
    directives: me,
    filters: tt,
  } = t;
  if ((d && Ui(d, r, null, e.appContext.config.unwrapInjectedRef), i))
    for (const K in i) {
      const G = i[K];
      H(G) && (r[K] = G.bind(n));
    }
  if (l) {
    const K = l.call(n, n);
    se(K) && (e.data = Or(K));
  }
  if (((zn = !0), s))
    for (const K in s) {
      const G = s[K],
        pe = H(G) ? G.bind(n, n) : H(G.get) ? G.get.bind(n, n) : Ve,
        rt = !H(G) && H(G.set) ? G.set.bind(n) : Ve,
        Se = We({ get: pe, set: rt });
      Object.defineProperty(r, K, {
        enumerable: !0,
        configurable: !0,
        get: () => Se.value,
        set: (Re) => (Se.value = Re),
      });
    }
  if (c) for (const K in c) Ml(c[K], r, n, K);
  if (u) {
    const K = H(u) ? u.call(n) : u;
    Reflect.ownKeys(K).forEach((G) => {
      yi(G, K[G]);
    });
  }
  g && rs(g, e, "c");
  function re(K, G) {
    W(G) ? G.forEach((pe) => K(pe.bind(n))) : G && K(G.bind(n));
  }
  if (
    (re(Pl, E),
    re(Rl, p),
    re(ki, y),
    re(Fi, R),
    re(Ci, F),
    re(Oi, A),
    re(Si, ne),
    re(wi, S),
    re(Mi, x),
    re(Pi, v),
    re(Rr, T),
    re(Ri, X),
    W(le))
  )
    if (le.length) {
      const K = e.exposed || (e.exposed = {});
      le.forEach((G) => {
        Object.defineProperty(K, G, {
          get: () => n[G],
          set: (pe) => (n[G] = pe),
        });
      });
    } else e.exposed || (e.exposed = {});
  I && e.render === Ve && (e.render = I),
    ae != null && (e.inheritAttrs = ae),
    ge && (e.components = ge),
    me && (e.directives = me);
}
function Ui(e, t, n = Ve, r = !1) {
  W(e) && (e = er(e));
  for (const l in e) {
    const s = e[l];
    let i;
    se(s)
      ? "default" in s
        ? (i = hn(s.from || l, s.default, !0))
        : (i = hn(s.from || l))
      : (i = hn(s)),
      he(i) && r
        ? Object.defineProperty(t, l, {
            enumerable: !0,
            configurable: !0,
            get: () => i.value,
            set: (c) => (i.value = c),
          })
        : (t[l] = i);
  }
}
function rs(e, t, n) {
  je(W(e) ? e.map((r) => r.bind(t.proxy)) : e.bind(t.proxy), t, n);
}
function Ml(e, t, n, r) {
  const l = r.includes(".") ? Ol(n, r) : () => n[r];
  if (de(e)) {
    const s = t[e];
    H(s) && xt(l, s);
  } else if (H(e)) xt(l, e.bind(n));
  else if (se(e))
    if (W(e)) e.forEach((s) => Ml(s, t, n, r));
    else {
      const s = H(e.handler) ? e.handler.bind(n) : t[e.handler];
      H(s) && xt(l, s, e);
    }
}
function wl(e) {
  const t = e.type,
    { mixins: n, extends: r } = t,
    {
      mixins: l,
      optionsCache: s,
      config: { optionMergeStrategies: i },
    } = e.appContext,
    c = s.get(t);
  let u;
  return (
    c
      ? (u = c)
      : !l.length && !n && !r
      ? (u = t)
      : ((u = {}), l.length && l.forEach((d) => yn(u, d, i, !0)), yn(u, t, i)),
    se(t) && s.set(t, u),
    u
  );
}
function yn(e, t, n, r = !1) {
  const { mixins: l, extends: s } = t;
  s && yn(e, s, n, !0), l && l.forEach((i) => yn(e, i, n, !0));
  for (const i in t)
    if (!(r && i === "expose")) {
      const c = Wi[i] || (n && n[i]);
      e[i] = c ? c(e[i], t[i]) : t[i];
    }
  return e;
}
const Wi = {
  data: ss,
  props: It,
  emits: It,
  methods: It,
  computed: It,
  beforeCreate: Te,
  created: Te,
  beforeMount: Te,
  mounted: Te,
  beforeUpdate: Te,
  updated: Te,
  beforeDestroy: Te,
  beforeUnmount: Te,
  destroyed: Te,
  unmounted: Te,
  activated: Te,
  deactivated: Te,
  errorCaptured: Te,
  serverPrefetch: Te,
  components: It,
  directives: It,
  watch: Vi,
  provide: ss,
  inject: Hi,
};
function ss(e, t) {
  return t
    ? e
      ? function () {
          return ye(
            H(e) ? e.call(this, this) : e,
            H(t) ? t.call(this, this) : t
          );
        }
      : t
    : e;
}
function Hi(e, t) {
  return It(er(e), er(t));
}
function er(e) {
  if (W(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
    return t;
  }
  return e;
}
function Te(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function It(e, t) {
  return e ? ye(ye(Object.create(null), e), t) : t;
}
function Vi(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = ye(Object.create(null), e);
  for (const r in t) n[r] = Te(e[r], t[r]);
  return n;
}
function ji(e, t, n, r = !1) {
  const l = {},
    s = {};
  En(s, Sn, 1), (e.propsDefaults = Object.create(null)), Sl(e, t, l, s);
  for (const i in e.propsOptions[0]) i in l || (l[i] = void 0);
  n ? (e.props = r ? l : ti(l)) : e.type.props ? (e.props = l) : (e.props = s),
    (e.attrs = s);
}
function Ki(e, t, n, r) {
  const {
      props: l,
      attrs: s,
      vnode: { patchFlag: i },
    } = e,
    c = q(l),
    [u] = e.propsOptions;
  let d = !1;
  if ((r || i > 0) && !(i & 16)) {
    if (i & 8) {
      const g = e.vnode.dynamicProps;
      for (let E = 0; E < g.length; E++) {
        let p = g[E];
        if (Pn(e.emitsOptions, p)) continue;
        const y = t[p];
        if (u)
          if (Y(s, p)) y !== s[p] && ((s[p] = y), (d = !0));
          else {
            const R = $t(p);
            l[R] = tr(u, c, R, y, e, !1);
          }
        else y !== s[p] && ((s[p] = y), (d = !0));
      }
    }
  } else {
    Sl(e, t, l, s) && (d = !0);
    let g;
    for (const E in c)
      (!t || (!Y(t, E) && ((g = jt(E)) === E || !Y(t, g)))) &&
        (u
          ? n &&
            (n[E] !== void 0 || n[g] !== void 0) &&
            (l[E] = tr(u, c, E, void 0, e, !0))
          : delete l[E]);
    if (s !== c)
      for (const E in s) (!t || (!Y(t, E) && !0)) && (delete s[E], (d = !0));
  }
  d && it(e, "set", "$attrs");
}
function Sl(e, t, n, r) {
  const [l, s] = e.propsOptions;
  let i = !1,
    c;
  if (t)
    for (let u in t) {
      if (_n(u)) continue;
      const d = t[u];
      let g;
      l && Y(l, (g = $t(u)))
        ? !s || !s.includes(g)
          ? (n[g] = d)
          : ((c || (c = {}))[g] = d)
        : Pn(e.emitsOptions, u) ||
          ((!(u in r) || d !== r[u]) && ((r[u] = d), (i = !0)));
    }
  if (s) {
    const u = q(n),
      d = c || z;
    for (let g = 0; g < s.length; g++) {
      const E = s[g];
      n[E] = tr(l, u, E, d[E], e, !Y(d, E));
    }
  }
  return i;
}
function tr(e, t, n, r, l, s) {
  const i = e[n];
  if (i != null) {
    const c = Y(i, "default");
    if (c && r === void 0) {
      const u = i.default;
      if (i.type !== Function && H(u)) {
        const { propsDefaults: d } = l;
        n in d ? (r = d[n]) : (Ht(l), (r = d[n] = u.call(null, t)), Ct());
      } else r = u;
    }
    i[0] &&
      (s && !c ? (r = !1) : i[1] && (r === "" || r === jt(n)) && (r = !0));
  }
  return r;
}
function Dl(e, t, n = !1) {
  const r = t.propsCache,
    l = r.get(e);
  if (l) return l;
  const s = e.props,
    i = {},
    c = [];
  let u = !1;
  if (!H(e)) {
    const g = (E) => {
      u = !0;
      const [p, y] = Dl(E, t, !0);
      ye(i, p), y && c.push(...y);
    };
    !n && t.mixins.length && t.mixins.forEach(g),
      e.extends && g(e.extends),
      e.mixins && e.mixins.forEach(g);
  }
  if (!s && !u) return se(e) && r.set(e, Mt), Mt;
  if (W(s))
    for (let g = 0; g < s.length; g++) {
      const E = $t(s[g]);
      ls(E) && (i[E] = z);
    }
  else if (s)
    for (const g in s) {
      const E = $t(g);
      if (ls(E)) {
        const p = s[g],
          y = (i[E] = W(p) || H(p) ? { type: p } : p);
        if (y) {
          const R = os(Boolean, y.type),
            F = os(String, y.type);
          (y[0] = R > -1),
            (y[1] = F < 0 || R < F),
            (R > -1 || Y(y, "default")) && c.push(E);
        }
      }
    }
  const d = [i, c];
  return se(e) && r.set(e, d), d;
}
function ls(e) {
  return e[0] !== "$";
}
function as(e) {
  const t = e && e.toString().match(/^\s*function (\w+)/);
  return t ? t[1] : e === null ? "null" : "";
}
function is(e, t) {
  return as(e) === as(t);
}
function os(e, t) {
  return W(t) ? t.findIndex((n) => is(n, e)) : H(t) && is(t, e) ? 0 : -1;
}
const xl = (e) => e[0] === "_" || e === "$stable",
  Mr = (e) => (W(e) ? e.map(qe) : [qe(e)]),
  Bi = (e, t, n) => {
    if (t._n) return t;
    const r = pi((...l) => Mr(t(...l)), n);
    return (r._c = !1), r;
  },
  $l = (e, t, n) => {
    const r = e._ctx;
    for (const l in e) {
      if (xl(l)) continue;
      const s = e[l];
      if (H(s)) t[l] = Bi(l, s, r);
      else if (s != null) {
        const i = Mr(s);
        t[l] = () => i;
      }
    }
  },
  Ul = (e, t) => {
    const n = Mr(t);
    e.slots.default = () => n;
  },
  Yi = (e, t) => {
    if (e.vnode.shapeFlag & 32) {
      const n = t._;
      n ? ((e.slots = q(t)), En(t, "_", n)) : $l(t, (e.slots = {}));
    } else (e.slots = {}), t && Ul(e, t);
    En(e.slots, Sn, 1);
  },
  Xi = (e, t, n) => {
    const { vnode: r, slots: l } = e;
    let s = !0,
      i = z;
    if (r.shapeFlag & 32) {
      const c = t._;
      c
        ? n && c === 1
          ? (s = !1)
          : (ye(l, t), !n && c === 1 && delete l._)
        : ((s = !t.$stable), $l(t, l)),
        (i = t);
    } else t && (Ul(e, t), (i = { default: 1 }));
    if (s) for (const c in l) !xl(c) && !(c in i) && delete l[c];
  };
function Wl() {
  return {
    app: null,
    config: {
      isNativeTag: La,
      performance: !1,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: void 0,
      warnHandler: void 0,
      compilerOptions: {},
    },
    mixins: [],
    components: {},
    directives: {},
    provides: Object.create(null),
    optionsCache: new WeakMap(),
    propsCache: new WeakMap(),
    emitsCache: new WeakMap(),
  };
}
let Gi = 0;
function Ji(e, t) {
  return function (r, l = null) {
    H(r) || (r = Object.assign({}, r)), l != null && !se(l) && (l = null);
    const s = Wl(),
      i = new Set();
    let c = !1;
    const u = (s.app = {
      _uid: Gi++,
      _component: r,
      _props: l,
      _container: null,
      _context: s,
      _instance: null,
      version: ho,
      get config() {
        return s.config;
      },
      set config(d) {},
      use(d, ...g) {
        return (
          i.has(d) ||
            (d && H(d.install)
              ? (i.add(d), d.install(u, ...g))
              : H(d) && (i.add(d), d(u, ...g))),
          u
        );
      },
      mixin(d) {
        return s.mixins.includes(d) || s.mixins.push(d), u;
      },
      component(d, g) {
        return g ? ((s.components[d] = g), u) : s.components[d];
      },
      directive(d, g) {
        return g ? ((s.directives[d] = g), u) : s.directives[d];
      },
      mount(d, g, E) {
        if (!c) {
          const p = Oe(r, l);
          return (
            (p.appContext = s),
            g && t ? t(p, d) : e(p, d, E),
            (c = !0),
            (u._container = d),
            (d.__vue_app__ = u),
            Sr(p.component) || p.component.proxy
          );
        }
      },
      unmount() {
        c && (e(null, u._container), delete u._container.__vue_app__);
      },
      provide(d, g) {
        return (s.provides[d] = g), u;
      },
    });
    return u;
  };
}
function nr(e, t, n, r, l = !1) {
  if (W(e)) {
    e.forEach((p, y) => nr(p, t && (W(t) ? t[y] : t), n, r, l));
    return;
  }
  if (gn(r) && !l) return;
  const s = r.shapeFlag & 4 ? Sr(r.component) || r.component.proxy : r.el,
    i = l ? null : s,
    { i: c, r: u } = e,
    d = t && t.r,
    g = c.refs === z ? (c.refs = {}) : c.refs,
    E = c.setupState;
  if (
    (d != null &&
      d !== u &&
      (de(d)
        ? ((g[d] = null), Y(E, d) && (E[d] = null))
        : he(d) && (d.value = null)),
    H(u))
  )
    mt(u, c, 12, [i, g]);
  else {
    const p = de(u),
      y = he(u);
    if (p || y) {
      const R = () => {
        if (e.f) {
          const F = p ? g[u] : u.value;
          l
            ? W(F) && Er(F, s)
            : W(F)
            ? F.includes(s) || F.push(s)
            : p
            ? ((g[u] = [s]), Y(E, u) && (E[u] = g[u]))
            : ((u.value = [s]), e.k && (g[e.k] = u.value));
        } else
          p
            ? ((g[u] = i), Y(E, u) && (E[u] = i))
            : y && ((u.value = i), e.k && (g[e.k] = i));
      };
      i ? ((R.id = -1), Ce(R, n)) : R();
    }
  }
}
const Ce = Ni;
function qi(e) {
  return Qi(e);
}
function Qi(e, t) {
  const n = Oa();
  n.__VUE__ = !0;
  const {
      insert: r,
      remove: l,
      patchProp: s,
      createElement: i,
      createText: c,
      createComment: u,
      setText: d,
      setElementText: g,
      parentNode: E,
      nextSibling: p,
      setScopeId: y = Ve,
      cloneNode: R,
      insertStaticContent: F,
    } = e,
    A = (
      o,
      a,
      f,
      h = null,
      b = null,
      N = null,
      P = !1,
      O = null,
      C = !!a.dynamicChildren
    ) => {
      if (o === a) return;
      o && !Xt(o, a) && ((h = Me(o)), Ae(o, b, N, !0), (o = null)),
        a.patchFlag === -2 && ((C = !1), (a.dynamicChildren = null));
      const { type: m, ref: L, shapeFlag: w } = a;
      switch (m) {
        case wn:
          _(o, a, f, h);
          break;
        case Ot:
          v(o, a, f, h);
          break;
        case Kn:
          o == null && k(a, f, h, P);
          break;
        case Ne:
          me(o, a, f, h, b, N, P, O, C);
          break;
        default:
          w & 1
            ? S(o, a, f, h, b, N, P, O, C)
            : w & 6
            ? tt(o, a, f, h, b, N, P, O, C)
            : (w & 64 || w & 128) && m.process(o, a, f, h, b, N, P, O, C, Le);
      }
      L != null && b && nr(L, o && o.ref, N, a || o, !a);
    },
    _ = (o, a, f, h) => {
      if (o == null) r((a.el = c(a.children)), f, h);
      else {
        const b = (a.el = o.el);
        a.children !== o.children && d(b, a.children);
      }
    },
    v = (o, a, f, h) => {
      o == null ? r((a.el = u(a.children || "")), f, h) : (a.el = o.el);
    },
    k = (o, a, f, h) => {
      [o.el, o.anchor] = F(o.children, a, f, h, o.el, o.anchor);
    },
    T = ({ el: o, anchor: a }, f, h) => {
      let b;
      for (; o && o !== a; ) (b = p(o)), r(o, f, h), (o = b);
      r(a, f, h);
    },
    I = ({ el: o, anchor: a }) => {
      let f;
      for (; o && o !== a; ) (f = p(o)), l(o), (o = f);
      l(a);
    },
    S = (o, a, f, h, b, N, P, O, C) => {
      (P = P || a.type === "svg"),
        o == null ? x(a, f, h, b, N, P, O, C) : le(o, a, b, N, P, O, C);
    },
    x = (o, a, f, h, b, N, P, O) => {
      let C, m;
      const {
        type: L,
        props: w,
        shapeFlag: D,
        transition: $,
        patchFlag: V,
        dirs: B,
      } = o;
      if (o.el && R !== void 0 && V === -1) C = o.el = R(o.el);
      else {
        if (
          ((C = o.el = i(o.type, N, w && w.is, w)),
          D & 8
            ? g(C, o.children)
            : D & 16 &&
              X(o.children, C, null, h, b, N && L !== "foreignObject", P, O),
          B && Lt(o, null, h, "created"),
          w)
        ) {
          for (const Z in w)
            Z !== "value" &&
              !_n(Z) &&
              s(C, Z, null, w[Z], N, o.children, h, b, Ee);
          "value" in w && s(C, "value", null, w.value),
            (m = w.onVnodeBeforeMount) && Xe(m, h, o);
        }
        ne(C, o, o.scopeId, P, h);
      }
      B && Lt(o, null, h, "beforeMount");
      const Q = (!b || (b && !b.pendingBranch)) && $ && !$.persisted;
      Q && $.beforeEnter(C),
        r(C, a, f),
        ((m = w && w.onVnodeMounted) || Q || B) &&
          Ce(() => {
            m && Xe(m, h, o), Q && $.enter(C), B && Lt(o, null, h, "mounted");
          }, b);
    },
    ne = (o, a, f, h, b) => {
      if ((f && y(o, f), h)) for (let N = 0; N < h.length; N++) y(o, h[N]);
      if (b) {
        let N = b.subTree;
        if (a === N) {
          const P = b.vnode;
          ne(o, P, P.scopeId, P.slotScopeIds, b.parent);
        }
      }
    },
    X = (o, a, f, h, b, N, P, O, C = 0) => {
      for (let m = C; m < o.length; m++) {
        const L = (o[m] = O ? ft(o[m]) : qe(o[m]));
        A(null, L, a, f, h, b, N, P, O);
      }
    },
    le = (o, a, f, h, b, N, P) => {
      const O = (a.el = o.el);
      let { patchFlag: C, dynamicChildren: m, dirs: L } = a;
      C |= o.patchFlag & 16;
      const w = o.props || z,
        D = a.props || z;
      let $;
      f && Tt(f, !1),
        ($ = D.onVnodeBeforeUpdate) && Xe($, f, a, o),
        L && Lt(a, o, f, "beforeUpdate"),
        f && Tt(f, !0);
      const V = b && a.type !== "foreignObject";
      if (
        (m
          ? ae(o.dynamicChildren, m, O, f, h, V, N)
          : P || pe(o, a, O, null, f, h, V, N, !1),
        C > 0)
      ) {
        if (C & 16) ge(O, a, w, D, f, h, b);
        else if (
          (C & 2 && w.class !== D.class && s(O, "class", null, D.class, b),
          C & 4 && s(O, "style", w.style, D.style, b),
          C & 8)
        ) {
          const B = a.dynamicProps;
          for (let Q = 0; Q < B.length; Q++) {
            const Z = B[Q],
              xe = w[Z],
              At = D[Z];
            (At !== xe || Z === "value") &&
              s(O, Z, xe, At, b, o.children, f, h, Ee);
          }
        }
        C & 1 && o.children !== a.children && g(O, a.children);
      } else !P && m == null && ge(O, a, w, D, f, h, b);
      (($ = D.onVnodeUpdated) || L) &&
        Ce(() => {
          $ && Xe($, f, a, o), L && Lt(a, o, f, "updated");
        }, h);
    },
    ae = (o, a, f, h, b, N, P) => {
      for (let O = 0; O < a.length; O++) {
        const C = o[O],
          m = a[O],
          L =
            C.el && (C.type === Ne || !Xt(C, m) || C.shapeFlag & 70)
              ? E(C.el)
              : f;
        A(C, m, L, null, h, b, N, P, !0);
      }
    },
    ge = (o, a, f, h, b, N, P) => {
      if (f !== h) {
        for (const O in h) {
          if (_n(O)) continue;
          const C = h[O],
            m = f[O];
          C !== m && O !== "value" && s(o, O, m, C, P, a.children, b, N, Ee);
        }
        if (f !== z)
          for (const O in f)
            !_n(O) && !(O in h) && s(o, O, f[O], null, P, a.children, b, N, Ee);
        "value" in h && s(o, "value", f.value, h.value);
      }
    },
    me = (o, a, f, h, b, N, P, O, C) => {
      const m = (a.el = o ? o.el : c("")),
        L = (a.anchor = o ? o.anchor : c(""));
      let { patchFlag: w, dynamicChildren: D, slotScopeIds: $ } = a;
      $ && (O = O ? O.concat($) : $),
        o == null
          ? (r(m, f, h), r(L, f, h), X(a.children, f, L, b, N, P, O, C))
          : w > 0 && w & 64 && D && o.dynamicChildren
          ? (ae(o.dynamicChildren, D, f, b, N, P, O),
            (a.key != null || (b && a === b.subTree)) && Hl(o, a, !0))
          : pe(o, a, f, L, b, N, P, O, C);
    },
    tt = (o, a, f, h, b, N, P, O, C) => {
      (a.slotScopeIds = O),
        o == null
          ? a.shapeFlag & 512
            ? b.ctx.activate(a, f, h, P, C)
            : nt(a, f, h, b, N, P, C)
          : re(o, a, C);
    },
    nt = (o, a, f, h, b, N, P) => {
      const O = (o.component = oo(o, h, b));
      if ((kl(o) && (O.ctx.renderer = Le), co(O), O.asyncDep)) {
        if ((b && b.registerDep(O, K), !o.el)) {
          const C = (O.subTree = Oe(Ot));
          v(null, C, a, f);
        }
        return;
      }
      K(O, o, a, f, b, N, P);
    },
    re = (o, a, f) => {
      const h = (a.component = o.component);
      if (Li(o, a, f))
        if (h.asyncDep && !h.asyncResolved) {
          G(h, a, f);
          return;
        } else (h.next = a), fi(h.update), h.update();
      else (a.el = o.el), (h.vnode = a);
    },
    K = (o, a, f, h, b, N, P) => {
      const O = () => {
          if (o.isMounted) {
            let { next: L, bu: w, u: D, parent: $, vnode: V } = o,
              B = L,
              Q;
            Tt(o, !1),
              L ? ((L.el = V.el), G(o, L, P)) : (L = V),
              w && Hn(w),
              (Q = L.props && L.props.onVnodeBeforeUpdate) && Xe(Q, $, L, V),
              Tt(o, !0);
            const Z = Vn(o),
              xe = o.subTree;
            (o.subTree = Z),
              A(xe, Z, E(xe.el), Me(xe), o, b, N),
              (L.el = Z.el),
              B === null && Ti(o, Z.el),
              D && Ce(D, b),
              (Q = L.props && L.props.onVnodeUpdated) &&
                Ce(() => Xe(Q, $, L, V), b);
          } else {
            let L;
            const { el: w, props: D } = a,
              { bm: $, m: V, parent: B } = o,
              Q = gn(a);
            if (
              (Tt(o, !1),
              $ && Hn($),
              !Q && (L = D && D.onVnodeBeforeMount) && Xe(L, B, a),
              Tt(o, !0),
              w && Be)
            ) {
              const Z = () => {
                (o.subTree = Vn(o)), Be(w, o.subTree, o, b, null);
              };
              Q
                ? a.type.__asyncLoader().then(() => !o.isUnmounted && Z())
                : Z();
            } else {
              const Z = (o.subTree = Vn(o));
              A(null, Z, f, h, o, b, N), (a.el = Z.el);
            }
            if ((V && Ce(V, b), !Q && (L = D && D.onVnodeMounted))) {
              const Z = a;
              Ce(() => Xe(L, B, Z), b);
            }
            (a.shapeFlag & 256 ||
              (B && gn(B.vnode) && B.vnode.shapeFlag & 256)) &&
              o.a &&
              Ce(o.a, b),
              (o.isMounted = !0),
              (a = f = h = null);
          }
        },
        C = (o.effect = new Nr(O, () => Pr(m), o.scope)),
        m = (o.update = () => C.run());
      (m.id = o.uid), Tt(o, !0), m();
    },
    G = (o, a, f) => {
      a.component = o;
      const h = o.vnode.props;
      (o.vnode = a),
        (o.next = null),
        Ki(o, a.props, h, f),
        Xi(o, a.children, f),
        Kt(),
        es(),
        Bt();
    },
    pe = (o, a, f, h, b, N, P, O, C = !1) => {
      const m = o && o.children,
        L = o ? o.shapeFlag : 0,
        w = a.children,
        { patchFlag: D, shapeFlag: $ } = a;
      if (D > 0) {
        if (D & 128) {
          Se(m, w, f, h, b, N, P, O, C);
          return;
        } else if (D & 256) {
          rt(m, w, f, h, b, N, P, O, C);
          return;
        }
      }
      $ & 8
        ? (L & 16 && Ee(m, b, N), w !== m && g(f, w))
        : L & 16
        ? $ & 16
          ? Se(m, w, f, h, b, N, P, O, C)
          : Ee(m, b, N, !0)
        : (L & 8 && g(f, ""), $ & 16 && X(w, f, h, b, N, P, O, C));
    },
    rt = (o, a, f, h, b, N, P, O, C) => {
      (o = o || Mt), (a = a || Mt);
      const m = o.length,
        L = a.length,
        w = Math.min(m, L);
      let D;
      for (D = 0; D < w; D++) {
        const $ = (a[D] = C ? ft(a[D]) : qe(a[D]));
        A(o[D], $, f, null, b, N, P, O, C);
      }
      m > L ? Ee(o, b, N, !0, !1, w) : X(a, f, h, b, N, P, O, C, w);
    },
    Se = (o, a, f, h, b, N, P, O, C) => {
      let m = 0;
      const L = a.length;
      let w = o.length - 1,
        D = L - 1;
      for (; m <= w && m <= D; ) {
        const $ = o[m],
          V = (a[m] = C ? ft(a[m]) : qe(a[m]));
        if (Xt($, V)) A($, V, f, null, b, N, P, O, C);
        else break;
        m++;
      }
      for (; m <= w && m <= D; ) {
        const $ = o[w],
          V = (a[D] = C ? ft(a[D]) : qe(a[D]));
        if (Xt($, V)) A($, V, f, null, b, N, P, O, C);
        else break;
        w--, D--;
      }
      if (m > w) {
        if (m <= D) {
          const $ = D + 1,
            V = $ < L ? a[$].el : h;
          for (; m <= D; )
            A(null, (a[m] = C ? ft(a[m]) : qe(a[m])), f, V, b, N, P, O, C), m++;
        }
      } else if (m > D) for (; m <= w; ) Ae(o[m], b, N, !0), m++;
      else {
        const $ = m,
          V = m,
          B = new Map();
        for (m = V; m <= D; m++) {
          const ke = (a[m] = C ? ft(a[m]) : qe(a[m]));
          ke.key != null && B.set(ke.key, m);
        }
        let Q,
          Z = 0;
        const xe = D - V + 1;
        let At = !1,
          jr = 0;
        const Yt = new Array(xe);
        for (m = 0; m < xe; m++) Yt[m] = 0;
        for (m = $; m <= w; m++) {
          const ke = o[m];
          if (Z >= xe) {
            Ae(ke, b, N, !0);
            continue;
          }
          let Ye;
          if (ke.key != null) Ye = B.get(ke.key);
          else
            for (Q = V; Q <= D; Q++)
              if (Yt[Q - V] === 0 && Xt(ke, a[Q])) {
                Ye = Q;
                break;
              }
          Ye === void 0
            ? Ae(ke, b, N, !0)
            : ((Yt[Ye - V] = m + 1),
              Ye >= jr ? (jr = Ye) : (At = !0),
              A(ke, a[Ye], f, null, b, N, P, O, C),
              Z++);
        }
        const Kr = At ? Zi(Yt) : Mt;
        for (Q = Kr.length - 1, m = xe - 1; m >= 0; m--) {
          const ke = V + m,
            Ye = a[ke],
            Br = ke + 1 < L ? a[ke + 1].el : h;
          Yt[m] === 0
            ? A(null, Ye, f, Br, b, N, P, O, C)
            : At && (Q < 0 || m !== Kr[Q] ? Re(Ye, f, Br, 2) : Q--);
        }
      }
    },
    Re = (o, a, f, h, b = null) => {
      const { el: N, type: P, transition: O, children: C, shapeFlag: m } = o;
      if (m & 6) {
        Re(o.component.subTree, a, f, h);
        return;
      }
      if (m & 128) {
        o.suspense.move(a, f, h);
        return;
      }
      if (m & 64) {
        P.move(o, a, f, Le);
        return;
      }
      if (P === Ne) {
        r(N, a, f);
        for (let w = 0; w < C.length; w++) Re(C[w], a, f, h);
        r(o.anchor, a, f);
        return;
      }
      if (P === Kn) {
        T(o, a, f);
        return;
      }
      if (h !== 2 && m & 1 && O)
        if (h === 0) O.beforeEnter(N), r(N, a, f), Ce(() => O.enter(N), b);
        else {
          const { leave: w, delayLeave: D, afterLeave: $ } = O,
            V = () => r(N, a, f),
            B = () => {
              w(N, () => {
                V(), $ && $();
              });
            };
          D ? D(N, V, B) : B();
        }
      else r(N, a, f);
    },
    Ae = (o, a, f, h = !1, b = !1) => {
      const {
        type: N,
        props: P,
        ref: O,
        children: C,
        dynamicChildren: m,
        shapeFlag: L,
        patchFlag: w,
        dirs: D,
      } = o;
      if ((O != null && nr(O, null, f, o, !0), L & 256)) {
        a.ctx.deactivate(o);
        return;
      }
      const $ = L & 1 && D,
        V = !gn(o);
      let B;
      if ((V && (B = P && P.onVnodeBeforeUnmount) && Xe(B, a, o), L & 6))
        Et(o.component, f, h);
      else {
        if (L & 128) {
          o.suspense.unmount(f, h);
          return;
        }
        $ && Lt(o, null, a, "beforeUnmount"),
          L & 64
            ? o.type.remove(o, a, f, b, Le, h)
            : m && (N !== Ne || (w > 0 && w & 64))
            ? Ee(m, a, f, !1, !0)
            : ((N === Ne && w & 384) || (!b && L & 16)) && Ee(C, a, f),
          h && st(o);
      }
      ((V && (B = P && P.onVnodeUnmounted)) || $) &&
        Ce(() => {
          B && Xe(B, a, o), $ && Lt(o, null, a, "unmounted");
        }, f);
    },
    st = (o) => {
      const { type: a, el: f, anchor: h, transition: b } = o;
      if (a === Ne) {
        bt(f, h);
        return;
      }
      if (a === Kn) {
        I(o);
        return;
      }
      const N = () => {
        l(f), b && !b.persisted && b.afterLeave && b.afterLeave();
      };
      if (o.shapeFlag & 1 && b && !b.persisted) {
        const { leave: P, delayLeave: O } = b,
          C = () => P(f, N);
        O ? O(o.el, N, C) : C();
      } else N();
    },
    bt = (o, a) => {
      let f;
      for (; o !== a; ) (f = p(o)), l(o), (o = f);
      l(a);
    },
    Et = (o, a, f) => {
      const { bum: h, scope: b, update: N, subTree: P, um: O } = o;
      h && Hn(h),
        b.stop(),
        N && ((N.active = !1), Ae(P, o, a, f)),
        O && Ce(O, a),
        Ce(() => {
          o.isUnmounted = !0;
        }, a),
        a &&
          a.pendingBranch &&
          !a.isUnmounted &&
          o.asyncDep &&
          !o.asyncResolved &&
          o.suspenseId === a.pendingId &&
          (a.deps--, a.deps === 0 && a.resolve());
    },
    Ee = (o, a, f, h = !1, b = !1, N = 0) => {
      for (let P = N; P < o.length; P++) Ae(o[P], a, f, h, b);
    },
    Me = (o) =>
      o.shapeFlag & 6
        ? Me(o.component.subTree)
        : o.shapeFlag & 128
        ? o.suspense.next()
        : p(o.anchor || o.el),
    Ke = (o, a, f) => {
      o == null
        ? a._vnode && Ae(a._vnode, null, null, !0)
        : A(a._vnode || null, o, a, null, null, null, f),
        es(),
        Nl(),
        (a._vnode = o);
    },
    Le = {
      p: A,
      um: Ae,
      m: Re,
      r: st,
      mt: nt,
      mc: X,
      pc: pe,
      pbc: ae,
      n: Me,
      o: e,
    };
  let De, Be;
  return (
    t && ([De, Be] = t(Le)), { render: Ke, hydrate: De, createApp: Ji(Ke, De) }
  );
}
function Tt({ effect: e, update: t }, n) {
  e.allowRecurse = t.allowRecurse = n;
}
function Hl(e, t, n = !1) {
  const r = e.children,
    l = t.children;
  if (W(r) && W(l))
    for (let s = 0; s < r.length; s++) {
      const i = r[s];
      let c = l[s];
      c.shapeFlag & 1 &&
        !c.dynamicChildren &&
        ((c.patchFlag <= 0 || c.patchFlag === 32) &&
          ((c = l[s] = ft(l[s])), (c.el = i.el)),
        n || Hl(i, c));
    }
}
function Zi(e) {
  const t = e.slice(),
    n = [0];
  let r, l, s, i, c;
  const u = e.length;
  for (r = 0; r < u; r++) {
    const d = e[r];
    if (d !== 0) {
      if (((l = n[n.length - 1]), e[l] < d)) {
        (t[r] = l), n.push(r);
        continue;
      }
      for (s = 0, i = n.length - 1; s < i; )
        (c = (s + i) >> 1), e[n[c]] < d ? (s = c + 1) : (i = c);
      d < e[n[s]] && (s > 0 && (t[r] = n[s - 1]), (n[s] = r));
    }
  }
  for (s = n.length, i = n[s - 1]; s-- > 0; ) (n[s] = i), (i = t[i]);
  return n;
}
const zi = (e) => e.__isTeleport,
  Ne = Symbol(void 0),
  wn = Symbol(void 0),
  Ot = Symbol(void 0),
  Kn = Symbol(void 0),
  qt = [];
let He = null;
function we(e = !1) {
  qt.push((He = e ? null : []));
}
function eo() {
  qt.pop(), (He = qt[qt.length - 1] || null);
}
let nn = 1;
function cs(e) {
  nn += e;
}
function Vl(e) {
  return (
    (e.dynamicChildren = nn > 0 ? He || Mt : null),
    eo(),
    nn > 0 && He && He.push(e),
    e
  );
}
function $e(e, t, n, r, l, s) {
  return Vl(Fe(e, t, n, r, l, s, !0));
}
function to(e, t, n, r, l) {
  return Vl(Oe(e, t, n, r, l, !0));
}
function rr(e) {
  return e ? e.__v_isVNode === !0 : !1;
}
function Xt(e, t) {
  return e.type === t.type && e.key === t.key;
}
const Sn = "__vInternal",
  jl = ({ key: e }) => (e != null ? e : null),
  pn = ({ ref: e, ref_key: t, ref_for: n }) =>
    e != null
      ? de(e) || he(e) || H(e)
        ? { i: et, r: e, k: t, f: !!n }
        : e
      : null;
function Fe(
  e,
  t = null,
  n = null,
  r = 0,
  l = null,
  s = e === Ne ? 0 : 1,
  i = !1,
  c = !1
) {
  const u = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && jl(t),
    ref: t && pn(t),
    scopeId: Rn,
    slotScopeIds: null,
    children: n,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag: s,
    patchFlag: r,
    dynamicProps: l,
    dynamicChildren: null,
    appContext: null,
  };
  return (
    c
      ? (wr(u, n), s & 128 && e.normalize(u))
      : n && (u.shapeFlag |= de(n) ? 8 : 16),
    nn > 0 &&
      !i &&
      He &&
      (u.patchFlag > 0 || s & 6) &&
      u.patchFlag !== 32 &&
      He.push(u),
    u
  );
}
const Oe = no;
function no(e, t = null, n = null, r = 0, l = null, s = !1) {
  if (((!e || e === Di) && (e = Ot), rr(e))) {
    const c = Wt(e, t, !0);
    return (
      n && wr(c, n),
      nn > 0 &&
        !s &&
        He &&
        (c.shapeFlag & 6 ? (He[He.indexOf(e)] = c) : He.push(c)),
      (c.patchFlag |= -2),
      c
    );
  }
  if ((_o(e) && (e = e.__vccOpts), t)) {
    t = ro(t);
    let { class: c, style: u } = t;
    c && !de(c) && (t.class = vn(c)),
      se(u) && (_l(u) && !W(u) && (u = ye({}, u)), (t.style = pr(u)));
  }
  const i = de(e) ? 1 : Ii(e) ? 128 : zi(e) ? 64 : se(e) ? 4 : H(e) ? 2 : 0;
  return Fe(e, t, n, r, l, i, s, !0);
}
function ro(e) {
  return e ? (_l(e) || Sn in e ? ye({}, e) : e) : null;
}
function Wt(e, t, n = !1) {
  const { props: r, ref: l, patchFlag: s, children: i } = e,
    c = t ? lo(r || {}, t) : r;
  return {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e.type,
    props: c,
    key: c && jl(c),
    ref:
      t && t.ref ? (n && l ? (W(l) ? l.concat(pn(t)) : [l, pn(t)]) : pn(t)) : l,
    scopeId: e.scopeId,
    slotScopeIds: e.slotScopeIds,
    children: i,
    target: e.target,
    targetAnchor: e.targetAnchor,
    staticCount: e.staticCount,
    shapeFlag: e.shapeFlag,
    patchFlag: t && e.type !== Ne ? (s === -1 ? 16 : s | 16) : s,
    dynamicProps: e.dynamicProps,
    dynamicChildren: e.dynamicChildren,
    appContext: e.appContext,
    dirs: e.dirs,
    transition: e.transition,
    component: e.component,
    suspense: e.suspense,
    ssContent: e.ssContent && Wt(e.ssContent),
    ssFallback: e.ssFallback && Wt(e.ssFallback),
    el: e.el,
    anchor: e.anchor,
  };
}
function so(e = " ", t = 0) {
  return Oe(wn, null, e, t);
}
function bn(e = "", t = !1) {
  return t ? (we(), to(Ot, null, e)) : Oe(Ot, null, e);
}
function qe(e) {
  return e == null || typeof e == "boolean"
    ? Oe(Ot)
    : W(e)
    ? Oe(Ne, null, e.slice())
    : typeof e == "object"
    ? ft(e)
    : Oe(wn, null, String(e));
}
function ft(e) {
  return e.el === null || e.memo ? e : Wt(e);
}
function wr(e, t) {
  let n = 0;
  const { shapeFlag: r } = e;
  if (t == null) t = null;
  else if (W(t)) n = 16;
  else if (typeof t == "object")
    if (r & 65) {
      const l = t.default;
      l && (l._c && (l._d = !1), wr(e, l()), l._c && (l._d = !0));
      return;
    } else {
      n = 32;
      const l = t._;
      !l && !(Sn in t)
        ? (t._ctx = et)
        : l === 3 &&
          et &&
          (et.slots._ === 1 ? (t._ = 1) : ((t._ = 2), (e.patchFlag |= 1024)));
    }
  else
    H(t)
      ? ((t = { default: t, _ctx: et }), (n = 32))
      : ((t = String(t)), r & 64 ? ((n = 16), (t = [so(t)])) : (n = 8));
  (e.children = t), (e.shapeFlag |= n);
}
function lo(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const r = e[n];
    for (const l in r)
      if (l === "class")
        t.class !== r.class && (t.class = vn([t.class, r.class]));
      else if (l === "style") t.style = pr([t.style, r.style]);
      else if (Cn(l)) {
        const s = t[l],
          i = r[l];
        i &&
          s !== i &&
          !(W(s) && s.includes(i)) &&
          (t[l] = s ? [].concat(s, i) : i);
      } else l !== "" && (t[l] = r[l]);
  }
  return t;
}
function Xe(e, t, n, r = null) {
  je(e, t, 7, [n, r]);
}
const ao = Wl();
let io = 0;
function oo(e, t, n) {
  const r = e.type,
    l = (t ? t.appContext : e.appContext) || ao,
    s = {
      uid: io++,
      vnode: e,
      type: r,
      parent: t,
      appContext: l,
      root: null,
      next: null,
      subTree: null,
      effect: null,
      update: null,
      scope: new nl(!0),
      render: null,
      proxy: null,
      exposed: null,
      exposeProxy: null,
      withProxy: null,
      provides: t ? t.provides : Object.create(l.provides),
      accessCache: null,
      renderCache: [],
      components: null,
      directives: null,
      propsOptions: Dl(r, l),
      emitsOptions: vl(r, l),
      emit: null,
      emitted: null,
      propsDefaults: z,
      inheritAttrs: r.inheritAttrs,
      ctx: z,
      data: z,
      props: z,
      attrs: z,
      slots: z,
      refs: z,
      setupState: z,
      setupContext: null,
      suspense: n,
      suspenseId: n ? n.pendingId : 0,
      asyncDep: null,
      asyncResolved: !1,
      isMounted: !1,
      isUnmounted: !1,
      isDeactivated: !1,
      bc: null,
      c: null,
      bm: null,
      m: null,
      bu: null,
      u: null,
      um: null,
      bum: null,
      da: null,
      a: null,
      rtg: null,
      rtc: null,
      ec: null,
      sp: null,
    };
  return (
    (s.ctx = { _: s }),
    (s.root = t ? t.root : s),
    (s.emit = _i.bind(null, s)),
    e.ce && e.ce(s),
    s
  );
}
let _e = null;
const rn = () => _e || et,
  Ht = (e) => {
    (_e = e), e.scope.on();
  },
  Ct = () => {
    _e && _e.scope.off(), (_e = null);
  };
function Kl(e) {
  return e.vnode.shapeFlag & 4;
}
let sn = !1;
function co(e, t = !1) {
  sn = t;
  const { props: n, children: r } = e.vnode,
    l = Kl(e);
  ji(e, n, l, t), Yi(e, r);
  const s = l ? uo(e, t) : void 0;
  return (sn = !1), s;
}
function uo(e, t) {
  const n = e.type;
  (e.accessCache = Object.create(null)), (e.proxy = hl(new Proxy(e.ctx, xi)));
  const { setup: r } = n;
  if (r) {
    const l = (e.setupContext = r.length > 1 ? mo(e) : null);
    Ht(e), Kt();
    const s = mt(r, e, 0, [e.props, l]);
    if ((Bt(), Ct(), Zs(s))) {
      if ((s.then(Ct, Ct), t))
        return s
          .then((i) => {
            us(e, i, t);
          })
          .catch((i) => {
            Fn(i, e, 0);
          });
      e.asyncDep = s;
    } else us(e, s, t);
  } else Bl(e, t);
}
function us(e, t, n) {
  H(t)
    ? e.type.__ssrInlineRender
      ? (e.ssrRender = t)
      : (e.render = t)
    : se(t) && (e.setupState = El(t)),
    Bl(e, n);
}
let fs;
function Bl(e, t, n) {
  const r = e.type;
  if (!e.render) {
    if (!t && fs && !r.render) {
      const l = r.template;
      if (l) {
        const { isCustomElement: s, compilerOptions: i } = e.appContext.config,
          { delimiters: c, compilerOptions: u } = r,
          d = ye(ye({ isCustomElement: s, delimiters: c }, i), u);
        r.render = fs(l, d);
      }
    }
    e.render = r.render || Ve;
  }
  Ht(e), Kt(), $i(e), Bt(), Ct();
}
function fo(e) {
  return new Proxy(e.attrs, {
    get(t, n) {
      return Pe(e, "get", "$attrs"), t[n];
    },
  });
}
function mo(e) {
  const t = (r) => {
    e.exposed = r || {};
  };
  let n;
  return {
    get attrs() {
      return n || (n = fo(e));
    },
    slots: e.slots,
    emit: e.emit,
    expose: t,
  };
}
function Sr(e) {
  if (e.exposed)
    return (
      e.exposeProxy ||
      (e.exposeProxy = new Proxy(El(hl(e.exposed)), {
        get(t, n) {
          if (n in t) return t[n];
          if (n in Nn) return Nn[n](e);
        },
      }))
    );
}
function _o(e) {
  return H(e) && "__vccOpts" in e;
}
const We = (e, t) => ii(e, t, sn);
function Yl(e, t, n) {
  const r = arguments.length;
  return r === 2
    ? se(t) && !W(t)
      ? rr(t)
        ? Oe(e, null, [t])
        : Oe(e, t)
      : Oe(e, null, t)
    : (r > 3
        ? (n = Array.prototype.slice.call(arguments, 2))
        : r === 3 && rr(n) && (n = [n]),
      Oe(e, t, n));
}
const ho = "3.2.38",
  go = "http://www.w3.org/2000/svg",
  yt = typeof document < "u" ? document : null,
  ds = yt && yt.createElement("template"),
  po = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, r) => {
      const l = t
        ? yt.createElementNS(go, e)
        : yt.createElement(e, n ? { is: n } : void 0);
      return (
        e === "select" &&
          r &&
          r.multiple != null &&
          l.setAttribute("multiple", r.multiple),
        l
      );
    },
    createText: (e) => yt.createTextNode(e),
    createComment: (e) => yt.createComment(e),
    setText: (e, t) => {
      e.nodeValue = t;
    },
    setElementText: (e, t) => {
      e.textContent = t;
    },
    parentNode: (e) => e.parentNode,
    nextSibling: (e) => e.nextSibling,
    querySelector: (e) => yt.querySelector(e),
    setScopeId(e, t) {
      e.setAttribute(t, "");
    },
    cloneNode(e) {
      const t = e.cloneNode(!0);
      return "_value" in e && (t._value = e._value), t;
    },
    insertStaticContent(e, t, n, r, l, s) {
      const i = n ? n.previousSibling : t.lastChild;
      if (l && (l === s || l.nextSibling))
        for (
          ;
          t.insertBefore(l.cloneNode(!0), n),
            !(l === s || !(l = l.nextSibling));

        );
      else {
        ds.innerHTML = r ? `<svg>${e}</svg>` : e;
        const c = ds.content;
        if (r) {
          const u = c.firstChild;
          for (; u.firstChild; ) c.appendChild(u.firstChild);
          c.removeChild(u);
        }
        t.insertBefore(c, n);
      }
      return [
        i ? i.nextSibling : t.firstChild,
        n ? n.previousSibling : t.lastChild,
      ];
    },
  };
function bo(e, t, n) {
  const r = e._vtc;
  r && (t = (t ? [t, ...r] : [...r]).join(" ")),
    t == null
      ? e.removeAttribute("class")
      : n
      ? e.setAttribute("class", t)
      : (e.className = t);
}
function Eo(e, t, n) {
  const r = e.style,
    l = de(n);
  if (n && !l) {
    for (const s in n) sr(r, s, n[s]);
    if (t && !de(t)) for (const s in t) n[s] == null && sr(r, s, "");
  } else {
    const s = r.display;
    l ? t !== n && (r.cssText = n) : t && e.removeAttribute("style"),
      "_vod" in e && (r.display = s);
  }
}
const ms = /\s*!important$/;
function sr(e, t, n) {
  if (W(n)) n.forEach((r) => sr(e, t, r));
  else if ((n == null && (n = ""), t.startsWith("--"))) e.setProperty(t, n);
  else {
    const r = Lo(e, t);
    ms.test(n)
      ? e.setProperty(jt(r), n.replace(ms, ""), "important")
      : (e[r] = n);
  }
}
const _s = ["Webkit", "Moz", "ms"],
  Bn = {};
function Lo(e, t) {
  const n = Bn[t];
  if (n) return n;
  let r = $t(t);
  if (r !== "filter" && r in e) return (Bn[t] = r);
  r = tl(r);
  for (let l = 0; l < _s.length; l++) {
    const s = _s[l] + r;
    if (s in e) return (Bn[t] = s);
  }
  return t;
}
const hs = "http://www.w3.org/1999/xlink";
function To(e, t, n, r, l) {
  if (r && t.startsWith("xlink:"))
    n == null
      ? e.removeAttributeNS(hs, t.slice(6, t.length))
      : e.setAttributeNS(hs, t, n);
  else {
    const s = ga(t);
    n == null || (s && !Js(n))
      ? e.removeAttribute(t)
      : e.setAttribute(t, s ? "" : n);
  }
}
function Io(e, t, n, r, l, s, i) {
  if (t === "innerHTML" || t === "textContent") {
    r && i(r, l, s), (e[t] = n == null ? "" : n);
    return;
  }
  if (t === "value" && e.tagName !== "PROGRESS" && !e.tagName.includes("-")) {
    e._value = n;
    const u = n == null ? "" : n;
    (e.value !== u || e.tagName === "OPTION") && (e.value = u),
      n == null && e.removeAttribute(t);
    return;
  }
  let c = !1;
  if (n === "" || n == null) {
    const u = typeof e[t];
    u === "boolean"
      ? (n = Js(n))
      : n == null && u === "string"
      ? ((n = ""), (c = !0))
      : u === "number" && ((n = 0), (c = !0));
  }
  try {
    e[t] = n;
  } catch {}
  c && e.removeAttribute(t);
}
const [Xl, No] = (() => {
  let e = Date.now,
    t = !1;
  if (typeof window < "u") {
    Date.now() > document.createEvent("Event").timeStamp &&
      (e = performance.now.bind(performance));
    const n = navigator.userAgent.match(/firefox\/(\d+)/i);
    t = !!(n && Number(n[1]) <= 53);
  }
  return [e, t];
})();
let lr = 0;
const yo = Promise.resolve(),
  vo = () => {
    lr = 0;
  },
  Co = () => lr || (yo.then(vo), (lr = Xl()));
function Oo(e, t, n, r) {
  e.addEventListener(t, n, r);
}
function Ao(e, t, n, r) {
  e.removeEventListener(t, n, r);
}
function ko(e, t, n, r, l = null) {
  const s = e._vei || (e._vei = {}),
    i = s[t];
  if (r && i) i.value = r;
  else {
    const [c, u] = Fo(t);
    if (r) {
      const d = (s[t] = Po(r, l));
      Oo(e, c, d, u);
    } else i && (Ao(e, c, i, u), (s[t] = void 0));
  }
}
const gs = /(?:Once|Passive|Capture)$/;
function Fo(e) {
  let t;
  if (gs.test(e)) {
    t = {};
    let r;
    for (; (r = e.match(gs)); )
      (e = e.slice(0, e.length - r[0].length)), (t[r[0].toLowerCase()] = !0);
  }
  return [e[2] === ":" ? e.slice(3) : jt(e.slice(2)), t];
}
function Po(e, t) {
  const n = (r) => {
    const l = r.timeStamp || Xl();
    (No || l >= n.attached - 1) && je(Ro(r, n.value), t, 5, [r]);
  };
  return (n.value = e), (n.attached = Co()), n;
}
function Ro(e, t) {
  if (W(t)) {
    const n = e.stopImmediatePropagation;
    return (
      (e.stopImmediatePropagation = () => {
        n.call(e), (e._stopped = !0);
      }),
      t.map((r) => (l) => !l._stopped && r && r(l))
    );
  } else return t;
}
const ps = /^on[a-z]/,
  Mo = (e, t, n, r, l = !1, s, i, c, u) => {
    t === "class"
      ? bo(e, r, l)
      : t === "style"
      ? Eo(e, n, r)
      : Cn(t)
      ? br(t) || ko(e, t, n, r, i)
      : (
          t[0] === "."
            ? ((t = t.slice(1)), !0)
            : t[0] === "^"
            ? ((t = t.slice(1)), !1)
            : wo(e, t, r, l)
        )
      ? Io(e, t, r, s, i, c, u)
      : (t === "true-value"
          ? (e._trueValue = r)
          : t === "false-value" && (e._falseValue = r),
        To(e, t, r, l));
  };
function wo(e, t, n, r) {
  return r
    ? !!(
        t === "innerHTML" ||
        t === "textContent" ||
        (t in e && ps.test(t) && H(n))
      )
    : t === "spellcheck" ||
      t === "draggable" ||
      t === "translate" ||
      t === "form" ||
      (t === "list" && e.tagName === "INPUT") ||
      (t === "type" && e.tagName === "TEXTAREA") ||
      (ps.test(t) && de(n))
    ? !1
    : t in e;
}
const So = ["ctrl", "shift", "alt", "meta"],
  Do = {
    stop: (e) => e.stopPropagation(),
    prevent: (e) => e.preventDefault(),
    self: (e) => e.target !== e.currentTarget,
    ctrl: (e) => !e.ctrlKey,
    shift: (e) => !e.shiftKey,
    alt: (e) => !e.altKey,
    meta: (e) => !e.metaKey,
    left: (e) => "button" in e && e.button !== 0,
    middle: (e) => "button" in e && e.button !== 1,
    right: (e) => "button" in e && e.button !== 2,
    exact: (e, t) => So.some((n) => e[`${n}Key`] && !t.includes(n)),
  },
  xo =
    (e, t) =>
    (n, ...r) => {
      for (let l = 0; l < t.length; l++) {
        const s = Do[t[l]];
        if (s && s(n, t)) return;
      }
      return e(n, ...r);
    },
  $o = ye({ patchProp: Mo }, po);
let bs;
function Uo() {
  return bs || (bs = qi($o));
}
const Es = (...e) => {
  const t = Uo().createApp(...e),
    { mount: n } = t;
  return (
    (t.mount = (r) => {
      const l = Wo(r);
      if (!l) return;
      const s = t._component;
      !H(s) && !s.render && !s.template && (s.template = l.innerHTML),
        (l.innerHTML = "");
      const i = n(l, !1, l instanceof SVGElement);
      return (
        l instanceof Element &&
          (l.removeAttribute("v-cloak"), l.setAttribute("data-v-app", "")),
        i
      );
    }),
    t
  );
};
function Wo(e) {
  return de(e) ? document.querySelector(e) : e;
}
const Ho = Al({
  data() {
    return { connecting: !1, code: "", error: "" };
  },
  methods: {
    async submit() {
      this.$data.code.length === 5 &&
        ((this.connecting = !0),
        await this.fetch(),
        (this.connecting = !1),
        this.$nextTick(() => this.$refs.input.focus()));
    },
    async fetch() {
      const e = await fetch(
          `https://ktane.timwi.de/custom-keys?code=${this.$data.code}`
        ),
        t = await e.text();
      e.status !== 200 ? (this.error = t) : window.postMessage({ ttksData: t });
    },
    input(e) {
      (this.error = ""),
        (this.$data.code = e.target.value.replace(/[^0-9]/g, ""));
    },
  },
});
const Gl = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [r, l] of t) n[r] = l;
    return n;
  },
  Vo = (e) => (hi("data-v-9d12f7eb"), (e = e()), gi(), e),
  jo = { key: 0, class: "error-text" },
  Ko = ["value", "disabled"],
  Bo = Vo(() => Fe("br", null, null, -1)),
  Yo = ["disabled"];
function Xo(e, t, n, r, l, s) {
  return (
    we(),
    $e(
      "form",
      {
        onSubmit:
          t[1] ||
          (t[1] = xo((...i) => e.submit && e.submit(...i), ["prevent"])),
      },
      [
        e.error ? (we(), $e("p", jo, kt(e.$t("form.error")), 1)) : bn("", !0),
        Fe(
          "input",
          {
            ref: "input",
            type: "text",
            class: vn({ error: e.error }),
            value: e.code,
            onInput: t[0] || (t[0] = (...i) => e.input && e.input(...i)),
            placeholder: "12345",
            maxlength: "5",
            autocomplete: "off",
            disabled: e.connecting,
          },
          null,
          42,
          Ko
        ),
        Bo,
        Fe(
          "button",
          { type: "submit", disabled: e.connecting },
          kt(e.$t("form.submit")),
          9,
          Yo
        ),
      ],
      32
    )
  );
}
const Go = Gl(Ho, [
    ["render", Xo],
    ["__scopeId", "data-v-9d12f7eb"],
  ]),
  Jo = Al({
    data() {
      return { raw: "" };
    },
    computed: {
      keys() {
        return this.raw
          ? this.raw.split("|").map((t) => {
              const [n, r] = t.split(":");
              return {
                key: n,
                sections: r.split("#").map((l) => {
                  const [s, i] = l.split("!");
                  return {
                    section: s,
                    modules: i.split(",").map((c) => decodeURIComponent(c)),
                  };
                }),
              };
            })
          : null;
      },
    },
    mounted() {
      window.addEventListener("message", (e) => {
        const t = e.data.ttksData;
        t &&
          ((this.raw = t),
          (document.querySelector("#ttks-page-number").innerHTML =
            "Page 1 of 2"),
            (document.querySelector("#ttks-content").classList.add("page", "page-bg-02")),
          this.$nextTick(() => this.$refs.page.scrollIntoView()));
      });
    },
  }),
  qo = { key: 0, ref: "page" },
  Qo = Fe(
    "div",
    { class: "page-header" },
    [
      Fe(
        "span",
        { class: "page-header-doc-title" },
        "Keep Talking and Nobody Explodes Mod"
      ),
      Fe("span", { class: "page-header-section-title" }, "Custom Keys"),
    ],
    -1
  ),
  Zo = { class: "page-content" },
  zo = ["innerHTML"],
  ec = { key: 0 },
  tc = { key: 1 },
  nc = Fe("div", { class: "page-footer relative-footer" }, "Page 2 of 2", -1);
function rc(e, t, n, r, l, s) {
  return e.raw
    ? (we(),
      $e(
        "div",
        qo,
        [
          Qo,
          Fe("div", Zo, [
            (we(!0),
            $e(
              Ne,
              null,
              jn(
                e.keys,
                (i) => (
                  we(),
                  $e(
                    Ne,
                    null,
                    [
                      Fe(
                        "h3",
                        null,
                        kt(e.$t(`content.keys.${i.key}.header`)),
                        1
                      ),
                      (we(!0),
                      $e(
                        Ne,
                        null,
                        jn(
                          i.sections,
                          (c) => (
                            we(),
                            $e(
                              Ne,
                              null,
                              [
                                Fe(
                                  "p",
                                  {
                                    innerHTML: e.$t(
                                      `content.rules.${c.section}.text`,
                                      { key: i.key }
                                    ),
                                  },
                                  null,
                                  8,
                                  zo
                                ),
                                Fe("ul", null, [
                                  i.key === "left" && c.section === "after"
                                    ? (we(),
                                      $e(
                                        "li",
                                        ec,
                                        kt(e.$t("content.keys.left.rule")),
                                        1
                                      ))
                                    : bn("", !0),
                                  i.key === "right" && c.section === "before"
                                    ? (we(),
                                      $e(
                                        "li",
                                        tc,
                                        kt(e.$t("content.keys.right.rule")),
                                        1
                                      ))
                                    : bn("", !0),
                                  (we(!0),
                                  $e(
                                    Ne,
                                    null,
                                    jn(
                                      c.modules,
                                      (u) => (
                                        we(),
                                        $e(
                                          "li",
                                          null,
                                          kt(
                                            e.$t(
                                              `content.rules.${c.section}.mods`,
                                              { mod: u }
                                            )
                                          ),
                                          1
                                        )
                                      )
                                    ),
                                    256
                                  )),
                                ]),
                              ],
                              64
                            )
                          )
                        ),
                        256
                      )),
                    ],
                    64
                  )
                )
              ),
              256
            )),
          ]),
          nc,
        ],
        512
      ))
    : bn("", !0);
}
const sc = Gl(Jo, [["render", rc]]);
/*!
 * shared v9.2.2
 * (c) 2022 kazuya kawaguchi
 * Released under the MIT License.
 */ const ar = typeof window < "u",
  lc = typeof Symbol == "function" && typeof Symbol.toStringTag == "symbol",
  gt = (e) => (lc ? Symbol(e) : e),
  ac = (e, t, n) => ic({ l: e, k: t, s: n }),
  ic = (e) =>
    JSON.stringify(e)
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029")
      .replace(/\u0027/g, "\\u0027"),
  ce = (e) => typeof e == "number" && isFinite(e),
  oc = (e) => xr(e) === "[object Date]",
  ht = (e) => xr(e) === "[object RegExp]",
  Dn = (e) => U(e) && Object.keys(e).length === 0;
function cc(e, t) {
  typeof console < "u" &&
    (console.warn("[intlify] " + e), t && console.warn(t.stack));
}
const fe = Object.assign;
let Ls;
const Qt = () =>
  Ls ||
  (Ls =
    typeof globalThis < "u"
      ? globalThis
      : typeof self < "u"
      ? self
      : typeof window < "u"
      ? window
      : typeof global < "u"
      ? global
      : {});
function Ts(e) {
  return e
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
const uc = Object.prototype.hasOwnProperty;
function Dr(e, t) {
  return uc.call(e, t);
}
const ee = Array.isArray,
  ie = (e) => typeof e == "function",
  M = (e) => typeof e == "string",
  j = (e) => typeof e == "boolean",
  te = (e) => e !== null && typeof e == "object",
  Jl = Object.prototype.toString,
  xr = (e) => Jl.call(e),
  U = (e) => xr(e) === "[object Object]",
  fc = (e) =>
    e == null
      ? ""
      : ee(e) || (U(e) && e.toString === Jl)
      ? JSON.stringify(e, null, 2)
      : String(e);
/*!
 * message-compiler v9.2.2
 * (c) 2022 kazuya kawaguchi
 * Released under the MIT License.
 */ const J = {
  EXPECTED_TOKEN: 1,
  INVALID_TOKEN_IN_PLACEHOLDER: 2,
  UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER: 3,
  UNKNOWN_ESCAPE_SEQUENCE: 4,
  INVALID_UNICODE_ESCAPE_SEQUENCE: 5,
  UNBALANCED_CLOSING_BRACE: 6,
  UNTERMINATED_CLOSING_BRACE: 7,
  EMPTY_PLACEHOLDER: 8,
  NOT_ALLOW_NEST_PLACEHOLDER: 9,
  INVALID_LINKED_FORMAT: 10,
  MUST_HAVE_MESSAGES_IN_PLURAL: 11,
  UNEXPECTED_EMPTY_LINKED_MODIFIER: 12,
  UNEXPECTED_EMPTY_LINKED_KEY: 13,
  UNEXPECTED_LEXICAL_ANALYSIS: 14,
  __EXTEND_POINT__: 15,
};
function xn(e, t, n = {}) {
  const { domain: r, messages: l, args: s } = n,
    i = e,
    c = new SyntaxError(String(i));
  return (c.code = e), t && (c.location = t), (c.domain = r), c;
}
function dc(e) {
  throw e;
}
function mc(e, t, n) {
  return { line: e, column: t, offset: n };
}
function ir(e, t, n) {
  const r = { start: e, end: t };
  return n != null && (r.source = n), r;
}
const lt = " ",
  _c = "\r",
  Ie = `
`,
  hc = String.fromCharCode(8232),
  gc = String.fromCharCode(8233);
function pc(e) {
  const t = e;
  let n = 0,
    r = 1,
    l = 1,
    s = 0;
  const i = (x) => t[x] === _c && t[x + 1] === Ie,
    c = (x) => t[x] === Ie,
    u = (x) => t[x] === gc,
    d = (x) => t[x] === hc,
    g = (x) => i(x) || c(x) || u(x) || d(x),
    E = () => n,
    p = () => r,
    y = () => l,
    R = () => s,
    F = (x) => (i(x) || u(x) || d(x) ? Ie : t[x]),
    A = () => F(n),
    _ = () => F(n + s);
  function v() {
    return (s = 0), g(n) && (r++, (l = 0)), i(n) && n++, n++, l++, t[n];
  }
  function k() {
    return i(n + s) && s++, s++, t[n + s];
  }
  function T() {
    (n = 0), (r = 1), (l = 1), (s = 0);
  }
  function I(x = 0) {
    s = x;
  }
  function S() {
    const x = n + s;
    for (; x !== n; ) v();
    s = 0;
  }
  return {
    index: E,
    line: p,
    column: y,
    peekOffset: R,
    charAt: F,
    currentChar: A,
    currentPeek: _,
    next: v,
    peek: k,
    reset: T,
    resetPeek: I,
    skipToPeek: S,
  };
}
const ut = void 0,
  Is = "'",
  bc = "tokenizer";
function Ec(e, t = {}) {
  const n = t.location !== !1,
    r = pc(e),
    l = () => r.index(),
    s = () => mc(r.line(), r.column(), r.index()),
    i = s(),
    c = l(),
    u = {
      currentType: 14,
      offset: c,
      startLoc: i,
      endLoc: i,
      lastType: 14,
      lastOffset: c,
      lastStartLoc: i,
      lastEndLoc: i,
      braceNest: 0,
      inLinked: !1,
      text: "",
    },
    d = () => u,
    { onError: g } = t;
  function E(o, a, f, ...h) {
    const b = d();
    if (((a.column += f), (a.offset += f), g)) {
      const N = ir(b.startLoc, a),
        P = xn(o, N, { domain: bc, args: h });
      g(P);
    }
  }
  function p(o, a, f) {
    (o.endLoc = s()), (o.currentType = a);
    const h = { type: a };
    return (
      n && (h.loc = ir(o.startLoc, o.endLoc)), f != null && (h.value = f), h
    );
  }
  const y = (o) => p(o, 14);
  function R(o, a) {
    return o.currentChar() === a
      ? (o.next(), a)
      : (E(J.EXPECTED_TOKEN, s(), 0, a), "");
  }
  function F(o) {
    let a = "";
    for (; o.currentPeek() === lt || o.currentPeek() === Ie; )
      (a += o.currentPeek()), o.peek();
    return a;
  }
  function A(o) {
    const a = F(o);
    return o.skipToPeek(), a;
  }
  function _(o) {
    if (o === ut) return !1;
    const a = o.charCodeAt(0);
    return (a >= 97 && a <= 122) || (a >= 65 && a <= 90) || a === 95;
  }
  function v(o) {
    if (o === ut) return !1;
    const a = o.charCodeAt(0);
    return a >= 48 && a <= 57;
  }
  function k(o, a) {
    const { currentType: f } = a;
    if (f !== 2) return !1;
    F(o);
    const h = _(o.currentPeek());
    return o.resetPeek(), h;
  }
  function T(o, a) {
    const { currentType: f } = a;
    if (f !== 2) return !1;
    F(o);
    const h = o.currentPeek() === "-" ? o.peek() : o.currentPeek(),
      b = v(h);
    return o.resetPeek(), b;
  }
  function I(o, a) {
    const { currentType: f } = a;
    if (f !== 2) return !1;
    F(o);
    const h = o.currentPeek() === Is;
    return o.resetPeek(), h;
  }
  function S(o, a) {
    const { currentType: f } = a;
    if (f !== 8) return !1;
    F(o);
    const h = o.currentPeek() === ".";
    return o.resetPeek(), h;
  }
  function x(o, a) {
    const { currentType: f } = a;
    if (f !== 9) return !1;
    F(o);
    const h = _(o.currentPeek());
    return o.resetPeek(), h;
  }
  function ne(o, a) {
    const { currentType: f } = a;
    if (!(f === 8 || f === 12)) return !1;
    F(o);
    const h = o.currentPeek() === ":";
    return o.resetPeek(), h;
  }
  function X(o, a) {
    const { currentType: f } = a;
    if (f !== 10) return !1;
    const h = () => {
        const N = o.currentPeek();
        return N === "{"
          ? _(o.peek())
          : N === "@" ||
            N === "%" ||
            N === "|" ||
            N === ":" ||
            N === "." ||
            N === lt ||
            !N
          ? !1
          : N === Ie
          ? (o.peek(), h())
          : _(N);
      },
      b = h();
    return o.resetPeek(), b;
  }
  function le(o) {
    F(o);
    const a = o.currentPeek() === "|";
    return o.resetPeek(), a;
  }
  function ae(o) {
    const a = F(o),
      f = o.currentPeek() === "%" && o.peek() === "{";
    return o.resetPeek(), { isModulo: f, hasSpace: a.length > 0 };
  }
  function ge(o, a = !0) {
    const f = (b = !1, N = "", P = !1) => {
        const O = o.currentPeek();
        return O === "{"
          ? N === "%"
            ? !1
            : b
          : O === "@" || !O
          ? N === "%"
            ? !0
            : b
          : O === "%"
          ? (o.peek(), f(b, "%", !0))
          : O === "|"
          ? N === "%" || P
            ? !0
            : !(N === lt || N === Ie)
          : O === lt
          ? (o.peek(), f(!0, lt, P))
          : O === Ie
          ? (o.peek(), f(!0, Ie, P))
          : !0;
      },
      h = f();
    return a && o.resetPeek(), h;
  }
  function me(o, a) {
    const f = o.currentChar();
    return f === ut ? ut : a(f) ? (o.next(), f) : null;
  }
  function tt(o) {
    return me(o, (f) => {
      const h = f.charCodeAt(0);
      return (
        (h >= 97 && h <= 122) ||
        (h >= 65 && h <= 90) ||
        (h >= 48 && h <= 57) ||
        h === 95 ||
        h === 36
      );
    });
  }
  function nt(o) {
    return me(o, (f) => {
      const h = f.charCodeAt(0);
      return h >= 48 && h <= 57;
    });
  }
  function re(o) {
    return me(o, (f) => {
      const h = f.charCodeAt(0);
      return (
        (h >= 48 && h <= 57) || (h >= 65 && h <= 70) || (h >= 97 && h <= 102)
      );
    });
  }
  function K(o) {
    let a = "",
      f = "";
    for (; (a = nt(o)); ) f += a;
    return f;
  }
  function G(o) {
    A(o);
    const a = o.currentChar();
    return a !== "%" && E(J.EXPECTED_TOKEN, s(), 0, a), o.next(), "%";
  }
  function pe(o) {
    let a = "";
    for (;;) {
      const f = o.currentChar();
      if (f === "{" || f === "}" || f === "@" || f === "|" || !f) break;
      if (f === "%")
        if (ge(o)) (a += f), o.next();
        else break;
      else if (f === lt || f === Ie)
        if (ge(o)) (a += f), o.next();
        else {
          if (le(o)) break;
          (a += f), o.next();
        }
      else (a += f), o.next();
    }
    return a;
  }
  function rt(o) {
    A(o);
    let a = "",
      f = "";
    for (; (a = tt(o)); ) f += a;
    return o.currentChar() === ut && E(J.UNTERMINATED_CLOSING_BRACE, s(), 0), f;
  }
  function Se(o) {
    A(o);
    let a = "";
    return (
      o.currentChar() === "-" ? (o.next(), (a += `-${K(o)}`)) : (a += K(o)),
      o.currentChar() === ut && E(J.UNTERMINATED_CLOSING_BRACE, s(), 0),
      a
    );
  }
  function Re(o) {
    A(o), R(o, "'");
    let a = "",
      f = "";
    const h = (N) => N !== Is && N !== Ie;
    for (; (a = me(o, h)); ) a === "\\" ? (f += Ae(o)) : (f += a);
    const b = o.currentChar();
    return b === Ie || b === ut
      ? (E(J.UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER, s(), 0),
        b === Ie && (o.next(), R(o, "'")),
        f)
      : (R(o, "'"), f);
  }
  function Ae(o) {
    const a = o.currentChar();
    switch (a) {
      case "\\":
      case "'":
        return o.next(), `\\${a}`;
      case "u":
        return st(o, a, 4);
      case "U":
        return st(o, a, 6);
      default:
        return E(J.UNKNOWN_ESCAPE_SEQUENCE, s(), 0, a), "";
    }
  }
  function st(o, a, f) {
    R(o, a);
    let h = "";
    for (let b = 0; b < f; b++) {
      const N = re(o);
      if (!N) {
        E(
          J.INVALID_UNICODE_ESCAPE_SEQUENCE,
          s(),
          0,
          `\\${a}${h}${o.currentChar()}`
        );
        break;
      }
      h += N;
    }
    return `\\${a}${h}`;
  }
  function bt(o) {
    A(o);
    let a = "",
      f = "";
    const h = (b) => b !== "{" && b !== "}" && b !== lt && b !== Ie;
    for (; (a = me(o, h)); ) f += a;
    return f;
  }
  function Et(o) {
    let a = "",
      f = "";
    for (; (a = tt(o)); ) f += a;
    return f;
  }
  function Ee(o) {
    const a = (f = !1, h) => {
      const b = o.currentChar();
      return b === "{" || b === "%" || b === "@" || b === "|" || !b || b === lt
        ? h
        : b === Ie
        ? ((h += b), o.next(), a(f, h))
        : ((h += b), o.next(), a(!0, h));
    };
    return a(!1, "");
  }
  function Me(o) {
    A(o);
    const a = R(o, "|");
    return A(o), a;
  }
  function Ke(o, a) {
    let f = null;
    switch (o.currentChar()) {
      case "{":
        return (
          a.braceNest >= 1 && E(J.NOT_ALLOW_NEST_PLACEHOLDER, s(), 0),
          o.next(),
          (f = p(a, 2, "{")),
          A(o),
          a.braceNest++,
          f
        );
      case "}":
        return (
          a.braceNest > 0 &&
            a.currentType === 2 &&
            E(J.EMPTY_PLACEHOLDER, s(), 0),
          o.next(),
          (f = p(a, 3, "}")),
          a.braceNest--,
          a.braceNest > 0 && A(o),
          a.inLinked && a.braceNest === 0 && (a.inLinked = !1),
          f
        );
      case "@":
        return (
          a.braceNest > 0 && E(J.UNTERMINATED_CLOSING_BRACE, s(), 0),
          (f = Le(o, a) || y(a)),
          (a.braceNest = 0),
          f
        );
      default:
        let b = !0,
          N = !0,
          P = !0;
        if (le(o))
          return (
            a.braceNest > 0 && E(J.UNTERMINATED_CLOSING_BRACE, s(), 0),
            (f = p(a, 1, Me(o))),
            (a.braceNest = 0),
            (a.inLinked = !1),
            f
          );
        if (
          a.braceNest > 0 &&
          (a.currentType === 5 || a.currentType === 6 || a.currentType === 7)
        )
          return (
            E(J.UNTERMINATED_CLOSING_BRACE, s(), 0), (a.braceNest = 0), De(o, a)
          );
        if ((b = k(o, a))) return (f = p(a, 5, rt(o))), A(o), f;
        if ((N = T(o, a))) return (f = p(a, 6, Se(o))), A(o), f;
        if ((P = I(o, a))) return (f = p(a, 7, Re(o))), A(o), f;
        if (!b && !N && !P)
          return (
            (f = p(a, 13, bt(o))),
            E(J.INVALID_TOKEN_IN_PLACEHOLDER, s(), 0, f.value),
            A(o),
            f
          );
        break;
    }
    return f;
  }
  function Le(o, a) {
    const { currentType: f } = a;
    let h = null;
    const b = o.currentChar();
    switch (
      ((f === 8 || f === 9 || f === 12 || f === 10) &&
        (b === Ie || b === lt) &&
        E(J.INVALID_LINKED_FORMAT, s(), 0),
      b)
    ) {
      case "@":
        return o.next(), (h = p(a, 8, "@")), (a.inLinked = !0), h;
      case ".":
        return A(o), o.next(), p(a, 9, ".");
      case ":":
        return A(o), o.next(), p(a, 10, ":");
      default:
        return le(o)
          ? ((h = p(a, 1, Me(o))), (a.braceNest = 0), (a.inLinked = !1), h)
          : S(o, a) || ne(o, a)
          ? (A(o), Le(o, a))
          : x(o, a)
          ? (A(o), p(a, 12, Et(o)))
          : X(o, a)
          ? (A(o), b === "{" ? Ke(o, a) || h : p(a, 11, Ee(o)))
          : (f === 8 && E(J.INVALID_LINKED_FORMAT, s(), 0),
            (a.braceNest = 0),
            (a.inLinked = !1),
            De(o, a));
    }
  }
  function De(o, a) {
    let f = { type: 14 };
    if (a.braceNest > 0) return Ke(o, a) || y(a);
    if (a.inLinked) return Le(o, a) || y(a);
    switch (o.currentChar()) {
      case "{":
        return Ke(o, a) || y(a);
      case "}":
        return E(J.UNBALANCED_CLOSING_BRACE, s(), 0), o.next(), p(a, 3, "}");
      case "@":
        return Le(o, a) || y(a);
      default:
        if (le(o))
          return (f = p(a, 1, Me(o))), (a.braceNest = 0), (a.inLinked = !1), f;
        const { isModulo: b, hasSpace: N } = ae(o);
        if (b) return N ? p(a, 0, pe(o)) : p(a, 4, G(o));
        if (ge(o)) return p(a, 0, pe(o));
        break;
    }
    return f;
  }
  function Be() {
    const { currentType: o, offset: a, startLoc: f, endLoc: h } = u;
    return (
      (u.lastType = o),
      (u.lastOffset = a),
      (u.lastStartLoc = f),
      (u.lastEndLoc = h),
      (u.offset = l()),
      (u.startLoc = s()),
      r.currentChar() === ut ? p(u, 14) : De(r, u)
    );
  }
  return { nextToken: Be, currentOffset: l, currentPosition: s, context: d };
}
const Lc = "parser",
  Tc = /(?:\\\\|\\'|\\u([0-9a-fA-F]{4})|\\U([0-9a-fA-F]{6}))/g;
function Ic(e, t, n) {
  switch (e) {
    case "\\\\":
      return "\\";
    case "\\'":
      return "'";
    default: {
      const r = parseInt(t || n, 16);
      return r <= 55295 || r >= 57344 ? String.fromCodePoint(r) : "\uFFFD";
    }
  }
}
function Nc(e = {}) {
  const t = e.location !== !1,
    { onError: n } = e;
  function r(_, v, k, T, ...I) {
    const S = _.currentPosition();
    if (((S.offset += T), (S.column += T), n)) {
      const x = ir(k, S),
        ne = xn(v, x, { domain: Lc, args: I });
      n(ne);
    }
  }
  function l(_, v, k) {
    const T = { type: _, start: v, end: v };
    return t && (T.loc = { start: k, end: k }), T;
  }
  function s(_, v, k, T) {
    (_.end = v), T && (_.type = T), t && _.loc && (_.loc.end = k);
  }
  function i(_, v) {
    const k = _.context(),
      T = l(3, k.offset, k.startLoc);
    return (T.value = v), s(T, _.currentOffset(), _.currentPosition()), T;
  }
  function c(_, v) {
    const k = _.context(),
      { lastOffset: T, lastStartLoc: I } = k,
      S = l(5, T, I);
    return (
      (S.index = parseInt(v, 10)),
      _.nextToken(),
      s(S, _.currentOffset(), _.currentPosition()),
      S
    );
  }
  function u(_, v) {
    const k = _.context(),
      { lastOffset: T, lastStartLoc: I } = k,
      S = l(4, T, I);
    return (
      (S.key = v),
      _.nextToken(),
      s(S, _.currentOffset(), _.currentPosition()),
      S
    );
  }
  function d(_, v) {
    const k = _.context(),
      { lastOffset: T, lastStartLoc: I } = k,
      S = l(9, T, I);
    return (
      (S.value = v.replace(Tc, Ic)),
      _.nextToken(),
      s(S, _.currentOffset(), _.currentPosition()),
      S
    );
  }
  function g(_) {
    const v = _.nextToken(),
      k = _.context(),
      { lastOffset: T, lastStartLoc: I } = k,
      S = l(8, T, I);
    return v.type !== 12
      ? (r(_, J.UNEXPECTED_EMPTY_LINKED_MODIFIER, k.lastStartLoc, 0),
        (S.value = ""),
        s(S, T, I),
        { nextConsumeToken: v, node: S })
      : (v.value == null &&
          r(_, J.UNEXPECTED_LEXICAL_ANALYSIS, k.lastStartLoc, 0, Ge(v)),
        (S.value = v.value || ""),
        s(S, _.currentOffset(), _.currentPosition()),
        { node: S });
  }
  function E(_, v) {
    const k = _.context(),
      T = l(7, k.offset, k.startLoc);
    return (T.value = v), s(T, _.currentOffset(), _.currentPosition()), T;
  }
  function p(_) {
    const v = _.context(),
      k = l(6, v.offset, v.startLoc);
    let T = _.nextToken();
    if (T.type === 9) {
      const I = g(_);
      (k.modifier = I.node), (T = I.nextConsumeToken || _.nextToken());
    }
    switch (
      (T.type !== 10 &&
        r(_, J.UNEXPECTED_LEXICAL_ANALYSIS, v.lastStartLoc, 0, Ge(T)),
      (T = _.nextToken()),
      T.type === 2 && (T = _.nextToken()),
      T.type)
    ) {
      case 11:
        T.value == null &&
          r(_, J.UNEXPECTED_LEXICAL_ANALYSIS, v.lastStartLoc, 0, Ge(T)),
          (k.key = E(_, T.value || ""));
        break;
      case 5:
        T.value == null &&
          r(_, J.UNEXPECTED_LEXICAL_ANALYSIS, v.lastStartLoc, 0, Ge(T)),
          (k.key = u(_, T.value || ""));
        break;
      case 6:
        T.value == null &&
          r(_, J.UNEXPECTED_LEXICAL_ANALYSIS, v.lastStartLoc, 0, Ge(T)),
          (k.key = c(_, T.value || ""));
        break;
      case 7:
        T.value == null &&
          r(_, J.UNEXPECTED_LEXICAL_ANALYSIS, v.lastStartLoc, 0, Ge(T)),
          (k.key = d(_, T.value || ""));
        break;
      default:
        r(_, J.UNEXPECTED_EMPTY_LINKED_KEY, v.lastStartLoc, 0);
        const I = _.context(),
          S = l(7, I.offset, I.startLoc);
        return (
          (S.value = ""),
          s(S, I.offset, I.startLoc),
          (k.key = S),
          s(k, I.offset, I.startLoc),
          { nextConsumeToken: T, node: k }
        );
    }
    return s(k, _.currentOffset(), _.currentPosition()), { node: k };
  }
  function y(_) {
    const v = _.context(),
      k = v.currentType === 1 ? _.currentOffset() : v.offset,
      T = v.currentType === 1 ? v.endLoc : v.startLoc,
      I = l(2, k, T);
    I.items = [];
    let S = null;
    do {
      const X = S || _.nextToken();
      switch (((S = null), X.type)) {
        case 0:
          X.value == null &&
            r(_, J.UNEXPECTED_LEXICAL_ANALYSIS, v.lastStartLoc, 0, Ge(X)),
            I.items.push(i(_, X.value || ""));
          break;
        case 6:
          X.value == null &&
            r(_, J.UNEXPECTED_LEXICAL_ANALYSIS, v.lastStartLoc, 0, Ge(X)),
            I.items.push(c(_, X.value || ""));
          break;
        case 5:
          X.value == null &&
            r(_, J.UNEXPECTED_LEXICAL_ANALYSIS, v.lastStartLoc, 0, Ge(X)),
            I.items.push(u(_, X.value || ""));
          break;
        case 7:
          X.value == null &&
            r(_, J.UNEXPECTED_LEXICAL_ANALYSIS, v.lastStartLoc, 0, Ge(X)),
            I.items.push(d(_, X.value || ""));
          break;
        case 8:
          const le = p(_);
          I.items.push(le.node), (S = le.nextConsumeToken || null);
          break;
      }
    } while (v.currentType !== 14 && v.currentType !== 1);
    const x = v.currentType === 1 ? v.lastOffset : _.currentOffset(),
      ne = v.currentType === 1 ? v.lastEndLoc : _.currentPosition();
    return s(I, x, ne), I;
  }
  function R(_, v, k, T) {
    const I = _.context();
    let S = T.items.length === 0;
    const x = l(1, v, k);
    (x.cases = []), x.cases.push(T);
    do {
      const ne = y(_);
      S || (S = ne.items.length === 0), x.cases.push(ne);
    } while (I.currentType !== 14);
    return (
      S && r(_, J.MUST_HAVE_MESSAGES_IN_PLURAL, k, 0),
      s(x, _.currentOffset(), _.currentPosition()),
      x
    );
  }
  function F(_) {
    const v = _.context(),
      { offset: k, startLoc: T } = v,
      I = y(_);
    return v.currentType === 14 ? I : R(_, k, T, I);
  }
  function A(_) {
    const v = Ec(_, fe({}, e)),
      k = v.context(),
      T = l(0, k.offset, k.startLoc);
    return (
      t && T.loc && (T.loc.source = _),
      (T.body = F(v)),
      k.currentType !== 14 &&
        r(
          v,
          J.UNEXPECTED_LEXICAL_ANALYSIS,
          k.lastStartLoc,
          0,
          _[k.offset] || ""
        ),
      s(T, v.currentOffset(), v.currentPosition()),
      T
    );
  }
  return { parse: A };
}
function Ge(e) {
  if (e.type === 14) return "EOF";
  const t = (e.value || "").replace(/\r?\n/gu, "\\n");
  return t.length > 10 ? t.slice(0, 9) + "\u2026" : t;
}
function yc(e, t = {}) {
  const n = { ast: e, helpers: new Set() };
  return { context: () => n, helper: (s) => (n.helpers.add(s), s) };
}
function Ns(e, t) {
  for (let n = 0; n < e.length; n++) $r(e[n], t);
}
function $r(e, t) {
  switch (e.type) {
    case 1:
      Ns(e.cases, t), t.helper("plural");
      break;
    case 2:
      Ns(e.items, t);
      break;
    case 6:
      $r(e.key, t), t.helper("linked"), t.helper("type");
      break;
    case 5:
      t.helper("interpolate"), t.helper("list");
      break;
    case 4:
      t.helper("interpolate"), t.helper("named");
      break;
  }
}
function vc(e, t = {}) {
  const n = yc(e);
  n.helper("normalize"), e.body && $r(e.body, n);
  const r = n.context();
  e.helpers = Array.from(r.helpers);
}
function Cc(e, t) {
  const { sourceMap: n, filename: r, breakLineCode: l, needIndent: s } = t,
    i = {
      source: e.loc.source,
      filename: r,
      code: "",
      column: 1,
      line: 1,
      offset: 0,
      map: void 0,
      breakLineCode: l,
      needIndent: s,
      indentLevel: 0,
    },
    c = () => i;
  function u(F, A) {
    i.code += F;
  }
  function d(F, A = !0) {
    const _ = A ? l : "";
    u(s ? _ + "  ".repeat(F) : _);
  }
  function g(F = !0) {
    const A = ++i.indentLevel;
    F && d(A);
  }
  function E(F = !0) {
    const A = --i.indentLevel;
    F && d(A);
  }
  function p() {
    d(i.indentLevel);
  }
  return {
    context: c,
    push: u,
    indent: g,
    deindent: E,
    newline: p,
    helper: (F) => `_${F}`,
    needIndent: () => i.needIndent,
  };
}
function Oc(e, t) {
  const { helper: n } = e;
  e.push(`${n("linked")}(`),
    Vt(e, t.key),
    t.modifier
      ? (e.push(", "), Vt(e, t.modifier), e.push(", _type"))
      : e.push(", undefined, _type"),
    e.push(")");
}
function Ac(e, t) {
  const { helper: n, needIndent: r } = e;
  e.push(`${n("normalize")}([`), e.indent(r());
  const l = t.items.length;
  for (let s = 0; s < l && (Vt(e, t.items[s]), s !== l - 1); s++) e.push(", ");
  e.deindent(r()), e.push("])");
}
function kc(e, t) {
  const { helper: n, needIndent: r } = e;
  if (t.cases.length > 1) {
    e.push(`${n("plural")}([`), e.indent(r());
    const l = t.cases.length;
    for (let s = 0; s < l && (Vt(e, t.cases[s]), s !== l - 1); s++)
      e.push(", ");
    e.deindent(r()), e.push("])");
  }
}
function Fc(e, t) {
  t.body ? Vt(e, t.body) : e.push("null");
}
function Vt(e, t) {
  const { helper: n } = e;
  switch (t.type) {
    case 0:
      Fc(e, t);
      break;
    case 1:
      kc(e, t);
      break;
    case 2:
      Ac(e, t);
      break;
    case 6:
      Oc(e, t);
      break;
    case 8:
      e.push(JSON.stringify(t.value), t);
      break;
    case 7:
      e.push(JSON.stringify(t.value), t);
      break;
    case 5:
      e.push(`${n("interpolate")}(${n("list")}(${t.index}))`, t);
      break;
    case 4:
      e.push(`${n("interpolate")}(${n("named")}(${JSON.stringify(t.key)}))`, t);
      break;
    case 9:
      e.push(JSON.stringify(t.value), t);
      break;
    case 3:
      e.push(JSON.stringify(t.value), t);
      break;
  }
}
const Pc = (e, t = {}) => {
  const n = M(t.mode) ? t.mode : "normal",
    r = M(t.filename) ? t.filename : "message.intl",
    l = !!t.sourceMap,
    s =
      t.breakLineCode != null
        ? t.breakLineCode
        : n === "arrow"
        ? ";"
        : `
`,
    i = t.needIndent ? t.needIndent : n !== "arrow",
    c = e.helpers || [],
    u = Cc(e, {
      mode: n,
      filename: r,
      sourceMap: l,
      breakLineCode: s,
      needIndent: i,
    });
  u.push(n === "normal" ? "function __msg__ (ctx) {" : "(ctx) => {"),
    u.indent(i),
    c.length > 0 &&
      (u.push(`const { ${c.map((E) => `${E}: _${E}`).join(", ")} } = ctx`),
      u.newline()),
    u.push("return "),
    Vt(u, e),
    u.deindent(i),
    u.push("}");
  const { code: d, map: g } = u.context();
  return { ast: e, code: d, map: g ? g.toJSON() : void 0 };
};
function Rc(e, t = {}) {
  const n = fe({}, t),
    l = Nc(n).parse(e);
  return vc(l, n), Pc(l, n);
}
/*!
 * devtools-if v9.2.2
 * (c) 2022 kazuya kawaguchi
 * Released under the MIT License.
 */ const ql = {
  I18nInit: "i18n:init",
  FunctionTranslate: "function:translate",
};
/*!
 * core-base v9.2.2
 * (c) 2022 kazuya kawaguchi
 * Released under the MIT License.
 */ const pt = [];
pt[0] = { w: [0], i: [3, 0], ["["]: [4], o: [7] };
pt[1] = { w: [1], ["."]: [2], ["["]: [4], o: [7] };
pt[2] = { w: [2], i: [3, 0], [0]: [3, 0] };
pt[3] = {
  i: [3, 0],
  [0]: [3, 0],
  w: [1, 1],
  ["."]: [2, 1],
  ["["]: [4, 1],
  o: [7, 1],
};
pt[4] = {
  ["'"]: [5, 0],
  ['"']: [6, 0],
  ["["]: [4, 2],
  ["]"]: [1, 3],
  o: 8,
  l: [4, 0],
};
pt[5] = { ["'"]: [4, 0], o: 8, l: [5, 0] };
pt[6] = { ['"']: [4, 0], o: 8, l: [6, 0] };
const Mc = /^\s?(?:true|false|-?[\d.]+|'[^']*'|"[^"]*")\s?$/;
function wc(e) {
  return Mc.test(e);
}
function Sc(e) {
  const t = e.charCodeAt(0),
    n = e.charCodeAt(e.length - 1);
  return t === n && (t === 34 || t === 39) ? e.slice(1, -1) : e;
}
function Dc(e) {
  if (e == null) return "o";
  switch (e.charCodeAt(0)) {
    case 91:
    case 93:
    case 46:
    case 34:
    case 39:
      return e;
    case 95:
    case 36:
    case 45:
      return "i";
    case 9:
    case 10:
    case 13:
    case 160:
    case 65279:
    case 8232:
    case 8233:
      return "w";
  }
  return "i";
}
function xc(e) {
  const t = e.trim();
  return e.charAt(0) === "0" && isNaN(parseInt(e))
    ? !1
    : wc(t)
    ? Sc(t)
    : "*" + t;
}
function $c(e) {
  const t = [];
  let n = -1,
    r = 0,
    l = 0,
    s,
    i,
    c,
    u,
    d,
    g,
    E;
  const p = [];
  (p[0] = () => {
    i === void 0 ? (i = c) : (i += c);
  }),
    (p[1] = () => {
      i !== void 0 && (t.push(i), (i = void 0));
    }),
    (p[2] = () => {
      p[0](), l++;
    }),
    (p[3] = () => {
      if (l > 0) l--, (r = 4), p[0]();
      else {
        if (((l = 0), i === void 0 || ((i = xc(i)), i === !1))) return !1;
        p[1]();
      }
    });
  function y() {
    const R = e[n + 1];
    if ((r === 5 && R === "'") || (r === 6 && R === '"'))
      return n++, (c = "\\" + R), p[0](), !0;
  }
  for (; r !== null; )
    if ((n++, (s = e[n]), !(s === "\\" && y()))) {
      if (
        ((u = Dc(s)),
        (E = pt[r]),
        (d = E[u] || E.l || 8),
        d === 8 ||
          ((r = d[0]),
          d[1] !== void 0 && ((g = p[d[1]]), g && ((c = s), g() === !1))))
      )
        return;
      if (r === 7) return t;
    }
}
const ys = new Map();
function Uc(e, t) {
  return te(e) ? e[t] : null;
}
function Wc(e, t) {
  if (!te(e)) return null;
  let n = ys.get(t);
  if ((n || ((n = $c(t)), n && ys.set(t, n)), !n)) return null;
  const r = n.length;
  let l = e,
    s = 0;
  for (; s < r; ) {
    const i = l[n[s]];
    if (i === void 0) return null;
    (l = i), s++;
  }
  return l;
}
const Hc = (e) => e,
  Vc = (e) => "",
  jc = "text",
  Kc = (e) => (e.length === 0 ? "" : e.join("")),
  Bc = fc;
function vs(e, t) {
  return (
    (e = Math.abs(e)),
    t === 2 ? (e ? (e > 1 ? 1 : 0) : 1) : e ? Math.min(e, 2) : 0
  );
}
function Yc(e) {
  const t = ce(e.pluralIndex) ? e.pluralIndex : -1;
  return e.named && (ce(e.named.count) || ce(e.named.n))
    ? ce(e.named.count)
      ? e.named.count
      : ce(e.named.n)
      ? e.named.n
      : t
    : t;
}
function Xc(e, t) {
  t.count || (t.count = e), t.n || (t.n = e);
}
function Gc(e = {}) {
  const t = e.locale,
    n = Yc(e),
    r =
      te(e.pluralRules) && M(t) && ie(e.pluralRules[t]) ? e.pluralRules[t] : vs,
    l = te(e.pluralRules) && M(t) && ie(e.pluralRules[t]) ? vs : void 0,
    s = (_) => _[r(n, _.length, l)],
    i = e.list || [],
    c = (_) => i[_],
    u = e.named || {};
  ce(e.pluralIndex) && Xc(n, u);
  const d = (_) => u[_];
  function g(_) {
    const v = ie(e.messages)
      ? e.messages(_)
      : te(e.messages)
      ? e.messages[_]
      : !1;
    return v || (e.parent ? e.parent.message(_) : Vc);
  }
  const E = (_) => (e.modifiers ? e.modifiers[_] : Hc),
    p =
      U(e.processor) && ie(e.processor.normalize) ? e.processor.normalize : Kc,
    y =
      U(e.processor) && ie(e.processor.interpolate)
        ? e.processor.interpolate
        : Bc,
    R = U(e.processor) && M(e.processor.type) ? e.processor.type : jc,
    A = {
      list: c,
      named: d,
      plural: s,
      linked: (_, ...v) => {
        const [k, T] = v;
        let I = "text",
          S = "";
        v.length === 1
          ? te(k)
            ? ((S = k.modifier || S), (I = k.type || I))
            : M(k) && (S = k || S)
          : v.length === 2 && (M(k) && (S = k || S), M(T) && (I = T || I));
        let x = g(_)(A);
        return I === "vnode" && ee(x) && S && (x = x[0]), S ? E(S)(x, I) : x;
      },
      message: g,
      type: R,
      interpolate: y,
      normalize: p,
    };
  return A;
}
let ln = null;
function Jc(e) {
  ln = e;
}
function qc(e, t, n) {
  ln &&
    ln.emit(ql.I18nInit, {
      timestamp: Date.now(),
      i18n: e,
      version: t,
      meta: n,
    });
}
const Qc = Zc(ql.FunctionTranslate);
function Zc(e) {
  return (t) => ln && ln.emit(e, t);
}
const zc = {
  NOT_FOUND_KEY: 1,
  FALLBACK_TO_TRANSLATE: 2,
  CANNOT_FORMAT_NUMBER: 3,
  FALLBACK_TO_NUMBER_FORMAT: 4,
  CANNOT_FORMAT_DATE: 5,
  FALLBACK_TO_DATE_FORMAT: 6,
  __EXTEND_POINT__: 7,
};
function eu(e, t, n) {
  return [
    ...new Set([n, ...(ee(t) ? t : te(t) ? Object.keys(t) : M(t) ? [t] : [n])]),
  ];
}
function Ql(e, t, n) {
  const r = M(n) ? n : an,
    l = e;
  l.__localeChainCache || (l.__localeChainCache = new Map());
  let s = l.__localeChainCache.get(r);
  if (!s) {
    s = [];
    let i = [n];
    for (; ee(i); ) i = Cs(s, i, t);
    const c = ee(t) || !U(t) ? t : t.default ? t.default : null;
    (i = M(c) ? [c] : c), ee(i) && Cs(s, i, !1), l.__localeChainCache.set(r, s);
  }
  return s;
}
function Cs(e, t, n) {
  let r = !0;
  for (let l = 0; l < t.length && j(r); l++) {
    const s = t[l];
    M(s) && (r = tu(e, t[l], n));
  }
  return r;
}
function tu(e, t, n) {
  let r;
  const l = t.split("-");
  do {
    const s = l.join("-");
    (r = nu(e, s, n)), l.splice(-1, 1);
  } while (l.length && r === !0);
  return r;
}
function nu(e, t, n) {
  let r = !1;
  if (!e.includes(t) && ((r = !0), t)) {
    r = t[t.length - 1] !== "!";
    const l = t.replace(/!/g, "");
    e.push(l), (ee(n) || U(n)) && n[l] && (r = n[l]);
  }
  return r;
}
const ru = "9.2.2",
  $n = -1,
  an = "en-US",
  Os = "",
  As = (e) => `${e.charAt(0).toLocaleUpperCase()}${e.substr(1)}`;
function su() {
  return {
    upper: (e, t) =>
      t === "text" && M(e)
        ? e.toUpperCase()
        : t === "vnode" && te(e) && "__v_isVNode" in e
        ? e.children.toUpperCase()
        : e,
    lower: (e, t) =>
      t === "text" && M(e)
        ? e.toLowerCase()
        : t === "vnode" && te(e) && "__v_isVNode" in e
        ? e.children.toLowerCase()
        : e,
    capitalize: (e, t) =>
      t === "text" && M(e)
        ? As(e)
        : t === "vnode" && te(e) && "__v_isVNode" in e
        ? As(e.children)
        : e,
  };
}
let Zl;
function lu(e) {
  Zl = e;
}
let zl;
function au(e) {
  zl = e;
}
let ea;
function iu(e) {
  ea = e;
}
let ta = null;
const ks = (e) => {
    ta = e;
  },
  ou = () => ta;
let na = null;
const Fs = (e) => {
    na = e;
  },
  cu = () => na;
let Ps = 0;
function uu(e = {}) {
  const t = M(e.version) ? e.version : ru,
    n = M(e.locale) ? e.locale : an,
    r =
      ee(e.fallbackLocale) ||
      U(e.fallbackLocale) ||
      M(e.fallbackLocale) ||
      e.fallbackLocale === !1
        ? e.fallbackLocale
        : n,
    l = U(e.messages) ? e.messages : { [n]: {} },
    s = U(e.datetimeFormats) ? e.datetimeFormats : { [n]: {} },
    i = U(e.numberFormats) ? e.numberFormats : { [n]: {} },
    c = fe({}, e.modifiers || {}, su()),
    u = e.pluralRules || {},
    d = ie(e.missing) ? e.missing : null,
    g = j(e.missingWarn) || ht(e.missingWarn) ? e.missingWarn : !0,
    E = j(e.fallbackWarn) || ht(e.fallbackWarn) ? e.fallbackWarn : !0,
    p = !!e.fallbackFormat,
    y = !!e.unresolving,
    R = ie(e.postTranslation) ? e.postTranslation : null,
    F = U(e.processor) ? e.processor : null,
    A = j(e.warnHtmlMessage) ? e.warnHtmlMessage : !0,
    _ = !!e.escapeParameter,
    v = ie(e.messageCompiler) ? e.messageCompiler : Zl,
    k = ie(e.messageResolver) ? e.messageResolver : zl || Uc,
    T = ie(e.localeFallbacker) ? e.localeFallbacker : ea || eu,
    I = te(e.fallbackContext) ? e.fallbackContext : void 0,
    S = ie(e.onWarn) ? e.onWarn : cc,
    x = e,
    ne = te(x.__datetimeFormatters) ? x.__datetimeFormatters : new Map(),
    X = te(x.__numberFormatters) ? x.__numberFormatters : new Map(),
    le = te(x.__meta) ? x.__meta : {};
  Ps++;
  const ae = {
    version: t,
    cid: Ps,
    locale: n,
    fallbackLocale: r,
    messages: l,
    modifiers: c,
    pluralRules: u,
    missing: d,
    missingWarn: g,
    fallbackWarn: E,
    fallbackFormat: p,
    unresolving: y,
    postTranslation: R,
    processor: F,
    warnHtmlMessage: A,
    escapeParameter: _,
    messageCompiler: v,
    messageResolver: k,
    localeFallbacker: T,
    fallbackContext: I,
    onWarn: S,
    __meta: le,
  };
  return (
    (ae.datetimeFormats = s),
    (ae.numberFormats = i),
    (ae.__datetimeFormatters = ne),
    (ae.__numberFormatters = X),
    __INTLIFY_PROD_DEVTOOLS__ && qc(ae, t, le),
    ae
  );
}
function Ur(e, t, n, r, l) {
  const { missing: s, onWarn: i } = e;
  if (s !== null) {
    const c = s(e, n, t, l);
    return M(c) ? c : t;
  } else return t;
}
function Gt(e, t, n) {
  const r = e;
  (r.__localeChainCache = new Map()), e.localeFallbacker(e, n, t);
}
const fu = (e) => e;
let Rs = Object.create(null);
function du(e, t = {}) {
  {
    const r = (t.onCacheKey || fu)(e),
      l = Rs[r];
    if (l) return l;
    let s = !1;
    const i = t.onError || dc;
    t.onError = (d) => {
      (s = !0), i(d);
    };
    const { code: c } = Rc(e, t),
      u = new Function(`return ${c}`)();
    return s ? u : (Rs[r] = u);
  }
}
let ra = J.__EXTEND_POINT__;
const Yn = () => ++ra,
  Pt = {
    INVALID_ARGUMENT: ra,
    INVALID_DATE_ARGUMENT: Yn(),
    INVALID_ISO_DATE_ARGUMENT: Yn(),
    __EXTEND_POINT__: Yn(),
  };
function Rt(e) {
  return xn(e, null, void 0);
}
const Ms = () => "",
  Qe = (e) => ie(e);
function ws(e, ...t) {
  const {
      fallbackFormat: n,
      postTranslation: r,
      unresolving: l,
      messageCompiler: s,
      fallbackLocale: i,
      messages: c,
    } = e,
    [u, d] = or(...t),
    g = j(d.missingWarn) ? d.missingWarn : e.missingWarn,
    E = j(d.fallbackWarn) ? d.fallbackWarn : e.fallbackWarn,
    p = j(d.escapeParameter) ? d.escapeParameter : e.escapeParameter,
    y = !!d.resolvedMessage,
    R =
      M(d.default) || j(d.default)
        ? j(d.default)
          ? s
            ? u
            : () => u
          : d.default
        : n
        ? s
          ? u
          : () => u
        : "",
    F = n || R !== "",
    A = M(d.locale) ? d.locale : e.locale;
  p && mu(d);
  let [_, v, k] = y ? [u, A, c[A] || {}] : sa(e, u, A, i, E, g),
    T = _,
    I = u;
  if (
    (!y && !(M(T) || Qe(T)) && F && ((T = R), (I = T)),
    !y && (!(M(T) || Qe(T)) || !M(v)))
  )
    return l ? $n : u;
  let S = !1;
  const x = () => {
      S = !0;
    },
    ne = Qe(T) ? T : la(e, u, v, T, I, x);
  if (S) return T;
  const X = gu(e, v, k, d),
    le = Gc(X),
    ae = _u(e, ne, le),
    ge = r ? r(ae, u) : ae;
  if (__INTLIFY_PROD_DEVTOOLS__) {
    const me = {
      timestamp: Date.now(),
      key: M(u) ? u : Qe(T) ? T.key : "",
      locale: v || (Qe(T) ? T.locale : ""),
      format: M(T) ? T : Qe(T) ? T.source : "",
      message: ge,
    };
    (me.meta = fe({}, e.__meta, ou() || {})), Qc(me);
  }
  return ge;
}
function mu(e) {
  ee(e.list)
    ? (e.list = e.list.map((t) => (M(t) ? Ts(t) : t)))
    : te(e.named) &&
      Object.keys(e.named).forEach((t) => {
        M(e.named[t]) && (e.named[t] = Ts(e.named[t]));
      });
}
function sa(e, t, n, r, l, s) {
  const { messages: i, onWarn: c, messageResolver: u, localeFallbacker: d } = e,
    g = d(e, r, n);
  let E = {},
    p,
    y = null;
  const R = "translate";
  for (
    let F = 0;
    F < g.length &&
    ((p = g[F]),
    (E = i[p] || {}),
    (y = u(E, t)) === null && (y = E[t]),
    !(M(y) || ie(y)));
    F++
  ) {
    const A = Ur(e, t, p, s, R);
    A !== t && (y = A);
  }
  return [y, p, E];
}
function la(e, t, n, r, l, s) {
  const { messageCompiler: i, warnHtmlMessage: c } = e;
  if (Qe(r)) {
    const d = r;
    return (d.locale = d.locale || n), (d.key = d.key || t), d;
  }
  if (i == null) {
    const d = () => r;
    return (d.locale = n), (d.key = t), d;
  }
  const u = i(r, hu(e, n, l, r, c, s));
  return (u.locale = n), (u.key = t), (u.source = r), u;
}
function _u(e, t, n) {
  return t(n);
}
function or(...e) {
  const [t, n, r] = e,
    l = {};
  if (!M(t) && !ce(t) && !Qe(t)) throw Rt(Pt.INVALID_ARGUMENT);
  const s = ce(t) ? String(t) : (Qe(t), t);
  return (
    ce(n)
      ? (l.plural = n)
      : M(n)
      ? (l.default = n)
      : U(n) && !Dn(n)
      ? (l.named = n)
      : ee(n) && (l.list = n),
    ce(r) ? (l.plural = r) : M(r) ? (l.default = r) : U(r) && fe(l, r),
    [s, l]
  );
}
function hu(e, t, n, r, l, s) {
  return {
    warnHtmlMessage: l,
    onError: (i) => {
      throw (s && s(i), i);
    },
    onCacheKey: (i) => ac(t, n, i),
  };
}
function gu(e, t, n, r) {
  const {
      modifiers: l,
      pluralRules: s,
      messageResolver: i,
      fallbackLocale: c,
      fallbackWarn: u,
      missingWarn: d,
      fallbackContext: g,
    } = e,
    p = {
      locale: t,
      modifiers: l,
      pluralRules: s,
      messages: (y) => {
        let R = i(n, y);
        if (R == null && g) {
          const [, , F] = sa(g, y, t, c, u, d);
          R = i(F, y);
        }
        if (M(R)) {
          let F = !1;
          const _ = la(e, y, t, R, y, () => {
            F = !0;
          });
          return F ? Ms : _;
        } else return Qe(R) ? R : Ms;
      },
    };
  return (
    e.processor && (p.processor = e.processor),
    r.list && (p.list = r.list),
    r.named && (p.named = r.named),
    ce(r.plural) && (p.pluralIndex = r.plural),
    p
  );
}
function Ss(e, ...t) {
  const {
      datetimeFormats: n,
      unresolving: r,
      fallbackLocale: l,
      onWarn: s,
      localeFallbacker: i,
    } = e,
    { __datetimeFormatters: c } = e,
    [u, d, g, E] = cr(...t),
    p = j(g.missingWarn) ? g.missingWarn : e.missingWarn;
  j(g.fallbackWarn) ? g.fallbackWarn : e.fallbackWarn;
  const y = !!g.part,
    R = M(g.locale) ? g.locale : e.locale,
    F = i(e, l, R);
  if (!M(u) || u === "") return new Intl.DateTimeFormat(R, E).format(d);
  let A = {},
    _,
    v = null;
  const k = "datetime format";
  for (
    let S = 0;
    S < F.length && ((_ = F[S]), (A = n[_] || {}), (v = A[u]), !U(v));
    S++
  )
    Ur(e, u, _, p, k);
  if (!U(v) || !M(_)) return r ? $n : u;
  let T = `${_}__${u}`;
  Dn(E) || (T = `${T}__${JSON.stringify(E)}`);
  let I = c.get(T);
  return (
    I || ((I = new Intl.DateTimeFormat(_, fe({}, v, E))), c.set(T, I)),
    y ? I.formatToParts(d) : I.format(d)
  );
}
const aa = [
  "localeMatcher",
  "weekday",
  "era",
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
  "timeZoneName",
  "formatMatcher",
  "hour12",
  "timeZone",
  "dateStyle",
  "timeStyle",
  "calendar",
  "dayPeriod",
  "numberingSystem",
  "hourCycle",
  "fractionalSecondDigits",
];
function cr(...e) {
  const [t, n, r, l] = e,
    s = {};
  let i = {},
    c;
  if (M(t)) {
    const u = t.match(/(\d{4}-\d{2}-\d{2})(T|\s)?(.*)/);
    if (!u) throw Rt(Pt.INVALID_ISO_DATE_ARGUMENT);
    const d = u[3]
      ? u[3].trim().startsWith("T")
        ? `${u[1].trim()}${u[3].trim()}`
        : `${u[1].trim()}T${u[3].trim()}`
      : u[1].trim();
    c = new Date(d);
    try {
      c.toISOString();
    } catch {
      throw Rt(Pt.INVALID_ISO_DATE_ARGUMENT);
    }
  } else if (oc(t)) {
    if (isNaN(t.getTime())) throw Rt(Pt.INVALID_DATE_ARGUMENT);
    c = t;
  } else if (ce(t)) c = t;
  else throw Rt(Pt.INVALID_ARGUMENT);
  return (
    M(n)
      ? (s.key = n)
      : U(n) &&
        Object.keys(n).forEach((u) => {
          aa.includes(u) ? (i[u] = n[u]) : (s[u] = n[u]);
        }),
    M(r) ? (s.locale = r) : U(r) && (i = r),
    U(l) && (i = l),
    [s.key || "", c, s, i]
  );
}
function Ds(e, t, n) {
  const r = e;
  for (const l in n) {
    const s = `${t}__${l}`;
    !r.__datetimeFormatters.has(s) || r.__datetimeFormatters.delete(s);
  }
}
function xs(e, ...t) {
  const {
      numberFormats: n,
      unresolving: r,
      fallbackLocale: l,
      onWarn: s,
      localeFallbacker: i,
    } = e,
    { __numberFormatters: c } = e,
    [u, d, g, E] = ur(...t),
    p = j(g.missingWarn) ? g.missingWarn : e.missingWarn;
  j(g.fallbackWarn) ? g.fallbackWarn : e.fallbackWarn;
  const y = !!g.part,
    R = M(g.locale) ? g.locale : e.locale,
    F = i(e, l, R);
  if (!M(u) || u === "") return new Intl.NumberFormat(R, E).format(d);
  let A = {},
    _,
    v = null;
  const k = "number format";
  for (
    let S = 0;
    S < F.length && ((_ = F[S]), (A = n[_] || {}), (v = A[u]), !U(v));
    S++
  )
    Ur(e, u, _, p, k);
  if (!U(v) || !M(_)) return r ? $n : u;
  let T = `${_}__${u}`;
  Dn(E) || (T = `${T}__${JSON.stringify(E)}`);
  let I = c.get(T);
  return (
    I || ((I = new Intl.NumberFormat(_, fe({}, v, E))), c.set(T, I)),
    y ? I.formatToParts(d) : I.format(d)
  );
}
const ia = [
  "localeMatcher",
  "style",
  "currency",
  "currencyDisplay",
  "currencySign",
  "useGrouping",
  "minimumIntegerDigits",
  "minimumFractionDigits",
  "maximumFractionDigits",
  "minimumSignificantDigits",
  "maximumSignificantDigits",
  "compactDisplay",
  "notation",
  "signDisplay",
  "unit",
  "unitDisplay",
  "roundingMode",
  "roundingPriority",
  "roundingIncrement",
  "trailingZeroDisplay",
];
function ur(...e) {
  const [t, n, r, l] = e,
    s = {};
  let i = {};
  if (!ce(t)) throw Rt(Pt.INVALID_ARGUMENT);
  const c = t;
  return (
    M(n)
      ? (s.key = n)
      : U(n) &&
        Object.keys(n).forEach((u) => {
          ia.includes(u) ? (i[u] = n[u]) : (s[u] = n[u]);
        }),
    M(r) ? (s.locale = r) : U(r) && (i = r),
    U(l) && (i = l),
    [s.key || "", c, s, i]
  );
}
function $s(e, t, n) {
  const r = e;
  for (const l in n) {
    const s = `${t}__${l}`;
    !r.__numberFormatters.has(s) || r.__numberFormatters.delete(s);
  }
}
typeof __INTLIFY_PROD_DEVTOOLS__ != "boolean" &&
  (Qt().__INTLIFY_PROD_DEVTOOLS__ = !1);
/*!
 * vue-i18n v9.2.2
 * (c) 2022 kazuya kawaguchi
 * Released under the MIT License.
 */ const pu = "9.2.2";
function bu() {
  typeof __VUE_I18N_FULL_INSTALL__ != "boolean" &&
    (Qt().__VUE_I18N_FULL_INSTALL__ = !0),
    typeof __VUE_I18N_LEGACY_API__ != "boolean" &&
      (Qt().__VUE_I18N_LEGACY_API__ = !0),
    typeof __INTLIFY_PROD_DEVTOOLS__ != "boolean" &&
      (Qt().__INTLIFY_PROD_DEVTOOLS__ = !1);
}
zc.__EXTEND_POINT__;
let oa = J.__EXTEND_POINT__;
const ve = () => ++oa,
  oe = {
    UNEXPECTED_RETURN_TYPE: oa,
    INVALID_ARGUMENT: ve(),
    MUST_BE_CALL_SETUP_TOP: ve(),
    NOT_INSLALLED: ve(),
    NOT_AVAILABLE_IN_LEGACY_MODE: ve(),
    REQUIRED_VALUE: ve(),
    INVALID_VALUE: ve(),
    CANNOT_SETUP_VUE_DEVTOOLS_PLUGIN: ve(),
    NOT_INSLALLED_WITH_PROVIDE: ve(),
    UNEXPECTED_ERROR: ve(),
    NOT_COMPATIBLE_LEGACY_VUE_I18N: ve(),
    BRIDGE_SUPPORT_VUE_2_ONLY: ve(),
    MUST_DEFINE_I18N_OPTION_IN_ALLOW_COMPOSITION: ve(),
    NOT_AVAILABLE_COMPOSITION_IN_LEGACY: ve(),
    __EXTEND_POINT__: ve(),
  };
function ue(e, ...t) {
  return xn(e, null, void 0);
}
const fr = gt("__transrateVNode"),
  dr = gt("__datetimeParts"),
  mr = gt("__numberParts"),
  ca = gt("__setPluralRules");
gt("__intlifyMeta");
const ua = gt("__injectWithOption");
function _r(e) {
  if (!te(e)) return e;
  for (const t in e)
    if (!!Dr(e, t))
      if (!t.includes(".")) te(e[t]) && _r(e[t]);
      else {
        const n = t.split("."),
          r = n.length - 1;
        let l = e;
        for (let s = 0; s < r; s++) n[s] in l || (l[n[s]] = {}), (l = l[n[s]]);
        (l[n[r]] = e[t]), delete e[t], te(l[n[r]]) && _r(l[n[r]]);
      }
  return e;
}
function Un(e, t) {
  const { messages: n, __i18n: r, messageResolver: l, flatJson: s } = t,
    i = U(n) ? n : ee(r) ? {} : { [e]: {} };
  if (
    (ee(r) &&
      r.forEach((c) => {
        if ("locale" in c && "resource" in c) {
          const { locale: u, resource: d } = c;
          u ? ((i[u] = i[u] || {}), Zt(d, i[u])) : Zt(d, i);
        } else M(c) && Zt(JSON.parse(c), i);
      }),
    l == null && s)
  )
    for (const c in i) Dr(i, c) && _r(i[c]);
  return i;
}
const mn = (e) => !te(e) || ee(e);
function Zt(e, t) {
  if (mn(e) || mn(t)) throw ue(oe.INVALID_VALUE);
  for (const n in e)
    Dr(e, n) && (mn(e[n]) || mn(t[n]) ? (t[n] = e[n]) : Zt(e[n], t[n]));
}
function fa(e) {
  return e.type;
}
function da(e, t, n) {
  let r = te(t.messages) ? t.messages : {};
  "__i18nGlobal" in n &&
    (r = Un(e.locale.value, { messages: r, __i18n: n.__i18nGlobal }));
  const l = Object.keys(r);
  l.length &&
    l.forEach((s) => {
      e.mergeLocaleMessage(s, r[s]);
    });
  {
    if (te(t.datetimeFormats)) {
      const s = Object.keys(t.datetimeFormats);
      s.length &&
        s.forEach((i) => {
          e.mergeDateTimeFormat(i, t.datetimeFormats[i]);
        });
    }
    if (te(t.numberFormats)) {
      const s = Object.keys(t.numberFormats);
      s.length &&
        s.forEach((i) => {
          e.mergeNumberFormat(i, t.numberFormats[i]);
        });
    }
  }
}
function Us(e) {
  return Oe(wn, null, e, 0);
}
const Ws = "__INTLIFY_META__";
let Hs = 0;
function Vs(e) {
  return (t, n, r, l) => e(n, r, rn() || void 0, l);
}
const Eu = () => {
  const e = rn();
  let t = null;
  return e && (t = fa(e)[Ws]) ? { [Ws]: t } : null;
};
function Wr(e = {}, t) {
  const { __root: n } = e,
    r = n === void 0;
  let l = j(e.inheritLocale) ? e.inheritLocale : !0;
  const s = Ze(n && l ? n.locale.value : M(e.locale) ? e.locale : an),
    i = Ze(
      n && l
        ? n.fallbackLocale.value
        : M(e.fallbackLocale) ||
          ee(e.fallbackLocale) ||
          U(e.fallbackLocale) ||
          e.fallbackLocale === !1
        ? e.fallbackLocale
        : s.value
    ),
    c = Ze(Un(s.value, e)),
    u = Ze(U(e.datetimeFormats) ? e.datetimeFormats : { [s.value]: {} }),
    d = Ze(U(e.numberFormats) ? e.numberFormats : { [s.value]: {} });
  let g = n
      ? n.missingWarn
      : j(e.missingWarn) || ht(e.missingWarn)
      ? e.missingWarn
      : !0,
    E = n
      ? n.fallbackWarn
      : j(e.fallbackWarn) || ht(e.fallbackWarn)
      ? e.fallbackWarn
      : !0,
    p = n ? n.fallbackRoot : j(e.fallbackRoot) ? e.fallbackRoot : !0,
    y = !!e.fallbackFormat,
    R = ie(e.missing) ? e.missing : null,
    F = ie(e.missing) ? Vs(e.missing) : null,
    A = ie(e.postTranslation) ? e.postTranslation : null,
    _ = n ? n.warnHtmlMessage : j(e.warnHtmlMessage) ? e.warnHtmlMessage : !0,
    v = !!e.escapeParameter;
  const k = n ? n.modifiers : U(e.modifiers) ? e.modifiers : {};
  let T = e.pluralRules || (n && n.pluralRules),
    I;
  (I = (() => {
    r && Fs(null);
    const m = {
      version: pu,
      locale: s.value,
      fallbackLocale: i.value,
      messages: c.value,
      modifiers: k,
      pluralRules: T,
      missing: F === null ? void 0 : F,
      missingWarn: g,
      fallbackWarn: E,
      fallbackFormat: y,
      unresolving: !0,
      postTranslation: A === null ? void 0 : A,
      warnHtmlMessage: _,
      escapeParameter: v,
      messageResolver: e.messageResolver,
      __meta: { framework: "vue" },
    };
    (m.datetimeFormats = u.value),
      (m.numberFormats = d.value),
      (m.__datetimeFormatters = U(I) ? I.__datetimeFormatters : void 0),
      (m.__numberFormatters = U(I) ? I.__numberFormatters : void 0);
    const L = uu(m);
    return r && Fs(L), L;
  })()),
    Gt(I, s.value, i.value);
  function x() {
    return [s.value, i.value, c.value, u.value, d.value];
  }
  const ne = We({
      get: () => s.value,
      set: (m) => {
        (s.value = m), (I.locale = s.value);
      },
    }),
    X = We({
      get: () => i.value,
      set: (m) => {
        (i.value = m), (I.fallbackLocale = i.value), Gt(I, s.value, m);
      },
    }),
    le = We(() => c.value),
    ae = We(() => u.value),
    ge = We(() => d.value);
  function me() {
    return ie(A) ? A : null;
  }
  function tt(m) {
    (A = m), (I.postTranslation = m);
  }
  function nt() {
    return R;
  }
  function re(m) {
    m !== null && (F = Vs(m)), (R = m), (I.missing = F);
  }
  const K = (m, L, w, D, $, V) => {
    x();
    let B;
    if (__INTLIFY_PROD_DEVTOOLS__)
      try {
        ks(Eu()), r || (I.fallbackContext = n ? cu() : void 0), (B = m(I));
      } finally {
        ks(null), r || (I.fallbackContext = void 0);
      }
    else B = m(I);
    if (ce(B) && B === $n) {
      const [Q, Z] = L();
      return n && p ? D(n) : $(Q);
    } else {
      if (V(B)) return B;
      throw ue(oe.UNEXPECTED_RETURN_TYPE);
    }
  };
  function G(...m) {
    return K(
      (L) => Reflect.apply(ws, null, [L, ...m]),
      () => or(...m),
      "translate",
      (L) => Reflect.apply(L.t, L, [...m]),
      (L) => L,
      (L) => M(L)
    );
  }
  function pe(...m) {
    const [L, w, D] = m;
    if (D && !te(D)) throw ue(oe.INVALID_ARGUMENT);
    return G(L, w, fe({ resolvedMessage: !0 }, D || {}));
  }
  function rt(...m) {
    return K(
      (L) => Reflect.apply(Ss, null, [L, ...m]),
      () => cr(...m),
      "datetime format",
      (L) => Reflect.apply(L.d, L, [...m]),
      () => Os,
      (L) => M(L)
    );
  }
  function Se(...m) {
    return K(
      (L) => Reflect.apply(xs, null, [L, ...m]),
      () => ur(...m),
      "number format",
      (L) => Reflect.apply(L.n, L, [...m]),
      () => Os,
      (L) => M(L)
    );
  }
  function Re(m) {
    return m.map((L) => (M(L) || ce(L) || j(L) ? Us(String(L)) : L));
  }
  const st = { normalize: Re, interpolate: (m) => m, type: "vnode" };
  function bt(...m) {
    return K(
      (L) => {
        let w;
        const D = L;
        try {
          (D.processor = st), (w = Reflect.apply(ws, null, [D, ...m]));
        } finally {
          D.processor = null;
        }
        return w;
      },
      () => or(...m),
      "translate",
      (L) => L[fr](...m),
      (L) => [Us(L)],
      (L) => ee(L)
    );
  }
  function Et(...m) {
    return K(
      (L) => Reflect.apply(xs, null, [L, ...m]),
      () => ur(...m),
      "number format",
      (L) => L[mr](...m),
      () => [],
      (L) => M(L) || ee(L)
    );
  }
  function Ee(...m) {
    return K(
      (L) => Reflect.apply(Ss, null, [L, ...m]),
      () => cr(...m),
      "datetime format",
      (L) => L[dr](...m),
      () => [],
      (L) => M(L) || ee(L)
    );
  }
  function Me(m) {
    (T = m), (I.pluralRules = T);
  }
  function Ke(m, L) {
    const w = M(L) ? L : s.value,
      D = Be(w);
    return I.messageResolver(D, m) !== null;
  }
  function Le(m) {
    let L = null;
    const w = Ql(I, i.value, s.value);
    for (let D = 0; D < w.length; D++) {
      const $ = c.value[w[D]] || {},
        V = I.messageResolver($, m);
      if (V != null) {
        L = V;
        break;
      }
    }
    return L;
  }
  function De(m) {
    const L = Le(m);
    return L != null ? L : n ? n.tm(m) || {} : {};
  }
  function Be(m) {
    return c.value[m] || {};
  }
  function o(m, L) {
    (c.value[m] = L), (I.messages = c.value);
  }
  function a(m, L) {
    (c.value[m] = c.value[m] || {}), Zt(L, c.value[m]), (I.messages = c.value);
  }
  function f(m) {
    return u.value[m] || {};
  }
  function h(m, L) {
    (u.value[m] = L), (I.datetimeFormats = u.value), Ds(I, m, L);
  }
  function b(m, L) {
    (u.value[m] = fe(u.value[m] || {}, L)),
      (I.datetimeFormats = u.value),
      Ds(I, m, L);
  }
  function N(m) {
    return d.value[m] || {};
  }
  function P(m, L) {
    (d.value[m] = L), (I.numberFormats = d.value), $s(I, m, L);
  }
  function O(m, L) {
    (d.value[m] = fe(d.value[m] || {}, L)),
      (I.numberFormats = d.value),
      $s(I, m, L);
  }
  Hs++,
    n &&
      ar &&
      (xt(n.locale, (m) => {
        l && ((s.value = m), (I.locale = m), Gt(I, s.value, i.value));
      }),
      xt(n.fallbackLocale, (m) => {
        l && ((i.value = m), (I.fallbackLocale = m), Gt(I, s.value, i.value));
      }));
  const C = {
    id: Hs,
    locale: ne,
    fallbackLocale: X,
    get inheritLocale() {
      return l;
    },
    set inheritLocale(m) {
      (l = m),
        m &&
          n &&
          ((s.value = n.locale.value),
          (i.value = n.fallbackLocale.value),
          Gt(I, s.value, i.value));
    },
    get availableLocales() {
      return Object.keys(c.value).sort();
    },
    messages: le,
    get modifiers() {
      return k;
    },
    get pluralRules() {
      return T || {};
    },
    get isGlobal() {
      return r;
    },
    get missingWarn() {
      return g;
    },
    set missingWarn(m) {
      (g = m), (I.missingWarn = g);
    },
    get fallbackWarn() {
      return E;
    },
    set fallbackWarn(m) {
      (E = m), (I.fallbackWarn = E);
    },
    get fallbackRoot() {
      return p;
    },
    set fallbackRoot(m) {
      p = m;
    },
    get fallbackFormat() {
      return y;
    },
    set fallbackFormat(m) {
      (y = m), (I.fallbackFormat = y);
    },
    get warnHtmlMessage() {
      return _;
    },
    set warnHtmlMessage(m) {
      (_ = m), (I.warnHtmlMessage = m);
    },
    get escapeParameter() {
      return v;
    },
    set escapeParameter(m) {
      (v = m), (I.escapeParameter = m);
    },
    t: G,
    getLocaleMessage: Be,
    setLocaleMessage: o,
    mergeLocaleMessage: a,
    getPostTranslationHandler: me,
    setPostTranslationHandler: tt,
    getMissingHandler: nt,
    setMissingHandler: re,
    [ca]: Me,
  };
  return (
    (C.datetimeFormats = ae),
    (C.numberFormats = ge),
    (C.rt = pe),
    (C.te = Ke),
    (C.tm = De),
    (C.d = rt),
    (C.n = Se),
    (C.getDateTimeFormat = f),
    (C.setDateTimeFormat = h),
    (C.mergeDateTimeFormat = b),
    (C.getNumberFormat = N),
    (C.setNumberFormat = P),
    (C.mergeNumberFormat = O),
    (C[ua] = e.__injectWithOption),
    (C[fr] = bt),
    (C[dr] = Ee),
    (C[mr] = Et),
    C
  );
}
function Lu(e) {
  const t = M(e.locale) ? e.locale : an,
    n =
      M(e.fallbackLocale) ||
      ee(e.fallbackLocale) ||
      U(e.fallbackLocale) ||
      e.fallbackLocale === !1
        ? e.fallbackLocale
        : t,
    r = ie(e.missing) ? e.missing : void 0,
    l =
      j(e.silentTranslationWarn) || ht(e.silentTranslationWarn)
        ? !e.silentTranslationWarn
        : !0,
    s =
      j(e.silentFallbackWarn) || ht(e.silentFallbackWarn)
        ? !e.silentFallbackWarn
        : !0,
    i = j(e.fallbackRoot) ? e.fallbackRoot : !0,
    c = !!e.formatFallbackMessages,
    u = U(e.modifiers) ? e.modifiers : {},
    d = e.pluralizationRules,
    g = ie(e.postTranslation) ? e.postTranslation : void 0,
    E = M(e.warnHtmlInMessage) ? e.warnHtmlInMessage !== "off" : !0,
    p = !!e.escapeParameterHtml,
    y = j(e.sync) ? e.sync : !0;
  let R = e.messages;
  if (U(e.sharedMessages)) {
    const I = e.sharedMessages;
    R = Object.keys(I).reduce((x, ne) => {
      const X = x[ne] || (x[ne] = {});
      return fe(X, I[ne]), x;
    }, R || {});
  }
  const { __i18n: F, __root: A, __injectWithOption: _ } = e,
    v = e.datetimeFormats,
    k = e.numberFormats,
    T = e.flatJson;
  return {
    locale: t,
    fallbackLocale: n,
    messages: R,
    flatJson: T,
    datetimeFormats: v,
    numberFormats: k,
    missing: r,
    missingWarn: l,
    fallbackWarn: s,
    fallbackRoot: i,
    fallbackFormat: c,
    modifiers: u,
    pluralRules: d,
    postTranslation: g,
    warnHtmlMessage: E,
    escapeParameter: p,
    messageResolver: e.messageResolver,
    inheritLocale: y,
    __i18n: F,
    __root: A,
    __injectWithOption: _,
  };
}
function hr(e = {}, t) {
  {
    const n = Wr(Lu(e)),
      r = {
        id: n.id,
        get locale() {
          return n.locale.value;
        },
        set locale(l) {
          n.locale.value = l;
        },
        get fallbackLocale() {
          return n.fallbackLocale.value;
        },
        set fallbackLocale(l) {
          n.fallbackLocale.value = l;
        },
        get messages() {
          return n.messages.value;
        },
        get datetimeFormats() {
          return n.datetimeFormats.value;
        },
        get numberFormats() {
          return n.numberFormats.value;
        },
        get availableLocales() {
          return n.availableLocales;
        },
        get formatter() {
          return {
            interpolate() {
              return [];
            },
          };
        },
        set formatter(l) {},
        get missing() {
          return n.getMissingHandler();
        },
        set missing(l) {
          n.setMissingHandler(l);
        },
        get silentTranslationWarn() {
          return j(n.missingWarn) ? !n.missingWarn : n.missingWarn;
        },
        set silentTranslationWarn(l) {
          n.missingWarn = j(l) ? !l : l;
        },
        get silentFallbackWarn() {
          return j(n.fallbackWarn) ? !n.fallbackWarn : n.fallbackWarn;
        },
        set silentFallbackWarn(l) {
          n.fallbackWarn = j(l) ? !l : l;
        },
        get modifiers() {
          return n.modifiers;
        },
        get formatFallbackMessages() {
          return n.fallbackFormat;
        },
        set formatFallbackMessages(l) {
          n.fallbackFormat = l;
        },
        get postTranslation() {
          return n.getPostTranslationHandler();
        },
        set postTranslation(l) {
          n.setPostTranslationHandler(l);
        },
        get sync() {
          return n.inheritLocale;
        },
        set sync(l) {
          n.inheritLocale = l;
        },
        get warnHtmlInMessage() {
          return n.warnHtmlMessage ? "warn" : "off";
        },
        set warnHtmlInMessage(l) {
          n.warnHtmlMessage = l !== "off";
        },
        get escapeParameterHtml() {
          return n.escapeParameter;
        },
        set escapeParameterHtml(l) {
          n.escapeParameter = l;
        },
        get preserveDirectiveContent() {
          return !0;
        },
        set preserveDirectiveContent(l) {},
        get pluralizationRules() {
          return n.pluralRules || {};
        },
        __composer: n,
        t(...l) {
          const [s, i, c] = l,
            u = {};
          let d = null,
            g = null;
          if (!M(s)) throw ue(oe.INVALID_ARGUMENT);
          const E = s;
          return (
            M(i) ? (u.locale = i) : ee(i) ? (d = i) : U(i) && (g = i),
            ee(c) ? (d = c) : U(c) && (g = c),
            Reflect.apply(n.t, n, [E, d || g || {}, u])
          );
        },
        rt(...l) {
          return Reflect.apply(n.rt, n, [...l]);
        },
        tc(...l) {
          const [s, i, c] = l,
            u = { plural: 1 };
          let d = null,
            g = null;
          if (!M(s)) throw ue(oe.INVALID_ARGUMENT);
          const E = s;
          return (
            M(i)
              ? (u.locale = i)
              : ce(i)
              ? (u.plural = i)
              : ee(i)
              ? (d = i)
              : U(i) && (g = i),
            M(c) ? (u.locale = c) : ee(c) ? (d = c) : U(c) && (g = c),
            Reflect.apply(n.t, n, [E, d || g || {}, u])
          );
        },
        te(l, s) {
          return n.te(l, s);
        },
        tm(l) {
          return n.tm(l);
        },
        getLocaleMessage(l) {
          return n.getLocaleMessage(l);
        },
        setLocaleMessage(l, s) {
          n.setLocaleMessage(l, s);
        },
        mergeLocaleMessage(l, s) {
          n.mergeLocaleMessage(l, s);
        },
        d(...l) {
          return Reflect.apply(n.d, n, [...l]);
        },
        getDateTimeFormat(l) {
          return n.getDateTimeFormat(l);
        },
        setDateTimeFormat(l, s) {
          n.setDateTimeFormat(l, s);
        },
        mergeDateTimeFormat(l, s) {
          n.mergeDateTimeFormat(l, s);
        },
        n(...l) {
          return Reflect.apply(n.n, n, [...l]);
        },
        getNumberFormat(l) {
          return n.getNumberFormat(l);
        },
        setNumberFormat(l, s) {
          n.setNumberFormat(l, s);
        },
        mergeNumberFormat(l, s) {
          n.mergeNumberFormat(l, s);
        },
        getChoiceIndex(l, s) {
          return -1;
        },
        __onComponentInstanceCreated(l) {
          const { componentInstanceCreatedListener: s } = e;
          s && s(l, r);
        },
      };
    return r;
  }
}
const Hr = {
  tag: { type: [String, Object] },
  locale: { type: String },
  scope: {
    type: String,
    validator: (e) => e === "parent" || e === "global",
    default: "parent",
  },
  i18n: { type: Object },
};
function Tu({ slots: e }, t) {
  return t.length === 1 && t[0] === "default"
    ? (e.default ? e.default() : []).reduce(
        (r, l) => (r = [...r, ...(ee(l.children) ? l.children : [l])]),
        []
      )
    : t.reduce((n, r) => {
        const l = e[r];
        return l && (n[r] = l()), n;
      }, {});
}
function ma(e) {
  return Ne;
}
const js = {
  name: "i18n-t",
  props: fe(
    {
      keypath: { type: String, required: !0 },
      plural: { type: [Number, String], validator: (e) => ce(e) || !isNaN(e) },
    },
    Hr
  ),
  setup(e, t) {
    const { slots: n, attrs: r } = t,
      l = e.i18n || Vr({ useScope: e.scope, __useComponent: !0 });
    return () => {
      const s = Object.keys(n).filter((E) => E !== "_"),
        i = {};
      e.locale && (i.locale = e.locale),
        e.plural !== void 0 && (i.plural = M(e.plural) ? +e.plural : e.plural);
      const c = Tu(t, s),
        u = l[fr](e.keypath, c, i),
        d = fe({}, r),
        g = M(e.tag) || te(e.tag) ? e.tag : ma();
      return Yl(g, d, u);
    };
  },
};
function Iu(e) {
  return ee(e) && !M(e[0]);
}
function _a(e, t, n, r) {
  const { slots: l, attrs: s } = t;
  return () => {
    const i = { part: !0 };
    let c = {};
    e.locale && (i.locale = e.locale),
      M(e.format)
        ? (i.key = e.format)
        : te(e.format) &&
          (M(e.format.key) && (i.key = e.format.key),
          (c = Object.keys(e.format).reduce(
            (p, y) => (n.includes(y) ? fe({}, p, { [y]: e.format[y] }) : p),
            {}
          )));
    const u = r(e.value, i, c);
    let d = [i.key];
    ee(u)
      ? (d = u.map((p, y) => {
          const R = l[p.type],
            F = R ? R({ [p.type]: p.value, index: y, parts: u }) : [p.value];
          return Iu(F) && (F[0].key = `${p.type}-${y}`), F;
        }))
      : M(u) && (d = [u]);
    const g = fe({}, s),
      E = M(e.tag) || te(e.tag) ? e.tag : ma();
    return Yl(E, g, d);
  };
}
const Ks = {
    name: "i18n-n",
    props: fe(
      {
        value: { type: Number, required: !0 },
        format: { type: [String, Object] },
      },
      Hr
    ),
    setup(e, t) {
      const n = e.i18n || Vr({ useScope: "parent", __useComponent: !0 });
      return _a(e, t, ia, (...r) => n[mr](...r));
    },
  },
  Bs = {
    name: "i18n-d",
    props: fe(
      {
        value: { type: [Number, Date], required: !0 },
        format: { type: [String, Object] },
      },
      Hr
    ),
    setup(e, t) {
      const n = e.i18n || Vr({ useScope: "parent", __useComponent: !0 });
      return _a(e, t, aa, (...r) => n[dr](...r));
    },
  };
function Nu(e, t) {
  const n = e;
  if (e.mode === "composition") return n.__getInstance(t) || e.global;
  {
    const r = n.__getInstance(t);
    return r != null ? r.__composer : e.global.__composer;
  }
}
function yu(e) {
  const t = (i) => {
    const { instance: c, modifiers: u, value: d } = i;
    if (!c || !c.$) throw ue(oe.UNEXPECTED_ERROR);
    const g = Nu(e, c.$),
      E = Ys(d);
    return [Reflect.apply(g.t, g, [...Xs(E)]), g];
  };
  return {
    created: (i, c) => {
      const [u, d] = t(c);
      ar &&
        e.global === d &&
        (i.__i18nWatcher = xt(d.locale, () => {
          c.instance && c.instance.$forceUpdate();
        })),
        (i.__composer = d),
        (i.textContent = u);
    },
    unmounted: (i) => {
      ar &&
        i.__i18nWatcher &&
        (i.__i18nWatcher(), (i.__i18nWatcher = void 0), delete i.__i18nWatcher),
        i.__composer && ((i.__composer = void 0), delete i.__composer);
    },
    beforeUpdate: (i, { value: c }) => {
      if (i.__composer) {
        const u = i.__composer,
          d = Ys(c);
        i.textContent = Reflect.apply(u.t, u, [...Xs(d)]);
      }
    },
    getSSRProps: (i) => {
      const [c] = t(i);
      return { textContent: c };
    },
  };
}
function Ys(e) {
  if (M(e)) return { path: e };
  if (U(e)) {
    if (!("path" in e)) throw ue(oe.REQUIRED_VALUE, "path");
    return e;
  } else throw ue(oe.INVALID_VALUE);
}
function Xs(e) {
  const { path: t, locale: n, args: r, choice: l, plural: s } = e,
    i = {},
    c = r || {};
  return (
    M(n) && (i.locale = n),
    ce(l) && (i.plural = l),
    ce(s) && (i.plural = s),
    [t, c, i]
  );
}
function vu(e, t, ...n) {
  const r = U(n[0]) ? n[0] : {},
    l = !!r.useI18nComponentName;
  (j(r.globalInstall) ? r.globalInstall : !0) &&
    (e.component(l ? "i18n" : js.name, js),
    e.component(Ks.name, Ks),
    e.component(Bs.name, Bs)),
    e.directive("t", yu(t));
}
function Cu(e, t, n) {
  return {
    beforeCreate() {
      const r = rn();
      if (!r) throw ue(oe.UNEXPECTED_ERROR);
      const l = this.$options;
      if (l.i18n) {
        const s = l.i18n;
        l.__i18n && (s.__i18n = l.__i18n),
          (s.__root = t),
          this === this.$root
            ? (this.$i18n = Gs(e, s))
            : ((s.__injectWithOption = !0), (this.$i18n = hr(s)));
      } else
        l.__i18n
          ? this === this.$root
            ? (this.$i18n = Gs(e, l))
            : (this.$i18n = hr({
                __i18n: l.__i18n,
                __injectWithOption: !0,
                __root: t,
              }))
          : (this.$i18n = e);
      l.__i18nGlobal && da(t, l, l),
        e.__onComponentInstanceCreated(this.$i18n),
        n.__setInstance(r, this.$i18n),
        (this.$t = (...s) => this.$i18n.t(...s)),
        (this.$rt = (...s) => this.$i18n.rt(...s)),
        (this.$tc = (...s) => this.$i18n.tc(...s)),
        (this.$te = (s, i) => this.$i18n.te(s, i)),
        (this.$d = (...s) => this.$i18n.d(...s)),
        (this.$n = (...s) => this.$i18n.n(...s)),
        (this.$tm = (s) => this.$i18n.tm(s));
    },
    mounted() {},
    unmounted() {
      const r = rn();
      if (!r) throw ue(oe.UNEXPECTED_ERROR);
      delete this.$t,
        delete this.$rt,
        delete this.$tc,
        delete this.$te,
        delete this.$d,
        delete this.$n,
        delete this.$tm,
        n.__deleteInstance(r),
        delete this.$i18n;
    },
  };
}
function Gs(e, t) {
  (e.locale = t.locale || e.locale),
    (e.fallbackLocale = t.fallbackLocale || e.fallbackLocale),
    (e.missing = t.missing || e.missing),
    (e.silentTranslationWarn = t.silentTranslationWarn || e.silentFallbackWarn),
    (e.silentFallbackWarn = t.silentFallbackWarn || e.silentFallbackWarn),
    (e.formatFallbackMessages =
      t.formatFallbackMessages || e.formatFallbackMessages),
    (e.postTranslation = t.postTranslation || e.postTranslation),
    (e.warnHtmlInMessage = t.warnHtmlInMessage || e.warnHtmlInMessage),
    (e.escapeParameterHtml = t.escapeParameterHtml || e.escapeParameterHtml),
    (e.sync = t.sync || e.sync),
    e.__composer[ca](t.pluralizationRules || e.pluralizationRules);
  const n = Un(e.locale, { messages: t.messages, __i18n: t.__i18n });
  return (
    Object.keys(n).forEach((r) => e.mergeLocaleMessage(r, n[r])),
    t.datetimeFormats &&
      Object.keys(t.datetimeFormats).forEach((r) =>
        e.mergeDateTimeFormat(r, t.datetimeFormats[r])
      ),
    t.numberFormats &&
      Object.keys(t.numberFormats).forEach((r) =>
        e.mergeNumberFormat(r, t.numberFormats[r])
      ),
    e
  );
}
const Ou = gt("global-vue-i18n");
function Au(e = {}, t) {
  const n =
      __VUE_I18N_LEGACY_API__ && j(e.legacy)
        ? e.legacy
        : __VUE_I18N_LEGACY_API__,
    r = j(e.globalInjection) ? e.globalInjection : !0,
    l = __VUE_I18N_LEGACY_API__ && n ? !!e.allowComposition : !0,
    s = new Map(),
    [i, c] = ku(e, n),
    u = gt("");
  function d(p) {
    return s.get(p) || null;
  }
  function g(p, y) {
    s.set(p, y);
  }
  function E(p) {
    s.delete(p);
  }
  {
    const p = {
      get mode() {
        return __VUE_I18N_LEGACY_API__ && n ? "legacy" : "composition";
      },
      get allowComposition() {
        return l;
      },
      async install(y, ...R) {
        (y.__VUE_I18N_SYMBOL__ = u),
          y.provide(y.__VUE_I18N_SYMBOL__, p),
          !n && r && $u(y, p.global),
          __VUE_I18N_FULL_INSTALL__ && vu(y, p, ...R),
          __VUE_I18N_LEGACY_API__ && n && y.mixin(Cu(c, c.__composer, p));
        const F = y.unmount;
        y.unmount = () => {
          p.dispose(), F();
        };
      },
      get global() {
        return c;
      },
      dispose() {
        i.stop();
      },
      __instances: s,
      __getInstance: d,
      __setInstance: g,
      __deleteInstance: E,
    };
    return p;
  }
}
function Vr(e = {}) {
  const t = rn();
  if (t == null) throw ue(oe.MUST_BE_CALL_SETUP_TOP);
  if (
    !t.isCE &&
    t.appContext.app != null &&
    !t.appContext.app.__VUE_I18N_SYMBOL__
  )
    throw ue(oe.NOT_INSLALLED);
  const n = Fu(t),
    r = Ru(n),
    l = fa(t),
    s = Pu(e, l);
  if (__VUE_I18N_LEGACY_API__ && n.mode === "legacy" && !e.__useComponent) {
    if (!n.allowComposition) throw ue(oe.NOT_AVAILABLE_IN_LEGACY_MODE);
    return Su(t, s, r, e);
  }
  if (s === "global") return da(r, e, l), r;
  if (s === "parent") {
    let u = Mu(n, t, e.__useComponent);
    return u == null && (u = r), u;
  }
  const i = n;
  let c = i.__getInstance(t);
  if (c == null) {
    const u = fe({}, e);
    "__i18n" in l && (u.__i18n = l.__i18n),
      r && (u.__root = r),
      (c = Wr(u)),
      wu(i, t),
      i.__setInstance(t, c);
  }
  return c;
}
function ku(e, t, n) {
  const r = Aa();
  {
    const l =
      __VUE_I18N_LEGACY_API__ && t ? r.run(() => hr(e)) : r.run(() => Wr(e));
    if (l == null) throw ue(oe.UNEXPECTED_ERROR);
    return [r, l];
  }
}
function Fu(e) {
  {
    const t = hn(e.isCE ? Ou : e.appContext.app.__VUE_I18N_SYMBOL__);
    if (!t)
      throw ue(e.isCE ? oe.NOT_INSLALLED_WITH_PROVIDE : oe.UNEXPECTED_ERROR);
    return t;
  }
}
function Pu(e, t) {
  return Dn(e)
    ? "__i18n" in t
      ? "local"
      : "global"
    : e.useScope
    ? e.useScope
    : "local";
}
function Ru(e) {
  return e.mode === "composition" ? e.global : e.global.__composer;
}
function Mu(e, t, n = !1) {
  let r = null;
  const l = t.root;
  let s = t.parent;
  for (; s != null; ) {
    const i = e;
    if (e.mode === "composition") r = i.__getInstance(s);
    else if (__VUE_I18N_LEGACY_API__) {
      const c = i.__getInstance(s);
      c != null && ((r = c.__composer), n && r && !r[ua] && (r = null));
    }
    if (r != null || l === s) break;
    s = s.parent;
  }
  return r;
}
function wu(e, t, n) {
  Rl(() => {}, t),
    Rr(() => {
      e.__deleteInstance(t);
    }, t);
}
function Su(e, t, n, r = {}) {
  const l = t === "local",
    s = ni(null);
  if (l && e.proxy && !(e.proxy.$options.i18n || e.proxy.$options.__i18n))
    throw ue(oe.MUST_DEFINE_I18N_OPTION_IN_ALLOW_COMPOSITION);
  const i = j(r.inheritLocale) ? r.inheritLocale : !0,
    c = Ze(l && i ? n.locale.value : M(r.locale) ? r.locale : an),
    u = Ze(
      l && i
        ? n.fallbackLocale.value
        : M(r.fallbackLocale) ||
          ee(r.fallbackLocale) ||
          U(r.fallbackLocale) ||
          r.fallbackLocale === !1
        ? r.fallbackLocale
        : c.value
    ),
    d = Ze(Un(c.value, r)),
    g = Ze(U(r.datetimeFormats) ? r.datetimeFormats : { [c.value]: {} }),
    E = Ze(U(r.numberFormats) ? r.numberFormats : { [c.value]: {} }),
    p = l
      ? n.missingWarn
      : j(r.missingWarn) || ht(r.missingWarn)
      ? r.missingWarn
      : !0,
    y = l
      ? n.fallbackWarn
      : j(r.fallbackWarn) || ht(r.fallbackWarn)
      ? r.fallbackWarn
      : !0,
    R = l ? n.fallbackRoot : j(r.fallbackRoot) ? r.fallbackRoot : !0,
    F = !!r.fallbackFormat,
    A = ie(r.missing) ? r.missing : null,
    _ = ie(r.postTranslation) ? r.postTranslation : null,
    v = l ? n.warnHtmlMessage : j(r.warnHtmlMessage) ? r.warnHtmlMessage : !0,
    k = !!r.escapeParameter,
    T = l ? n.modifiers : U(r.modifiers) ? r.modifiers : {},
    I = r.pluralRules || (l && n.pluralRules);
  function S() {
    return [c.value, u.value, d.value, g.value, E.value];
  }
  const x = We({
      get: () => (s.value ? s.value.locale.value : c.value),
      set: (a) => {
        s.value && (s.value.locale.value = a), (c.value = a);
      },
    }),
    ne = We({
      get: () => (s.value ? s.value.fallbackLocale.value : u.value),
      set: (a) => {
        s.value && (s.value.fallbackLocale.value = a), (u.value = a);
      },
    }),
    X = We(() => (s.value ? s.value.messages.value : d.value)),
    le = We(() => g.value),
    ae = We(() => E.value);
  function ge() {
    return s.value ? s.value.getPostTranslationHandler() : _;
  }
  function me(a) {
    s.value && s.value.setPostTranslationHandler(a);
  }
  function tt() {
    return s.value ? s.value.getMissingHandler() : A;
  }
  function nt(a) {
    s.value && s.value.setMissingHandler(a);
  }
  function re(a) {
    return S(), a();
  }
  function K(...a) {
    return s.value
      ? re(() => Reflect.apply(s.value.t, null, [...a]))
      : re(() => "");
  }
  function G(...a) {
    return s.value ? Reflect.apply(s.value.rt, null, [...a]) : "";
  }
  function pe(...a) {
    return s.value
      ? re(() => Reflect.apply(s.value.d, null, [...a]))
      : re(() => "");
  }
  function rt(...a) {
    return s.value
      ? re(() => Reflect.apply(s.value.n, null, [...a]))
      : re(() => "");
  }
  function Se(a) {
    return s.value ? s.value.tm(a) : {};
  }
  function Re(a, f) {
    return s.value ? s.value.te(a, f) : !1;
  }
  function Ae(a) {
    return s.value ? s.value.getLocaleMessage(a) : {};
  }
  function st(a, f) {
    s.value && (s.value.setLocaleMessage(a, f), (d.value[a] = f));
  }
  function bt(a, f) {
    s.value && s.value.mergeLocaleMessage(a, f);
  }
  function Et(a) {
    return s.value ? s.value.getDateTimeFormat(a) : {};
  }
  function Ee(a, f) {
    s.value && (s.value.setDateTimeFormat(a, f), (g.value[a] = f));
  }
  function Me(a, f) {
    s.value && s.value.mergeDateTimeFormat(a, f);
  }
  function Ke(a) {
    return s.value ? s.value.getNumberFormat(a) : {};
  }
  function Le(a, f) {
    s.value && (s.value.setNumberFormat(a, f), (E.value[a] = f));
  }
  function De(a, f) {
    s.value && s.value.mergeNumberFormat(a, f);
  }
  const Be = {
    get id() {
      return s.value ? s.value.id : -1;
    },
    locale: x,
    fallbackLocale: ne,
    messages: X,
    datetimeFormats: le,
    numberFormats: ae,
    get inheritLocale() {
      return s.value ? s.value.inheritLocale : i;
    },
    set inheritLocale(a) {
      s.value && (s.value.inheritLocale = a);
    },
    get availableLocales() {
      return s.value ? s.value.availableLocales : Object.keys(d.value);
    },
    get modifiers() {
      return s.value ? s.value.modifiers : T;
    },
    get pluralRules() {
      return s.value ? s.value.pluralRules : I;
    },
    get isGlobal() {
      return s.value ? s.value.isGlobal : !1;
    },
    get missingWarn() {
      return s.value ? s.value.missingWarn : p;
    },
    set missingWarn(a) {
      s.value && (s.value.missingWarn = a);
    },
    get fallbackWarn() {
      return s.value ? s.value.fallbackWarn : y;
    },
    set fallbackWarn(a) {
      s.value && (s.value.missingWarn = a);
    },
    get fallbackRoot() {
      return s.value ? s.value.fallbackRoot : R;
    },
    set fallbackRoot(a) {
      s.value && (s.value.fallbackRoot = a);
    },
    get fallbackFormat() {
      return s.value ? s.value.fallbackFormat : F;
    },
    set fallbackFormat(a) {
      s.value && (s.value.fallbackFormat = a);
    },
    get warnHtmlMessage() {
      return s.value ? s.value.warnHtmlMessage : v;
    },
    set warnHtmlMessage(a) {
      s.value && (s.value.warnHtmlMessage = a);
    },
    get escapeParameter() {
      return s.value ? s.value.escapeParameter : k;
    },
    set escapeParameter(a) {
      s.value && (s.value.escapeParameter = a);
    },
    t: K,
    getPostTranslationHandler: ge,
    setPostTranslationHandler: me,
    getMissingHandler: tt,
    setMissingHandler: nt,
    rt: G,
    d: pe,
    n: rt,
    tm: Se,
    te: Re,
    getLocaleMessage: Ae,
    setLocaleMessage: st,
    mergeLocaleMessage: bt,
    getDateTimeFormat: Et,
    setDateTimeFormat: Ee,
    mergeDateTimeFormat: Me,
    getNumberFormat: Ke,
    setNumberFormat: Le,
    mergeNumberFormat: De,
  };
  function o(a) {
    (a.locale.value = c.value),
      (a.fallbackLocale.value = u.value),
      Object.keys(d.value).forEach((f) => {
        a.mergeLocaleMessage(f, d.value[f]);
      }),
      Object.keys(g.value).forEach((f) => {
        a.mergeDateTimeFormat(f, g.value[f]);
      }),
      Object.keys(E.value).forEach((f) => {
        a.mergeNumberFormat(f, E.value[f]);
      }),
      (a.escapeParameter = k),
      (a.fallbackFormat = F),
      (a.fallbackRoot = R),
      (a.fallbackWarn = y),
      (a.missingWarn = p),
      (a.warnHtmlMessage = v);
  }
  return (
    Pl(() => {
      if (e.proxy == null || e.proxy.$i18n == null)
        throw ue(oe.NOT_AVAILABLE_COMPOSITION_IN_LEGACY);
      const a = (s.value = e.proxy.$i18n.__composer);
      t === "global"
        ? ((c.value = a.locale.value),
          (u.value = a.fallbackLocale.value),
          (d.value = a.messages.value),
          (g.value = a.datetimeFormats.value),
          (E.value = a.numberFormats.value))
        : l && o(a);
    }),
    Be
  );
}
const Du = ["locale", "fallbackLocale", "availableLocales"],
  xu = ["t", "rt", "d", "n", "tm"];
function $u(e, t) {
  const n = Object.create(null);
  Du.forEach((r) => {
    const l = Object.getOwnPropertyDescriptor(t, r);
    if (!l) throw ue(oe.UNEXPECTED_ERROR);
    const s = he(l.value)
      ? {
          get() {
            return l.value.value;
          },
          set(i) {
            l.value.value = i;
          },
        }
      : {
          get() {
            return l.get && l.get();
          },
        };
    Object.defineProperty(n, r, s);
  }),
    (e.config.globalProperties.$i18n = n),
    xu.forEach((r) => {
      const l = Object.getOwnPropertyDescriptor(t, r);
      if (!l || !l.value) throw ue(oe.UNEXPECTED_ERROR);
      Object.defineProperty(e.config.globalProperties, `$${r}`, l);
    });
}
lu(du);
au(Wc);
iu(Ql);
bu();
if (__INTLIFY_PROD_DEVTOOLS__) {
  const e = Qt();
  (e.__INTLIFY__ = !0), Jc(e.__INTLIFY_DEVTOOLS_GLOBAL_HOOK__);
}
const Uu = {
    form: { submit: "Enter", error: "Invalid code." },
    content: {
      keys: {
        left: {
          header: "LEFT KEY",
          text: "left",
          rule: "Turned the right key.",
        },
        right: {
          header: "RIGHT KEY",
          text: "right",
          rule: "Turned any left keys.",
        },
      },
      rules: {
        after: {
          text: "Turn the {key} key after you have done <strong>all</strong> of the following:",
          mods: "Solved all {mod} modules.",
        },
        before: {
          text: "But before you have done <strong>any</strong> of the following:",
          mods: "Solved any {mod} modules.",
        },
      },
    },
  },
  Wu = { en: Uu };
window.addEventListener("load", () => {
  const e = Au({ locale: "en", fallbackLocale: "en", messages: Wu }),
    t = Es(Go);
  t.use(e), t.mount("#ttks-form");
  const n = Es(sc);
  n.use(e), n.mount("#ttks-content");
});
