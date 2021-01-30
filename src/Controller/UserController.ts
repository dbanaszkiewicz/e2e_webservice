"use strict";

import * as Express from "express";
import {UserService} from "../Service/UserService";
import {ServerError} from "../Error/ServerError";

const NodeRSA = require('node-rsa');

export class UserController {
    private req: Express.Request = null;
    private res: Express.Response = null;
    private userService: UserService;

    public constructor(request: Express.Request, response: Express.Response) {
        this.req = request;
        this.res = response;
        this.userService = UserService.getInstance(request, response);
    }

    public async loginAction() {
        if (!(this.req.body && this.req.body.login && this.req.body.password && this.req.body.login.length > 3 && this.req.body.password.length > 3 && this.req.body['public_key'])) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        const key = new NodeRSA();
        try {
            key.importKey(this.req.body.public_key);
            if (!key.isPublic()) {
                throw new ServerError('Podany klucz jest nieprawidłowy!', 400);
            }
        } catch (e) {
            throw new ServerError('Podany klucz jest nieprawidłowy!', 400);
        }

        if (await this.userService.login()) {
            return this.userService.getInfo();
        }
    }

    public async changeAction() {
        if (!this.req.body.password || !this.req.body.oldPassword) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        return await this.userService.changeData();
    }

    public async registerAction() {
        if (!(this.req.body && this.req.body.login && this.req.body.password && this.req.body.public_key)) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        if (await this.userService.isLoginInUse(this.req.body.login)) {
            throw new ServerError('Wybrany login jest już zajęty!', 406);
        }

        const key = new NodeRSA();
        try {
            key.importKey(this.req.body.public_key);
            if (!key.isPublic()) {
                throw new ServerError('Podany klucz jest nieprawidłowy!', 400);
            }
        } catch (e) {
            throw new ServerError('Podany klucz jest nieprawidłowy!', 400);
        }

        if (await this.userService.isPublicKeyInUse(this.req.body.login)) {
            throw new ServerError('Przesłany klucz publiczny jest już używany. Wygeneruj nowy klucz publiczny!', 406);
        }

        await this.userService.register();

        return {
            "data": {
                "registered": true
            }
        };
    }

    public async getInfoAction() {
        return await this.userService.getInfo();
    }

    public async findAction() {
        if (this.req.query.login && (this.req.query.login as string).length > 0) {
            return await this.userService.getUserList(this.req.query.login);
        } else {
            return await this.userService.getUserList();
        }
    }

    public async removeAction() {
        if (!this.req.body.password) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        return this.userService.remove();
    }
}

