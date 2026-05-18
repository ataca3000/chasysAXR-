# Flujos del agente y sincronización

## Agente inteligente
El agente central valida la intención, enruta el comando y ejecuta un pipeline de decisiones.

## WebSerial
El driver WebSerial abstrae la conexión y expone una API simple para el envío de comandos y recepción de telemetría.

## WebUSB
El driver WebUSB maneja permisos, configuración de interfaces y transferencia bidireccional de paquetes.

## Sincronización cloud
La capa de servicios implementa retries, validación y sincronización de estado entre local y cloud.
