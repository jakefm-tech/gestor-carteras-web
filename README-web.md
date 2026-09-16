# Gestor de Carteras — versión navegador (PWA)

App que se abre en **Chrome** (Mac y Windows) y guarda **directamente en vuestra
carpeta de OneDrive**. Sin instalador, sin Gatekeeper, sin el aviso de "software
malicioso". Los datos **no salen de vuestros equipos ni de vuestro OneDrive**: la
página solo aporta el programa; los datos los escribe el navegador en vuestro disco.

## Ponerla en marcha (una sola vez)
Se publica gratis con **GitHub Pages** (solo sirve el programa; ningún dato pasa por ahí).

1. En github.com, crea un repositorio nuevo (por ejemplo `gestor-carteras-web`).
2. Sube **todos** estos archivos (incluida la carpeta `iconos/`).
3. En el repo: **Settings → Pages**. En "Source" elige **Deploy from a branch**,
   rama **main**, carpeta **/(root)**, y **Save**.
4. Espera ~1 minuto y recarga: arriba aparecerá la dirección pública de tu app
   (algo como `https://tu-usuario.github.io/gestor-carteras-web/`).

## Abrir e instalar (tú y Ana)
1. Abre esa dirección en **Chrome**.
2. En la barra de direcciones aparece un icono de **instalar** (un monitor con una
   flecha) → púlsalo → **Instalar**. Queda como una app con su icono y su ventana.
3. La primera vez pide dos cosas: la **carpeta compartida de OneDrive**
   (la MISMA en los dos equipos) y **quién eres** (Jacobo o Ana).

## Notas
- Usad **Chrome** en los dos equipos. Safari no puede escribir en la carpeta.
- La dirección de GitHub Pages es pública, pero **no contiene datos**: quien la abra
  solo vería la app vacía y tendría que elegir su propia carpeta.
- Tras recargar, Chrome puede pedir de nuevo permiso sobre la carpeta: es un clic.

## Estado
Cimiento completo y **conectado a OneDrive de verdad**: conexión de carpeta, elección
de usuario y la pantalla **Clientes** escribiendo y leyendo apuntes reales.
**Actualizar** e **Informes** se enganchan encima en la siguiente entrega.
