# Albufera · Marina y Xavi

Escena 3D en tiempo real de la Albufera de Valencia para la invitación de boda: la luz sigue la hora real de Valencia y el tiempo (nubes, lluvia, viento) el parte del momento.

## Verla en local

Necesita un servidor HTTP (no funciona abriendo el archivo directamente):

```bash
python3 -m http.server 8765
```

y abrir http://localhost:8765

## Controles

- Flechas / WASD: caminar · arrastrar con el ratón: mirar
- F: pantalla completa · H: ocultar controles · I: información de rendimiento
- `?hora=HH:MM` y `?tiempo=raso|nubes|lluvia` en la dirección para forzar hora y tiempo

Créditos de las grabaciones de sonido en `assets/audio/CREDITOS.txt`.
