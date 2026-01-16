const { query: dbQuery } = require('../config/database');

const createTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS bank_credentials (
            id INT AUTO_INCREMENT PRIMARY KEY,
            bank_name VARCHAR(50) NOT NULL UNIQUE,
            nit VARCHAR(50) NOT NULL,
            username VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            iv VARCHAR(255), 
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
        const results = await dbQuery(query);

        console.log('Table "bank_credentials" created or already exists.');
        console.log(results);
        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
};

createTable();
