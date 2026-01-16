require('dotenv').config();
const { query } = require('./config/database');

async function addMilkAssociation() {
    try {
        console.log('\n🔄 Agregando campo de asociación de leche...\n');

        // Agregar columna si no existe
        try {
            await query(`
                ALTER TABLE products 
                ADD COLUMN associated_milk_code VARCHAR(10) NULL
                COMMENT 'Código de leche asociada para mezclas'
                AFTER subcategory
            `);
            console.log('✅ Columna "associated_milk_code" agregada correctamente');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️  Columna "associated_milk_code" ya existe');
            } else {
                throw error;
            }
        }

        console.log('\n🔄 Asignando códigos de leche a cada tipo de mezcla...\n');

        // Helado Premium → MEL03
        const premium = await query(`
            UPDATE products 
            SET associated_milk_code = 'MEL03'
            WHERE subcategory = 'Helado Premium'
        `);
        console.log(`✅ Helado Premium → MEL03 (${premium.affectedRows} productos)`);

        // Helado Suave → MEL01
        const suave = await query(`
            UPDATE products 
            SET associated_milk_code = 'MEL01'
            WHERE subcategory = 'Helado Suave'
        `);
        console.log(`✅ Helado Suave → MEL01 (${suave.affectedRows} productos)`);

        // Helado Yogurt → MEL02
        const yogurt = await query(`
            UPDATE products 
            SET associated_milk_code = 'MEL02'
            WHERE subcategory = 'Helado Yogurt'
        `);
        console.log(`✅ Helado Yogurt → MEL02 (${yogurt.affectedRows} productos)`);

        // Yogur Sin Azucar → MEL06
        const yogurSinAzucar = await query(`
            UPDATE products 
            SET associated_milk_code = 'MEL06'
            WHERE subcategory = 'Yogur Sin Azucar'
        `);
        console.log(`✅ Yogur Sin Azucar → MEL06 (${yogurSinAzucar.affectedRows} productos)`);

        // Suave Sin Azucar → MEL07
        const suaveSinAzucar = await query(`
            UPDATE products 
            SET associated_milk_code = 'MEL07'
            WHERE subcategory = 'Suave Sin Azucar'
        `);
        console.log(`✅ Suave Sin Azucar → MEL07 (${suaveSinAzucar.affectedRows} productos)`);

        console.log('\n✨ Asociación de leches completada!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addMilkAssociation();
