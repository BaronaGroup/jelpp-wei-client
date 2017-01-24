const requestPromise = require('request-promise'),
  _ = require('lodash')

module.exports = async options => {

  checkRequiredOptions([
    'jelppWeiURL',
    'appId',
    'postLoginURL',
    'apiKey'
  ])
  /*
    Optional options:
      - language (en/fi)
      - defaultRequiredRoles
   */

  await registerService()

  return {
    requestLogin
  }

  function checkRequiredOptions(requiredOptions) {
    for (let option of requiredOptions) {
      if (options[option] === undefined) {
        throw new Error(`Jelpp-Wei requires ${option} to be specified`)
      }
    }
  }

  async function requestLogin(requestOptions = {}) {
    const payload = _.clone(requestOptions)
    if (!payload.roles) {
      payload.roles = options.defaultRequiredRoles
    }
    await makeRequest('POST', 'request-login', payload)
  }

  async function registerService() {
    await makeRequest('POST', 'update-service-details', {
      postLoginURL: options.postLoginURL,
      language: options.language
    })
  }

  function makeRequest(method, url, payload) {
    return requestPromise({
      url: options.jelppWeiURL + '/api/app/' + encodeURIComponent(options.appId) + '/' + url,
      json: payload,
      method,
      headers: {
        'x-jelpp-wei-api-key': options.apiKey
      }
    })
  }
}