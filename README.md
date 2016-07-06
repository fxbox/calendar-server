# calendar-server

## Prerequisites

Node.js 6+ is required. The server relies on some ES6 subtleties (like destructuring assignments).
We recommend you to use [nvm](https://github.com/creationix/nvm), in order to juggle between many node version. Once you have it, just run:
```sh
nvm use
```

## Configuration

User configuration can be set in `config/config.js`. Make a copy of `config/config.template.js` and follow instructions in the file.

## Running the server

The server is actually composed of 2 processes:
* `app.js` is the main application implementing the REST API described below.
* `push_sender.js` is responsible for sending the push notifications from a 0mq
  queue created by `app.js`.

You just need to run `npm start`. This should run both processes. Of course you
need to run `npm i` first to install dependencies.


## API login

The API root is `/api/v1`. All following routes are relative to this root.

### POST `/login`

#### Input
The input can be either
`application/json` or `application/x-www-form-urlencoded`, with the correct `Content-Type` header. For example, as JSON:
```json
{
  "user": "root",
  "password": "password"
}
```

#### Output

If successful, this returns a status 200 with a token in a JSON structure:
```json
{ "token": "ouoiudofiu987987djfjoi..." }
```

This token should be passed in all subsequent requests as a header `Authorization`.

This header should read:
```
Authorization: Bearer <token>
```

Any bad credential will return a 401 status.
Any good credential will return a new token.

## API reminders

Note: all timestamps are in milliseconds since the UNIX epoch.

### GET `/reminders`

Required: the header `Authorization` that identifies the user.

This returns the list of reminders for this user as a JSON object.

#### Input
GET parameters:
* `start`: as a timestamp, this indicates the start point to return reminders
  from. Default is now.
* `limit`: as an integer, this indicates how many items should be returned.
  Default is 20. Specify 0 to return everything to the end.

#### Output
```json
[{
  "id": 1,
  "recipients": ["John"],
  "message": "Pick up kids at school",
  "created": 1466588359000,
  "due": 1466613000000
}]
```

### POST `/reminders`

Required: the header `Authorization` that identifies the user.

This creates a new reminder. Returns the ID for the new reminder as well as the
URL for this reminder in the `Location` header.

#### Input

All properties must be present. There is no default value. For instance (JSON):
```json
{
  "recipients": ["John"],
  "message": "Pick up kids at school",
  "due": 1466613000000
}
```

#### Output
* 201 if request succeeded, with `location` header indicating the new resource URL.
* 400 if some properties are missing or invalid.

### GET `/reminders/{id}`

Required: the header `Authorization` that identifies the user.

This gets the data about a specific reminder.

#### Output

* 200 if request succeeded, with body:
```json
{
  "id": 1,
  "recipients": ["John"],
  "message": "Pick up kids at school",
  "created": 1466588359000,
  "due": 1466613000000
}
```
* 404 if no reminder with this ID exists.

### PUT `/reminders/{id}`

Required: the header `Authorization` that identifies the user.

This allows to change a specific reminder.

#### Input
All properties must be present. For example, if we would like to change **only** the recipients (JSON):
```json
[{
  "recipients": ["Jane"],
  "message": "Pick up kids at school",
  "due": 1466613000000
}]
```

#### Output

* 204 if request succeeded.
* 404 if no reminder with this ID exists.

### DELETE `/reminders/{id}`

Required: the header `Authorization` that identifies the user.

This allows to delete a specific reminder.

#### Output

* 204 if request succeeded.
* 404 if no reminder with this ID exists.

## API subscriptions

This API manages registration for Push endpoints, to send notifications when
reminders are (on the edge of being) due.

### POST `/subscriptions`

Required: the header `Authorization` that identifies the user.

This registers a new push notification endpoint. Returns the
URL for this endpoint in the `Location` header.

#### Input

All properties must be present. There is no default value. For instance (JSON):
```json
{
  "subscription": {
    "endpoint": "...",
    "keys": {
      "p256dh": "<base64>",
      "auth": "<base64>"
    }
  },
  "title": "Chrome on Samsung G2"
}
```

* `subscription` comes directly from browsers' [PushManager API](https://developer.mozilla.org/en-US/docs/Web/API/PushManager).
* `title` is a free form string. It's intended for the end-user to distinguish between different devices/browsers.

#### Output
* 201 if request succeeded, with `location` header indicating the new resource URL.
* 400 if some properties are missing or invalid.

### GET `/subscriptions`, {GET,PUT,DELETE} `/subscriptions/{id}`
These resources behave like you would expect. Few exceptions:
* GET don't return `auth`. This value should remain secret.
* PUT only allows you to modify the `title`.
* DELETE removes the subscription.

## Push notifications

Push notifications are sent to endpoints when reminders are about to be due.

For Chrome, the application needs to setup its `gcm_sender_id` in its manifest.
This id needs to be generated in pair with the server's GCMApiKey on [Google's
developer console](https://code.google.com/apis/console/).

### Format of the payload

This is the same format as [the reminder from the reminders API](#get-remindersid).

