const net = require('net');
const { handleRequest } = require('../handlers/requestHandler');

class TCPServer {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.BUFFER_TIMEOUT = 5000; // 5 seconds timeout for incomplete messages
    }

    start() {
        const server = net.createServer((socket) => {
            console.log(`Connected: ${socket.remoteAddress}:${socket.remotePort}`);
            
            let buffer = '';
            let bufferTimer = null;

            const clearBufferTimeout = () => {
                if (bufferTimer) {
                    clearTimeout(bufferTimer);
                    bufferTimer = null;
                }
            };

            const resetBuffer = () => {
                clearBufferTimeout();
                buffer = '';
            };

            const startBufferTimeout = () => {
                clearBufferTimeout();
                bufferTimer = setTimeout(() => {
                    console.log('Buffer timeout reached, clearing incomplete data');
                    resetBuffer();
                }, this.BUFFER_TIMEOUT);
            };

            socket.on('data', (data) => {
                buffer += data.toString();
                startBufferTimeout();

                try {
                    // Try to parse multiple complete JSON messages
                    let startIdx = 0;
                    let endIdx = 0;
                    
                    while ((endIdx = this.findJsonEnd(buffer, startIdx)) !== -1) {
                        const jsonStr = buffer.slice(startIdx, endIdx + 1);
                        const parsedMessage = JSON.parse(jsonStr);

                        if (parsedMessage.cd === 'sl') {
                            console.log('SL command received but suppressed from output.');
                        } else {
                            console.log(`Handling request: ${JSON.stringify(parsedMessage, null, 2)}`);
                            handleRequest(parsedMessage, socket);
                        }

                        startIdx = endIdx + 1;
                    }

                    // Keep any remaining incomplete data in the buffer
                    if (startIdx > 0) {
                        buffer = buffer.slice(startIdx);
                    }

                    // If buffer is empty, clear the timeout
                    if (buffer.length === 0) {
                        clearBufferTimeout();
                    }
                } catch (error) {
                    if (!(error instanceof SyntaxError)) {
                        console.error('Error processing message:', error.message);
                        socket.write(JSON.stringify({ error: 'Invalid message format' }));
                        resetBuffer();
                    }
                }
            });

            socket.on('close', () => {
                clearBufferTimeout();
                console.log(`Closed connection with: ${socket.remoteAddress}:${socket.remotePort}`);
            });

            socket.on('error', (err) => {
                clearBufferTimeout();
                console.error(`Socket error: ${err.message}`);
            });
        });

        server.listen(this.port, this.host, () => {
            console.log(`Server running at ${this.host}:${this.port}`);
        });
    }

    findJsonEnd(str, startIndex) {
        let bracketCount = 0;
        let inString = false;
        let escaped = false;

        for (let i = startIndex; i < str.length; i++) {
            const char = str[i];

            if (inString) {
                if (char === '\\' && !escaped) {
                    escaped = true;
                } else if (char === '"' && !escaped) {
                    inString = false;
                } else {
                    escaped = false;
                }
                continue;
            }

            if (char === '"') {
                inString = true;
            } else if (char === '{') {
                bracketCount++;
            } else if (char === '}') {
                bracketCount--;
                if (bracketCount === 0) {
                    return i;
                }
            }
        }

        return -1;
    }
}

module.exports = TCPServer;