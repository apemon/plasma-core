const BaseService = require('../../src/services/base-service')

/**
 * Provider that mocks a wallet and shouldn't be used in production.
 */
class MockWalletProvider extends BaseService {
  get name () {
    return 'wallet'
  }

  get dependencies () {
    return ['web3']
  }

  async _onStart () {
    this._initAccounts()
  }

  async getAccounts () {
    return this.accounts.map((account) => {
      return account.address
    })
  }

  async sign (address, data) {
    const account = this._getAccount(address)
    const signature = account.sign(data)

    return {
      signature: signature.signature,
      v: signature.v.slice(2),
      r: signature.r.slice(2),
      s: signature.s.slice(2)
    }
  }

  async createAccount () {
    const account = this.services.web3.eth.accounts.create()
    this.accounts.push(account)
    return account.address
  }

  /**
   * Returns the account with the given address,
   * @param {*} address Address of the account.
   * @return {*} The account with that address.
   */
  _getAccount (address) {
    const account = this.accounts.find((acc) => {
      return acc.address === address
    })

    if (account === undefined) {
      throw new Error('Account not found')
    }

    return account
  }

  /**
   * Setup the intial set of fake accounts.
   */
  _initAccounts () {
    this.accounts = Array.from({ length: 10 }, () => {
      return this.services.web3.eth.accounts.create()
    })
  }
}

module.exports = MockWalletProvider
