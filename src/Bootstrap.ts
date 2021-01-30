"use strict";

import * as Express from "express";
import {PathParams} from "express-serve-static-core";
import {Database} from "./Config/Database";
import {ServerError} from "./Error/ServerError";
import {Middleware} from "./Middleware";
import {RoutesMap} from "./Config/RoutesMap.conf";

export interface RouteMapInterface {
    path: PathParams;
    method: string;
    controller: object;
    action: () => Promise<any>
    middleware: Array<string>;
}

export class Bootstrap {
    public constructor(app: Express.Application) {
        Database.initialize().then(() => {
           for (let route of RoutesMap) {
                // Creating requests
                app[route.method](route.path, (req: Express.Request, res: Express.Response) => {
                    Bootstrap.run(route.controller, route.action, req, res, route.middleware).then();
                });
            }

            // Otherwise, when route not found
            app.all(/.*/, (req: Express.Request, res: Express.Response) => {
                res.statusCode = 404;
                res.send({
                    "error": {
                        "code": 404,
                        "message": "Route not found!"
                    }
                });
            })
        }).catch(reason => {
            console.error('Cannot connect to database. Exiting...');
            process.exit(0);
        });
    }

    private static async run(controller: any, action: any, req: Express.Request, res: Express.Response, middleware: any): Promise<any> {
        try {
            let successAfterMiddleware = await Bootstrap.runMiddleware(req, res, middleware);
            if (successAfterMiddleware) {
                // Create controller object
                let Ctrl: any = new controller(req, res);

                // Send Response from executed controller action
                res.send(await Ctrl[action.name]());
            }
        } catch (err) {
            if (err instanceof ServerError) {
                res.statusCode = err.getCode();
                res.send(err.serialize());
            } else {
                /// When controller throw exception
                console.error(err);
                res.statusCode = 500;
                res.send(Error('Wystąpił wewnętrzny błąd serwera...'));
            }
        }
    }

    private static async runMiddleware(req: Express.Request, res: Express.Response, middleware: any): Promise<boolean> {
        let middlewareClass = new Middleware(req, res);
        for (let middlewareItem of middleware) {
            if (await middlewareClass[middlewareItem]() === false) {
                return false;
            }
        }

        return true;
    }
}


