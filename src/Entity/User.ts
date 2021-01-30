"use strict";
import Sequelize from "sequelize";

export class User extends Sequelize.Model {
    id: string;
    login: string;
    password: string;
    public_key: string;
}
export const initUser = (sequelize) => {
    User.init({
        id: {
            type: Sequelize.TEXT,
            allowNull: false,
            unique: true,
            primaryKey: true
        },
        login: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        password: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
        public_key: {
            type: Sequelize.TEXT,
            allowNull: false,
            unique: true,
        },
    }, {
        sequelize,
        modelName: 'user'
    });
};
