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

// Initialize the game
function init() {
    setupEventListeners();
    setupScreens();
}

// Set up event listeners for key presses and buttons
function setupEventListeners() {
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);
    
    document.addEventListener('keydown', (e) => {
        keyStates[e.code] = true;
    });
    
    document.addEventListener('keyup', (e) => {
        keyStates[e.code] = false;
    });
}

// Handle different game screens
function setupScreens() {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
}

// Start the game
function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    initAudio();
    initThreeJS();
    createEnvironment();
    createPlayer();
    createThreat();
    createGoal();
    
    isGameActive = true;
    animate();
}

// Initialize Web Audio API
function initAudio() {
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create listener for 3D audio
    listener = audioContext.listener;
    
    // Load all audio files
    loadAudioFiles();
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

// Play a sound at a specific position in 3D space
function playSound(sound, position, loop = false) {
    if (!sound || !sound.buffer) return;
    
    // If this sound is already playing, stop it
    if (sound.source) {
        sound.source.stop();
    }
    
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
    
    // Set position
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;
    
    // Connect nodes and start playing
    sound.source.connect(panner);
    panner.connect(audioContext.destination);
    sound.source.start(0);
    
    return panner;
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