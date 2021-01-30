"use static";

export class ServerError {

    private readonly code = 500;

    private readonly message = null;

    constructor(message, code = null) {
        this.message = message;

        if (code) {
            this.code = code;
        }
    }

    public getCode(): number {
        return this.code;
    }

    public serialize(){
        return {"error": {"message": this.message}}
    }
}