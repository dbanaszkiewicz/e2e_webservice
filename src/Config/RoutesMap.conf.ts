import {RouteMapInterface} from "../Bootstrap";
import {UserController} from "../Controller/UserController";
import {GroupController} from "../Controller/GroupController";

const methods = {
    "POST": "post",
    "GET": "get",
    "PUT": "put",
    "DELETE": "delete",
};


const userControllerRoutes: Array<RouteMapInterface> = [
    {
        "path": "/user/get",
        "controller": UserController,
        "action": UserController.prototype.getInfoAction,
        "method": methods.GET,
        "middleware": []
    },
    {
        "path": "/user/login",
        "controller": UserController,
        "action": UserController.prototype.loginAction,
        "method": methods.POST,
        "middleware": []
    },
    {
        "path": "/user/register",
        "controller": UserController,
        "action": UserController.prototype.registerAction,
        "method": methods.PUT,
        "middleware": []
    },
    {
        "path": "/user/find",
        "controller": UserController,
        "action": UserController.prototype.findAction,
        "method": methods.GET,
        "middleware": ["isLogged"]
    },
    {
        "path": "/user/change",
        "controller": UserController,
        "action": UserController.prototype.changeAction,
        "method": methods.POST,
        "middleware": ["isLogged"]
    },
    {
        "path": "/user/remove",
        "controller": UserController,
        "action": UserController.prototype.removeAction,
        "method": methods.POST,
        "middleware": ["isLogged"]
    }
];

const groupControllerRoutes: Array<RouteMapInterface> = [
    {
        "path": "/group/create",
        "controller": GroupController,
        "action": GroupController.prototype.createAction,
        "method": methods.PUT,
        "middleware": ["isLogged"]
    },
    {
        "path": "/group/change",
        "controller": GroupController,
        "action": GroupController.prototype.changeAction,
        "method": methods.POST,
        "middleware": ["isLogged"]
    },
    {
        "path": "/group/get-available",
        "controller": GroupController,
        "action": GroupController.prototype.getAvailableListAction,
        "method": methods.GET,
        "middleware": ["isLogged"]
    },
    {
        "path": "/group/get-last-messages",
        "controller": GroupController,
        "action": GroupController.prototype.getLastMessagesAction,
        "method": methods.GET,
        "middleware": ["isLogged"]
    },
    {
        "path": "/group/get",
        "controller": GroupController,
        "action": GroupController.prototype.getGroupInfoAction,
        "method": methods.GET,
        "middleware": ["isLogged"]
    },
    {
        "path": "/group/leave",
        "controller": GroupController,
        "action": GroupController.prototype.leaveGroupAction,
        "method": methods.POST,
        "middleware": ["isLogged"]
    },
    {
        "path": "/group/join",
        "controller": GroupController,
        "action": GroupController.prototype.joinAction,
        "method": methods.PUT,
        "middleware": ["isLogged"]
    },
    {
        "path": "/group/read",
        "controller": GroupController,
        "action": GroupController.prototype.readGroupAction,
        "method": methods.POST,
        "middleware": ["isLogged"]
    },
    {
        "path": "/group/find-new-user",
        "controller": GroupController,
        "action": GroupController.prototype.findNewUserAction,
        "method": methods.POST,
        "middleware": ["isLogged"]
    },
    {
        "path": "/group/add-user",
        "controller": GroupController,
        "action": GroupController.prototype.addUserGroupAction,
        "method": methods.POST,
        "middleware": ["isLogged"]
    }

];

export const RoutesMap: Array<RouteMapInterface> = [
    ...userControllerRoutes,
    ...groupControllerRoutes,
];
