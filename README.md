# Sistema de Gestión de Pedidos Universal - Guía de Migración y Despliegue

Este documento detalla los pasos para desplegar la aplicación en un nuevo servidor, asegurando que la base de datos se migre exactamente y la sincronización con Siigo funcione correctamente.

## 1. Prerrequisitos del Sistema

Asegúrese de que el servidor tenga instalado:
- **Node.js**: v16 o superior.
- **MySQL**: v8.0 recomendado (o MariaDB compatible).
- **Git**: Para clonar el repositorio.
- **PM2**: Para gestionar los procesos en producción (`npm install -g pm2`).

## 2. Instalación del Código

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/jecaicedo27/toppingfrozen.git
    cd toppingfrozen
    ```

2.  **Instalar dependencias:**
    Ejecute el script para instalar dependencias tanto del backend como del frontend:
    ```bash
    npm run install:all
    ```
    *Si este comando falla, instale manualmente en cada carpeta:*
    ```bash
    cd backend && npm install
    cd ../frontend && npm install
    cd ..
    ```

## 3. Restauración de la Base de Datos (CRÍTICO)

Para mantener la integridad de los datos y asegurar que sea una **copia exacta**, utilizaremos el archivo `database_dump.sql` incluido en el repositorio.

1.  **Crear la base de datos vacía:**
    Acceda a MySQL y cree la base de datos:
    ```sql
    CREATE DATABASE toppingfrozen_2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ```

2.  **Importar el dump:**
    Desde la raíz del proyecto, ejecute:
    ```bash
    mysql -u [usuario] -p toppingfrozen_2 < database_dump.sql
    ```
    *Reemplace `[usuario]` por su usuario de MySQL (ev. root). Ingrese la contraseña cuando se le solicite.*

    > **NOTA IMPORTANTE**: Este dump incluye todos los datos, estructuras, procedimientos almacenados y eventos necesarios. No ejecute migraciones adicionales a menos que sea estrictamente necesario.

## 4. Configuración del Entorno (.env)

Debe configurar las variables de entorno para que la aplicación conecte con la base de datos y Siigo.

1.  **Backend:**
    Copie el archivo de ejemplo o cree `backend/.env` con el siguiente contenido (ajuste las credenciales):

    ```env
    # --- Server ---
    PORT=3003
    NODE_ENV=production

    # --- DB ---
    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_USER=[SU_USUARIO_DB]
    DB_PASSWORD=[SU_PASSWORD_DB]
    DB_NAME=toppingfrozen_2

    # --- JWT ---
    JWT_SECRET=[SECRET_KEY_SEGURA]
    JWT_EXPIRES_IN=24h

    # --- CORS / Frontend ---
    FRONTEND_URL=[URL_DEL_FRONTEND_PRODUCCION]

    # --- SIIGO (CRÍTICO PARA SINCRONIZACIÓN) ---
    SIIGO_ENABLED=true
    SIIGO_API_USERNAME=[USUARIO_API_SIIGO]
    SIIGO_API_ACCESS_KEY=[ACCESS_KEY_SIIGO]
    SIIGO_API_BASE_URL=https://api.siigo.com
    SIIGO_PARTNER_ID=siigo
    SIIGO_WEBHOOK_SECRET=[SECRET_WEBHOOK_DEFINIDO]

    # --- Auto Sync ---
    SIIGO_AUTO_SYNC=true
    SIIGO_SYNC_INTERVAL=*/15
    WEBHOOK_BASE_URL=[URL_DEL_BACKEND_PUBLICO]/api/webhooks
    ```

2.  **Frontend:**
    Cree `frontend/.env` si es necesario para definir la URL del API:
    ```env
    REACT_APP_API_URL=[URL_DEL_BACKEND_PUBLICO]
    ```

## 5. Configuración de Webhooks y Sincronización Siigo

Para activar la sincronización automática y los webhooks, ejecute el siguiente script **después de iniciar el servidor o asegurarse de que la base de datos está lista**.

1.  **Ejecutar registro de webhooks:**
    Desde la carpeta raíz:
    ```bash
    node backend/register_webhooks.js
    ```
    *Este script autenticará con Siigo y registrará los webhooks de productos y clientes utilizando la `WEBHOOK_BASE_URL` definida en el `.env`.*

    **Verifique la salida:** Debe decir `Registration Complete`.

## 6. Despliegue en Producción

1.  **Construir el Frontend:**
    ```bash
    cd frontend
    npm run build
    cd ..
    ```
    *Esto generará la carpeta `frontend/build` que será servida por el backend o Nginx.*

2.  **Iniciar Backend con PM2:**
    ```bash
    cd backend
    pm2 start server.js --name "gestion-backend"
    pm2 save
    ```

La aplicación debería estar corriendo ahora. Verifique los logs con `pm2 logs gestion-backend` si hay errores.
