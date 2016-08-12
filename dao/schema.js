// NOTE: members_reminders(member_id) has no ON DELETE CASCADE because we need
// to manually cascade to reminders if there is no more recipients associated to
// a reminder.
const schema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS "group" (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name VARCHAR(128) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS group_membership (
    user_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    FOREIGN KEY (user_id)
      REFERENCES user (id)
      ON UPDATE CASCADE,
    FOREIGN KEY (group_id)
      REFERENCES "group" (id)
  );

  CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    forename VARCHAR(128) NOT NULL,
    email VARCHAR(256) NOT NULL,
    password_hash VARCHAR(128) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reminder (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "action" TEXT NOT NULL,
    created INTEGER NOT NULL, -- in milliseconds
    due INTEGER NOT NULL, -- in milliseconds
    status VARCHAR(128) DEFAULT('waiting')
  );

  CREATE TABLE IF NOT EXISTS users_reminder
  (
    user_id INTEGER NOT NULL,
    reminder_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, reminder_id),
    FOREIGN KEY (user_id)
      REFERENCES user(id)
      ON UPDATE CASCADE,
    FOREIGN KEY (reminder_id)
      REFERENCES reminder(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS users_reminder_id
    ON users_reminder(reminder_id);

  CREATE TABLE IF NOT EXISTS subscription
  (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL
      REFERENCES user(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
      DEFERRABLE INITIALLY DEFERRED,
    title TEXT,
    endpoint TEXT UNIQUE,
    p256dh TEXT,
    auth TEXT
  );
  CREATE INDEX IF NOT EXISTS subscriptions_user_id
    ON subscription(user_id);
`;

const testData = `
  DELETE FROM user;
  INSERT INTO
    user (forename, email, password_hash)
  VALUES
    ("Ana", "email@email.com", "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8");

  INSERT INTO
    user (forename, email, password_hash)
  VALUES
    ("Bob", "a@email.com", "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8");

  INSERT INTO
    user (forename, email, password_hash)
  VALUES
    ("Sam", "b@email.com", "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8");

  DELETE FROM "group";
  INSERT INTO
    "group" (name)
  VALUES
    ("Smith");

  DELETE FROM group_membership;
  INSERT INTO
    group_membership (user_id, group_id)
  VALUES
    (1, 1);
  INSERT INTO
    group_membership (user_id, group_id)
  VALUES
    (2, 1);
  INSERT INTO
    group_membership (user_id, group_id)
  VALUES
    (3, 1);

  DELETE FROM reminder;
  INSERT INTO
    reminder ("action", created, due, status)
  VALUES
    ("attend important meeting", 1470839864000, 1470926264000, "waiting");

  DELETE FROM users_reminder;
  INSERT INTO
    users_reminder (user_id, reminder_id)
  VALUES
    (1, 1);
  INSERT INTO
    users_reminder (user_id, reminder_id)
  VALUES
    (2, 1);
`;

module.exports = {
  schema,
  testData,
};
