"use strict";

import * as Express from "express";
import * as WebSocket from 'ws';
import {ServerError} from "../Error/ServerError";
import {User} from "../Entity/User";
import {Op} from "sequelize";
import {Database} from "../Config/Database";
import {Group} from "../Entity/Group";
import {GroupService} from "./GroupService";
const uniqueString = require('unique-string');

let bcrypt = require('bcryptjs');
let uuidv4 = require('uuid/v4');

export class UserService {
    private req: Express.Request = null;
    private res: Express.Response = null;
    public static sessions: Session[] = [];
    private static instance: UserService = null;

    private constructor(request: Express.Request, response: Express.Response) {
        this.req = request;
        this.res = response;
    }

    public static getInstance(request: Express.Request, response: Express.Response): UserService {
        if (this.instance === null) {
            this.instance = new UserService(request, response);
        } else {
            this.instance.req = request;
            this.instance.res = response;
        }

        return this.instance;
    }

    /**
     * Zwraca model aktualnie zalogowanego użytkownika
     * @param req
     */
    public static async getLoggedUser(req: Express.Request): Promise<User> {
        return await(new UserService(req, null)).getLoggedUser();
    }

    public async getLoggedUser(): Promise<User> {
        if (this.req.cookies.sid) {
            for (let session of UserService.sessions) {
                if (session.sid === this.req.cookies.sid) {
                    return await User.findOne({ where: {id: session.user_id}});
                }
            }
        }

        return null;
    }

    public static async getLoggedUserBySid(sid: string): Promise<User> {
        for (let session of UserService.sessions) {
            if (session.sid === sid) {
                return await User.findOne({where: {id: session.user_id}});
            }
        }
        return null;
    }

    public static setWsClient(sid: string, ws: WebSocket) {
        let ok = false;

        for (let key of Object.keys(UserService.sessions)) {
            if (UserService.sessions[key].sid === sid) {
                UserService.sessions[key].ws.push(ws);
                ok = true
            }
        }

        if (!ok) {
            ws.close()
        }
    }

    public static sendWsMessage(to: string, data: object) {
        for (let session of UserService.sessions) {
            if (session.user_id === to) {
                for (const ws of session.ws) {
                    if (session.ws && ws.readyState === WebSocket.OPEN) {
                        if (typeof ws.send === 'function') {
                            ws.send(JSON.stringify(data));
                        }
                    }
                }
            }
        }
    }

    public async login() {
        if (await this.getLoggedUser()) {
            return await this.getLoggedUser();
        }
        let user = await User.findOne({ where: {login: this.req.body.login, password: {[Op.ne]: ''}, public_key: {[Op.ne]: ''}}});

        if (user === null || bcrypt.compareSync(this.req.body.password, user.password) === false) {
            throw new ServerError("Podane dane logowania są nieprawiłowe!", 406)
        } else if (user.public_key !== this.req.body.public_key) {
            throw new ServerError("Przesłany klucz szyfrowania jest nieprawidłowy!", 406)
        } else {
            let sid: string = uuidv4();
            let expire: any = new Date(Date.now() + 1000 * 60 * 60 * 3);
            this.res.cookie('sid', sid, {expires: expire}); // 3 godziny
            this.req.cookies.sid = sid;

            let session = new Session();
            session.user_id = user.id;
            session.login = user.login;
            session.sid = sid;
            session.created = new Date(Date.now());
            session.expire = expire;
            session.ws = [];

            UserService.sessions.push(session);

            return true;
        }
    }

    public async changeData() {
        let user = await this.getLoggedUser();

        if (user === null || bcrypt.compareSync(this.req.body.oldPassword, user.password) === false) {
            throw new ServerError("Podane aktualne hasło jest niepoprawne!", 406)
        }

        if (this.req.body.password && this.req.body.password.length > 3) {
            let salt = bcrypt.genSaltSync(10);
            user.password = bcrypt.hashSync(this.req.body.password, salt);
        }

        await user.save();

        return {
            "id": user.id,
            "login": user.login,
            'public_key': user.public_key
        };
    }

    public async register() {
        let salt = bcrypt.genSaltSync(10);
        let hash = bcrypt.hashSync(this.req.body.password, salt);

        User.create({
            id: uniqueString(),
            login: this.req.body.login,
            password: hash,
            public_key: this.req.body.public_key
        });
    }

    public async getInfo() {
        let user: User = await this.getLoggedUser();

        if (user) {
            return {
                "id": user.id,
                "login": user.login,
                "public_key": user.public_key
            };
        } else {
            return {
                "id": null,
                "login": null,
                "public_key": null
            };
        }
    }

    public async isLoginInUse(login: string): Promise<boolean> {
        let user = await User.findOne({ where: {login: login, password: {[Op.ne]: ''}, public_key: {[Op.ne]: ''}}});
        return user !== null;
    }

    public async isPublicKeyInUse(key: string): Promise<boolean> {
        let user = await User.findOne({ where: {public_key: key}});
        return user !== null;
    }

    public async getUserList(login = null): Promise<User[]>
    {
        let list = [];
        let user = await this.getLoggedUser();

        let users;
        if (login !== null && login.length > 0) {
            users = await User.findAll({where: {
                    [Op.and]: [
                        {login: {[Op.iLike]: '%' + login + '%'}},
                        {id: {[Op.ne]: user.id}},
                        {password: {[Op.ne]: ''}},
                        {public_key: {[Op.ne]: ''}}
                    ]
                }
            });
        } else {
            users = await User.findAll();
        }

        for (let user of await users) {
                list.push({
                    "id": user.id,
                    "login": user.login,
                    "public_key": user.public_key,
                });

        }
        return list;
    }

    public async remove() {
        let user = await this.getLoggedUser();

        if (user === null || bcrypt.compareSync(this.req.body.password, user.password) === false) {
            throw new ServerError("Podane aktualne hasło jest niepoprawne!", 406)
        }

        let groups: Group[] = await Database.sequelize.query("SELECT * FROM groups JOIN user_groups ug on groups.id = ug.group_id WHERE ug.user_id = :user",
            {replacements: {user: user.id}, model: Group, mapToModel: true});

        await Database.sequelize.query("DELETE FROM messages WHERE to_user = :user", {replacements: {user: user.id}});
        await Database.sequelize.query(
            "WITH tmp as (SELECT ug.group_id id FROM user_groups ug JOIN groups g on ug.group_id = g.id WHERE g.type != 'private')" +
            "DELETE FROM user_groups  WHERE user_id = :user AND group_id IN (SELECT id FROM tmp)", {replacements: {user: user.id}});
        await Database.sequelize.query("UPDATE users SET password='', public_key='' WHERE id = :user", {replacements: {user: user.id}});

        for (let group of groups) {
            GroupService.sendGroupMessage(group, 'Użytkownik ' + user.login + ' opuścił konwersację.');
        }

        return true;
    }
}

class Session {
    user_id: string;
    login: string;
    sid: string;
    created: Date;
    expire: Date;
    ws: WebSocket[];
}
