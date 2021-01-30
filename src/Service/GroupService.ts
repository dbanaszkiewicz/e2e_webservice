"use strict";

import * as Express from "express";
import {ServerError} from "../Error/ServerError";
import {UserService} from "./UserService";
import {Group} from "../Entity/Group";
import {UserGroup} from "../Entity/UserGroup";
import {User} from "../Entity/User";
import {Op} from "sequelize";
import {Database} from "../Config/Database";
import {Message} from "../Entity/Message";

const uniqueString = require('unique-string');
const NodeRSA = require('node-rsa');

export class GroupService {
    private static instance: GroupService = null;
    private req: Express.Request = null;
    private res: Express.Response = null;

    public static getInstance(request: Express.Request, response: Express.Response): GroupService {
        if (this.instance === null) {
            this.instance = new GroupService(request, response);
        } else {
            this.instance.req = request;
            this.instance.res = response;
        }

        return this.instance;
    }

    private constructor(request: Express.Request, response: Express.Response) {
        this.req = request;
        this.res = response;
    }

    public async change() {
        let group: Group;
        if (this.req.body.id) {
            group = await Group.findOne({where: {'id': this.req.body.id}}) as Group;
        }

        if (group.type === 'private') {
            throw new ServerError('Taka grupa nie istnieje!', 400);
        }

        if (this.req.body.name && this.req.body.name.length > 3) {
            group.name = this.req.body.name;
        }

        await group.save();

        return {
            "id": group.id,
            "name": group.name,
        };
    }

    public async create(): Promise<any> {
        let user: User = await UserService.getInstance(this.req, this.res).getLoggedUser();
        let group: Group = await Group.create({
            id: uniqueString(),
            name: this.req.body.name,
            type: 'group',
            last_message: new Date().getTime()
        });

        await UserGroup.create({
            user_id: user.id,
            group_id: group.id
        });

        await GroupService.sendGroupMessage(group, "Grupa została utworzona przez użytkownika " + user.login);

        return {
            'id': group.id,
            'name': group.name,
            'type': group.type,
        }
    }

    public async addToGroup() {
        let user = (await UserService.getInstance(this.req, this.res).getLoggedUser());
        let userId = user.id;
        let group: Group = await Group.findOne({where: {'id': this.req.body.group_id}});

        if (group === null || !(await group.isUserInGroup(userId))) {
            throw new ServerError("Taka grupa nie istnieje!", 400);
        }

        if (group.type === 'private') {
            throw new ServerError("Taka grupa nie istnieje!", 400);
        }

        if (await group.isUserInGroup(this.req.body.user_id)) {
            throw new ServerError("Użytkownik należy już do tej grupy!", 406)
        }

        if (userId !== this.req.body.user_id) {
            const newUser: User = await User.findOne({where: {id: this.req.body.user_id}});

            if (newUser) {
                await UserGroup.create({
                    user_id: newUser.id,
                    group_id: group.id
                });

                UserService.sendWsMessage(this.req.body.user_id, {
                    new_group: {
                        id: group.id,
                        name: group.name,
                        type: group.type,
                        newMessages: 0
                    }
                });

                let ugUsers = await UserGroup.findAll({where: {group_id: group.id}});

                for (let u of ugUsers) {
                    UserService.sendWsMessage(u.user_id, {
                        user_join: {
                            group: group.id,
                            user: {
                                id: newUser.id,
                                login: newUser.login,
                                public_key: newUser.public_key
                            }
                        }
                    })
                }

                await GroupService.sendGroupMessage(group, 'Użytkownik ' + newUser.login + ' został dodany do grupy przez ' + user.login + '.');
            } else {
                throw new ServerError("Taki użytkownik nie istnieje!", 406)
            }
        }
    }

    public static async sendGroupMessage(group: Group, message: string) {
        const userGroups: UserGroup[] = await UserGroup.findAll({where: {group_id: group.id}});

        const ids = [];
        for (let user of userGroups) {
            ids.push(user.user_id)
        }

        const users: User[] = await User.findAll({where: {id: {[Op.in]: ids}}});

        for (let user of users) {
            const key = new NodeRSA();
            key.setOptions({encryptionScheme: 'pkcs1'});
            try {
                key.importKey(user.public_key);
                if (key.isPublic()) {
                    let encrypted = '';
                    for (let str of this.chunkSubstr(message)) {
                        if (encrypted.length > 0) {
                            encrypted += ':|:' + key.encrypt(str, 'base64', 'utf8');
                        } else {
                            encrypted += key.encrypt(str, 'base64', 'utf8');
                        }
                    }
                    await GroupService.sendMessageAction(null, user.id, group, 'service', encrypted);
                }
            } catch (e) {
                console.log(e);
            }
        }
    }

    private static chunkSubstr(str) {
        const size = 25;
        const numChunks = Math.ceil(str.length / size)
        const chunks = new Array(numChunks)

        for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
            chunks[i] = str.substr(o, size)
        }

        return chunks
    }

    public static async sendMessageAction(from: User, to: string, group: Group, type: string, message: string) {
        let m = await Message.create({
            id: uniqueString(),
            group: group.id,
            from_user: from !== null ? from.id : null,
            to_user: to,
            message: message,
            type: type,
            is_read: false,
            date: new Date()
        });

        let data = {
            message: {
                'id': m.id,
                'is_read': m.is_read,
                "type": type,
                "message": m.message,
                "date": m.date,
                "group": {
                    id: group.id,
                    name: group.name
                },
                "user": {
                    id: from !== null ? from.id : null,
                    login: from !== null ? from.login : null
                },
                "my": from && from.id && from.id === to
            }
        };
        UserService.sendWsMessage(to, data);
    }

    public static async sendMessage(data: any, sid: any) {
        let user = await UserService.getLoggedUserBySid(sid);
        let group: Group = await Group.findOne({where: {'id': data.group}});

        if (user !== null && group !== null && await group.isUserInGroup(user.id)) {
            await this.sendMessageAction(user, data.to_user, group, 'message', data.message);

            group.last_message = new Date().getTime();
            await group.save();
        }
    }

    public async getList(): Promise<any> {
        let user = (await UserService.getInstance(this.req, this.res).getLoggedUser());
        let groups: Group[] = await Database.sequelize.query(
            'SELECT * FROM user_groups ug JOIN groups g on ug.group_id = g.id WHERE user_id = :user ORDER BY g.last_message DESC',
            {replacements: {user: user.id}, model: Group, mapToModel: true}
        );

        let list = [];

        for (let item of groups) {
            let name = item.name;
            if (item.type === 'private') {
                let u = await Database.sequelize.query('SELECT login FROM users JOIN user_groups ug on users.id = ug.user_id WHERE ug.group_id = :group AND ug.user_id != :user',
                    {replacements: {group: item.id, user: user.id}});
                if (u[0].length > 0) {
                    name = u[0][0].login;
                }
            }

            let newMessages = await Message.findAll({where: {group: item.id, to_user: user.id, is_read: false}});

            list.push({
                id: item.id,
                name: name,
                type: item.type,
                newMessages: newMessages.length
            });
        }

        return list;
    }

    public async getLast25Messages(): Promise<Message[]> {
        let user = (await UserService.getInstance(this.req, this.res).getLoggedUser());
        let group: Group = await Group.findOne({where: {'id': this.req.query.group_id}});

        if (group === null || !(await group.isUserInGroup(user.id))) {
            throw new ServerError("Taka grupa nie istnieje!", 400);
        }

        let messages: any[] = [];

        if (this.req.query.f_date) {
            if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test((this.req.query.f_date as string))) {
                messages = await Database.sequelize.query('SELECT m.id id, type, is_read, date, message, from_user, login FROM messages m JOIN users u on m.from_user = u.id WHERE to_user = :user AND "group" = :group and date < :date ORDER BY date DESC LIMIT 15',
                    {replacements: {user: user.id, group: group.id, date: this.req.query.f_date}});
                messages = messages[0];
            } else {
                throw new ServerError('Wystąpił błąd serwera', 404);
            }
        } else {
            messages = await Database.sequelize.query('SELECT m.id id, type, is_read, date, message, from_user, login FROM messages m LEFT JOIN users u on m.from_user = u.id WHERE to_user = :user AND "group" = :group ORDER BY date DESC LIMIT 25',
                {replacements: {user: user.id, group: group.id}});
            messages = messages[0].reverse();
        }

        let returnMessages = [];

        for (let message of messages) {
            returnMessages.push({
                    'id': message.id,
                    'type': message.type,
                    'is_read': message.is_read,
                    'date': message.date,
                    'message': message.message,
                    'user': {
                        'id': message.from_user,
                        'login': message.login,
                    },
                    'my': user.id === message.from_user
                }
            );
        }
        return returnMessages;
    }

    public async readGroupMessages() {
        let user = (await UserService.getInstance(this.req, this.res).getLoggedUser());
        let group: Group = await Group.findOne({where: {'id': this.req.body.group_id}});

        if (group && await group.isUserInGroup(user.id)) {
            await Database.sequelize.query('UPDATE messages SET is_read = true WHERE to_user = :user AND "group" = :group AND date <= :date',
                {replacements: {user: user.id, group: group.id, date: this.req.body.date}});

            return true;
        }

        return false;
    }

    public async getGroupInfo() {
        let user = (await UserService.getInstance(this.req, this.res).getLoggedUser());
        let group: Group = await Group.findOne({where: {'id': this.req.query.group_id}});

        if (group === null || !(await group.isUserInGroup(user.id))) {
            throw new ServerError("Taka grupa nie istnieje!", 400);
        }

        let users: User[] = await Database.sequelize.query(
            'SELECT * FROM user_groups user_groups JOIN users u on user_groups.user_id = u.id WHERE group_id = :group and password != \'\' AND public_key != \'\'',
            {replacements: {group: group.id}, model: User, mapToModel: true}
        );

        let groupUsers = [];

        for (let u of users) {
            groupUsers.push({
                'id': u.id,
                'login': u.login,
                'public_key': u.public_key
            });
        }

        let name = group.name;
        if (group.type === 'private') {
            let u = await Database.sequelize.query('SELECT login FROM users JOIN user_groups ug on users.id = ug.user_id WHERE ug.group_id = :group AND ug.user_id != :user',
                {replacements: {group: group.id, user: user.id}});
            if (u[0].length > 0) {
                name = u[0][0].login;
            }
        }

        return {
            'id': group.id,
            'name': name,
            'type': group.type,
            'users': groupUsers
        };
    }

    public async leaveGroup() {
        let user = (await UserService.getInstance(this.req, this.res).getLoggedUser());
        let group: Group = await Group.findOne({where: {'id': this.req.body.group_id}});

        if (group === null || !(await group.isUserInGroup(user.id))) {
            throw new ServerError("Taka grupa nie istnieje!", 400);
        }

        await Database.sequelize.query('DELETE FROM user_groups WHERE user_id = :user AND group_id = :group',
            {replacements: {user: user.id, group: group.id}});

        UserService.sendWsMessage(user.id, {leave_group: {group: group.id}});

        let ugUsers = await UserGroup.findAll({where: {group_id: group.id}});

        for (let u of ugUsers) {
            UserService.sendWsMessage(u.user_id, {
                user_leave: {
                    group: group.id,
                    user: {
                        id: user.id,
                        login: user.login,
                        public_key: user.public_key
                    }
                }
            })
        }

        await GroupService.sendGroupMessage(group, 'Użytkownik ' + user.login + ' opuścił konwersację');

        return true;
    }

    public async findNewUser() {
        let user = (await UserService.getInstance(this.req, this.res).getLoggedUser());
        let group: Group = (await Group.findOne({where: {id: this.req.body.group_id}}));

        if (user && group && group.isUserInGroup(user.id)) {
            let users: User[] = await Database.sequelize.query("" +
                "WITH tmp AS (SELECT u.id FROM users u JOIN user_groups ug on u.id = ug.user_id WHERE group_id = :group)" +
                "SELECT * FROM users WHERE id NOT IN (SELECT id FROM tmp) AND login ILIKE :login AND password != '' AND public_key != ''",
                {replacements: {group: group.id, login: '%' + this.req.body.login + '%'}, model: User, mapToModel: true});

            let rUsers = [];

            for (let u of users) {
                rUsers.push({
                    id: u.id,
                    login: u.login
                });
            }

            return rUsers;
        } else {
            throw new ServerError('Wystąpił błąd serwera.', 500);
        }
    }

    public async join() {
        let user = (await UserService.getInstance(this.req, this.res).getLoggedUser());

        if (this.req.body.user_id) {
            if (user.id === this.req.body.user_id) {
                throw new ServerError('Nie możesz napisać wiadomości do siebie!', 400);
            }

            let group = await Database.sequelize.query(
                'WITH tmp as (SELECT group_id FROM user_groups WHERE user_id=:user1 OR user_id=:user2 GROUP BY group_id HAVING COUNT(1) = 2)' +
                'SELECT * FROM groups WHERE type=:type AND id IN (SELECT group_id FROM tmp)',
                {replacements: {user1: user.id, user2: this.req.body.user_id, type: 'private'}});

            if (group[0].length > 0) {
                return {id: group[0][0].id};
            } else {
                let u: User = await User.findOne({where: {id: this.req.body.user_id, password: {[Op.ne]: ''}, public_key: {[Op.ne]: ''}}});

                if (u) {
                    let g: Group = await Group.create({
                        id: uniqueString(),
                        name: 'Private group',
                        type: 'private',
                        public: false,
                        last_message: new Date().getTime()
                    });

                    await UserGroup.create({
                        user_id: user.id,
                        group_id: g.id
                    });
                    await UserGroup.create({
                        user_id: this.req.body.user_id,
                        group_id: g.id
                    });

                    UserService.sendWsMessage(user.id, {
                        new_group: {
                            id: g.id,
                            name: u.login,
                            public: g.public,
                            type: g.type,
                            newMessages: 0
                        }
                    });
                    UserService.sendWsMessage(u.id, {
                        new_group: {
                            id: g.id,
                            name: user.login,
                            public: g.public,
                            type: g.type,
                            newMessages: 0
                        }
                    });

                    GroupService.sendGroupMessage(g, user.login + ' rozpoczął konwersację');

                    return {id: g.id};
                } else {
                    throw new ServerError('Taki użytkownik nie istnieje!', 406);
                }
            }
        }

    }
}
