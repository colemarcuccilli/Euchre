class EuchreTournament {
    constructor() {
        this.players = [];
        this.numPlayers = 0;
        this.numTables = 1;
        this.maxGames = 5;
        this.rounds = [];
        this.playerStats = new Map();
        this.partnerships = new Map();
        this.playerScores = new Map();
        
        this.initializeEventListeners();
        this.initializePotCalculator();
    }

    initializeEventListeners() {
        // Main buttons
        document.getElementById('generateBtn')?.addEventListener('click', () => this.generateTournament());
        document.getElementById('resetBtn')?.addEventListener('click', () => this.resetTournament());
        
        // Print buttons
        document.getElementById('printResultsBtn')?.addEventListener('click', () => this.printResults());
        document.getElementById('printScheduleBtn')?.addEventListener('click', () => this.printSchedule());
        document.getElementById('printTableCardsBtn')?.addEventListener('click', () => this.printTableCards());
        
        // Input handlers
        document.getElementById('numPlayers')?.addEventListener('change', () => this.updateTablesRecommendation());
        document.getElementById('entryFee')?.addEventListener('input', () => this.calculatePot());
    }

    updateTablesRecommendation() {
        const numPlayers = parseInt(document.getElementById('numPlayers').value);
        const recommendedTables = Math.floor(numPlayers / 4);
        document.getElementById('numTables').value = recommendedTables;
        this.calculatePot();
    }

    initializePlayerStats() {
        this.players.forEach(player => {
            this.playerStats.set(player, {
                gamesPlayed: 0,
                partners: new Set(),
                lastRoundPlayed: -1,
                wins: 0
            });
        });
    }

    hasPlayedTogether(player1, player2) {
        const key = [player1, player2].sort().join('-');
        return this.partnerships.has(key);
    }

    recordPartnership(player1, player2, roundNumber) {
        const key = [player1, player2].sort().join('-');
        this.partnerships.set(key, (this.partnerships.get(key) || 0) + 1);
        
        const stats1 = this.playerStats.get(player1);
        const stats2 = this.playerStats.get(player2);
        
        stats1.gamesPlayed++;
        stats2.gamesPlayed++;
        stats1.partners.add(player2);
        stats2.partners.add(player1);
        stats1.lastRoundPlayed = roundNumber;
        stats2.lastRoundPlayed = roundNumber;
    }


// Add new method
resetTournament() {
    this.players = [];
    this.numPlayers = 0;
    this.numTables = 1;
    this.maxGames = 5;
    this.rounds = [];
    this.playerStats.clear();
    this.partnerships.clear();
    this.playerScores.clear();

    // Reset form values
    document.getElementById('numPlayers').value = 8;
    document.getElementById('numTables').value = 2;
    document.getElementById('maxGames').value = 5;
    document.getElementById('entryFee').value = 0;

    // Clear displays
    document.getElementById('roundsContainer').innerHTML = '';
    document.getElementById('leaderboardContainer').innerHTML = '';
    this.updatePodium();
    this.showError('Tournament reset successfully');
}

// Add new method
updatePodium() {
    const standings = Array.from(this.playerStats.entries())
        .sort((a, b) => b[1].wins - a[1].wins)
        .slice(0, 4);
    
    const entryFee = parseFloat(document.getElementById('entryFee').value) || 0;
    const totalPot = entryFee * this.numPlayers;
    const payouts = {
        first: totalPot * 0.4,
        second: totalPot * 0.3,
        third: totalPot * 0.2,
        fourth: totalPot * 0.1
    };

    ['first', 'second', 'third', 'fourth'].forEach((position, index) => {
        const playerInfo = standings[index] || [null, { wins: 0 }];
        const podiumSpot = document.querySelector(`.podium-spot.${position}`);
        if (podiumSpot) {
            podiumSpot.querySelector('.player-number').textContent = 
                playerInfo[0] || '--';
            podiumSpot.querySelector('.prize').textContent = 
                entryFee > 0 ? `$${payouts[position].toFixed(2)}` : '--';
        }
    });
}

    validateInputs() {
        this.numPlayers = parseInt(document.getElementById('numPlayers').value);
        this.numTables = parseInt(document.getElementById('numTables').value);
        this.maxGames = parseInt(document.getElementById('maxGames').value);

        this.players = Array.from({length: this.numPlayers}, (_, i) => `Player ${i + 1}`);

        if (this.numPlayers < 4) {
            this.showError('Please enter at least 4 players');
            return false;
        }

        if (this.numTables < 1) {
            this.showError('Must have at least 1 table');
            return false;
        }

        if (this.maxGames < 1) {
            this.showError('Must play at least 1 game');
            return false;
        }

        return true;
    }

    findEligiblePlayers(roundNumber, existingTablePlayers = []) {
        return this.players
            .filter(player => !existingTablePlayers.includes(player))
            .sort((a, b) => {
                const statsA = this.playerStats.get(a);
                const statsB = this.playerStats.get(b);
                
                if (statsA.gamesPlayed !== statsB.gamesPlayed) {
                    return statsA.gamesPlayed - statsB.gamesPlayed;
                }
                
                return statsA.lastRoundPlayed - statsB.lastRoundPlayed;
            });
    }

    generateTable(availablePlayers, roundNumber) {
        if (availablePlayers.length < 4) return null;

        const table = {
            team1: { player1: null, player2: null },
            team2: { player1: null, player2: null },
            winner: null
        };

        const firstPlayer = availablePlayers[0];
        table.team1.player1 = firstPlayer;
        
        const eligiblePartners = this.findEligiblePlayers(roundNumber, [firstPlayer])
            .filter(player => !this.hasPlayedTogether(firstPlayer, player));
        
        if (eligiblePartners.length === 0) return null;
        table.team1.player2 = eligiblePartners[0];

        const remainingPlayers = this.findEligiblePlayers(roundNumber, 
            [table.team1.player1, table.team1.player2]);
        
        if (remainingPlayers.length < 2) return null;
        
        table.team2.player1 = remainingPlayers[0];
        table.team2.player2 = remainingPlayers[1];

        this.recordPartnership(table.team1.player1, table.team1.player2, roundNumber);
        this.recordPartnership(table.team2.player1, table.team2.player2, roundNumber);

        return table;
    }

    generateTournament() {
        if (!this.validateInputs()) return;

        this.rounds = [];
        this.partnerships.clear();
        this.playerStats.clear();
        
        this.initializePlayerStats();

        let currentRound = 0;
        while (currentRound < this.maxGames) {
            const round = {
                round: currentRound + 1,
                tables: [],
                sittingOut: []
            };

            let availablePlayers = this.findEligiblePlayers(currentRound);
            
            while (availablePlayers.length >= 4 && round.tables.length < this.numTables) {
                const table = this.generateTable(availablePlayers, currentRound);
                if (!table) break;

                round.tables.push({
                    table: round.tables.length + 1,
                    ...table
                });

                const assignedPlayers = [
                    table.team1.player1, table.team1.player2,
                    table.team2.player1, table.team2.player2
                ];
                availablePlayers = availablePlayers.filter(p => !assignedPlayers.includes(p));
            }

            round.sittingOut = availablePlayers;
            this.rounds.push(round);
            currentRound++;

            const minGamesPlayed = Math.min(...Array.from(this.playerStats.values())
                .map(stats => stats.gamesPlayed));
            if (minGamesPlayed >= this.maxGames) break;
        }

        this.displayTournament();
    }

    displayTournament() {
        const container = document.getElementById('roundsContainer');
        container.innerHTML = '';
    
        this.rounds.forEach((round, roundIndex) => {
            const roundElement = document.createElement('div');
            roundElement.className = 'round-card';
            
            let roundHtml = `<h3>Round ${round.round}</h3>`;
            
            if (round.sittingOut.length > 0) {
                roundHtml += `
                    <div class="sitting-out">
                        <p>Sitting Out: ${round.sittingOut.join(', ')}</p>
                    </div>
                `;
            }
    
            roundHtml += `
                <div class="table-grid">
                    ${round.tables.map((table, tableIndex) => `
                        <div class="table-card ${!table.winner ? 'unplayed' : ''}" id="table-${roundIndex}-${tableIndex}">
                            <h4>Table ${table.table}</h4>
                            <div class="team ${table.winner === 'team1' ? 'winner' : ''}">
                                Team 1: ${table.team1.player1} & ${table.team1.player2}
                            </div>
                            <div class="team ${table.winner === 'team2' ? 'winner' : ''}">
                                Team 2: ${table.team2.player1} & ${table.team2.player2}
                            </div>
                            <div class="score-buttons">
                                <button 
                                    class="win-button team1-button" 
                                    data-round="${roundIndex}"
                                    data-table="${tableIndex}"
                                    data-team="team1"
                                    ${table.winner ? 'disabled' : ''}>
                                    Team 1 Won
                                </button>
                                <button 
                                    class="win-button team2-button" 
                                    data-round="${roundIndex}"
                                    data-table="${tableIndex}"
                                    data-team="team2"
                                    ${table.winner ? 'disabled' : ''}>
                                    Team 2 Won
                                </button>
                                ${table.winner ? `
                                    <button 
                                        class="undo-button"
                                        data-round="${roundIndex}"
                                        data-table="${tableIndex}">
                                        Undo
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
    
            roundElement.innerHTML = roundHtml;
            container.appendChild(roundElement);
        });
    
        // Add event listeners for buttons
        container.querySelectorAll('.win-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const round = parseInt(e.target.dataset.round);
                const table = parseInt(e.target.dataset.table);
                const team = e.target.dataset.team;
                this.recordWin(round, table, team);
            });
        });
    
        container.querySelectorAll('.undo-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const round = parseInt(e.target.dataset.round);
                const table = parseInt(e.target.dataset.table);
                this.undoWin(round, table);
            });
        });
    
        this.updateLeaderboard();
        this.updatePodium();
    }

    recordWin(roundIndex, tableIndex, winningTeam) {
        const table = this.rounds[roundIndex].tables[tableIndex];
        table.winner = winningTeam;
        
        const winners = winningTeam === 'team1' ? 
            [table.team1.player1, table.team1.player2] : 
            [table.team2.player1, table.team2.player2];
        
        winners.forEach(player => {
            const stats = this.playerStats.get(player);
            stats.wins++;
        });

        this.displayTournament();
        this.calculatePot();
    }

    undoWin(roundIndex, tableIndex) {
        const table = this.rounds[roundIndex].tables[tableIndex];
        const previousWinner = table.winner;
        
        const winners = previousWinner === 'team1' ? 
            [table.team1.player1, table.team1.player2] : 
            [table.team2.player1, table.team2.player2];
        
        winners.forEach(player => {
            const stats = this.playerStats.get(player);
            stats.wins--;
        });

        table.winner = null;
        this.displayTournament();
        this.calculatePot();
    }
    printResults() {
        const printWindow = window.open('', '_blank');
        
        // Only get the leaderboard data
        const standings = Array.from(this.playerStats.entries())
            .sort((a, b) => b[1].wins - a[1].wins);
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Tournament Standings</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 40px;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        font-size: 14px;
                    }
                    th, td { 
                        padding: 8px 12px;
                        border: 1px solid #ddd;
                        text-align: left;
                    }
                    th { 
                        background-color: #2c3e50;
                        color: white;
                    }
                    tr:nth-child(even) { 
                        background-color: #f8f9fa;
                    }
                    h1 { 
                        color: #2c3e50;
                        text-align: center;
                        margin-bottom: 20px;
                        font-size: 24px;
                    }
                    .print-btn {
                        display: block;
                        margin: 20px auto;
                        padding: 10px 20px;
                    }
                    @media print {
                        .print-btn { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Tournament Standings</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Wins</th>
                            <th>Games Played</th>
                            <th>Win Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standings.map(([player, stats], index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${player}</td>
                                <td>${stats.wins}</td>
                                <td>${stats.gamesPlayed}</td>
                                <td>${stats.gamesPlayed ? 
                                    ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) + '%' : 
                                    '0%'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <button class="print-btn" onclick="window.print()">Print Standings</button>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

printSchedule() {
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Tournament Schedule</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 20px;
                    max-width: 100%;
                    margin: 0;
                }
                .schedule-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    font-size: 12px;
                }
                .round {
                    border: 1px solid #ddd;
                    padding: 8px;
                    margin-bottom: 10px;
                }
                .round h3 {
                    margin: 0 0 5px 0;
                    font-size: 14px;
                }
                .table {
                    margin: 5px 0;
                }
                .sitting-out {
                    color: #e74c3c;
                    font-style: italic;
                    font-size: 11px;
                }
                h1 { 
                    text-align: center;
                    font-size: 20px;
                    margin-bottom: 15px;
                }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>Tournament Schedule</h1>
            <div class="schedule-grid">
                ${this.getCompactScheduleHTML()}
            </div>
            <button onclick="window.print()">Print</button>
        </body>
        </html>
    `);
    printWindow.document.close();
}

getCompactScheduleHTML() {
    return this.rounds.map(round => `
        <div class="round">
            <h3>Round ${round.round}</h3>
            ${round.sittingOut.length > 0 ? 
                `<div class="sitting-out">Out: ${round.sittingOut.join(', ')}</div>` : 
                ''}
            ${round.tables.map(table => `
                <div class="table">
                    T${table.table}: ${table.team1.player1}/${table.team1.player2} vs ${table.team2.player1}/${table.team2.player2}
                </div>
            `).join('')}
        </div>
    `).join('');
}

printTableCards() {
    const printWindow = window.open('', '_blank');
    const tables = this.generateTableCards();
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Table Cards</title>
            <style>
                body { 
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 15px;
                }
                .page {
                    page-break-after: always;
                    padding: 0.5in;
                    max-height: 10in;
                }
                .page:last-child {
                    page-break-after: auto;
                }
                .page-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    height: 100%;
                }
                .table-card {
                    border: 2px solid #2c3e50;
                    padding: 15px;
                    margin-bottom: 15px;
                    break-inside: avoid;
                    font-size: 14px;
                }
                .game {
                    border: 1px solid #ddd;
                    padding: 6px;
                    margin: 4px 0;
                    background: #f8f9fa;
                }
                h1 { 
                    text-align: center;
                    font-size: 24px;
                    margin: 0 0 15px 0;
                }
                h2 { 
                    color: #2c3e50;
                    font-size: 18px;
                    margin: 0 0 10px 0;
                }
                h3 { 
                    font-size: 16px;
                    margin: 0 0 5px 0;
                }
                .team {
                    margin: 3px 0;
                }
                @media print {
                    button { display: none; }
                    .page { height: 100vh; }
                }
            </style>
        </head>
        <body>
            ${tables}
            <button onclick="window.print()">Print</button>
        </body>
        </html>
    `);
    printWindow.document.close();
}

generateTableCards() {
    const tableGames = {};
    
    // Organize games by table
    this.rounds.forEach(round => {
        round.tables.forEach(table => {
            const tableNum = table.table;
            if (!tableGames[tableNum]) {
                tableGames[tableNum] = [];
            }
            tableGames[tableNum].push({
                round: round.round,
                team1: table.team1,
                team2: table.team2
            });
        });
    });

    // Calculate pages
    const tablesArray = Object.entries(tableGames);
    const pages = [];
    const tablesPerPage = 4;

    for (let i = 0; i < tablesArray.length; i += tablesPerPage) {
        pages.push(tablesArray.slice(i, i + tablesPerPage));
    }

    // Generate HTML for each page
    return pages.map((pageTables, pageIndex) => `
        <div class="page">
            <h1>Table Assignments - Page ${pageIndex + 1}</h1>
            <div class="page-grid">
                ${pageTables.map(([tableNum, games]) => `
                    <div class="table-card">
                        <h2>Table ${tableNum}</h2>
                        ${games.map(game => `
                            <div class="game">
                                <h3>Round ${game.round}</h3>
                                <div class="team">Team 1: ${game.team1.player1} & ${game.team1.player2}</div>
                                <div class="team">Team 2: ${game.team2.player1} & ${game.team2.player2}</div>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

getWinnersHTML() {
    const standings = Array.from(this.playerStats.entries())
        .sort((a, b) => b[1].wins - a[1].wins)
        .slice(0, 4);
    
    const entryFee = parseFloat(document.getElementById('entryFee').value) || 0;
    const totalPot = entryFee * this.numPlayers;
    const payouts = {
        0: totalPot * 0.4,
        1: totalPot * 0.3,
        2: totalPot * 0.2,
        3: totalPot * 0.1
    };

    return standings.map((player, index) => `
        <div>
            <strong>${index + 1}st Place:</strong> 
            ${player[0]} - ${player[1].wins} wins 
            ${entryFee > 0 ? `($${payouts[index].toFixed(2)})` : ''}
        </div>
    `).join('');
}

getStandingsHTML() {
    const standings = Array.from(this.playerStats.entries())
        .sort((a, b) => b[1].wins - a[1].wins);

    return `
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Wins</th>
                    <th>Games Played</th>
                    <th>Win Rate</th>
                </tr>
            </thead>
            <tbody>
                ${standings.map((player, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${player[0]}</td>
                        <td>${player[1].wins}</td>
                        <td>${player[1].gamesPlayed}</td>
                        <td>${((player[1].wins / player[1].gamesPlayed) * 100).toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

getScheduleHTML() {
    return this.rounds.map(round => `
        <div class="round">
            <h2>Round ${round.round}</h2>
            ${round.sittingOut.length > 0 ? 
                `<div class="sitting-out">Sitting Out: ${round.sittingOut.join(', ')}</div>` : 
                ''}
            ${round.tables.map(table => `
                <div class="table">
                    <h3>Table ${table.table}</h3>
                    <div>Team 1: ${table.team1.player1} & ${table.team1.player2}</div>
                    <div>Team 2: ${table.team2.player1} & ${table.team2.player2}</div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

generateTableCards() {
    const tableGames = {};
    
    // Organize games by table
    this.rounds.forEach(round => {
        round.tables.forEach(table => {
            const tableNum = table.table;
            if (!tableGames[tableNum]) {
                tableGames[tableNum] = [];
            }
            tableGames[tableNum].push({
                round: round.round,
                team1: table.team1,
                team2: table.team2
            });
        });
    });

    // Generate HTML for each table
    return Object.entries(tableGames).map(([tableNum, games]) => `
        <div class="table-card">
            <h2>Table ${tableNum}</h2>
            <div class="games">
                ${games.map(game => `
                    <div class="game">
                        <h3>Round ${game.round}</h3>
                        <div>Team 1: ${game.team1.player1} & ${game.team1.player2}</div>
                        <div>Team 2: ${game.team2.player1} & ${game.team2.player2}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

    updateLeaderboard() {
        const container = document.getElementById('leaderboardContainer');
        if (!container) return;

        const standings = Array.from(this.playerStats.entries())
            .sort((a, b) => {
                if (b[1].wins !== a[1].wins) {
                    return b[1].wins - a[1].wins;
                }
                const aRate = a[1].gamesPlayed ? (a[1].wins / a[1].gamesPlayed) : 0;
                const bRate = b[1].gamesPlayed ? (b[1].wins / b[1].gamesPlayed) : 0;
                return bRate - aRate;
            });

        const leaderboardHtml = `
            <div class="leaderboard">
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Wins</th>
                            <th>Games Played</th>
                            <th>Win Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standings.map(([player, stats], index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${player}</td>
                                <td>${stats.wins}</td>
                                <td>${stats.gamesPlayed}</td>
                                <td>${stats.gamesPlayed ? 
                                    ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) + '%' : 
                                    '0%'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = leaderboardHtml;
        this.calculatePot();
    }

    initializePotCalculator() {
        const entryFeeInput = document.getElementById('entryFee');
        if (entryFeeInput) {
            entryFeeInput.addEventListener('input', () => this.calculatePot());
        }
    }
    calculatePot() {
        const entryFee = parseFloat(document.getElementById('entryFee').value) || 0;
        const totalPot = entryFee * this.numPlayers;
    
        const payouts = {
            first: totalPot * 0.4,
            second: totalPot * 0.3,
            third: totalPot * 0.2,
            fourth: totalPot * 0.1
        };
    
        // Get current standings
        const standings = Array.from(this.playerStats.entries())
            .sort((a, b) => b[1].wins - a[1].wins)
            .slice(0, 4);
    
        // Update podium spots
        ['first', 'second', 'third', 'fourth'].forEach((position, index) => {
            const playerInfo = standings[index];
            const podiumSpot = document.querySelector(`.podium-spot.${position}`);
            if (podiumSpot) {
                const playerNumber = playerInfo ? playerInfo[0] : '--';
                const prizeAmount = entryFee > 0 ? `$${payouts[position].toFixed(2)}` : '$0';
                
                podiumSpot.querySelector('.player-number').textContent = playerNumber;
                podiumSpot.querySelector('.prize').textContent = prizeAmount;
            }
        });
    }

    showError(message) {
        const errorDisplay = document.getElementById('errorDisplay');
        if (errorDisplay) {
            errorDisplay.textContent = message;
            errorDisplay.style.display = 'block';
            
            if (!message.toLowerCase().includes('error') && 
                !message.toLowerCase().includes('invalid') && 
                !message.toLowerCase().includes('failed')) {
                setTimeout(() => {
                    errorDisplay.style.display = 'none';
                }, 3000);
            }
        }
    }

    printResults() {
        window.print();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.tournament = new EuchreTournament();

    // Add event listener for print media query
    const mediaQuery = window.matchMedia('print');
    mediaQuery.addListener(mql => {
        if (mql.matches) {
            prepareForPrint();
        }
    });

    // Handle print preparation
    function prepareForPrint() {
        // Hide buttons and non-essential elements
        document.querySelectorAll('.win-button, .undo-button, .primary-btn, .secondary-btn')
            .forEach(button => {
                button.style.display = 'none';
            });

        // Expand all sections for printing
        document.querySelectorAll('.round-card').forEach(card => {
            card.style.pageBreakInside = 'avoid';
            card.style.marginBottom = '20px';
        });
    }

    // Handle window resize for responsive layout
    window.addEventListener('resize', () => {
        if (window.tournament.rounds.length > 0) {
            window.tournament.displayTournament();
        }
    });

    // Handle beforeprint event
    window.addEventListener('beforeprint', prepareForPrint);

    // Handle afterprint event
    window.addEventListener('afterprint', () => {
        // Restore buttons and layout
        document.querySelectorAll('.win-button, .undo-button, .primary-btn, .secondary-btn')
            .forEach(button => {
                button.style.display = 'inline-block';
            });

        document.querySelectorAll('.round-card').forEach(card => {
            card.style.pageBreakInside = '';
            card.style.marginBottom = '';
        });
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && window.tournament.rounds.length > 0) {
            window.tournament.displayTournament();
        }
    });

    // Prevent accidental page refresh
    window.addEventListener('beforeunload', (event) => {
        if (window.tournament.rounds.length > 0) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
});