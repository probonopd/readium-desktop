import "reflect-metadata";

import * as fs from "fs";
import * as path from "path";

import { app } from "electron";
import { Store } from "redux";

import { Container } from "inversify";
import getDecorators from "inversify-inject-decorators";

import { Server } from "r2-streamer-js";

import { Downloader } from "readium-desktop/downloader/downloader";
import { Translator } from "readium-desktop/i18n/translator";
import { AppState } from "readium-desktop/main/reducers";
import { OPDSParser } from "readium-desktop/services/opds";

import { store } from "readium-desktop/main/store/memory";
import { streamer } from "readium-desktop/main/streamer";

import { OpdsDb } from "readium-desktop/main/db/opds-db";
import { PublicationDb } from "readium-desktop/main/db/publication-db";
import {
    PublicationStorage,
} from "readium-desktop/main/storage/publication-storage";

import * as PouchDBCore from "pouchdb-core";

import * as jsondown from "jsondown";
import * as leveldown from "leveldown";

import LevelDBAdapter from "pouchdb-adapter-leveldb";

// Preprocessing directive
declare const __NODE_ENV__: string;

// Create container used for dependency injection
let container = new Container();

// Create databases
let PouchDB = (PouchDBCore as any).default;

const rootDbPath = path.join(
    app.getPath("userData"),
    (__NODE_ENV__ === "DEV") ? "db-dev" : "db",
);

if (!fs.existsSync(rootDbPath)) {
    fs.mkdirSync(rootDbPath);
}

// Load PouchDB plugins
PouchDB
    .plugin(LevelDBAdapter);

let dbOpts = {
    adapter: "leveldb",
    db: (__NODE_ENV__ === "DEV") ? jsondown : leveldown,
};

// Publication db
const publicationDb = new PouchDB(
    path.join(rootDbPath, "publications"),
    dbOpts,
);

// OPDS db
const opdsDb = new PouchDB(
    path.join(rootDbPath, "opds-dev"),
    dbOpts,
);

// Create filesystem storage for publications
const publicationRepositoryPath = path.join(
    app.getPath("userData"),
    "publications",
);

if (!fs.existsSync(publicationRepositoryPath)) {
    fs.mkdirSync(publicationRepositoryPath);
}

// Bind services
container.bind<Translator>("translator").to(Translator);
container.bind<Store<AppState>>("store").toConstantValue(store);
container.bind<Server>("streamer").toConstantValue(streamer);
container.bind<OPDSParser>("opds-parser").to(OPDSParser);
container.bind<Downloader>("downloader").toConstantValue(
    new Downloader(app.getPath("temp"), store),
);
container.bind<PublicationDb>("publication-db").toConstantValue(
    new PublicationDb(publicationDb),
);
container.bind<OpdsDb>("opds-db").toConstantValue(
    new OpdsDb(opdsDb),
);
container.bind<PublicationStorage>("publication-storage").toConstantValue(
    new PublicationStorage(publicationRepositoryPath),
);

let {
    lazyInject,
    lazyInjectNamed,
    lazyInjectTagged,
    lazyMultiInject,
} = getDecorators(container);

export {
    container,
    lazyInject,
    lazyInjectNamed,
    lazyInjectTagged,
    lazyMultiInject,
};
