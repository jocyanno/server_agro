import * as cron from "node-cron";
import { runCemadenDataCollection } from "./cemaden-data";
import { runCemadenStationsCollection } from "./cemaden-stations";

export class CemadenScheduler {
  private static dataCollectionTask: cron.ScheduledTask | null = null;
  private static stationsCollectionTask: cron.ScheduledTask | null = null;

  static startDataCollection(): void {
    // Schedule data collection every 3 minutes (as in Python script)
    this.dataCollectionTask = cron.schedule("*/3 * * * *", async () => {
      try {
        await runCemadenDataCollection();
      } catch (error) {
        // Error in scheduled data collection
      }
    });
  }

  static startStationsCollection(): void {
    // Schedule stations collection once per day at 00:00
    this.stationsCollectionTask = cron.schedule("0 0 * * *", async () => {
      try {
        await runCemadenStationsCollection();
      } catch (error) {
        // Error in scheduled stations collection
      }
    });
  }

  static stopDataCollection(): void {
    if (this.dataCollectionTask) {
      this.dataCollectionTask.stop();
      this.dataCollectionTask = null;
    }
  }

  static stopStationsCollection(): void {
    if (this.stationsCollectionTask) {
      this.stationsCollectionTask.stop();
      this.stationsCollectionTask = null;
    }
  }

  static stopAll(): void {
    this.stopDataCollection();
    this.stopStationsCollection();
  }
}

// Main execution function
export async function runCemadenAutomation(): Promise<void> {
  try {
    // Run initial data collection
    await runCemadenDataCollection();

    // Run initial stations collection
    await runCemadenStationsCollection();

    // Start schedulers
    CemadenScheduler.startDataCollection();
    CemadenScheduler.startStationsCollection();

    // Keep the process running
    process.on("SIGINT", () => {
      CemadenScheduler.stopAll();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      CemadenScheduler.stopAll();
      process.exit(0);
    });
  } catch (error) {
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runCemadenAutomation().catch(() => {});
}
