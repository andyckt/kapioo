export type RouteOptimizerErrorCode =
  | "ROUTE_OPTIMIZER_CONFIG_ERROR"
  | "ROUTE_OPTIMIZER_AUTH_ERROR"
  | "ROUTE_OPTIMIZER_VALIDATION_ERROR"
  | "ROUTE_OPTIMIZER_RESPONSE_ERROR"
  | "ROUTE_OPTIMIZER_NETWORK_ERROR";

type RouteOptimizerErrorOptions = {
  code: RouteOptimizerErrorCode;
  status?: number;
  path?: string;
  body?: unknown;
  rawBody?: string;
  cause?: unknown;
};

export class RouteOptimizerError extends Error {
  code: RouteOptimizerErrorCode;
  status?: number;
  path?: string;
  body?: unknown;
  rawBody?: string;

  constructor(message: string, options: RouteOptimizerErrorOptions) {
    super(message);
    this.name = "RouteOptimizerError";
    this.code = options.code;
    this.status = options.status;
    this.path = options.path;
    this.body = options.body;
    this.rawBody = options.rawBody;

    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export class RouteOptimizerConfigError extends RouteOptimizerError {
  constructor(message: string) {
    super(message, { code: "ROUTE_OPTIMIZER_CONFIG_ERROR" });
    this.name = "RouteOptimizerConfigError";
  }
}

export class RouteOptimizerAuthError extends RouteOptimizerError {
  constructor(message: string, options: Omit<RouteOptimizerErrorOptions, "code"> = {}) {
    super(message, { ...options, code: "ROUTE_OPTIMIZER_AUTH_ERROR" });
    this.name = "RouteOptimizerAuthError";
  }
}

export class RouteOptimizerValidationError extends RouteOptimizerError {
  constructor(message: string, options: Omit<RouteOptimizerErrorOptions, "code"> = {}) {
    super(message, { ...options, code: "ROUTE_OPTIMIZER_VALIDATION_ERROR" });
    this.name = "RouteOptimizerValidationError";
  }
}

export class RouteOptimizerResponseError extends RouteOptimizerError {
  constructor(message: string, options: Omit<RouteOptimizerErrorOptions, "code"> = {}) {
    super(message, { ...options, code: "ROUTE_OPTIMIZER_RESPONSE_ERROR" });
    this.name = "RouteOptimizerResponseError";
  }
}

export class RouteOptimizerNetworkError extends RouteOptimizerError {
  constructor(message: string, options: Omit<RouteOptimizerErrorOptions, "code"> = {}) {
    super(message, { ...options, code: "ROUTE_OPTIMIZER_NETWORK_ERROR" });
    this.name = "RouteOptimizerNetworkError";
  }
}
