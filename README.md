# calendar-server

This needs a recent enough node that has some ES6 subtleties (especially destructuring assignments).

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

This token should be passed in all subsequent requests as a header `X-Calendar-Auth`,
otherwise requests will get redirected to `/login` again.

Any bad credential will destroy the previous session and return a 401 status.
Any good credential will regenerate the session if previously existing and return a new token.

### GET `/logout`

This takes no parameter and simply destroy the existing session.

### GET `/reminders`

Required: the header `X-Calendar-Auth` that identifies the user.

This returns the list of reminders for this user as a JSON object.

Parameters:
* `start`: as a timestamp, this indicates the start point to return reminders
  from. Default is now.
* `limit`: as an integer, this indicates how many items should be returned.
  Default is 20. Specify 0 to return everything to the end.

### POST `/reminders`

Required: the header `X-Calendar-Auth` that identifies the user.

This creates a new reminder. Returns the ID for the new reminder as well as the
URL for this reminder in the `Location` header.

### GET `/reminders/{id}`

Required: the header `X-Calendar-Auth` that identifies the user.

This gets the data about a specific reminder.

### PUT `/reminders/{id}`

Required: the header `X-Calendar-Auth` that identifies the user.

This allows to change a specific reminder.

### DELETE `/reminders/{id}`

Required: the header `X-Calendar-Auth` that identifies the user.

This allows to delete a specific reminder.

