import child_process from 'child_process';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);
import axios from 'axios';

///////////////////////////
const APP_PORT = 8086; 
const CLASH_API = 8083;
const CLASH_KEY = '123456';
const TEST_URL = 'http://www.gstatic.com/generate_204';
///////////////////////////

/**
 * @type {child_process.ChildProcessWithoutNullStreams}
 */
let clash_process;


(async() => {
    // start clash core
    console.log('clash core:', 'start');
    clash_process = child_process.spawn(path.join(__dirname, './core/clash'), ['-d', '.'], {
        cwd: path.join(__dirname, './core')
    });
    clash_process.on('close', (e) => {
        console.log('warning:', 'clash process exit with code', e);
    })
    clash_process.on('message', (message) => {
        console.log(message);
    });

    // api client
    const apiClient = axios.create({
        baseURL: 'http://127.0.0.1:' + CLASH_API,
        timeout: 3000,
        headers: {
            'Authorization': 'Bearer ' + CLASH_KEY
        }
    });
    let apiCache = new Map();
    let apiRequest = async(url) => {
        if (apiCache.has(url)) {
            return apiCache.get(url);
        }
        try {
            let request = await apiClient.get(encodeURI(url));
            console.log('api client:', 'make cache for', url);
            apiCache.set(url, request.data);
            return request.data;
        } catch {
            let result = { code: 1, message: 'Failed to request upstream server.' };
            apiCache.set(url, result);
            return result;
        }
    }
    setInterval(() => {
        console.log('api client:', 'clear caches')
        apiCache.clear();
    }, 5 * 60 * 1000); // 5 minutes

    // web server
    const app = express();
    app.use('/', express.static('./web/'));
    // web api
    app.get('/api/nodes', async(req, res) => {
        let upstreamData = await apiRequest('/proxies');
        res.send(upstreamData.proxies['Proxies'].all);
    });
    app.get('/api/node/:name', async(req, res) => {
        let nodeName = req.params['name'];
        let upstreamData = await apiRequest(`/proxies/${nodeName}/delay?timeout=5000&url=${TEST_URL}`);
        res.send(upstreamData);
    });
    // process exit handler
    process.on('exit', function() {
        clash_process.kill();
        server.close();
        process.exit(0);
    });
    // start app listen
    console.log('web server:', 'start');
    app.listen(APP_PORT);
})();
