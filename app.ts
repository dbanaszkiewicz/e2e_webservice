"use strict";

import {Bootstrap} from "./src/Bootstrap";
import * as WebSocket from 'ws';
import {UserService} from "./src/Service/UserService";
import {GroupService} from "./src/Service/GroupService";
import {Database} from "./src/Config/Database";

const express = require('express');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let expressWS = require('express-ws');

const app = express();
expressWS(app);

app.use(express.static('public'));
app.use(cookieParser());
app.use(bodyParser.json()); // for parsing application/json

app.ws('/ws', (ws: WebSocket, req) => {
    if (!req.cookies.sid) {
        ws.close();
    }
    UserService.setWsClient(req.cookies.sid, ws);

    ws.on('message', msg => {
        msg = JSON.parse(msg);

        if (msg.send_message) {
            GroupService.sendMessage(msg.send_message, req.cookies.sid);
        }
    });

    ws.on('close', function open() {
        let sessions = [];
        for (let session of UserService.sessions) {
            if (session.sid === req.cookies.sid) {
                let ws = [];
                for (const webSocket of session.ws) {
                    if (session.ws && (webSocket.readyState === WebSocket.OPEN || webSocket.readyState !== WebSocket.CONNECTING)) {
                        ws.push(webSocket);
                    }
                }
                session.ws = ws;
            }

            if (session.expire >= new Date(Date.now())) {
                sessions.push(session);
            }
        }
        UserService.sessions = sessions;
    });
});

async function sync() {
    await Database.initialize();

    await Database.sequelize.sync();
    await Database.sequelize.close();
}

sync().then(() => {
    process.title = 'e2e';

    new Bootstrap(app);

    app.listen(3000, '0.0.0.0', () => {
        console.log('Example app listening on port 3000!')
    });
});
