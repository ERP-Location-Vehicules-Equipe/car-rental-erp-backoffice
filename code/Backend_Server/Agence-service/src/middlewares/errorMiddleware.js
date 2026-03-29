const mapSequelizeErrors = (sequelizeErrors = []) => {
  return sequelizeErrors.map((item) => {
    const field = item.path || "global";
    const message = item.message || "Valeur invalide";
    const type =
      item.type === "unique violation" || item.validatorKey === "not_unique"
        ? "unique"
        : "validation";

    return {
      field,
      message,
      type,
      value: item.value,
    };
  });
};

export const errorHandler = (err, req, res, next) => {
  if (
    err?.name === "SequelizeUniqueConstraintError" ||
    err?.name === "SequelizeValidationError"
  ) {
    const errors = mapSequelizeErrors(err.errors);

    return res.status(400).json({
      message: "Validation error",
      errors,
    });
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
};
