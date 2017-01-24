const requestPromise = require('request-promise')

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
      url: options.jelppWeiUrl + '/api/app/' + encodeURIComponent(options.appId) + '/' + url,
      json: payload,
      method,
      headers: {
        'x-jelpp-wei-api-key': options.apiKey
      }
    })
  }
}