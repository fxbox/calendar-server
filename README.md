# calendar-server

## Prerequisites

Node.js 6+ is required. The server relies on some ES6 subtleties (like destructuring assignments).
We recommend you to use [nvm](https://github.com/creationix/nvm), in order to juggle between many node version. Once you have it, just run:
```sh
nvm use
```

## API

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
  "recipient": "John",
  "message": "Pick up kids at school",
  "created": 1466588359,
  "due": 1466613000
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
  "recipient": "John",
  "message": "Pick up kids at school",
  "due": 1466613000
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
  "recipient": "John",
  "message": "Pick up kids at school",
  "created": 1466588359,
  "due": 1466613000
}
```
* 404 if no reminder with this ID exists.

### PUT `/reminders/{id}`

Required: the header `Authorization` that identifies the user.

This allows to change a specific reminder.

#### Input
All properties must be present. For example, if we would like to change **only** the recipient (JSON):
```json
[{
  "recipient": "Jane",
  "message": "Pick up kids at school",
  "due": 1466613000
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
