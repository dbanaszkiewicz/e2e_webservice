"use strict";
import Sequelize from "sequelize";
import {User} from "./User";
import {Group} from "./Group";

export class UserGroup extends Sequelize.Model {
    user_id: string;
    group_id: string
}
export const initUserGroup = (sequelize) => {
    UserGroup.init({
        user_id: {
            type: Sequelize.TEXT,
            references: {
                model: User,
                key: 'id'
            },
            primaryKey: true
        },
        group_id: {
            type: Sequelize.TEXT,
            references: {
                model: Group,
                key: 'id'
            },
            primaryKey: true
        }
    }, {
        sequelize,
        modelName: 'user_group'
    });
};
