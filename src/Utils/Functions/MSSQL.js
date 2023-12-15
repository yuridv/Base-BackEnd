const Errors = require('./Errors')
const { db } = require('../moldes')
const mssql = require('mssql')

const route = (name) => new Promise(async (res,rej) => {
  try {
    let credentials = await Credentials(name || 'DASH')
    if (credentials.error) return rej({ error: credentials });
    if (db.mssql[credentials.name]) return res(db.mssql[credentials.name]);

    db.mssql[credentials.name] = (new mssql.ConnectionPool({
      server: credentials.server,
      database: credentials.name,
      user: credentials.user,
      password: credentials.password,
      requestTimeout: 300000,
      pool: {
        max: 1000, min: 1,
        idleTimeoutMillis: 120_000_000,
        acquireTimeoutMillis: 120_000_000,
        createTimeoutMillis: 120_000_000,
        destroyTimeoutMillis: 120_000_000,
        reapIntervalMillis: 120_000_000,
        createRetryIntervalMillis: 120_000_000,
      },
      options: { encrypt: false, enableArithAbort: true, trustServerCertificate: true }
    })).connect()

    return res(db.mssql[credentials.name]);
  } catch(err) {
    return Errors(err, `MSSQL ${__filename}`)
      .then(() => { return route(name) })
      .catch((e) => { return rej(e) })
  }
})

module.exports = route

const Credentials = async (db) => {
  db = db ? `_${db}` : ''
  let credentials = {
    server: process.env[`MSSQL_SERVER${db}`],
    name: process.env[`MSSQL_NAME${db}`],
    user: process.env[`MSSQL_USER${db}`],
    password: process.env[`MSSQL_PASSWORD${db}`],
    port: process.env[`MSSQL_PORT${db}`],
  }
  if (!credentials.user || !credentials.password) return { status: 401, error: `O usuário ou senha do banco de dados não foi definido...` }
  return credentials;
}