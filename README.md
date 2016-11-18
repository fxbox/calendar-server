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

## Data browser

A text-based data browser is provided in `data/browser`. You can read more
information from the README file in that directory.

## API login

The API root is `/api/v2`. All following routes are relative to this root.

### POST `/login`

#### Input
The input can be either
`application/json` or `application/x-www-form-urlencoded`, with the correct `Content-Type` header. For example, as JSON:
```json
{
  "username": "john@email.com",
  "password": "password"
}
```

The username could be anything, it's not especially an email. It is what was
specified at the user creation time.

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
  "action": "Pick up kids at school",
  "created": 1466588359000,
  "due": 1466613000000,
  "recipients": [{ "id": 1, "forename": "John" }]
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
  "recipients": [{ "id": 1 }],
  "action": "Pick up kids at school",
  "due": 1466613000000
}
```

#### Output
* 201 if request succeeded, with `location` header indicating the new resource
  URL and the body containing the newly inserted recipient:
```json
{
  "id": 1,
  "recipients": [{ "id": 1, "forename": "John" }],
  "action": "Pick up kids at school",
  "created": 1466588359000,
  "due": 1466613000000
}
```
* 400 if some properties are missing or invalid.
* 403 if some recipient doesn't have any common group with the logged in user.

### GET `/reminders/{id}`

Required: the header `Authorization` that identifies the user.

This gets the data about a specific reminder.

#### Output

* 200 if request succeeded, with body:
```json
{
  "id": 1,
  "recipients": [{ "id": 1, "forename": "John" }],
  "action": "Pick up kids at school",
  "created": 1466588359000,
  "due": 1466613000000
}
```
* 404 if no reminder with this ID exists or if the logged in user has no common
  groups with at least 1 recipient.

### GET `/reminders/{id}/recipients`

Required: the header `Authorization` that identifies the user.

This returns the list of recipients for this reminder.

### Output

* 200 if request succeeded, with body:
```json
[
  {
    "id": 1,
    "forename": "Jane",
    "username": "Jane@email.com",
    "phoneNumber": "0123456789" // possibly absent
  },
  ...
]
```
* 404 if no reminder with this ID exists or if the logged in user has no common
  groups with at least 1 recipient.

### PUT `/reminders/{id}`

Required: the header `Authorization` that identifies the user.

This allows to change a specific reminder.

#### Input
All properties must be present. For example, if we would like to change **only** the recipients (JSON):
```json
{
  "recipients": [{ "id": 2 }],
  "action": "Pick up kids at school",
  "due": 1466613000000
}
```

#### Output

* 200 with the new data if request succeeded.
* 400 if some properties are missing or invalid.
* 403 if some recipient doesn't have any common group with the logged in user.
* 404 if no reminder with this ID exists or if the logged in user has no common
  groups with at least 1 recipient.

### PATCH `/reminders/{id}`

Required: the header `Authorization` that identifies the user.

This allows to partially change a specific reminder. We can't change recipients
with this API.

### Input
All properties are optional.
```json
{
  "action": "Pick up kids at school",
  "due": 1466613000000
}
```

### Output

* 200 with the new data if request succeeded.
* 400 if some properties are invalid or no data was passed.
* 404 if no reminder with this ID exists or if the logged in user has no common
  groups with at least 1 recipient.

### DELETE `/reminders/{id}`

Required: the header `Authorization` that identifies the user.

This allows to delete a specific reminder.

Only an admin can delete a reminder. Other users should use [`DELETE
/reminders/{id}/recipients/{userId}`](#XXX) instead.

#### Output

* 204 if request succeeded.
* 403 if the logged in user isn't an admin for one of the groups the recipients
  are member of.
* 404 if no reminder with this ID exists or the logged in user has no common
  groups with any recipient.

### DELETE `/reminders/{id}/recipients/myself`

Required: the header `Authorization` that identifies the user.

This allows to remove the logged in user from a reminder.

If the reminder doesn't have any recipient anymore, it's deleted.

#### Output

* 204 if request succeeded.
* 403 if the user tries to remove another recipient than herself from the
  reminder.
* 404 if no reminder with this ID exists or if the logged-in user isn't a
  recipient for this reminder.

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
* 201 if request succeeded, with `location` header indicating the new resource
  URL and a body containing the newly inserted subscription.
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

## API users

This API manages users.

In all APIs that take an id, using the special string `myself` instead of an id
will point to the logged-in user.

### POST `/users`

Required: the header `Authorization` that identifies a user. Only the master
user can create more users.

This creates a new user.

#### Input

All properties but `phoneNumber` must be present. For example:
```json
{
  "forename": "Sherlock",
  "username": "Sherlock.Holmes@baker-street.co.uk",
  "password": "MoriartyShallReturn",
  "phoneNumber": "0123456789" // optional
}
```

The username could be any string as long as it's unique in our database.

Note that the password is stored in database using a modern hash algorithm
(Argon2 currently).

#### Output
* 201 if request succeeded, with `location` header indicating the new resource
  URL and a body containing the newly inserted user:
```json
{
  "id": 1,
  "forename": "Sherlock",
  "username": "Sherlock.Holmes@baker-street.co.uk"
}
```
* 400 if some properties are missing or invalid.

### GET `/users/{id}`

Required: the header `Authorization` that identifies a user. Only users
belonging in the same group(s) can access information about another user.

This returns information about a user.

#### Output
* 200 if request succeeded, with body:
```json
{
  "id": 1,
  "forename": "Sherlock",
  "username": "Sherlock.Holmes@baker-street.co.uk",
  "phoneNumber": "01234567890" // could be missing
}
```
* 404 if no user with this ID exists or if the logged-in user is not in a common
  group.

### GET `/users/{id}/groups`
Required: the header `Authorization` that identifies a user. Only a user can see
his own groups.

This returns information about groups a user belongs to.

#### Output
* 200 if request succeeded, with body:
```json
[
  {
    "id": 1,
    "name": "Holmes",
    "location": "https://server.name/api/v2/groups/1",
    "isAdmin": "true"
  },
  {
    ...
  }
]
```
  `isAdmin` is `true` if this user is an admin of this group.
* 404 if no user with this ID exists or if this user is not the logged-in user.

### GET `/users/{id}/relations`
Required: the header `Authorization` that identifies a user. Only a user can see
his own relations.

This returns all users this user has relations with through at least 1 group.

#### Output
* 200 if request succeeded, with body:
```json
[
  {
    "id": 2,
    "forename": "James",
    "username": "James.Moriarty@ReichenbachFalls.co.uk",
    "phoneNumber": "0123456789" // could be absent
  },
  {
    ...
  }
]
```
* 404 if no user with this ID exists or if this user is not the logged-in user.


### PATCH `/users/{id}` (unimplemented)

Required: the header `Authorization` that identifies a user. A user can only be
modified by himself.

This changes the properties of an existing user.

Note that because this is a dangerous operation we request the user's current
password.

#### Input

All properties except currentPassword are optional. At least one changed
property needs to be present.
```json
{
  "currentPassword": "MoriartyShallReturn",
  "forename": "Sherlock",
  "username": "Sherlock.Holmes@bakerstreet.uk",
  "phoneNumber": "0123456789",
  "newPassword": "HoundOfTheBaskervilles"
}
```

`currentPassword` will be checked against the current password.

### Output

* 204 if request succeeded.
* 400 if properties are invalid.
* 403 if `currentPassword` is incorrect.
* 404 if no user with this ID exists or if the logged-in user isn't this
  user.

### DELETE `/users/{id}`

Required: the header `Authorization` that identifies a user. A user can only be
deleted by himself.

This deletes a user.

#### Input

Because this is a dangerous operation we request the user's password.
```json
{
  "currentPassword": "MoriartyShallReturn"
}
```

#### Output
* 204 if request succeeded.
* 404 if no user with this ID exists or if the logged-in user isn't this
  user.

## API groups

This API manages groups of users.

### POST `/groups`

Required: the header `Authorization` that identifies a user.

This creates a new group. The currently logged-in user is an admin for this
group and can modify the group, including adding new members.

#### Input

All properties must be present. There is no default value. For example:
```json
{
  "name": "Holmes"
}
```

#### Output
* 201 if request succeeded, with `location` header indicating the new resource
  URL and a body containing the newly inserted group:
```json
{
  "id": 1,
  "name": "Holmes"
}
```
* 400 if some properties are missing or invalid.

### GET `/groups/{id}`

Required: the header `Authorization` that identifies a user. Only a user that
belongs to this group can access its information.

This returns information about a group.

#### Output
* 200 if request succeeded, with body:
```json
{
  "id": 1,
  "name": "Holmes"
}
```
* 404 if no group with this ID exists or if the user doesn't belong to this group.

### GET `/groups/{id}/members` (unimplemented)
Required: the header `Authorization` that identifies a user. Only a user that
belongs to this group can see its users.

This returns information about users belonging to this group.

#### Output
* 200 if request succeeded, with body:
```json
[
  {
    "id": 1,
    "forename": "Sherlock",
    "username": "Sherlock.Holmes@baker-street.co.uk",
    "phoneNumber": "0123456789", // could be missing
    "isAdmin": true,
    "location": "https://server.name/api/v2/users/1"
  },
  {
    ...
  }
]
```
  `isAdmin` is true if this user is an admin for this group.
* 404 if no user with this ID exists or if the user doesn't belong to this group.

### PUT `/groups/{id}/members/{userId}`
Required: the header `Authorization` that identifies a user. A group can only be
modified by one of its admin user.

This will add the user with id `userId` to this group.

### Output

* 204 if request succeeded.
* 403 if this logged-in user is not an admin for this group.
* 404 if no group with this ID exists or if the logged-in user is not part of
  this group.
* 409 if this user is already in this group

### DELETE `/groups/{id}/members/{userId}`

Required: the header `Authorization` that identifies a user. A group can only be
modified by one of its admin user.

This will remove the user with id `userId` from this group.

### Output

* 204 if request succeeded.
* 403 if this logged-in user is not an admin for this group.
* 404 if no group with this ID exists or if the logged-in user is not part of
  this group.

### GET `/groups/{id}/reminders`
Required: the header `Authorization` that identifies a user. Only a user that
belongs to this group can see its associated reminders.

This returns all reminders that are associated with users that belong to this
group.

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
  "recipients": [{ "id": 1, "forename": "Jane" }],
  "action": "Pick up kids at school",
  "created": 1466588359000,
  "due": 1466613000000
}]
```

### PUT `/groups/{id}`

Required: the header `Authorization` that identifies a user. A group can only be
modified by one of its admin user.

This changes the properties of a group.

#### Input

All properties must be present. For example:

```json
{
  "name": "The_Avengers"
}
```

### Output

* 204 if request succeeded.
* 400 if some properties are missing or invalid.
* 403 if this logged-in user is not an admin for this group.
* 404 if no group with this ID exists or if the logged-in user is not part of
  this group.

### DELETE `/groups/{id}`

Required: the header `Authorization` that identifies a user. A group can only be
deleted by an admin user.

This deletes a group.

#### Output
* 204 if request succeeded.
* 404 if no group with this ID exists or the logged-in user is not part of this
  group.
