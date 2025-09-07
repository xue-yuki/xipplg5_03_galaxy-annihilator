        const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');
        const gameContainer = document.getElementById('gameContainer');
        const uiContainer = document.getElementById('uiContainer');
        const scoreEl = document.getElementById('score'); const livesEl = document.getElementById('lives');
        const startScreen = document.getElementById('startScreen'); const gameOverScreen = document.getElementById('gameOverScreen');
        const leaderboardScreen = document.getElementById('leaderboardScreen');
        const initialMessage = document.getElementById('initialMessage'); const lobbyContent = document.getElementById('lobbyContent');
        const finalScoreEl = document.getElementById('finalScore'); const startButton = document.getElementById('startButton');
        const leaderboardButton = document.getElementById('leaderboardButton');
        const backToLobbyButton = document.getElementById('backToLobbyButton');
        const restartButton = document.getElementById('restartButton');
        const leaderboardList = document.getElementById('leaderboardList');
        const saveScoreForm = document.getElementById('saveScoreForm');
        const playerNameInput = document.getElementById('playerNameInput');
        const saveScoreButton = document.getElementById('saveScoreButton');
        const notificationEl = document.getElementById('notification');

        const gameWidth = Math.min(800, window.innerWidth - 40); const gameHeight = 600;
        canvas.width = gameWidth; canvas.height = gameHeight;

        let player, bullets, enemies, stars, particles, planets, powerUps, lobbyPlayer, asteroids, lobbyBullets;
        let score, lives, gameOver;
        let keys = {};
        let enemySpawnTimer, powerUpSpawnTimer, gameLoopId, menuLoopId;
        let gameState = 'initial';
        const POWERUP_DURATION = 5000;
        const FASTGUN_DURATION = 8000;
        const MAX_LIVES = 5;
        let mouse = { x: gameWidth / 2, y: gameHeight / 2 };
        
        const shootSound = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }, volume: -15 }).toDestination();
        const explosionSound = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 }, volume: -10 }).toDestination();
        const playerHitSound = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.1 }, volume: -5 }).toDestination();
        const powerUpSound = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.2 }, volume: -8 }).toDestination();
        const menuSelectSound = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }, volume: -10 }).toDestination();
        const gameOverSound = () => { const synth = new Tone.Synth().toDestination(); const now = Tone.now(); synth.triggerAttackRelease("C3", "8n", now); synth.triggerAttackRelease("G2", "8n", now + 0.2); synth.triggerAttackRelease("E2", "8n", now + 0.4); synth.triggerAttackRelease("C2", "4n", now + 0.6); };

        const createPlayer = () => ({ x: canvas.width / 2 - 25, y: canvas.height - 70, width: 50, height: 50, speed: 7, color: '#0ff', isPoweredUp: false, powerUpTimer: 0, hasShield: false, isFastGunActive: false, fastGunTimer: 0, fireCooldown: 0 });
        const createBullet = (x, y, angle = 0) => ({ x, y, width: 6, height: 20, speed: 12, color: '#ff0', vx: Math.sin(angle) * 12, vy: -Math.cos(angle) * 12 });
        const createEnemy = () => ({ x: Math.random() * (canvas.width - 40), y: -50, width: 45, height: 45, speed: Math.random() * 2.5 + 2, color: `hsl(${Math.random() * 60 + 280}, 100%, 60%)`, shapePoints: Array.from({length: 8}, () => ({x: Math.random() * 45, y: Math.random() * 45})) });
        const createStars = () => Array.from({ length: 300 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, radius: Math.random() * 1.5, alpha: Math.random() * 0.5 + 0.2, speed: Math.random() * 0.5 + 0.1 }));
        const createExplosion = (x, y, color) => { for (let i = 0; i < 25; i++) { particles.push({ x, y, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, radius: Math.random() * 3 + 1, color, lifespan: 60 }); } };
        const createPlanet = () => ({ x: Math.random() * canvas.width, y: -200, radius: Math.random() * 80 + 40, color1: `hsl(${Math.random() * 360}, 60%, 40%)`, color2: `hsl(${Math.random() * 360}, 60%, 20%)`, speed: Math.random() * 0.4 + 0.2 });
        const createPowerUp = () => { const types = ['tripleShot', 'shield', 'fastGun', 'life']; const type = types[Math.floor(Math.random() * types.length)]; let color; switch (type) { case 'shield': color = '#0af'; break; case 'fastGun': color = '#fa0'; break; case 'life': color = '#f44'; break; default: color = '#0f0'; } return { x: Math.random() * (canvas.width - 30), y: -30, size: 15, speed: 2, type, color }; };
        const createAsteroid = () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, radius: Math.random() * 20 + 10, speed: Math.random() * 0.2 + 0.1, color: '#555', shapePoints: Array.from({length: 10}, () => ({x: Math.random(), y: Math.random()})) });

        const drawPlayer = (p) => { const powerUpColor = 'rgba(255, 223, 0, 0.9)'; ctx.save(); const thrusterHeight = Math.random() * 20 + 15; ctx.fillStyle = p.isPoweredUp ? powerUpColor : `rgba(255, 180, 0, ${Math.random() * 0.5 + 0.5})`; ctx.shadowColor = p.isPoweredUp ? powerUpColor : '#ff0'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.moveTo(p.x + p.width * 0.3, p.y + p.height * 0.8); ctx.lineTo(p.x + p.width * 0.7, p.y + p.height * 0.8); ctx.lineTo(p.x + p.width / 2, p.y + p.height * 0.8 + thrusterHeight); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ccc'; ctx.shadowColor = p.color; ctx.shadowBlur = 15; ctx.beginPath(); ctx.moveTo(p.x + p.width / 2, p.y); ctx.lineTo(p.x, p.y + p.height * 0.8); ctx.lineTo(p.x + p.width, p.y + p.height * 0.8); ctx.closePath(); ctx.fill(); ctx.fillStyle = p.isPoweredUp ? powerUpColor : p.color; ctx.beginPath(); ctx.arc(p.x + p.width / 2, p.y + p.height * 0.4, p.width * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.restore(); if (p.hasShield) { ctx.save(); ctx.strokeStyle = '#0af'; ctx.fillStyle = 'rgba(0, 170, 255, 0.2)'; ctx.lineWidth = 3; ctx.shadowColor = '#0af'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); } };
        const drawBullet = (b) => { ctx.save(); ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 20; ctx.fillRect(b.x, b.y, b.width, b.height); ctx.fillStyle = 'white'; ctx.fillRect(b.x + b.width/2 - 1, b.y, 2, b.height/2); ctx.restore(); };
        const drawEnemy = (e) => { ctx.save(); ctx.fillStyle = e.color; ctx.shadowColor = e.color; ctx.shadowBlur = 20; ctx.beginPath(); ctx.moveTo(e.x + e.shapePoints[0].x, e.y + e.shapePoints[0].y); for(let i = 1; i < e.shapePoints.length; i++) { ctx.lineTo(e.x + e.shapePoints[i].x, e.y + e.shapePoints[i].y); } ctx.closePath(); ctx.fill(); ctx.restore(); };
        const drawStars = () => { stars.forEach(star => { ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`; ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fill(); }); };
        const drawParticles = () => { particles.forEach(p => { ctx.save(); ctx.globalAlpha = Math.max(0, p.lifespan / 60); ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); ctx.restore(); }); };
        const drawPlanets = () => { planets.forEach(p => { ctx.save(); const grad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.1, p.x, p.y, p.radius); grad.addColorStop(0, p.color1); grad.addColorStop(1, p.color2); ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }); };
        const drawPowerUps = () => { powerUps.forEach(p => { ctx.save(); ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 20; const angle = Date.now() / 200; ctx.beginPath(); switch(p.type) { case 'shield': for (let i = 0; i < 6; i++) { ctx.lineTo(p.x + p.size * Math.cos(angle + i * Math.PI / 3), p.y + p.size * Math.sin(angle + i * Math.PI / 3)); } break; case 'fastGun': for (let i = 0; i < 4; i++) { ctx.lineTo(p.x + p.size * 1.2 * Math.cos(angle + i * Math.PI / 2), p.y + p.size * 1.2 * Math.sin(angle + i * Math.PI / 2)); } break; case 'life': ctx.translate(p.x, p.y); ctx.rotate(angle); ctx.fillRect(-p.size * 0.2, -p.size * 0.7, p.size * 0.4, p.size * 1.4); ctx.fillRect(-p.size * 0.7, -p.size * 0.2, p.size * 1.4, p.size * 0.4); break; default: for(let i=0; i<5; i++){ ctx.lineTo(p.x + p.size * Math.cos(angle + i*2*Math.PI/5), p.y + p.size * Math.sin(angle + i*2*Math.PI/5)); } break; } if (p.type !== 'life') { ctx.closePath(); ctx.fill(); } ctx.restore(); }); };
        const drawAsteroids = () => { asteroids.forEach(a => { ctx.save(); ctx.fillStyle = a.color; ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x + a.radius * a.shapePoints[0].x, a.y + a.radius * a.shapePoints[0].y); for(let i=1; i < a.shapePoints.length; i++){ ctx.lineTo(a.x + a.radius * a.shapePoints[i].x, a.y + a.radius * a.shapePoints[i].y); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }); };

        const updatePlayer = (p) => { if (keys['ArrowLeft'] && p.x > 0) p.x -= p.speed; if (keys['ArrowRight'] && p.x < canvas.width - p.width) p.x += p.speed; if (p.isPoweredUp) { p.powerUpTimer -= 1000/60; if(p.powerUpTimer <= 0) p.isPoweredUp = false; } if (p.isFastGunActive) { p.fastGunTimer -= 1000/60; if(p.fastGunTimer <= 0) p.isFastGunActive = false; } p.fireCooldown -= 1000/60; if (p.isFastGunActive && p.fireCooldown <= 0) { shootSound.triggerAttackRelease("E5", "32n"); if (p.isPoweredUp) { bullets.push(createBullet(p.x + p.width / 2 - 3, p.y, 0)); bullets.push(createBullet(p.x + p.width / 2 - 3, p.y, -0.2)); bullets.push(createBullet(p.x + p.width / 2 - 3, p.y, 0.2)); } else { bullets.push(createBullet(p.x + p.width / 2 - 3, p.y)); } p.fireCooldown = 120; } };
        const updateBullets = () => { for (let i = bullets.length - 1; i >= 0; i--) { const b = bullets[i]; b.x += b.vx; b.y += b.vy; if (b.y < 0 || b.x < 0 || b.x > canvas.width) bullets.splice(i, 1); } };
        const updateLobbyBullets = () => { for (let i = lobbyBullets.length - 1; i >= 0; i--) { const b = lobbyBullets[i]; b.y -= b.speed; if (b.y < 0) lobbyBullets.splice(i, 1); } };
        const updateEnemies = () => { for (let i = enemies.length - 1; i >= 0; i--) { const enemy = enemies[i]; enemy.y += enemy.speed; if (enemy.y > canvas.height) enemies.splice(i, 1); } };
        const updateParticles = () => { for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx; p.y += p.vy; p.lifespan--; if (p.lifespan <= 0) particles.splice(i, 1); } };
        const updateStars = () => { stars.forEach(star => { star.y += star.speed; if (star.y > canvas.height) { star.y = 0; star.x = Math.random() * canvas.width; } }); };
        const updatePlanets = () => { planets.forEach(p => { p.y += p.speed; if (p.y - p.radius > canvas.height) { Object.assign(p, createPlanet()); p.y = -p.radius * 2; } }); };
        const updatePowerUps = () => { for (let i = powerUps.length - 1; i >= 0; i--) { powerUps[i].y += powerUps[i].speed; if (powerUps[i].y > canvas.height) powerUps.splice(i, 1); } };
        const updateAsteroids = () => { asteroids.forEach(a => { a.y += a.speed; if (a.y - a.radius > canvas.height) { Object.assign(a, createAsteroid()); a.y = -a.radius * 2; } }); };

        function checkCollisions() {
            for (let i = bullets.length - 1; i >= 0; i--) { for (let j = enemies.length - 1; j >= 0; j--) { const b = bullets[i], e = enemies[j]; if (b && e && b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) { explosionSound.triggerAttackRelease("0.2n"); createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color); bullets.splice(i, 1); enemies.splice(j, 1); score += 10; break; } } }
            for (let i = enemies.length - 1; i >= 0; i--) { const e = enemies[i]; if (player.x < e.x + e.width && player.x + player.width > e.x && player.y < e.y + e.height && player.y + player.height > e.y) { if (player.hasShield) { player.hasShield = false; explosionSound.triggerAttackRelease("0.2n"); createExplosion(e.x + e.width / 2, e.y + e.height / 2, '#0af'); enemies.splice(i, 1); } else { playerHitSound.triggerAttackRelease("0.3n"); createExplosion(player.x + player.width / 2, player.y + player.height / 2, player.color); enemies.splice(i, 1); lives--; } } }
            for (let i = powerUps.length - 1; i >= 0; i--) { const p = powerUps[i]; if (player.x < p.x + p.size && player.x + player.width > p.x && player.y < p.y + p.size && player.y + player.height > p.y) { switch(p.type) { case 'tripleShot': powerUpSound.triggerAttackRelease("C4", "4n"); player.isPoweredUp = true; player.powerUpTimer = POWERUP_DURATION; break; case 'shield': powerUpSound.triggerAttackRelease("E4", "4n"); player.hasShield = true; break; case 'fastGun': powerUpSound.triggerAttackRelease("A3", "4n"); player.isFastGunActive = true; player.fastGunTimer = FASTGUN_DURATION; break; case 'life': powerUpSound.triggerAttackRelease("G4", "4n"); if (lives < MAX_LIVES) { lives++; } break; } powerUps.splice(i, 1); } }
        }
        function checkLobbyCollisions() {
            for (let i = lobbyBullets.length - 1; i >= 0; i--) { for (let j = asteroids.length - 1; j >= 0; j--) { const b = lobbyBullets[i]; const a = asteroids[j]; if (b && a && b.x < a.x + a.radius && b.x + b.width > a.x - a.radius && b.y < a.y + a.radius && b.y + b.height > a.y - a.radius) { explosionSound.triggerAttackRelease("0.1n"); createExplosion(a.x, a.y, a.color); lobbyBullets.splice(i, 1); asteroids.splice(j, 1); const newAsteroid = createAsteroid(); newAsteroid.y = -newAsteroid.radius * 2; asteroids.push(newAsteroid); break; } } }
        }

        const getLeaderboard = () => JSON.parse(localStorage.getItem('galaxyAnnihilatorLeaderboard')) || [];
        const saveScore = (name, score) => { const leaderboard = getLeaderboard(); leaderboard.push({ name, score }); leaderboard.sort((a, b) => b.score - a.score); localStorage.setItem('galaxyAnnihilatorLeaderboard', JSON.stringify(leaderboard.slice(0, 10))); };
        const displayLeaderboard = () => { const leaderboard = getLeaderboard(); leaderboardList.innerHTML = ''; if (leaderboard.length === 0) { leaderboardList.innerHTML = '<li>Belum ada skor...</li>'; } else { leaderboard.forEach((entry, index) => { const li = document.createElement('li'); li.innerHTML = `<span class="rank">${index + 1}.</span><span class="name">${entry.name}</span><span class="score">${entry.score}</span>`; leaderboardList.appendChild(li); }); } };

        const updateUI = () => { scoreEl.textContent = `SKOR: ${score}`; livesEl.textContent = `NYAWA: ${lives}`; };
        function showNotification(message, duration = 2000) { notificationEl.textContent = message; notificationEl.classList.add('show'); setTimeout(() => { notificationEl.classList.remove('show'); }, duration); }
        function handleGameOver() { gameState = 'gameover'; finalScoreEl.textContent = `SKOR AKHIR: ${score}`; uiContainer.classList.add('transparent'); gameOverScreen.classList.remove('hidden'); const leaderboard = getLeaderboard(); if (score > 0 && (leaderboard.length < 10 || score > leaderboard[leaderboard.length - 1].score)) { saveScoreForm.classList.remove('hidden'); } gameOverSound(); }
        function prepareGame() { player = createPlayer(); bullets = []; enemies = []; particles = []; powerUps = []; score = 0; lives = 3; gameOver = false; if (enemySpawnTimer) clearInterval(enemySpawnTimer); if(powerUpSpawnTimer) clearInterval(powerUpSpawnTimer); if (gameLoopId) cancelAnimationFrame(gameLoopId); updateUI(); }
        function startGame() { prepareGame(); lobbyBullets = []; gameState = 'playing'; startScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden'); saveScoreForm.classList.add('hidden'); uiContainer.classList.remove('transparent'); enemySpawnTimer = setInterval(() => enemies.push(createEnemy()), 1000); powerUpSpawnTimer = setInterval(() => powerUps.push(createPowerUp()), 12000); gameLoop(); }
        
        function gameLoop() {
            if (gameState !== 'playing') { clearInterval(enemySpawnTimer); clearInterval(powerUpSpawnTimer); return; }
            updatePlayer(player); updateBullets(); updateEnemies(); updateParticles(); updateStars(); updatePlanets(); updatePowerUps(); checkCollisions();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawStars(); drawPlanets(); drawPowerUps(); drawPlayer(player);
            bullets.forEach(drawBullet); enemies.forEach(drawEnemy); particles.forEach(drawParticles); 
            updateUI();
            if (lives <= 0) handleGameOver();
            gameLoopId = requestAnimationFrame(gameLoop);
        }

        function menuLoop() {
            if (gameState === 'lobby') { updatePlayer(lobbyPlayer); updateLobbyBullets(); checkLobbyCollisions(); }
            updateStars(); updatePlanets(); updateAsteroids();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const parallaxX = (mouse.x - canvas.width / 2) * 0.01;
            const parallaxY = (mouse.y - canvas.height / 2) * 0.01;
            
            ctx.save(); ctx.translate(parallaxX * 2, parallaxY * 2); drawStars(); ctx.restore();
            drawPlanets(); // Planets are too far for parallax
            ctx.save(); ctx.translate(parallaxX, parallaxY); drawAsteroids(); ctx.restore();
            
            if (gameState === 'lobby') { drawPlayer(lobbyPlayer); lobbyBullets.forEach(drawBullet); }
            menuLoopId = requestAnimationFrame(menuLoop);
        }

        window.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            if (gameState === 'initial' && e.code === 'Space') {
                gameState = 'lobby'; menuSelectSound.triggerAttackRelease("C3", "8n");
                initialMessage.classList.add('transparent'); lobbyContent.classList.remove('transparent');
                lobbyPlayer = createPlayer(); lobbyPlayer.y = canvas.height - 150;
            }
            if (gameState === 'lobby' && e.code === 'Space' && !keys.spacePressed) {
                shootSound.triggerAttackRelease("C5", "32n");
                lobbyBullets.push(createBullet(lobbyPlayer.x + lobbyPlayer.width / 2 - 3, lobbyPlayer.y));
                keys.spacePressed = true;
            }
            if (gameState === 'playing' && e.code === 'Space' && !keys.spacePressed && !player.isFastGunActive && player.fireCooldown <= 0) { 
                shootSound.triggerAttackRelease("C5", "32n"); 
                if (player.isPoweredUp) { bullets.push(createBullet(player.x + player.width / 2 - 3, player.y, 0)); bullets.push(createBullet(player.x + player.width / 2 - 3, player.y, -0.2)); bullets.push(createBullet(player.x + player.width / 2 - 3, player.y, 0.2)); } 
                else { bullets.push(createBullet(player.x + player.width / 2 - 3, player.y)); } 
                keys.spacePressed = true;
                player.fireCooldown = 250;
            }
        });
        window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space') keys.spacePressed = false; });
        
        startButton.addEventListener('click', () => { 
            if (Tone.context.state !== 'running') Tone.start(); 
            if(menuLoopId) cancelAnimationFrame(menuLoopId);
            menuSelectSound.triggerAttackRelease("C4", "8n");
            startGame(); 
        });
        leaderboardButton.addEventListener('click', () => { menuSelectSound.triggerAttackRelease("C4", "8n"); displayLeaderboard(); startScreen.classList.add('hidden'); leaderboardScreen.classList.remove('hidden'); });
        backToLobbyButton.addEventListener('click', () => { menuSelectSound.triggerAttackRelease("C3", "8n"); leaderboardScreen.classList.add('hidden'); startScreen.classList.remove('hidden'); });
        restartButton.addEventListener('click', () => { gameState = 'lobby'; gameOverScreen.classList.add('hidden'); startScreen.classList.remove('hidden'); menuLoop(); });
        saveScoreButton.addEventListener('click', () => { const name = playerNameInput.value.trim().toUpperCase() || 'ANONIM'; saveScore(name, score); playerNameInput.value = ''; saveScoreForm.classList.add('hidden'); showNotification('SKOR BERHASIL DISIMPAN!'); });
        gameContainer.addEventListener('mousemove', (e) => { const rect = canvas.getBoundingClientRect(); mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top; });
        
        window.onload = () => {
            stars = createStars();
            planets = [createPlanet(), createPlanet()];
            asteroids = Array.from({ length: 5 }, createAsteroid);
            lobbyBullets = [];
            startScreen.classList.remove('hidden');
            menuLoop();
        };