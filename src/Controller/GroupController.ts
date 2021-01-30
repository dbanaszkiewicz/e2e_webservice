"use strict";

import * as Express from "express";
import {ServerError} from "../Error/ServerError";
import {GroupService} from "../Service/GroupService";

export class GroupController {
    private req: Express.Request = null;
    private res: Express.Response = null;
    private groupService: GroupService;

    public constructor(request: Express.Request, response: Express.Response) {
        this.req = request;
        this.res = response;
        this.groupService = GroupService.getInstance(request, response);
    }

    public async changeAction() {

        if (!this.req.body || !this.req.body.id) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        if (!this.req.body.name && !this.req.body.public) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        return await this.groupService.change();
    }

    public async createAction() {
        if (!(this.req.body && this.req.body.name)) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        return await this.groupService.create();
    }

    public async getAvailableListAction() {
        return await this.groupService.getList();
    }

    public async getLastMessagesAction() {
        if (!this.req.query || !this.req.query.group_id) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        return await this.groupService.getLast25Messages();
    }

    public async getGroupInfoAction() {
        if (!this.req.query || !this.req.query.group_id) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        return await this.groupService.getGroupInfo();
    }

    public async leaveGroupAction() {
        if (!this.req.body || !this.req.body.group_id) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        return await this.groupService.leaveGroup();
    }

    public async joinAction() {
        if (!this.req.body || !this.req.body.user_id) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        return await this.groupService.join();
    }

    public async readGroupAction() {
        if (!this.req.body || !this.req.body.group_id || !this.req.body.date) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        return await this.groupService.readGroupMessages();
    }
    public async addUserGroupAction() {
        if (!this.req.body || !this.req.body.group_id || !this.req.body.user_id) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        return await this.groupService.addToGroup();
    }
    public async findNewUserAction() {
        if (!this.req.body || !this.req.body.group_id || !this.req.body.login) {
            throw new ServerError('Nie podano wymaganych danych!', 400);
        }

        return await this.groupService.findNewUser();
    }

}

