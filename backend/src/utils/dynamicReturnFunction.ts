export const responseFn = <Type>(
  status: boolean,
  data: Type,
  message?: string
) => {
  if (!message) {
    return {
      status: status,
      data: data,
    };
  } else
    return {
      status: status,
      data: data,
      message: message,
    };
};
