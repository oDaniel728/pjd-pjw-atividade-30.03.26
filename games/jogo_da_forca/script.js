///@ts-check

// @ts-ignore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// @ts-ignore
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// @ts-ignore
import { getDatabase, ref, set, get, push, remove, query, orderByKey, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/*
    * CONSTANTES *
*/

/** @type {string[]} */
const validWords = [
    "javascript",
    "programacao",
    "desenvolvimento",
    "computador",
    "tecnologia",
    "internet",
    "software",
    "hardware",
    "algoritmo",
    "funcao",
    "variavel",
    "constante",
    "objeto",
    "classe",
    "heranca",
    "polimorfismo",
    "encapsulamento",
    "abstracao",
    "interface",
    "framework",
    "biblioteca",
    "sintaxe",
    "compilador",
    "interpretador",
    "debugger",
    "versao",
    "controle",
    "codigo",
    "python",
    "java",
    "ruby",
    "php",
    "csharp",
    "golang",
    "typescript",
    "swift",
    "kotlin",
    "rust",
    "scala",
    "perl",
    "lua",
    "haskell",
    "clojure",
    "elixir",
    "erlang",
    "dart",
    "flutter",
    "react",
    "angular",
    "vue",
    "svelte",
    "nodejs",
    "jogos",
    "digitais",
    "programador",
    "desenvolvedor",
    "engenheiro",
    "analista",
    "dados",
    "inteligencia",
];

/** @type {Object} Configuração do Firebase */
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

/** @type {Object|null} */
let usuarioAtual = null;

/** @type {{ nome?: string, total_score?: number, max_score?: number, email?: string, avatar?: string|null, mostrar_no_ranking?: boolean }|null} */
let dadosUsuario = null;

/** @type {boolean} */
let isDatabaseLoading = true;

/** @type {boolean} */
let canReadForcaData = true;

/** @type {boolean} */
let canWriteForcaData = true;

let time = 0;
const setTime = /** @type { (newTime: number) => void } */ (newTime => {
    time = newTime;
    const minutes = Math.floor(time / 60).toString().padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    // @ts-ignore
    document.getElementById('time').textContent = `${minutes}:${seconds}`;
});

/** @type { (time: number) => Promise<void> } */
const waitFor = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
}

/** @typedef { string & { length: 1 } } char */
/**
 * Verifica se a string é um char *
 * @template T
 * @param {T} str 
 * @returns {str is char}
 */
const isChar = (str) => typeof str === 'string' && str.length === 1;

/**
 * Converte uma string para char, ou retorna null se não for um char
 *
 * @param {string} str 
 * @returns {char} 
 */
// @ts-ignore
const toChar = (str) => isChar(str) ? str : str.charAt(0);

/** 
 * @template {string} S
 * @typedef { import("./types").SingleChar<S> } SingleChar<S>
 */

const ScoreElement = /** @type { HTMLSpanElement } */ (document.getElementById('score'));

const Lives = /** @type { HTMLDivElement } */ (document.querySelector(".lives"));
const Hearts = {
    full: '<i class="bi bi-heart-fill"></i>',
    empty: '<i class="bi bi-heart"></i>'
}

const ProhibitedLettersElement = /** @type { HTMLDivElement } */ (document.querySelector('.prohibited_letters'));

/**
 * Cria uma string pra criar um elemento em ProhibitedLettersElement
 *
 * @template {string} S
 * @param {SingleChar<S>} letter 
 * @returns {string} 
 */
const createProhibitedLetter = (letter) => `<span>${letter}</span>`;

const GameElement = /** @type { HTMLDivElement } */ (document.querySelector('.game'));

const LettersElement = /** @type { HTMLDivElement } */ (document.querySelector('.letters'));

const LetterInputElement = /** @type { HTMLInputElement } */ (document.querySelector('input.text'));
const Asterisk = '<i class="bi bi-asterisk"></i>';

/** @param {boolean} isLoading */
function setDatabaseLoadingState(isLoading) {
    isDatabaseLoading = isLoading;
    LetterInputElement.disabled = isLoading;
}

/**
 * Cria uma string pra criar um elemento de letra
 *
 * @template {string} S
 * @param {SingleChar<S>} letter
 * @returns {string}
 */
const createLetter = (letter) => `<span class="letter" letter=${letter}>${letter === '-' ? Asterisk : letter.toUpperCase()}</span>`;

/*
    * VARIÁVEIS *
*/

/** @type {number} */
let score = 0;
let maxScore = 0;
const setScore = /** @type { (newScore: number) => void } */ (newScore => {
    if (newScore > maxScore) {
        maxScore = newScore;
    }
    score = newScore;
    updateScore();
});

/** @type {number} */
let lives = 0;
let maxLives = 5;
let maxLivesOffset = 0;
const setMaxLives = /** @type { (newMaxLives: number) => void } */ (newMaxLives => {
    maxLives = newMaxLives;
    if (lives > maxLives) {
        setLives(maxLives);
    } else {
        updateLives();
    }
});

function updateHeartbeatInterval() {
    const safeMaxLives = Math.max(1, maxLives);
    const safeLives = Math.max(0, Math.min(lives, safeMaxLives));
    const progress = 1 - (safeLives / safeMaxLives);
    const intervalMs = Math.round(900 - (progress * 500));

    document.documentElement.style.setProperty('--heartbeat-interval', `${Math.max(350, intervalMs)/1000}`);
}

const setLives = /** @type { (newLives: number) => void } */ (newLives => {
    lives = newLives;
    updateHeartbeatInterval();
    updateLives();
});
const resetLives = async () => {
    for (let i = lives; i < maxLives + 1; i++) {
        setLives(i);
        await waitFor(100);
    }
    await playAnimation(Lives, 'pulse-once', 1000);
};

/** @type {char[]} */
let prohibitedLetters = [];
/** @type { <S extends string>(letter: SingleChar<S>) => void } */
const addProhibitedLetter = (letter) => {
    if (!prohibitedLetters.includes(toChar(letter))) {
        prohibitedLetters.push(toChar(letter));
        updateProhibitedLetters();
    }
}

/** @type {string} */
let word = '';
const setWord = /** @type { (word: string) => void } */ (newWord => {
    word = newWord;
    guessedLetters = [];
    updateWord();
});

/** @type {char[]} */
let guessedLetters = [];
const addGuessedLetter = /** @type { <S extends string>(letter: SingleChar<S> | string) => void } */ (letter) => {
    if (!guessedLetters.includes(toChar(letter))) {
        guessedLetters.push(toChar(letter));
        updateWord();
    }
}

async function resetGame() {
    await playAnimation(LettersElement, 'ascend-out');
    setWord(pickRandomWord());
    await playAnimation(LettersElement, 'ascend-in');
    startGame();
}

function startGame() {
    initVariables();
    update();
}

function resetVariables() {
    setScore(0);
    setTime(0);
    maxLivesOffset = 0;
}

function initVariables() {
    setMaxLives(5 + maxLivesOffset);
    resetLives();
    prohibitedLetters = [];
    updateProhibitedLetters();
}

/*
    * FUNÇÕES UTILITÁRIAS *
*/

function updateScore() {
    ScoreElement.textContent = score.toString();
}

function updateLives() {
    let str = "";
    for (let i = 0; i < maxLives; i++) {
        str += i < lives ? Hearts.full : Hearts.empty;
    }
    Lives.innerHTML = str;
}


/** Atualiza a lista de letras proibidas */
function updateProhibitedLetters() {
    ProhibitedLettersElement.innerHTML = (prohibitedLetters.length === 0 ? ['-'] : prohibitedLetters).map(createProhibitedLetter).join('');
}

/** Atualiza a palavra exibida */
function updateWord() {
    guessedLetters = guessedLetters.filter(letter => word.toUpperCase().includes(letter.toUpperCase()));
    LettersElement.innerHTML = ( /** @type { char[] } */ (word.toUpperCase().split('')).map)
        (letter => createLetter(guessedLetters.includes(letter) ? letter : '-')).join('');
}

/** Atualiza todas as partes do jogo */
function update() {
    updateScore();
    updateLives();
    updateProhibitedLetters();
    updateWord();
}

/**
 * Verifica se a letra é proibida
 *
 * @template {string} S
 * @param {SingleChar<S>} letter
 * @returns {void}
 */
const setLetterInputPlaceholder = (letter) => {
    LetterInputElement.placeholder = letter;
}

/** 
 * Seleciona uma palavra aleatória da lista de palavras válidas
 * @returns {string}
 */
const pickRandomWord = () => {
    const randomIndex = Math.floor(Math.random() * validWords.length);
    return validWords[randomIndex];
}

const getLetterInputValue = 
    /** @type { () => string } */
    () => {
        return LetterInputElement.value.trim().toLowerCase();
    }
const setLetterInputValue = 
    /** @type { (value: string) => void } */
    (value) => {
        LetterInputElement.value = value;
    }
const playAnimation =
    /** @type { (element: string | HTMLElement, animation: string, time?: number) => Promise<void> } */
    (element, animation, time) => {
        const animationClass = `anim-${animation}`;
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return Promise.resolve();
        
        // @ts-ignore
        el.style.animationDuration = time ? `${time}ms` : '';
        
        if (el.classList.contains(animationClass)) {
            el.classList.remove(animationClass);
            // @ts-ignore
            void el.offsetWidth; // trigger reflow
        }
        el.classList.add(animationClass);

        return new Promise((resolve) => {
            /** @type { (e: AnimationEvent) => void } */
            const onAnimationEnd = (e) => {
                if (e.target !== el) return;
                el.classList.remove(animationClass);
                // @ts-ignore
                el.removeEventListener('animationend', onAnimationEnd);
                resolve();
            };

            // @ts-ignore
            el.addEventListener('animationend', onAnimationEnd);
        });
    };

const eachSecond = () => {
    if (isDatabaseLoading) return;
    setTime(time + 1);
}
const eachSecondInterval = setInterval(eachSecond, 1000);

/*
    * BANCO DE DADOS *
*/
function getData() {
    return {
        // total_score segue o mesmo cálculo que já existia no jogo.
        total_score: score,
        max_score: maxScore,
        score: score,
        time: time,
        lives: lives,
        max_lives: maxLives
    }
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isPermissionDeniedError(error) {
    const message = (error && typeof error === "object" && "message" in error)
        ? String(error.message)
        : "";
    const code = (error && typeof error === "object" && "code" in error)
        ? String(error.code)
        : "";

    return code.includes("PERMISSION_DENIED") || /permission denied/i.test(message);
}

async function saveUserData() {
    if (!usuarioAtual) return;
    if (!canWriteForcaData) return;

    try {
        // @ts-ignore
        const uid = usuarioAtual.uid;
        const maxHistorico = 50;
        const roundData = getData();
        const currentRoundTotal = Number(roundData.total_score ?? 0);

        const existingSnapshot = await get(ref(db, `games/forca/usuarios/${uid}`));
        const existingData = existingSnapshot.exists() ? existingSnapshot.val() : null;
        const previousTotal = Number(existingData?.total_score ?? dadosUsuario?.total_score ?? 0);
        const total_score = previousTotal + currentRoundTotal;

        const data = {
            nome: (dadosUsuario && typeof dadosUsuario.nome === "string") ? dadosUsuario.nome : "Jogador",
            ...roundData,
            total_score,
            max_score: Math.max(
                Number(existingData?.max_score ?? dadosUsuario?.max_score ?? 0),
                maxScore
            )
        };

        await set(ref(db, `games/forca/usuarios/${uid}`), data);
        await set(ref(db, `games/forca/ranking/${uid}`), data);

        if (dadosUsuario) {
            dadosUsuario.total_score = total_score;
            dadosUsuario.max_score = data.max_score;
        }

        const historicoRef = ref(db, `games/forca/historico/${uid}`);
        await push(historicoRef, {
            ...data,
            data: new Date().toISOString()
        });

        const snapshotHistorico = await get(query(historicoRef, orderByKey(), limitToLast(maxHistorico + 1)));
        if (!snapshotHistorico.exists()) return;

        const entradas = Object.entries(snapshotHistorico.val());
        if (entradas.length <= maxHistorico) return;

        const itensExcedentes = entradas.slice(0, entradas.length - maxHistorico);
        await Promise.all(itensExcedentes.map(([chave]) => remove(ref(db, `games/forca/historico/${uid}/${chave}`))));
    } catch (error) {
        if (!isPermissionDeniedError(error)) {
            console.error("Erro ao salvar dados no Firebase:", error);
            return;
        }
        canWriteForcaData = false;
    }
}

/**
 * @param {string} uid
 */
async function carregarDadosUsuario(uid) {
    if (!canReadForcaData) return;

    try {
        const profileSnapshot = await get(ref(db, `usuarios/${uid}`));
        if (profileSnapshot.exists()) {
            dadosUsuario = profileSnapshot.val();
        }
    } catch (error) {
        if (!isPermissionDeniedError(error)) {
            console.error("Erro ao carregar perfil do usuário:", error);
        }
        // Sem permissão para perfil não deve bloquear o jogo.
    }

    try {
        const snapshot = await get(ref(db, `games/forca/usuarios/${uid}`));
        if (!snapshot.exists()) return;

        const data = snapshot.val();

        if (typeof data.max_score === "number") {
            maxScore = data.max_score;
        }
    } catch (error) {
        if (!isPermissionDeniedError(error)) {
            console.error("Erro ao carregar dados da Forca:", error);
            return;
        }
        canReadForcaData = false;
    }
}

/*
    * EVENTOS *
*/

let __last_letter = '-';
/**
 * Evento de keypress no input de letra, para permitir digitar a letra sem precisar clicar no input
 * e para animar o input quando uma letra válida for digitada
 * @param {KeyboardEvent} e
*/
function onLetterInputElementKeyPress(e) {
    if (isDatabaseLoading) return;

    const letter = (e.key ?? "").toUpperCase();
    const cl = toChar(letter);
    __last_letter = letter === "ENTER" ? __last_letter : cl;
    if (letter.match(/^[A-Z]$/)) {
        if (prohibitedLetters.includes(cl) || guessedLetters.includes(cl)) {
            playAnimation(LetterInputElement, 'shake');
            return;
        }
        setLetterInputValue(letter);
        playAnimation(LetterInputElement, 'pulse');
    } else if (letter === 'ENTER') {
        onLetterInputElementSent(toChar(__last_letter));
    }
}

/**
 * Evento de envio da letra, para verificar se a letra é válida e atualizar o jogo
 *
 * @param {char} letter
 */
async function onLetterInputElementSent(letter) {
    if (isDatabaseLoading) return;

    if (prohibitedLetters.includes(letter) || guessedLetters.includes(letter)) {
        playAnimation(LetterInputElement, 'shake');
        return;
    }
    const contained = word.toUpperCase().includes(letter.toUpperCase());

    if (contained) {
        addGuessedLetter(letter);
        updateWord();
        const allGuessed = guessedLetters.length === new Set(word.toUpperCase().split('')).size;
        if (allGuessed) {
            setScore(score + 1);
            maxLivesOffset += maxLivesOffset > 5 ? 0 : 1;
            resetGame();
            saveUserData();
        }
    } else {
        addProhibitedLetter(letter);
        setLives(lives - 1);
        if (lives - 1 < 0) {
            alert(`Game Over! A palavra era "${word.toUpperCase()}".`);
            saveUserData();
            resetGame();
            resetVariables();
            update();
        }
    }
    update();
    
    LetterInputElement.blur();
    await playAnimation(LetterInputElement, 'ascend-out');
    setLetterInputValue('');
    await playAnimation(LetterInputElement, 'ascend-in');
    LetterInputElement.focus();
}

LetterInputElement.addEventListener('keypress', (e) => {
    e.preventDefault();
    onLetterInputElementKeyPress(e);
});

window.addEventListener("beforeunload", () => {
    saveUserData();
});

setDatabaseLoadingState(true);
updateHeartbeatInterval();

// @ts-ignore
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/login.html";
        return;
    }

    usuarioAtual = user;

    if (!dadosUsuario) {
        dadosUsuario = {
            nome: user.displayName || (user.email ? user.email.split("@")[0] : "Jogador")
        };
    }

    try {
        await carregarDadosUsuario(user.uid);
    } catch (error) {
        console.error("Erro inesperado na autenticação/carregamento:", error);
    } finally {
        resetGame();
        resetVariables();
        update();
        setDatabaseLoadingState(false);
    }
});