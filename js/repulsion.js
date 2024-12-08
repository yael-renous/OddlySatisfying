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
        this.baseNotes = [
            'C3', 'D3', 'E3', 'G3', 'A3',
            'C4', 'D4', 'E4', 'G4', 'A4',
            'C5', 'D5', 'E5', 'G5', 'A5',
            'C6', 'D6', 'E6', 'G6', 'A6'
        ];
                this.lastPlayTime = 0;
        this.minPlayInterval = 50;
    }

    playSound(force, distanceFromTarget) {
        const now = Tone.now();
        if (now - this.lastPlayTime < 0.05) return;
    
        // Map distance to note index (further = higher pitch)
        const baseNoteIndex = Math.floor(map(distanceFromTarget, 0, 300, 0, this.baseNotes.length - 1));
        
        // Add controlled randomness: randomly shift up or down by 0-2 notes
        const randomShift = Math.floor(random(-2, 3)); // -2 to +2
        const noteIndex = constrain(baseNoteIndex + randomShift, 0, this.baseNotes.length - 1);
        
        // Occasionally skip to a higher octave (20% chance)
        const octaveJump = random() < 0.2 ? 5 : 0;
        const finalIndex = constrain(noteIndex + octaveJump, 0, this.baseNotes.length - 1);
        
        const note = this.baseNotes[finalIndex];
        
        // Adjust volume based on force with some randomness
        const baseVolume = map(force, 0, 1, -30, -10);
        this.synth.volume.value = baseVolume + random(-3, 3);
        
        // Add slight random variation to duration
        const baseDuration = map(force, 0, 0.1, 0.1, 0.4);
        const duration = (baseDuration * random(0.8, 1.2)) + "n";
        
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
            steer.mult(map(min(distance, distThreshold), 0, distThreshold, 0, this.maxForce*1.2));
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
            if (force > 0.05) {
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
    
    display(repulsionGraphics) {
        // Calculate gradient based on Y position
        let gradientPos = map(this.pos.y, height/9, height/1.2, 0, 1);
        
        // Interpolate between pink (255, 150, 180) and orange (255, 120, 50)
        let r = 255;  // Red stays at max
        let g = map(gradientPos, 0, 1, 150, 120);
        let b = map(gradientPos, 0, 1, 180, 50);
        
        // Connecting line
        repulsionGraphics.strokeWeight(3);
        repulsionGraphics.stroke(r+10, g+10, b+10, 40);  // Semi-transparent line
        repulsionGraphics.line(this.target.x, this.target.y, this.pos.x, this.pos.y);
        
        // Main bubble surface
        repulsionGraphics.strokeWeight(22);
        repulsionGraphics.stroke(r, g, b, 90);
        repulsionGraphics.point(this.pos.x, this.pos.y);
    }
}

class Repulsion {
    constructor(width, height) {
        this.count = 700;
        this.spacing = 12;
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
                x, y, 
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
        let s = 295 - distToCenter * 0.92;
        let b = 80 + distToCenter * 0.8;
        return { x, y, s, b };
    }

    // Add method to update remote mouse position
    updateRemotePosition(x, y) {
        this.remoteMouseX = x;
        this.remoteMouseY = y;
    }

    draw(repulsionGraphics) {
        //  use remote mouse position instead of mouseX/mouseY
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].move(this.remoteMouseX, this.remoteMouseY, this.repulsionRadius);
            this.particles[i].display(repulsionGraphics);
        }
        
        repulsionGraphics.stroke(20,0,0, 20);
        repulsionGraphics.strokeWeight(this.repulsionRadius * 2);
        repulsionGraphics.point(this.remoteMouseX, this.remoteMouseY);
    }


    setRepulsionRadius(radius) {
        this.repulsionRadius = radius;
    }

    resetRadius() {
        this.repulsionRadius = 80;
    }
}




