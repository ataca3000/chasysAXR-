# 📱 Mobile Device Sync - Guía de Uso

## ¿Qué es?

**MobileDeviceSync** permite conectar tu teléfono (o tablet) a GoPilot sin permisos complicados de cámara. Los dispositivos se conectan directamente vía WiFi usando WebRTC (peer-to-peer).

## 🚀 Cómo Usar

### Desde la PC (Control Panel)

1. **Abre GoPilot** en tu navegador: `http://localhost:5173/Gopilot-INDUSTRIAL/`
2. **Busca el panel "Dispositivos Móviles"**
3. **Haz clic en el botón "QR"** para mostrar el código QR de emparejamiento
4. **Escanea con tu teléfono**

### Desde el Teléfono

1. **Abre la app móvil de GoPilot** (próximamente)
2. **Escanea el código QR** desde la PC
3. **Espera a que se conecte** (debería aparecer en la lista de dispositivos)
4. **Haz clic en el dispositivo** para empezar a usar la cámara

## 🔌 Características

✅ **Conexión P2P Directa**

- No necesita servidor central
- Funciona en WiFi local
- Sin permisos de cámara complicados

✅ **Sin Permisos Extra**

- No pide acceso a cámara
- No pide acceso a micrófono
- No pide acceso a ubicación

✅ **Streaming en Vivo**

- Video en tiempo real
- Baja latencia
- Audio opcional

✅ **Múltiples Dispositivos**

- Puedes conectar varios teléfonos
- Cada uno transmite su propia cámara
- Selecciona cuál ver

## 🛠️ Requisitos

- **PC**: GoPilot corriendo en `localhost:3000` (backend)
- **Teléfono**: WiFi en la MISMA red que la PC
- **App móvil**: Descargador o web app de GoPilot

## 📡 Tecnología

Usa **WebRTC** para:

1. **Descubrimiento**: Los dispositivos se encuentran automáticamente
2. **Señalización**: WebSocket en `localhost:3000` hace de intermediario
3. **Streaming**: Conexión P2P directa sin pasar por servidor
4. **Baja Latencia**: <100ms en red local

## ❓ Preguntas Frecuentes

### "Mi teléfono no aparece en la lista"

1. Verifica que estén en la **MISMA WiFi**
2. Escanea el **código QR correcto**
3. Espera **10 segundos** a que se registre
4. Recarga la página (F5)

### "Se desconecta constantemente"

1. Verifica la **conexión WiFi** (no uses 5G si es muy débil)
2. Cierra otras apps que usen mucha banda
3. Reinicia la app móvil
4. Reinicia el servidor: `npm run dev:server`

### "¿Funciona sin WiFi?"

Solo Bluetooth, pero es más complicado de configurar. Actualmente es WiFi/LAN.

### "¿Puedo usar con 4G/5G?"

Solo si ambos tienen acceso a internet y usas un servidor central (no está incluido).

## 🔒 Seguridad

- ✅ Conexión encriptada (WebRTC DTLs)
- ✅ Solo dispositivos en la red local
- ✅ Requiere código QR para emparejar
- ✅ No se almacenan datos en la nube

## 📊 Monitoreo

Desde la PC ves:

- 📱 Lista de dispositivos conectados
- 🟢 Estado de conexión (verde = conectado)
- 📹 Vista en vivo de la cámara
- 🔊 Controles de audio/video
- ❌ Botón para desconectar

## 🚧 Próximas Mejoras

- [ ] Bluetooth directo
- [ ] Grabación de video
- [ ] Snapshot/foto
- [ ] Control de zoom
- [ ] Filtros y efectos
- [ ] Multi-cámara simultánea

## 💡 Casos de Uso

✅ **Sin Webcam**: Usa teléfono como cámara
✅ **Inspección Remota**: Sitúa cámara en máquina
✅ **Múltiples Ángulos**: Varios teléfonos a la vez
✅ **Portabilidad**: Lleva la cámara donde quieras

---

¿Preguntas? Revisa los logs en la consola (F12) si algo no funciona.
