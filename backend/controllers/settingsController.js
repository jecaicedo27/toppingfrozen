const { pool, query } = require('../config/database');
const { encrypt } = require('../utils/encryption');

const saveBancolombiaCredentials = async (req, res) => {
    try {
        const { nit, username, password, proxy } = req.body;

        if (!nit || !username || !password) {
            return res.status(400).json({ message: 'Todos los campos (NIT, Usuario, Contraseña) son obligatorios.' });
        }

        const { iv, encryptedData } = encrypt(password);

        // Upsert logic: If exists for 'bancolombia', update it. Else insert.
        // We use ON DUPLICATE KEY UPDATE.
        const sql = `
            INSERT INTO bank_credentials (bank_name, nit, username, password, iv, proxy)
            VALUES ('bancolombia', ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            nit = VALUES(nit),
            username = VALUES(username),
            password = VALUES(password),
            iv = VALUES(iv),
            proxy = VALUES(proxy)
        `;

        await query(sql, [nit, username, encryptedData, iv, proxy || null]);

        res.json({ message: 'Credenciales de Bancolombia guardadas exitosamente.' });
    } catch (error) {
        console.error('Error saving credentials:', error);
        res.status(500).json({ message: 'Error al guardar las credenciales.' });
    }
};

const getBancolombiaCredentialsStatus = async (req, res) => {
    try {
        const sql = `SELECT nit, username, updated_at FROM bank_credentials WHERE bank_name = 'bancolombia'`;
        const rows = await query(sql);

        if (rows.length > 0) {
            const creds = rows[0];
            res.json({
                message: 'Credenciales configuradas.',
                configured: true,
                nit: creds.nit,
                username: creds.username, // Maybe mask this too? Or just show plain
                proxy: creds.proxy, // Return proxy to show in UI
                updated_at: creds.updated_at
            });
        } else {
            res.json({
                message: 'No hay credenciales configuradas.',
                configured: false
            });
        }
    } catch (error) {
        console.error('Error fetching credentials status:', error);
        res.status(500).json({ message: 'Error al consultar estado de credenciales.' });
    }
};

module.exports = {
    saveBancolombiaCredentials,
    getBancolombiaCredentialsStatus
};
