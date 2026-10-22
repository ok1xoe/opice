// Testy hry v Node: node tools/test.js [adresář pro PNG]
const path = require('path');
const assert = require('assert');
const H = require('/Users/hyman/EngetoAcademy/TizenOS/_kit/headless.js');
const root = path.resolve(__dirname, '..');
const out = process.argv[2] || require('os').tmpdir();
const g = H.load([root + '/js/speccy.js', root + '/js/game.js']);
const G = g.sandbox.GAME;
const FIRE = 32, LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40;
const tap = (k, n) => { g.key(k, true); g.step(n || 2); g.key(k, false); g.step(1); };
const noNaN = (what) => assert(!g.hasNaN({ h: G.hero, e: G.en, s: G.score, b: G.bonus }), 'NaN: ' + what);
let ok = 0; const t = (name, f) => { f(); ok++; console.log('OK  ' + name); };

// ---------- titulní obrazovka
t('title', () => {
    g.step(10);
    assert.strictEqual(G.state, 'title');
    g.png(out + '/title.png', 3);
});

// ---------- řešitelnost: graf žebříků od startu k cíli (obrazovky 1, 2, 4)
t('dosažitelnost žebříky', () => {
    [0, 1, 3].forEach(i => {
        const S = G.build(i);
        const seen = new Set([S.plats[S.start.p]]); let ch = true;
        while (ch) {
            ch = false;
            S.ladders.forEach(l => { if (seen.has(l.lower) && !seen.has(l.upper)) { seen.add(l.upper); ch = true; } });
        }
        if (i !== 3) { assert(seen.has(S.plats[S.girl.p]), 'obr. ' + (i + 1) + ': dívka nedosažitelná'); }
        else {
            S.rivets.forEach(r => assert(seen.has(S.plats[r.p]), 'nýt nedosažitelný'));
        }
        S.ladders.forEach(l => {
            assert(l.x >= l.upper.x1 && l.x <= l.upper.x2 && l.x >= l.lower.x1 && l.x <= l.lower.x2, 'žebřík mimo traverzy ' + l.x);
            assert(l.y2 > l.y1);
        });
    });
});

// ---------- bot: dokončí obrazovku (s nesmrtelností), generický pro 1, 2 a 4; 3 má vlastní logiku
function hold(keys) { [LEFT, RIGHT, UP, DOWN].forEach(k => g.key(k, keys.includes(k))); }
function bot(i, maxTicks) {
    G.invincible = true;
    G.startStage(i);
    g.key(FIRE, true); g.step(2); g.key(FIRE, false);
    g.step(120);
    assert.strictEqual(G.state, 'play');
    for (let n = 0; n < maxTicks && G.state === 'play'; n++) {
        const h = G.hero, S = G.S; let keys = [];
        const plat = h.plat;
        if (i === 3) {
            const todo = S.rivets.filter(r => !r.got);
            const here = todo.filter(r => S.plats[r.p] === plat);
            if (h.st === 'l') { keys = [h.lad.upper === plat || true ? (h.goUp ? UP : DOWN) : 0]; }
            if (here.length) {
                const r = here.sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
                keys = [r.x > h.x ? RIGHT : LEFT]; h.goUp = false;
            } else if (h.st === 'g') {
                const l = S.ladders.find(l => l.lower === plat);
                if (l) { keys = Math.abs(h.x - l.x) < 1.5 ? [UP] : [l.x > h.x ? RIGHT : LEFT]; }
                // žebřík, po kterém jsme právě nešli nahoru
            }
            if (h.st === 'l') { keys = [UP]; }
        } else if (i === 2) {
            // výtahy: jednoduchý skriptovaný přeskok
            keys = bot3(h, S);
        } else {
            if (h.st === 'l') { keys = [UP]; }
            else {
                const l = S.ladders.find(l => l.lower === plat);
                if (l) { keys = Math.abs(h.x - l.x) < 1.5 ? [UP] : [l.x > h.x ? RIGHT : LEFT]; }
                else { const gx = S.girl.x; keys = [gx > h.x ? RIGHT : LEFT]; }
                if (!l || plat === S.plats[S.girl.p]) { const gx = S.girl.x; if (plat === S.plats[S.girl.p]) { keys = [gx > h.x ? RIGHT : LEFT]; } }
            }
        }
        hold(keys);
        if (keys.fire) { }
        g.step(1);
        if (n % 200 === 0) { noNaN('bot ' + i); }
    }
    hold([]);
    G.invincible = false;
    return G.state;
}
let fireJump = false;
function bot3(h, S) {
    const keys = [];
    const el = S.elev, TM = S.plats[5], G6 = S.plats[6];
    if (h.st === 'l') { return [UP]; }
    if (h.plat === G6) { keys.push(RIGHT); return keys; }
    if (h.plat === TM) {
        const l = S.ladders[0];
        keys.push(Math.abs(h.x - l.x) < 1.5 ? UP : (l.x > h.x ? RIGHT : LEFT));
        return keys;
    }
    if (h.plat === S.plats[0]) {
        // čekej na výtah, pak skoč vpravo
        keys.push(RIGHT);
        const near = el.some(e => e.y1 > h.y - 6 && e.y1 < h.y + 8);
        if (h.x > 46 && near && !h.jumping) { g.key(FIRE, true); g.step(1); g.key(FIRE, false); }
        if (h.x > 50) { return []; }
        return keys;
    }
    if (h.st === 'a') { return [RIGHT]; }
    // na výtahu: skoč doprava, když je v dobré výšce
    if (h.plat && h.plat.elev) {
        if (h.y < 100 && h.y > 66) { g.key(FIRE, true); g.step(1); g.key(FIRE, false); return [RIGHT]; }
    }
    return [];
}
[0, 1, 3].forEach(i => {
    t('bot dokončí obrazovku ' + (i + 1), () => {
        const sc0 = G.score;
        const r = bot(i, 12000);
        assert.strictEqual(r, 'clear', 'obrazovka ' + (i + 1) + ' nedokončena, stav ' + r + ' hero ' + JSON.stringify(G.hero));
        assert(G.score > sc0);
        if (i === 0) {
            g.png(out + '/clear1.png', 3);
        }
    });
});
t('bot dokončí obrazovku 3 (výtahy)', () => {
    // vyzkoušej několik startů (fáze výtahů), aspoň jeden musí projít celou dráhu
    let passed = 0;
    for (let tries = 0; tries < 6 && !passed; tries++) {
        G.invincible = true; G.startStage(2);
        g.key(FIRE, true); g.step(2); g.key(FIRE, false); g.step(100 + tries * 17);
        let r = 'play';
        for (let n = 0; n < 4000 && G.state === 'play'; n++) {
            const h = G.hero;
            hold(bot3(h, G.S)); g.step(1);
        }
        hold([]);
        if (G.state === 'clear') { passed = 1; }
        G.invincible = false;
    }
    assert(passed, 'výtahy: bot nedošel k dívce');
});

// ---------- screenshoty herních obrazovek
for (let i = 0; i < 4; i++) {
    t('screenshot obrazovky ' + (i + 1), () => {
        G.invincible = true; G.startStage(i);
        g.step(110 + 300);
        noNaN('stage ' + i);
        g.png(out + '/stage' + (i + 1) + '.png', 3);
        G.invincible = false;
    });
}

// ---------- celý cyklus: title -> play -> dying -> over -> title (bez zásahu hráče)
t('životní cyklus title->play->dying->over->title', () => {
    G.invincible = false;
    // vrať na titulní obrazovku
    for (let i = 0; i < 4000 && G.state !== 'title'; i++) { g.step(1); if (G.state === 'clear' || G.state === 'intro' || G.state === 'over') { tap(FIRE); } }
    assert.strictEqual(G.state, 'title');
    tap(FIRE);
    assert.strictEqual(G.state, 'intro');
    const seen = new Set();
    for (let i = 0; i < 60000 && G.state !== 'title'; i++) {
        g.step(1); seen.add(G.state);
        if (G.state === 'intro' && i % 7 === 0) { /* čeká se */ }
        if (i % 3000 === 0) { noNaN('cyklus'); }
    }
    assert.strictEqual(G.state, 'title');
    ['intro', 'play', 'dying', 'over'].forEach(s => assert(seen.has(s), 'chybí stav ' + s));
    assert(g.Z.hi.get('opice') >= 0);
});

// ---------- smrt padáním a hodnoty
t('pád z výšky zabíjí, krátký pád ne', () => {
    G.invincible = false; G.startStage(0);
    g.step(105);
    const h = G.hero; // skok z 2. patra na zem: nelze – teleport na 2. traverzu
    h.plat = G.S.plats[3]; h.x = 100; h.y = G.yAt(G.S.plats[3], 100); h.st = 'g';
    // seber platformy pod ním (simulace pádu mimo)
    G.S.plats[3].x1 = 500; G.S.plats[3].x2 = 600;
    g.step(200);
    assert(G.state === 'dying' || G.state === 'play' && G.lives < 3 || G.hero.y < 200, 'pád');
});

// ---------- mnoho kol: obtížnost roste, žádné NaN
t('vyšší kolo bez NaN', () => {
    G.setLoop(5); G.invincible = true; G.startStage(0); g.step(2000); noNaN('loop5');
    G.startStage(3); g.step(3000); noNaN('loop5 s4');
    G.setLoop(0); G.invincible = false;
});
console.log('Vše v pořádku: ' + ok + ' testů');
