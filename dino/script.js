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
const AudioService = {
    /** @type { Map<string, any> } */
    config: new Map(),
    /**
     * Pega um canal de áudio
     *
     * @param {string} name - Nome do canal.
     * @returns {HTMLAudioElement} - Tag do canal 
     */
    getAudioTrack(name) {
        const el = document.querySelector(`audio[track][name="${name}"]`);
        if (!el) {
            console.warn(`Audio track ${name} not found in DOM.`);
            return null;
        };
        return el;
    },

    async getAudioConfig() {
        const res = await fetch("./assets/soundconfig.json");
        if (!res.ok) {
            throw new Error(`HTTP Error: ${res.status}`);
        }
        const data = await res.json();
        return data;        
    },
    async updateConfig() {
        this.config = new Map(
            Object.entries(await this.getAudioConfig())
        );
        console.log(this.config)
    },
    getAudioPath(name) {
        if (!this.config.has(name)) {
            console.warn(`Audio ${name} not found in config.`);
            return null;
        }

        const value = this.config.get(name);

        /** @type {string[]} */
        let pool = [];

        if (typeof value === "string") {
            pool = Expander.expand(value);
        } 
        else if (Array.isArray(value)) {
            for (const entry of value) {
                const expanded = Expander.expand(entry);
                pool.push(...expanded);
            }
        }

        if (pool.length === 0) {
            console.warn(`No audio resolved for ${name}`);
            return null;
        }

        const random = pool[Math.floor(Math.random() * pool.length)];
        return `./assets/sounds/${random}`;
    },
    
    
    /**
     * Toca um áudio em uma track
     *
     * @async
     * @param {string} name - Nome do áudio nas configurações
     * @param {string | HTMLAudioElement} track - Nome da track
     * @returns {void} 
     */
    async playAudio(name, track) {
        const path = this.getAudioPath(name);

        if (typeof track === "string")
            track = this.getAudioTrack(track);
        
        const audioElement = /** @type { HTMLAudioElement } */ (track.cloneNode());
        
        audioElement.src = path;
        
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

document.addEventListener("load", () => {
    console.log("Carregando dados");
    Session.load();
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
    // clearInterval(scoreInterval);
    // clearTimeout(cactusTimeout);
    // clearInterval(checkCollisionInterval);
    
    let score = Session.score;
    if (score !== 0) {
        gameOverMsgScoreShower.innerText = score.toString().padStart(5, '0');
    }
    // Session.score = 0;
    // Session.save();
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

    // const copy = /** @type { HTMLAudioElement } */(sfx_coil.cloneNode());
    // copy.currentTime = 0;
    // copy.play();
    AudioService.playAudio("jump", sfxTrack);

    dino.classList.remove('jump');
    dino.classList.remove('rotate');

    // força o navegador a "recalcular"
    void dino.offsetWidth;

    dino.classList.add('jump');
    // dino.classList.add('rotate');

    setTimeout (() => {
        jumping = false;
        dino.classList.remove('jump');
        // dino.classList.remove('rotate');
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

        // const cactusTimeoutHandler = () => {
        //     if (cactus.classList.contains("paused")) {
        //         cactusTimeout = setTimeout( cactusTimeoutHandler, 10);
        //         return; 
        //     }
        //     if (board.contains(cactus)) cactus.remove();
        // }
        // cactusTimeout = setTimeout( cactusTimeoutHandler , 2000);

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
