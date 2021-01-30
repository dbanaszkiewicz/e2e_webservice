import * as Express from "express";
import {UserService} from "./Service/UserService";
import {ServerError} from "./Error/ServerError";

export class Middleware
{
    private req: Express.Request = null;
    private res: Express.Response = null;

    public constructor(request: Express.Request, response: Express.Response) {
        this.req = request;
        this.res = response;
    }

    public async isLogged(): Promise<boolean>
    {
        if ((await UserService.getLoggedUser(this.req)) === null) {
            this.res.statusCode = 401;
            this.res.send({"error": {"message": 'Nie jesteś zalogowany!'}});
            return false;
        }
        return true;
    }
}
