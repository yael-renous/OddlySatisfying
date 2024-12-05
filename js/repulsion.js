/*
Repulsion Sound System
*/
class RepulsionSound {
    static instance;
    
    // Singleton pattern to ensure only one synth exists
    static getInstance() {
        if (!RepulsionSound.instance) {
            RepulsionSound.instance = new RepulsionSound();
        }
        return RepulsionSound.instance;
    }

    constructor() {
        if (RepulsionSound.instance) {
            return RepulsionSound.instance;
        }

        // Create a MonoSynth for a gentle sound
        this.synth = new Tone.MonoSynth({
            oscillator: {
                type: "sine"
            },
            envelope: {
                attack: 0.01,
                decay: 0.3,
                sustain: 0.1,
                release: 0.5
            },
            filterEnvelope: {
                attack: 0.01,
                decay: 0.1,
                sustain: 0.5,
                release: 0.5,
                baseFrequency: 200,
                octaves: 2.5
            }
        }).toDestination();

        // Add reverb for space
        this.reverb = new Tone.Reverb({
            decay: 3,
            wet: 0.4
        }).toDestination();

        // Connect everything
        this.synth.connect(this.reverb);

        // Base notes for scaling
        this.baseNotes = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'];
        this.lastPlayTime = 0;
        this.minPlayInterval = 50;
    }

    playSound(force, distanceFromTarget) {
        const now = Tone.now();
        if (now - this.lastPlayTime < 0.05) return;

        // Map distance to note index (further = higher pitch)
        const noteIndex = Math.floor(map(distanceFromTarget, 0, 100, 0, this.baseNotes.length - 1));
        const note = this.baseNotes[constrain(noteIndex, 0, this.baseNotes.length - 1)];
        
        // Adjust volume based on force
        this.synth.volume.value = map(force, 0, 1, -30, -10);
        
        // Play the sound
        const duration = map(force, 0, 0.1, 0.1, 0.4) + "n";
        this.synth.triggerAttackRelease(note, duration);
        
        this.lastPlayTime = now;
    }
}

class RepulsionParticle {
    constructor(x, y, targetX, targetY, maxForce, s, b) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.target = createVector(targetX, targetY);
        this.maxForce = maxForce * random(0.8, 1.2);
        this.sat = s;
        this.bright = b;
        this.sound = RepulsionSound.getInstance();
    }
    
    move(mouseX, mouseY, repulsionRadius) {
        let distThreshold = 20;
        
        // Move towards target
        let steer = p5.Vector.sub(this.target, this.pos);
        let distance = steer.mag();
        if (distance > 0.5) {
            steer.normalize();
            steer.mult(map(min(distance, distThreshold), 0, distThreshold, 0, this.maxForce*1.02));
            this.acc.add(steer);
        }
        
        // Repel from mouse
        let mouseDistance = dist(this.pos.x, this.pos.y, mouseX, mouseY);
        if (mouseDistance < repulsionRadius) {
            let repulse = p5.Vector.sub(this.pos, createVector(mouseX, mouseY));
            let force = map(mouseDistance, repulsionRadius, 0, 0, 1);
            repulse.mult(force);
            this.acc.add(repulse);
            
            // Only try to play sound if force is significant
            if (force > 0.01) {
                // Pass both force and distance from target
                let distanceFromTarget = dist(this.pos.x, this.pos.y, this.target.x, this.target.y);
                this.sound.playSound(force, distanceFromTarget);
            }
        }
        
        // Update physics
        this.vel.mult(0.95);
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0);
    }
    
    display() {
        strokeWeight(1);
        stroke(random(0, 255), this.sat, this.bright, 100);
        line(this.target.x, this.target.y, this.pos.x, this.pos.y);
        
        strokeWeight(8);
        stroke(140, this.sat, this.bright);
        point(this.pos.x, this.pos.y);
    }
}

class Repulsion {
    constructor(width, height) {
        this.count = 700;
        this.spacing = 9;
        this.repulsionRadius = 80;
        this.particles = [];
        this.width = width;
        this.height = height;
        
        // Add properties to store remote mouse position
        this.remoteMouseX = width / 2;
        this.remoteMouseY = height / 2;
        
        this.initParticles();
    }

    initParticles() {
        for (let i = 0; i < this.count; i++) {
            let { x, y, s, b } = this.calculateParticleAttributes(i);
            this.particles.push(new RepulsionParticle(
                random(this.width), -200, 
                x, y, 
                0.5,
                s, b));
        }
    }

    calculateParticleAttributes(index) {
        let angle = index * 137.5;
        let r = this.spacing * sqrt(index);
        let x = r * cos(radians(angle)) + this.width / 2;
        let y = r * sin(radians(angle)) + this.height / 2;
        let distToCenter = dist(x, y, this.width / 2, this.height / 2);
        let s = 255 - distToCenter * 1;
        let b = 150 + distToCenter * 0.8;
        return { x, y, s, b };
    }

    // Add method to update remote mouse position
    updateRemotePosition(x, y) {
        this.remoteMouseX = x;
        this.remoteMouseY = y;
    }

    draw() {
        //  use remote mouse position instead of mouseX/mouseY
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].move(this.remoteMouseX, this.remoteMouseY, this.repulsionRadius);
            this.particles[i].display();
        }
        
        // Make repulsion radius indicator more visible on dark background
        stroke(140, 255, 255, 50);
        strokeWeight(this.repulsionRadius * 2);
        point(this.remoteMouseX, this.remoteMouseY);
    }

    resize(newWidth, newHeight) {
        this.width = newWidth;
        this.height = newHeight;
        
        // Recalculate particle target positions
        for (let i = 0; i < this.particles.length; i++) {
            let { x, y, s, b } = this.calculateParticleAttributes(i);
            
            // Update target position
            this.particles[i].target.x = x;
            this.particles[i].target.y = y;
            
            // Update colors based on new distance
            this.particles[i].sat = s;
            this.particles[i].bright = b;
        }
    }

    setRepulsionRadius(radius) {
        this.repulsionRadius = radius;
    }
}