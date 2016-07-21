function createError(status, name) {
  function NewError(code, message, data) {
    this.code = code;
    this.message = message;
    this.status = status;
    this.name = name;
    if (data) {
      this.data = data;
    }
    Error.captureStackTrace(this);
  }

  NewError.prototype = Object.create(Error.prototype);

  return NewError;
}

const NotFoundError = createError(404, 'NotFoundError');

NotFoundError.default = function(subject, discriminant) {
  return new NotFoundError(
    `${subject}_not_found`,
    `The ${subject} with ${discriminant.name} \`${discriminant.value}\` does \
not exist.`
  );
};

module.exports = {
  InvalidInputError: createError(400, 'InvalidInputError'),
  UnauthorizedError: createError(401, 'UnauthorizedError'),
  NotFoundError,
  DuplicateEndpointError: createError(409, 'DuplicateEndpointError'),
  InternalError: createError(500, 'InternalError'),
};
