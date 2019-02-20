const utils = require('plasma-utils')
const BaseService = require('../base-service')

const defaultOptions = {
  finalityDepth: 12,
  eventPollInterval: 15000
}

/**
 * Service for watching Ethereum events.
 */
class EventWatcher extends BaseService {
  constructor (options) {
    super(options, defaultOptions)
  }

  get name () {
    return 'eventWatcher'
  }

  get dependencies () {
    return ['contract', 'web3', 'syncdb']
  }

  async _onStart () {
    this._reset()
  }

  async _onStop () {
    this._reset()
  }

  /**
   * Subscribes to an event with a given callback.
   * @param {string} event Name of the event to subscribe to.
   * @param {Function} listener Function to be called when the event is triggered.
   */
  subscribe (event, listener) {
    this.startPolling()
    if (!(event in this.events)) {
      this.events[event] = { active: true }
      this.subscriptions[event] = []
    }
    this.subscriptions[event].push(listener)
  }

  /**
   * Unsubscribes from an event with a given callback.
   * @param {string} event Name of the event to unsubscribe from.
   * @param {Function} listener Function that was used to subscribe.
   */
  unsubscribe (event, listener) {
    this.subscriptions[event] = this.subscriptions[event].filter((l) => {
      return l !== listener
    })
    if (this.subscriptions[event].length === 0) {
      this.events[event].active = false
    }
  }

  /**
   * Starts the polling loop.
   * Can only be called once.
   */
  startPolling () {
    if (this.watching) return
    this.watching = true
    this._pollEvents()
  }

  /**
   * Polling loop.
   * Checks events then sleeps before calling itself again.
   * Stops polling if the service is stopped.
   */
  async _pollEvents () {
    if (!this.started) {
      this.log(`ERROR: Stopped watching for events`)
      return
    }

    try {
      await this._checkEvents()
    } finally {
      await utils.utils.sleep(this.options.eventPollInterval)
      this._pollEvents()
    }
  }

  /**
   * Checks for new events and triggers any listeners on those events.
   * Will only check for events that are currently being listened to.
   */
  async _checkEvents () {
    const connected = await this.services.web3.connected()
    if (!connected) {
      this.log(`ERROR: Could not connect to Ethereum`)
      return
    }

    const block = await this.services.web3.eth.getBlockNumber()
    let lastFinalBlock = block - this.options.finalityDepth
    lastFinalBlock = lastFinalBlock < 0 ? 0 : lastFinalBlock

    await Promise.all(
      Object.keys(this.events).map((eventName) =>
        this._checkEvent(eventName, lastFinalBlock)
      )
    )
  }

  /**
   * Checks for new instances of an event.
   * @param {string} eventName Name of the event.
   * @param {number} lastFinalBlock Number of the latest block known to be final.
   */
  async _checkEvent (eventName, lastFinalBlock) {
    if (!this.events[eventName].active || !this.services.contract.hasAddress) {
      return
    }

    let lastLoggedBLock = await this.services.syncdb.getLastLoggedEventBlock(
      eventName
    )
    let firstUnsyncedBlock = lastLoggedBLock + 1
    if (firstUnsyncedBlock > lastFinalBlock) return
    this.log(
      `Checking for new ${eventName} events between Ethereum blocks ${firstUnsyncedBlock} and ${lastFinalBlock}`
    )

    let events = await this.services.contract.contract.getPastEvents(
      eventName,
      {
        fromBlock: firstUnsyncedBlock,
        toBlock: lastFinalBlock
      }
    )

    // Filter out events that we've already seen.
    events = await this._getUniqueEvents(events)

    if (events.length > 0) {
      // Mark these events as seen.
      await this.services.syncdb.addEvents(events)

      // Alert any listeners.
      for (let listener of this.subscriptions[eventName]) {
        try {
          listener(events)
        } catch (err) {
          console.log(err) // TODO: Handle this.
        }
      }
    }

    await this.services.syncdb.setLastLoggedEventBlock(
      eventName,
      lastFinalBlock
    )
  }

  /**
   * Computes a unique hash for an event
   * @param {*} event An Ethereum event.
   * @return {string} The event hash.
   */
  _getEventHash (event) {
    return this.services.web3.utils.sha3(event.transactionHash + event.logIndex)
  }

  /**
   * Filters out any events we've already seen.
   * @param {Array} events A series of Ethereum events.
   * @return {Array} Events we haven't seen already.
   */
  async _getUniqueEvents (events) {
    events.forEach((event) => {
      event.hash = this._getEventHash(event)
    })
    const isUnique = await Promise.all(
      events.map(async (event) => {
        return !(await this.services.syncdb.hasEvent(event))
      })
    )
    return events.filter((_, i) => isUnique[i])
  }

  /**
   * Resets the watcher.
   */
  _reset () {
    this.watching = false
    this.subscriptions = {}
    this.events = {}
  }
}

module.exports = EventWatcher
