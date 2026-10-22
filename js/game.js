// Stavbyvedoucí a gorila – hra ve stylu ZX Spectrum (4 obrazovky: traverzy, cementárna, výtahy, nýty).
(function () {
    'use strict';

    var KEY = 'opice';
    var rnd = Z.rng(20261022);

    var state = 'title', stT = 0;
    var stageIdx = 0, loop = 0, score = 0, lives = 3, nextExtra = 20000;
    var S = null, hero = null, en = [], fx = [];
    var bonus = 0, bonusT = 0, spawnT = 0, fireT = 0, gor = null, newRec = false, clearScore = 0;
    var GAMEOBJ = window.GAME = { invincible: false };

    // ------------------------------------------------------------------ sprity
    var HP = { y: 14, f: 15, k: 0, r: 10, b: 9, w: 6 };
    var TOP = ['...yyyy...', '..yyyyyy..', '..ffffff..', '..fkffkf..', '..ffffff..', '...rrrr...', '.rrrrrrrr.', '.rrbbbbrr.', '.ffbbbbff.', '..bbbbbb..'];
    var LEG_S = ['..bb..bb..', '..bb..bb..', '.ww....ww.', '.ww....ww.'];
    var LEG_A = ['.bb....bb.', 'bb......bb', 'ww......ww', 'ww......ww'];
    var LEG_B = ['..bbbbbb..', '...bbbb...', '...wwww...', '...wwww...'];
    var TOPJ = ['f..yyyy..f', 'f.yyyyyy.f', 'rrffffffrr', 'r.fkffkf.r', '..ffffff..', '...rrrr...', '..rrrrrr..', '..rbbbbr..', '..bbbbbb..', '..bbbbbb..'];
    TOPJ[0] = 'f..yyyy..f';
    var TOPC = ['f..yyyy..f', 'f.yyyyyy.f', 'r.ffffff.r', 'rr.ffff.rr', '.rrrrrrrr.', '..rrrrrr..', '..bbbbbb..', '..bbbbbb..'];
    var LEGC_A = ['..bb..bb..', '..bb..bb..', '..bb..bb..', '..bb..bb..', '..ww..ww..', '..ww..ww..'];
    var LEGC_B = ['..bb..bb..', '..bb...bb.', '..bb...bb.', '.bb...bb..', '..ww..ww..', '..ww..ww..'];
    var HERO = {
        stand: TOP.concat(LEG_S), walkA: TOP.concat(LEG_A), walkB: TOP.concat(LEG_B),
        jump: TOPJ.concat(LEG_A), climbA: TOPC.concat(LEGC_A), climbB: TOPC.concat(LEGC_B)
    };
    var GIRL = ['..yyy..', '.yyyyy.', '.yfffy.', '.yfffy.', '..fff..', '..mmm..', '.mmmmm.', 'mmmmmmm', 'mmmmmmm', '.mmmmm.', '..f.f..', '..f.f..'];
    var GIRLP = { y: 14, f: 15, m: 11 };
    var FIRE_A = ['...y....', '..yry..y', '.yrrry.y', '.rrrrrr.', 'rrwrrwrr', 'rrkrrkrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..'];
    var FIRE_B = ['....y...', 'y..yry..', 'y.yrrry.', '.rrrrrr.', 'rrwrrwrr', 'rrkrrkrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..'];
    var FIREP = { y: 14, r: 10, w: 15, k: 0 };
    var HAT = ['..cccc..', '.cccccc.', 'cccccccc', 'wwwwwwww'];
    var HATP = { c: 13, w: 15 };
    var UMB = ['..mmmm..', '.mmmmmm.', 'mmmmmmmm', '...u....', '...u....', '...u....', '..uu....'];
    var UMBP = { m: 11, u: 14 };
    var HAMI = ['.hhhhhh.', '.hhhhhh.', '...uu...', '...uu...', '...uu...', '...uu...'];
    var HAMP = { h: 15, u: 6 };
    var HEART = ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
    var HEARTP = { r: 10 };

    // ------------------------------------------------------------------ pomocné
    function yAt(p, x) { return p.y1 + (p.y2 - p.y1) * Z.clamp((x - p.x1) / (p.x2 - p.x1), 0, 1); }
    function P(x1, x2, y1, y2, dir, o) {
        var p = { x1: x1, x2: x2, y1: y1, y2: y2, dir: dir || 0, conv: false, sink: false, col: 10, col2: 2 };
        if (o) { for (var k in o) { p[k] = o[k]; } }
        return p;
    }
    function Lad(st, x, u, l) {
        var up = st.plats[u], lo = st.plats[l];
        st.ladders.push({ x: x, upper: up, lower: lo, y1: yAt(up, x), y2: yAt(lo, x) });
    }
    function spd() { return Math.min(1.7, 1 + 0.12 * loop); }
    function addScore(n) {
        score += n;
        if (score >= nextExtra) { nextExtra += 20000; if (lives < 6) { lives++; } Z.snd.coin(); }
    }
    function popup(x, y, txt) { fx.push({ x: x, y: y, t: 45, txt: txt }); }

    // ------------------------------------------------------------------ obrazovky
    function mk1() {
        var s = { id: 1, name: 'TRAVERZY', border: 0, plats: [], ladders: [], hammers: [], items: [], rivets: [], kind: 'b', bonus0: 4000, int0: 130, barLad: true };
        var pl = s.plats, k;
        pl.push(P(28, 252, 184, 184, -1));
        for (k = 1; k <= 5; k++) {
            var Y = 184 - 26 * k;
            pl.push(k % 2 === 1 ? P(4, 244, Y - 3, Y + 3, 1) : P(12, 252, Y + 3, Y - 3, -1));
        }
        pl.push(P(96, 150, 32, 32, 0, { col: 14, col2: 6 }));
        [[214, 1, 0], [84, 1, 0], [36, 2, 1], [140, 2, 1], [200, 3, 2], [96, 3, 2], [50, 4, 3], [150, 4, 3], [218, 5, 4], [110, 5, 4], [120, 6, 5]]
            .forEach(function (a) { Lad(s, a[0], a[1], a[2]); });
        s.hammers = [{ p: 3, x: 40 }, { p: 1, x: 196 }];
        s.items = [{ p: 2, x: 160, t: 'h' }, { p: 4, x: 100, t: 'u' }, { p: 0, x: 160, t: 'h' }];
        s.start = { x: 60, p: 0 };
        s.gor = { x: 26, p: 5 };
        s.girl = { x: 128, p: 6 };
        s.drum = true;
        return s;
    }

    function mk2() {
        var s = { id: 2, name: 'CEMENTÁRNA', border: 1, plats: [], ladders: [], hammers: [], items: [], rivets: [], kind: 't', bonus0: 3600, int0: 120, barLad: false };
        var pl = s.plats;
        pl.push(P(4, 252, 184, 184, 0, { sink: true, col: 5, col2: 1 }));
        pl.push(P(12, 252, 156, 156, -1, { conv: true, col: 13, col2: 1 }));
        pl.push(P(4, 244, 128, 128, 1, { conv: true, col: 13, col2: 1 }));
        pl.push(P(12, 252, 100, 100, -1, { conv: true, col: 13, col2: 1 }));
        pl.push(P(4, 244, 72, 72, 1, { conv: true, col: 13, col2: 1 }));
        pl.push(P(44, 252, 46, 46, 0, { col: 10, col2: 2 }));
        pl.push(P(4, 40, 40, 40, 0, { col: 14, col2: 6 }));
        [[216, 1, 0], [100, 1, 0], [40, 2, 1], [150, 2, 1], [216, 3, 2], [90, 3, 2], [140, 4, 3], [60, 4, 3], [24, 6, 4]]
            .forEach(function (a) { Lad(s, a[0], a[1], a[2]); });
        s.hammers = [{ p: 3, x: 60 }, { p: 1, x: 130 }];
        s.items = [{ p: 2, x: 180, t: 'h' }, { p: 4, x: 100, t: 'u' }, { p: 0, x: 40, t: 'h' }];
        s.start = { x: 130, p: 0 };
        s.gor = { x: 200, p: 5 };
        s.girl = { x: 20, p: 6 };
        return s;
    }

    function mk3() {
        var s = { id: 3, name: 'VÝTAHY', border: 2, plats: [], ladders: [], hammers: [], items: [], rivets: [], kind: 'p', bonus0: 3200, int0: 100, barLad: false, elev: [] };
        var pl = s.plats, i;
        pl.push(P(4, 52, 178, 178, 0, { col: 11, col2: 3 }));
        for (i = 0; i < 4; i++) {
            var e = P(62, 84, 188 - 33 * i, 188 - 33 * i, 0, { col: 14, col2: 6, elev: true });
            pl.push(e); s.elev.push(e);
        }
        pl.push(P(94, 252, 84, 84, 0, { col: 11, col2: 3 }));
        pl.push(P(150, 252, 44, 44, 0, { col: 14, col2: 6 }));
        Lad(s, 214, 6, 5);
        s.items = [{ p: 0, x: 22, t: 'u' }, { p: 5, x: 130, t: 'h' }, { p: 5, x: 190, t: 'u' }];
        s.start = { x: 30, p: 0 };
        s.gor = { x: 168, p: 6 };
        s.girl = { x: 238, p: 6 };
        s.update = function () {
            s.elev.forEach(function (e) {
                e.y1 = e.y2 = e.y1 - 0.45;
                if (e.y1 < 56) { e.y1 = e.y2 = e.y1 + 132; }
            });
        };
        return s;
    }

    function mk4() {
        var s = { id: 4, name: 'NÝTY', border: 5, plats: [], ladders: [], hammers: [], items: [], rivets: [], kind: 'f', bonus0: 3800, int0: 0, barLad: false };
        var pl = s.plats, k;
        for (k = 0; k < 5; k++) { pl.push(P(8, 248, 184 - 34 * k, 184 - 34 * k, 0, { col: 13, col2: 1 })); }
        [[72, 1, 0], [184, 1, 0], [56, 2, 1], [200, 2, 1], [72, 3, 2], [184, 3, 2], [56, 4, 3], [200, 4, 3]]
            .forEach(function (a) { Lad(s, a[0], a[1], a[2]); });
        for (k = 1; k <= 4; k++) { s.rivets.push({ p: k, x: 24 }); s.rivets.push({ p: k, x: 232 }); }
        s.hammers = [{ p: 2, x: 96 }, { p: 3, x: 160 }];
        s.items = [{ p: 1, x: 140, t: 'h' }, { p: 3, x: 90, t: 'u' }, { p: 2, x: 170, t: 'h' }];
        s.start = { x: 124, p: 0 };
        s.gor = { x: 100, p: 4 };
        s.girl = { x: 150, p: 4 };
        s.drum = true;
        return s;
    }
    var BUILD = [mk1, mk2, mk3, mk4];

    // ------------------------------------------------------------------ start obrazovky
    function startStage(i) {
        stageIdx = i;
        S = BUILD[i]();
        S.hammers.forEach(function (h) { h.y = yAt(S.plats[h.p], h.x); h.got = false; });
        S.items.forEach(function (it) { it.y = yAt(S.plats[it.p], it.x); it.got = false; });
        S.rivets.forEach(function (r) { r.y = yAt(S.plats[r.p], r.x); r.got = false; });
        var sp = S.plats[S.start.p];
        hero = { x: S.start.x, y: yAt(sp, S.start.x), vx: 0, vy: 0, st: 'g', plat: sp, face: 1, anim: 0, hammer: 0, apex: 0, lad: null, step: 0 };
        S.gy = yAt(S.plats[S.gor.p], S.gor.x);
        S.girlY = yAt(S.plats[S.girl.p], S.girl.x);
        en = []; fx = [];
        bonus = Math.max(1500, S.bonus0 - 300 * loop); bonusT = 0;
        S.int = Math.max(55, S.int0 - 14 * loop);
        spawnT = Math.max(0, S.int - 60);
        gor = { th: 0, t: 0 };
        fireT = 0;
        if (S.kind === 'f') { spawnFire(); }
        state = 'intro'; stT = 0;
        Z.border = S.border;
        Z.snd.seq([262, 330, 392, 523], 0.09);
    }

    function newGame() {
        score = 0; lives = 3; loop = 0; nextExtra = 20000; newRec = false;
        startStage(0);
    }

    // ------------------------------------------------------------------ nepřátelé
    function spawn() {
        var pl, b;
        if (S.kind === 'b') {
            pl = S.plats[5];
            b = { k: 'b', x: 44, y: yAt(pl, 44), plat: pl, own: 1, st: 'r', vy: 0, a: 0, scored: false, lad: null };
        } else if (S.kind === 't') {
            pl = S.plats[5];
            b = { k: 't', x: 176, y: yAt(pl, 176), plat: pl, own: -1, st: 'r', vy: 0, a: 0, scored: false, lad: null };
        } else if (S.kind === 'p') {
            b = { k: 'p', x: 154, y: 36, plat: null, own: -1, st: 'a', vy: 0, a: 0, scored: false };
        } else { return; }
        en.push(b);
        Z.snd.beep(300, 0.08, 150, 0.04);
    }

    function spawnFire() {
        var pl = S.plats[0];
        en.push({ k: 'f', x: 30, y: yAt(pl, 30), plat: pl, dir: 1, st: 'w', lastLad: null, ld: 0, lad: null, scored: true, a: 0 });
    }

    function landOn(x, py, ny) {
        var best = null, by = 1e9;
        for (var i = 0; i < S.plats.length; i++) {
            var p = S.plats[i];
            if (x < p.x1 || x > p.x2) { continue; }
            var yp = yAt(p, x);
            if (py <= yp + 2.5 && ny >= yp && yp < by) { best = p; by = yp; }
        }
        return best;
    }

    function enemyTick(b) {
        var sp = spd();
        if (b.k === 'p') {
            b.vy += 0.12; b.x += b.own * 0.85 * sp;
            var py = b.y; b.y += b.vy;
            if (b.vy > 0) {
                var lp = landOn(b.x, py, b.y);
                if (lp) { b.y = yAt(lp, b.x); b.vy = -(2.0 + rnd() * 0.7); }
            }
            if (b.y > 210 || b.x < -6) { b.dead = true; }
            return;
        }
        if (b.k === 'f') { fireTick(b); return; }
        if (b.st === 'r') {
            var p = b.plat, dir = p.dir || b.own;
            b.own = dir; b.x += dir * 0.85 * sp; b.a += dir * 0.25;
            if (b.x < p.x1 || b.x > p.x2) {
                if (p.sink) { b.dead = true; Z.snd.tick(); return; }
                b.st = 'f'; b.vy = 0; b.plat = null; return;
            }
            b.y = yAt(p, b.x);
            if (S.barLad) {
                if (b.lad && Math.abs(b.x - b.lad.x) > 4) { b.lad = null; }
                for (var i = 0; i < S.ladders.length; i++) {
                    var l = S.ladders[i];
                    if (l.upper === p && b.lad !== l && Math.abs(b.x - l.x) < 1) {
                        b.lad = l;
                        if (rnd() < 0.3) { b.st = 'l'; b.x = l.x; b.cl = l; }
                    }
                }
            }
        } else if (b.st === 'f') {
            b.vy += 0.16; var pyy = b.y; b.y += b.vy; b.x += b.own * 0.35; b.a += 0.3;
            var q = landOn(b.x, pyy, b.y);
            if (q) {
                b.y = yAt(q, b.x); b.plat = q; b.st = 'r';
                if (q.sink) { b.dead = true; Z.snd.tick(); }
                return;
            }
            if (S.drum && b.x < 28 && b.y >= 176) { b.dead = true; Z.snd.tick(); return; }
            if (b.y > 205) { b.dead = true; }
        } else if (b.st === 'l') {
            b.y += 1.0; b.a += 0.3;
            if (b.y >= b.cl.y2) { b.y = b.cl.y2; b.plat = b.cl.lower; b.st = 'r'; b.lad = b.cl; }
        }
    }

    function fireTick(f) {
        var sp = spd();
        f.a += 0.1;
        if (f.st === 'w') {
            var p = f.plat;
            f.x += f.dir * 0.35 * sp;
            if (f.x < p.x1 + 3) { f.dir = 1; }
            if (f.x > p.x2 - 3) { f.dir = -1; }
            f.y = yAt(p, f.x);
            if (rnd() < 0.006) { f.dir = -f.dir; }
            if (Math.abs(hero.y - f.y) < 3 && rnd() < 0.02) { f.dir = hero.x > f.x ? 1 : -1; }
            if (f.lastLad && Math.abs(f.x - f.lastLad.x) > 4) { f.lastLad = null; }
            for (var i = 0; i < S.ladders.length; i++) {
                var l = S.ladders[i];
                if (l.lower !== p && l.upper !== p) { continue; }
                if (f.lastLad !== l && Math.abs(f.x - l.x) < 0.5) {
                    f.lastLad = l;
                    var up = l.lower === p;
                    var towards = (up && hero.y < f.y - 3) || (!up && hero.y > f.y + 3);
                    if (rnd() < (towards ? 0.6 : 0.2)) {
                        f.st = 'l'; f.lad = l; f.ld = up ? -1 : 1; f.x = l.x;
                    }
                }
            }
        } else {
            f.y += f.ld * 0.4 * sp;
            if (f.ld < 0 && f.y <= f.lad.y1) { f.y = f.lad.y1; f.plat = f.lad.upper; f.st = 'w'; f.dir = rnd() < 0.5 ? -1 : 1; }
            if (f.ld > 0 && f.y >= f.lad.y2) { f.y = f.lad.y2; f.plat = f.lad.lower; f.st = 'w'; f.dir = rnd() < 0.5 ? -1 : 1; }
        }
    }

    // ------------------------------------------------------------------ hrdina
    function groundAt(x, y, tol, cur) {
        var best = null, bd = 1e9;
        for (var i = 0; i < S.plats.length; i++) {
            var p = S.plats[i];
            if (x < p.x1 - 0.5 || x > p.x2 + 0.5) { continue; }
            var d = Math.abs(yAt(p, x) - y), t = p === cur ? tol + 4 : tol;
            if (d <= t && d < bd) { best = p; bd = d; }
        }
        return best;
    }

    function die(why) {
        if (GAMEOBJ.invincible || state !== 'play') { return; }
        state = 'dying'; stT = 0; hero.vy = -2; hero.why = why; hero.hammer = 0;
        Z.snd.die();
    }

    function heroTick() {
        var h = hero, inp = Z.input;
        var dx = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
        var want = inp.down('up') ? -1 : inp.down('down') ? 1 : 0;
        if (h.hammer > 0) { h.hammer--; }
        if (h.st === 'g') {
            if (dx) {
                var sp = h.hammer > 0 ? 0.55 : 0.8;
                h.face = dx; h.x += dx * sp; h.anim += sp; h.step += sp;
                if (h.step > 10) { h.step = 0; Z.snd.beep(140, 0.02, 0, 0.03); }
            }
            if (h.plat && h.plat.conv) { h.x += h.plat.dir * 0.3; }
            h.x = Z.clamp(h.x, 5, 251);
            var g = groundAt(h.x, h.y, 4, h.plat);
            if (!g) {
                h.st = 'a'; h.vy = 0; h.vx = 0; h.apex = h.y; h.plat = null;
            } else {
                h.plat = g; h.y = yAt(g, h.x);
                if (want && h.hammer <= 0) {
                    for (var i = 0; i < S.ladders.length; i++) {
                        var l = S.ladders[i];
                        if (Math.abs(h.x - l.x) > 4) { continue; }
                        if ((want < 0 && h.y > l.y1 + 1 && h.y <= l.y2 + 2) || (want > 0 && h.y < l.y2 - 1 && h.y >= l.y1 - 2)) {
                            h.st = 'l'; h.lad = l; h.x = l.x; break;
                        }
                    }
                }
                if (h.st === 'g' && h.hammer <= 0 && (inp.hit('fire') || inp.hit('alt'))) {
                    h.st = 'a'; h.vy = -2.3; h.vx = dx * 0.85; h.apex = h.y; h.plat = null;
                    Z.snd.jump();
                }
            }
        } else if (h.st === 'l') {
            h.y += want * 0.6; h.anim += want ? 0.6 : 0;
            var lad = h.lad;
            if (h.y <= lad.y1) { h.y = lad.y1; h.st = 'g'; h.plat = lad.upper; }
            else if (h.y >= lad.y2) { h.y = lad.y2; h.st = 'g'; h.plat = lad.lower; }
        } else {
            h.x = Z.clamp(h.x + h.vx, 5, 251);
            var py = h.y;
            h.vy += 0.14; h.y += h.vy;
            if (h.y < h.apex) { h.apex = h.y; }
            if (h.vy > 0) {
                var lp = landOn(h.x, py, h.y);
                if (lp) {
                    h.y = yAt(lp, h.x); h.plat = lp; h.st = 'g';
                    if (h.y - h.apex > 44) { die('pád'); }
                    else { Z.snd.tick(); }
                }
            }
            if (h.y > 205) { die('pád'); }
        }
    }

    // ------------------------------------------------------------------ hlavní tick hry
    function playTick() {
        if (S.update) { S.update(); }
        heroTick();
        var h = hero;
        if (state !== 'play') { return; }

        // spawn překážek
        if (S.kind === 'b' || S.kind === 't' || S.kind === 'p') {
            spawnT++;
            if (spawnT >= S.int) { spawnT = 0; gor.th = 36; }
            if (gor.th > 0) { gor.th--; if (gor.th === 16) { spawn(); } }
        } else if (S.kind === 'f') {
            var nf = en.filter(function (e) { return e.k === 'f'; }).length;
            fireT++;
            if (fireT > 500 && nf < Math.min(6, 2 + loop)) { fireT = 0; spawnFire(); }
        }
        gor.t++;

        en.forEach(enemyTick);
        en = en.filter(function (e) { return !e.dead; });

        // sbírání
        S.hammers.forEach(function (m) {
            if (!m.got && Math.abs(h.x - m.x) < 7 && Math.abs(h.y - m.y) < 6 && h.st !== 'l') {
                m.got = true; h.hammer = 520; Z.snd.coin(); popup(m.x, m.y - 12, 'KLADIVO');
            }
        });
        S.items.forEach(function (it) {
            if (!it.got && Math.abs(h.x - it.x) < 7 && h.y > it.y - 12 && h.y < it.y + 6) {
                it.got = true; var v = it.t === 'u' ? 500 : 300; addScore(v); Z.snd.coin(); popup(it.x, it.y - 12, String(v));
            }
        });
        S.rivets.forEach(function (r) {
            if (!r.got && h.st === 'g' && h.plat === S.plats[r.p] && Math.abs(h.x - r.x) < 3) {
                r.got = true; addScore(100); Z.snd.coin(); popup(r.x, r.y - 12, '100');
            }
        });

        // skok přes překážku
        if (h.st === 'a') {
            en.forEach(function (b) {
                if (b.k !== 'f' && !b.scored && Math.abs(h.x - b.x) < 8 && h.y < b.y - 4 && h.y > b.y - 28) {
                    b.scored = true; addScore(100); popup(b.x, b.y - 18, '100'); Z.snd.beep(700, 0.06, 1000, 0.04);
                }
            });
        }

        // kolize
        var hx = h.x - 3, hy = h.y - 13;
        var hammering = h.hammer > 0;
        for (var i = 0; i < en.length; i++) {
            var b = en[i];
            var bw = b.k === 'f' ? 6 : 7, bh = b.k === 'f' ? 10 : 8;
            var bx = b.x - bw / 2, by = b.y - bh;
            if (hammering) {
                var zx = h.face > 0 ? h.x - 5 : h.x - 17;
                if (Z.hit(zx, h.y - 22, 22, 26, bx, by, bw, bh)) {
                    b.dead = true; addScore(300); popup(b.x, b.y - 14, '300'); Z.snd.boom();
                    if (b.k === 'f') { fireT = Math.min(fireT, 200); }
                }
            } else if (Z.hit(hx, hy, 6, 13, bx, by, bw, bh)) {
                die('zásah'); break;
            }
        }
        en = en.filter(function (e) { return !e.dead; });
        if (state !== 'play') { return; }

        // bonus
        bonusT++;
        if (bonusT >= 110) {
            bonusT = 0; bonus -= 100;
            if (bonus <= 0) { bonus = 0; die('čas'); return; }
            if (bonus <= 1000) { Z.snd.tick(); }
        }

        // cíl
        var done = false;
        if (S.kind === 'f') {
            done = S.rivets.every(function (r) { return r.got; });
        } else if (h.st === 'g' && Math.abs(h.x - S.girl.x) <= 9 && Math.abs(h.y - S.girlY) <= 3) {
            done = true;
        }
        if (done) {
            state = 'clear'; stT = 0; clearScore = bonus; addScore(bonus);
            en = []; h.hammer = 0; Z.snd.win();
        }
    }

    function loseLife() {
        lives--;
        if (lives <= 0) {
            state = 'over'; stT = 0;
            var prev = Z.hi.get(KEY);
            Z.hi.submit(KEY, score);
            newRec = score > prev;
            Z.snd.over();
            Z.border = 0;
        } else {
            startStage(stageIdx);
        }
    }

    function nextStage() {
        Z.hi.submit(KEY, score);
        var n = stageIdx + 1;
        if (n >= BUILD.length) { n = 0; loop++; }
        startStage(n);
    }

    // ------------------------------------------------------------------ hlavní smyčka
    function tick() {
        Z.pauseOk = state === 'play';
        stT++;
        var fire = Z.input.hit('fire') || Z.input.hit('alt');
        if (state === 'title') {
            if (fire) { newGame(); }
        } else if (state === 'intro') {
            if (stT >= 100 || (stT > 25 && fire)) { state = 'play'; stT = 0; }
        } else if (state === 'play') {
            playTick();
        } else if (state === 'dying') {
            hero.vy += 0.1; hero.y += hero.vy; hero.anim += 0.3;
            if (stT >= 110) { loseLife(); }
        } else if (state === 'clear') {
            if (stT >= 170) { nextStage(); }
        } else if (state === 'over') {
            if (stT > 260 || (stT > 70 && fire)) { state = 'title'; stT = 0; Z.border = 0; }
        }
        for (var i = fx.length - 1; i >= 0; i--) { fx[i].t--; if (fx[i].t <= 0) { fx.splice(i, 1); } }
    }

    // ------------------------------------------------------------------ kreslení
    function drawPlat(p, ph) {
        var x, y;
        for (x = Math.ceil(p.x1); x <= p.x2; x++) {
            y = Math.round(yAt(p, x));
            Z.rect(x, y, 1, 1, p.col);
            var m = p.conv ? ((x + ph) & 7) < 3 : (x & 7) === 0;
            Z.rect(x, y + 1, 1, 3, m ? p.col : p.col2);
        }
    }
    function drawLadder(l) {
        Z.rect(l.x - 3, Math.round(l.y1), 1, Math.round(l.y2 - l.y1), 13);
        Z.rect(l.x + 3, Math.round(l.y1), 1, Math.round(l.y2 - l.y1), 13);
        for (var y = Math.round(l.y1) + 3; y < l.y2; y += 4) { Z.rect(l.x - 3, y, 7, 1, 13); }
    }

    function drawGorilla(x, y, mode, t) {
        Z.rect(x - 11, y - 16, 22, 13, 2);
        Z.rect(x - 13, y - 19, 26, 6, 2);
        Z.rect(x - 6, y - 27, 12, 10, 2);
        Z.rect(x - 4, y - 24, 8, 6, 6);
        Z.rect(x - 3, y - 23, 2, 2, 15); Z.rect(x + 1, y - 23, 2, 2, 15);
        Z.pix(x - 2, y - 22, 0); Z.pix(x + 2, y - 22, 0);
        Z.rect(x - 5, y - 25, 10, 1, 0);
        Z.rect(x - 2, y - 19, 4, 1, 0);
        Z.rect(x - 6, y - 15, 12, 6, 10);
        Z.rect(x - 9, y - 4, 7, 4, 2); Z.rect(x + 2, y - 4, 7, 4, 2);
        Z.rect(x - 10, y - 1, 8, 1, 6); Z.rect(x + 2, y - 1, 8, 1, 6);
        if (mode === 1) {            // zvedá sud
            Z.rect(x - 16, y - 17, 5, 10, 2); Z.rect(x + 11, y - 17, 5, 10, 2);
            Z.disc(x, y - 8, 4, 6);
        } else if (mode === 2) {     // hází
            Z.rect(x - 17, y - 19, 5, 14, 2); Z.rect(x + 12, y - 31, 5, 14, 2); Z.rect(x + 11, y - 33, 7, 3, 6);
        } else {                     // bouchá do prsou
            var a = (t >> 4) & 1;
            Z.rect(x - 17, y - 19, 5, 14, 2); Z.rect(x + 12, y - 19, 5, 14, 2);
            Z.rect(a ? x - 12 : x + 8, y - 15, 4, 4, 6);
        }
    }

    function drawBarrel(b) {
        var cx = Math.round(b.x), cy = Math.round(b.y) - 4;
        if (b.k === 'b') {
            Z.disc(cx, cy, 4, 6);
            Z.ring(cx, cy, 4, 2);
            Z.line(cx - Math.round(Math.cos(b.a) * 3), cy - Math.round(Math.sin(b.a) * 3), cx + Math.round(Math.cos(b.a) * 3), cy + Math.round(Math.sin(b.a) * 3), 0);
        } else if (b.k === 't') {
            Z.rect(cx - 5, cy - 4, 10, 8, 7);
            Z.rect(cx - 6, cy - 4, 12, 2, 15);
            Z.rect(cx - 4, cy - 2, 8, 2, 5);
            Z.rect(cx - 4, cy + 2, 8, 1, 8);
        } else {
            Z.disc(cx, cy - 1, 3, 11);
            Z.pix(cx - 1, cy - 2, 15);
            Z.rect(cx - 2, cy + 2, 5, 1, 7);
            Z.pix(cx, cy + 3, 7);
        }
    }

    function drawHero(h) {
        var key, flip = h.face < 0;
        if (state === 'dying') {
            key = 'jump'; flip = ((stT >> 3) & 1) === 1;
        } else if (h.st === 'l') {
            key = ((Math.floor(h.anim / 4)) & 1) ? 'climbA' : 'climbB';
        } else if (h.st === 'a') {
            key = 'jump';
        } else if (h.hammer > 0) {
            key = 'stand';
        } else {
            var f = Math.floor(h.anim / 4) % 3;
            key = h.anim === 0 || f === 0 ? 'stand' : f === 1 ? 'walkA' : 'walkB';
            if (Z.input.down('left') === Z.input.down('right')) { key = 'stand'; }
        }
        Z.spriteC(Math.round(h.x) - 5, Math.round(h.y) - 14, HERO[key], HP, flip);
        if (h.hammer > 0 && state !== 'dying') {
            if (h.hammer < 100 && ((h.hammer >> 2) & 1)) { return; }
            var up = ((stT >> 3) & 1) === 0, f2 = h.face, x = Math.round(h.x), y = Math.round(h.y);
            if (up) {
                Z.rect(x + f2 * 5, y - 20, 1, 9, 6);
                Z.rect(x + f2 * 5 - 3, y - 24, 7, 5, 15);
            } else {
                var x0 = f2 > 0 ? x + 4 : x - 12;
                Z.rect(x0, y - 8, 9, 1, 6);
                Z.rect(f2 > 0 ? x + 11 : x - 15, y - 12, 4, 9, 15);
            }
        }
    }

    function drawHUD() {
        var hi = Math.max(Z.hi.get(KEY), score);
        Z.rect(0, 0, 256, 17, 0);
        Z.text(2, 0, 'SKÓRE ' + Z.pad(score, 6), 15);
        Z.text(254, 0, 'REKORD ' + Z.pad(hi, 6), 14, { align: 'right' });
        Z.text(2, 8, 'BONUS ' + bonus, bonus <= 1000 && ((Z.tickCount >> 3) & 1) ? 10 : 13);
        Z.text(254, 8, 'KOLO ' + (loop + 1) + '  OBR ' + (stageIdx + 1), 7, { align: 'right' });
        for (var i = 0; i < lives && i < 6; i++) {
            var x = 112 + i * 9;
            Z.rect(x + 1, 10, 5, 2, 14); Z.rect(x, 12, 7, 1, 14); Z.rect(x + 1, 13, 5, 2, 15);
        }
    }

    function drawStage() {
        var ph = Math.floor(Z.tickCount * 0.12);
        if (S.id === 3) {
            S.elev.forEach(function () { });
            for (var yy = 56; yy < 196; yy += 4) { Z.pix(73, yy, 5); }
            Z.rect(60, 54, 1, 142, 1); Z.rect(86, 54, 1, 142, 1);
        }
        S.plats.forEach(function (p) { drawPlat(p, p.conv ? (p.dir > 0 ? ph : -ph) : 0); });
        S.ladders.forEach(drawLadder);
        if (S.kind === 'f') {
            S.plats.forEach(function (p, i) {
                if (i > 0 && i < 5) { Z.rect(14, p.y1 + 4, 1, 30, 1); Z.rect(241, p.y1 + 4, 1, 30, 1); }
            });
            S.rivets.forEach(function (r) { if (!r.got) { Z.rect(r.x - 2, Math.round(r.y) - 2, 5, 3, 14); } });
        }
        if (S.drum) {
            var dy = S.plats[0].y1;
            Z.rect(8, dy - 16, 16, 16, 9); Z.rect(8, dy - 10, 16, 2, 11); Z.text(16, dy - 15, 'OIL', 15, { align: 'center' });
            var fl = (Z.tickCount >> 2) & 1;
            Z.rect(11, dy - 22 + fl, 4, 6, 10); Z.rect(17, dy - 21 - fl, 4, 5, 14);
        }
        S.hammers.forEach(function (m) { if (!m.got) { Z.spriteC(Math.round(m.x) - 4, Math.round(m.y) - 6, HAMI, HAMP); } });
        S.items.forEach(function (it) {
            if (!it.got) {
                var s = it.t === 'u' ? UMB : HAT;
                Z.spriteC(Math.round(it.x) - 4, Math.round(it.y) - s.length, s, it.t === 'u' ? UMBP : HATP);
            }
        });
        // dívka a gorila
        var gx = S.girl.x, gy = S.girlY;
        Z.spriteC(gx - 3, gy - 12, GIRL, GIRLP);
        if (state !== 'clear' && ((Z.tickCount >> 4) & 1)) { Z.text(gx + (gx > 200 ? -28 : 28), gy - 10, S.id === 4 ? 'HELP' : 'POMOC!', 15, { align: 'center' }); }
        var mode = 0;
        if (gor && gor.th > 0) { mode = gor.th > 16 ? 1 : 2; }
        if (S.kind === 'f') { mode = 0; }
        var gyy = S.gy;
        if (state === 'clear' && S.id === 4) { gyy += Math.max(0, stT - 20) * Math.max(0, stT - 20) * 0.08; }
        if (gyy < 200) { drawGorilla(S.gor.x, Math.round(gyy), mode, gor ? gor.t : 0); }
    }

    function drawEnemies() {
        en.forEach(function (b) {
            if (b.k === 'f') {
                Z.spriteC(Math.round(b.x) - 4, Math.round(b.y) - 9, (Math.floor(Z.tickCount / 6) & 1) ? FIRE_A : FIRE_B, FIREP, b.dir < 0);
            } else { drawBarrel(b); }
        });
        fx.forEach(function (f) { Z.text(f.x, f.y - (45 - f.t) * 0.3, f.txt, 15, { align: 'center' }); });
    }

    function drawTitle() {
        Z.cls(0, 7);
        Z.border = 0;
        Z.text(128, 6, 'STAVBYVEDOUCÍ', 14, { scale: 2, align: 'center' });
        Z.text(128, 24, 'A GORILA', 10, { scale: 2, align: 'center' });
        // ukázka: traverza, gorila, sud a dívka
        var t = Z.tickCount;
        var gp = P(20, 236, 82, 82, 0, { col: 10, col2: 2 });
        drawPlat(gp, 0);
        drawGorilla(48, 82, ((t >> 6) & 1) ? 0 : 1, t);
        var bx = 70 + (t * 0.8) % 150;
        drawBarrel({ k: 'b', x: bx, y: 82, a: t * 0.2 });
        Z.spriteC(218, 70, GIRL, GIRLP);
        var hx = 190 - (t * 0.5) % 120;
        Z.spriteC(Math.round(hx) - 5, 68, HERO[((t >> 3) % 2) ? 'walkA' : 'walkB'], HP, true);
        var L = ['ŠIPKY: CHŮZE, ŽEBŘÍKY NAHORU A DOLŮ', 'MEZERNÍK: SKOK PŘES SUDY A NEPŘÁTELE', 'KLADIVO NIČÍ VŠE V CESTĚ', 'SEBER KLOBOUKY A DEŠTNÍKY', 'ZACHRAŇ DÍVKU NA VRCHOLU!'];
        for (var i = 0; i < L.length; i++) { Z.text(128, 98 + i * 10, L[i], i === 4 ? 14 : 7, { align: 'center' }); }
        Z.text(128, 152, 'P: PAUZA   M: ZVUK', 13, { align: 'center' });
        Z.text(128, 164, 'REKORD ' + Z.pad(Z.hi.get(KEY), 6), 15, { align: 'center' });
        if ((t >> 5) & 1) { Z.text(128, 178, 'STISKNI MEZERNÍK', 14, { align: 'center' }); }
    }

    function draw() {
        if (state === 'title') { drawTitle(); return; }
        Z.cls(0, 7);
        if (state === 'over') {
            Z.border = 0;
            Z.text(128, 60, 'KONEC HRY', 10, { scale: 3, align: 'center' });
            Z.text(128, 100, 'SKÓRE ' + Z.pad(score, 6), 15, { scale: 2, align: 'center' });
            Z.text(128, 124, 'REKORD ' + Z.pad(Z.hi.get(KEY), 6), 14, { align: 'center' });
            if (newRec && ((stT >> 3) & 1)) { Z.text(128, 140, 'NOVÝ REKORD!', 10, { align: 'center' }); }
            if (stT > 70 && ((stT >> 5) & 1)) { Z.text(128, 168, 'STISKNI MEZERNÍK', 7, { align: 'center' }); }
            return;
        }
        drawStage();
        drawEnemies();
        if (hero && !(state === 'dying' && hero.y > 205)) { drawHero(hero); }
        if (state === 'clear') {
            if (S.id !== 4) {
                var mx = Math.round((hero.x + S.girl.x) / 2);
                Z.spriteC(mx - 3, Math.round(S.girlY) - 28 - ((stT >> 3) & 1), HEART, HEARTP);
            }
            Z.text(128, 100, 'BONUS ' + clearScore, 14, { align: 'center', scale: 2, paper: 0 });
        }
        drawHUD();
        if (state === 'intro') {
            Z.rect(52, 66, 152, 50, 0); Z.frame(52, 66, 152, 50, 15);
            Z.text(128, 72, 'OBRAZOVKA ' + (stageIdx + 1), 14, { align: 'center', scale: 1 });
            Z.text(128, 86, S.name, 10, { align: 'center', scale: 2 });
            Z.text(128, 104, 'KOLO ' + (loop + 1) + '   ŽIVOTY ' + lives, 7, { align: 'center' });
        }
    }

    // ------------------------------------------------------------------ pro testy
    function def(name, get) { Object.defineProperty(GAMEOBJ, name, { get: get, enumerable: true }); }
    def('state', function () { return state; });
    def('S', function () { return S; });
    def('hero', function () { return hero; });
    def('en', function () { return en; });
    def('score', function () { return score; });
    def('lives', function () { return lives; });
    def('bonus', function () { return bonus; });
    def('loop', function () { return loop; });
    def('stageIdx', function () { return stageIdx; });
    GAMEOBJ.build = function (i) { return BUILD[i](); };
    GAMEOBJ.startStage = startStage;
    GAMEOBJ.newGame = newGame;
    GAMEOBJ.yAt = yAt;
    GAMEOBJ.setLoop = function (n) { loop = n; };

    Z.init({
        title: 'Stavbyvedoucí a gorila',
        touch: [
            { act: 'left', label: '◀' }, { act: 'right', label: '▶' },
            { act: 'up', label: '▲' }, { act: 'down', label: '▼' },
            { act: 'fire', label: 'SKOK', cls: 'big' }
        ]
    });
    Z.run({ tick: tick, draw: draw });
})();
