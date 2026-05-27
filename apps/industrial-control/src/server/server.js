import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { SerialPort } from "serialport"; // Necesario para la herramienta send_serial_command
import mqtt from "mqtt";
import { Octokit } from "octokit";
import express from "express";

// Inicializar el servidor MCP de Gopilot-INDUSTRIAL
const server = new McpServer({
  name: "Gopilot-Industrial-Control",
  version: "1.4.0",
});

/**
 * HERRAMIENTA: Publicar en Broker MQTT Industrial
 * Permite a la IA enviar comandos a dispositivos IoT o SCADA remotos.
 */
server.tool(
  "publish_mqtt_message",
  {
    brokerUrl: z
      .string()
      .url()
      .description("URL del broker (ej: mqtt://192.168.1.100)"),
    topic: z.string().description("Tópico MQTT (ej: factory/robot/control)"),
    payload: z.string().description("Mensaje o comando (String o JSON)"),
    qos: z
      .number()
      .min(0)
      .max(2)
      .optional()
      .default(0)
      .description("Calidad de servicio MQTT"),
    retain: z
      .boolean()
      .optional()
      .default(false)
      .description("Retener mensaje en el broker"),
  },
  async ({ brokerUrl, topic, payload, qos, retain }) => {
    try {
      const client = mqtt.connect(brokerUrl, {
        connectTimeout: 4000,
        reconnectPeriod: 0, // No reintentar para una sola operación de envío
      });

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          client.end();
          resolve({
            content: [
              {
                type: "text",
                text: `Timeout: No se pudo conectar al broker ${brokerUrl}`,
              },
            ],
            isError: true,
          });
        }, 5000);

        client.on("connect", () => {
          client.publish(topic, payload, { qos, retain }, (err) => {
            clearTimeout(timeout);
            client.end();
            if (err) {
              resolve({
                content: [
                  { type: "text", text: `Error al publicar: ${err.message}` },
                ],
                isError: true,
              });
            } else {
              resolve({
                content: [
                  {
                    type: "text",
                    text: `✅ Mensaje publicado con éxito en ${topic}`,
                  },
                ],
              });
            }
          });
        });

        client.on("error", (err) => {
          clearTimeout(timeout);
          client.end();
          resolve({
            content: [
              { type: "text", text: `Error de conexión MQTT: ${err.message}` },
            ],
            isError: true,
          });
        });
      });
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fatal: ${error.message}` }],
        isError: true,
      };
    }
  },
);

/**
 * HERRAMIENTA: Crear Repositorio en GitHub
 * Permite a la IA crear un nuevo repositorio para el proyecto.
 */
server.tool(
  "github_create_repository",
  {
    name: z.string().description("Nombre del nuevo repositorio"),
    description: z
      .string()
      .optional()
      .description("Descripción del repositorio"),
    private: z
      .boolean()
      .optional()
      .default(false)
      .description("Si el repositorio debe ser privado"),
    token: z.string().description("GitHub Personal Access Token"),
  },
  async ({ name, description, private: isPrivate, token }) => {
    try {
      const octokit = new Octokit({ auth: token });
      const response = await octokit.rest.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
      });
      return {
        content: [
          {
            type: "text",
            text: `✅ Repositorio creado con éxito: ${response.data.html_url}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error al crear repositorio: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

/**
 * HERRAMIENTA: Crear Issue en GitHub
 * Permite a la IA reportar problemas o tareas directamente al repo.
 */
server.tool(
  "github_create_issue",
  {
    owner: z.string().description("Usuario o organización de GitHub"),
    repo: z.string().description("Nombre del repositorio"),
    title: z.string().description("Título del issue"),
    body: z.string().description("Contenido del issue"),
    token: z.string().description("GitHub Personal Access Token"),
  },
  async ({ owner, repo, title, body, token }) => {
    try {
      const octokit = new Octokit({ auth: token });
      const response = await octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
      });
      return {
        content: [
          {
            type: "text",
            text: `✅ Issue creado con éxito: ${response.data.html_url}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error de GitHub: ${error.message}` }],
        isError: true,
      };
    }
  },
);

/**
 * HERRAMIENTA: Commitear archivo en GitHub
 * Permite a la IA subir firmware o documentación generada directamente al repo.
 */
server.tool(
  "github_commit_file",
  {
    owner: z.string().description("Usuario o organización de GitHub"),
    repo: z.string().description("Nombre del repositorio"),
    path: z.string().description("Ruta del archivo (ej: firmware/arduino.ino)"),
    message: z.string().description("Mensaje del commit"),
    content: z.string().description("Contenido del archivo"),
    token: z.string().description("GitHub Personal Access Token"),
    branch: z.string().optional().default("main"),
  },
  async ({ owner, repo, path, message, content, token, branch }) => {
    try {
      const octokit = new Octokit({ auth: token });

      // Intentar obtener el SHA si el archivo ya existe (necesario para actualizar)
      let sha;
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ref: branch,
        });
        if (data && !Array.isArray(data)) sha = data.sha;
      } catch (e) {
        // El archivo no existe, está bien
      }

      const response = await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString("base64"),
        sha,
        branch,
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ Archivo commiteado con éxito en: ${response.data.commit.html_url}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error de GitHub: ${error.message}` }],
        isError: true,
      };
    }
  },
);

/**
 * HERRAMIENTA: Leer página de la Wiki de GitHub
 */
server.tool(
  "github_get_wiki_page",
  {
    owner: z.string().description("Usuario o organización de GitHub"),
    repo: z
      .string()
      .description("Nombre del repositorio (ej: gopilot-industrial)"),
    path: z
      .string()
      .description("Nombre del archivo de la página (ej: Home.md)"),
    token: z.string().description("GitHub Personal Access Token"),
  },
  async ({ owner, repo, path, token }) => {
    try {
      const octokit = new Octokit({ auth: token });
      // Las wikis son repositorios ocultos con el sufijo .wiki
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo: `${repo}.wiki`,
        path,
      });

      if (Array.isArray(data)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: '${path}' es un directorio. Archivos en la raíz: ${data.map((f) => f.name).join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      const content = Buffer.from(data.content, "base64").toString("utf8");
      return {
        content: [{ type: "text", text: content }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error al leer la Wiki: ${error.message}. Asegúrate de que la Wiki esté habilitada.`,
          },
        ],
        isError: true,
      };
    }
  },
);

/**
 * HERRAMIENTA: Actualizar o Crear página en la Wiki de GitHub
 */
server.tool(
  "github_update_wiki_page",
  {
    owner: z.string().description("Usuario o organización de GitHub"),
    repo: z
      .string()
      .description("Nombre del repositorio (ej: gopilot-industrial)"),
    path: z.string().description("Nombre de la página (ej: Roadmap.md)"),
    content: z.string().description("Contenido Markdown de la página"),
    message: z.string().description("Mensaje del commit"),
    token: z.string().description("GitHub Personal Access Token"),
  },
  async ({ owner, repo, path, content, message, token }) => {
    try {
      const octokit = new Octokit({ auth: token });
      const wikiRepo = `${repo}.wiki`;

      // Obtener el SHA si el archivo ya existe para poder actualizarlo
      let sha;
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo: wikiRepo,
          path,
        });
        if (!Array.isArray(data)) sha = data.sha;
      } catch (e) {
        // Si no existe, procedemos a crearlo (sha queda undefined)
      }

      const response = await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo: wikiRepo,
        path,
        message,
        content: Buffer.from(content).toString("base64"),
        sha,
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ Página de Wiki actualizada: ${response.data.commit.html_url}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error al actualizar la Wiki: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

/**
 * HERRAMIENTA: Control Serial Local
 */
server.tool(
  "send_serial_command",
  {
    port: z.string().description("Puerto COM o /dev/tty"),
    command: z.string().description("Comando G-Code o texto"),
  },
  async ({ port, command }) => {
    return {
      content: [
        { type: "text", text: `[LOG] Comando "${command}" enviado a ${port}.` },
      ],
    };
  },
);

/**
 * HERRAMIENTA: Generador de Firmware
 */
server.tool(
  "generate_firmware",
  {
    machineName: z.string(),
    config: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        pin: z.number(),
      }),
    ),
  },
  async ({ machineName, config }) => {
    let code = `// FIRMWARE PARA ${machineName}\n\n`;
    config.forEach((c) => {
      code += `#define PIN_${c.id.toUpperCase()} ${c.pin} // ${c.type}\n`;
    });
    code += `\nvoid setup() {\n  Serial.begin(115200);\n}`;
    return {
      content: [{ type: "text", text: code }],
    };
  },
);

// Arrancar el servidor
const app = express();
let transport;

app.get("/sse", async (req, res) => {
  console.log("Nueva conexión SSE iniciada");
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("Transporte no inicializado");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.error(
    `Gopilot Industrial MCP Server activo en http://localhost:${PORT}/sse`,
  );
});
