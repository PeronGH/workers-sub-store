// Replaces `@/core/app`, which evaluates `eval(...)` at import time; parsers/producers only use it for logging.
const log =
    (level) =>
    (...args) =>
        console[level]('[sub-store]', ...args);

export default {
    log: log('log'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    debug: () => {},
    env: {},
    node: null,
    read: () => undefined,
    write: () => {},
    delete: () => {},
};
