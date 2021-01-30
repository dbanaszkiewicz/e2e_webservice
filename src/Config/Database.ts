"use strict";
import {initUser} from "../Entity/User";
import {initGroup} from "../Entity/Group";
import {initMessage} from "../Entity/Message";
import {initUserGroup} from "../Entity/UserGroup";

const Sequelize = require('sequelize');

export class Database
{
    public static sequelize: any = null;

    public static async initialize() : Promise<Database>
    {
        await this.connect();

        return this;
    }

    private static async connect() : Promise<any> {
        return new Promise((resolve, reject) => {
            Database.sequelize = new Sequelize('e2e_db', 'e2e_user', 'example', {
                define: {
                    createdAt: "created_at",
                    updatedAt: "updated_at"
                },
                host: 'db',
                dialect: 'postgres'
            });

            Database.sequelize.authenticate()
                .then(async () => {
                    initUser(Database.sequelize);
                    initGroup(Database.sequelize);
                    initUser(Database.sequelize);
                    initMessage(Database.sequelize);
                    initUserGroup(Database.sequelize);
                    console.info("Connection with database established");
                    resolve();
                })
                .catch(err => {
                    console.error(err);
                    console.error('Connection to database failed');
                    reject(err);
                });
        });
    }
}
