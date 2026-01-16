const axios = require('axios');
const util = require('util');

async function testDashboardStats() {
    try {
        // Authenticate first to get token (if needed, but local might be tricky without token)
        // Actually, backend might require auth. I'll check if I can run a controller function directly or mock req/res.
        // It's easier to run a script that imports 'query' and runs the exact SQL I think is running.

        const { query } = require('./config/database');

        console.log('--- TESTING DATE FILTERS ---');

        const date = new Date('2026-01-14T12:00:00.000Z');
        let startDate, endDate;

        // Simulate 'today'
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        console.log('Today Range:', startDate, endDate);

        const resToday = await query(
            `SELECT COUNT(*) as count FROM orders WHERE 1=1 AND created_at BETWEEN ? AND ?`,
            [startDate, endDate]
        );
        console.log('Count "Today":', resToday[0].count);


        // Simulate 'month'
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

        console.log('Month Range:', startDate, endDate);

        const resMonth = await query(
            `SELECT COUNT(*) as count FROM orders WHERE 1=1 AND created_at BETWEEN ? AND ?`,
            [startDate, endDate]
        );
        console.log('Count "Month":', resMonth[0].count);

        process.exit(0);

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

testDashboardStats();
