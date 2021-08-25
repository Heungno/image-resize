const winston = require("winston");
require("winston-daily-rotate-file");
require("dotenv").config();

const logDir = process.env.LOG_PATH || process.cwd() + "/logs";
const logLevel = process.env.LOG_LEVEL || "info";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : "warn";
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:MM:SS" }),
  // winston.format.colorize({ all: true }),
  winston.format.json(),
  winston.format.ms(),
  winston.format.printf(
    (info) =>
      `${info.timestamp} [ ${info.level} ]  ${info.message} [${info.ms}]`
  )
);

const logger = winston.createLogger({
  format,
  level: level(),
  transports: [
    new winston.transports.DailyRotateFile({
      level: logLevel,
      datePattern: "YYYY-MM-DD",
      dirname: logDir,
      filename: `info-%DATE%.log`,
      zippedArchive: true,
      handleExceptions: true,
      maxFiles: 30,
    }),
    // new winston.transports.DailyRotateFile({
    //   level: "error",
    //   datePattern: "YYYY-MM-DD",
    //   dirname: logDir + "/error",
    //   filename: `error-%DATE%.log`,
    //   zippedArchive: true,
    //   maxFiles: 30,
    // }),
    new winston.transports.Console({
      handleExceptions: true,
      format: winston.format.colorize({ all: true }),
    }),
  ],
});
module.exports = logger;
