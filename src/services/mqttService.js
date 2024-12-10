const mqtt = require('mqtt');

class MQTTService {
    constructor(brokerUrl = 'mqtt://81.133.236.250') {
        this.client = mqtt.connect(brokerUrl);
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('connect', () => {
            console.log('Connected to MQTT broker');
        });

        this.client.on('error', (error) => {
            console.error('MQTT error:', error);
        });
    }

    publishData(topic, payload) {
        this.client.publish(topic, JSON.stringify(payload));
        console.log(`Published to ${topic}:`, JSON.stringify(payload));
    }
}

module.exports = new MQTTService();