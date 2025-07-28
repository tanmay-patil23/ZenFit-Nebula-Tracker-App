// Tarantula Nebula 3D Animation System
class TarantulaNebula {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = [];
        this.connections = [];
        this.animationId = null;
        this.isRunning = false;
        this.container = null;
        
        // Performance settings
        this.isMobile = window.innerWidth < 768;
        this.particleCount = this.isMobile ? 80 : 150;
        
        // Nebula colors
        this.colors = {
            hotGas: [0xff6b3d, 0xff4444, 0xff7f50],
            youngStars: [0x4db8ff, 0x87ceeb, 0x1e90ff],
            dustClouds: [0xd946ef, 0xff69b4, 0xba55d3],
            mixedEmission: [0xffffff, 0xffa500, 0xffffe0]
        };
    }

    init() {
        this.container = document.getElementById('nebula-container');
        if (!this.container) {
            console.error('Nebula container not found');
            return false;
        }

        try {
            this.setupScene();
            this.createParticles();
            this.createConnections();
            this.setupEventListeners();
            this.start();
            console.log('Tarantula Nebula animation initialized with', this.particleCount, 'particles');
            return true;
        } catch (error) {
            console.error('Failed to initialize Tarantula Nebula:', error);
            return false;
        }
    }

    setupScene() {
        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 100;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: !this.isMobile
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        
        const canvas = this.renderer.domElement;
        canvas.id = 'nebula-canvas';
        this.container.appendChild(canvas);
    }

    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);

        // Create central cluster (R136 star cluster)
        const centralClusterSize = Math.floor(this.particleCount * 0.3);
        
        for (let i = 0; i < this.particleCount; i++) {
            let x, y, z, colorSet, size;
            
            if (i < centralClusterSize) {
                // Central bright cluster
                const radius = Math.random() * 15;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                x = radius * Math.sin(phi) * Math.cos(theta);
                y = radius * Math.sin(phi) * Math.sin(theta);
                z = radius * Math.cos(phi);
                
                colorSet = this.colors.youngStars;
                size = Math.random() * 3 + 2;
            } else {
                // Outer nebula structure
                const radius = Math.random() * 80 + 20;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                x = radius * Math.sin(phi) * Math.cos(theta);
                y = radius * Math.sin(phi) * Math.sin(theta);
                z = (Math.random() - 0.5) * 60;
                
                // Determine particle type and color
                const rand = Math.random();
                if (rand < 0.4) {
                    colorSet = this.colors.hotGas;
                } else if (rand < 0.7) {
                    colorSet = this.colors.dustClouds;
                } else {
                    colorSet = this.colors.mixedEmission;
                }
                
                size = Math.random() * 2 + 1;
            }

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Set color
            const color = new THREE.Color(colorSet[Math.floor(Math.random() * colorSet.length)]);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            sizes[i] = size;

            // Store particle data for animation
            this.particles.push({
                originalX: x,
                originalY: y,
                originalZ: z,
                velocityX: (Math.random() - 0.5) * 0.02,
                velocityY: (Math.random() - 0.5) * 0.02,
                velocityZ: (Math.random() - 0.5) * 0.01,
                phase: Math.random() * Math.PI * 2,
                amplitude: Math.random() * 2 + 1
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Particle material with glow effect
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                varying float vSize;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vSize = size;
                    
                    // Add subtle movement
                    vec3 pos = position;
                    pos.x += sin(time * 0.001 + position.y * 0.01) * 0.5;
                    pos.y += cos(time * 0.0008 + position.x * 0.01) * 0.3;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vSize;
                
                void main() {
                    float distance = length(gl_PointCoord - vec2(0.5));
                    float alpha = 1.0 - smoothstep(0.0, 0.5, distance);
                    
                    // Create glow effect
                    float glow = 1.0 - smoothstep(0.0, 0.8, distance);
                    alpha = max(alpha, glow * 0.3);
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }

    createConnections() {
        const connectionGeometry = new THREE.BufferGeometry();
        const connectionPositions = [];
        const connectionColors = [];
        
        // Create web-like connections between nearby particles
        const maxConnections = this.isMobile ? 100 : 200;
        let connectionCount = 0;
        
        for (let i = 0; i < this.particleCount && connectionCount < maxConnections; i++) {
            for (let j = i + 1; j < this.particleCount && connectionCount < maxConnections; j++) {
                const particle1 = this.particles[i];
                const particle2 = this.particles[j];
                
                const distance = Math.sqrt(
                    Math.pow(particle1.originalX - particle2.originalX, 2) +
                    Math.pow(particle1.originalY - particle2.originalY, 2) +
                    Math.pow(particle1.originalZ - particle2.originalZ, 2)
                );
                
                // Only connect nearby particles
                if (distance < 25 && Math.random() < 0.1) {
                    connectionPositions.push(
                        particle1.originalX, particle1.originalY, particle1.originalZ,
                        particle2.originalX, particle2.originalY, particle2.originalZ
                    );
                    
                    // Use hot gas colors for connections
                    const color = new THREE.Color(0xff6b3d);
                    connectionColors.push(
                        color.r, color.g, color.b,
                        color.r, color.g, color.b
                    );
                    
                    connectionCount++;
                }
            }
        }
        
        if (connectionPositions.length > 0) {
            connectionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connectionPositions, 3));
            connectionGeometry.setAttribute('color', new THREE.Float32BufferAttribute(connectionColors, 3));
            
            const connectionMaterial = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.2,
                blending: THREE.AdditiveBlending
            });
            
            this.connectionSystem = new THREE.LineSegments(connectionGeometry, connectionMaterial);
            this.scene.add(this.connectionSystem);
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    animate() {
        if (!this.isRunning) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const time = Date.now();
        
        // Update particle material time uniform
        if (this.particleSystem && this.particleSystem.material.uniforms) {
            this.particleSystem.material.uniforms.time.value = time;
        }
        
        // Subtle camera rotation for dynamic effect
        this.camera.position.x = Math.sin(time * 0.0001) * 10;
        this.camera.position.y = Math.cos(time * 0.0001) * 5;
        this.camera.lookAt(0, 0, 0);
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    destroy() {
        this.stop();
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
    }
}

// Fitness Tracker Application
class FitnessTracker {
    constructor() {
        this.data = {
            workouts: [],
            totalXP: 0,
            currentLevel: 1,
            badges: [],
            streakData: {
                current: 0,
                longest: 0,
                lastWorkoutDate: null
            }
        };
        
        this.exercises = {
            "Cardio": ["Running", "Cycling", "Swimming", "Walking", "Dancing", "Rowing", "Elliptical", "Jumping Rope"],
            "Strength": ["Push-ups", "Pull-ups", "Squats", "Deadlifts", "Bench Press", "Planks", "Lunges", "Burpees"],
            "Flexibility": ["Yoga", "Stretching", "Pilates", "Tai Chi", "Meditation", "Foam Rolling", "Dynamic Warmup", "Cool Down"],
            "Sports": ["Basketball", "Tennis", "Soccer", "Volleyball", "Baseball", "Badminton", "Golf", "Boxing"]
        };
        
        this.xpRates = {
            "Cardio": 1.2,
            "Strength": 1.5,
            "Flexibility": 1.0,
            "Sports": 1.3
        };
        
        this.badgeDefinitions = [
            { id: "first-workout", name: "First Steps", description: "Complete your first workout", requirement: 1, type: "workout-count", icon: "🎯" },
            { id: "getting-started", name: "Getting Started", description: "Complete 5 workouts", requirement: 5, type: "workout-count", icon: "🌟" },
            { id: "consistency", name: "Consistency", description: "Complete 10 workouts", requirement: 10, type: "workout-count", icon: "💪" },
            { id: "dedicated", name: "Dedicated", description: "Complete 25 workouts", requirement: 25, type: "workout-count", icon: "🔥" },
            { id: "enthusiast", name: "Fitness Enthusiast", description: "Complete 50 workouts", requirement: 50, type: "workout-count", icon: "🏆" },
            { id: "warrior", name: "Workout Warrior", description: "Complete 100 workouts", requirement: 100, type: "workout-count", icon: "⚡" },
            { id: "legendary", name: "Legendary", description: "Complete 200 workouts", requirement: 200, type: "workout-count", icon: "👑" },
            { id: "streak-3", name: "3-Day Streak", description: "Workout for 3 consecutive days", requirement: 3, type: "streak", icon: "🔥" },
            { id: "streak-7", name: "Week Warrior", description: "Workout for 7 consecutive days", requirement: 7, type: "streak", icon: "📅" },
            { id: "streak-14", name: "Two Week Champion", description: "Workout for 14 consecutive days", requirement: 14, type: "streak", icon: "🌟" },
            { id: "streak-30", name: "Monthly Master", description: "Workout for 30 consecutive days", requirement: 30, type: "streak", icon: "🏅" }
        ];
        
        this.levelThresholds = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450];
        
        this.currentView = 'dashboard';
        this.selectedCategory = null;
        this.nebulaAnimation = new TarantulaNebula();
        this.charts = {};
        
        // Ensure init is called when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            // DOM is already loaded
            setTimeout(() => this.init(), 100);
        }
    }
    
    init() {
        console.log('Initializing FitnessTracker...');
        
        try {
            this.loadData();
            this.setupEventListeners();
            this.updateUI();
            
            // Initialize Tarantula Nebula animation
            setTimeout(() => {
                this.nebulaAnimation.init();
            }, 500);
            
            console.log('FitnessTracker initialized successfully');
        } catch (error) {
            console.error('Error initializing FitnessTracker:', error);
        }
    }
    
    loadData() {
        try {
            const saved = localStorage.getItem('fitnessTrackerData');
            if (saved) {
                const parsedData = JSON.parse(saved);
                this.data = { ...this.data, ...parsedData };
                console.log('Data loaded:', this.data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    saveData() {
        try {
            localStorage.setItem('fitnessTrackerData', JSON.stringify(this.data));
            console.log('Data saved');
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Use event delegation for better reliability
        document.addEventListener('click', (e) => {
            // Navigation buttons
            if (e.target.closest('.nav-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.nav-btn');
                const view = btn.dataset.view;
                console.log('Navigation clicked:', view);
                this.showView(view);
                this.setActiveNav(btn);
                return;
            }
            
            // Quick workout buttons
            if (e.target.closest('.quick-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.quick-btn');
                const category = btn.dataset.category;
                const exercise = btn.dataset.exercise;
                const duration = parseInt(btn.dataset.duration);
                console.log('Quick workout clicked:', { category, exercise, duration });
                this.quickWorkout(category, exercise, duration);
                return;
            }
            
            // Category buttons
            if (e.target.closest('.category-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.category-btn');
                const category = btn.dataset.category;
                console.log('Category selected:', category);
                this.selectCategory(category);
                this.setActiveCategory(btn);
                return;
            }
            
            // Modal close buttons
            if (e.target.matches('#success-close, #levelup-close, #badge-close')) {
                e.preventDefault();
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
                return;
            }
            
            // Modal backdrop clicks
            if (e.target.classList.contains('modal-backdrop')) {
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
                return;
            }
        });
        
        // Form submission
        const workoutForm = document.getElementById('workout-form');
        if (workoutForm) {
            workoutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Form submitted');
                this.submitWorkout();
            });
        }
        
        // Duration input for XP preview
        const durationInput = document.getElementById('duration-input');
        if (durationInput) {
            durationInput.addEventListener('input', () => {
                this.updateXPPreview();
            });
        }
        
        console.log('Event listeners set up');
    }
    
    showView(viewName) {
        console.log('Showing view:', viewName);
        
        // Hide all views
        const views = document.querySelectorAll('.view');
        views.forEach(view => view.classList.remove('active'));
        
        // Show target view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
            
            // Load view-specific data
            if (viewName === 'progress') {
                setTimeout(() => this.loadProgressCharts(), 200);
            } else if (viewName === 'badges') {
                this.loadBadges();
            }
            
            console.log('View switched to:', viewName);
        } else {
            console.error('View not found:', `${viewName}-view`);
        }
    }
    
    setActiveNav(activeBtn) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
    
    selectCategory(category) {
        this.selectedCategory = category;
        console.log('Selected category:', category);
        
        const exerciseSelect = document.getElementById('exercise-select');
        const exerciseGroup = document.getElementById('exercise-group');
        
        if (exerciseSelect && exerciseGroup && this.exercises[category]) {
            exerciseSelect.innerHTML = '<option value="">Select an exercise</option>';
            
            this.exercises[category].forEach(exercise => {
                const option = document.createElement('option');
                option.value = exercise;
                option.textContent = exercise;
                exerciseSelect.appendChild(option);
            });
            
            exerciseGroup.style.display = 'block';
        }
        
        this.updateXPPreview();
    }
    
    setActiveCategory(activeBtn) {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('selected'));
        if (activeBtn) {
            activeBtn.classList.add('selected');
        }
    }
    
    updateXPPreview() {
        const durationInput = document.getElementById('duration-input');
        const duration = parseInt(durationInput?.value || '0');
        const xp = this.calculateXP(this.selectedCategory, duration);
        
        const preview = document.getElementById('xp-preview');
        if (preview) {
            preview.textContent = `${xp} XP`;
        }
    }
    
    calculateXP(category, duration) {
        if (!category || !duration || duration <= 0) return 0;
        
        const baseXP = duration * 10;
        const categoryMultiplier = this.xpRates[category] || 1;
        
        return Math.floor(baseXP * categoryMultiplier);
    }
    
    quickWorkout(category, exercise, duration) {
        console.log('Processing quick workout:', { category, exercise, duration });
        
        if (!category || !exercise || !duration) {
            console.error('Invalid workout data');
            return;
        }
        
        const xp = this.calculateXP(category, duration);
        this.addWorkout({
            category,
            exercise,
            duration,
            xp,
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            notes: `Quick ${exercise} session`
        });
    }
    
    submitWorkout() {
        const exerciseSelect = document.getElementById('exercise-select');
        const durationInput = document.getElementById('duration-input');
        const notesInput = document.getElementById('notes-input');
        
        if (!this.selectedCategory) {
            alert('Please select a category');
            return;
        }
        
        if (!exerciseSelect?.value) {
            alert('Please select an exercise');
            return;
        }
        
        const duration = parseInt(durationInput?.value || '0');
        if (duration <= 0) {
            alert('Please enter a valid duration');
            return;
        }
        
        const xp = this.calculateXP(this.selectedCategory, duration);
        
        this.addWorkout({
            category: this.selectedCategory,
            exercise: exerciseSelect.value,
            duration: duration,
            xp: xp,
            notes: notesInput?.value || '',
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now()
        });
        
        this.resetWorkoutForm();
    }
    
    resetWorkoutForm() {
        const form = document.getElementById('workout-form');
        if (form) form.reset();
        
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('selected'));
        
        const exerciseGroup = document.getElementById('exercise-group');
        if (exerciseGroup) exerciseGroup.style.display = 'none';
        
        this.selectedCategory = null;
        this.updateXPPreview();
    }
    
    addWorkout(workout) {
        console.log('Adding workout:', workout);
        
        const previousLevel = this.data.currentLevel;
        
        // Add workout
        this.data.workouts.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ...workout
        });
        
        // Update XP and level
        this.data.totalXP += workout.xp;
        this.data.currentLevel = this.calculateLevel(this.data.totalXP);
        
        // Update streak
        this.updateStreak(workout.date);
        
        // Check for new badges
        const newBadges = this.checkNewBadges();
        
        // Save data
        this.saveData();
        
        // Update UI
        this.updateUI();
        
        console.log('Workout added. Stats:', {
            totalXP: this.data.totalXP,
            level: this.data.currentLevel,
            workouts: this.data.workouts.length,
            streak: this.data.streakData.current,
            newBadges: newBadges.length
        });
        
        // Show success modal
        this.showSuccessModal(workout.xp);
        
        // Show level up modal if leveled up
        if (this.data.currentLevel > previousLevel) {
            setTimeout(() => this.showLevelUpModal(this.data.currentLevel), 2000);
        }
        
        // Show badge modals
        if (newBadges.length > 0) {
            let delay = this.data.currentLevel > previousLevel ? 4000 : 2000;
            newBadges.forEach((badge, index) => {
                setTimeout(() => this.showBadgeModal(badge), delay + (index * 2500));
            });
        }
    }
    
    calculateLevel(totalXP) {
        for (let i = this.levelThresholds.length - 1; i >= 0; i--) {
            if (totalXP >= this.levelThresholds[i]) {
                return i + 1;
            }
        }
        return 1;
    }
    
    updateStreak(workoutDate) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        if (!this.data.streakData.lastWorkoutDate) {
            this.data.streakData.current = 1;
            this.data.streakData.longest = 1;
        } else if (workoutDate === today && this.data.streakData.lastWorkoutDate === yesterday) {
            this.data.streakData.current++;
        } else if (workoutDate === today && this.data.streakData.lastWorkoutDate !== today) {
            const daysDiff = Math.floor((new Date(today) - new Date(this.data.streakData.lastWorkoutDate)) / (1000 * 60 * 60 * 24));
            if (daysDiff > 1) {
                this.data.streakData.current = 1;
            }
        }
        
        this.data.streakData.lastWorkoutDate = workoutDate;
        
        if (this.data.streakData.current > this.data.streakData.longest) {
            this.data.streakData.longest = this.data.streakData.current;
        }
    }
    
    checkNewBadges() {
        const newBadges = [];
        const earnedBadgeIds = this.data.badges.map(b => b.id);
        
        this.badgeDefinitions.forEach(badge => {
            if (earnedBadgeIds.includes(badge.id)) return;
            
            let earned = false;
            
            if (badge.type === 'workout-count') {
                earned = this.data.workouts.length >= badge.requirement;
            } else if (badge.type === 'streak') {
                earned = this.data.streakData.current >= badge.requirement;
            }
            
            if (earned) {
                const earnedBadge = { ...badge, dateEarned: new Date().toISOString() };
                this.data.badges.push(earnedBadge);
                newBadges.push(earnedBadge);
            }
        });
        
        return newBadges;
    }
    
    updateUI() {
        // Update header
        this.updateElement('current-level', this.data.currentLevel);
        this.updateXPBar();
        
        // Update dashboard stats
        this.updateElement('current-streak', this.data.streakData.current);
        this.updateElement('total-xp', this.data.totalXP.toLocaleString());
        this.updateElement('total-workouts', this.data.workouts.length);
        this.updateElement('badges-earned', this.data.badges.length);
        
        // Update other UI elements
        this.updateRecentBadges();
        this.updateProgressView();
        this.updateWorkoutHistory();
    }
    
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }
    
    updateXPBar() {
        const currentLevel = this.data.currentLevel;
        const currentLevelXP = this.levelThresholds[currentLevel - 1] || 0;
        const nextLevelXP = this.levelThresholds[currentLevel] || this.levelThresholds[this.levelThresholds.length - 1];
        
        if (currentLevel >= this.levelThresholds.length) {
            const xpBar = document.getElementById('xp-bar');
            const xpText = document.getElementById('xp-text');
            if (xpBar) xpBar.style.width = '100%';
            if (xpText) xpText.textContent = 'MAX LEVEL';
            return;
        }
        
        const xpInCurrentLevel = this.data.totalXP - currentLevelXP;
        const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
        const progress = Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100);
        
        const xpBar = document.getElementById('xp-bar');
        const xpText = document.getElementById('xp-text');
        
        if (xpBar) xpBar.style.width = `${progress}%`;
        if (xpText) xpText.textContent = `${xpInCurrentLevel}/${xpNeededForNextLevel} XP`;
    }
    
    updateRecentBadges() {
        const container = document.getElementById('recent-badges');
        if (!container) return;
        
        const recentBadges = this.data.badges.slice(-3);
        
        if (recentBadges.length === 0) {
            container.innerHTML = '<p class="no-badges">Complete your first workout to earn badges!</p>';
        } else {
            container.innerHTML = recentBadges.map(badge => `
                <div class="preview-badge">
                    <span class="preview-badge-icon">${badge.icon}</span>
                    <span class="preview-badge-name">${badge.name}</span>
                </div>
            `).join('');
        }
    }
    
    updateProgressView() {
        this.updateElement('level-display', this.data.currentLevel);
        
        const currentLevel = this.data.currentLevel;
        const currentLevelXP = this.levelThresholds[currentLevel - 1] || 0;
        const nextLevelXP = this.levelThresholds[currentLevel] || this.levelThresholds[this.levelThresholds.length - 1];
        
        if (currentLevel >= this.levelThresholds.length) {
            const levelProgress = document.getElementById('level-progress');
            const levelText = document.getElementById('level-text');
            if (levelProgress) levelProgress.style.width = '100%';
            if (levelText) levelText.textContent = 'Max level reached!';
            return;
        }
        
        const xpInCurrentLevel = this.data.totalXP - currentLevelXP;
        const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
        const progress = Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100);
        
        const levelProgress = document.getElementById('level-progress');
        const levelText = document.getElementById('level-text');
        
        if (levelProgress) levelProgress.style.width = `${progress}%`;
        if (levelText) levelText.textContent = `${xpInCurrentLevel} / ${xpNeededForNextLevel} XP to next level`;
    }
    
    updateWorkoutHistory() {
        const container = document.getElementById('workout-history');
        if (!container) return;
        
        const recentWorkouts = this.data.workouts.slice(-10).reverse();
        
        if (recentWorkouts.length === 0) {
            container.innerHTML = '<p class="no-workouts">No workouts logged yet.</p>';
        } else {
            container.innerHTML = recentWorkouts.map(workout => `
                <div class="workout-item">
                    <div class="workout-header">
                        <h5 class="workout-title">${workout.exercise}</h5>
                        <span class="workout-date">${new Date(workout.date).toLocaleDateString()}</span>
                    </div>
                    <div class="workout-details">
                        <span>${workout.duration} min</span>
                        <span>${workout.category}</span>
                        <span>+${workout.xp} XP</span>
                    </div>
                </div>
            `).join('');
        }
    }
    
    loadProgressCharts() {
        setTimeout(() => {
            this.createWorkoutChart();
            this.createCategoryChart();
        }, 300);
    }
    
    createWorkoutChart() {
        const ctx = document.getElementById('workout-chart');
        if (!ctx) return;
        
        if (this.charts.workout) {
            this.charts.workout.destroy();
        }
        
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayWorkouts = this.data.workouts.filter(w => w.date === dateStr);
            
            last7Days.push({
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                count: dayWorkouts.length
            });
        }
        
        this.charts.workout = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: last7Days.map(d => d.label),
                datasets: [{
                    label: 'Workouts',
                    data: last7Days.map(d => d.count),
                    backgroundColor: '#4db8ff',
                    borderColor: '#32b8c6',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        display: false 
                    } 
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { 
                            stepSize: 1,
                            color: '#87ceeb'
                        },
                        grid: {
                            color: 'rgba(135, 206, 235, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#87ceeb'
                        },
                        grid: {
                            color: 'rgba(135, 206, 235, 0.1)'
                        }
                    }
                }
            }
        });
    }
    
    createCategoryChart() {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;
        
        if (this.charts.category) {
            this.charts.category.destroy();
        }
        
        const categoryData = {};
        this.data.workouts.forEach(workout => {
            categoryData[workout.category] = (categoryData[workout.category] || 0) + 1;
        });
        
        const categories = Object.keys(categoryData);
        const counts = Object.values(categoryData);
        
        if (categories.length === 0) return;
        
        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: counts,
                    backgroundColor: ['#4db8ff', '#ff6b3d', '#d946ef', '#ffa500'],
                    borderColor: '#000000',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: {
                            color: '#87ceeb'
                        }
                    } 
                }
            }
        });
    }
    
    loadBadges() {
        const badgesGrid = document.getElementById('badges-grid');
        const badgesCount = document.getElementById('badges-count');
        const totalBadges = document.getElementById('total-badges');
        
        if (!badgesGrid) return;
        
        const earnedBadgeIds = this.data.badges.map(b => b.id);
        
        badgesGrid.innerHTML = this.badgeDefinitions.map(badge => {
            const earned = earnedBadgeIds.includes(badge.id);
            return `
                <div class="badge-card ${earned ? 'earned' : 'locked'}">
                    <span class="badge-card-icon">${badge.icon}</span>
                    <h4 class="badge-card-name">${badge.name}</h4>
                    <p class="badge-card-description">${badge.description}</p>
                </div>
            `;
        }).join('');
        
        if (badgesCount) badgesCount.textContent = this.data.badges.length;
        if (totalBadges) totalBadges.textContent = this.badgeDefinitions.length;
    }
    
    showModal(modal) {
        if (modal) modal.classList.remove('hidden');
    }
    
    hideModal(modal) {
        if (modal) modal.classList.add('hidden');
    }
    
    showSuccessModal(xp) {
        const modal = document.getElementById('success-modal');
        const earnedXP = document.getElementById('earned-xp');
        
        if (earnedXP) earnedXP.textContent = `${xp} XP`;
        this.showModal(modal);
    }
    
    showLevelUpModal(level) {
        const modal = document.getElementById('levelup-modal');
        const newLevel = document.getElementById('new-level');
        
        if (newLevel) newLevel.textContent = level;
        this.showModal(modal);
    }
    
    showBadgeModal(badge) {
        const modal = document.getElementById('badge-modal');
        const badgeIcon = document.getElementById('badge-icon');
        const badgeName = document.getElementById('badge-name');
        const badgeDescription = document.getElementById('badge-description');
        
        if (badgeIcon) badgeIcon.textContent = badge.icon;
        if (badgeName) badgeName.textContent = badge.name;
        if (badgeDescription) badgeDescription.textContent = badge.description;
        
        this.showModal(modal);
    }
}

// Initialize the application
console.log('Script loaded');

// Ensure initialization happens
function initApp() {
    console.log('Initializing app...');
    if (!window.fitnessTracker) {
        window.fitnessTracker = new FitnessTracker();
    }
}

// Multiple initialization attempts for reliability
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Fallback initialization
setTimeout(initApp, 1000);