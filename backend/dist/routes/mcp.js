"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const buildTrackServer_1 = require("../mcp/buildTrackServer");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    const apiBaseUrl = process.env.BUILDTRACK_API_BASE || `${req.protocol}://${req.get('host')}`;
    const server = (0, buildTrackServer_1.createBuildTrackMcpServer)(apiBaseUrl);
    const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
        void transport.close();
        void server.close();
    });
    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error('BuildTrack MCP request failed:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal server error' },
                id: null,
            });
        }
    }
});
router.get('/', (_req, res) => {
    res.status(405).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed' },
        id: null,
    });
});
router.delete('/', (_req, res) => {
    res.status(405).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed' },
        id: null,
    });
});
exports.default = router;
