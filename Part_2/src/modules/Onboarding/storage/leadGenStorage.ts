export const LeadGenStorage = {
    async getLeadGenData() {
        return localStorage.getItem('currentActiveLeadGenTripId')
    },
    async setLeadGenData(data: any) {
        localStorage.setItem('currentActiveLeadGenTripId', JSON.stringify(data))
    },
    async removeLeadGenData() {
        localStorage.removeItem('currentActiveLeadGenTripId')
    }
}
