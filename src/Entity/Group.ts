"use strict";
import Sequelize, {Op} from "sequelize";
import {UserGroup} from "./UserGroup";

export class Group extends Sequelize.Model {
    id: string;
    name: string;
    type: string;
    public: boolean;
    last_message: any;

    public async isUserInGroup(userId): Promise<boolean> {
        return (await UserGroup.findOne({where: {user_id: userId, group_id: this.id}})) !== null;
    }
}
export const initGroup = (sequelize) => {
    Group.init({
        id: {
            type: Sequelize.TEXT,
            allowNull: false,
            unique: true,
            primaryKey: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        type: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        last_message: {
            type: Sequelize.DATE
        }
    }, {
        sequelize,
        modelName: 'group'
    });
};
