# Security Policy

## Reporte de vulnerabilidades
Si detectas una vulnerabilidad, por favor informa a través de un issue privado o envía un correo a security@yourdomain.com.

## Alcance
- Código fuente en `/src`
- Dependencias de `package.json`
- Workflows en `.github/workflows`
- Configuración de despliegue y secretos

## Respuesta
- Confirmaremos recepción en 48 horas.
- Evaluaremos y solucionaremos en la mayor brevedad posible.
- Publicaremos parches y actualizaciones cuando sea necesario.

## Buenas prácticas
- No subas credenciales al repositorio.
- Usa secretos de GitHub Actions.
- Mantén `.env` en local, no versionado.
