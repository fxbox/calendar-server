# calendar-server

## Prerequisites

Node.js 6+ is required. The server relies on some ES6 subtleties (like destructuring assignments).

## API

The API root is `/api/v1`. All following routes are relative to this root.

### POST `/login`

This takes 2 parameters: `user`, `password`. The input can be either
`application/json` or `application/x-www-form-urlencoded`, with the correct
`Content-Type` header.

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

Parameters:
* `start`: as a timestamp, this indicates the start point to return reminders
  from. Default is now.
* `limit`: as an integer, this indicates how many items should be returned.
  Default is 20. Specify 0 to return everything to the end.

### POST `/reminders`

Required: the header `Authorization` that identifies the user.

This creates a new reminder. Returns the ID for the new reminder as well as the
URL for this reminder in the `Location` header.

### GET `/reminders/{id}`

Required: the header `Authorization` that identifies the user.

This gets the data about a specific reminder.

### PUT `/reminders/{id}`

Required: the header `Authorization` that identifies the user.

This allows to change a specific reminder.

### DELETE `/reminders/{id}`

Required: the header `Authorization` that identifies the user.

This allows to delete a specific reminder.
