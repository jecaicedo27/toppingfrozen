const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Ensure download directory exists
const downloadDir = path.resolve(__dirname, '../downloads/bancolombia_sync');
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

// Log helper
const logFile = path.join(downloadDir, 'robot.log');
const log = (msg) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${msg}`;
    console.log(logMsg);
    fs.appendFileSync(logFile, logMsg + '\n');
};

log('🚀 Script iniciado.');

(async () => {
    const nit = process.env.BANCOLOMBIA_NIT;
    const username = process.env.BANCOLOMBIA_USER;
    const password = process.env.BANCOLOMBIA_PASS;

    if (!nit || !username || !password) {
        log('❌ Falta información de credenciales (NIT, Usuario o Contraseña).');
        process.exit(1);
    }

    log('🚀 Iniciando robot Bancolombia (Headless)...');

    // Configuration
    const isHeadless = process.env.BANCOLOMBIA_HEADLESS !== 'false'; // Default to true
    const slowMo = process.env.BANCOLOMBIA_SLOWMO ? parseInt(process.env.BANCOLOMBIA_SLOWMO) : 0;

    log(`🚀 Config: Headless=${isHeadless}, SlowMo=${slowMo}ms`);

    // Launch browser (Use REAL Chrome if available)
    const browser = await chromium.launch({
        headless: isHeadless,
        slowMo: slowMo,
        // channel: 'chrome', // Chrome not installed on VPS, but might work locally? stick to chromium for compatibility
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-size=1280,720',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials'
        ],
        proxy: process.env.BANCOLOMBIA_PROXY ? { server: process.env.BANCOLOMBIA_PROXY } : undefined
    });

    // Create context with specific download behavior
    const context = await browser.newContext({
        acceptDownloads: true,
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        locale: 'es-CO',
        timezoneId: 'America/Bogota',
        extraHTTPHeaders: {
            'Accept-Language': 'es-419,es;q=0.9',
            'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        }
    });

    // Mask the webdriver property to evade detection
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
    });

    const page = await context.newPage();

    // Enable Console Logging
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning')
            log(`🖥️ [CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });


    page.on('response', response => {
        const url = response.url();
        if (url.includes('api') || url.includes('token') || url.includes('auth')) {
            const status = response.status();
            log(`🌐 [NETWORK] ${status} ${response.request().method()} ${url}`);
            if (status >= 400) {
                log(`   ❌ REQUEST FAILED: ${status}`);
                // response.text().then(t => log(`   Response Body: ${t.substring(0, 200)}`)).catch(() => {});
            }
        }
    });

    // Helper to close popups
    const closePopups = async () => {
        try {
            // Common selectors for popups/modals in Bancolombia
            // Needs to be adjusted based on real site structure (Inspect Element needed if fails)
            // Assuming generic "close" buttons or X icons often found
            // Specific close buttons for known modals
            // Remove generic overlay click which might be a loading spinner
            const closeSelectors = [
                'svn-start-modal button',      // Welcome modal specific
                'svn-start-modal .close',
                'button[aria-label="Cerrar"]',
                // 'div[class*="modal-overlay"]' // Removing this as it might be loading backdrop
            ];

            for (const selector of closeSelectors) {
                const element = page.locator(selector).first();
                if (await element.isVisible()) {
                    log(`Pop-up detectado (${selector}). Cerrando...`);
                    await element.click();
                    await page.waitForTimeout(500);
                }
            }
        } catch (e) { }
    };


    try {
        // --- STATE MACHINE LOGIN START ---
        log('🤖 Iniciando bucle de estado (State Machine) para Login...');

        let currentState = 'START';
        let attempts = 0;
        const maxAttempts = 60; // 60 iterations (~5 min)
        const loopDelay = 3000;

        // Initial navigation
        log('🌐 Navegando a Sucursal Virtual Negocios...');
        await page.goto('https://svnegocios.apps.bancolombia.com/ingreso/empresa', { timeout: 60000 });
        // Snapshot initial state
        await page.waitForTimeout(2000);
        await closePopups();

        while (attempts < maxAttempts) {
            attempts++;
            // debug visual timeline
            try {
                const debugFilename = `debug_interval_${String(attempts).padStart(3, '0')}.png`;
                await page.screenshot({ path: path.join(downloadDir, debugFilename) });
            } catch (e) {
                // ignore
            }

            log(`🔄 Iteración ${attempts}/${maxAttempts}. Estado actual: ${currentState}`);

            // 0. Global Popup Check
            await closePopups();

            // 1. Detect Screen Logic
            const isDashboard = await page.locator('.bc_header_menu, .main-menu, app-dashboard').first().isVisible().catch(() => false);

            // Step 1: NIT Screen
            // Use visible text header as reliable anchor
            const isStep1_NIT = await page.getByText('Ingresa el documento de tu negocio').first().isVisible().catch(() => false);

            // Step 2: Auth Screen (User AND Password together, as per screenshot)
            // We look for "Usuario de Negocios" or distinct user input presence combined with password
            const isStep2_Auth = await page.getByText('Usuario de Negocios').or(page.locator('input[formcontrolname="username"]')).first().isVisible().catch(() => false);
            const hasPasswordInput = await page.locator('input[type="password"]').first().isVisible().catch(() => false);

            const isError = await page.getByText('Algo ocurrió').or(page.getByText('No fue posible cargar')).first().isVisible().catch(() => false);

            // --- STATE LOGIC ---

            if (isDashboard) {
                log('✅ LOGIN EXITOSO: Dashboard detectado.');
                currentState = 'DASHBOARD';
                break;
            }

            if (isError) {
                log('❌ Error "Algo ocurrió" detectado. Intentando recuperar...');
                const retryBtn = page.getByText('Intentar nuevamente').first();
                if (await retryBtn.isVisible()) {
                    await retryBtn.click();
                    await page.waitForTimeout(3000);
                    continue;
                }
            }

            // Logic Router
            if (isStep2_Auth || (hasPasswordInput && attempts > 5)) {
                currentState = 'AUTH_STEP';
                log('🔐 Estado: Pantalla de Autenticación (Usuario/Clave) detectada.');

                // 1. Fill Username
                const userInput = page.getByLabel('Usuario de Negocios')
                    .or(page.getByPlaceholder('Usuario de Negocios'))
                    .or(page.locator('input[formcontrolname="username"]'))
                    .or(page.locator('input[type="text"]')); // Fallback

                if (await userInput.first().isVisible()) {
                    await userInput.first().fill(username);
                }

                // 2. Fill Password
                const passInput = page.getByLabel('Clave de Negocios')
                    .or(page.getByPlaceholder('Clave de Negocios'))
                    .or(page.locator('input[type="password"]'));

                if (await passInput.first().isVisible()) {
                    await passInput.first().fill(password); // User provided value
                }

                await page.waitForTimeout(1000);

                // 3. Click Ingresar
                const btnIngresar = page.getByRole('button', { name: 'Ingresar' }).or(page.getByText('Ingresar')).first();

                if (await btnIngresar.isEnabled()) {
                    log('   Clicking Ingresar...');
                    await btnIngresar.click();
                } else {
                    log('   Botón Ingresar deshabilitado. Intentando tabular...');
                    await passInput.first().press('Tab');
                    await page.waitForTimeout(500);
                    if (await btnIngresar.isEnabled()) await btnIngresar.click();
                }

                await page.waitForTimeout(5000); // Wait for login processing

            } else if (isStep1_NIT) {
                currentState = 'NIT_STEP';
                log('📄 Estado: NIT detectado.');

                // Ensure NIT dropdown is selected
                // Strategy: Check if "NIT" is visible in the combobox text
                const docTypeContainer = page.locator('.bc-input-select-v2-combobox').first();
                const currentDocType = await docTypeContainer.innerText().catch(() => '');

                if (!currentDocType.includes('NIT')) {
                    log('   Seleccionando NIT en dropdown...');
                    // Click the toggle
                    await docTypeContainer.click();
                    await page.waitForTimeout(500);

                    // Select specific option from Screenshot 2
                    const nitOption = page.locator('li[data-value="NIT"]');
                    if (await nitOption.isVisible()) {
                        await nitOption.click();
                    } else {
                        // Fallback to keyboard
                        await page.keyboard.press('N');
                        await page.keyboard.press('Enter');
                    }
                    await page.waitForTimeout(500);
                }


                // Selector based on likelihood from Bancolombia Angular structure
                // Selector confirmed by User Screenshot
                const nitInput = page.locator('#bc-mf_authentication-bc_login_company-bc_input-password').first(); // Yes, it has "password" ID

                // Check visibility
                if (await nitInput.isVisible()) {
                    const currentVal = await nitInput.inputValue();

                    if (!currentVal || currentVal.length < 5) {
                        await nitInput.click();
                        await nitInput.clear();
                        await page.waitForTimeout(200);
                        // Human typing
                        await nitInput.pressSequentially(nit, { delay: 150 });
                        await page.waitForTimeout(300);

                        // Dispatch events
                        await nitInput.dispatchEvent('input');
                        await nitInput.dispatchEvent('change');
                        await page.waitForTimeout(1000);
                    }

                    // Button confirmed by User Screenshot
                    const btnContinue = page.locator('#bc-mf_authentication-bc_login_company-bc_button_primary-continue').first();

                    if (await btnContinue.isEnabled()) {
                        log('   ✅ Botón Continuar HABILITADO. Intentando Focus + Enter...');
                        await btnContinue.focus();
                        await page.waitForTimeout(500);
                        await page.keyboard.press('Enter');
                    } else {
                        log('   ❌ Botón Continuar sigue deshabilitado.');
                    }

                } else {
                    log('⚠️ No se encontró el input NIT con el ID específico.');

                    // Strategy 1: Tab from Dropdown
                    const dropdown = page.locator('.bc-input-select-v2-combobox').first();
                    if (await dropdown.isVisible()) {
                        log('   👉 Strategy: Click Dropdown -> Tab -> Type');
                        await dropdown.click(); // Focus
                        await page.waitForTimeout(200);
                        await page.keyboard.press('Escape'); // Ensure closed
                        await page.waitForTimeout(200);
                        await page.keyboard.press('Tab'); // Move to NIT
                        await page.waitForTimeout(200);
                        await page.keyboard.type(nit, { delay: 100 });
                        await page.waitForTimeout(500);
                        await page.keyboard.press('Tab'); // Blur
                    }

                    // Strategy 2: Fill the 'password' input if it's the only one (Bancolombia weirdness?)
                    const weirdInput = page.locator('input[id*="password"]').first();
                    if (await weirdInput.isVisible()) {
                        log('   👉 Strategy: Filling "password" detected input as NIT fallback (Slowly)...');
                        log(`      Input Attributes: id=${await weirdInput.getAttribute('id')}, type=${await weirdInput.getAttribute('type')}`);
                        await weirdInput.click();
                        await weirdInput.clear();
                        await weirdInput.pressSequentially(nit, { delay: 150 });
                        await page.waitForTimeout(500);
                        // Do NOT press Enter, let the Continuar button handle it
                    }
                }

                await page.waitForTimeout(2000); // Wait for validation to propagate

                const btnContinue = page.getByRole('button', { name: 'Continuar' }).first();

                // Check enable status
                if (await btnContinue.isEnabled()) {
                    log('   ✅ Botón Continuar HABILITADO. Intentando Focus + Enter...');
                    await btnContinue.focus();
                    await page.waitForTimeout(500);
                    await page.keyboard.press('Enter');
                } else {
                    log('   ❌ Botón Continuar sigue deshabilitado.');
                }

                await page.waitForTimeout(5000);

                // Check for "Algo ocurrió" post-click
                const errorMsg = await page.getByText('Algo ocurrió').or(page.getByText('No fue posible cargar')).first();
                if (await errorMsg.isVisible()) {
                    log('❌ Error "Algo ocurrió" detectado post-action.');
                }

                // Always try force click as last resort if enabled check failed but maybe valid?
                // No, sticking to natural for now to avoid "Algo ocurrio"

                await page.waitForTimeout(3000);

            } else {
                log('⏳ Estado: Cargando / Desconocido...');
                // Debug screenshot
                if (attempts % 5 === 0 || attempts === 1) {
                    const debugPath = path.join(downloadDir, `debug_state_${attempts}.png`);
                    await page.screenshot({ path: debugPath });
                    log(`📸 Screenshot de estado desconocido guardado: ${debugPath}`);

                    const pageText = await page.evaluate(() => document.body.innerText);
                    log('🔎 PAGE TEXT DEBUG (UNKNOWN STATE):\n' + pageText.substring(0, 500) + '...');
                }
            }

            await page.waitForTimeout(loopDelay);
        }

        if (currentState !== 'DASHBOARD') {
            throw new Error(`❌ Timeout: No se llegó al Dashboard tras ${maxAttempts} intentos.`);
        }
        // --- STATE MACHINE END ---

        console.log('⏳ Entrando al Dashboard...');
        // Wait for successful login (Dashboard element)
        await page.waitForURL('**/home', { timeout: 30000 }).catch(() => console.log('URL no cambió a /home, verificando selectores...'));

        // Verify dashboard loaded
        await page.waitForTimeout(5000); // Give it time to load dynamic dashboard
        await page.screenshot({ path: path.join(downloadDir, 'step3_dashboard.png') });
        log('📸 Screenshot 3: Dashboard');
        await closePopups();

        // 4. Navigation to Movements
        console.log('📂 Navegando a Movimientos...');

        // "Detalle y movimientos" (Button/Link)
        // Image 3 shows this button.
        await page.getByText('Detalle y movimientos').first().click();
        await page.waitForTimeout(2000);
        await closePopups();

        // "Movimientos" (Sub-option or Tab)
        await page.getByText('Movimientos', { exact: true }).first().click();
        await page.getByText('Movimientos', { exact: true }).first().click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(downloadDir, 'step4_movements.png') });
        log('📸 Screenshot 4: Movements');
        await closePopups();

        // 5. Download Modal
        console.log('⬇️ Iniciando descarga...');

        // "Descargar movimientos" button (Image 4 shows icon or button on right)
        // Usually an icon button or text. User circled "Movimientos" button in image 4.
        // Wait, image 4 shows a modal "Descargar movimientos" already open? 
        // No, Image 4 shows "Descargar movimientos" header inside a modal/sidebar.
        // So we need to find the trigger button. Usually an icon "Download" or "Descargar".

        const downloadTrigger = page.locator('button:has-text("Descargar")')
            .or(page.locator('mat-icon:has-text("download")')) // Angular Material common
            .or(page.getByRole('button', { name: /descargar/i }));

        // Wait, user image 3 circled a button "Movimientos" inside "Detalle y movimientos".
        // User image 4 shows sidebar "Descargar movimientos".
        // It seems finding "Movimientos" to click opens the list, and then there is a "Descargar" action?
        // Ah, looking at Image 4 red circle, it circles a "Movimientos" button on the top right?
        // "Descargar de esta cuenta -> Movimientos".
        // So the button text is "Movimientos" inside a section "Descargar de esta cuenta".

        const downloadBtn = page.getByRole('button', { name: 'Movimientos' }).last(); // Last one might be the action button if tab has same name
        // Or look for text "Descargar de esta cuenta" context.

        await downloadBtn.click();
        await page.waitForTimeout(2000);

        // Now Side Modal is open "Descargar movimientos" (Image 5)

        // Select "Tipo de descarga" -> "Historial"
        // It's likely a dropdown.
        // Needs accurate selectors. Assuming standard click -> select option.
        await page.click('text=Tipo de descarga'); // Open dropdown
        await page.waitForTimeout(500);
        await page.click('text=Historial'); // Select option

        // Select Date Range (Custom or Last 7 days)
        // "Últimos 7 días"
        // Might be another dropdown or radio. "Selecciona el rango"
        // User said: "seleccionar historial, luego selecciono la fecha que sea los ultimos 7 dias"
        // Assuming "Historial" reveals date options.

        await page.click('text=Últimos 7 días'); // Try finding text directly

        // Select "Tipo de transacción" -> "Todas"
        await page.click('text=Tipo de transacción'); // Dropdown
        await page.waitForTimeout(500);
        await page.click('text=Todas');

        // Format -> CSV
        await page.click('text=Formato de archivo');
        await page.waitForTimeout(500);
        await page.click('text=CSV'); // or .csv

        // Click Descargar
        console.log('Waiting for download event...');
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Descargar' }).click();

        const download = await downloadPromise;

        // Save file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `bancolombia_movements_${timestamp}.csv`;
        const filePath = path.join(downloadDir, filename);

        await download.saveAs(filePath);
        console.log(`✅ Archivo descargado exitosamente: ${filename}`);

        await context.close();
        await browser.close();
        process.exit(0);

    } catch (error) {

        log(`❌ Error en el proceso del robot: ${error.message}`);
        await page.screenshot({ path: path.join(downloadDir, 'error_screenshot.png') });
        log('📸 Screenshot de error guardado.');
        await browser.close();
        process.exit(1);
    }
})();
