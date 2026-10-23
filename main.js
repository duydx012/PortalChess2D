const board = document.getElementById('board');
const checkWarning = document.getElementById('check-warning');
const modal = document.getElementById('game-over-modal');
const winnerText = document.getElementById('winner-text');

const timerWhiteEl = document.getElementById('timer-white');
const timerBlackEl = document.getElementById('timer-black');
const graveyardWhiteEl = document.getElementById('graveyard-white');
const graveyardBlackEl = document.getElementById('graveyard-black');

let initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

let boardState = JSON.parse(JSON.stringify(initialBoard));

const pieceIcons = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

let selectedPos = null;
let currentValidMoves = [];
let cellElements = [];
let turn = 'white';
let isGameOver = false;

// QUẢN LÝ THỜI GIAN BẤM GIỜ XUÔI (MỖI BÊN CÓ ĐỒNG HỒ RIÊNG)
let timeWhite = 0;
let timeBlack = 0;
let timerInterval = null;

let capturedByWhite = [];
let capturedByBlack = [];

// QUẢN LÝ CỔNG PORTAL
let portals = {
    orange: null,
    blue: null,
    duration: 0
};
let portalCooldown = 0;

function isWhite(piece) { return piece !== '' && piece === piece.toUpperCase(); }
function isBlack(piece) { return piece !== '' && piece === piece.toLowerCase(); }

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Hàm bấm giờ tăng dần theo lượt người chơi
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (isGameOver) return;

        if (turn === 'white') {
            timeWhite++;
            timerWhiteEl.textContent = formatTime(timeWhite);
        } else {
            timeBlack++;
            timerBlackEl.textContent = formatTime(timeBlack);
        }
    }, 1000);
}

function clearHighlights() {
    cellElements.forEach(row => {
        row.forEach(cell => {
            cell.style.outline = 'none';
            cell.classList.remove('in-check');
            const dot = cell.querySelector('.preview-dot');
            if (dot) dot.remove();
        });
    });
}

// Spawn 1 cổng ở nửa sân Trắng, 1 cổng ở nửa sân Đen
function spawnPortals() {
    let whiteSideCells = [];
    let blackSideCells = [];

    for (let r = 2; r <= 3; r++) {
        for (let c = 0; c < 8; c++) {
            if (boardState[r][c] === '') blackSideCells.push({ row: r, col: c });
        }
    }

    for (let r = 4; r <= 5; r++) {
        for (let c = 0; c < 8; c++) {
            if (boardState[r][c] === '') whiteSideCells.push({ row: r, col: c });
        }
    }

    if (blackSideCells.length > 0 && whiteSideCells.length > 0) {
        let idxBlack = Math.floor(Math.random() * blackSideCells.length);
        let idxWhite = Math.floor(Math.random() * whiteSideCells.length);

        if (Math.random() > 0.5) {
            portals.orange = blackSideCells[idxBlack];
            portals.blue = whiteSideCells[idxWhite];
        } else {
            portals.blue = blackSideCells[idxBlack];
            portals.orange = whiteSideCells[idxWhite];
        }

        portals.duration = 6;
    }
}

function updatePortalTurn() {
    if (portals.duration > 0) {
        portals.duration--;
        if (portals.duration === 0) {
            portals.orange = null;
            portals.blue = null;
            portalCooldown = 4;
        }
    } else if (portalCooldown > 0) {
        portalCooldown--;
        if (portalCooldown === 0) {
            spawnPortals();
        }
    }
}

function getRawMoves(row, col, state) {
    const piece = state[row][col];
    if (!piece) return [];

    const moves = [];
    const pieceType = piece.toLowerCase();
    const pieceIsWhite = isWhite(piece);

    function checkMove(r, c) {
        if (r < 0 || r >= 8 || c < 0 || c >= 8) return 'STOP';
        const target = state[r][c];
        if (target === '') {
            moves.push({ row: r, col: c });
            return 'CONTINUE';
        }
        if ((pieceIsWhite && isBlack(target)) || (!pieceIsWhite && isWhite(target))) {
            moves.push({ row: r, col: c });
        }
        return 'STOP';
    }

    if (pieceType === 'p') {
        const dir = pieceIsWhite ? -1 : 1;
        const startRow = pieceIsWhite ? 6 : 1;
        if (state[row + dir] && state[row + dir][col] === '') {
            moves.push({ row: row + dir, col: col });
            if (row === startRow && state[row + 2 * dir][col] === '') {
                moves.push({ row: row + 2 * dir, col: col });
            }
        }
        [-1, 1].forEach(dc => {
            const nr = row + dir, nc = col + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                const target = state[nr][nc];
                if (target !== '' && isWhite(target) !== pieceIsWhite) {
                    moves.push({ row: nr, col: nc });
                }
            }
        });
    }
    else if (pieceType === 'n') {
        const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        knightMoves.forEach(([dr, dc]) => checkMove(row + dr, col + dc));
    }
    if (pieceType === 'r' || pieceType === 'q') {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        dirs.forEach(([dr, dc]) => {
            let r = row + dr, c = col + dc;
            while (checkMove(r, c) === 'CONTINUE') { r += dr; c += dc; }
        });
    }
    if (pieceType === 'b' || pieceType === 'q') {
        const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        dirs.forEach(([dr, dc]) => {
            let r = row + dr, c = col + dc;
            while (checkMove(r, c) === 'CONTINUE') { r += dr; c += dc; }
        });
    }
    else if (pieceType === 'k') {
        const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        dirs.forEach(([dr, dc]) => checkMove(row + dr, col + dc));
    }

    return moves;
}

function findKing(isWhiteKing, state) {
    const kingSymbol = isWhiteKing ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (state[r][c] === kingSymbol) return { row: r, col: c };
        }
    }
    return null;
}

function isKingInCheck(isWhiteSide, state = boardState) {
    const kingPos = findKing(isWhiteSide, state);
    if (!kingPos) return false;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = state[r][c];
            if (piece !== '' && isWhite(piece) !== isWhiteSide) {
                const moves = getRawMoves(r, c, state);
                if (moves.some(m => m.row === kingPos.row && m.col === kingPos.col)) {
                    return kingPos;
                }
            }
        }
    }
    return false;
}

function getValidMoves(row, col) {
    const rawMoves = getRawMoves(row, col, boardState);
    const piece = boardState[row][col];
    const pieceIsWhite = isWhite(piece);

    return rawMoves.filter(move => {
        const tempBoard = JSON.parse(JSON.stringify(boardState));
        tempBoard[move.row][move.col] = tempBoard[row][col];
        tempBoard[row][col] = '';
        return !isKingInCheck(pieceIsWhite, tempBoard);
    });
}

function hasAnyValidMoves(isWhiteSide) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece !== '' && isWhite(piece) === isWhiteSide) {
                if (getValidMoves(r, c).length > 0) return true;
            }
        }
    }
    return false;
}

function renderBoard() {
    clearHighlights();
    checkWarning.textContent = '';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = cellElements[r][c];
            const pieceSymbol = boardState[r][c];
            
            cell.textContent = pieceSymbol ? pieceIcons[pieceSymbol] : '';
            cell.className = 'cell ' + ((r + c) % 2 === 0 ? 'white-cell' : 'black-cell');

            if (pieceSymbol) {
                cell.classList.add(isWhite(pieceSymbol) ? 'piece-white' : 'piece-black');
            }

            if (portals.orange && portals.orange.row === r && portals.orange.col === c) {
                cell.classList.add('portal', 'portal-orange');
                let badge = document.createElement('span');
                badge.className = 'portal-timer';
                badge.textContent = portals.duration;
                cell.appendChild(badge);
            }
            if (portals.blue && portals.blue.row === r && portals.blue.col === c) {
                cell.classList.add('portal', 'portal-blue');
                let badge = document.createElement('span');
                badge.className = 'portal-timer';
                badge.textContent = portals.duration;
                cell.appendChild(badge);
            }
        }
    }

    if (turn === 'white') {
        timerWhiteEl.classList.add('active-timer');
        timerBlackEl.classList.remove('active-timer');
    } else {
        timerBlackEl.classList.add('active-timer');
        timerWhiteEl.classList.remove('active-timer');
    }

    graveyardWhiteEl.textContent = capturedByWhite.map(p => pieceIcons[p]).join(' ');
    graveyardBlackEl.textContent = capturedByBlack.map(p => pieceIcons[p]).join(' ');

    const isWhiteTurn = turn === 'white';
    const checkPos = isKingInCheck(isWhiteTurn);
    
    if (checkPos) {
        cellElements[checkPos.row][checkPos.col].classList.add('in-check');
        checkWarning.textContent = `⚠️ CẢNH BÁO: QUÂN ${isWhiteTurn ? 'TRẮNG' : 'ĐEN'} ĐANG BỊ CHIẾU!`;
    }

    if (!hasAnyValidMoves(isWhiteTurn)) {
        isGameOver = true;
        clearInterval(timerInterval);
        if (checkPos) {
            winnerText.textContent = isWhiteTurn ? 'CHIẾU BÍ! Quân Đen Thắng! 👑' : 'CHIẾU BÍ! Quân Trắng Thắng! 👑';
        } else {
            winnerText.textContent = 'HÒA CỜ! (Không còn nước đi hợp lệ) 🤝';
        }
        modal.style.display = 'flex';
    }
}

function resetGame() {
    boardState = JSON.parse(JSON.stringify(initialBoard));
    turn = 'white';
    isGameOver = false;
    selectedPos = null;
    currentValidMoves = [];
    timeWhite = 0;
    timeBlack = 0;
    capturedByWhite = [];
    capturedByBlack = [];
    portals = { orange: null, blue: null, duration: 0 };
    portalCooldown = 0;

    timerWhiteEl.textContent = '00:00';
    timerBlackEl.textContent = '00:00';
    modal.style.display = 'none';

    spawnPortals();
    renderBoard();
    startTimer();
}

for (let r = 0; r < 8; r++) {
    cellElements[r] = [];
    for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');

        cell.addEventListener('click', () => {
            if (isGameOver) return;

            const currentPiece = boardState[r][c];

            if (selectedPos) {
                const isValid = currentValidMoves.some(m => m.row === r && m.col === c);
                if (isValid) {
                    let targetRow = r;
                    let targetCol = c;
                    let isPortalHere = false;

                    if ((portals.orange && r === portals.orange.row && c === portals.orange.col) ||
                        (portals.blue && r === portals.blue.row && c === portals.blue.col)) {
                        isPortalHere = true;
                    }

                    const targetPiece = boardState[r][c];

                    // TÌNH HUỐNG 1: ĂN QUÂN TRONG PORTAL -> NỔ CỔNG, ĐỨNG YÊN TẠI Ô ĐÓ
                    if (isPortalHere && targetPiece !== '') {
                        targetRow = r;
                        targetCol = c;
                        portals.orange = null;
                        portals.blue = null;
                        portals.duration = 0;
                        portalCooldown = 4;
                    } 
                    // TÌNH HUỐNG 2: ĐI VÀO PORTAL TRỐNG -> TELEPORT SANG ĐẦU BÊN KÌA
                    else if (isPortalHere && targetPiece === '') {
                        if (portals.orange && r === portals.orange.row && c === portals.orange.col) {
                            targetRow = portals.blue.row;
                            targetCol = portals.blue.col;
                        } else if (portals.blue && r === portals.blue.row && c === portals.blue.col) {
                            targetRow = portals.orange.row;
                            targetCol = portals.orange.col;
                        }
                    }

                    const finalTargetPiece = boardState[targetRow][targetCol];

                    if (finalTargetPiece !== '') {
                        if (isWhite(boardState[selectedPos.row][selectedPos.col])) {
                            capturedByWhite.push(finalTargetPiece);
                        } else {
                            capturedByBlack.push(finalTargetPiece);
                        }
                    }

                    if (finalTargetPiece.toLowerCase() === 'k') {
                        boardState[targetRow][targetCol] = boardState[selectedPos.row][selectedPos.col];
                        boardState[selectedPos.row][selectedPos.col] = '';
                        isGameOver = true;
                        clearInterval(timerInterval);
                        renderBoard();
                        winnerText.textContent = 'Quân ' + (turn === 'white' ? 'Trắng' : 'Đen') + ' Thắng! 👑';
                        modal.style.display = 'flex';
                        return;
                    }

                    boardState[targetRow][targetCol] = boardState[selectedPos.row][selectedPos.col];
                    boardState[selectedPos.row][selectedPos.col] = '';

                    selectedPos = null;
                    currentValidMoves = [];
                    turn = (turn === 'white') ? 'black' : 'white';

                    updatePortalTurn();
                    renderBoard();
                    return;
                }
            }

            cellElements.forEach(row => row.forEach(cl => {
                cl.style.outline = 'none';
                const dot = cl.querySelector('.preview-dot');
                if (dot) dot.remove();
            }));

            if (currentPiece !== '') {
                const pieceIsWhite = isWhite(currentPiece);
                if ((turn === 'white' && pieceIsWhite) || (turn === 'black' && !pieceIsWhite)) {
                    selectedPos = { row: r, col: c };
                    cell.style.outline = '4px solid #f6e05e';
                    cell.style.outlineOffset = '-4px';

                    currentValidMoves = getValidMoves(r, c);
                    currentValidMoves.forEach(move => {
                        const targetCell = cellElements[move.row][move.col];
                        const dot = document.createElement('div');
                        dot.classList.add('preview-dot');
                        targetCell.appendChild(dot);
                    });
                } else {
                    selectedPos = null;
                    currentValidMoves = [];
                }
            } else {
                selectedPos = null;
                currentValidMoves = [];
            }
        });

        board.appendChild(cell);
        cellElements[r][c] = cell;
    }
}

spawnPortals();
renderBoard();
startTimer();