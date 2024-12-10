const TCPServer = require('./src/services/tcpServer');
const sensorDataService = require('./src/services/sensorDataService');

const HOST = '0.0.0.0';
const PORT_RANGE_START = 11102;
const PORT_RANGE_END = 11105;

function startServers() {
    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
        const server = new TCPServer(HOST, port);
        server.start();
    }
    console.log("Servers successfully started on ports", PORT_RANGE_START, "to", PORT_RANGE_END);
}

// Initialize sensor data service and start servers
sensorDataService.initialize()
    .then(() => {
        startServers();
        console.log('Sensor data service initialized and servers started');
    })
    .catch((error) => {
        console.error('Failed to initialize:', error);
        process.exit(1);
    });

// Handle data updates
sensorDataService.on('dataUpdated', () => {
    console.log('Sensor data updated:', new Date().toISOString());
});