"use strict";
import Sequelize from "sequelize";
import {Group} from "./Group";
import {User} from "./User";

export class Message extends Sequelize.Model {
    id: string;
    group: string;
    from_user: string;
    to_user: string;
    message: string;
    type: string;
    is_read : boolean;
    date: any;

    public getGroup(): Promise<Group> {
        return Group.findOne({where: {id: this.group}});
    }

    public getFromUser(): Promise<User> {
        return User.findOne({where: {id: this.from_user}});
    }

    public getToUser(): Promise<User> {
        return User.findOne({where: {id: this.to_user}});
    }
}
export const initMessage = (sequelize) => {
    Message.init({
        id: {
            type: Sequelize.TEXT,
            allowNull: false,
            unique: true,
            primaryKey: true
        },
        group: {
            type: Sequelize.TEXT,
            references: {
                model: Group,
                key: 'id'
            }
        },
        from_user: {
            type: Sequelize.TEXT,
            references: {
                model: User,
                key: 'id'
            }
        },
        to_user: {
            type: Sequelize.TEXT,
            references: {
                model: User,
                key: 'id'
            }
        },
        message: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        type: {
            type: Sequelize.STRING,
            allowNull: false
        },
        is_read: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        date: {
            type: Sequelize.DATE
        }
    }, {
        sequelize,
        modelName: 'message'
    });
};
