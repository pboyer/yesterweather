import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import path from "path";
import { batchFetchWeatherData } from "./batch-weather-fetcher";

const LOG_DIR = path.join(__dirname, "../logs");
const LOG_FILE = path.join(
  LOG_DIR,
  `weather-update-${new Date().toISOString().split("T")[0]}.log`
);

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create a logger that writes to both console and log file
class Logger {
  private stream: fs.WriteStream;

  constructor(logFile: string) {
    this.stream = fs.createWriteStream(logFile, { flags: "a" });
    this.log(`Weather update started at ${new Date().toISOString()}`);
  }

  log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.stream.write(logMessage + "\n");
  }

  error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ERROR: ${message}`;

    if (error) {
      if (typeof error === "object" && error.message) {
        logMessage += ` - ${error.message}`;
      } else {
        logMessage += ` - ${error}`;
      }
    }

    console.error(logMessage);
    this.stream.write(logMessage + "\n");

    if (error && error.stack) {
      console.error(error.stack);
      this.stream.write(`${error.stack}\n`);
    }
  }

  close() {
    this.stream.end();
  }
}

// Run the daily update
async function runDailyUpdate() {
  const logger = new Logger(LOG_FILE);
  let exitCode = 0;

  try {
    logger.log("Starting daily weather data update...");

    // Use the batch weather fetcher with recommended settings for cron job:
    // - skipExisting: true (only fetch new data)
    // - maxRetries: 2 (retry failed requests a couple times)
    // - concurrency: 3 (moderate concurrency to avoid rate limits)
    await batchFetchWeatherData({
      skipExisting: true,
      maxRetries: 2,
      concurrency: 3,
      logger: logger,
    });

    logger.log("Daily weather update completed successfully!");
  } catch (error) {
    logger.error("Failed to complete daily weather update", error);
    exitCode = 1;
  } finally {
    logger.log(`Weather update finished at ${new Date().toISOString()}`);
    logger.close();

    // Exit with appropriate code for cron job
    process.exit(exitCode);
  }
}

// Run the update
runDailyUpdate();
