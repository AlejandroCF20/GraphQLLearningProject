'use strict';
const { MongoClient } = require('mongodb');

const {
    DB_PORT,
    DB_HOST,
    DB_NAME
} = process.env;

const mongoUrl = `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;
let connection;
async function connectDB(){
    if (connection) return connection;
    console.log(mongoUrl);
    let dbConnection, client;
    try {
        client = await MongoClient.connect(mongoUrl, {
            useNewUrlParser: true
        });
        connection = client.db(DB_NAME);
    } catch (e) {
        console.error("Couldn't connect to the database");
        process.exit(1);
    }
    return connection;
}

module.exports = connectDB;