"use strict";

import {Database} from "./src/Config/Database";

async function sync() {
    await Database.initialize();

    await Database.sequelize.sync();
}

sync();
