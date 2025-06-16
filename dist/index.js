#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
const MCP_SERVER_IP = process.env.MCP_SERVER_IP || "localhost";
const MCP_SERVER_PORT = process.env.MCP_SERVER_PORT || "8090";
const MCP_SERVER_ENDPOINT = `http://${MCP_SERVER_IP}:${MCP_SERVER_PORT}/mcp`;
const server = new Server({
    name: "stdio-to-streamable-http",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
        const jsonRpcRequest = {
            jsonrpc: "2.0",
            id: Math.random().toString(36).substring(7),
            method: "tools/list",
            params: {}
        };
        const response = await fetch(MCP_SERVER_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
            },
            body: JSON.stringify(jsonRpcRequest),
        });
        if (!response.ok) {
            console.error(`Failed to fetch tools: ${response.status} ${response.statusText}`);
            return { tools: [] };
        }
        const jsonRpcResponse = await response.json();
        if (jsonRpcResponse.error) {
            console.error("JSON-RPC error:", jsonRpcResponse.error);
            return { tools: [] };
        }
        return jsonRpcResponse.result || { tools: [] };
    }
    catch (error) {
        console.error("Error fetching tools from Unity:", error);
        return { tools: [] };
    }
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const jsonRpcRequest = {
            jsonrpc: "2.0",
            id: Math.random().toString(36).substring(7),
            method: "tools/call",
            params: {
                name: request.params.name,
                arguments: request.params.arguments,
            }
        };
        const response = await fetch(MCP_SERVER_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
            },
            body: JSON.stringify(jsonRpcRequest),
        });
        const responseBody = await response.text();
        if (!response.ok) {
            return {
                content: [
                    {
                        type: "text",
                        text: `HTTP Error: ${response.status} ${response.statusText}\n${responseBody}`,
                    },
                ],
                isError: true,
            };
        }
        try {
            const jsonRpcResponse = JSON.parse(responseBody);
            if (jsonRpcResponse.error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `JSON-RPC Error: ${jsonRpcResponse.error.message || jsonRpcResponse.error}`,
                        },
                    ],
                    isError: true,
                };
            }
            return jsonRpcResponse.result;
        }
        catch (parseError) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Parse Error: ${responseBody}`,
                    },
                ],
                isError: true,
            };
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Network Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
            isError: true,
        };
    }
});
async function main() {
    // Send notifications/initialized handshake
    const jsonRpcRequest = {
        jsonrpc: "2.0",
        method: "notifications/initialized",
        params: {}
    };
    // Ignore response
    await fetch(MCP_SERVER_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonRpcRequest),
    });
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map