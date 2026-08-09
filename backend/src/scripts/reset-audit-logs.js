/**
 * Reset audit logs database using MongoDB driver directly
 * Bypasses Mongoose immutability hooks
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function resetAuditLogs() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Connected!\n");

    const db = client.db();

    const collections = ["auditlogs", "auditcheckpoints", "auditcounters"];

    for (const collName of collections) {
      const result = await db.collection(collName).deleteMany({});
      console.log(`Deleted ${result.deletedCount} from ${collName}`);
    }

    console.log("\n✅ Reset complete! System is ready for fresh audit logging.");
  } catch (err) {
    console.error("Error during reset:", err.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

resetAuditLogs();
