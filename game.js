// Main game variables
let scene, camera, renderer;
let player, threat;
let isGameActive = false;
let audioContext, listener;
let threatSound, environmentSounds = [];
let goalSound;
let keyStates = {};
let playerVelocity = new THREE.Vector3();
let playerSpeed = 0.08; // Slow movement for vulnerability
let clock = new THREE.Clock();
let raycaster = new THREE.Raycaster();
let threatDetectionRadius = 3;
let gameLevel;

// Add this at the beginning of your script
let debugMode = false;

// Add these debug features
function setupDebugMode() {
    if (!debugMode) return;
    
    // Add a visible floor grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
    scene.add(gridHelper);
    
    // Add a visible player marker
    const playerMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    playerMarker.position.y = 0.2;
    scene.add(playerMarker);
    window.playerMarker = playerMarker;
    
    // Add a visible threat marker
    const threatMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    threatMarker.position.y = 0.3;
    scene.add(threatMarker);
    window.threatMarker = threatMarker;
    
    // Extra light
    const debugLight = new THREE.DirectionalLight(0xffffff, 0.5);
    debugLight.position.set(5, 10, 5);
    scene.add(debugLight);
    
    console.log("Debug mode enabled");
}

// Initialize the game
function init() {
    setupEventListeners();
    setupScreens();
}

// Set up event listeners for key presses and buttons
function setupEventListeners() {
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);
    
    // Make sure key events are being properly captured
    window.addEventListener('keydown', (e) => {
        keyStates[e.code] = true;
        console.log("Key pressed:", e.code);
    });
    
    window.addEventListener('keyup', (e) => {
        keyStates[e.code] = false;
        console.log("Key released:", e.code);
    });
}

// Add this direct test
document.addEventListener('keydown', function(e) {
    console.log("Direct document keydown:", e.code);
});


// Handle different game screens
function setupScreens() {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
}

// Modify startGame to include these debug helpers
function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    console.log("Starting game...");
    
    initAudio();
    initThreeJS();
    createEnvironment();
    createPlayer();
    createThreat();
    createGoal();
    
    // Add debug helpers
    setupDebugMode();
    createTestCube();
    
    isGameActive = true;
    animate();
}

// Initialize Web Audio API
function initAudio() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume audio context (required by some browsers)
        if (audioContext.state === 'suspended') {
            console.log("Resuming audio context...");
            audioContext.resume();
        }
        
        // Create listener for 3D audio
        listener = audioContext.listener;
        
        console.log("Audio context initialized:", audioContext);
        console.log("Audio listener initialized:", listener);
        
        // Load all audio files
        loadAudioFiles();
    } catch (error) {
        console.error("Audio initialization error:", error);
    }
}

// Load all necessary audio files
function loadAudioFiles() {
    // Function to fetch audio file and create buffer
    function loadSound(url, callback) {
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        
        request.onload = function() {
            audioContext.decodeAudioData(request.response, function(buffer) {
                callback(buffer);
            }, function(error) {
                console.error("Error decoding audio data", error);
            });
        };
        
        request.onerror = function() {
            console.error("Error loading sound file");
        };
        
        request.send();
    }
    
    // Load threat sound
    loadSound('sounds/threat.mp3', function(buffer) {
        threatSound = {
            buffer: buffer,
            source: null
        };
    });
    
    // Load goal sound
    loadSound('sounds/goal.mp3', function(buffer) {
        goalSound = {
            buffer: buffer,
            source: null
        };
    });
    
    // List of environment sounds to load
    const environmentSoundFiles = [
        'sounds/creak.mp3',
        'sounds/wind.mp3',
        'sounds/drip.mp3',
        'sounds/distant_moan.mp3'
    ];
    
    // Load each environment sound
    environmentSoundFiles.forEach(function(soundFile) {
        loadSound(soundFile, function(buffer) {
            environmentSounds.push({
                buffer: buffer,
                source: null
            });
        });
    });
}

// Play a sound at a specific position in 3D space (fixed version)
function playSound(sound, position, loop = false) {
    if (!sound || !sound.buffer) {
        console.warn("Attempted to play sound that isn't loaded yet");
        return;
    }
    
    // If this sound is already playing, stop it
    if (sound.source) {
        sound.source.stop();
    }
    
    try {
        // Create new audio source
        sound.source = audioContext.createBufferSource();
        sound.source.buffer = sound.buffer;
        sound.source.loop = loop;
        
        // Create panner for 3D positioning
        const panner = audioContext.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'exponential';
        panner.refDistance = 1;
        panner.maxDistance = 100;
        panner.rolloffFactor = 1;
        
        // Set position using the appropriate method
        panner.setPosition(position.x, position.y, position.z);
        
        // Connect nodes and start playing
        sound.source.connect(panner);
        panner.connect(audioContext.destination);
        sound.source.start(0);
        
        return panner;
    } catch (error) {
        console.error("Error playing sound:", error);
        return null;
    }
}

// Initialize Three.js
function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.2);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 30);
    camera.position.set(0, 1.6, 0); // Eye level height
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    
    // Limited visibility for horror effect
    renderer.setClearColor(0x000000);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Create the game environment
function createEnvironment() {
    gameLevel = new THREE.Group();
    scene.add(gameLevel);
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x101010, 
        roughness: 0.8 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData = { isCollidable: true };
    gameLevel.add(floor);
    
    // Create walls and other environment objects
    // Main corridors in a maze-like pattern
    createWall(-5, 0, 10, 0.2, 3);
    createWall(5, 0, 10, 0.2, 3);
    createWall(0, -5, 0.2, 10, 3);
    createWall(0, 5, 0.2, 10, 3);
    
    // Inner walls for maze
    createWall(-2.5, 2, 5, 0.2, 3);
    createWall(2.5, -2, 5, 0.2, 3);
    createWall(-3, -3, 0.2, 4, 3);
    createWall(3, 3, 0.2, 4, 3);
    
    // Add some ambient lighting (very dim for horror effect)
    const ambientLight = new THREE.AmbientLight(0x050505);
    scene.add(ambientLight);
    
    // Add some point lights to create shadows and mood
    addPointLight(3, 1, 3, 0x330000, 0.5, 3);
    addPointLight(-3, 1, -3, 0x000022, 0.3, 5);
    
    // Create random environment objects for sound reflection
    for (let i = 0; i < 10; i++) {
        const size = Math.random() * 0.5 + 0.5;
        const x = Math.random() * 20 - 10;
        const z = Math.random() * 20 - 10;
        
        if (Math.abs(x) < 2 && Math.abs(z) < 2) continue; // Keep starting area clear
        
        const boxGeometry = new THREE.BoxGeometry(size, size * 2, size);
        const boxMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            roughness: 0.9 
        });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(x, size, z);
        box.castShadow = true;
        box.receiveShadow = true;
        box.userData = { isCollidable: true };
        gameLevel.add(box);
    }
}

// Helper function to create walls
function createWall(x, z, width, depth, height) {
    const wallGeometry = new THREE.BoxGeometry(width, height, depth);
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        roughness: 0.8 
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(x, height / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.userData = { isCollidable: true };
    gameLevel.add(wall);
}

// Helper function to add point lights
function addPointLight(x, y, z, color, intensity, distance) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(x, y, z);
    light.castShadow = true;
    scene.add(light);
}

// Create player with fixed audio positioning
function createPlayer() {
    // Player is just a camera controller in this game
    player = {
        position: camera.position,
        rotation: camera.rotation,
        height: 1.6
    };
    
    // Move player to a safe starting position
    player.position.set(0, 1.6, 0);
    camera.position.copy(player.position);
    
    // Update audio listener position based on player
    if (listener) {
        if (listener.positionX !== undefined) {
            // Modern API
            listener.positionX.value = player.position.x;
            listener.positionY.value = player.position.y;
            listener.positionZ.value = player.position.z;
            
            // Set listener orientation
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(camera.quaternion);
            
            listener.forwardX.value = forward.x;
            listener.forwardY.value = forward.y;
            listener.forwardZ.value = forward.z;
            listener.upX.value = 0;
            listener.upY.value = 1;
            listener.upZ.value = 0;
        } else {
            // Legacy API
            listener.setPosition(player.position.x, player.position.y, player.position.z);
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(camera.quaternion);
            listener.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
        }
    }
    
    console.log("Player created at position:", player.position);
}

// Create threat entity
function createThreat() {
    // Create a simple mesh for the threat (invisible to player in actual gameplay)
    const threatGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const threatMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.0 // Invisible during gameplay
    });
    
    threat = new THREE.Mesh(threatGeometry, threatMaterial);
    threat.position.set(10, 1, 10); // Start far from player
    scene.add(threat);
    
    // Create 3D audio for threat
    if (threatSound && threatSound.buffer) {
        threatSound.panner = playSound(threatSound, threat.position, true);
    }
    
    // Set up threat behavior
    threat.lastMoveTime = 0;
    threat.targetPosition = new THREE.Vector3(10, 1, 10);
    threat.moveInterval = 2000; // ms between position updates
    threat.speed = 0.05; // Speed of threat movement
    threat.awarenessOfPlayer = 0; // How aware the threat is of player (0-1)
}

// Create goal/escape point
function createGoal() {
    // Create a simple mesh for the goal (slightly visible glow)
    const goalGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const goalMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff,
        transparent: true,
        opacity: 0.2 // Barely visible
    });
    
    const goal = new THREE.Mesh(goalGeometry, goalMaterial);
    goal.position.set(-12, 1, -12); // Far corner of the map
    scene.add(goal);
    
    // Create 3D audio for goal
    if (goalSound && goalSound.buffer) {
        goalSound.panner = playSound(goalSound, goal.position, true);
    }
    
    // Store goal in game state
    window.gameGoal = goal;
}

// Play random environmental sounds
function playEnvironmentalSounds() {
    if (environmentSounds.length === 0) return;
    
    // Randomly play environment sounds
    if (Math.random() < 0.005) { // 0.5% chance per frame
        const randomSound = environmentSounds[Math.floor(Math.random() * environmentSounds.length)];
        
        // Random position near player
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 10 + 5;
        const x = player.position.x + Math.cos(angle) * distance;
        const z = player.position.z + Math.sin(angle) * distance;
        
        playSound(randomSound, new THREE.Vector3(x, 1, z));
    }
}

// Update threat with fixed audio positioning
function updateThreat(deltaTime) {
    if (!threat) return;
    
    // Calculate distance to player
    const distanceToPlayer = threat.position.distanceTo(player.position);
    
    // Update threat's awareness of player based on distance and player movement
    const playerIsMoving = playerVelocity.length() > 0.01;
    if (playerIsMoving && distanceToPlayer < 8) {
        // Player movement makes noise, increasing threat awareness
        threat.awarenessOfPlayer += deltaTime * (1 / distanceToPlayer) * 0.1;
    } else {
        // Threat gradually loses awareness over time
        threat.awarenessOfPlayer -= deltaTime * 0.02;
    }
    
    // Clamp awareness between 0 and 1
    threat.awarenessOfPlayer = Math.max(0, Math.min(1, threat.awarenessOfPlayer));
    
    // Update threat movement
    const now = Date.now();
    if (now - threat.lastMoveTime > threat.moveInterval) {
        threat.lastMoveTime = now;
        
        // Choose new target position based on awareness
        if (threat.awarenessOfPlayer > 0.7) {
            // Highly aware - move directly towards player
            threat.targetPosition.copy(player.position);
        } else if (threat.awarenessOfPlayer > 0.3) {
            // Somewhat aware - move in player's general direction
            const angleToPlayer = Math.atan2(
                player.position.z - threat.position.z,
                player.position.x - threat.position.x
            );
            
            // Add some randomness to the angle
            const randomAngle = angleToPlayer + (Math.random() - 0.5) * Math.PI * 0.5;
            const distance = Math.random() * 5 + 5;
            
            threat.targetPosition.x = threat.position.x + Math.cos(randomAngle) * distance;
            threat.targetPosition.z = threat.position.z + Math.sin(randomAngle) * distance;
        } else {
            // Unaware - wander randomly
            const randomAngle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 5 + 2;
            
            threat.targetPosition.x = threat.position.x + Math.cos(randomAngle) * distance;
            threat.targetPosition.z = threat.position.z + Math.sin(randomAngle) * distance;
        }
        
        // Keep y position constant
        threat.targetPosition.y = 1;
    }
    
    // Move towards target position
    const moveDirection = new THREE.Vector3();
    moveDirection.subVectors(threat.targetPosition, threat.position).normalize();
    
    threat.position.x += moveDirection.x * threat.speed * deltaTime * 60;
    threat.position.z += moveDirection.z * threat.speed * deltaTime * 60;
    
    // Update threat sound position
    if (threatSound && threatSound.panner) {
        threatSound.panner.setPosition(threat.position.x, threat.position.y, threat.position.z);
    }
    
    // Check if threat caught player
    if (distanceToPlayer < threatDetectionRadius) {
        gameOver();
    }
}

// Check for collision with walls
function checkCollision(position) {
    raycaster.near = 0;
    raycaster.far = 0.5; // Reduced from 1 to more reasonable collision distance
    
    // Check in 4 directions (forward, backward, left, right)
    const directions = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1)
    ];
    
    for (const direction of directions) {
        // Create a normalized copy of the direction
        const normalizedDir = direction.clone().normalize();
        
        // Set the raycaster position and direction
        raycaster.set(position, normalizedDir);
        
        // Get intersections with collidable objects only
        const intersects = raycaster.intersectObjects(
            scene.children.filter(obj => obj.userData && obj.userData.isCollidable), 
            true
        );
        
        // Check if there's a collision
        if (intersects.length > 0 && intersects[0].distance < 0.3) {
            console.log("Collision detected in direction", direction);
            return true;
        }
    }
    
    return false;
}

// Update player movement with fixed audio positioning
function updatePlayer(deltaTime) {
    // Reset velocity
    playerVelocity.set(0, 0, 0);
    
    // Get movement direction from keys
    if (keyStates['KeyW'] || keyStates['ArrowUp']) {
        playerVelocity.z = -1;
        console.log("W key pressed");
    }
    if (keyStates['KeyS'] || keyStates['ArrowDown']) {
        playerVelocity.z = 1;
        console.log("S key pressed");
    }
    if (keyStates['KeyA'] || keyStates['ArrowLeft']) {
        playerVelocity.x = -1;
        console.log("A key pressed");
    }
    if (keyStates['KeyD'] || keyStates['ArrowRight']) {
        playerVelocity.x = 1;
        console.log("D key pressed");
    }
    
    // If no movement, return early
    if (playerVelocity.lengthSq() === 0) return;
    
    // Debug movement
    console.log("Moving with velocity:", playerVelocity);
    
    // Normalize velocity for consistent speed in all directions
    playerVelocity.normalize();
    
    // Apply playerSpeed
    playerVelocity.multiplyScalar(playerSpeed * deltaTime * 60);
    
    // Get current velocity in camera direction
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    // Get right vector from camera
    const right = new THREE.Vector3(-cameraDirection.z, 0, cameraDirection.x);
    
    // Combine direction and right vectors based on input
    const moveX = playerVelocity.x * right.x + playerVelocity.z * cameraDirection.x;
    const moveZ = playerVelocity.x * right.z + playerVelocity.z * cameraDirection.z;
    
    // Calculate new position
    const newPosition = new THREE.Vector3(
        player.position.x + moveX,
        player.position.y,
        player.position.z + moveZ
    );
    
    // Check for collision - with added debugging
    if (checkCollision(newPosition)) {
        console.log("Collision detected, cannot move");
    } else {
        player.position.copy(newPosition);
        
        // Update camera position
        camera.position.copy(player.position);
        
        // Update audio listener position using the appropriate method
        if (listener) {
            if (listener.positionX !== undefined) {
                // Modern API
                listener.positionX.value = player.position.x;
                listener.positionY.value = player.position.y;
                listener.positionZ.value = player.position.z;
            } else {
                // Legacy API
                listener.setPosition(player.position.x, player.position.y, player.position.z);
            }
            
            // Update orientation too
            const forward = new THREE.Vector3();
            camera.getWorldDirection(forward);
            
            if (listener.forwardX !== undefined) {
                // Modern API
                listener.forwardX.value = forward.x;
                listener.forwardY.value = forward.y;
                listener.forwardZ.value = forward.z;
                listener.upX.value = 0;
                listener.upY.value = 1;
                listener.upZ.value = 0;
            } else {
                // Legacy API
                listener.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
            }
        }
    }
}

// Win game
function winGame() {
    isGameActive = false;
    
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    
    // Update game over text for win
    document.querySelector('#game-over-screen h2').textContent = "You escaped!";
    document.querySelector('#game-over-screen p').textContent = "You found your way out of the darkness.";
}

function checkWinCondition() {
    if (!isGameActive || !window.gameGoal) return;
    
    // Calculate distance between player and goal
    const distanceToGoal = player.position.distanceTo(window.gameGoal.position);
    
    // If player is close enough to the goal
    if (distanceToGoal < 1.5) {
        console.log("Goal reached! Distance:", distanceToGoal);
        winGame();
    }
}

// Game over
function gameOver() {
    isGameActive = false;
    
    // Play jump scare sound
    const jumpScareSound = {
        buffer: threatSound.buffer
    };
    playSound(jumpScareSound, player.position);
    
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
}

// Restart game
function restartGame() {
    // Reset the scene
    while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
    }
    
    // Reinitialize game
    initThreeJS();
    createEnvironment();
    createPlayer();
    createThreat();
    createGoal();
    
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    isGameActive = true;
    animate();
}

// Modifying animate function
function animate() {
    if (!isGameActive) return;
    
    requestAnimationFrame(animate);
    
    const deltaTime = Math.min(0.1, clock.getDelta()); // Cap delta time
    
    updatePlayer(deltaTime);
    updateThreat(deltaTime);
    updateDebugMarkers();
    playEnvironmentalSounds();
    
    // Add win condition check
    checkWinCondition();
    
    renderer.render(scene, camera);
    
    // Update audio indicator based on threat proximity
    updateAudioIndicator();
}

// Add this to your animate function
function updateDebugMarkers() {
    if (!debugMode) return;
    
    if (window.playerMarker) {
        window.playerMarker.position.x = player.position.x;
        window.playerMarker.position.z = player.position.z;
    }
    
    if (window.threatMarker && threat) {
        window.threatMarker.position.x = threat.position.x;
        window.threatMarker.position.z = threat.position.z;
    }
}

// Add a createTestCube function for visibility
function createTestCube() {
    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    cube.position.set(0, 1, -5); // Position in front of the player
    scene.add(cube);
    console.log("Test cube added");
    
    // Add a visible floor that's easier to see
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01; // Slightly below player
    scene.add(floor);
}

// Update audio indicator for visual feedback
function updateAudioIndicator() {
    const indicator = document.getElementById('audio-indicator');
    if (!indicator || !threat) return;
    
    const distance = player.position.distanceTo(threat.position);
    const maxDistance = 15; // Maximum distance for indicator
    
    if (distance < maxDistance) {
        const intensity = 1 - (distance / maxDistance);
        indicator.style.backgroundColor = `rgba(255, 0, 0, ${intensity * 0.7})`;
        indicator.style.boxShadow = `0 0 ${intensity * 30}px ${intensity * 10}px rgba(255, 0, 0, ${intensity * 0.5})`;
        indicator.style.transform = `translateX(-50%) scale(${1 + intensity})`;
    } else {
        indicator.style.backgroundColor = 'transparent';
        indicator.style.boxShadow = 'none';
        indicator.style.transform = 'translateX(-50%) scale(1)';
    }
}

// Initialize game on page load
window.addEventListener('load', init);