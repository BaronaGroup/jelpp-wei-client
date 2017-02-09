# Jelpp Wei Client

A node.js client library for using the Jelpp Wei server.


# Building

This library uses gulp to run babel on the library source code and to build a more compatible library.

Gulp can be run manually using `npm run gulp` to produce `dist/jelpp-wei-client.js`, but if you use the library as a
regular npm dependency this is not required -- gulp is run automatically as a part of the package
installation.

Babel is configured to transpile only whatever is required by the running version of node.js.

# Using

## Installing

The client is provided as a npm package, although at this time it is not available in any repositories.

To get the client installed, you'll want to do something like

`npm install --save git://github.com/BaronaGroup/jelpp-wei-client.git#875efcc142136c1d94e2368dc48c9ac05e22b9c2`

Although you'll want to replace the commit id with one of the the version you wish to install.

## Setting up

`const weiClient = require('jelpp-wei-client')`(options)

### Configuration options

- `jelppWeiURL`: string; the URL to the root of the Jelpp Wei server that is to be used
- `instanceId`: string; the name of the Jelpp instance to which the application belongs to; for example Barona
- `appId`: string; the name of the application
- `instanceKey`: string; the api key for the Jelpp instance (see [keys](#keys) for more)
- `registrationKey`: string; the root registration key configured on the Jelpp Wei server (see [keys](#keys) for more)
- `language`: string, optional; the default language that will be used whenever requests do not specify a language
- `defaultRequiredRoles`: array of [roles](#roles), optional; the roles required of any user logging in, unless overridden when requesting login.
- `postLoginURL`: string, optional; the URL to which users are taken once they have logged in. The URL can be provided
within the login request as well, so this url is used as the default. The URL **must** contain `{token}` 
within it -- it will be replaced by the actual login token. 

In addition to the application specific options, the following instance configuration options *should* be 
present in on application of each Jelpp instance. Typically it should most
likely be Jelpp itself that contains these options, so other applications should not. 

- `instance.name`: string; name of the instance in a form that can be displayed to users
- `instance.jelppURL`: string; the URL to the Jelpp that is serving this instance. The URL should include the basic auth required for accessing the `ext/wei` APIs.
- `instance.introductionToolURL`: string; the URL to the introduction tool of this Jelpp instance.
- `instance.bassoURL`: string; the URL to the BaSSO of this Jelpp instance

    
### Keys

Jelpp Wei applications are able to register themselves to the Jelpp Wei server. This relies on 3 distinct keys:

- registration key, which is shared by all applications using the same Jelpp Wei server
- instance key, which is shared by all applications of the same Jelpp Wei instance
- application key, which is only known by the specific application

If the instance does not exist, at attempt to register the application causes a request to approve the creation of the instance. 
Depending on the server configuration this request can appear either in the server log or in slack.

Once the instance has been approved, assuming the keys match the application will be able to register itself.

### Roles

A fully specified role looks something like this:
```
{
    "instanceId": "Barona",
    "appId": "test-application",
    "role": "admin"
}
```

While applications are able to require roles from other instances to permit login, they are at this time only allowed to 
add roles matching their own instance. Applications can however add roles for other applications within their instance.
 
A simplified representation of a role is just a string; as a string the above example is simply `admin`. In this form the
instanceId and appId from the currently used application are automatically used.

## Usage

### Logging users in

### Inviting new users

## Interface

All interface functions return promises, which are resolved on success, and rejected on failure.

### requestLogin

`wei.requestLogin(options)`

This function creates a login request and provides a URL to the login form which allows the user to log in. Users can 
normally only log in, if a request for them to do so exists.

The options are passed directly to the `request-login` API of the Jelpp Wei server, so options supported by the API 
can be used even if they are not listed here.

#### Options

- `postLoginURL`: string; the URL to which users are taken once they have logged in. The URL **must** contain `{token}` 
    within it -- it will be replaced by the actual login token. A default URL can be specified in the client options;
    doing so makes this field is optional.
- `language`: string; the language which is to be used for the UI. Default language can be specified in the client options;
    doing so makes this field is optional.
- `requiredRoles`: array of roles; roles which are required for the login to succeed. Default roles can be specified in the client options;
    doing so makes this field is optional.
- `requireAllRoles`: boolean, defaults to false; if multiple roles are specified in `requiredRoles`, then this field dictates 
    the intepretation of that. If set to true, **all** of the specified roles must be held by the user. If set to false or left
    unset, it is enough for **any** for the role requirements to be met.
- unspecified options; the entire request is available to the application again after the login has been completed.
 Additional fields can be used to store information so that no state is lost between the login request and the user logging in.
 A typical use case would be storing the page that the user tried to access, but was not allowed to, so that
 the user can be taken back there after they log in.
 
 
#### Return value

A javascript object is returned, with the following fields

- loginUrl: string; the URL of the login form which allows the user to log in matching this request. Usually the user's browser
     should be redirected to this URL.
- token: string; the token for the login. If the application wishes to store state locally for the login requests, then they can 
    do so using this token. The exact same token will be provided to the `postLoginURL` handler once the user has logged in. 


### getLoginDetails

This function is used to obtain details of a user that has recently logged in. The application using the Wei client is expected to 
provide a `postLoginURL` option either with the login request or amongst the client configuration options. After a user
logs in, their browser is directed to the URL, which then contains a token. Using this token and this function the application
can determine who the logged in user is.

`wei.getLoginDetails(token, options)`

The token should be passed verbatim as it was provided to the `postLoginURL`. 

The options are passed directly to the `login-details` API of the Jelpp Wei server, so options supported by the API 
can be used even if they are not listed here.


#### Options

- `allowDuplicateRequest`: boolean, defaults to false; by default, to prevent repeat attacks is is only possible to read the
  request the login details once for any given request. If set to true, the login details will be returned
  even if that has been done before.
  
#### Return value

A javascript object is returned, with these fields

- `name.first`: string; the first name of the user, if known
- `name.last`: string; the last name of the user, if known
- `roles`: array of roles; all of the [roles](#roles) of the user. The roles are always in object form.
- `email`: the email address of the user
- `userId`: the unique Wei user id of the user. This should be used to uniquely identify the user, as other fields may have
    their values vary.
- `superUser`: boolean; when true, the user is considered a superuser and should be given access regardless of roles
- `language`: string; the language used for the login
- `request`: object; the original login request
- `isDuplicateRequest`: boolean; false, unless the option `allowDuplicateRequest` was used, in which case this field will be
    set to true if this was **not** the first request for the login details.


### listUsers

This function exists, but is not fully supported at this time.

### inviteUser

Invites a user to an application. If the user does not exist at all, they are invited to become a Jelpp Wei user, if the user 
exists, new roles are added.
 
 `inviteUser(userDetails, invitationDetails)`
 
Both `userDetails` and `invitationDetails` are passed to the Jelpp Wei `create-user` API as is, so options supported by
the API can be used even if not listed here.
    
#### userDetails

- `email`: string; the email address of the user
- `name.first`: string, optional; the first name of the user 
- `name.last`: string, optional; the last name of the user 
- `roles`: string, array of roles; the roles the user is to be given

#### invitationDetails

The invitation details can be an empty object if it is **known** that the user already exists. Otherwise the fields 
need to be properly for the invitation to be sent properly.

- `language`: string; the language that will be used in both the invitation email as well as the "set up your account" page.
- `postWelcomeInfo`: string, optional; information you want to display to the user after they have set up their account
- `entranceURL`: string, optional; the URL you wish the user to go to once they have set up their account. If the user is redirected 
    back to log in immediately, the login will happen automatically without requiring the user to enter their credentials.  
- `noEmail`: boolean, defaults to false; if set to true, the invitation to Jelpp message is **not** sent by Jelpp Wei. In this case the application **must** send an email containing the necessary information, including the account setup link, if a new user was created. `message` should be set to an empty object if no email is to be sent.
- `message.toServiceName`: string; Name of the service being invited to in the form it would be in "Welcome to testService" in whichever
language is used. So for Finnish this could be "testipalveluun"
- `message.body`: string/markdown; The main body text of the invitation email.
- `message.tail`: string/markdown, optional: The text that follows the main message and instructions on setting up the account. You could for example include information on how to access the service later on.

#### Return value

The API returns a Javascript object with the following fields

- `userId`: string; the Jelpp Wei user id of the user that was created or edited
- `isNewUser`: boolean; true if a new user was created, false if an existing user was updated. If set to false, no message was sent to
the user, so your application is reponsible for communicating. If set to true and if `noEmail` was included in the options, then your application **must** inform the user of
 the account being created and somehow get the user to `setupAccountURL`
- `setupAccountURL`: string; if a new user was created, then this contains the address where the user sets up their account. If `noEmail` was not set, this link was emailed to the user.

### callAppPlugin

Makes a call to a Jelpp Wei plugin as an application.

`wei.callAppPlugin(plugin, operation, requestOptions)`

#### Introduction mobile plugin

`wei.callAppPlugin('introduction-mobile', 'get-user-matching-token', {token})`

Retrieves the Jelpp Wei user id of the user matching the JESSW token `token`. This API will only return a result once
for any given token -- duplicate attempts will result in an erorr.

Returns a response in the form of `{"userId":"123123123"}` containing the user id of the matching user.
