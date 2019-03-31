// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { injectable} from "inversify";

import * as debug_ from "debug";
import * as moment from "moment";
import * as uuid from "uuid";

import { Identifiable } from "readium-desktop/common/models/identifiable";
import { Timestampable } from "readium-desktop/common/models/timestampable";

import { NotFoundError } from "readium-desktop/main/db/exceptions";

interface Index  {
    name: string;
    fields: string[];
}

export abstract class BaseRepository<D extends Identifiable & Timestampable> {
    protected db: PouchDB.Database;
    protected idPrefix: string;
    protected indexes: Index[];

    public constructor(db: PouchDB.Database, idPrefix: string, indexes?: Index[]) {
        this.db = db;
        this.idPrefix = idPrefix;
        this.indexes = (indexes == null) ? [] : indexes;
    }

    public buildId(documentIdentifier: string) {
        return this.idPrefix + "_" + documentIdentifier;
    }

    public async save(document: any): Promise<D> {
        let dbDoc = Object.assign(
            {},
            document,
            {
                updatedAt: moment.now(),
            },
        );

        if (document.identifier == null) {
            document.identifier = uuid.v4();
        }

        // Search if there is an existing document with the same identifier
        try {
            const origDbDoc = await this.db.get(
                this.buildId(document.identifier),
            ) as any;

            dbDoc = Object.assign(
                dbDoc,
                {
                    _id: origDbDoc._id,
                    _rev: origDbDoc._rev,
                    createdAt: origDbDoc.createdAt,
                },
            );
        } catch (error) {
            // Not found, so this is a new one
            dbDoc = Object.assign(
                dbDoc,
                {
                    identifier: document.identifier,
                    _id: this.buildId(document.identifier),
                    createdAt: dbDoc.updatedAt,
                },
            );
        }

        await this.db.put(dbDoc);
        return this.get(document.identifier);
    }

    public async get(identifier: string): Promise<D> {
        try {
            const dbDoc = await this.db.get(this.buildId(identifier));
            return this.convertToDocument(dbDoc);
        } catch (error) {
            throw new NotFoundError("document not found");
        }
    }

    public async delete(identifier: string): Promise<void> {
        const dbDoc = await this.db.get(this.buildId(identifier));
        await this.db.remove(dbDoc);
    }

    public async findAll(): Promise<D[]> {
        const result = await this.db.allDocs({
            include_docs: true,
            startkey: this.idPrefix + "_",
            endkey: this.idPrefix + "_\ufff0",
        });
        return result.rows.map((row) => {
            return this.convertToDocument(row.doc);
        });
    }

    public async findBy(selector: any): Promise<D[]> {
        await this.checkIndexes();

        try {
            const locatorQuery = await this.db.find({ selector });
            return locatorQuery.docs.map((doc) => {
                return this.convertToDocument(doc);
            });
        } catch (error) {
            throw error;
        }
    }

    protected convertToMinimalDocument(dbDoc: PouchDB.Core.Document<any>): D {
        return {
            identifier: dbDoc.identifier as string,
            createdAt: dbDoc.createdAt,
            updatedAt: dbDoc.updatedAt,
        } as any;
    }

    protected async buildIndex(index: Index) {
        try {

            await this.db.createIndex({
                index: {
                    fields: index.fields,
                    name: index.name,
                },
            });
        } catch (error) {
            throw error;
        }
    }

    protected async buildIndexes() {
        for (const index of this.indexes) {
            await this.buildIndex(index);
        }
    }

    /**
     * Check that indexes are correctly built
     */
    protected async checkIndexes() {
        let indexQuery = null;

        try {
            // Test if index exists
            indexQuery = await this.db.getIndexes();
        } catch (error) {
            throw error;
        }

        for (const index of this.indexes) {
            let indexExists = false;

            for (const dbIndex of indexQuery.indexes) {
                if (dbIndex.name === index.name) {
                    indexExists = true;
                    break;
                }
            }

            if (!indexExists) {
                // If not create index
                await this.buildIndex(index);
            }
        }
    }

    protected abstract convertToDocument(dbDoc: PouchDB.Core.Document<any>): D;
}