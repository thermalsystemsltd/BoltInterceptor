const { fetchCompaniesAndSerials } = require('../../getSensors');
const EventEmitter = require('events');

class SensorDataService extends EventEmitter {
    constructor(refreshInterval = 300000) { // 5 minutes default
        super();
        this.companyData = [];
        this.refreshInterval = refreshInterval;
        this.timer = null;
    }

    async initialize() {
        await this.refreshData();
        this.startPeriodicRefresh();
    }

    async refreshData() {
        try {
            const newData = await fetchCompaniesAndSerials();
            if (newData && newData.length > 0) {
                this.companyData = newData;
                this.emit('dataUpdated', this.companyData);
                console.log('Sensor data refreshed successfully');
            }
        } catch (error) {
            console.error('Error refreshing sensor data:', error);
            this.emit('error', error);
        }
    }

    startPeriodicRefresh() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.timer = setInterval(() => this.refreshData(), this.refreshInterval);
    }

    stopPeriodicRefresh() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    getCurrentData() {
        return this.companyData;
    }
}

module.exports = new SensorDataService();