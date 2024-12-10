const crc32 = require('crc-32');
const sensorDataService = require('../services/sensorDataService');
const mqttService = require('../services/mqttService');
const { generateTSString } = require('../utils/tsStringGenerator');

function parseAndPublishData(companyName, baseSerial, sensorData) {
    sensorData.forEach(sensor => {
        const temperature = sensor.cs.find(channel => channel.c === 0 && channel.t === 1)?.d;
        const formattedTemperature = temperature ? (parseInt(temperature, 16) / 10).toFixed(2) : "N/A";
        const trimmedSerialNumber = sensor.sn.replace(/^0+/, '');
        const formattedTimestamp = sensor.dt.replace(/T/, ' ').replace(/Z/, '').replace(/-/g, '/');

        const payload = {
            temperature: formattedTemperature,
            serialNumber: trimmedSerialNumber,
            timestamp: formattedTimestamp,
            firmwareVersion: "1.0.0",
            Voltage: (sensor.bt / 100).toFixed(2)
        };

        const topic = `thermalsystems/111213/${trimmedSerialNumber}`;
        mqttService.publishData(topic, payload);
    });
}

async function handleRequest(message, socket) {
    let response = {};

    if (message.cd === 'dt') {
        response = {
            utc: new Date().toISOString()
        };
        console.log('Sending response:', response);
        socket.write(JSON.stringify(response));
        return;
    }

    if (message.cd && message.bs) {
        const baseSerial = message.bs;
        console.log(`Received base serial number: ${baseSerial}`);

        const currentData = sensorDataService.getCurrentData();
        const companyMatch = currentData.find(company => 
            company.baseUnits.includes(baseSerial)
        );

        if (companyMatch) {
            console.log(`Match found for base serial number ${baseSerial} in company: ${companyMatch.company}`);
            console.log(`Associated sensors: ${companyMatch.sensors.join(', ')}`);
            
            const tsString = generateTSString(companyMatch.sensors);

            switch (message.cd) {
                case 'or':
                case 'gs':
                    response = {
                        r: 'ack',
                        ts: tsString
                    };
                    break;
                case 'dt':
                    response = {
                        utc: new Date().toISOString()
                    };
                    break;
                case 'pv':
                case 'pu':
                    const messageString = JSON.stringify(message);
                    const crcValue = crc32.str(messageString);
                    response = {
                        r: 'ack',
                        ts: Buffer.from(crcValue.toString()).toString('base64')
                    };
                    break;
                case 'id':
                    if (message.id && message.id.m) {
                        parseAndPublishData(companyMatch.company, baseSerial, message.id.m);
                    }
                    response = {
                        r: 'ack',
                        ts: tsString
                    };
                    break;
                default:
                    response = { error: 'Unknown message type' };
            }

            console.log('Sending response:', response);
            socket.write(JSON.stringify(response));
        } else {
            console.log(`No matching company found for base unit: ${baseSerial}`);
            response = { error: 'No matching sensors found' };
            socket.write(JSON.stringify(response));
        }
    } else {
        console.error('Invalid message format or missing base serial number.');
        response = { error: 'Invalid message format or missing base serial number' };
        socket.write(JSON.stringify(response));
    }
}

module.exports = { handleRequest };