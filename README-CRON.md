# Setting Up a Cron Job for Daily Weather Updates

This guide explains how to set up an automated daily cron job to update weather data for your Yesterday's Weather application.

## Prerequisites

- A Linux or macOS server with cron service
- Node.js and npm installed
- The Yesterday's Weather application repository cloned
- Environment variables configured (.env file)

## Daily Weather Update Script

The application includes a dedicated script for cron jobs: `src/cron-weather-update.ts` which:

- Runs the batch weather fetcher with optimal settings for background operation
- Logs all output to both console and log files (in the `logs/` directory)
- Implements proper error handling and exit codes for cron reliability
- Only fetches new weather data (skips existing data)
- Uses a moderate concurrency level (3) to avoid API rate limits

## Setting Up the Cron Job

### 1. Test the script manually first

Before setting up the cron job, run the script manually to ensure it works:

```bash
cd /path/to/yesterdays-weather
npm run cron-weather-update
```

If successful, you should see log output and a new log file in the `logs/` directory.

### 2. Create a shell script wrapper

Create a shell script to run the Node.js application with the correct environment:

```bash
# Create a wrapper script
cd /path/to/yesterdays-weather
touch update-weather.sh
chmod +x update-weather.sh
```

Edit the `update-weather.sh` file with the following content:

```bash
#!/bin/bash

# Change to the application directory
cd /path/to/yesterdays-weather

# Run the weather update script
npm run cron-weather-update >> /path/to/yesterdays-weather/logs/cron-output.log 2>&1
```

### 3. Set up the cron job

Open your crontab file for editing:

```bash
crontab -e
```

Add a line to run the script once a day (for example, at 2 AM):

```
0 2 * * * /path/to/yesterdays-weather/update-weather.sh
```

This will run the script every day at 2:00 AM.

## Cron Job Scheduling Options

You can adjust the scheduling to meet your needs:

- **Every day at 2 AM**: `0 2 * * *`
- **Twice a day (2 AM and 2 PM)**: `0 2,14 * * *`
- **Every 12 hours**: `0 */12 * * *`
- **Every 6 hours**: `0 */6 * * *`

## Monitoring and Logs

- All logs are stored in the `logs/` directory
- Each day creates a new log file with the date in the filename: `weather-update-YYYY-MM-DD.log`
- You can review these logs to check for errors or issues

## Troubleshooting

If your cron job doesn't seem to be working:

1. Check the cron service is running: `service cron status`
2. Check the cron logs: `grep CRON /var/log/syslog`
3. Ensure paths in your shell script are absolute, not relative
4. Verify the script has execution permissions: `chmod +x update-weather.sh`
5. Check the application logs in the `logs/` directory

## Setting Up on Different Platforms

### On Vercel or Other Serverless Platforms

If you're using Vercel or another serverless platform, you'll need to use an external cron service:

1. **GitHub Actions**: Create a workflow that runs on a schedule
2. **Vercel Cron Jobs**: Use Vercel's built-in cron functionality
3. **Services like EasyCron or Cronitor**: Set up an HTTP endpoint that triggers the update

### On a VPS or Dedicated Server

The instructions above should work for most Linux distributions. For other systems:

- **Windows**: Use Task Scheduler instead of cron
- **macOS**: cron works similarly to Linux

## Performance Considerations

- The script is designed to be efficient and handle rate limiting
- You can adjust concurrency with the `--concurrency` parameter if needed
- Script only updates cities that don't have data for the requested date range
