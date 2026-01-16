const { chromium } = require('playwright');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data'); // For file upload

// CONFIGURATION
const API_URL = 'https://apptoppingfrozen.com'; // Adjust if using localhost or specific domain
const POLL_INTERVAL = 5000; // 5 seconds
let isRunning = false;

console.log('🤖 ToppingFrozen Bancolombia Agent v1.0');
console.log(`🌐 Conectando a: ${API_URL}`);
console.log('⏳ Esperando trabajos... (Presiona Ctrl+C para salir)');

setInterval(async () => {
    if (isRunning) return;
    await checkJob();
}, POLL_INTERVAL);

async function checkJob() {
    try {
        const response = await axios.post(`${API_URL}/api/wallet/sync-bancolombia/poll-job`);
        if (response.data.job) {
            console.log('🚀 ¡Nuevo trabajo detectado! Iniciando robot...');
            isRunning = true;
            await executeRobot(response.data.data);
            isRunning = false;
        } else {
            process.stdout.write('.'); // Heartbeat
        }
    } catch (error) {
        console.error('\n❌ Error conectando con el servidor:', error.message);
    }
}

async function executeRobot(creds) {
    const { nit, username, password, url } = creds;
    const downloadDir = path.resolve(__dirname, 'downloads');
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

    console.log(`🔑 Credenciales recibidas para NIT: ${nit}`);

    let browser = null;
    let success = false;
    let finalFilePath = null;

    try {
        browser = await chromium.launch({
            headless: false, // VISUAL MODE
            slowMo: 100,     // Slow down for visibility
            channel: 'chrome', // Try to use installed Chrome
            args: [
                '--start-maximized',
                '--disable-web-security',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const context = await browser.newContext({
            viewport: null, // Use window size
            acceptDownloads: true,
            locale: 'es-CO',
            timezoneId: 'America/Bogota'
        });

        const page = await context.newPage();

        // -------------------------------------------------------------
        // ROBOT LOGIC (Adapted from Server Script)
        // -------------------------------------------------------------

        console.log('🌐 Navegando a Sucursal Virtual...');
        await page.goto(url || 'https://svnegocios.apps.bancolombia.com/ingreso/empresa');

        // --- LOGIN FLOW ---
        // (Simplified logic based on verified selectors)

        // Step 1: NIT
        console.log('👤 Ingresando NIT...');
        // Try direct input or dropdown strategy
        const nitInput = page.locator('#bc-mf_authentication-bc_login_company-bc_input-password').first();
        if (await nitInput.isVisible()) {
            await nitInput.fill(nit);
            await page.keyboard.press('Tab'); // Trigger validation
            await page.waitForTimeout(500);
            await page.locator('#bc-mf_authentication-bc_login_company-bc_button_primary-continue').click();
        } else {
            // Fallback strategy: Tab from generic
            await page.keyboard.press('Tab');
            await page.keyboard.type(nit);
            await page.keyboard.press('Enter');
        }

        await page.waitForTimeout(3000);

        // Step 2: User/Pass
        console.log('🔐 Ingresando Accesos...');
        await page.getByLabel('Usuario de Negocios').or(page.locator('input[formcontrolname="username"]')).first().fill(username);

        // Password
        const passInput = page.locator('input[type="password"]').first();
        await passInput.fill(password);

        await page.waitForTimeout(500);
        await page.getByRole('button', { name: 'Ingresar' }).click();

        console.log('⏳ Esperando Dashboard...');
        await page.waitForTimeout(5000); // Wait for login

        // Check for error
        if (await page.getByText('Algo ocurrió').isVisible()) {
            throw new Error('Bloqueo detectado (WAF) o credenciales incorrectas.');
        }

        // --- NAVIGATION ---
        console.log('📂 Navegando a Movimientos...');
        await page.getByText('Movimientos', { exact: true }).first().click();
        await page.waitForTimeout(3000);

        // --- DOWNLOAD ---
        console.log('⬇️ Configurando Descarga...');
        const downloadBtn = page.getByRole('button', { name: 'Movimientos' }).last();
        if (await downloadBtn.isVisible()) await downloadBtn.click();

        await page.waitForTimeout(1000);

        // Select options (Generic clicks based on text)
        await page.click('text=Tipo de descarga');
        await page.click('text=Historial');
        await page.click('text=Últimos 7 días'); // Adjust text if needed
        await page.click('text=Tipo de transacción');
        await page.click('text=Todas');
        await page.click('text=Formato de archivo');
        await page.click('text=CSV');

        console.log('⬇️ Descargando...');
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Descargar' }).click();

        const download = await downloadPromise;
        const filename = `bancolombia_result.csv`;
        finalFilePath = path.join(downloadDir, filename);
        await download.saveAs(finalFilePath);

        console.log('✅ Archivo descargado:', finalFilePath);
        success = true;

    } catch (error) {
        console.error('❌ Error en ejecución:', error.message);
        // Maybe screenshot?
    } finally {
        if (browser) await browser.close();
    }

    // --- UPLOAD RESULT ---
    if (success && finalFilePath) {
        console.log('📤 Subiendo resultado al servidor...');
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(finalFilePath));

            await axios.post(`${API_URL}/api/wallet/sync-bancolombia/upload-result`, form, {
                headers: { ...form.getHeaders() }
            });
            console.log('✅ ¡Sincronización completada con éxito!');
        } catch (err) {
            console.error('❌ Error subiendo archivo:', err.message);
        }
    } else {
        // Report error?
        console.log('⚠️ No se pudo completar la tarea.');
    }
}
