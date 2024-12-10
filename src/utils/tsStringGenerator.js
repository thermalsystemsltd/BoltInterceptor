function encodeSerialNumberToHex(serialNumber) {
    return serialNumber
        .match(/../g)
        .reverse()
        .map((pair) => parseInt(pair, 16).toString(16).padStart(2, '0'))
        .join('');
}

function generateTSString(sensorSerials) {
    const hexSegments = sensorSerials.map(encodeSerialNumberToHex);
    const combinedHex = hexSegments.join('');
    const tsString = Buffer.from(combinedHex, 'hex').toString('base64');
    return tsString + '==';
}

module.exports = { generateTSString };