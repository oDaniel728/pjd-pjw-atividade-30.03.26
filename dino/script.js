// [[ BD ]]

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, update, get, onValue, push, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCBZGph8g79sGTWu5CVynTpeXaUOar-wn8",
    authDomain: "jogos-web-ifam-login-ac5da.firebaseapp.com",
    databaseURL: "https://jogos-web-ifam-login-ac5da-default-rtdb.firebaseio.com",
    projectId: "jogos-web-ifam-login-ac5da",
    storageBucket: "jogos-web-ifam-login-ac5da.firebasestorage.app",
    messagingSenderId: "267249166179",
    appId: "1:267249166179:web:7b06913ce99b86b4489556",
    measurementId: "G-F0LSKZE1W2"
};
// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let usuarioAtual = null;
let dadosUsuario = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    
    usuarioAtual = user;

    await carregarDadosUsuario(user.uid);
});

async function carregarDadosUsuario(uid) {
    try {
        const snapshot = await get(ref(db, 'usuarios/' + uid));

        // if (snapshot.exists()) {
            dadosUsuario = snapshot.val();
        // }
        Session.max_score = dadosUsuario.pontuacao_maxima
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

// [[ EXPANDER ]]
const Expander = {
    /**
     * Expande uma expressão
     * @param {string} input
     * @returns {string[]}
     */
    expand(input) {
        const tokens = this.tokenize(input);
        const expanded = tokens.map(t => this.expandToken(t));
        return this.cartesian(expanded);
    },

    /**
     * Tokeniza respeitando escapes
     * @param {string} input
     * @returns {string[]}
     */
    tokenize(input) {
        /** @type {string[]} */
        const tokens = [];

        let buffer = "";
        let escape = false;
        let inBracket = false;

        for (let i = 0; i < input.length; i++) {
            const c = input[i];

            if (escape) {
                buffer += c;
                escape = false;
                continue;
            }

            if (c === "\\") {
                escape = true;
                continue;
            }

            if (c === "[") {
                if (buffer) tokens.push(buffer);
                buffer = "[";
                inBracket = true;
                continue;
            }

            if (c === "]" && inBracket) {
                buffer += "]";
                tokens.push(buffer);
                buffer = "";
                inBracket = false;
                continue;
            }

            buffer += c;
        }

        if (buffer) tokens.push(buffer);

        return tokens;
    },

    /**
     * Expande um token
     * @param {string} token
     * @returns {string[]}
     */
    expandToken(token) {
        // lista: [a,b,c]
        if (token.startsWith("[") && token.endsWith("]")) {
            const inner = token.slice(1, -1);
            return this.splitList(inner);
        }

        // range: x..y
        if (token.includes("..")) {
            return this.expandRange(token);
        }

        return [token];
    },

    /**
     * Split de lista respeitando escape
     * @param {string} input
     * @returns {string[]}
     */
    splitList(input) {
        /** @type {string[]} */
        const result = [];

        let buffer = "";
        let escape = false;

        for (let i = 0; i < input.length; i++) {
            const c = input[i];

            if (escape) {
                buffer += c;
                escape = false;
                continue;
            }

            if (c === "\\") {
                escape = true;
                continue;
            }

            if (c === ",") {
                result.push(buffer);
                buffer = "";
                continue;
            }

            buffer += c;
        }

        if (buffer) result.push(buffer);

        return result;
    },

    /**
     * Expande range (ex: 1..3 ou a..c)
     * @param {string} token
     * @returns {string[]}
     */
    expandRange(token) {
        const match = token.match(/^(.*?)(\d+|\w)\.\.(\d+|\w)(.*)$/);
        if (!match) return [token];

        const [, prefix, start, end, suffix] = match;

        /** @type {string[]} */
        const result = [];

        // número
        if (!isNaN(Number(start)) && !isNaN(Number(end))) {
            const a = Number(start);
            const b = Number(end);

            for (let i = a; i <= b; i++) {
                result.push(prefix + i + suffix);
            }
            return result;
        }

        // char
        const a = start.charCodeAt(0);
        const b = end.charCodeAt(0);

        for (let i = a; i <= b; i++) {
            result.push(prefix + String.fromCharCode(i) + suffix);
        }

        return result;
    },

    /**
     * Produto cartesiano
     * @param {string[][]} arrays
     * @returns {string[]}
     */
    cartesian(arrays) {
        return arrays.reduce(
            (acc, curr) =>
                acc.flatMap(a => curr.map(b => a + b)),
            [""]
        );
    }
};
// [[ ASSETS ]]

const PlaylistService = {
    /** @type {Map<string, Playlist>} */
    playlists: new Map(),

    /**
     * Cria uma playlist
     * @param {string} name
     * @param {string[]} audios - nomes do AudioService
     * @param {PlaylistOptions} [options]
     */
    create(name, audios, options = {}) {
        this.playlists.set(name, {
            name,
            audios,
            index: 0,
            loop: options.loop ?? false,
            shuffle: options.shuffle ?? false,
            playing: false,
            track: options.track ?? null,
            current: null
        });
        return name;
    },

    /**
     * Toca playlist
     * @param {string} name
     */
    play(name) {
        const pl = this.playlists.get(name);
        if (!pl) return;

        if (typeof pl.track === "string") {
            pl.track = AudioService.getAudioTrack(pl.track);
        }

        if (!pl.track) return;

        pl.playing = true;
        this._playCurrent(pl);
    },

    /**
     * Para playlist
     * @param {string} name
     */
    stop(name) {
        const pl = this.playlists.get(name);
        if (!pl) return;

        pl.playing = false;

        if (pl.current) {
            pl.current.pause();
            pl.current.currentTime = 0;
        }
    },

    /**
     * Próxima música
     * @param {string} name
     */
    next(name) {
        const pl = this.playlists.get(name);
        if (!pl) return;

        this._advance(pl);
        this._playCurrent(pl);
    },

    /**
     * Avança índice
     * @param {Playlist} pl
     */
    _advance(pl) {
        if (pl.shuffle) {
            pl.index = Math.floor(Math.random() * pl.audios.length);
            return;
        }

        pl.index++;

        if (pl.index >= pl.audios.length) {
            if (pl.loop) {
                pl.index = 0;
            } else {
                pl.playing = false;
            }
        }
    },

    /**
     * Toca música atual
     * @param {Playlist} pl
     */
    _playCurrent(pl) {
        if (!pl.playing) return;

        const name = pl.audios[pl.index];
        const pool = AudioService.cache.get(name);

        if (!pool || pool.length === 0) return;

        const base = pool[Math.floor(Math.random() * pool.length)];
        const audio = /** @type {HTMLAudioElement} */ (pl.track.cloneNode());

        audio.src = base.src;
        audio.currentTime = 0;

        pl.current = audio;

        audio.addEventListener("ended", () => {
            this._advance(pl);
            this._playCurrent(pl);
        });

        audio.play();
    }
};

/**
 * @typedef {Object} Playlist
 * @property {string} name
 * @property {string[]} audios
 * @property {number} index
 * @property {boolean} loop
 * @property {boolean} shuffle
 * @property {boolean} playing
 * @property {HTMLAudioElement|string|null} track
 * @property {HTMLAudioElement|null} current
 */

/**
 * @typedef {Object} PlaylistOptions
 * @property {boolean} [loop]
 * @property {boolean} [shuffle]
 * @property {HTMLAudioElement|string} [track]
 */

const AudioService = {
    /** @type { Map<string, any> } */
    config: new Map(),

    /** @type { Map<string, HTMLAudioElement[]> } */
    cache: new Map(),

    /**
     * Pega um canal de áudio
     * @param {string} name
     * @returns {HTMLAudioElement|null}
     */
    getAudioTrack(name) {
        const el = document.querySelector(`audio[track][name="${name}"]`);
        if (!el) {
            console.warn(`Audio track ${name} not found in DOM.`);
            return null;
        }
        return el;
    },

    /**
     * Carrega config JSON
     * @returns {Promise<Record<string, string|string[]>>}
     */
    async getAudioConfig() {
        const res = await fetch("./assets/soundconfig.json");
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return res.json();
    },

    /**
     * Atualiza config e pré-carrega áudios
     * @returns {Promise<void>}
     */
    async updateConfig() {
        this.config = new Map(
            Object.entries(await this.getAudioConfig())
        );

        await this.preloadAll();
    },

    /**
     * Resolve todos os caminhos possíveis de um áudio
     * @param {string} name
     * @returns {string[]}
     */
    resolvePaths(name) {
        if (!this.config.has(name)) return [];

        const value = this.config.get(name);

        /** @type {string[]} */
        let pool = [];

        if (typeof value === "string") {
            pool = Expander.expand(value);
        } else if (Array.isArray(value)) {
            for (const entry of value) {
                pool.push(...Expander.expand(entry));
            }
        }

        return pool.map(p => `./assets/sounds/${p}`);
    },

    /**
     * Pré-carrega TODOS os áudios
     * @returns {Promise<void>}
     */
    async preloadAll() {
        /** @type {Promise<void>[]} */
        const tasks = [];

        for (const key of this.config.keys()) {
            tasks.push(this.preload(key));
        }

        await Promise.all(tasks);
        console.log("Áudios pré-carregados");
    },

    /**
     * Pré-carrega um grupo de áudio
     * @param {string} name
     * @returns {Promise<void>}
     */
    async preload(name) {
        const paths = this.resolvePaths(name);

        /** @type {HTMLAudioElement[]} */
        const audios = [];

        for (const path of paths) {
            const audio = new Audio();
            audio.src = path;
            audio.preload = "auto";

            // força carregamento
            const p = new Promise((resolve) => {
                audio.addEventListener("canplaythrough", () => resolve(), { once: true });
                audio.addEventListener("error", () => resolve(), { once: true });
            });

            audio.load();
            await p;

            audios.push(audio);
        }

        this.cache.set(name, audios);
    },

    /**
     * Toca um áudio (sem rede, usando cache)
     * @param {string} name
     * @param {string|HTMLAudioElement} track
     * @returns {void}
     */
    playAudio(name, track) {
        const pool = this.cache.get(name);

        if (!pool || pool.length === 0) {
            console.warn(`Audio ${name} não está carregado.`);
            return;
        }

        if (typeof track === "string") {
            track = this.getAudioTrack(track);
        }

        const base = pool[Math.floor(Math.random() * pool.length)];

        const audioElement = /** @type {HTMLAudioElement} */ (track.cloneNode());

        audioElement.src = base.src;
        audioElement.currentTime = 0;
        audioElement.play();
    }
};
AudioService.updateConfig();
// [[ STORAGE ]]
const Session = {
    temporary: ["temporary", "score", "auto_saving", "loaded"],
    
    score: 0,
    max_score: 0,
    rounds: 0,

    auto_save: false,
    auto_saving: false,
    loaded: false,

    async aSave() {
        if (!(dadosUsuario && usuarioAtual)) return;
        await update(ref(db, 'usuarios/' + usuarioAtual.uid), {
            pontuacao_maxima: this.max_score,
            nivel: 1
        });
        await set(ref(db, 'usuarios/' + usuarioAtual.uid), {
            nome: dadosUsuario.nome,
            pontuacao: this.score,
            pontuacao_maxima: this.max_score
        });
        await push(ref(db, 'usuarios/' + usuarioAtual.uid), {
            pontuacao: this.score,
            pontuacao_maxima: this.max_score,
            data: new Date().toISOString()
        });
    },
    save() {
        localStorage.setItem(
            "session", JSON.stringify(this)
        );
        console.log(JSON.stringify(this));
        this.aSave();
    },
    load() {
        if (this.loaded) return;
        this.loaded = true;
        // const data = localStorage.getItem(
        //     "session"
        // ) ?? "{}";
        // const obj = JSON.parse(data);
        // console.log(obj)
        // Object.assign(this, obj);
    },
    _startAutoSave() {
        if (this.auto_saving) return;
        this.auto_saving = true;
        setInterval(() => {
            this._autoSaveHandler();
        }, 1000)
    },
    _autoSaveHandler() {
        if (!this.auto_save) return;
        this.save();
    }
}

// [[ ELEMENTOS ]]
const dino = document.querySelector('.dino');
const board = document.getElementById('game-board');
const scoreElement = document.querySelectorAll('.score-show');
const maxScoreElement = document.getElementById('max-score');
const startMsg = document.getElementById('start-msg');
const gameOverMsg = document.querySelector('.gameOverMsg');
const gameOverMsgScoreShower = document.querySelector(".score-show-gameover");

const sfxTrack = AudioService.getAudioTrack("sfx");
const bgmTrack = AudioService.getAudioTrack("bgm");

// [[ VARIÁVEIS ]]
let isGameOver = false;
let scoreInterval;
let cactusTimeout;
let checkCollisionInterval;
let jumping = false;
let gameStarted = false;
console.log(dadosUsuario)
// [[ INICIALIZAÇÃO ]]
scoreElement.innerText = "100";

// [[ CACTO INICIAL ]]
const randomTime = Math.random() * 1500 + 1000;
const cactos = document.querySelectorAll('.cacto');
cactusTimeout = setTimeout(spawnCactus, randomTime);

// [[ EVENTOS ]]
document.addEventListener("keydown", (event) => {
    if (
        event.code === 'Space' ||
        event.code === "ArrowUp" || // Questão 3
        event.code === "KeyW"
    ) {
        handleAction(true);
    }
});

board.addEventListener('click', () => {
    handleAction(false);
});

function startBackgroundMusic() {
    bgmTrack.volume = .2;

    const bgmPlaylist = PlaylistService.create(
        "bgm",
        ["bg-song"],
        {
            loop: true,
            track: bgmTrack
        }
    );
    PlaylistService.play(bgmPlaylist);
}

document.addEventListener("load", () => {
    console.log("Carregando dados");
    Session.load();
    startBackgroundMusic();
});
document.addEventListener("beforeunload", () => {
    console.log("Guardando Dados")
    Session.save();
});

function startGame() {
    gameStarted = true;
    Session.score = 0;
    document
        .querySelectorAll(".paused")
        .forEach(el => {
            el.classList.remove("paused");
        });
    document
        .querySelectorAll(".cacto")
        .forEach(el => {
            el.remove();
        });
}
function restartGame() {
    startGame();
    isGameOver = false;
    gameOverMsg.classList.add("hidden");
}

// [[ HANDLERS ]]
/**
 * @param {boolean} spacePressed
 * @returns {void}
 * */
function handleAction(spacePressed) {
    if (gameStarted) {
        jump();
    } else {
        if (isGameOver) {
            if (spacePressed) {
                restartGame();
            }
        } else {
            if (spacePressed) {
                startGame();
            }
        }
    }
}
function handleGameOver() {
    isGameOver = true;
    gameStarted = false;
    
    let score = Session.score;
    if (score !== 0) {
        gameOverMsgScoreShower.innerText = score.toString().padStart(5, '0');
    }
    Session.rounds++;
    document
        .querySelectorAll(".nuvem")
        .forEach(n => {
            n.classList.add("paused");
        });
    document
        .querySelectorAll(".cacto")
        .forEach(c => {
            c.classList.add("paused");
        });
    AudioService.playAudio("hit", sfxTrack);
    gameOverMsg.classList.remove('hidden');
    // Session.save();
}

// [[ FUNÇÕES ]]
function jump() {
    if (jumping) return;
    jumping = true;

    AudioService.playAudio("jump", sfxTrack);

    dino.classList.remove('jump');

    void dino.offsetWidth;

    dino.classList.add('jump');

    setTimeout (() => {
        jumping = false;
        dino.classList.remove('jump');
    }, 500);
}

checkCollisionInterval = setInterval(() => {
    if (!gameStarted) return;
    checkCollision();
}, 10)

// loop
scoreInterval = setInterval(() => {
    scoreElement.forEach((el) => {
        el.innerText = Session.score.toString().padStart(5, '0');
    })
    maxScoreElement.innerText = Session.max_score.toString().padStart(5, '0');
    
    if (!gameStarted || isGameOver) return;
    Session.score++;
    
    if (Session.score > Session.max_score) {
        if (!maxScoreElement.classList.contains("green")) {
            console.log("high score!");
            maxScoreElement.classList.add("green");
        }
        Session.max_score = Session.score;

    } else {
        if (maxScoreElement.classList.contains("green")) {
            console.log("low score!");
            maxScoreElement.classList.remove("green");

        }

    }
}, 100);

function spawnCactus() {
    if (gameStarted && !isGameOver) {
        const cactus = document.createElement('div');
        cactus.classList.add("cacto");
        cactus.innerText = '🌵';
        board.appendChild(cactus);

    }
    const randomTime = Math.random() * 1500 + 1000;
    cactusTimeout = setTimeout(spawnCactus, randomTime);
}

function checkCollision() {
    if (!gameStarted) return;
    const dinoRect = dino.getBoundingClientRect();
    const cactuses = document.querySelectorAll('.cacto');

    cactuses.forEach((cactus) => {
        const cactusRect = cactus.getBoundingClientRect();
        if (
            dinoRect.right > cactusRect.left + 10 &&
            dinoRect.left < cactusRect.right - 10 &&
            dinoRect.bottom > cactusRect.top + 10 

        ) { handleGameOver(); }
    });
}
