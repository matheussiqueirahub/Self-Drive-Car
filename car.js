class Car {
    constructor(x, y, width, height, controlType, maxSpeed = 3) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.speed = 0;
        this.acceleration = 0.2;
        this.maxSpeed = maxSpeed;
        this.friction = 0.05;
        this.angle = 0;
        this.damaged = false;
        this.fitness = 0;

        this.useBrain = controlType == "AI";

        if (controlType != "DUMMY") {
            this.sensor = new RaySensor(this);
            this.brain = new NeuralNetwork([this.sensor.rayCount, 6, 4]);
        }
        this.controls = new Controls(controlType);
    }

    update(road, traffic) {
        if (!this.damaged) {
            this.#move();
            this.polygon = this.#createPolygon();
            this.damaged = this.#assessDamage(road.borders, traffic);
        }
        if (this.sensor) {
            this.sensor.update(road.borders, traffic);
            const offsets = this.sensor.readings.map(s => s == null ? 0 : 1 - s.offset);
            const outputs = NeuralNetwork.feedForward(offsets, this.brain);

            if (this.useBrain) {
                this.controls.forward = outputs[0];
                this.controls.left = outputs[1];
                this.controls.right = outputs[2];
                this.controls.reverse = outputs[3];
            }
        }

        // Fitness function: Distance + Speed Reward - Lane deviation penalty
        const distance = -this.y;
        // Find closest lane center
        let minLaneDist = Infinity;
        if (road.laneCount) {
            for (let i = 0; i < road.laneCount; i++) {
                const laneCenter = road.getLaneCenter(i);
                const d = Math.abs(this.x - laneCenter);
                if (d < minLaneDist) minLaneDist = d;
            }
        } else {
            minLaneDist = 0;
        }

        this.fitness = distance;
        this.fitness -= minLaneDist * 0.5;

        if (this.damaged) this.fitness -= 1000;
    }

    #assessDamage(roadBorders, traffic) {
        for (let i = 0; i < roadBorders.length; i++) {
            if (polysIntersect(this.polygon, roadBorders[i])) return true;
        }
        for (let i = 0; i < traffic.length; i++) {
            if (polysIntersect(this.polygon, traffic[i].polygon)) return true;
        }
        return false;
    }

    #createPolygon() {
        //to find the four edges (corners) of the car
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);
        points.push({
            x: this.x - Math.sin(this.angle - alpha) * rad,
            y: this.y - Math.cos(this.angle - alpha) * rad
        })
        points.push({
            x: this.x - Math.sin(this.angle + alpha) * rad,
            y: this.y - Math.cos(this.angle + alpha) * rad
        })
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad
        })
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad
        })
        return points;
    }

    #move() {
        if (this.controls.forward) this.speed += this.acceleration;
        if (this.controls.reverse) this.speed -= this.acceleration;
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;
        if (this.speed > 0) this.speed -= this.friction;
        if (this.speed < 0) this.speed += this.friction;
        if (Math.abs(this.speed) < this.friction) this.speed = 0;
        if (this.speed != 0) {
            const flip = this.speed > 0 ? 1 : -1;
            if (this.controls.left) this.angle += 0.03 * flip;
            if (this.controls.right) this.angle -= 0.03 * flip;
        }
        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }

    draw(ctx, color, drawSensor = false) {
        if (this.sensor && drawSensor) {
            this.sensor.draw(ctx);
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-this.angle);

        if (!this.damaged) {
            // Body
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 5);
            ctx.fill();

            // Roof (darker)
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.rect(-this.width / 2 + 5, -this.height / 2 + 10, this.width - 10, this.height - 20);
            ctx.fill();

            // Windshield
            ctx.fillStyle = "rgba(100,200,255,0.6)";
            ctx.beginPath();
            ctx.moveTo(-this.width / 2 + 5, -this.height / 2 + 10);
            ctx.lineTo(this.width / 2 - 5, -this.height / 2 + 10);
            ctx.lineTo(this.width / 2 - 7, -this.height / 2 + 18);
            ctx.lineTo(-this.width / 2 + 7, -this.height / 2 + 18);
            ctx.fill();

            // Rear window
            ctx.beginPath();
            ctx.moveTo(-this.width / 2 + 5, this.height / 2 - 10);
            ctx.lineTo(this.width / 2 - 5, this.height / 2 - 10);
            ctx.lineTo(this.width / 2 - 7, this.height / 2 - 18);
            ctx.lineTo(-this.width / 2 + 7, this.height / 2 - 18);
            ctx.fill();

            // Headlights
            ctx.fillStyle = "yellow";
            ctx.beginPath();
            ctx.arc(-this.width / 2 + 8, -this.height / 2 + 2, 3, 0, Math.PI * 2);
            ctx.arc(this.width / 2 - 8, -this.height / 2 + 2, 3, 0, Math.PI * 2);
            ctx.fill();

            // Taillights
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.rect(-this.width / 2 + 5, this.height / 2 - 3, 8, 3);
            ctx.rect(this.width / 2 - 13, this.height / 2 - 3, 8, 3);
            ctx.fill();

            // Wheels (black rectangles)
            ctx.fillStyle = "black";
            // FL
            ctx.fillRect(-this.width / 2 - 2, -this.height / 2 + 8, 4, 10);
            // FR
            ctx.fillRect(this.width / 2 - 2, -this.height / 2 + 8, 4, 10);
            // RL
            ctx.fillRect(-this.width / 2 - 2, this.height / 2 - 18, 4, 10);
            // RR
            ctx.fillRect(this.width / 2 - 2, this.height / 2 - 18, 4, 10);

        } else {
            ctx.fillStyle = "gray";
            ctx.beginPath();
            ctx.moveTo(this.polygon[0].x, this.polygon[0].y); // Polygon is world space! We need to handle this.
            // Actually, if damaged, let's just draw the simple polygon shape in local space approx, or fallback to world space polygon drawing.
            // To keep it simple, if damaged, we restore context and draw the polygon as before.
            ctx.restore(); // Undo the translate/rotate

            ctx.fillStyle = "gray";
            ctx.beginPath();
            ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
            for (let i = 1; i < this.polygon.length; i++) {
                ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
            }
            ctx.fill();
            return; // Exit after drawing damaged car
        }

        ctx.restore();
    }
}