import { CoordinatorDriverBase } from '../../abstracts'
import knex, { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'
import { DateTime } from 'luxon'
import { CoordinatorTestFailedError } from '../CoordinatorTestFailedError'
import type * as RMQBQ from 'contracts/RMQBQ'

export class DatabaseCoordinator extends CoordinatorDriverBase<RMQBQ.DatabaseOptions> {
  readonly #table: string
  #client: Knex

  /**
   * @private
   */
  constructor(queue: string, maxBatch: number, interval: number, options: RMQBQ.DatabaseOptions) {
    super(queue, maxBatch, interval, options)
    this.#client = knex(options)
    this.#table = options.table
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.balance}
   */
  public get balance(): Promise<number> {
    return this.#getBalance()
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.ready}
   */
  public async ready(): Promise<void> {
    return
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.increment}
   */
  public async increment(count: number): Promise<void> {
    const toInsert = {
      uuid: uuidv4(),
      queue: this.$queue,
      count,
      expires_at: DateTime.utc().plus({ milliseconds: this.$interval }).toJSDate(),
    }
    await this.#client(this.#table).insert(toInsert)
    return
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.reset}
   */
  public async reset(): Promise<void> {
    await this.#client(this.#table).where('queue', this.$queue).del()
    return
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.declutter}
   */
  public async declutter(): Promise<void> {
    const now = DateTime.utc().toJSDate()
    await this.#client(this.#table).where('expires_at', '<=', now).del()
    return
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.test}
   */
  public async test(): Promise<void> | never {
    try {
      await this.#client.raw('select 1+1 as result')
    } catch (error) {
      throw new CoordinatorTestFailedError(error)
    }
    return
  }

  async #getBalance(): Promise<number> {
    const now = DateTime.utc().toJSDate()
    const query = this.#client(this.#table)
      .where('queue', this.$queue)
      .where('expires_at', '>', now)
      .first()
      .sum('count as count')
    const { count } = await query
    let balance: number
    switch (typeof count) {
      case 'number':
        balance = this.$maxBatch - count
        break
      case 'string':
        balance = this.$maxBatch - parseInt(count)
        break
      default:
        balance = this.$maxBatch
        break
    }
    return balance <= 0 ? 0 : balance
  }

  /**
   * Prepares the database for use by the coordinator by creating the necessary tables.
   * @param options The options for connecting to the database. See {@link DatabaseOptions}
   * @param expectClean If set to `true`, an error will be thrown if the database has already been prepared.
   */
  public static async prepare(
    options: RMQBQ.DatabaseOptions,
    expectClean: boolean = false
  ): Promise<void> {
    const { table } = options
    const client = knex(options)
    const exists = await client.schema.hasTable(table)
    if (!exists) {
      await client.schema.createTable(table, (table) => {
        table.increments('id').primary()
        table.uuid('uuid').unique().notNullable()
        table.string('queue').index().notNullable()
        table.integer('count').unsigned().notNullable()
        table.timestamp('expires_at', { useTz: true, precision: 3 }).notNullable()
      })
    } else if (expectClean) {
      throw new Error(`Table ${table} already exists.`)
    }
  }

  /**
   * Cleans up the database from coordinator usage by dropping the tables created during preparation.
   * @param options The options for connecting to the database. See {@link DatabaseOptions}
   * @param expectDirty If set to `true`, an error will be thrown if the database has not been prepared.
   */
  public static async cleanup(
    options: RMQBQ.DatabaseOptions,
    expectDirty: boolean = false
  ): Promise<void> {
    const { table } = options
    const client = knex(options)
    const exists = await client.schema.hasTable(table)
    if (exists) {
      await client.schema.dropTable(table)
    } else if (expectDirty) {
      throw new Error(`Table ${table} does not exist.`)
    }
  }

  /**
   * Check to see if the database has been previously prepared for use by the coordinator.
   *
   * @remarks
   *
   * This method doesn't check the column types since they can change
   * from one database server to another. This check should be sufficient
   * since the only reason why the type would change is if the module uses a
   * different and incompatible column type in the future and the implementer
   * doesn't update the database schema.
   *
   * @param options The options for connecting to the database. See {@link DatabaseOptions}
   * @returns A boolean indicating whether the database is prepared for use by the coordinator.
   */
  public static async prepared(options: RMQBQ.DatabaseOptions): Promise<boolean> {
    const { table } = options
    const client = knex(options)
    const exists = await client.schema.hasTable(table)
    if (!exists) {
      return false
    }
    const columns = await client(table).columnInfo()
    const expectedColumns = ['id', 'uuid', 'queue', 'count', 'expires_at']
    for (let i = 0; i < expectedColumns.length; i++) {
      const col = expectedColumns[i]
      if (!columns[col]) {
        throw new Error(`Expected column ${col} to exist in table ${table} but it does not.`)
      }
    }
    return true
  }
}
