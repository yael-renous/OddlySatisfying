/*
Repulsion

jasonlabbe3d.com
twitter.com/russetPotato
*/

class Repulsion {
    constructor(width, height) {
        // Configuration
        this.count = 500;
        this.spacing = 6;
        this.repulsionRadius = 100;
        this.particles = [];
        this.width = width;
        this.height = height;
        
        this.initParticles();
    }

    initParticles() {
        for (let i = 0; i < this.count; i++) {
            let angle = i * 137.5;
            let r = this.spacing * sqrt(i);
            let x = r * cos(radians(angle)) + this.width / 2;
            let y = r * sin(radians(angle)) + this.height / 2;
            let distToCenter = dist(x, y, this.width / 2, this.height / 2);
            let s = 255 - distToCenter * 1.25;
            let b = 150 + distToCenter * 1;
            
            this.particles.push(new RepulsionParticle(
                random(this.width), -200, 
                x, y, 
                0.5,
                s, b));
        }
    }

    draw() {
        // Draw particles
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].move(mouseX, mouseY, this.repulsionRadius);
            this.particles[i].display();
        }
        
        // Draw repulsion radius indicator
        stroke(0, 50);
        strokeWeight(this.repulsionRadius * 2);
        point(mouseX, mouseY);
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
    }
    
    move(mouseX, mouseY, repulsionRadius) {
        let distThreshold = 20;
        
        // Move towards target
        let steer = p5.Vector.sub(this.target, this.pos);
        let distance = steer.mag();
        if (distance > 0.5) {
            steer.normalize();
            steer.mult(map(min(distance, distThreshold), 0, distThreshold, 0, this.maxForce));
            this.acc.add(steer);
        }
        
        // Repel from mouse
        let mouseDistance = dist(this.pos.x, this.pos.y, mouseX, mouseY);
        if (mouseDistance < repulsionRadius) {
            let repulse = p5.Vector.sub(this.pos, createVector(mouseX, mouseY));
            repulse.mult(map(mouseDistance, repulsionRadius, 0, 0, 0.5));
            this.acc.add(repulse);
        }
        
        // Update physics
        this.vel.mult(0.95);
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0);
    }
    
    display() {
        strokeWeight(1);
        stroke(0, 100);
        line(this.target.x, this.target.y, this.pos.x, this.pos.y);
        
        strokeWeight(6);
        stroke(140, this.sat, this.bright);
        point(this.pos.x, this.pos.y);
    }
}