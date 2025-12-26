const carCanvas = document.getElementById("carCanvas");
carCanvas.width = 200;
const networkCanvas = document.getElementById("networkCanvas");
networkCanvas.width = 300;

const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");
const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);

const N = 100;
const cars = generateCars(N);
let bestCar = cars[0];
if (localStorage.getItem("bestBrain")) {
    for (let i = 0; i < cars.length; i++) {
        cars[i].brain = JSON.parse(localStorage.getItem("bestBrain"));
        if (i != 0) NeuralNetwork.mutate(cars[i].brain, 0.1);
    }
}

const traffic = [];
const trafficCount = 50;

for (let i = 0; i < trafficCount; i++) {
    const gap = 400 + Math.random() * 400;
    const y = -i * 600 - 100 - Math.random() * 400;
    const lane = Math.floor(Math.random() * 3);
    const speed = 1.5 + Math.random();

    traffic.push(new Car(road.getLaneCenter(lane), y, 30, 50, "DUMMY", speed));

    if (Math.random() < 0.3) {
        const lane2 = (lane + 1 + Math.floor(Math.random())) % 3;
        traffic.push(new Car(road.getLaneCenter(lane2), y, 30, 50, "DUMMY", speed));
    }
}

animate();

function save() {
    localStorage.setItem("bestBrain", JSON.stringify(bestCar.brain));
}

function discard() {
    localStorage.removeItem("bestBrain");
}

function generateCars(N) {
    const cars = [];
    for (let i = 1; i <= N; i++)
        cars.push(new Car(road.getLaneCenter(1), 100, 30, 50, "AI"));
    return cars;
}

let generation = 1;

function resetGeneration() {
    generation++;
    document.getElementById('generation').textContent = generation;

    // Reset all cars
    for (let i = 0; i < cars.length; i++) {
        cars[i] = new Car(road.getLaneCenter(1), 100, 30, 50, "AI");
        if (localStorage.getItem("bestBrain")) {
            cars[i].brain = JSON.parse(localStorage.getItem("bestBrain"));
            if (i != 0) NeuralNetwork.mutate(cars[i].brain, 0.1);
        }
    }
    bestCar = cars[0];
}

function animate() {
    for (let i = 0; i < traffic.length; i++)
        traffic[i].update(road, []);

    cars.forEach(car => car.update(road, traffic));

    // Best car based on fitness
    bestCar = cars.find(car => car.fitness == Math.max(...cars.map(c => c.fitness)));
    if (!bestCar) bestCar = cars[0];

    carCanvas.height = window.innerHeight;
    networkCanvas.height = window.innerHeight;

    carCtx.save();
    carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7);

    road.draw(carCtx);
    for (let i = 0; i < traffic.length; i++) {
        traffic[i].draw(carCtx, "red");
    }

    carCtx.globalAlpha = 0.2;
    cars.forEach(car => car.draw(carCtx, "blue"));

    carCtx.globalAlpha = 1;
    // Draw best car solid and detailed
    bestCar.draw(carCtx, "blue", true);

    carCtx.restore();

    Visualizer.drawNetwork(networkCtx, bestCar.brain);

    // Update UI statistics
    const aliveCars = cars.filter(c => !c.damaged).length;
    const bestDist = Math.round(-bestCar.y);

    document.getElementById('aliveCars').textContent = aliveCars;
    document.getElementById('bestDistance').textContent = bestDist;

    requestAnimationFrame(animate);
}
